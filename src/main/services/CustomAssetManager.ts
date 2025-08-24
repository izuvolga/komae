import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { app } from 'electron';
import { FileSystemService } from './FileSystemService';
import { getLogger, PerformanceTracker } from '../../utils/logger';
import { 
  parseCustomAsset, 
  generateCustomAssetId, 
  isValidCustomAssetFilename,
  type CustomAssetMetadata,
  type ParsedCustomAsset
} from '../../utils/customAssetParser';

export interface CustomAssetInfo {
  id: string;
  name: string;
  type: string;
  version: string;
  author: string;
  description: string;
  parameters: Array<{
    name: string;
    type: 'number' | 'string';
    defaultValue: number | string;
  }>;
  filePath: string;
  addedAt: string;
}

export interface CustomAssetRegistry {
  assets: CustomAssetRegistryEntry[];
}

export interface CustomAssetRegistryEntry {
  id: string;
  name: string;
  type: string;
  version: string;
  author: string;
  description: string;
  parameters: CustomAssetInfo['parameters'];
  filePath: string;
  addedAt: string;
}

export class CustomAssetManager {
  private fileSystemService: FileSystemService;
  private logger = getLogger();
  
  // グローバルCustomAsset管理
  private globalCustomAssetsDir: string;
  private registryFile: string;
  private globalCustomAssetCache: Map<string, CustomAssetInfo> = new Map();

  constructor() {
    this.fileSystemService = new FileSystemService();
    
    // グローバルCustomAsset管理の初期化
    this.globalCustomAssetsDir = path.join(app.getPath('userData'), 'custom-assets');
    this.registryFile = path.join(this.globalCustomAssetsDir, 'custom-assets-registry.json');
    this.ensureGlobalDirectories();
  }

  /**
   * グローバルディレクトリの初期化
   */
  private ensureGlobalDirectories(): void {
    try {
      if (!fs.existsSync(this.globalCustomAssetsDir)) {
        fs.mkdirSync(this.globalCustomAssetsDir, { recursive: true });
        this.logger.logDevelopment('custom_asset_init', 'Created global custom assets directory', {
          directory: this.globalCustomAssetsDir
        });
      }

      // レジストリファイルが存在しない場合は初期化
      if (!fs.existsSync(this.registryFile)) {
        this.saveRegistry({ assets: [] });
        this.logger.logDevelopment('custom_asset_init', 'Initialized custom assets registry', {
          registryFile: this.registryFile
        });
      }
    } catch (error) {
      this.logger.logError('custom_asset_init', error as Error, {
        globalDirectory: this.globalCustomAssetsDir
      });
      throw new Error('Failed to initialize custom assets directory');
    }
  }

  /**
   * レジストリファイルを読み込み
   */
  private loadRegistry(): CustomAssetRegistry {
    try {
      if (!fs.existsSync(this.registryFile)) {
        return { assets: [] };
      }

      const registryContent = fs.readFileSync(this.registryFile, 'utf-8');
      return JSON.parse(registryContent);
    } catch (error) {
      this.logger.logError('custom_asset_registry', error as Error, {
        registryFile: this.registryFile
      });
      // 破損したレジストリファイルの場合は空で初期化
      return { assets: [] };
    }
  }

  /**
   * レジストリファイルを保存
   */
  private saveRegistry(registry: CustomAssetRegistry): void {
    try {
      fs.writeFileSync(this.registryFile, JSON.stringify(registry, null, 2), 'utf-8');
    } catch (error) {
      this.logger.logError('custom_asset_registry', error as Error, {
        registryFile: this.registryFile
      });
      throw new Error('Failed to save custom assets registry');
    }
  }

  /**
   * 利用可能な CustomAsset 一覧を取得（指定した型のみ）
   */
  async getAvailableCustomAssets(type: string = 'DynamicVector'): Promise<CustomAssetInfo[]> {
    const tracker = new PerformanceTracker('get_available_custom_assets');
    
    try {
      await this.logger.logDevelopment('custom_asset_load', 'Loading available custom assets', { type });
      
      const registry = this.loadRegistry();
      
      // 指定した型のアセットのみフィルタリング
      const filteredAssets = registry.assets.filter(asset => asset.type === type);
      
      // ファイルの存在チェックと情報の更新
      const validAssets: CustomAssetInfo[] = [];
      for (const asset of filteredAssets) {
        if (fs.existsSync(asset.filePath)) {
          validAssets.push(asset);
          this.globalCustomAssetCache.set(asset.id, asset);
        } else {
          // ファイルが存在しない場合はレジストリから削除
          await this.logger.logDevelopment('custom_asset_cleanup', 'Removing missing custom asset from registry', {
            assetId: asset.id,
            filePath: asset.filePath
          });
        }
      }
      
      // 無効なエントリがあった場合はレジストリを更新
      if (validAssets.length !== filteredAssets.length) {
        const updatedRegistry = {
          assets: registry.assets.filter(asset => 
            asset.type !== type || validAssets.some(valid => valid.id === asset.id)
          )
        };
        this.saveRegistry(updatedRegistry);
      }

      await tracker.end({ assetsCount: validAssets.length, type });
      return validAssets;
      
    } catch (error) {
      await tracker.end({ success: false, error: (error as Error).message });
      await this.logger.logError('custom_asset_load', error as Error, { type });
      throw error;
    }
  }

  /**
   * CustomAsset を追加
   */
  async addCustomAsset(sourceFilePath: string): Promise<CustomAssetInfo> {
    const tracker = new PerformanceTracker('add_custom_asset');
    
    try {
      await this.logger.logDevelopment('custom_asset_add', 'Adding custom asset', { sourceFilePath });
      
      // ファイル拡張子の検証
      if (!isValidCustomAssetFilename(path.basename(sourceFilePath))) {
        throw new Error('Invalid file extension. Custom assets must have .komae.js extension.');
      }

      // ファイルの存在確認
      if (!fs.existsSync(sourceFilePath)) {
        throw new Error(`Source file not found: ${sourceFilePath}`);
      }

      // ファイルの内容を読み込みとメタデータ解析
      const fileContent = fs.readFileSync(sourceFilePath, 'utf-8');
      const parsedAsset = parseCustomAsset(fileContent);
      
      // ID生成
      const filename = path.basename(sourceFilePath);
      const id = generateCustomAssetId(filename);
      
      // ファイル名の重複チェック
      const registry = this.loadRegistry();
      const existingAsset = registry.assets.find(asset => asset.id === id);
      if (existingAsset) {
        throw new Error(`Custom asset with ID "${id}" already exists. Please rename the file or remove the existing asset.`);
      }

      // グローバルディレクトリにファイルをコピー
      const targetFilePath = path.join(this.globalCustomAssetsDir, filename);
      fs.copyFileSync(sourceFilePath, targetFilePath);

      // CustomAssetInfo を作成
      const customAssetInfo: CustomAssetInfo = {
        id,
        name: parsedAsset.metadata.name,
        type: parsedAsset.metadata.type,
        version: parsedAsset.metadata.version,
        author: parsedAsset.metadata.author,
        description: parsedAsset.metadata.description,
        parameters: parsedAsset.metadata.parameters,
        filePath: targetFilePath,
        addedAt: new Date().toISOString()
      };

      // レジストリに追加
      registry.assets.push(customAssetInfo);
      this.saveRegistry(registry);

      // キャッシュに追加
      this.globalCustomAssetCache.set(id, customAssetInfo);

      await tracker.end({ success: true, assetId: id });
      await this.logger.logDevelopment('custom_asset_add_success', 'Custom asset added successfully', {
        assetId: id,
        name: customAssetInfo.name,
        type: customAssetInfo.type
      });

      return customAssetInfo;
      
    } catch (error) {
      await tracker.end({ success: false, error: (error as Error).message });
      await this.logger.logError('custom_asset_add', error as Error, { sourceFilePath });
      throw error;
    }
  }

  /**
   * CustomAsset を削除
   */
  async removeCustomAsset(assetId: string): Promise<void> {
    const tracker = new PerformanceTracker('remove_custom_asset');
    
    try {
      await this.logger.logDevelopment('custom_asset_remove', 'Removing custom asset', { assetId });
      
      const registry = this.loadRegistry();
      const assetIndex = registry.assets.findIndex(asset => asset.id === assetId);
      
      if (assetIndex === -1) {
        throw new Error(`Custom asset with ID "${assetId}" not found`);
      }

      const asset = registry.assets[assetIndex];
      
      // ファイルを削除
      if (fs.existsSync(asset.filePath)) {
        fs.unlinkSync(asset.filePath);
      }

      // レジストリから削除
      registry.assets.splice(assetIndex, 1);
      this.saveRegistry(registry);

      // キャッシュから削除
      this.globalCustomAssetCache.delete(assetId);

      await tracker.end({ success: true, assetId });
      await this.logger.logDevelopment('custom_asset_remove_success', 'Custom asset removed successfully', {
        assetId,
        name: asset.name
      });
      
    } catch (error) {
      await tracker.end({ success: false, error: (error as Error).message });
      await this.logger.logError('custom_asset_remove', error as Error, { assetId });
      throw error;
    }
  }

  /**
   * CustomAsset の詳細情報を取得
   */
  async getCustomAssetInfo(assetId: string): Promise<CustomAssetInfo | null> {
    try {
      // キャッシュから取得を試行
      if (this.globalCustomAssetCache.has(assetId)) {
        return this.globalCustomAssetCache.get(assetId)!;
      }

      // レジストリから取得
      const registry = this.loadRegistry();
      const asset = registry.assets.find(asset => asset.id === assetId);
      
      if (asset && fs.existsSync(asset.filePath)) {
        this.globalCustomAssetCache.set(assetId, asset);
        return asset;
      }

      return null;
    } catch (error) {
      await this.logger.logError('custom_asset_info', error as Error, { assetId });
      return null;
    }
  }

  /**
   * CustomAsset のソースコードを取得
   */
  async getCustomAssetCode(assetId: string): Promise<string> {
    try {
      const assetInfo = await this.getCustomAssetInfo(assetId);
      if (!assetInfo) {
        throw new Error(`Custom asset with ID "${assetId}" not found`);
      }

      const fileContent = fs.readFileSync(assetInfo.filePath, 'utf-8');
      const parsedAsset = parseCustomAsset(fileContent);
      
      return parsedAsset.code;
    } catch (error) {
      await this.logger.logError('custom_asset_code', error as Error, { assetId });
      throw error;
    }
  }
}