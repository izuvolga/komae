// エンティティの型定義
// docs/design/000-entity.mdに基づく

export interface ProjectMetadata {
  komae_version: string;
  project_version: string;
  title: string;
  description?: string;
  supportedLanguages: string[]; // ISO 639-1言語コード ['ja', 'en', 'zh']
  currentLanguage: string; // 現在の表示言語 'ja'
}

export interface CanvasConfig {
  width: number;
  height: number;
}

// AssetAttr定義は削除 - ImageAssetInstanceに直接override_width, override_heightを追加

// Asset定義（テンプレート）
export interface BaseAsset {
  id: string;
  type: 'ImageAsset' | 'TextAsset' | 'VectorAsset';
  name: string;
}

export interface ImageAsset extends BaseAsset {
  type: 'ImageAsset';
  original_file_path: string;
  original_width: number;
  original_height: number;
  default_pos_x: number;
  default_pos_y: number;
  default_width: number;
  default_height: number;
  default_opacity: number;
  default_mask?: [[number, number], [number, number], [number, number], [number, number]]; // 4点の座標（optional）
  default_z_index: number;
}

export interface TextAsset extends BaseAsset {
  type: 'TextAsset';
  
  // 新仕様: 必要最小限のフィールドのみ
  default_text: string;
  default_context?: string; // そのテキストの表す文脈 (例: 'キャラクターAの叫び声')
  default_fill_color: string; // テキストの内部の色（RGBA形式の文字列）
  default_stroke_color: string; // テキストの縁取りの色（RGBA形式の文字列）
  default_opacity: number; // デフォルトの不透明度（0.0〜1.0）
  default_z_index: number;
  default_language_settings?: Record<string, LanguageSettings>; // 言語別のデフォルト設定
}

export interface VectorAsset extends BaseAsset {
  type: 'VectorAsset';
  original_file_path: string;
  original_width: number;
  original_height: number;
  default_pos_x: number;
  default_pos_y: number;
  default_width: number;
  default_height: number;
  default_opacity: number;
  default_z_index: number;
  svg_content: string; // SVGの内容をテキストとして保持
}

export type Asset = ImageAsset | TextAsset | VectorAsset;

// Font管理定義
export enum FontType {
  BUILTIN = 'builtin',
  CUSTOM = 'custom'
}

export interface FontInfo {
  id: string;
  name: string;
  type: FontType;
  path: string; // ビルトインの場合は相対パス、カスタムの場合はプロジェクト内の相対パス
  filename?: string; // ファイル名（表示用）
  license?: string; // ライセンステキスト全文（表示・エクスポート用）
  licenseFile?: string; // ライセンスファイルパス（参照・管理用）
  // Google Fonts 用フィールド
  isGoogleFont?: boolean;
  googleFontUrl?: string;
}

export interface FontManagerState {
  availableFonts: Record<string, FontInfo>;
  defaultFontId: string;
}

export interface FontRegistry {
  version: string;
  fonts: FontRegistryEntry[];
}

export interface FontRegistryEntry {
  id: string;
  name: string;
  filename: string;
  licenseFile?: string;
  license?: string;
  addedAt: string;
  // Google Fonts 用フィールド
  isGoogleFont?: boolean;
  googleFontUrl?: string;
}

// フォント定数
export const DEFAULT_FONT_ID = 'system-ui';

// AssetInstance定義
export interface BaseAssetInstance {
  id: string;
  asset_id: string;
}

export interface ImageAssetInstance extends BaseAssetInstance {
  override_pos_x?: number;
  override_pos_y?: number;
  override_width?: number;
  override_height?: number;
  override_opacity?: number;
  override_mask?: [[number, number], [number, number], [number, number], [number, number]];
  override_z_index?: number;
}

export interface TextAssetInstance extends BaseAssetInstance {
  // 言語別のテキスト内容
  multilingual_text: Record<string, string>;
  // インスタンス個別の言語別設定
  override_language_settings?: Record<string, LanguageSettings>;
  // インスタンス個別の文脈設定
  override_context?: string;
}

export interface VectorAssetInstance extends BaseAssetInstance {
  override_pos_x?: number;
  override_pos_y?: number;
  override_width?: number;
  override_height?: number;
  override_opacity?: number;
  override_z_index?: number;
}

// 多言語対応のための言語別オーバーライド設定
// 言語別設定のオーバーライド用統一型
export interface LanguageSettings {
  override_pos_x?: number;
  override_pos_y?: number;
  override_font?: string;
  override_font_size?: number;
  override_stroke_width?: number;
  override_leading?: number;
  override_vertical?: boolean;
  override_opacity?: number;
  override_z_index?: number;
  override_fill_color?: string;
  override_stroke_color?: string;
}

export type AssetInstance = ImageAssetInstance | TextAssetInstance | VectorAssetInstance;

// AssetInstanceのoverride値チェック用ヘルパー関数
export function hasAssetInstanceOverrides(instance: AssetInstance, assetType: Asset['type']): boolean {
  if (!instance) return false;
  
  if (assetType === 'TextAsset') {
    const textInstance = instance as TextAssetInstance;
    return !!(textInstance.override_language_settings && Object.keys(textInstance.override_language_settings).length > 0);
  } else if (assetType === 'ImageAsset') {
    const imageInstance = instance as ImageAssetInstance;
    return !!(
      imageInstance.override_pos_x !== undefined ||
      imageInstance.override_pos_y !== undefined ||
      imageInstance.override_width !== undefined ||
      imageInstance.override_height !== undefined ||
      imageInstance.override_opacity !== undefined ||
      imageInstance.override_mask ||
      imageInstance.override_z_index !== undefined
    );
  } else if (assetType === 'VectorAsset') {
    const vectorInstance = instance as VectorAssetInstance;
    return !!(
      vectorInstance.override_pos_x !== undefined ||
      vectorInstance.override_pos_y !== undefined ||
      vectorInstance.override_width !== undefined ||
      vectorInstance.override_height !== undefined ||
      vectorInstance.override_opacity !== undefined ||
      vectorInstance.override_z_index !== undefined
    );
  }
  
  return false;
}

/**
 * AssetとAssetInstanceからz_indexを統合して取得
 * TextAssetInstanceの場合は多言語overrideを確認、ImageAssetInstanceの場合は既存のoverride_z_indexを使用
 */
export function getEffectiveZIndex(asset: Asset, instance: AssetInstance, currentLang?: string): number {
  if (asset.type === 'TextAsset') {
    const textInstance = instance as TextAssetInstance;
    // TextAssetは言語別設定のみを使用（インスタンス > アセット の順）
    if (currentLang) {
      const languageSetting = getEffectiveLanguageSetting(asset, textInstance, currentLang, 'override_z_index');
      if (languageSetting !== undefined) {
        return languageSetting;
      }
    }
  } else if (asset.type === 'ImageAsset') {
    const imageInstance = instance as ImageAssetInstance;
    if (imageInstance.override_z_index !== undefined) {
      return imageInstance.override_z_index;
    }
  } else if (asset.type === 'VectorAsset') {
    const vectorInstance = instance as VectorAssetInstance;
    if (vectorInstance.override_z_index !== undefined) {
      return vectorInstance.override_z_index;
    }
  }
  
  return asset.default_z_index ?? 0;
}

// AssetInstanceのoverride値をリセットする関数
export function resetAssetInstanceOverrides(instance: AssetInstance, assetType: Asset['type']): Partial<AssetInstance> {
  const resetUpdates: any = {};
  
  if (assetType === 'TextAsset') {
    // TextAssetInstanceは言語別オーバーライドをリセット
    resetUpdates.override_language_settings = undefined;
    resetUpdates.override_context = undefined;
    resetUpdates.override_opacity = undefined;
    resetUpdates.override_z_index = undefined;
  } else if (assetType === 'ImageAsset') {
    // ImageAssetInstanceは既存のoverride項目をリセット
    resetUpdates.override_pos_x = undefined;
    resetUpdates.override_pos_y = undefined;
    resetUpdates.override_width = undefined;
    resetUpdates.override_height = undefined;
    resetUpdates.override_opacity = undefined;
    resetUpdates.override_z_index = undefined;
    resetUpdates.override_mask = undefined;
  } else if (assetType === 'VectorAsset') {
    // VectorAssetInstanceのoverride項目をリセット
    resetUpdates.override_pos_x = undefined;
    resetUpdates.override_pos_y = undefined;
    resetUpdates.override_width = undefined;
    resetUpdates.override_height = undefined;
    resetUpdates.override_opacity = undefined;
    resetUpdates.override_z_index = undefined;
  }
  
  return resetUpdates;
}

// Page定義
export interface Page {
  id: string;
  title: string;
  asset_instances: Record<string, AssetInstance>;
}

// Project全体の構造
export interface ProjectData {
  metadata: ProjectMetadata;
  canvas: CanvasConfig;
  assets: Record<string, Asset>;
  pages: Page[]; // 配列形式に変更
}

// UI状態
export interface UIState {
  selectedAssets: string[];
  selectedPages: string[];
  currentPage: string | null;
  activeWindow: 'asset' | 'spreadsheet' | 'preview';
  zoomLevel: number;
  canvasFit: boolean; // 旧 autoZoom から統合された「キャンバスをプレビュー画面に収める」機能
  showAssetLibrary: boolean;
  showPreview: boolean;
  showFontManagement: boolean;
  assetLibraryWidth: number;
  previewWidth: number;
  previewScrollX: number;
  previewScrollY: number;
}

// アプリケーション状態
export interface AppError {
  type: string;
  message: string;
  timestamp: Date;
  stack?: string;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number; // ミリ秒
}

export interface AppState {
  isLoading: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  errors: AppError[];
  notifications: AppNotification[];
  clipboard: any | null; // TODO: 具体的な型を後で定義
}

// IPC通信用の型
export interface ProjectCreateParams {
  title: string;
  description?: string;
  canvas: CanvasConfig;
  template?: string;
  supportedLanguages?: string[]; // 多言語対応
  currentLanguage?: string; // 多言語対応
}

export type ExportFormat = 'html' | 'svg' | 'png';

export interface HtmlExportOptions {
  singleFile?: boolean;
  includeNavigation?: boolean;
  autoPlay?: boolean;
}

export interface SvgExportOptions {
  separateFiles?: boolean;
  embedImages?: boolean;
  optimizeSize?: boolean;
}

export interface ExportOptions {
  format: ExportFormat;
  title: string;
  outputPath: string;
  width: number;
  height: number;
  quality: number;
  embedAssets: boolean;
  htmlOptions?: HtmlExportOptions;
  svgOptions?: SvgExportOptions;
}

// ファイルダイアログ用
export interface OpenDialogOptions {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

// Asset初期化用のヘルパー関数
import { v4 as uuidv4 } from 'uuid';

/**
 * ImageAssetの初期データを作成
 */
export function createImageAsset(params: {
  name: string;
  relativePath: string;
  originalWidth: number;
  originalHeight: number;
}): ImageAsset {
  return {
    id: `img-${uuidv4()}`,
    type: 'ImageAsset',
    name: params.name,
    original_file_path: params.relativePath,
    original_width: params.originalWidth,
    original_height: params.originalHeight,
    default_pos_x: 0,
    default_pos_y: 0,
    default_width: params.originalWidth,
    default_height: params.originalHeight,
    default_opacity: 1.0,
    default_z_index: 0,
    // default_maskは初期状態ではundefined（マスクなし）
  };
}

/**
 * 多言語対応：現在言語の有効テキスト値を取得
 * 優先順位: multilingual_text[currentLang] > asset default
 */
export function getEffectiveTextValue(
  asset: TextAsset, 
  instance: TextAssetInstance, 
  currentLang: string
): string {
  // 1. インスタンスの多言語テキストをチェック
  if (instance.multilingual_text && instance.multilingual_text[currentLang] !== undefined) {
    return instance.multilingual_text[currentLang];
  }
  
  // 2. アセットのデフォルト値を使用
  return asset.default_text || '';
}

/**
 * 新仕様対応: 言語別設定の有効値を取得
 * 優先順位: override_language_settings > default_language_settings > 旧仕様フィールド
 */
export function getEffectiveLanguageSetting<K extends keyof LanguageSettings>(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  setting: K
): LanguageSettings[K] | undefined {
  // 1. インスタンスのオーバーライド設定をチェック
  if (instance?.override_language_settings?.[currentLang]?.[setting] !== undefined) {
    return instance.override_language_settings[currentLang][setting];
  }
  
  // 2. アセットの言語別デフォルト設定をチェック
  if (asset.default_language_settings?.[currentLang]?.[setting] !== undefined) {
    return asset.default_language_settings[currentLang][setting];
  }
  
  return undefined;
}

/**
 * 新仕様対応: 最終的なフォントサイズを取得する
 */
export function getEffectiveFontSize(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string
): number {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_font_size');
  if (languageSetting !== undefined) {
    return languageSetting;
  }
  
  // デフォルト値: 24ピクセル
  return 24;
}

/**
 * 新仕様対応: 最終的な位置を取得する
 */
export function getEffectivePosition(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string
): { x: number; y: number } {
  const x = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_pos_x') ?? 100;
  const y = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_pos_y') ?? 100;
  return { x, y };
}

/**
 * 新仕様対応: 最終的なフォントを取得する
 */
export function getEffectiveFont(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string
): string {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_font');
  if (languageSetting !== undefined) {
    return languageSetting;
  }
  
  // デフォルトフォント
  return DEFAULT_FONT_ID;
}

/**
 * 新仕様対応: 最終的な縦書き設定を取得する
 */
export function getEffectiveVertical(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string
): boolean {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_vertical');
  if (languageSetting !== undefined) {
    return languageSetting;
  }
  
  // デフォルト: 横書き
  return false;
}

/**
 * 新仕様対応: 最終的な色設定を取得する
 */
export function getEffectiveColors(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string
): { fill: string; stroke: string } {
  const fillOverride = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_fill_color');
  const strokeOverride = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_stroke_color');
  
  const fill = fillOverride ?? asset.default_fill_color;
  const stroke = strokeOverride ?? asset.default_stroke_color;
  
  return { fill, stroke };
}

/**
 * 新仕様対応: 最終的なストローク幅を取得する
 */
export function getEffectiveStrokeWidth(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string
): number {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_stroke_width');
  if (languageSetting !== undefined) {
    return languageSetting;
  }
  
  // デフォルト: 2.0ピクセル
  return 2.0;
}

/**
 * 新仕様対応: 最終的な行間を取得する
 */
export function getEffectiveLeading(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string
): number {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_leading');
  if (languageSetting !== undefined) {
    return languageSetting;
  }
  
  // デフォルト: 0
  return 0;
}

/**
 * 新仕様対応: 最終的な不透明度を取得する
 */
export function getEffectiveOpacity(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string
): number {
  // 言語別設定のみをチェック（インスタンス > アセット の順）
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_opacity');
  if (languageSetting !== undefined) {
    return languageSetting;
  }
  
  // アセットのデフォルト不透明度を使用
  return asset.default_opacity;
}

/**
 * 新仕様対応: 最終的なz-indexを取得する
 */
export function getEffectiveZIndexForLanguage(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string
): number {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'override_z_index');
  if (languageSetting !== undefined) {
    return languageSetting;
  }
  
  // 既存フィールドを使用
  return asset.default_z_index;
}

/**
 * 新仕様対応: TextAssetのデフォルト値を作成する
 */
export function createDefaultTextAsset(params: {
  name: string;
  supportedLanguages?: string[];
}): TextAsset {
  const { name, supportedLanguages } = params;
  
  // 新仕様: 最小限のフィールドでTextAssetを作成
  const asset: TextAsset = {
    id: `text-${uuidv4()}`,
    type: 'TextAsset',
    name,
    default_text: '',
    default_context: '',
    default_fill_color: '#FFFFFF',
    default_stroke_color: '#000000',
    default_opacity: 1.0,
    default_z_index: 0,
    // 言語別設定を初期化（supportedLanguagesが提供された場合のみ）
    default_language_settings: supportedLanguages ? 
      supportedLanguages.reduce<Record<string, LanguageSettings>>((acc, lang) => {
        // デフォルトでは空のオーバーライド設定
        acc[lang] = {};
        return acc;
      }, {}) : undefined
  };
  
  return asset;
}


/**
 * TextAssetの初期データを作成
 */
// 旧createTextAsset関数は削除し、createDefaultTextAssetを使用

export function createVectorAsset(params: {
  name: string;
  relativePath: string;
  originalWidth: number;
  originalHeight: number;
  svgContent: string;
}): VectorAsset {
  return {
    id: `vector-${uuidv4()}`,
    type: 'VectorAsset',
    name: params.name,
    original_file_path: params.relativePath,
    original_width: params.originalWidth,
    original_height: params.originalHeight,
    default_pos_x: 50,
    default_pos_y: 50,
    default_width: params.originalWidth,
    default_height: params.originalHeight,
    default_opacity: 1.0,
    default_z_index: 0,
    svg_content: params.svgContent,
  };
}

// バリデーション関数

/**
 * 不透明度値のバリデーション（0-1の範囲チェック）
 * @param value - チェック対象の値
 * @param fieldName - フィールド名（エラーメッセージ用）
 * @returns バリデーション結果
 */
export function validateOpacity(value: number | undefined, fieldName: string): { 
  isValid: boolean; 
  error?: string; 
} {
  if (value === undefined) {
    return { isValid: true }; // undefinedは許可
  }
  
  if (value < 0 || value > 1) {
    return {
      isValid: false,
      error: `${fieldName}の値は0から1の範囲で入力してください。現在の値: ${value}`
    };
  }
  
  return { isValid: true };
}

/**
 * TextAssetのバリデーション（新仕様）
 * @param asset - バリデーション対象のTextAsset
 * @returns バリデーション結果
 */
export function validateTextAssetData(asset: TextAsset): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 基本フィールドのバリデーション
  const opacityValidation = validateOpacity(asset.default_opacity, 'デフォルト不透明度');
  if (!opacityValidation.isValid && opacityValidation.error) {
    errors.push(opacityValidation.error);
  }
  
  // 言語別設定のバリデーション（オプショナル）
  if (asset.default_language_settings) {
    Object.entries(asset.default_language_settings).forEach(([langCode, settings]) => {
      if (settings.override_font_size !== undefined && settings.override_font_size <= 0) {
        errors.push(`${langCode}言語のフォントサイズは0より大きい値を入力してください。現在の値: ${settings.override_font_size}`);
      }
      if (settings.override_opacity !== undefined) {
        const opacityValidation = validateOpacity(settings.override_opacity, `${langCode}言語の不透明度`);
        if (!opacityValidation.isValid && opacityValidation.error) {
          errors.push(opacityValidation.error);
        }
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * ImageAssetのバリデーション
 * @param asset - バリデーション対象のImageAsset
 * @returns バリデーション結果
 */
export function validateImageAssetData(asset: ImageAsset): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // デフォルト不透明度のバリデーション
  const opacityValidation = validateOpacity(asset.default_opacity, 'デフォルト不透明度');
  if (!opacityValidation.isValid && opacityValidation.error) {
    errors.push(opacityValidation.error);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * TextAssetInstanceのバリデーション
 * @param instance - バリデーション対象のTextAssetInstance
 * @returns バリデーション結果
 */
export function validateTextAssetInstanceData(instance: TextAssetInstance): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // override_language_settingsのバリデーション
  if (instance.override_language_settings) {
    for (const [lang, settings] of Object.entries(instance.override_language_settings)) {
      // フォントサイズのバリデーション
      if (settings.override_font_size !== undefined && settings.override_font_size <= 0) {
        errors.push(`${lang}言語のフォントサイズは0より大きい値を入力してください。現在の値: ${settings.override_font_size}`);
      }
      
      // 不透明度のバリデーション
      if (settings.override_opacity !== undefined) {
        const opacityValidation = validateOpacity(settings.override_opacity, `${lang}言語の不透明度`);
        if (!opacityValidation.isValid && opacityValidation.error) {
          errors.push(opacityValidation.error);
        }
      }
      
      // ストローク幅のバリデーション
      if (settings.override_stroke_width !== undefined && settings.override_stroke_width < 0) {
        errors.push(`${lang}言語のストローク幅は0以上の値を入力してください。現在の値: ${settings.override_stroke_width}`);
      }
      
      // 行間のバリデーション
      if (settings.override_leading !== undefined && settings.override_leading < 0) {
        errors.push(`${lang}言語の行間は0以上の値を入力してください。現在の値: ${settings.override_leading}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * ImageAssetInstanceのバリデーション
 * @param instance - バリデーション対象のImageAssetInstance
 * @returns バリデーション結果
 */
export function validateImageAssetInstanceData(instance: ImageAssetInstance): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // オーバーライド不透明度のバリデーション
  const opacityValidation = validateOpacity(instance.override_opacity, '不透明度 (オーバーライド)');
  if (!opacityValidation.isValid && opacityValidation.error) {
    errors.push(opacityValidation.error);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * VectorAssetのバリデーション
 * @param asset - バリデーション対象のVectorAsset
 * @returns バリデーション結果
 */
export function validateVectorAssetData(asset: VectorAsset): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 基本フィールドのバリデーション
  if (!asset.name || asset.name.trim() === '') {
    errors.push('アセット名は必須です。');
  }
  
  if (!asset.original_file_path || asset.original_file_path.trim() === '') {
    errors.push('ファイルパスは必須です。');
  }
  
  if (!asset.svg_content || asset.svg_content.trim() === '') {
    errors.push('SVGコンテンツは必須です。');
  }
  
  // サイズのバリデーション
  if (asset.original_width <= 0) {
    errors.push(`元の幅は0より大きい値を入力してください。現在の値: ${asset.original_width}`);
  }
  
  if (asset.original_height <= 0) {
    errors.push(`元の高さは0より大きい値を入力してください。現在の値: ${asset.original_height}`);
  }
  
  if (asset.default_width <= 0) {
    errors.push(`デフォルト幅は0より大きい値を入力してください。現在の値: ${asset.default_width}`);
  }
  
  if (asset.default_height <= 0) {
    errors.push(`デフォルト高さは0より大きい値を入力してください。現在の値: ${asset.default_height}`);
  }
  
  // 不透明度のバリデーション
  const opacityValidation = validateOpacity(asset.default_opacity, 'デフォルト不透明度');
  if (!opacityValidation.isValid && opacityValidation.error) {
    errors.push(opacityValidation.error);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * VectorAssetInstanceのバリデーション
 * @param instance - バリデーション対象のVectorAssetInstance
 * @returns バリデーション結果
 */
export function validateVectorAssetInstanceData(instance: VectorAssetInstance): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // オーバーライド不透明度のバリデーション
  const opacityValidation = validateOpacity(instance.override_opacity, '不透明度 (オーバーライド)');
  if (!opacityValidation.isValid && opacityValidation.error) {
    errors.push(opacityValidation.error);
  }
  
  // オーバーライドサイズのバリデーション
  if (instance.override_width !== undefined && instance.override_width <= 0) {
    errors.push(`オーバーライド幅は0より大きい値を入力してください。現在の値: ${instance.override_width}`);
  }
  
  if (instance.override_height !== undefined && instance.override_height <= 0) {
    errors.push(`オーバーライド高さは0より大きい値を入力してください。現在の値: ${instance.override_height}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
