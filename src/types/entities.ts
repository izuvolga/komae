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

// AssetAttr定義
export interface PositionAssetAttr {
  name: string;
  pos_x: number;
  pos_y: number;
}

export interface SizeAssetAttr {
  name: string;
  width: number;
  height: number;
}

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
  default_opacity: number;
  default_mask: [number, number, number, number]; // [left, top, right, bottom]
}

export interface TextAsset extends BaseAsset {
  type: 'TextAsset';
  default_text: string;
  font: string;
  stroke_width: number;
  font_size: number;
  color_ex: string; // 縁取りの色
  color_in: string; // 内部の色
  default_pos_x: number;
  default_pos_y: number;
  vertical: boolean; // 縦書きフラグ
}

export type Asset = ImageAsset | TextAsset;

// AssetInstance定義
export interface Transform {
  scale_x: number;
  scale_y: number;
  rotation: number;
}

export interface BaseAssetInstance {
  id: string;
  asset_id: string;
  z_index: number;
  transform: Transform;
  opacity: number;
}

export interface ImageAssetInstance extends BaseAssetInstance {
  position_attr_id?: string;
  size_attr_id?: string;
  override_pos_x?: number;
  override_pos_y?: number;
  override_opacity?: number;
  override_mask?: [number, number, number, number];
}

export interface TextAssetInstance extends BaseAssetInstance {
  position_attr_id?: string;
  override_text?: string;
  override_pos_x?: number;
  override_pos_y?: number;
  font_override?: {
    size?: number;
    color_ex?: string;
    color_in?: string;
  };
}

export type AssetInstance = ImageAssetInstance | TextAssetInstance;

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
  asset_attrs: {
    position_attrs: Record<string, PositionAssetAttr>;
    size_attrs: Record<string, SizeAssetAttr>;
  };
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

export type ExportFormat = 'html' | 'png';

export interface ExportOptions {
  quality?: number;
  embedAssets?: boolean;
  includeViewer?: boolean;
  optimize?: boolean;
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