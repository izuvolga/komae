import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { FileSystemService } from './FileSystemService';
import { getLogger, PerformanceTracker } from '../../utils/logger';
import type { FontInfo, FontType, FontManagerState, ProjectData } from '../../types/entities';
import { FontType as FontTypeEnum, DEFAULT_FONT_ID } from '../../types/entities';

export class FontManager {
  private fileSystemService: FileSystemService;
  private currentProjectPath: string | null = null;
  private logger = getLogger();
  private fontCache: Map<string, FontInfo> = new Map();

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

  constructor() {
    this.fileSystemService = new FileSystemService();
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
              const fontName = path.basename(item, ext);
              const fontId = `builtin-${fontName.toLowerCase().replace(/[\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '-')}`;
              
              // public/fontsからの相対パスをHTTP URLに変換
              const relativePath = path.relative(path.join(process.cwd(), 'public'), itemPath);
              const httpPath = relativePath.replace(/\\/g, '/'); // Windows対応
              
              builtinFonts.push({
                id: fontId,
                name: fontName,
                type: FontTypeEnum.BUILTIN,
                path: httpPath, // 例: "fonts/07やさしさゴシックボールド.ttf"
                filename: item,
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
   * カスタムフォントを追加
   */
  async addCustomFont(fontFilePath: string): Promise<FontInfo> {
    const tracker = new PerformanceTracker('add_custom_font');

    try {
      if (!this.currentProjectPath) {
        throw new Error('No project is currently open. Please open or create a project first.');
      }

      await this.logger.logDevelopment('add_custom_font_start', 'Adding custom font', {
        font_file: fontFilePath,
        project_path: this.currentProjectPath,
      });

      // フォントファイルのバリデーション
      await this.validateFontFile(fontFilePath);

      // プロジェクト内のフォントディレクトリを作成
      const projectFontsDir = path.join(this.currentProjectPath, 'fonts');
      if (!fs.existsSync(projectFontsDir)) {
        fs.mkdirSync(projectFontsDir, { recursive: true });
      }

      // フォントファイルをプロジェクトにコピー
      const fileName = path.basename(fontFilePath);
      const destinationPath = path.join(projectFontsDir, fileName);
      
      // 既存ファイルのチェック
      if (fs.existsSync(destinationPath)) {
        throw new Error(`Font file already exists: ${fileName}`);
      }

      fs.copyFileSync(fontFilePath, destinationPath);

      // FontInfo作成
      const fontName = path.basename(fileName, path.extname(fileName));
      const fontId = `custom-${uuidv4()}`;
      const relativePath = path.relative(this.currentProjectPath, destinationPath);

      const fontInfo: FontInfo = {
        id: fontId,
        name: fontName,
        type: FontTypeEnum.CUSTOM,
        path: relativePath,
        filename: fileName,
      };

      // キャッシュに保存
      this.fontCache.set(fontId, fontInfo);

      await this.logger.logDevelopment('custom_font_added', 'Custom font added successfully', {
        font_id: fontId,
        font_name: fontName,
        destination: relativePath,
      });

      await tracker.end({ success: true, font_id: fontId });
      return fontInfo;

    } catch (error) {
      await this.logger.logError('add_custom_font', error as Error, {
        font_file: fontFilePath,
        project_path: this.currentProjectPath,
      });

      await tracker.end({ success: false, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * カスタムフォントを削除
   */
  async removeCustomFont(fontId: string): Promise<void> {
    const tracker = new PerformanceTracker('remove_custom_font');

    try {
      if (!this.currentProjectPath) {
        throw new Error('No project is currently open. Please open or create a project first.');
      }

      const fontInfo = this.fontCache.get(fontId);
      if (!fontInfo || fontInfo.type !== FontTypeEnum.CUSTOM) {
        throw new Error(`Custom font not found: ${fontId}`);
      }

      await this.logger.logDevelopment('remove_custom_font_start', 'Removing custom font', {
        font_id: fontId,
        font_name: fontInfo.name,
      });

      // フォントファイルを削除
      const fontFilePath = path.join(this.currentProjectPath, fontInfo.path);
      if (fs.existsSync(fontFilePath)) {
        fs.unlinkSync(fontFilePath);
      }

      // キャッシュから削除
      this.fontCache.delete(fontId);

      await this.logger.logDevelopment('custom_font_removed', 'Custom font removed successfully', {
        font_id: fontId,
        font_name: fontInfo.name,
      });

      await tracker.end({ success: true, font_id: fontId });

    } catch (error) {
      await this.logger.logError('remove_custom_font', error as Error, {
        font_id: fontId,
      });

      await tracker.end({ success: false, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * 利用可能なフォント一覧を取得
   */
  async getAvailableFonts(project?: ProjectData): Promise<FontInfo[]> {
    try {
      const fonts: FontInfo[] = [];
      
      // ビルトインフォントを取得
      const builtinFonts = await this.loadBuiltinFonts();
      fonts.push(...builtinFonts);

      // プロジェクトのカスタムフォントを取得
      if (project && project.fonts) {
        const customFonts = Object.values(project.fonts);
        fonts.push(...customFonts);
        
        // キャッシュにも保存
        customFonts.forEach(font => {
          this.fontCache.set(font.id, font);
        });
      }

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
    return this.fontCache.get(fontId) || null;
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
  }
}
