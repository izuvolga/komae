/**
 * 共通型定義
 * アプリケーション全体で使用される基本的な型を定義
 */

/**
 * 基本的なモーダルコンポーネントのProps
 */
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * バリデーション結果の型
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * バリデーション結果（単一エラー）
 */
export interface SingleValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 編集モードの種類
 */
export type EditMode = 'asset' | 'instance';

/**
 * 基本的な編集モーダルのProps
 */
export interface BaseEditModalProps<TAsset, TInstance> extends BaseModalProps {
  mode: EditMode;
  asset: TAsset;
  assetInstance?: TInstance;
  page?: any; // Page型への参照を避けるため
  onSaveAsset?: (updatedAsset: TAsset) => void;
  onSaveInstance?: (updatedInstance: TInstance) => void;
}