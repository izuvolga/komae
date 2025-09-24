import { AVAILABLE_LANGUAGES } from '../constants/languages';

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
  const languageDescriptions = AVAILABLE_LANGUAGES
      .filter(lang => supportedLanguages.includes(lang.code))
      .map(lang => `- ${lang.code}: ${lang.name}`)
      .join('\n');

  const prompt = `以下の YAML テキストを編集してください。この YAML テキストは、ビジュアルノベルプロジェクトのセリフの設定ファイルとして使われます。有効なYAMLフォーマットを保つように「<TODO>」の箇所を、その言語コードの表す言語の文章に変更してください。また、「pages」の配列要素のそれぞれがページをあらわし、先頭にある要素ほど前半のページです。各ページの\`ins-\`で開始するキーは、一つの文章のまとまりです。\`name\`要素には、そのまとまりの参考となる文脈が含まれている場合があります。\`ins-\`直下には国コードのキーが存在し、翻訳文が含まれます。すでに存在する翻訳文を参考にしてTODOの箇所を翻訳してください。翻訳が正確で、そのページ自体の文脈だけでなく、前後の文脈を踏まえて適切な翻訳であることを確認してください。文章のブロックは横幅の調整のために改行を含んでいる場合があります。翻訳文も同じような文章幅を保つように適宜改行をいれてください。

## 言語コード対応表

${languageDescriptions}

## 編集対象のYAML

\`\`\`yaml
${yamlContent}
\`\`\``;

  return prompt;
}

