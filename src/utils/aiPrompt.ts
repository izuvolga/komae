/**
 * AI編集用プロンプト生成機能
 * TextAsset Bulk Edit Screenで使用される
 */

/**
 * AI一括編集用のプロンプトを生成
 * @param yamlContent 現在のYAMLコンテンツ
 * @param supportedLanguages サポートされている言語コード一覧
 * @returns AI編集用プロンプト文字列
 */
export function generateAIPrompt(yamlContent: string, supportedLanguages: string[]): string {
  // 言語コードと言語名のマッピング
  const languageNames: Record<string, string> = {
    'ja': 'Japanese',
    'en': 'English', 
    'zh': 'Chinese',
    'ko': 'Korean',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'tr': 'Turkish',
  };

  // サポートされている言語の説明を生成
  const languageDescriptions = supportedLanguages
    .map(code => `- ${code}: ${languageNames[code] || code.toUpperCase()}`)
    .join('\n');

  const prompt = `以下の YAML テキストを編集してください。この YAML テキストは、ビジュアルノベルプロジェクトのセリフの設定ファイルとして使われます。有効なYAMLフォーマットを保つように「TODO」の箇所を、その言語コードの表す言語の文章に変更してください。YAMLの「languages」の箇所に、文字コードがどの国の言語を表すかを記載しています。また、「pages」の配列要素のそれぞれがページをあらわし、先頭にある要素ほど前半のページです。各ページの\`instance-\`で開始するキーは、一つの文章のまとまりです。\`name\`要素には、そのまとまりの参考となる文脈が含まれている場合があります。\`instance-\`直下には国コードのキーが存在し、翻訳文が含まれます。すでに存在する翻訳文を参考にしてTODOの箇所を翻訳してください。翻訳が正確で、そのページ自体の文脈だけでなく、前後の文脈を踏まえて適切な翻訳であることを確認してください。文章のブロックは横幅の調整のために改行を含んでいる場合があります。翻訳文も同じような文章幅を保つように適宜改行をいれてください。

言語コード対応表:
${languageDescriptions}

\`\`\`yaml
${yamlContent}
\`\`\``;

  return prompt;
}

/**
 * 翻訳支援用のプロンプトを生成（特定言語への翻訳に特化）
 * @param yamlContent 現在のYAMLコンテンツ
 * @param targetLanguages 翻訳対象の言語コード一覧
 * @param sourceLanguage 翻訳元言語コード（デフォルト: 'ja'）
 * @returns 翻訳用プロンプト文字列
 */
export function generateTranslationPrompt(
  yamlContent: string, 
  targetLanguages: string[],
  sourceLanguage: string = 'ja'
): string {
  const languageNames: Record<string, string> = {
    'ja': '日本語',
    'en': '英語', 
    'zh': '中国語',
    'ko': '韓国語',
    'es': 'スペイン語',
    'fr': 'フランス語',
    'de': 'ドイツ語',
    'it': 'イタリア語',
    'pt': 'ポルトガル語',
    'ru': 'ロシア語',
    'ar': 'アラビア語',
    'hi': 'ヒンディー語',
    'th': 'タイ語',
    'vi': 'ベトナム語',
    'tr': 'トルコ語',
  };

  const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;
  const targetLangNames = targetLanguages
    .map(code => languageNames[code] || code)
    .join('、');

  const prompt = `以下のYAMLファイルに含まれる${sourceLangName}のテキストを、${targetLangNames}に翻訳してください。

翻訳時の注意点：
1. ビジュアルノベルのセリフとして自然な翻訳を心がけてください
2. キャラクター性や文脈を考慮して適切な口調・敬語レベルを選択してください
3. 文章の改行は原文の雰囲気を保つよう適宜調整してください
4. 既存の翻訳がある場合は、その翻訳スタイルに合わせてください
5. 「TODO」と書かれた箇所のみを翻訳し、その他の構造は変更しないでください
6. YAMLの構文を壊さないよう注意してください

\`\`\`yaml
${yamlContent}
\`\`\``;

  return prompt;
}

/**
 * 文章改善用のプロンプトを生成
 * @param yamlContent 現在のYAMLコンテンツ
 * @param language 改善対象の言語コード
 * @returns 文章改善用プロンプト文字列
 */
export function generateImprovementPrompt(yamlContent: string, language: string): string {
  const languageNames: Record<string, string> = {
    'ja': '日本語',
    'en': '英語', 
    'zh': '中国語',
    'ko': '韓国語',
    'es': 'スペイン語',
    'fr': 'フランス語',
    'de': 'ドイツ語',
    'it': 'イタリア語',
    'pt': 'ポルトガル語',
    'ru': 'ロシア語',
    'ar': 'アラビア語',
    'hi': 'ヒンディー語',
    'th': 'タイ語',
    'vi': 'ベトナム語',
    'tr': 'トルコ語',
  };

  const langName = languageNames[language] || language;

  const prompt = `以下のYAMLファイルに含まれる${langName}のテキストを、より自然で魅力的な文章に改善してください。

改善時の注意点：
1. ビジュアルノベルのセリフとして読みやすく、魅力的な文章にしてください
2. キャラクター性を保ちつつ、より自然な口調に調整してください
3. 文章の流れを改善し、読み手の感情に訴える表現を使ってください
4. 誤字脱字や不自然な表現があれば修正してください
5. 文章の長さや改行は適切に調整してください
6. YAMLの構造や他の言語のテキストは変更しないでください

\`\`\`yaml
${yamlContent}
\`\`\``;

  return prompt;
}

/**
 * プロンプトにYAMLコンテンツ内のTODO箇所をハイライト
 * @param yamlContent YAMLコンテンツ
 * @returns TODO箇所がある場合はそれをハイライトした説明文
 */
export function generateTodoHighlight(yamlContent: string): string {
  const todoLines = yamlContent.split('\n').filter(line => line.includes('TODO'));
  
  if (todoLines.length === 0) {
    return '現在、TODOマーカーは見つかりません。必要に応じてテキストを編集または翻訳してください。';
  }

  return `TODOマーカーが${todoLines.length}箇所見つかりました。これらの箇所を適切な翻訳または内容で置き換えてください：

${todoLines.map((line, index) => `${index + 1}. ${line.trim()}`).join('\n')}`;
}

/**
 * YAMLコンテンツの統計情報を生成
 * @param yamlContent YAMLコンテンツ
 * @returns 統計情報文字列
 */
export function generateContentStats(yamlContent: string): string {
  const lines = yamlContent.split('\n');
  const todoCount = lines.filter(line => line.includes('TODO')).length;
  const instanceCount = lines.filter(line => line.trim().startsWith('instance-')).length;
  const pageCount = lines.filter(line => line.trim().startsWith('- id:')).length;
  
  return `統計情報:
- ページ数: ${pageCount}
- テキストインスタンス数: ${instanceCount}
- TODO箇所: ${todoCount}
- 総行数: ${lines.length}`;
}