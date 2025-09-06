import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { FileSystemService } from './FileSystemService';
import { getLogger, PerformanceTracker } from '../../utils/logger';
import {
  parseCustomAsset,
  generateCustomAssetId,
  isValidCustomAssetFilename,
} from '../../utils/customAssetParser';
import type { CustomAsset } from '../../types/entities';

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

      // ID生成: TODO: ハッシュでIDを作成したい
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

  /**
   * CustomAssetの完全なオブジェクトを取得（DynamicVectorAsset作成用）
   */
  async getCustomAsset(assetId: string): Promise<CustomAsset | null> {
    try {
      const assetInfo = await this.getCustomAssetInfo(assetId);
      if (!assetInfo) {
        return null;
      }

      const fileContent = fs.readFileSync(assetInfo.filePath, 'utf-8');
      const parsedAsset = parseCustomAsset(fileContent);

      // parametersをCustomAssetParameter[]形式に変換
      const customAssetParameters = assetInfo.parameters.map(param => ({
        name: param.name,
        type: param.type as 'number' | 'string' | 'boolean',
        defaultValue: param.defaultValue,
        description: undefined,
      }));

      // CustomAssetInfoとparsedAssetを統合してCustomAssetオブジェクトを作成
      const customAsset: CustomAsset = {
        id: assetInfo.id,
        name: assetInfo.name,
        type: 'DynamicVector' as const,
        version: assetInfo.version,
        author: assetInfo.author,
        description: assetInfo.description,
        width: 800, // デフォルト値
        height: 600, // デフォルト値
        parameters: customAssetParameters,
        script: parsedAsset.code,
        filePath: assetInfo.filePath,
        addedAt: assetInfo.addedAt,
      };

      return customAsset;
    } catch (error) {
      await this.logger.logError('custom_asset_get', error as Error, { assetId });
      return null;
    }
  }

  async generateCustomAssetSVG(assetId: string, parameters: Record<string, any>): Promise<string> {
    try {
      const assetInfo = await this.getCustomAssetInfo(assetId);
      if (!assetInfo) {
        throw new Error(`Custom asset with ID "${assetId}" not found`);
      }

      const fileContent = fs.readFileSync(assetInfo.filePath, 'utf-8');
      const parsedAsset = parseCustomAsset(fileContent);

      // パラメータをデフォルト値とマージ
      const mergedParameters = { ...assetInfo.parameters.reduce((acc, param) => {
        acc[param.name] = param.defaultValue;
        return acc;
      }, {} as Record<string, any>), ...parameters };

      // JavaScript コードの実行環境を作成
      const sandbox = {
        // パラメータを展開
        ...mergedParameters,

        // SVG生成のためのヘルパー関数
        createSVGElement: (tagName: string, attributes: Record<string, string | number> = {}, children: string = '') => {
          const attrs = Object.entries(attributes)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');
          return children
            ? `<${tagName} ${attrs}>${children}</${tagName}>`
            : `<${tagName} ${attrs}/>`;
        },

        // コンソール出力をキャプチャ
        console: {
          log: (...args: any[]) => console.log('[CustomAsset]', ...args),
          error: (...args: any[]) => console.error('[CustomAsset]', ...args),
          warn: (...args: any[]) => console.warn('[CustomAsset]', ...args)
        }
      };

      // コードを実行してSVGを生成
      const vm = require('vm');
      const context = vm.createContext(sandbox);

      // コードを実行し、結果を取得
      let result: string;
      try {
        const code = `
          (function() {
            ${parsedAsset.code}
            // generateSVG関数が定義されていることを想定
            if (typeof generateSVG === 'function') {
              // パラメータオブジェクトを渡して関数を呼び出し
              return generateSVG(${JSON.stringify(mergedParameters)});
            } else {
              throw new Error('generateSVG function not found in custom asset code');
            }
          })()
        `;
        console.log('Executing CustomAsset code:', code);
        result = vm.runInContext(code, context, { timeout: 5000 });
      } catch (executionError) {
        throw new Error(`Failed to execute custom asset code: ${executionError instanceof Error ? executionError.message : String(executionError)}`);
      }

      // 結果がSVG文字列であることを確認
      if (typeof result !== 'string') {
        throw new Error('Custom asset generateSVG function must return a string');
      }

      // SVGタグで囲まれていない場合は追加
      if (!result.trim().startsWith('<svg')) {
        result = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${result}</svg>`;
      }

      await this.logger.logDevelopment('custom_asset_svg_generated', 'SVG generated successfully', {
        assetId,
        parametersCount: Object.keys(parameters).length,
        svgLength: result.length
      });

      return result;
    } catch (error) {
      await this.logger.logError('custom_asset_svg_generation', error as Error, {
        assetId,
        parameters
      });
      throw error;
    }
  }

  async generateDynamicVectorSVG(
    asset: any, // DynamicVectorAsset
    instance: any, // DynamicVectorAssetInstance
    project: any, // ProjectData
    pageIndex: number = 0
  ): Promise<string> {
    try {
      // DynamicVectorAssetは常にCustomAssetなので、CustomAssetからスクリプトを実行
      if (asset.custom_asset_id) {
        const customAssetInfo = await this.getCustomAssetInfo(asset.custom_asset_id);
        if (!customAssetInfo) {
          throw new Error(`CustomAsset with ID "${asset.custom_asset_id}" not found`);
        }
        
        const parameters = asset.parameters || {};
        return await this.generateCustomAssetSVG(asset.custom_asset_id, parameters);
      }

      throw new Error('No custom_asset_id found in DynamicVectorAsset');
    } catch (error) {
      await this.logger.logError('dynamic_vector_svg_generation', error as Error, {
        assetId: asset.id,
        assetType: asset.custom_asset_id ? 'CustomAsset' : 'Script',
        pageIndex
      });
      throw error;
    }
  }

  // TODO: この関数使われてないのでは？
  private async executeDynamicVectorScript(
    asset: any, // DynamicVectorAsset
    instance: any, // DynamicVectorAssetInstance
    project: any, // ProjectData
    pageIndex: number
  ): Promise<string> {
    // 実行コンテキストを作成
    const context = this.createDynamicVectorContext(asset, instance, project, pageIndex);

    // Node.jsのvmモジュールを使用してスクリプトを安全に実行
    const vm = require('vm');
    const sandbox = {
      ...context,

      // SVG生成のためのヘルパー関数
      createSVGElement: (tagName: string, attributes: Record<string, string | number> = {}, children: string = '') => {
        const attrs = Object.entries(attributes)
          .map(([key, value]) => `${key}="${value}"`)
          .join(' ');
        return children
          ? `<${tagName} ${attrs}>${children}</${tagName}>`
          : `<${tagName} ${attrs}/>`;
      },

      // よく使用されるSVG関数
      rect: (x: number, y: number, width: number, height: number, fill: string = '#000') =>
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`,
      circle: (cx: number, cy: number, r: number, fill: string = '#000') =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`,
      text: (x: number, y: number, content: string, fontSize: number = 16, fill: string = '#000') =>
        `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}">${content}</text>`,
      path: (d: string, fill: string = 'none', stroke: string = '#000', strokeWidth: number = 1) =>
        `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`,

      // Math関数
      Math,

      // コンソール出力をキャプチャ
      console: {
        log: (...args: any[]) => console.log('[DynamicVector]', ...args),
        error: (...args: any[]) => console.error('[DynamicVector]', ...args),
        warn: (...args: any[]) => console.warn('[DynamicVector]', ...args)
      }
    };

    const vmContext = vm.createContext(sandbox);

    // スクリプトを実行してSVGを生成
    let result: string;
    try {
      let code = `
        (function() {
          ${asset.script}
          // generateSVG関数またはscriptの結果を取得
          if (typeof generateSVG === 'function') {
            return generateSVG();
          } else {
            // スクリプト自体が値を返す場合
            return eval('(' + ${JSON.stringify(asset.script)} + ')');
          }
        })()
      `;
      console.log('Executing DynamicVector script:', code);
      result = vm.runInContext(code, vmContext, { timeout: 5000 });
    } catch (executionError) {
      throw new Error(`Failed to execute DynamicVector script: ${executionError instanceof Error ? executionError.message : String(executionError)}`);
    }

    // 結果がSVG文字列であることを確認
    if (typeof result !== 'string') {
      throw new Error('DynamicVector script must return a string');
    }

    // SVGタグで囲まれていない場合は追加
    if (!result.trim().startsWith('<svg') && !result.trim().startsWith('<g')) {
      result = `<g>${result}</g>`;
    }

    await this.logger.logDevelopment('dynamic_vector_svg_generated', 'DynamicVector SVG generated successfully', {
      assetId: asset.id,
      svgLength: result.length,
      pageIndex
    });

    return result;
  }

  private createDynamicVectorContext(
    asset: any, // DynamicVectorAsset
    instance: any, // DynamicVectorAssetInstance
    project: any, // ProjectData
    pageIndex: number
  ): Record<string, any> {
    // 位置・サイズ・オパシティを取得
    const posX = instance?.override_pos_x ?? asset.default_pos_x;
    const posY = instance?.override_pos_y ?? asset.default_pos_y;
    const width = instance?.override_width ?? asset.default_width;
    const height = instance?.override_height ?? asset.default_height;
    const opacity = instance?.override_opacity ?? asset.default_opacity;

    // ページ変数
    const pageVariables = {
      page_current: pageIndex + 1,
      page_total: project.pages?.length || 1
    };

    // ValueAsset変数
    const valueVariables: Record<string, any> = {};
    if (project.assets) {
      Object.values(project.assets).forEach((projAsset: any) => {
        if (projAsset.type === 'ValueAsset' && projAsset.name) {
          valueVariables[projAsset.name] = projAsset.value;
        }
      });
    }

    return {
      // アセット情報
      asset_name: asset.name,
      asset_id: asset.id,

      // 位置・サイズ情報
      pos_x: posX,
      pos_y: posY,
      width,
      height,
      opacity,

      // ページ情報
      ...pageVariables,

      // 値アセット変数
      ...valueVariables,

      // プロジェクト情報
      canvas_width: project.canvas?.width || 800,
      canvas_height: project.canvas?.height || 600
    };
  }
}
