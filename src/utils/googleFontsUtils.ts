/**
 * Google Fonts関連のユーティリティ関数
 */

import * as crypto from 'crypto';

/**
 * Google Font URLを解析してフォント名を抽出
 */
export function parseGoogleFontUrl(url: string): { fontName: string; originalUrl: string } {
  // Google Fonts URL の検証
  if (!url.includes('fonts.googleapis.com')) {
    throw new Error('無効なGoogle Fonts URLです。Google Fonts のURLを入力してください。');
  }
  
  try {
    const urlObj = new URL(url);
    
    // 1つめのfamilyパラメータのみを利用
    const family = urlObj.searchParams.get('family');
    
    if (!family) {
      throw new Error('familyパラメータが見つかりません。正しいGoogle Fonts URLを入力してください。');
    }
    
    // フォント名の正規化
    // 1. コロンで区切って1番目の値を取得（ウェイト指定などを除去）
    // 2. + → スペースに変換
    const fontName = family.split(':')[0].replace(/\+/g, ' ');
    
    if (!fontName.trim()) {
      throw new Error('フォント名を取得できませんでした。');
    }
    
    // originalUrlはそのまま使用
    return { fontName: fontName.trim(), originalUrl: url };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Google Fonts URLの解析に失敗しました。');
  }
}

/**
 * Google Font IDを生成
 */
export function generateGoogleFontId(url: string): string {
  const hash = crypto.createHash('sha256').update(url).digest('hex');
  return `font-${hash.substring(0, 8)}`;
}