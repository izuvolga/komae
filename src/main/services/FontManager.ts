import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { app } from 'electron';
import * as opentype from 'opentype.js';
import { FileSystemService } from './FileSystemService';
import { getLogger, PerformanceTracker } from '../../utils/logger';
import type { FontInfo, FontType, FontManagerState, ProjectData, FontRegistry, FontRegistryEntry } from '../../types/entities';
import { FontType as FontTypeEnum, DEFAULT_FONT_ID } from '../../types/entities';

export class FontManager {
  private fileSystemService: FileSystemService;
  private currentProjectPath: string | null = null;
  private logger = getLogger();
  private fontCache: Map<string, FontInfo> = new Map();
  
  // グローバルフォント管理
  private globalFontsDir: string;
  private registryFile: string;
  private globalFontCache: Map<string, FontInfo> = new Map();

  // ビルトインフォントディレクトリ（アプリリソースから取得）
  private static readonly BUILTIN_FONTS_DIR = this.getBuiltinFontsDir();
  
  /**
   * ビルトインフォントディレクトリのパスを取得
   * 開発環境とプロダクション環境で適切なパスを返す
   */
  private static getBuiltinFontsDir(): string {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // 開発環境: public/fonts ディレクトリ
      return path.join(process.cwd(), 'public', 'fonts');
    } else {
      // プロダクション環境: アプリリソース内の public/fonts ディレクトリ
      const { app } = require('electron');
      return path.join(app.getAppPath(), 'public', 'fonts');
    }
  }
  
  // サポートするフォント拡張子
  private static readonly SUPPORTED_FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];

  /**
   * ファイルのSHA256ハッシュを計算してフォントIDを生成
   */
  private static generateFontId(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    // 最初の8文字を使用してfont-xxxxxxxxの形式にする
    return `font-${hash.substring(0, 8)}`;
  }

  /**
   * フォントファイルからメタデータを抽出
   */
  private static extractFontMetadata(filePath: string): { fullName: string; family: string; subfamily: string } {
    try {
      const buffer = fs.readFileSync(filePath);
      // Node.jsのBufferをArrayBufferに変換
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      const font = opentype.parse(arrayBuffer);
      
      // フォント名の優先順位:
      // 1. Full name (name ID 4)
      // 2. Family name + Subfamily name (name ID 1 + 2)
      // 3. PostScript name (name ID 6)
      // 4. ファイル名をフォールバック
      
      const names = font.names;
      
      // LocalizedNameから文字列を取得するヘルパー関数
      const getLocalizedNameString = (localizedName: any): string => {
        if (typeof localizedName === 'string') {
          return localizedName;
        }
        // 英語を優先、なければ最初の言語を使用
        return localizedName?.en || Object.values(localizedName || {})[0] as string || '';
      };
      
      const fullNameStr = getLocalizedNameString(names.fullName);
      const familyStr = getLocalizedNameString(names.fontFamily);
      const subfamilyStr = getLocalizedNameString(names.fontSubfamily);
      const postScriptStr = getLocalizedNameString(names.postScriptName);
      
      const fullName = fullNameStr || `${familyStr || ''} ${subfamilyStr || ''}`.trim();
      const family = familyStr || postScriptStr || path.basename(filePath, path.extname(filePath));
      const subfamily = subfamilyStr || 'Regular';
      
      if (!fullName && !familyStr) {
        throw new Error('Font metadata extraction failed: no valid font names found');
      }
      
      return {
        fullName: fullName || family,
        family,
        subfamily
      };
    } catch (error) {
      throw new Error(`Failed to extract font metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  constructor() {
    this.fileSystemService = new FileSystemService();
    
    // グローバルフォント管理の初期化
    this.globalFontsDir = path.join(app.getPath('userData'), 'fonts');
    this.registryFile = path.join(this.globalFontsDir, 'fonts-registry.json');
    this.ensureGlobalDirectories();
  }

  /**
   * 現在のプロジェクトパスを設定
   */
  setCurrentProjectPath(projectPath: string | null): void {
    this.currentProjectPath = projectPath;
  }

  /**
   * ビルトインフォントを読み込み
   */
  async loadBuiltinFonts(): Promise<FontInfo[]> {
    const tracker = new PerformanceTracker('load_builtin_fonts');
    
    try {
      await this.logger.logDevelopment('builtin_fonts_load_start', 'Loading builtin fonts', {
        builtin_fonts_dir: FontManager.BUILTIN_FONTS_DIR,
      });

      const builtinFonts: FontInfo[] = [];
      
      // デフォルト（システム）フォント
      builtinFonts.push({
        id: DEFAULT_FONT_ID,
        name: 'System Default',
        type: FontTypeEnum.BUILTIN,
        path: 'system-ui',
      });

      // fontsディレクトリの存在確認
      if (!fs.existsSync(FontManager.BUILTIN_FONTS_DIR)) {
        await this.logger.logDevelopment('builtin_fonts_dir_not_found', 'Builtin fonts directory not found', {
          dir: FontManager.BUILTIN_FONTS_DIR,
        });
        
        await tracker.end({ success: true, font_count: builtinFonts.length });
        return builtinFonts;
      }

      // fontsディレクトリ内のフォントファイルを再帰的に検索
      const scanFontFiles = (directory: string): void => {
        const items = fs.readdirSync(directory);
        
        for (const item of items) {
          const itemPath = path.join(directory, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            // サブディレクトリを再帰的に検索
            scanFontFiles(itemPath);
          } else if (stats.isFile()) {
            const ext = path.extname(item).toLowerCase();
            
            if (FontManager.SUPPORTED_FONT_EXTENSIONS.includes(ext)) {
              const fontId = FontManager.generateFontId(itemPath);
              
              // フォントメタデータから適切な名前を取得
              let fontName: string;
              try {
                const metadata = FontManager.extractFontMetadata(itemPath);
                fontName = metadata.fullName;
              } catch (error) {
                // ビルトインフォントでメタデータ抽出に失敗した場合はファイル名をフォールバック
                fontName = path.basename(item, ext);
                console.warn(`Failed to extract metadata from builtin font ${itemPath}:`, error);
              }
              
              // public/fontsからの相対パスをHTTP URLに変換
              const relativePath = path.relative(path.join(process.cwd(), 'public'), itemPath);
              const httpPath = relativePath.replace(/\\/g, '/'); // Windows対応
              
              // ライセンスファイルを探す
              let license: string | undefined;
              let licenseFile: string | undefined;
              const possibleLicenseFiles = [
                path.join(directory, `${fontName}.txt`),
                path.join(directory, `${fontName}.license`),
                path.join(directory, `${fontName}_LICENSE.txt`),
                path.join(directory, 'LICENSE.txt'),
                path.join(directory, 'license.txt'),
              ];
              
              for (const licenseFilePath of possibleLicenseFiles) {
                if (fs.existsSync(licenseFilePath)) {
                  try {
                    license = fs.readFileSync(licenseFilePath, 'utf-8');
                    const licensePubPath = path.relative(path.join(process.cwd(), 'public'), licenseFilePath);
                    licenseFile = licensePubPath.replace(/\\/g, '/');
                    break;
                  } catch (error) {
                    // ライセンス読み込みエラーは無視して続行
                  }
                }
              }
              
              builtinFonts.push({
                id: fontId,
                name: fontName,
                type: FontTypeEnum.BUILTIN,
                path: `builtin/fonts/${item}`, // komae-asset://builtin/fonts/用のパス
                filename: item,
                license,
                licenseFile,
              });
            }
          }
        }
      };
      
      scanFontFiles(FontManager.BUILTIN_FONTS_DIR);

      // キャッシュに保存
      builtinFonts.forEach(font => {
        this.fontCache.set(font.id, font);
      });

      await this.logger.logDevelopment('builtin_fonts_loaded', 'Builtin fonts loaded successfully', {
        font_count: builtinFonts.length,
        fonts: builtinFonts.map(f => ({ id: f.id, name: f.name })),
      });

      await tracker.end({ success: true, font_count: builtinFonts.length });
      return builtinFonts;

    } catch (error) {
      await this.logger.logError('load_builtin_fonts', error as Error, {
        builtin_fonts_dir: FontManager.BUILTIN_FONTS_DIR,
      });

      await tracker.end({ success: false, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * カスタムフォントを追加（グローバル保存）
   */
  async addCustomFont(fontFilePath: string, licenseFilePath?: string): Promise<FontInfo> {
    const tracker = new PerformanceTracker('add_custom_font');

    try {
      await this.logger.logDevelopment('add_custom_font_start', 'Adding global custom font', {
        font_file: fontFilePath,
        global_fonts_dir: this.globalFontsDir,
      });

      // フォントファイルのバリデーション
      await this.validateFontFile(fontFilePath);

      // グローバルフォントディレクトリを確保
      this.ensureGlobalDirectories();

      // フォントファイルをフォントID別ディレクトリにコピー
      const fileName = path.basename(fontFilePath);
      const fontId = FontManager.generateFontId(fontFilePath);
      const fontDir = path.join(this.globalFontsDir, fontId);
      const destinationPath = path.join(fontDir, fileName);
      
      // フォントディレクトリを作成
      if (!fs.existsSync(fontDir)) {
        fs.mkdirSync(fontDir, { recursive: true });
      }
      
      // 既存ファイルのチェック（同じフォントIDの場合は上書きしない）
      if (fs.existsSync(destinationPath)) {
        throw new Error(`Font already exists: ${fileName} (ID: ${fontId})`);
      }

      fs.copyFileSync(fontFilePath, destinationPath);

      // ライセンス情報の処理
      let license: string | undefined;
      let licenseFileRelativePath: string | undefined;
      
      if (licenseFilePath && fs.existsSync(licenseFilePath)) {
        try {
          // ライセンスファイルを同じフォントIDディレクトリにコピー
          const licenseFileName = path.basename(licenseFilePath);
          const licenseDestinationPath = path.join(fontDir, licenseFileName);
          fs.copyFileSync(licenseFilePath, licenseDestinationPath);
          
          // ライセンスファイルの内容を読み込み
          license = fs.readFileSync(licenseFilePath, 'utf-8');
          licenseFileRelativePath = `global/fonts/${fontId}/${licenseFileName}`;
          
          await this.logger.logDevelopment('license_file_processed', 'License file processed', {
            license_file: licenseFilePath,
            license_length: license.length,
          });
        } catch (licenseError) {
          // ライセンス処理エラーは警告として扱い、フォント追加は続行
          await this.logger.logDevelopment('license_file_warning', 'License file processing failed', {
            license_file: licenseFilePath,
            error: licenseError instanceof Error ? licenseError.message : String(licenseError),
          });
        }
      }

      // FontInfo作成 - メタデータから適切なフォント名を取得
      let fontName: string;
      try {
        const metadata = FontManager.extractFontMetadata(fontFilePath);
        fontName = metadata.fullName;
        await this.logger.logDevelopment('font_metadata_extracted', 'Font metadata extracted successfully', {
          font_id: fontId,
          full_name: metadata.fullName,
          family: metadata.family,
          subfamily: metadata.subfamily,
        });
      } catch (error) {
        // メタデータ抽出に失敗した場合はエラーを投げる（無効なフォントファイル）
        await this.logger.logError('font_metadata_extraction_failed', error as Error, {
          font_file: fontFilePath,
        });
        throw new Error(`Invalid font file: ${error instanceof Error ? error.message : String(error)}`);
      }

      const fontInfo: FontInfo = {
        id: fontId,
        name: fontName,
        type: FontTypeEnum.CUSTOM,
        path: `global/fonts/${fontId}/${fileName}`,
        filename: fileName,
        license,
        licenseFile: licenseFileRelativePath,
      };

      // レジストリを更新
      const registry = await this.loadGlobalRegistry();
      const registryEntry: FontRegistryEntry = {
        id: fontId,
        name: fontName,
        filename: fileName,
        licenseFile: licenseFileRelativePath,
        license,
        addedAt: new Date().toISOString(),
      };
      
      registry.fonts.push(registryEntry);
      await this.saveGlobalRegistry(registry);

      // キャッシュに保存
      this.globalFontCache.set(fontId, fontInfo);

      await this.logger.logDevelopment('global_font_added', 'Global custom font added successfully', {
        font_id: fontId,
        font_name: fontName,
        destination: destinationPath,
      });

      await tracker.end({ success: true, font_id: fontId });
      return fontInfo;

    } catch (error) {
      await this.logger.logError('add_custom_font', error as Error, {
        font_file: fontFilePath,
        global_fonts_dir: this.globalFontsDir,
      });

      await tracker.end({ success: false, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * カスタムフォントを削除（グローバルから）
   */
  async removeCustomFont(fontId: string): Promise<void> {
    const tracker = new PerformanceTracker('remove_custom_font');

    try {
      const fontInfo = this.globalFontCache.get(fontId);
      if (!fontInfo || fontInfo.type !== FontTypeEnum.CUSTOM) {
        throw new Error(`Global custom font not found: ${fontId}`);
      }

      await this.logger.logDevelopment('remove_custom_font_start', 'Removing global custom font', {
        font_id: fontId,
        font_name: fontInfo.name,
      });

      // フォントディレクトリ全体を削除（フォントファイルとライセンスファイルを含む）
      const fontDir = path.join(this.globalFontsDir, fontId);
      if (fs.existsSync(fontDir)) {
        fs.rmSync(fontDir, { recursive: true, force: true });
      }

      // レジストリから削除
      const registry = await this.loadGlobalRegistry();
      registry.fonts = registry.fonts.filter(f => f.id !== fontId);
      await this.saveGlobalRegistry(registry);

      // キャッシュから削除
      this.globalFontCache.delete(fontId);

      await this.logger.logDevelopment('global_font_removed', 'Global custom font removed successfully', {
        font_id: fontId,
        font_name: fontInfo.name,
      });

      await tracker.end({ success: true, font_id: fontId });

    } catch (error) {
      await this.logger.logError('remove_custom_font', error as Error, {
        font_id: fontId,
        global_fonts_dir: this.globalFontsDir,
      });

      await tracker.end({ success: false, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 利用可能なフォント一覧を取得（ビルトイン + グローバルカスタム）
   */
  async getAvailableFonts(project?: ProjectData): Promise<FontInfo[]> {
    try {
      const fonts: FontInfo[] = [];
      
      // グローバルカスタムフォントを取得（カスタムフォントを先頭に配置）
      const globalFonts = await this.loadGlobalFonts();
      fonts.push(...globalFonts);

      // ビルトインフォントを取得
      const builtinFonts = await this.loadBuiltinFonts();
      fonts.push(...builtinFonts);

      return fonts;

    } catch (error) {
      await this.logger.logError('get_available_fonts', error as Error);
      throw error;
    }
  }

  /**
   * フォント情報を取得
   */
  getFontInfo(fontId: string): FontInfo | null {
    return this.fontCache.get(fontId) || this.globalFontCache.get(fontId) || null;
  }

  /**
   * フォントファイルの検証
   */
  private async validateFontFile(fontFilePath: string): Promise<void> {
    if (!fs.existsSync(fontFilePath)) {
      throw new Error(`Font file does not exist: ${fontFilePath}`);
    }

    const ext = path.extname(fontFilePath).toLowerCase();
    if (!FontManager.SUPPORTED_FONT_EXTENSIONS.includes(ext)) {
      throw new Error(`Unsupported font file format: ${ext}. Supported formats: ${FontManager.SUPPORTED_FONT_EXTENSIONS.join(', ')}`);
    }

    const stats = fs.statSync(fontFilePath);
    if (stats.size === 0) {
      throw new Error(`Font file is empty: ${fontFilePath}`);
    }

    // ファイルサイズ制限（10MB）
    const MAX_FONT_SIZE = 10 * 1024 * 1024;
    if (stats.size > MAX_FONT_SIZE) {
      throw new Error(`Font file is too large (${Math.round(stats.size / 1024 / 1024)}MB). Maximum size is 10MB.`);
    }
  }

  /**
   * プロジェクトで使用されているフォントのリストを取得
   */
  getProjectUsedFonts(project: ProjectData): string[] {
    const usedFontIds = new Set<string>();

    // TextAssetで使用されているフォントを収集
    Object.values(project.assets).forEach(asset => {
      if (asset.type === 'TextAsset') {
        usedFontIds.add(asset.font);
      }
    });

    return Array.from(usedFontIds);
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.fontCache.clear();
    this.globalFontCache.clear();
  }

  /**
   * グローバルフォントディレクトリを確保
   */
  private ensureGlobalDirectories(): void {
    if (!fs.existsSync(this.globalFontsDir)) {
      fs.mkdirSync(this.globalFontsDir, { recursive: true });
    }
  }

  /**
   * グローバルフォントレジストリを読み込み
   */
  private async loadGlobalRegistry(): Promise<FontRegistry> {
    try {
      if (fs.existsSync(this.registryFile)) {
        const data = fs.readFileSync(this.registryFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      await this.logger.logError('load_global_registry', error as Error, {
        registry_file: this.registryFile,
      });
    }
    
    // デフォルトレジストリを返す
    return {
      version: '1.0',
      fonts: []
    };
  }

  /**
   * グローバルフォントレジストリを保存
   */
  private async saveGlobalRegistry(registry: FontRegistry): Promise<void> {
    try {
      fs.writeFileSync(this.registryFile, JSON.stringify(registry, null, 2), 'utf-8');
      
      await this.logger.logDevelopment('save_global_registry', 'Global font registry saved', {
        registry_file: this.registryFile,
        font_count: registry.fonts.length,
      });
    } catch (error) {
      await this.logger.logError('save_global_registry', error as Error, {
        registry_file: this.registryFile,
      });
      throw error;
    }
  }

  /**
   * グローバルフォントを読み込み
   */
  private async loadGlobalFonts(): Promise<FontInfo[]> {
    try {
      // Phase 1: レジストリベースの不整合チェック
      const registry = await this.loadGlobalRegistry();
      const validEntries: FontRegistryEntry[] = [];
      const invalidEntries: FontRegistryEntry[] = [];
      
      for (const entry of registry.fonts) {
        const fontPath = path.join(this.globalFontsDir, entry.id, entry.filename);
        if (fs.existsSync(fontPath)) {
          validEntries.push(entry);
        } else {
          invalidEntries.push(entry);
          await this.logger.logDevelopment('global_font_missing', 'Global font file missing', {
            font_id: entry.id,
            expected_path: fontPath,
          });
        }
      }
      
      // Phase 2: ファイルシステムベースの不整合チェック
      const orphanedDirectories = await this.findOrphanedFontDirectories(validEntries);
      
      // 不整合データの一括修正
      if (invalidEntries.length > 0 || orphanedDirectories.length > 0) {
        await this.cleanupInconsistentData(invalidEntries, orphanedDirectories, validEntries);
      }
      
      // 正常なフォント情報のみを構築して返す
      return this.buildFontInfoList(validEntries);
    } catch (error) {
      await this.logger.logError('load_global_fonts', error as Error, {
        global_fonts_dir: this.globalFontsDir,
      });
      return [];
    }
  }

  /**
   * レジストリに存在しない孤立したフォントディレクトリを検出
   */
  private async findOrphanedFontDirectories(validEntries: FontRegistryEntry[]): Promise<string[]> {
    const orphanedDirectories: string[] = [];
    
    try {
      if (!fs.existsSync(this.globalFontsDir)) {
        return orphanedDirectories;
      }
      
      const validFontIds = new Set(validEntries.map(entry => entry.id));
      const existingDirectories = fs.readdirSync(this.globalFontsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const dirName of existingDirectories) {
        // フォントIDの形式チェック（font-xxxxxxxx形式）
        if (dirName.startsWith('font-') && !validFontIds.has(dirName)) {
          orphanedDirectories.push(dirName);
        }
      }
      
      if (orphanedDirectories.length > 0) {
        await this.logger.logDevelopment('orphaned_directories_found', 'Orphaned font directories detected', {
          directories: orphanedDirectories,
        });
      }
    } catch (error) {
      await this.logger.logError('find_orphaned_directories', error as Error);
    }
    
    return orphanedDirectories;
  }

  /**
   * 不整合データの一括修正処理
   */
  private async cleanupInconsistentData(
    invalidEntries: FontRegistryEntry[],
    orphanedDirectories: string[],
    validEntries: FontRegistryEntry[]
  ): Promise<void> {
    try {
      await this.logger.logDevelopment('font_inconsistency_detected', 'Font data inconsistency detected', {
        invalid_registry_entries: invalidEntries.length,
        orphaned_directories: orphanedDirectories.length,
      });
      
      // 孤立ディレクトリの削除
      for (const dirName of orphanedDirectories) {
        const dirPath = path.join(this.globalFontsDir, dirName);
        try {
          fs.rmSync(dirPath, { recursive: true, force: true });
          await this.logger.logDevelopment('orphaned_directory_removed', 'Orphaned font directory removed', {
            directory: dirName,
            path: dirPath,
          });
        } catch (error) {
          await this.logger.logError('remove_orphaned_directory', error as Error, {
            directory: dirName,
            path: dirPath,
          });
        }
      }
      
      // レジストリの修正（有効なエントリのみ保持）
      if (invalidEntries.length > 0) {
        const updatedRegistry: FontRegistry = {
          version: '1.0',
          fonts: validEntries
        };
        
        await this.saveGlobalRegistry(updatedRegistry);
        
        // 無効なエントリをキャッシュからも削除
        for (const entry of invalidEntries) {
          this.globalFontCache.delete(entry.id);
        }
        
        await this.logger.logDevelopment('invalid_registry_entries_removed', 'Invalid registry entries removed', {
          removed_entries: invalidEntries.map(e => ({ id: e.id, name: e.name })),
        });
      }
      
      await this.logger.logDevelopment('font_inconsistency_repaired', 'Font data inconsistency repaired successfully', {
        removed_registry_entries: invalidEntries.length,
        removed_directories: orphanedDirectories.length,
      });
    } catch (error) {
      await this.logger.logError('cleanup_inconsistent_data', error as Error);
    }
  }

  /**
   * 有効なレジストリエントリからFontInfo配列を構築
   */
  private buildFontInfoList(validEntries: FontRegistryEntry[]): FontInfo[] {
    const fonts: FontInfo[] = [];
    
    for (const entry of validEntries) {
      const fontInfo: FontInfo = {
        id: entry.id,
        name: entry.name,
        type: FontTypeEnum.CUSTOM,
        path: `global/fonts/${entry.id}/${entry.filename}`,
        filename: entry.filename,
        license: entry.license,
        licenseFile: entry.licenseFile,
      };
      
      fonts.push(fontInfo);
      this.globalFontCache.set(entry.id, fontInfo);
    }

    this.logger.logDevelopment('load_global_fonts', 'Global fonts loaded', {
      font_count: fonts.length,
    });
    
    return fonts;
  }
}
