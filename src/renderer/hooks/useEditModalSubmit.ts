/**
 * 編集モーダル用submit処理カスタムフック
 */

import { useCallback } from 'react';
import type { EditMode, ValidationResult } from '../../types/common';

interface UseEditModalSubmitProps<TAsset, TInstance> {
  mode: EditMode;
  editedAsset: TAsset;
  editedInstance: TInstance | null;
  onSaveAsset?: (asset: TAsset) => void;
  onSaveInstance?: (instance: TInstance) => void;
  onClose: () => void;
  validateAsset: (asset: TAsset) => ValidationResult;
  validateInstance: (instance: TInstance) => ValidationResult;
  prepareAssetForSave?: (asset: TAsset) => TAsset;
}

/**
 * 編集モーダルの共通submit処理を提供するフック
 */
export const useEditModalSubmit = <TAsset, TInstance>({
  mode,
  editedAsset,
  editedInstance,
  onSaveAsset,
  onSaveInstance,
  onClose,
  validateAsset,
  validateInstance,
  prepareAssetForSave
}: UseEditModalSubmitProps<TAsset, TInstance>) => {

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'instance' && editedInstance) {
      // インスタンスの全体バリデーション
      const validation = validateInstance(editedInstance);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      if (onSaveInstance) {
        onSaveInstance(editedInstance);
      }
    } else if (mode === 'asset') {
      // アセットの準備処理（必要に応じて）
      const assetToSave = prepareAssetForSave ? prepareAssetForSave(editedAsset) : editedAsset;

      // アセットの全体バリデーション
      const validation = validateAsset(assetToSave);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      if (onSaveAsset) {
        onSaveAsset(assetToSave);
      }
    }
    onClose();
  }, [
    mode,
    editedAsset,
    editedInstance,
    onSaveAsset,
    onSaveInstance,
    onClose,
    validateAsset,
    validateInstance,
    prepareAssetForSave
  ]);

  return { handleSubmit };
};