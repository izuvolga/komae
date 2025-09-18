/**
 * 言語設定ユーティリティ関数
 */

/**
 * 言語設定を更新するための共通ロジック
 * @param currentOverrides - 現在のオーバーライド設定
 * @param language - 更新対象の言語
 * @param settings - 更新する設定値
 * @returns 更新されたオーバーライド設定
 */
export function updateLanguageSettings<T extends Record<string, any>>(
  currentOverrides: Record<string, any> | undefined,
  language: string,
  settings: Partial<T>
): Record<string, any> | undefined {
  const overrides = currentOverrides || {};
  const languageSettings = overrides[language] || {};
  const updatedLanguageSettings = { ...languageSettings };

  // 複数の設定を同時に更新
  Object.entries(settings).forEach(([key, value]) => {
    if (value === undefined || value === '' || value === null) {
      delete updatedLanguageSettings[key];
    } else {
      updatedLanguageSettings[key] = value;
    }
  });

  // 更新されたオーバーライド設定を作成
  const updatedOverrides = { ...overrides };

  if (Object.keys(updatedLanguageSettings).length > 0) {
    updatedOverrides[language] = updatedLanguageSettings;
  } else {
    delete updatedOverrides[language];
  }

  return Object.keys(updatedOverrides).length > 0 ? updatedOverrides : undefined;
}