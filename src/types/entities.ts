// エンティティの型定義
// docs/design/000-entity.mdに基づく

export interface ProjectMetadata {
  komae_version: string;
  project_version: string;
  title: string;
  description?: string;
}

export interface CanvasConfig {
  width: number;
  height: number;
}

// AssetAttr定義は削除 - ImageAssetInstanceに直接override_width, override_heightを追加

// Asset定義（テンプレート）
export interface BaseAsset {
  id: string;
  type: 'ImageAsset' | 'TextAsset';
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
}

export interface TextAsset extends BaseAsset {
  type: 'TextAsset';
  default_text: string;
  font: string; // フォントのファイルパス（絶対パス）
  stroke_width: number;
  font_size: number;
  stroke_color: string; // テキストの縁取りの色（RGBA形式の文字列）
  fill_color: string; // テキストの内部の色（RGBA形式の文字列）
  default_pos_x: number;
  default_pos_y: number;
  opacity: number; // デフォルトの不透明度（0.0〜1.0）
  leading: number; // テキストの行間（verticalがtrueの場合にのみ利用）
  vertical: boolean; // true の場合、縦書き
}

export type Asset = ImageAsset | TextAsset;

// AssetInstance定義
export interface BaseAssetInstance {
  id: string;
  asset_id: string;
  z_index: number;
}

export interface ImageAssetInstance extends BaseAssetInstance {
  override_pos_x?: number;
  override_pos_y?: number;
  override_width?: number;
  override_height?: number;
  override_opacity?: number;
  override_mask?: [[number, number], [number, number], [number, number], [number, number]];
}

export interface TextAssetInstance extends BaseAssetInstance {
  override_text?: string;
  override_pos_x?: number;
  override_pos_y?: number;
  override_font_size?: number;
  override_opacity?: number;
}

export type AssetInstance = ImageAssetInstance | TextAssetInstance;

// AssetInstanceのoverride値チェック用ヘルパー関数
export function hasAssetInstanceOverrides(instance: AssetInstance, assetType: Asset['type']): boolean {
  if (!instance) return false;
  
  if (assetType === 'TextAsset') {
    const textInstance = instance as TextAssetInstance;
    return !!(
      textInstance.override_text ||
      textInstance.override_pos_x !== undefined ||
      textInstance.override_pos_y !== undefined ||
      textInstance.override_font_size !== undefined ||
      textInstance.override_opacity !== undefined
    );
  } else if (assetType === 'ImageAsset') {
    const imageInstance = instance as ImageAssetInstance;
    return !!(
      imageInstance.override_pos_x !== undefined ||
      imageInstance.override_pos_y !== undefined ||
      imageInstance.override_width !== undefined ||
      imageInstance.override_height !== undefined ||
      imageInstance.override_opacity !== undefined ||
      imageInstance.override_mask
    );
  }
  
  return false;
}

// AssetInstanceのoverride値をリセットする関数
export function resetAssetInstanceOverrides(instance: AssetInstance, assetType: Asset['type']): Partial<AssetInstance> {
  const resetUpdates: any = {};
  
  if (assetType === 'TextAsset') {
    resetUpdates.override_text = undefined;
    resetUpdates.override_pos_x = undefined;
    resetUpdates.override_pos_y = undefined;
    resetUpdates.override_font_size = undefined;
    resetUpdates.override_opacity = undefined;
  } else if (assetType === 'ImageAsset') {
    resetUpdates.override_pos_x = undefined;
    resetUpdates.override_pos_y = undefined;
    resetUpdates.override_width = undefined;
    resetUpdates.override_height = undefined;
    resetUpdates.override_opacity = undefined;
    resetUpdates.override_mask = undefined;
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
  showAssetLibrary: boolean;
  showPreview: boolean;
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