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
  type: 'ImageAsset' | 'TextAsset' | 'VectorAsset' | 'DynamicVectorAsset' | 'ValueAsset';
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
  default_context?: string;
  enable_default_text?: boolean;
  default_text_override?: Record<string, string | null>;  // 言語ごとのデフォルトテキスト
  default_settings: LanguageSettings; // 共通設定
  default_language_override?: Record<string, LanguageSettings>; // 共通設定を上書きする、言語ごとのオーバーライド設定
}

// TextEditModal で直接編集可能な TextAsset フィールドは以下に記載する（TextAssetInstance のフィールドは除外）
export interface TextAssetEditableField {
  name: true; // associated to name
  text: true; // associated to default_text
  context: true; // associated to default_context
  enable_default_text: true; // associated to enable_default_text
  default_text_override: true; // associated to default_text_override
  default_language_override: true; // associated to default_language_override
}

// TextEditModal で直接編集可能な TextAsset フィールドは以下に記載する（TextAssetInstance のフィールドは除外）
export function isTextAssetEditableField(field: string): field is keyof TextAssetEditableField {
  const fields: Record<string, true> = {
    name: true,
    text: true,
    context: true,
    enable_default_text: true,
    default_text_override: true,
    default_language_override: true
  };
  return fields[field as keyof TextAssetEditableField] === true;
}

export enum TextAssetInstancePhase {
  AUTO          = 0, // 自動判定（インスタンスの言語設定 > アセットの言語設定 > 共通設定）
  ASSET_COMMON  = 1, // 共通設定（アセットのdefault_settingsを使用）
  ASSET_LANG    = 2, // アセットの言語別設定（default_language_overrideを使用）
  INSTANCE_LANG = 3, // インスタンスの言語別設定（override_language_settingsを使用）
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

// CustomAsset関連の型定義（JSファイルから解析される情報）
export interface CustomAssetParameter {
  name: string;
  type: 'number' | 'string' | 'boolean';
  defaultValue: any;
  description?: string;
}

export interface CustomAsset {
  id: string;
  name: string;
  type: 'DynamicVector';
  version: string;
  author?: string;
  description?: string;
  width: number;      // キャンバス幅（@widthから取得）
  height: number;     // キャンバス高さ（@heightから取得）
  parameters: CustomAssetParameter[];
  script: string;     // JavaScript実行コード
  filePath: string;   // 元ファイルパス（管理用）
  addedAt: string;    // 追加日時
}

export interface DynamicVectorAsset extends BaseAsset {
  type: 'DynamicVectorAsset';

  // 配置・表示設定
  original_width: number  // CustomAssetの@widthから取得されるデフォルトサイズ;
  original_height: number; // CustomAssetの@heightから取得されるデフォルトサイズ
  default_pos_x: number;
  default_pos_y: number;
  default_width: number;
  default_height: number;
  default_opacity: number;
  default_z_index: number;

  // CustomAssetリンク
  custom_asset_id: string;         // 参照するCustomAssetのID（必須）
  custom_asset_version: string;    // バージョン情報（互換性チェック用）

  // パラメータ値設定
  parameters: Record<string, number | string>; // パラメータ名 -> 値

  // 変数機能
  use_page_variables: boolean; // page_current, page_totalの利用可否
  use_value_variables: boolean; // ValueAssetの変数利用可否
  parameter_variable_bindings?: Record<string, string>; // パラメータ名 -> ValueAsset名
}

export interface ValueAsset extends BaseAsset {
  type: 'ValueAsset';
  value_type: 'string' | 'number' | 'formula';
  initial_value: any;
  new_page_behavior: 'reset' | 'inherit';
}

export type Asset = ImageAsset | TextAsset | VectorAsset | DynamicVectorAsset | ValueAsset;

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
  override_context?: string;
  multilingual_text: Record<string, string>;
  override_language_settings?: Record<string, LanguageSettings>;
}

export interface VectorAssetInstance extends BaseAssetInstance {
  override_pos_x?: number;
  override_pos_y?: number;
  override_width?: number;
  override_height?: number;
  override_opacity?: number;
  override_z_index?: number;
}

export interface DynamicVectorAssetInstance extends BaseAssetInstance {
  override_pos_x?: number;
  override_pos_y?: number;
  override_width?: number;
  override_height?: number;
  override_opacity?: number;
  override_z_index?: number;
}

export interface ValueAssetInstance extends BaseAssetInstance {
  override_value?: any;
}

// 多言語対応のための言語別オーバーライド設定
// 言語別設定のオーバーライド用統一型
export interface LanguageSettings {
  pos_x?: number;
  pos_y?: number;
  font?: string;
  font_size?: number;
  stroke_width?: number;
  leading?: number;
  vertical?: boolean;
  opacity?: number;
  z_index?: number;
  fill_color?: string;
  stroke_color?: string;
}

export function isLanguageSettingsField(field: string): field is keyof LanguageSettings {
  const languageSettingsFields: Record<keyof LanguageSettings, true> = {
    pos_x: true, pos_y: true, font: true, font_size: true, stroke_width: true,
    leading: true, vertical: true, opacity: true, z_index: true,
    fill_color: true, stroke_color: true
  };
  return field in languageSettingsFields;
}

export type AssetInstance = ImageAssetInstance | TextAssetInstance | VectorAssetInstance | DynamicVectorAssetInstance | ValueAssetInstance;

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
  } else if (assetType === 'DynamicVectorAsset') {
    const dynamicVectorInstance = instance as DynamicVectorAssetInstance;
    return !!(
      dynamicVectorInstance.override_pos_x !== undefined ||
      dynamicVectorInstance.override_pos_y !== undefined ||
      dynamicVectorInstance.override_width !== undefined ||
      dynamicVectorInstance.override_height !== undefined ||
      dynamicVectorInstance.override_opacity !== undefined ||
      dynamicVectorInstance.override_z_index !== undefined
    );
  } else if (assetType === 'ValueAsset') {
    const valueInstance = instance as ValueAssetInstance;
    return !!(valueInstance.override_value !== undefined);
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
      const languageSetting = getEffectiveLanguageSetting(asset, textInstance, currentLang, 'z_index');
      if (languageSetting !== undefined) {
        return languageSetting;
      }
    }
    return DEFAULT_LANGUAGE_SETTINGS.z_index!; // デフォルトのz-indexを使用
  } else if (asset.type === 'ImageAsset') {
    const imageInstance = instance as ImageAssetInstance;
    if (imageInstance.override_z_index !== undefined) {
      return imageInstance.override_z_index;
    }
    return asset.default_z_index; // ImageAssetのデフォルトz-indexを使用
  } else if (asset.type === 'VectorAsset') {
    const vectorInstance = instance as VectorAssetInstance;
    if (vectorInstance.override_z_index !== undefined) {
      return vectorInstance.override_z_index;
    }
    return asset.default_z_index; // VectorAssetのデフォルトz-indexを使用
  } else if (asset.type === 'DynamicVectorAsset') {
    const dynamicVectorInstance = instance as DynamicVectorAssetInstance;
    if (dynamicVectorInstance.override_z_index !== undefined) {
      return dynamicVectorInstance.override_z_index;
    }
    return asset.default_z_index; // DynamicVectorAssetのデフォルトz-indexを使用
  } else if (asset.type === 'ValueAsset') {
    // ValueAssetはz-indexを持たないため、デフォルト値を返す
    return 0;
  }
  return 0;
}

// AssetInstanceのoverride値をリセットする関数
export function resetAssetInstanceOverrides(instance: AssetInstance, assetType: Asset['type']): Partial<AssetInstance> {
  const resetUpdates: any = {};

  if (assetType === 'TextAsset') {
    // TextAssetInstanceは言語別オーバーライドをリセット
    // TODO: 最新の仕様にあってなさそう
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
  } else if (assetType === 'DynamicVectorAsset') {
    // DynamicVectorAssetInstanceのoverride項目をリセット
    resetUpdates.override_pos_x = undefined;
    resetUpdates.override_pos_y = undefined;
    resetUpdates.override_width = undefined;
    resetUpdates.override_height = undefined;
    resetUpdates.override_opacity = undefined;
    resetUpdates.override_z_index = undefined;
  } else if (assetType === 'ValueAsset') {
    // ValueAssetInstanceのoverride項目をリセット
    resetUpdates.override_value = undefined;
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
  // 非表示にされた列と行の管理
  hiddenColumns: string[]; // 非表示にされたアセットIDのリスト
  hiddenRows: string[]; // 非表示にされたページIDのリスト
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
  showCustomAssetManagement: boolean;
  assetLibraryWidth: number;
  previewWidth: number;
  previewScrollX: number;
  previewScrollY: number;
  // スプレッドシートカーソル機能
  cursor: {
    visible: boolean;
    pageId: string | null;
    assetId: string | null;
  };
  clipboard: {
    assetInstance: AssetInstance | null;
    sourcePageId: string | null;
  };
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
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): string {
  if (phase === TextAssetInstancePhase.INSTANCE_LANG || phase === TextAssetInstancePhase.AUTO) {
    // 1. インスタンスの多言語テキストをチェック
    if (instance?.multilingual_text && instance.multilingual_text[currentLang] !== undefined) {
      const text = instance.multilingual_text[currentLang];
      if (text === '' && asset.enable_default_text) {
        // 空文字で、デフォルトテキスト機能が有効な場合の優先順位処理

        // 2. 言語ごとのデフォルトテキストをチェック
        if (asset.default_text_override && currentLang in asset.default_text_override) {
          const langOverride = asset.default_text_override[currentLang];
          if (langOverride === null) {
            // null設定の場合でもenable_default_textがtrueなら共通テキストを使用
            return asset.default_text || '';
          }
          if (langOverride !== undefined) {
            return langOverride;
          }
        }

        // 3. 全言語共通のデフォルトテキストを使用
        return asset.default_text || '';
      }
      if (text !== undefined && text !== null) {
        return text;
      }
    }
  }
  // 4. 最終フォールバック：アセットのデフォルト値
  return asset.default_text || '';
}

/**
 * 多言語対応：現在言語の有効のコンテキスト値を取得
 * 優先順位: instance.override_context > asset.default_context
 */
export function getEffectiveContextValue(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): string {
  // 1. インスタンスの多言語テキストをチェックして使用
  if (phase === TextAssetInstancePhase.INSTANCE_LANG || phase === TextAssetInstancePhase.AUTO) {
    if (instance?.override_context) {
      return instance.override_context;
    }
  }
  // 2. 共通設定フェーズではアセットのdefault_contextを使用
  if (phase === TextAssetInstancePhase.ASSET_COMMON) {
    if (asset.default_context) {
      return asset.default_context;
    }
  }
  // 該当なしなので空文字を返す
  return '';
}

export function getTextAssetDefaultSettings<K extends keyof LanguageSettings>(
  asset: TextAsset,
  setting: K
): LanguageSettings[K] {
  // アセットの共通設定をチェック
  if (asset.default_settings?.[setting] !== undefined) {
    return asset.default_settings[setting];
  }
  // デフォルト値を返す（オブジェクトを変更せず）
  return DEFAULT_LANGUAGE_SETTINGS[setting];
}

/**
 * 言語別オーバーライド設定の値を取得
 * 優先順位: instance override > asset language override > asset common settings
 */
export function getEffectiveLanguageSetting<K extends keyof LanguageSettings>(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  setting: K,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): LanguageSettings[K] {
  // phase による処理分岐
  if (phase === TextAssetInstancePhase.AUTO) {
    // 1. インスタンスの言語別オーバーライド設定をチェック
    if (instance?.override_language_settings?.[currentLang]?.[setting] !== undefined) {
      return instance.override_language_settings[currentLang][setting];
    }
    // 2. アセットの言語別オーバーライド設定をチェック
    if (asset.default_language_override?.[currentLang]?.[setting] !== undefined) {
      return asset.default_language_override[currentLang][setting];
    }
    // 3. アセットの共通設定をチェック
    if (asset.default_settings?.[setting] !== undefined) {
      return asset.default_settings[setting];
    }
  } else {
  // phase が指定されている場合の処理
    if (phase === TextAssetInstancePhase.INSTANCE_LANG) {
      // インスタンスの言語別オーバーライド設定をチェック
      if (instance?.override_language_settings?.[currentLang]?.[setting] !== undefined) {
        return instance.override_language_settings[currentLang][setting];
      }
    }
    if (phase === TextAssetInstancePhase.ASSET_LANG) {
      // アセットの言語別オーバーライド設定をチェック
      if (asset.default_language_override?.[currentLang]?.[setting] !== undefined) {
        return asset.default_language_override[currentLang][setting];
      }
    }
    if (phase === TextAssetInstancePhase.ASSET_COMMON) {
      // アセットの共通設定をチェック
      if (asset.default_settings?.[setting] !== undefined) {
        return asset.default_settings[setting];
      }
    }
  }
  return DEFAULT_LANGUAGE_SETTINGS[setting]; // デフォルト設定を返す
}

/**
 * 最終的なフォントサイズを取得する
 */
export function getEffectiveFontSize(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): number {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'font_size', phase);
  if (languageSetting !== undefined) {
    return languageSetting;
  }

  // デフォルト値: 64ピクセル
  return DEFAULT_LANGUAGE_SETTINGS.font_size!;
}

/**
 * 最終的な位置を取得する
 */
export function getEffectivePosition(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): { x: number; y: number } {
  const x = getEffectiveLanguageSetting(asset, instance, currentLang, 'pos_x', phase) ?? DEFAULT_LANGUAGE_SETTINGS.pos_x!;
  const y = getEffectiveLanguageSetting(asset, instance, currentLang, 'pos_y', phase) ?? DEFAULT_LANGUAGE_SETTINGS.pos_y!;
  return { x, y };
}

/**
 * 最終的なフォントを取得する
 */
export function getEffectiveFontFace(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): string {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'font', phase);
  if (languageSetting !== undefined) {
    return languageSetting;
  }

  // デフォルトフォント
  return DEFAULT_FONT_ID;
}

/**
 * 最終的な縦書き設定を取得する
 */
export function getEffectiveVertical(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): boolean {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'vertical', phase);
  if (languageSetting !== undefined) {
    return languageSetting;
  }

  // デフォルト: 横書き
  return false;
}

/**
 * 最終的な色設定を取得する
 */
export function getEffectiveColors(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): { fill: string; stroke: string } {
  const fillOverride = getEffectiveLanguageSetting(asset, instance, currentLang, 'fill_color', phase);
  const strokeOverride = getEffectiveLanguageSetting(asset, instance, currentLang, 'stroke_color', phase);

  const fill = fillOverride ?? DEFAULT_LANGUAGE_SETTINGS.fill_color!
  const stroke = strokeOverride ?? DEFAULT_LANGUAGE_SETTINGS.stroke_color!

  return { fill, stroke };
}

/**
 * 最終的なストローク幅を取得する
 */
export function getEffectiveStrokeWidth(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): number {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'stroke_width', phase);
  if (languageSetting !== undefined) {
    return languageSetting;
  }

  return DEFAULT_LANGUAGE_SETTINGS.stroke_width!; // デフォルトのストローク幅を使用
}

/**
 * 最終的な行間を取得する
 */
export function getEffectiveLeading(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): number {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'leading', phase);
  if (languageSetting !== undefined) {
    return languageSetting;
  }

  // デフォルト: 0
  return DEFAULT_LANGUAGE_SETTINGS.leading!; // デフォルトの行間を使用
}

/**
 * 最終的な不透明度を取得する
 */
export function getEffectiveOpacity(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): number {
  // 言語別設定のみをチェック（インスタンス > アセット の順）
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'opacity', phase);
  if (languageSetting !== undefined) {
    return languageSetting;
  }

  // アセットのデフォルト不透明度を使用
  return DEFAULT_LANGUAGE_SETTINGS.opacity!; // デフォルトの不透明度を使用
}

/**
 * 最終的なz-indexを取得する
 */
export function getEffectiveZIndexForLanguage(
  asset: TextAsset,
  instance: TextAssetInstance | null,
  currentLang: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO
): number {
  const languageSetting = getEffectiveLanguageSetting(asset, instance, currentLang, 'z_index', phase);
  if (languageSetting !== undefined) {
    return languageSetting;
  }

  // 既存フィールドを使用
  return DEFAULT_LANGUAGE_SETTINGS.z_index!; // デフォルトのz-indexを使用
}

/**
 * LanguageSettingsのデフォルト値を作成する
 */
export function createDefaultLanguageSettings(): LanguageSettings {
  return {
    pos_x: 300,
    pos_y: 300,
    font: DEFAULT_FONT_ID,
    font_size: 64,
    stroke_width: 2,
    leading: 0,
    vertical: false,
    opacity: 1.0,
    z_index: 2,
    fill_color: '#000000',
    stroke_color: '#FFFFFF',
  };
}

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = createDefaultLanguageSettings();

/**
 * TextAssetのデフォルト値を作成する
 */
export function createDefaultTextAsset(params: {
  name: string;
  supportedLanguages?: string[];
}): TextAsset {
  const { name, supportedLanguages } = params;

  // 最小限のフィールドでTextAssetを作成
  const asset: TextAsset = {
    id: `text-${uuidv4()}`,
    type: 'TextAsset',
    name,
    default_text: '',
    default_context: '',
    enable_default_text: false,
    default_text_override: {}, // 空のオブジェクトで初期化
    default_settings: createDefaultLanguageSettings(),
    // default_language_overrideは必要に応じて後で設定
  };

  return asset;
}


/**
 * VectorAssetの初期データを作成
 */
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

/**
 * DynamicVectorAssetの初期データを作成
 * CustomAssetから新しいDynamicVectorAssetインスタンスを生成する
 */
export function createDynamicVectorAsset(params: {
  customAsset: CustomAsset;  // CustomAssetを直接受け取る
  name?: string;             // オーバーライド可能
  parameters?: Record<string, number | string>; // パラメータ値オーバーライド
  usePageVariables?: boolean;
  useValueVariables?: boolean;
  parameterVariableBindings?: Record<string, string>;
}): DynamicVectorAsset {
  // CustomAssetParameterからデフォルト値を作成
  const defaultParameters = params.customAsset.parameters.reduce((acc, param) => ({
    ...acc,
    [param.name]: param.defaultValue
  }), {} as Record<string, number | string>);

  return {
    id: `dynamic-vector-${uuidv4()}`,
    type: 'DynamicVectorAsset',
    name: params.name || `${params.customAsset.name} (Dynamic SVG)`,

    // 配置・サイズ設定（CustomAssetの@width/@heightをデフォルトサイズとして使用）
    default_pos_x: 0,
    default_pos_y: 0,
    original_width:  params.customAsset.width,   // CustomAssetの@widthを使用
    original_height: params.customAsset.height, // CustomAssetの@heightを使用
    default_width:   params.customAsset.width,   // CustomAssetの@widthを使用
    default_height:  params.customAsset.height, // CustomAssetの@heightを使用
    default_opacity: 1.0,
    default_z_index: 0,

    // CustomAssetリンク
    custom_asset_id: params.customAsset.id,
    custom_asset_version: params.customAsset.version,

    // パラメータ値（デフォルト値 + オーバーライド）
    parameters: {
      ...defaultParameters,
      ...params.parameters
    },

    // 変数機能
    use_page_variables: params.usePageVariables || false,
    use_value_variables: params.useValueVariables || false,
    parameter_variable_bindings: params.parameterVariableBindings,
  };
}

/**
 * ValueAssetの初期データを作成
 */
/**
 * プロジェクト内で一意なValueAsset名を生成する
 * @param project - プロジェクトデータ
 * @param baseName - ベース名（デフォルト: "value"）
 * @returns 一意な名前（例: "value_1", "value_2", ...）
 */
export function generateUniqueValueAssetName(project?: ProjectData | null, baseName: string = 'value'): string {
  if (!project || !project.assets) {
    return `${baseName}_1`;
  }

  const existingNames = Object.values(project.assets)
    .filter(asset => asset.type === 'ValueAsset')
    .map(asset => asset.name);

  let counter = 1;
  while (existingNames.includes(`${baseName}_${counter}`)) {
    counter++;
  }

  return `${baseName}_${counter}`;
}

export function createValueAsset(params: {
  name?: string; // Optional now - will be generated if not provided
  value_type: 'string' | 'number' | 'formula';
  initial_value: any;
  new_page_behavior: 'reset' | 'inherit';
  project?: ProjectData | null; // Add project parameter for unique name generation
}): ValueAsset {
  const name = params.name || generateUniqueValueAssetName(params.project);

  return {
    id: `value-${uuidv4()}`,
    type: 'ValueAsset',
    name: name,
    value_type: params.value_type,
    initial_value: params.initial_value,
    new_page_behavior: params.new_page_behavior,
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
  const opacity = asset.default_settings.opacity;
  const opacityValidation = validateOpacity(opacity, 'デフォルト不透明度');
  if (!opacityValidation.isValid && opacityValidation.error) {
    errors.push(opacityValidation.error);
  }

  // 共通設定のバリデーション（オプショナル）
  if (asset.default_settings) {
    if (asset.default_settings.font_size !== undefined && asset.default_settings.font_size <= 0) {
      errors.push(`共通設定のフォントサイズは0より大きい値を入力してください。現在の値: ${asset.default_settings.font_size}`);
    }
    if (asset.default_settings.opacity !== undefined) {
      const opacityValidation = validateOpacity(asset.default_settings.opacity, '共通設定の不透明度');
      if (!opacityValidation.isValid && opacityValidation.error) {
        errors.push(opacityValidation.error);
      }
    }
  }

  // 言語別オーバーライド設定のバリデーション（オプショナル）
  if (asset.default_language_override) {
    Object.entries(asset.default_language_override).forEach(([langCode, settings]) => {
      if (settings.font_size !== undefined && settings.font_size <= 0) {
        errors.push(`${langCode}言語のフォントサイズは0より大きい値を入力してください。現在の値: ${settings.font_size}`);
      }
      if (settings.opacity !== undefined) {
        const opacityValidation = validateOpacity(settings.opacity, `${langCode}言語の不透明度`);
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
      if (settings.font_size !== undefined && settings.font_size <= 0) {
        errors.push(`${lang}言語のフォントサイズは0より大きい値を入力してください。現在の値: ${settings.font_size}`);
      }

      // 不透明度のバリデーション
      if (settings.opacity !== undefined) {
        const opacityValidation = validateOpacity(settings.opacity, `${lang}言語の不透明度`);
        if (!opacityValidation.isValid && opacityValidation.error) {
          errors.push(opacityValidation.error);
        }
      }

      // ストローク幅のバリデーション
      if (settings.stroke_width !== undefined && settings.stroke_width < 0) {
        errors.push(`${lang}言語のストローク幅は0以上の値を入力してください。現在の値: ${settings.stroke_width}`);
      }

      // 行間のバリデーション
      if (settings.leading !== undefined && settings.leading < 0) {
        errors.push(`${lang}言語の行間は0以上の値を入力してください。現在の値: ${settings.leading}`);
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

/**
 * DynamicVectorAssetのバリデーション
 * @param asset - バリデーション対象のDynamicVectorAsset
 * @returns バリデーション結果
 */
export function validateDynamicVectorAssetData(asset: DynamicVectorAsset): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 基本フィールドのバリデーション
  if (!asset.name || asset.name.trim() === '') {
    errors.push('アセット名は必須です。');
  }

  // DynamicVectorAssetは常にCustomAssetなので、custom_asset_idの必須チェック
  if (!asset.custom_asset_id || asset.custom_asset_id.trim() === '') {
    errors.push('CustomAsset IDは必須です。');
  }

  // カスタムアセットパラメータの基本チェック（存在する場合）
  if (asset.parameters) {
    for (const [key, value] of Object.entries(asset.parameters)) {
      if (typeof value !== 'string' && typeof value !== 'number') {
        errors.push(`カスタムアセットパラメータ "${key}" の値は文字列または数値である必要があります。`);
      }
    }
  }

  // サイズのバリデーション
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
 * DynamicVectorAssetInstanceのバリデーション
 * @param instance - バリデーション対象のDynamicVectorAssetInstance
 * @returns バリデーション結果
 */
export function validateDynamicVectorAssetInstanceData(instance: DynamicVectorAssetInstance): {
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

/**
 * ValueAssetのバリデーション
 * @param asset - バリデーション対象のValueAsset
 * @returns バリデーション結果
 */
export function validateValueAssetData(asset: ValueAsset): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 基本フィールドのバリデーション
  if (!asset.name || asset.name.trim() === '') {
    errors.push('アセット名は必須です。');
  } else {
    // 変数名として使える文字のみを許可
    const variableNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!variableNamePattern.test(asset.name)) {
      errors.push('アセット名は変数名として使用されるため、英字またはアンダースコアで始まり、英数字とアンダースコアのみを含む必要があります。');
    }
  }

  if (!asset.value_type) {
    errors.push('値の型は必須です。');
  }

  if (asset.initial_value === null || asset.initial_value === undefined) {
    errors.push('初期値は必須です。');
  }

  if (!asset.new_page_behavior) {
    errors.push('新規ページでの動作設定は必須です。');
  }

  // 値の型に応じた初期値のバリデーション
  if (asset.value_type === 'number' && typeof asset.initial_value !== 'number') {
    if (typeof asset.initial_value === 'string' && isNaN(parseFloat(asset.initial_value))) {
      errors.push('数値型の初期値は有効な数値を入力してください。');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * ValueAssetInstanceのバリデーション
 * @param instance - バリデーション対象のValueAssetInstance
 * @returns バリデーション結果
 */
export function validateValueAssetInstanceData(instance: ValueAssetInstance): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 基本フィールドのバリデーション
  if (!instance.asset_id || instance.asset_id.trim() === '') {
    errors.push('アセットIDは必須です。');
  }

  // オーバーライド値は任意なのでバリデーション不要

  return {
    isValid: errors.length === 0,
    errors
  };
}
