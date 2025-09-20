/**
 * 短いIDを生成するユーティリティ
 * UUIDの代わりに使用して、データの冗長性を削減し、デバッグを容易にする
 */

/**
 * 7桁のランダム文字列を生成
 * 文字セット: 0-9, a-z (小文字のみ)
 */
function generateShortId(): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * ImageAsset用のIDを生成
 */
export function generateImageAssetId(): string {
  return `img-${generateShortId()}`;
}

/**
 * TextAsset用のIDを生成
 */
export function generateTextAssetId(): string {
  return `txt-${generateShortId()}`;
}

/**
 * VectorAsset用のIDを生成
 */
export function generateVectorAssetId(): string {
  return `vec-${generateShortId()}`;
}

/**
 * DynamicVectorAsset用のIDを生成
 */
export function generateDynamicVectorAssetId(): string {
  return `dvg-${generateShortId()}`;
}

/**
 * ValueAsset用のIDを生成
 */
export function generateValueAssetId(): string {
  return `val-${generateShortId()}`;
}

/**
 * AssetInstance用のIDを生成
 * ins-(unix時刻)-(7桁ランダム) の形式
 */
export function generateAssetInstanceId(): string {
  const unixTime = Math.floor(Date.now() / 1000);
  return `ins-${unixTime}-${generateShortId()}`;
}

/**
 * プロジェクト用のIDを生成
 */
export function generateProjectId(): string {
  return `prj-${generateShortId()}`;
}

/**
 * ページ用のIDを生成
 */
export function generatePageId(): string {
  return `page-${generateShortId()}`;
}

/**
 * 汎用的な短いIDを生成（プレフィックスなし）
 */
export function generateGenericShortId(): string {
  return generateShortId();
}