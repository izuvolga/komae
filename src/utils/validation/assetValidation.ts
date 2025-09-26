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

// マスクのバリデーション
export function validateMask(
  mask: [[number, number], [number, number], [number, number], [number, number]] | undefined, 
  fieldName: string
): ValidationResult {
  if (mask === undefined) {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];

  // マスクが正しい配列構造かチェック
  if (!Array.isArray(mask) || mask.length !== 4) {
    errors.push(`${fieldName}は4つの座標点を持つ配列である必要があります。`);
    return { isValid: false, errors };
  }

  // 各座標点が正しい形式かチェック
  for (let i = 0; i < mask.length; i++) {
    const point = mask[i];
    if (!Array.isArray(point) || point.length !== 2) {
      errors.push(`${fieldName}の${i + 1}番目の座標点は[x, y]の形式である必要があります。`);
      continue;
    }

    const [x, y] = point;
    if (typeof x !== 'number' || typeof y !== 'number') {
      errors.push(`${fieldName}の${i + 1}番目の座標点は数値である必要があります。現在の値: [${x}, ${y}]`);
    }

    // 座標値の範囲チェック（0.0〜1.0の範囲）
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      errors.push(`${fieldName}の${i + 1}番目の座標点は0.0〜1.0の範囲である必要があります。現在の値: [${x}, ${y}]`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
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
  override_mask?: [[number, number], [number, number], [number, number], [number, number]];
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

  // オーバーライドマスクのバリデーション
  const maskValidation = validateMask(instance.override_mask, 'マスク (オーバーライド)');
  if (!maskValidation.isValid) {
    errors.push(...maskValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}