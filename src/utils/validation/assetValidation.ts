/**
 * アセットバリデーション共通関数
 */

import type { ValidationResult } from '../../types/common';

/**
 * 不透明度のバリデーション結果
 */
interface OpacityValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 不透明度をバリデーションする
 * @param opacity - 検証する不透明度（undefined可）
 * @param fieldName - フィールド名（エラーメッセージ用）
 * @returns バリデーション結果
 */
export function validateOpacity(opacity: number | undefined, fieldName: string): OpacityValidationResult {
  if (opacity === undefined) {
    return { isValid: true };
  }

  if (opacity < 0 || opacity > 1) {
    return {
      isValid: false,
      error: `${fieldName}は0.0から1.0の範囲で入力してください。現在の値: ${opacity}`
    };
  }

  return { isValid: true };
}

/**
 * アセットインスタンスのオーバーライド値を検証する共通関数
 * @param instance - 検証するアセットインスタンス
 * @returns バリデーション結果
 */
export function validateAssetInstanceOverrides(instance: {
  override_opacity?: number;
  override_width?: number;
  override_height?: number;
}): ValidationResult {
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