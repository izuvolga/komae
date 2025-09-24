// ISO 639-1言語コード定義

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
}

// 一般的なISO 639-1言語コードのリスト（UI仕様で想定される主要言語）
export const AVAILABLE_LANGUAGES: LanguageInfo[] = [
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
];

// デフォルト対応言語（プロジェクト作成時の初期値）
export const DEFAULT_SUPPORTED_LANGUAGES = ['ja'];
export const DEFAULT_CURRENT_LANGUAGE = 'ja';

/**
 * 言語コードから言語情報を取得
 * @param code ISO 639-1言語コード
 * @returns LanguageInfo | undefined
 */
export function getLanguageInfo(code: string): LanguageInfo | undefined {
  return AVAILABLE_LANGUAGES.find(lang => lang.code === code);
}

/**
 * 言語コードの表示名を取得
 * @param code ISO 639-1言語コード
 * @param useNativeName ネイティブ名を使用するか（デフォルト: true）
 * @returns 言語の表示名
 */
export function getLanguageDisplayName(code: string, useNativeName: boolean = true): string {
  const langInfo = getLanguageInfo(code);
  if (!langInfo) {
    return code.toUpperCase(); // フォールバック
  }
  
  if (useNativeName) {
    return `${code.toUpperCase()} (${langInfo.nativeName})`;
  } else {
    return `${code.toUpperCase()} (${langInfo.name})`;
  }
}

/**
 * サポートされている言語コードかをチェック
 * @param code ISO 639-1言語コード
 * @returns サポートされているかどうか
 */
export function isSupportedLanguageCode(code: string): boolean {
  return AVAILABLE_LANGUAGES.some(lang => lang.code === code);
}
