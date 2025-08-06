import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import imageSize from 'image-size';
import { FileSystemService } from './FileSystemService';
import { copyAssetToProject, getAssetTypeFromExtension, validateAssetFile, deleteAssetFromProject } from '../../utils/assetManager';
import { getLogger, PerformanceTracker } from '../../utils/logger';
import { 
  detectDuplicateAssetName, 
  generateUniqueAssetName, 
  resolveDuplicateAssetConflict,
  DuplicateResolutionStrategy 
} from '../../utils/duplicateAssetHandler';
import type { Asset, ImageAsset, TextAsset, ProjectData } from '../../types/entities';

export { DuplicateResolutionStrategy } from '../../utils/duplicateAssetHandler';

export class AssetManager {
  private fileSystemService: FileSystemService;
  private currentProjectPath: string | null = null;
  private logger = getLogger();

  constructor() {
    this.fileSystemService = new FileSystemService();
  }

  /**
   * 現在のプロジェクトパスを設定
   */
  setCurrentProjectPath(projectPath: string | null): void {
    this.currentProjectPath = projectPath;
  }

  async importAsset(
    filePath: string, 
    project?: ProjectData, 
    duplicateStrategy: DuplicateResolutionStrategy = DuplicateResolutionStrategy.AUTO_RENAME
  ): Promise<Asset> {
    const tracker = new PerformanceTracker('asset_import');
    
    try {
      if (!this.currentProjectPath) {
        const error = new Error('No project is currently open. Please open or create a project first.');
        await this.logger.logError('asset_import', error, {
          filePath,
          currentProjectPath: this.currentProjectPath,
        });
        throw error;
      }

      const extension = path.extname(filePath);
      const originalFileName = path.basename(filePath, extension);
      
      await this.logger.logDevelopment('asset_import_start', 'Asset import process started', {
        filePath,
        fileName: originalFileName,
        extension,
        projectPath: this.currentProjectPath,
      });

      // ファイルタイプを検証
      const assetType = getAssetTypeFromExtension(extension);
      await validateAssetFile(filePath, assetType);

      // 重複アセット名のハンドリング
      let finalAssetName = originalFileName;
      let shouldReplaceExisting = false;
      
      if (project) {
        const duplicateResult = detectDuplicateAssetName(originalFileName, project);
        
        if (duplicateResult.isDuplicate) {
          await this.logger.logDevelopment('duplicate_asset_detected', 'Duplicate asset name detected', {
            originalName: originalFileName,
            existingAsset: duplicateResult.existingAsset?.id,
            strategy: duplicateStrategy,
          });

          const conflictResolution = await resolveDuplicateAssetConflict(
            {
              name: originalFileName,
              filePath,
              type: assetType,
            },
            project,
            duplicateStrategy
          );

          finalAssetName = conflictResolution.resolvedName;
          shouldReplaceExisting = conflictResolution.shouldReplaceExisting || false;

          if (conflictResolution.shouldCancel) {
            const cancelError = new Error('Asset import was cancelled due to duplicate name conflict');
            await this.logger.logAssetOperation('import', {
              name: originalFileName,
              filePath,
              type: assetType,
            }, {
              projectPath: this.currentProjectPath,
              resolution: 'cancelled',
            }, false);
            throw cancelError;
          }

          await this.logger.logDevelopment('duplicate_asset_resolved', 'Duplicate asset conflict resolved', {
            originalName: originalFileName,
            resolvedName: finalAssetName,
            strategy: duplicateStrategy,
            wasAutoRenamed: conflictResolution.wasAutoRenamed,
            shouldReplace: shouldReplaceExisting,
          });
        }
      }

      let asset: Asset;
      if (assetType === 'image') {
        asset = await this.importImageAsset(filePath, finalAssetName, extension);
      } else {
        throw new Error(`Unsupported file type: ${extension}`);
      }

      await this.logger.logAssetOperation('import', {
        id: asset.id,
        name: asset.name,
        filePath,
        type: assetType,
      }, {
        projectPath: this.currentProjectPath,
        originalFileName: originalFileName,
        finalAssetName: finalAssetName,
        wasRenamed: originalFileName !== finalAssetName,
        shouldReplaceExisting,
      }, true);

      await tracker.end({ success: true, assetId: asset.id });
      return asset;

    } catch (error) {
      await this.logger.logAssetOperation('import', {
        filePath,
        type: path.extname(filePath),
      }, {
        projectPath: this.currentProjectPath,
        error: error instanceof Error ? error.message : String(error),
      }, false);

      await tracker.end({ success: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async importImageAsset(filePath: string, fileName: string, extension: string): Promise<ImageAsset> {
    // ファイルをプロジェクトにコピー
    const relativePath = await copyAssetToProject(this.currentProjectPath!, filePath, 'images');
    
    // 画像の基本情報を取得（実際の実装では画像ライブラリを使用）
    const imageInfo = await this.getImageInfo(filePath);
    
    const asset: ImageAsset = {
      id: `img-${uuidv4()}`,
      type: 'ImageAsset',
      name: fileName,
      original_file_path: relativePath, // 相対パスを使用
      original_width: imageInfo.width,
      original_height: imageInfo.height,
      default_pos_x: 0,
      default_pos_y: 0,
      default_width: imageInfo.width,
      default_height: imageInfo.height,
      default_opacity: 1.0,
      // default_maskは初期状態ではundefined（マスクなし）
    };

    return asset;
  }

  async createTextAsset(name: string, defaultText: string): Promise<TextAsset> {
    const asset: TextAsset = {
      id: `text-${uuidv4()}`,
      type: 'TextAsset',
      name: name,
      default_text: defaultText,
      font: 'system-ui', // デフォルトフォント（絶対パス）
      stroke_width: 2.0,
      font_size: 24,
      stroke_color: '#000000',
      fill_color: '#FFFFFF',
      default_pos_x: 100,
      default_pos_y: 100,
      opacity: 1.0,
      leading: 0,
      vertical: false,
    };

    return asset;
  }

  async deleteAsset(assetId: string, project?: ProjectData): Promise<void> {
    const tracker = new PerformanceTracker('asset_delete');
    
    try {
      if (!this.currentProjectPath) {
        const error = new Error('No project is currently open. Please open or create a project first.');
        await this.logger.logError('asset_delete', error, {
          assetId,
          currentProjectPath: this.currentProjectPath,
        });
        throw error;
      }

      // プロジェクトデータからアセット情報を取得
      let assetInfo: { name?: string; filePath?: string; type?: string } = { name: assetId };
      
      if (project?.assets[assetId]) {
        const asset = project.assets[assetId];
        assetInfo = {
          name: asset.name,
          filePath: asset.type === 'ImageAsset' ? asset.original_file_path : undefined,
          type: asset.type,
        };
      }

      await this.logger.logDevelopment('asset_delete_start', 'Asset deletion process started', {
        assetId,
        assetName: assetInfo.name,
        filePath: assetInfo.filePath,
        projectPath: this.currentProjectPath,
      });

      // 物理ファイルを削除（ImageAssetの場合のみ）
      if (assetInfo.filePath && project?.assets[assetId]?.type === 'ImageAsset') {
        try {
          await deleteAssetFromProject(this.currentProjectPath, assetInfo.filePath);
          
          await this.logger.logDevelopment('asset_file_deleted', 'Asset file deleted from filesystem', {
            assetId,
            deletedPath: assetInfo.filePath,
          });
        } catch (fileError) {
          // ファイル削除失敗をログに記録するが、プロセスは継続
          await this.logger.logError('asset_file_delete', fileError as Error, {
            assetId,
            filePath: assetInfo.filePath,
            projectPath: this.currentProjectPath,
          });
          
          // ファイルが見つからない場合は警告のみ、その他のエラーは再スロー
          if (!fileError || !(fileError as any).message?.includes('not found')) {
            throw fileError;
          }
        }
      }

      await this.logger.logAssetOperation('delete', {
        id: assetId,
        name: assetInfo.name,
        filePath: assetInfo.filePath,
        type: assetInfo.type,
      }, {
        projectPath: this.currentProjectPath,
        fileDeleted: !!assetInfo.filePath,
      }, true);

      await tracker.end({ success: true, assetId });

    } catch (error) {
      await this.logger.logAssetOperation('delete', {
        id: assetId,
      }, {
        projectPath: this.currentProjectPath,
        error: error instanceof Error ? error.message : String(error),
      }, false);

      await tracker.end({ success: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async optimizeAsset(assetId: string): Promise<Asset> {
    // TODO: 画像最適化処理
    // 画像圧縮、リサイズなどの最適化
    throw new Error('Asset optimization not implemented yet');
  }


  private async getImageInfo(filePath: string): Promise<{ width: number; height: number }> {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      const dimensions = imageSize(imageBuffer);
      if (dimensions.width && dimensions.height) {
        return { 
          width: dimensions.width, 
          height: dimensions.height 
        };
      } else {
        throw new Error('Unable to determine image dimensions');
      }
    } catch (error) {
      // エラーの場合はデフォルト値を返す
      console.warn(`Failed to get image dimensions for ${filePath}:`, error);
      return { width: 800, height: 600 };
    }
  }
}
