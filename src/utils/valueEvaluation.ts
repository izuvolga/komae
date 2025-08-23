/**
 * ValueAsset の値評価エンジン
 * 数式の解析と実行、循環参照の検出を行う
 */

import { ValueAsset, ValueAssetInstance, ProjectData, Page } from '../types/entities';

/**
 * 数式評価の結果
 */
export interface EvaluationResult {
  value: any;
  isError: boolean;
  errorMessage?: string;
}

/**
 * 数式内の変数参照を解析する
 * @param formula - 数式文字列 (例: "%{value1} + %{value2}")
 * @returns 参照される変数のIDの配列
 */
export function parseFormulaReferences(formula: string): string[] {
  const references: string[] = [];
  const regex = /%\{([^}]+)\}/g;
  let match;
  
  while ((match = regex.exec(formula)) !== null) {
    const variableId = match[1];
    if (!references.includes(variableId)) {
      references.push(variableId);
    }
  }
  
  return references;
}

/**
 * 循環参照を検出する
 * @param valueAssetId - チェック対象のValueAssetのID
 * @param project - プロジェクトデータ
 * @param visited - 既に訪問したアセットID（再帰用）
 * @returns 循環参照が検出された場合true
 */
export function hasCircularReference(
  valueAssetId: string,
  project: ProjectData,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(valueAssetId)) {
    return true;
  }
  
  const asset = project.assets[valueAssetId];
  if (!asset || asset.type !== 'ValueAsset') {
    return false;
  }
  
  const valueAsset = asset as ValueAsset;
  if (valueAsset.value_type !== 'formula') {
    return false;
  }
  
  const references = parseFormulaReferences(valueAsset.initial_value);
  visited.add(valueAssetId);
  
  for (const refId of references) {
    if (hasCircularReference(refId, project, new Set(visited))) {
      return true;
    }
  }
  
  return false;
}

/**
 * ValueAssetの実際の値を取得する（ページ固有の値を考慮）
 * @param valueAsset - ValueAsset
 * @param page - 現在のページ
 * @returns 実際の値
 */
export function getValueAssetValue(valueAsset: ValueAsset, page: Page): any {
  // ページ内のValueAssetInstanceを検索
  const instance = Object.values(page.asset_instances).find(
    inst => inst.asset_id === valueAsset.id
  ) as ValueAssetInstance | undefined;
  
  // インスタンスでオーバーライドされている場合はそちらを使用
  if (instance && instance.override_value !== undefined) {
    return instance.override_value;
  }
  
  // アセットの初期値を使用
  return valueAsset.initial_value;
}

/**
 * ValueAssetの生の値を取得する（数式評価を行わない）
 * 編集時に数式文字列を取得したい場合に使用
 * @param valueAsset - ValueAsset
 * @param page - 現在のページ
 * @returns 生の値（数式文字列や未評価の値）
 */
export function getRawValueAssetValue(valueAsset: ValueAsset, page: Page): any {
  // ページ内のValueAssetInstanceを検索
  const instance = Object.values(page.asset_instances).find(
    inst => inst.asset_id === valueAsset.id
  ) as ValueAssetInstance | undefined;
  
  // インスタンスでオーバーライドされている場合はそちらを使用
  if (instance && instance.override_value !== undefined) {
    return instance.override_value;
  }
  
  // アセットの初期値を使用
  return valueAsset.initial_value;
}

/**
 * 数式を評価する
 * @param formula - 数式文字列
 * @param project - プロジェクトデータ
 * @param page - 現在のページ
 * @param pageIndex - 現在のページインデックス（0ベース）
 * @returns 評価結果
 */
export function evaluateFormula(
  formula: string,
  project: ProjectData,
  page: Page,
  pageIndex: number
): EvaluationResult {
  try {
    // 数式内の変数参照を置換
    let processedFormula = formula;
    // %{variableId} パターンを置換
    const regex = /%\{([^}]+)\}/g;
    let match;
    
    while ((match = regex.exec(formula)) !== null) {
      const variableId = match[0]; // %{value1} 全体
      const assetId = match[1]; // value1 部分
      
      const referencedAsset = project.assets[assetId];
      if (!referencedAsset || referencedAsset.type !== 'ValueAsset') {
        return {
          value: '#ERROR',
          isError: true,
          errorMessage: `参照されたアセット '${assetId}' が見つからないか、ValueAssetではありません。`
        };
      }
      // 循環参照チェック
      if (hasCircularReference(assetId, project)) {
        return {
          value: '#ERROR',
          isError: true,
          errorMessage: `'${assetId}' は循環参照を含んでいます。`
        };
      }
      
      const referencedValue = getValueAssetValue(referencedAsset as ValueAsset, page);
      
      // 参照値が数式の場合は再帰的に評価
      if ((referencedAsset as ValueAsset).value_type === 'formula') {
        const nestedResult = evaluateFormula(referencedValue, project, page, pageIndex);
        if (nestedResult.isError) {
          return nestedResult;
        }
        processedFormula = processedFormula.replace(variableId, String(nestedResult.value));
      } else {
        processedFormula = processedFormula.replace(variableId, String(referencedValue));
      }
    }
    
    // %p (現在のページ数) と %P (総ページ数) を置換
    processedFormula = processedFormula.replace(/%p/g, String(pageIndex + 1));
    processedFormula = processedFormula.replace(/%P/g, String(project.pages.length));
    
    if (!isValidArithmetic(processedFormula)) {
      return {
        value: '#ERROR',
        isError: true,
        errorMessage: '無効な数式です。'
      };
    }
    // JavaScript として評価
    // セキュリティのため、安全な数学演算のみを許可
    const safeEval = new Function('return ' + processedFormula);
    const result = safeEval();

    // Check if result is a number
    // result が数値で構成されているか確認
    if (typeof result !== 'number') {
      return {
        value: '#ERROR',
        isError: true,
        errorMessage: '数式の評価結果が数値ではありません。'
      };
    }

    // 数値を文字列に変換して数字、ドット、マイナス記号のみを許可
    const resultStr = String(result);
    if (!/^-?\d+(\.\d+)?$/.test(resultStr)) {
      return {
        value: '#ERROR',
        isError: true,
        errorMessage: '数式の評価結果が無効な形式です。'
      };
    }

    return {
      value: result,
      isError: false
    };
  } catch (error) {
    return {
      value: '#ERROR',
      isError: true,
      errorMessage: error instanceof Error ? error.message : '数式の評価に失敗しました。'
    };
  }
}

/**
 * ValueAssetの最終的な値を取得する（数式評価を含む）
 * @param valueAsset - ValueAsset
 * @param project - プロジェクトデータ
 * @param page - 現在のページ
 * @param pageIndex - 現在のページインデックス（0ベース）
 * @returns 最終的な値
 */
export function getEffectiveValueAssetValue(
  valueAsset: ValueAsset,
  project: ProjectData,
  page: Page,
  pageIndex: number
): any {
  // 循環参照チェック
  if (valueAsset.value_type === 'formula' && hasCircularReference(valueAsset.id, project)) {
    return '#ERROR';
  }

  let rawValue: any = getValueAssetValue(valueAsset, page);
  if (valueAsset.new_page_behavior === 'inherit') {
    /**
     * TODO: ページ数に対してO(n^2)のループになっており、パフォーマンスに影響があるため、改善する
     * 新規ページで前のページの値を継承する場合、それよりも前のページを順番にチェック
     * - ValueAssetInstance の値があればそれを使用
     * - 0 ページまでチェックして、なければ ValueAsset の初期値を使用
     */
    let currentPageIndex = pageIndex - 1;
    while (currentPageIndex >= 0) {
      const previousPage = project.pages[currentPageIndex];
      if (previousPage) {
        for (const instance of Object.values(previousPage.asset_instances)) {
          if (instance.asset_id !== valueAsset.id) continue;
          // ValueAssetInstance にキャストできるか確認
          if (!(instance as ValueAssetInstance)) continue;
          // ValueAssetInstance のオーバーライド値を使用
          if ((instance as ValueAssetInstance).override_value !== undefined) {
            rawValue = (instance as ValueAssetInstance).override_value;
            break;
          }
        }
      }
      currentPageIndex--;
    }
  }

  // 数式の場合は評価
  if (valueAsset.value_type === 'formula') {
    const result = evaluateFormula(rawValue, project, page, pageIndex);
    return result.value;
  }

  // 数値型の場合は数値に変換
  if (valueAsset.value_type === 'number') {
    const numValue = parseFloat(rawValue);
    return isNaN(numValue) ? 0 : numValue;
  }

  // 文字列型の場合はそのまま返す
  return String(rawValue);
}

/**
 * 新規ページ作成時のValueAssetInstanceの値を決定する
 * @param valueAsset - ValueAsset
 * @param previousPage - 前のページ（存在する場合）
 * @returns 新規ページでの値
 */
export function getNewPageValue(valueAsset: ValueAsset, previousPage?: Page): any {
  if (valueAsset.new_page_behavior === 'inherit' && previousPage) {
    // 前のページの値を継承
    return getValueAssetValue(valueAsset, previousPage);
  } else {
    // 初期値にリセット
    return valueAsset.initial_value;
  }
}

/**
 * 数式が有効かどうかをチェックする
 * @param formula - 数式文字列
 * @return 有効な数式ならtrue、無効ならfalse
 */
export function isValidArithmetic(input: string): boolean {
  const s = input.replace(/\s+/g, ''); // 空白は無視
  let i = 0;

  function peek(): string | null { return i < s.length ? s[i] : null; }
  function consume(ch?: string): boolean {
    if (ch == null) { i++; return true; }
    if (s[i] === ch) { i++; return true; }
    return false;
  }

  // number := \d+(\.\d+)? | \.\d+
  function parseNumber(): boolean {
    const start = i;
    let digits = 0, dot = false;

    if (peek() === '.') {
      dot = true; consume('.');
      while (/\d/.test(peek() ?? '')) { consume(); digits++; }
      return digits > 0; // ".5" はOK
    } else {
      while (/\d/.test(peek() ?? '')) { consume(); digits++; }
      if (digits === 0) return false;
      if (peek() === '.') {
        dot = true; consume('.');
        while (/\d/.test(peek() ?? '')) { consume(); }
      }
      return true; // "1" や "1.1"
    }
  }

  // primary := number | "(" expr ")"
  function parsePrimary(): boolean {
    if (peek() === '(') {
      consume('(');
      if (!parseExpr()) return false;
      if (!consume(')')) return false;
      return true;
    }
    return parseNumber();
  }

  // factor := ("+"|"-")* primary
  function parseFactor(): boolean {
    while (peek() === '+' || peek() === '-') consume(); // 単項 ± の連続を許可
    return parsePrimary();
  }

  // term := factor (("*"|"/") factor)*
  function parseTerm(): boolean {
    if (!parseFactor()) return false;
    while (peek() === '*' || peek() === '/') {
      consume();
      if (!parseFactor()) return false;
    }
    return true;
  }

  // expr := term (("+"|"-") term)*
  function parseExpr(): boolean {
    if (!parseTerm()) return false;
    while (peek() === '+' || peek() === '-') {
      consume();
      if (!parseTerm()) return false;
    }
    return true;
  }

  const ok = parseExpr();
  return ok && i === s.length;
}
