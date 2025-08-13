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
  default_text: string;
  font: string; // フォントID（FontInfoのidを参照）
  stroke_width: number;
  font_size: number;
  stroke_color: string; // テキストの縁取りの色（RGBA形式の文字列）
  fill_color: string; // テキストの内部の色（RGBA形式の文字列）
  default_pos_x: number;
  default_pos_y: number;
  opacity: number; // デフォルトの不透明度（0.0〜1.0）
  leading: number; // テキストの行間（verticalがtrueの場合にのみ利用）
  vertical: boolean; // true の場合、縦書き
  default_z_index: number;
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
  // 新機能：言語別完全オーバーライド
  multilingual_overrides?: Record<string, LanguageOverrides>;
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
export interface LanguageOverrides {
  override_text?: string;
  override_font_size?: number;
  override_pos_x?: number;
  override_pos_y?: number;
  override_font?: string; // 言語別フォント選択
  override_opacity?: number;
  override_z_index?: number;
  override_leading?: number; // 言語別行間
  override_vertical?: boolean; // 言語別縦書き設定
}

export type AssetInstance = ImageAssetInstance | TextAssetInstance | VectorAssetInstance;

// AssetInstanceのoverride値チェック用ヘルパー関数
export function hasAssetInstanceOverrides(instance: AssetInstance, assetType: Asset['type']): boolean {
  if (!instance) return false;
  
  if (assetType === 'TextAsset') {
    const textInstance = instance as TextAssetInstance;
    return !!(textInstance.multilingual_overrides && Object.keys(textInstance.multilingual_overrides).length > 0);
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
  if (asset.type === 'TextAsset' && currentLang) {
    const textInstance = instance as TextAssetInstance;
    const langOverride = textInstance.multilingual_overrides?.[currentLang];
    if (langOverride?.override_z_index !== undefined) {
      return langOverride.override_z_index;
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
  
  return asset.default_z_index;
}

// AssetInstanceのoverride値をリセットする関数
export function resetAssetInstanceOverrides(instance: AssetInstance, assetType: Asset['type']): Partial<AssetInstance> {
  const resetUpdates: any = {};
  
  if (assetType === 'TextAsset') {
    // TextAssetInstanceは多言語オーバーライドのみ
    resetUpdates.multilingual_overrides = undefined;
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
 * 優先順位: multilingual_overrides[currentLang] > 既存override_* > multilingual_defaults[currentLang] > asset default
 */
export function getEffectiveTextValue(
  asset: TextAsset, 
  instance: TextAssetInstance, 
  currentLang: string
): string {
  // 1. 言語別オーバーライドをチェック
  const langOverride = instance.multilingual_overrides?.[currentLang];
  if (langOverride?.override_text !== undefined) {
    return langOverride.override_text;
  }
  
  // 2. アセットのデフォルト値を使用
  return asset.default_text;
}

/**
 * 多言語対応：現在言語の有効フォントサイズを取得
 */
export function getEffectiveFontSize(
  asset: TextAsset, 
  instance: TextAssetInstance, 
  currentLang: string
): number {
  const langOverride = instance.multilingual_overrides?.[currentLang];
  if (langOverride?.override_font_size !== undefined) {
    return langOverride.override_font_size;
  }
  
  return asset.font_size;
}

/**
 * 多言語対応：現在言語の有効位置X座標を取得
 */
export function getEffectivePosX(
  asset: TextAsset, 
  instance: TextAssetInstance, 
  currentLang: string
): number {
  const langOverride = instance.multilingual_overrides?.[currentLang];
  if (langOverride?.override_pos_x !== undefined) {
    return langOverride.override_pos_x;
  }
  
  return asset.default_pos_x;
}

/**
 * 多言語対応：現在言語の有効位置Y座標を取得
 */
export function getEffectivePosY(
  asset: TextAsset, 
  instance: TextAssetInstance, 
  currentLang: string
): number {
  const langOverride = instance.multilingual_overrides?.[currentLang];
  if (langOverride?.override_pos_y !== undefined) {
    return langOverride.override_pos_y;
  }
  
  return asset.default_pos_y;
}

/**
 * 多言語対応：現在言語の有効不透明度を取得
 */
export function getEffectiveOpacity(
  asset: TextAsset, 
  instance: TextAssetInstance, 
  currentLang: string
): number {
  const langOverride = instance.multilingual_overrides?.[currentLang];
  if (langOverride?.override_opacity !== undefined) {
    return langOverride.override_opacity;
  }
  
  return asset.opacity;
}

/**
 * 多言語対応：現在言語の有効フォントを取得
 */
export function getEffectiveFont(
  asset: TextAsset, 
  instance: TextAssetInstance, 
  currentLang: string
): string {
  const langOverride = instance.multilingual_overrides?.[currentLang];
  if (langOverride?.override_font !== undefined) {
    return langOverride.override_font;
  }
  
  return asset.font;
}

/**
 * 多言語対応：現在言語の有効行間を取得
 */
export function getEffectiveLeading(
  asset: TextAsset, 
  instance: TextAssetInstance, 
  currentLang: string
): number {
  const langOverride = instance.multilingual_overrides?.[currentLang];
  if (langOverride?.override_leading !== undefined) {
    return langOverride.override_leading;
  }
  
  return asset.leading;
}

/**
 * 多言語対応：現在言語の有効縦書き設定を取得
 */
export function getEffectiveVertical(
  asset: TextAsset, 
  instance: TextAssetInstance, 
  currentLang: string
): boolean {
  const langOverride = instance.multilingual_overrides?.[currentLang];
  if (langOverride?.override_vertical !== undefined) {
    return langOverride.override_vertical;
  }
  
  return asset.vertical;
}

/**
 * TextAssetの初期データを作成
 */
export function createTextAsset(params: {
  name: string;
  defaultText: string;
}): TextAsset {
  return {
    id: `text-${uuidv4()}`,
    type: 'TextAsset',
    name: params.name,
    default_text: params.defaultText,
    font: DEFAULT_FONT_ID, // デフォルトフォントID
    stroke_width: 2.0,
    font_size: 24,
    stroke_color: '#000000',
    fill_color: '#FFFFFF',
    default_pos_x: 100,
    default_pos_y: 100,
    opacity: 1.0,
    leading: 0,
    vertical: false,
    default_z_index: 0,
  };
}

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
 * TextAssetのバリデーション
 * @param asset - バリデーション対象のTextAsset
 * @returns バリデーション結果
 */
export function validateTextAssetData(asset: TextAsset): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 不透明度のバリデーション
  const opacityValidation = validateOpacity(asset.opacity, '不透明度');
  if (!opacityValidation.isValid && opacityValidation.error) {
    errors.push(opacityValidation.error);
  }
  
  // フォントサイズのバリデーション
  if (asset.font_size <= 0) {
    errors.push(`フォントサイズは0より大きい値を入力してください。現在の値: ${asset.font_size}`);
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
  
  // 多言語オーバーライドの不透明度バリデーション
  if (instance.multilingual_overrides) {
    for (const [lang, overrides] of Object.entries(instance.multilingual_overrides)) {
      const opacityValidation = validateOpacity(overrides.override_opacity, `不透明度 (${lang})`);
      if (!opacityValidation.isValid && opacityValidation.error) {
        errors.push(opacityValidation.error);
      }
      
      // フォントサイズのバリデーション
      if (overrides.override_font_size !== undefined && overrides.override_font_size <= 0) {
        errors.push(`フォントサイズ (${lang})は0より大きい値を入力してください。現在の値: ${overrides.override_font_size}`);
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
