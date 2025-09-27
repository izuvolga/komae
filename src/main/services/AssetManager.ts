import * as path from 'path';
import * as fs from 'fs';
import { readdir, rmdir } from 'fs/promises';
import imageSize from 'image-size';
import { FileSystemService } from './FileSystemService';
import { CustomAssetManager } from './CustomAssetManager';
import { copyAssetToProject, getAssetTypeFromExtension, validateAssetFile, deleteAssetFromProject } from '../../utils/assetManager';
import { getLogger, PerformanceTracker } from '../../utils/logger';
import {
  detectDuplicateAssetName,
  generateUniqueAssetName,
  resolveDuplicateAssetConflict,
  DuplicateResolutionStrategy
} from '../../utils/duplicateAssetHandler';
import type { Asset, ImageAsset, TextAsset, VectorAsset, DynamicVectorAsset, ProjectData, AssetFile } from '../../types/entities';
import { createImageAsset, createDefaultTextAsset, createVectorAsset, createDynamicVectorAsset } from '../../types/entities';
import { determineFileType, calculateFileHash } from '../../utils/fileTypeDetection';

export { DuplicateResolutionStrategy } from '../../utils/duplicateAssetHandler';

export class AssetManager {
  private fileSystemService: FileSystemService;
  private customAssetManager: CustomAssetManager;
  private currentProjectPath: string | null = null;
  private logger = getLogger();

  constructor() {
    this.fileSystemService = new FileSystemService();
    this.customAssetManager = new CustomAssetManager();
  }

  /**
   * 現在のプロジェクトパスを設定
   */
  setCurrentProjectPath(projectPath: string | null): void {
    console.log('[AssetManager] Setting current project path:', projectPath);
    this.currentProjectPath = projectPath;
  }

  /**
   * 現在のプロジェクトパスを取得
   */
  getCurrentProjectPath(): string | null {
    return this.currentProjectPath;
  }

  async importAsset(
    filePath: string,
    project?: ProjectData,
    duplicateStrategy: DuplicateResolutionStrategy = DuplicateResolutionStrategy.AUTO_RENAME
  ): Promise<Asset> {
    const tracker = new PerformanceTracker('asset_import');

    try {
      console.log('[AssetManager] Current project path:', this.currentProjectPath);
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
      if (assetType === 'raster') {
        asset = await this.importImageAsset(filePath, finalAssetName, extension);
      } else if (assetType === 'vector') {
        asset = await this.importVectorAsset(filePath, finalAssetName, extension);
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

    // AssetFileオブジェクトを生成
    const assetFile: AssetFile = {
      path: relativePath,
      type: determineFileType(filePath),
      hash: await calculateFileHash(filePath),
      original_width: imageInfo.width,
      original_height: imageInfo.height
    };

    // entities.tsのヘルパー関数を使用してImageAssetを作成
    const asset = createImageAsset({
      name: fileName,
      originalFile: assetFile,
    });

    // AssetFileオブジェクトを追加
    asset.original_file = assetFile;

    await this.logger.logDevelopment('asset_file_created', 'AssetFile instance created for ImageAsset', {
      assetId: asset.id,
      assetName: asset.name,
      filePath: relativePath,
      fileType: assetFile.type,
      fileHash: assetFile.hash,
      dimensions: `${assetFile.original_width}x${assetFile.original_height}`,
    });

    return asset;
  }

  async createTextAsset(name: string, defaultText: string, project?: ProjectData): Promise<TextAsset> {
    // プロジェクトの多言語設定を取得
    const supportedLanguages = project?.metadata?.supportedLanguages || ['ja'];

    // entities.tsのヘルパー関数を使用してTextAssetを作成（新仕様対応）
    const asset = createDefaultTextAsset({
      name: name,
      supportedLanguages: supportedLanguages
    });
    // デフォルトテキストを設定
    asset.default_text = defaultText;

    await this.logger.logDevelopment('text_asset_created', 'TextAsset created with new specification', {
      assetId: asset.id,
      assetName: asset.name,
      supportedLanguages,
      hasDefaultSettings: !!asset.default_settings,
      hasDefaultLanguageOverride: !!asset.default_language_override,
    });

    return asset;
  }

  async createDynamicVectorAsset(name: string, customAssetId: string): Promise<DynamicVectorAsset> {
    // CustomAssetの完全なオブジェクトを取得
    const customAsset = await this.customAssetManager.getCustomAsset(customAssetId);

    if (!customAsset) {
      throw new Error(`CustomAsset with ID "${customAssetId}" not found`);
    }

    const asset = createDynamicVectorAsset({
      customAsset, // CustomAssetオブジェクトを直接渡す
      name,
    });

    await this.logger.logDevelopment('dynamic_vector_asset_created', 'DynamicVectorAsset created', {
      assetId: asset.id,
      assetName: asset.name,
      usePageVariables: asset.use_page_variables,
      useValueVariables: asset.use_value_variables,
      customAssetId: asset.custom_asset_id,
      parametersCount: Object.keys(customAsset.parameters).length,
    });

    return asset;
  }

  private async importVectorAsset(filePath: string, fileName: string, extension: string): Promise<VectorAsset> {
    // ファイルをプロジェクトにコピー
    const relativePath = await copyAssetToProject(this.currentProjectPath!, filePath, 'vectors');

    // SVGの基本情報を取得
    const svgInfo = await this.getSVGInfo(filePath);

    // AssetFileオブジェクトを生成
    const assetFile: AssetFile = {
      path: relativePath,
      type: determineFileType(filePath),
      hash: await calculateFileHash(filePath),
      original_width: svgInfo.width,
      original_height: svgInfo.height
    };

    // entities.tsのヘルパー関数を使用してVectorAssetを作成
    const asset = createVectorAsset({
      name: fileName,
      originalFile: assetFile,
    });

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
          filePath: asset.type === 'ImageAsset'
            ? (asset as ImageAsset).original_file.path
            : asset.type === 'VectorAsset'
              ? (asset as VectorAsset).original_file.path
              : undefined,
          type: asset.type,
        };
      }

      await this.logger.logDevelopment('asset_delete_start', 'Asset deletion process started', {
        assetId,
        assetName: assetInfo.name,
        filePath: assetInfo.filePath,
        assetType: assetInfo.type,
        projectPath: this.currentProjectPath,
      });

      // 物理ファイルを削除（ImageAssetとVectorAssetの場合のみ、DynamicVectorAssetは除外）
      if (assetInfo.filePath && project?.assets[assetId]?.type &&
          (project.assets[assetId].type === 'ImageAsset' || project.assets[assetId].type === 'VectorAsset')) {
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

  /**
   * assetsディレクトリをスキャンして、プロジェクトファイルに記載のないファイルを削除
   */
  async cleanupUnreferencedAssets(projectData: ProjectData): Promise<{ deletedFiles: string[] }> {
    const tracker = new PerformanceTracker('cleanup_unreferenced_assets');
    const deletedFiles: string[] = [];

    try {
      if (!this.currentProjectPath) {
        throw new Error('No project is currently open');
      }

      await this.logger.logDevelopment('cleanup_unreferenced_start', 'Starting cleanup of unreferenced assets', {
        projectPath: this.currentProjectPath,
        totalAssets: Object.keys(projectData.assets).length,
      });

      const assetsDir = path.join(this.currentProjectPath, 'assets');

      // assetsディレクトリが存在しない場合は何もしない
      if (!(await this.fileSystemService.exists(assetsDir))) {
        await this.logger.logDevelopment('assets_dir_not_found', 'Assets directory not found', {
          assetsDir,
        });
        return { deletedFiles: [] };
      }

      // プロジェクトファイルで参照されているファイルパスのセットを作成
      const referencedFiles = new Set<string>();

      for (const asset of Object.values(projectData.assets)) {
        if (asset.type === 'ImageAsset' || asset.type === 'VectorAsset') {
          // ファイルパスを取得
          let filePath: string;
          if (asset.type === 'ImageAsset') {
            filePath = (asset as ImageAsset).original_file.path;
          } else {
            filePath = (asset as VectorAsset).original_file.path;
          }
          if (!path.isAbsolute(filePath)) {
            filePath = path.resolve(this.currentProjectPath, filePath);
          }
          referencedFiles.add(filePath);
        }
      }

      await this.logger.logDevelopment('referenced_files_collected', 'Collected referenced files', {
        referencedCount: referencedFiles.size,
      });

      // assetsディレクトリを再帰的にスキャン
      const deletedFromScan = await this.scanAndCleanupDirectory(assetsDir, referencedFiles);
      deletedFiles.push(...deletedFromScan);

      await this.logger.logAssetOperation('delete', {
        type: 'unreferenced_assets_cleanup',
      }, {
        projectPath: this.currentProjectPath,
        deletedCount: deletedFiles.length,
        deletedFiles,
      }, true);

      await tracker.end({
        success: true,
        deletedCount: deletedFiles.length,
      });

      return { deletedFiles };

    } catch (error) {
      await this.logger.logError('cleanup_unreferenced_failed', error as Error, {
        projectPath: this.currentProjectPath,
      });

      await tracker.end({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * ディレクトリを再帰的にスキャンして、参照されていないファイルを削除
   */
  private async scanAndCleanupDirectory(dirPath: string, referencedFiles: Set<string>): Promise<string[]> {
    const deletedFiles: string[] = [];

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // サブディレクトリを再帰的にスキャン
          const deletedFromSubdir = await this.scanAndCleanupDirectory(fullPath, referencedFiles);
          deletedFiles.push(...deletedFromSubdir);

          // ディレクトリが空になった場合は削除
          try {
            const remainingEntries = await readdir(fullPath);
            if (remainingEntries.length === 0) {
              await rmdir(fullPath);
              await this.logger.logDevelopment('empty_directory_deleted', 'Deleted empty directory', {
                dirPath: fullPath,
              });
            }
          } catch (error) {
            // ディレクトリ削除エラーは無視
          }

        } else if (entry.isFile()) {
          // ファイルが参照されているかチェック
          if (!referencedFiles.has(fullPath)) {
            try {
              await this.fileSystemService.deleteFile(fullPath);
              deletedFiles.push(fullPath);

              await this.logger.logDevelopment('unreferenced_file_deleted', 'Deleted unreferenced file', {
                filePath: fullPath,
              });
            } catch (deleteError) {
              await this.logger.logError('file_delete_failed', deleteError as Error, {
                filePath: fullPath,
              });
            }
          } else {
            await this.logger.logDevelopment('referenced_file_kept', 'Kept referenced file', {
              filePath: fullPath,
            });
          }
        }
      }
    } catch (error) {
      await this.logger.logError('directory_scan_failed', error as Error, {
        dirPath,
      });
    }

    return deletedFiles;
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

  private async getSVGInfo(filePath: string): Promise<{ width: number; height: number; content: string }> {
    try {
      const svgContent = fs.readFileSync(filePath, 'utf8');

      // SVGの<svg>タグからwidth/height属性を抽出
      const svgMatch = svgContent.match(/<svg[^>]*>/i);
      if (!svgMatch) {
        throw new Error('Invalid SVG file: no <svg> tag found');
      }

      const svgTag = svgMatch[0];

      // width/height属性を抽出
      const widthMatch = svgTag.match(/width\s*=\s*["']?([^"'\s>]+)["']?/i);
      const heightMatch = svgTag.match(/height\s*=\s*["']?([^"'\s>]+)["']?/i);

      let width = 800;
      let height = 600;

      if (widthMatch && heightMatch) {
        // 単位を除去して数値を抽出
        const widthValue = parseFloat(widthMatch[1].replace(/[^\d.-]/g, ''));
        const heightValue = parseFloat(heightMatch[1].replace(/[^\d.-]/g, ''));

        if (!isNaN(widthValue) && !isNaN(heightValue)) {
          width = Math.round(widthValue);
          height = Math.round(heightValue);
        }
      } else {
        // width/heightが見つからない場合、viewBox属性を確認
        const viewBoxMatch = svgTag.match(/viewBox\s*=\s*["']?\s*([^"']+)["']?/i);
        if (viewBoxMatch) {
          const viewBoxValues = viewBoxMatch[1].trim().split(/\s+/);
          if (viewBoxValues.length === 4) {
            const viewBoxWidth = parseFloat(viewBoxValues[2]);
            const viewBoxHeight = parseFloat(viewBoxValues[3]);

            if (!isNaN(viewBoxWidth) && !isNaN(viewBoxHeight)) {
              width = Math.round(viewBoxWidth);
              height = Math.round(viewBoxHeight);
            }
          }
        }
      }

      return { width, height, content: svgContent };
    } catch (error) {
      console.warn(`Failed to parse SVG dimensions from ${filePath}:`, error);
      return { width: 800, height: 600, content: '' };
    }
  }
}
