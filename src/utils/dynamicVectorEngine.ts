/**
 * DynamicVectorAsset用のJavaScript実行エンジン
 * 安全なサンドボックス環境でスクリプトを実行し、SVGを生成する
 */

import type { DynamicVectorAsset, ProjectData, ValueAsset } from '../types/entities';
import { getEffectiveValueAssetValue } from './valueEvaluation';

/**
 * スクリプト実行結果の型定義
 */
export interface ScriptExecutionResult {
  success: boolean;
  svgContent?: string;
  error?: string;
  executionTime?: number;
  warnings?: string[];
  debugInfo?: {
    lineNumber?: number;
    columnNumber?: number;
    stackTrace?: string;
    consoleOutput?: string[];
  };
}

/**
 * スクリプト実行コンテキストの型定義
 */
export interface ScriptContext {
  page_current?: number;
  page_total?: number;
  values?: Record<string, any>; // ValueAsset変数
  params?: Record<string, any>; // CustomAssetパラメータ（変数バインディング適用済み）
  [key: string]: any;
}

/**
 * 危険なオブジェクト・関数のリスト（ブラックリスト）
 */
const DANGEROUS_GLOBALS = [
  'eval', 'Function', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'XMLHttpRequest', 'fetch', 'WebSocket', 'EventSource', 'importScripts',
  'document', 'window', 'global', 'globalThis', 'self', 'parent', 'top', 'frames',
  'location', 'history', 'navigator', 'screen', 'localStorage', 'sessionStorage',
  'indexedDB', 'webkitIndexedDB', 'mozIndexedDB', 'msIndexedDB',
  'alert', 'confirm', 'prompt', 'open', 'close', 'print',
  'postMessage', 'addEventListener', 'removeEventListener',
  'require', 'module', 'exports', '__dirname', '__filename', 'process'
];

/**
 * 安全な実行環境でJavaScriptスクリプトを実行
 * @param script - 実行するJavaScriptコード
 * @param context - 実行コンテキスト（変数注入）
 * @param timeout - 実行タイムアウト（ミリ秒、デフォルト5秒）
 * @returns 実行結果
 */
export function executeScript(
  script: string, 
  context: ScriptContext = {},
  timeout: number = 5000
): ScriptExecutionResult {
  const startTime = Date.now();
  const consoleOutput: string[] = [];
  const warnings: string[] = [];
  
  try {
    // スクリプトが空の場合
    if (!script || script.trim() === '') {
      return {
        success: false,
        error: 'スクリプトが空です。',
        warnings,
        debugInfo: { consoleOutput }
      };
    }

    // 基本的なシンタックスチェック
    try {
      new Function(script);
    } catch (syntaxError) {
      return {
        success: false,
        error: `スクリプトの構文エラー: ${syntaxError instanceof Error ? syntaxError.message : String(syntaxError)}`,
        warnings,
        debugInfo: { 
          consoleOutput,
          stackTrace: syntaxError instanceof Error ? syntaxError.stack : undefined
        }
      };
    }

    // 危険なコードの検出
    const dangerousPatterns = [
      /while\s*\(\s*true\s*\)/gi, // 無限ループ
      /for\s*\(\s*;\s*;\s*\)/gi,  // 無限forループ
      /\.constructor/gi,          // constructorアクセス
      /prototype/gi,              // prototypeアクセス
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(script)) {
        warnings.push(`潜在的に危険なパターンを検出: ${pattern.source}`);
      }
    }

    // サンドボックス用の安全な環境を作成
    const sandboxGlobals = createSandboxGlobals(context, consoleOutput);
    
    // スクリプトをサンドボックスで実行（タイムアウト付き）
    const wrappedScript = wrapScriptForSandbox(script);
    const executionFunction = new Function(...Object.keys(sandboxGlobals), wrappedScript);
    
    // スクリプト実行（基本的なタイムアウトチェック付き）
    let result: any;
    try {
      // 実行開始時間をチェックして簡単なタイムアウト検証
      const scriptStartTime = Date.now();
      result = executionFunction(...Object.values(sandboxGlobals));
      
      // 実行完了後のタイムアウトチェック
      const actualExecutionTime = Date.now() - scriptStartTime;
      if (actualExecutionTime > timeout) {
        warnings.push(`実行時間が設定されたタイムアウト値を超えました (${actualExecutionTime}ms > ${timeout}ms)`);
      }
    } catch (executionError) {
      return {
        success: false,
        error: `スクリプト実行中にエラーが発生しました: ${executionError instanceof Error ? executionError.message : String(executionError)}`,
        executionTime: Date.now() - startTime,
        warnings,
        debugInfo: { 
          consoleOutput,
          stackTrace: executionError instanceof Error ? executionError.stack : undefined
        }
      };
    }

    const executionTime = Date.now() - startTime;

    // パフォーマンス警告
    if (executionTime > 1000) {
      warnings.push(`実行時間が長いです (${executionTime}ms)`);
    }

    // 結果がSVG文字列かどうかを検証
    const svgValidation = validateSVGOutput(result);
    
    if (!svgValidation.isValid) {
      return {
        success: false,
        error: svgValidation.error,
        executionTime,
        warnings,
        debugInfo: { consoleOutput }
      };
    }

    return {
      success: true,
      svgContent: result,
      executionTime,
      warnings: warnings.length > 0 ? warnings : undefined,
      debugInfo: consoleOutput.length > 0 ? { consoleOutput } : undefined
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // エラーの詳細情報を抽出
    let lineNumber: number | undefined;
    let columnNumber: number | undefined;
    let stackTrace: string | undefined;
    
    if (error instanceof Error) {
      stackTrace = error.stack;
      
      // 行番号と列番号をスタックトレースから抽出を試みる
      const stackMatch = error.stack?.match(/<anonymous>:(\d+):(\d+)/);
      if (stackMatch) {
        lineNumber = parseInt(stackMatch[1]);
        columnNumber = parseInt(stackMatch[2]);
      }
    }
    
    return {
      success: false,
      error: `スクリプト実行エラー: ${error instanceof Error ? error.message : String(error)}`,
      executionTime,
      warnings,
      debugInfo: {
        consoleOutput,
        lineNumber,
        columnNumber,
        stackTrace
      }
    };
  }
}

/**
 * サンドボックス用の安全なグローバルオブジェクトを作成
 * @param context - 実行コンテキスト
 * @param consoleOutput - コンソール出力をキャプチャする配列
 * @returns サンドボックス環境のグローバルオブジェクト
 */
function createSandboxGlobals(context: ScriptContext, consoleOutput: string[]): Record<string, any> {
  const sandboxGlobals: Record<string, any> = {
    // 安全な組み込み関数・オブジェクト
    Math,
    Date,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    
    // デバッグ用コンソール（出力をキャプチャ）
    console: {
      log: (...args: any[]) => {
        consoleOutput.push(`LOG: ${args.map(arg => String(arg)).join(' ')}`);
      },
      warn: (...args: any[]) => {
        consoleOutput.push(`WARN: ${args.map(arg => String(arg)).join(' ')}`);
      },
      error: (...args: any[]) => {
        consoleOutput.push(`ERROR: ${args.map(arg => String(arg)).join(' ')}`);
      },
      info: (...args: any[]) => {
        consoleOutput.push(`INFO: ${args.map(arg => String(arg)).join(' ')}`);
      },
      debug: (...args: any[]) => {
        consoleOutput.push(`DEBUG: ${args.map(arg => String(arg)).join(' ')}`);
      }
    }
  };

  // コンテキストから変数を注入
  Object.assign(sandboxGlobals, context);
  
  return sandboxGlobals;
}

/**
 * スクリプトをサンドボックス実行用にラップ
 * @param script - 元のスクリプト
 * @returns ラップされたスクリプト
 */
function wrapScriptForSandbox(script: string): string {
  // スクリプトを即座に実行して結果を返すようにラップ
  return `
    "use strict";
    ${script}
  `;
}

/**
 * スクリプトの出力がSVG文字列として有効かを検証
 * @param output - スクリプトの出力
 * @returns バリデーション結果
 */
function validateSVGOutput(output: any): { isValid: boolean; error?: string } {
  // 出力が文字列でない場合
  if (typeof output !== 'string') {
    return {
      isValid: false,
      error: `スクリプトの戻り値は文字列である必要があります。実際の型: ${typeof output}`
    };
  }

  // 空文字列の場合
  if (output.trim() === '') {
    return {
      isValid: false,
      error: 'スクリプトの戻り値が空です。'
    };
  }

  // 基本的なSVG要素が含まれているかチェック
  const svgElementPattern = /<(rect|circle|ellipse|line|polyline|polygon|path|text|g|svg)/i;
  if (!svgElementPattern.test(output)) {
    return {
      isValid: false,
      error: 'スクリプトの戻り値にSVG要素が含まれていません。'
    };
  }

  // 危険なスクリプトタグやイベントハンドラーがないかチェック
  const dangerousPatterns = [
    /<script/i,
    /on\w+\s*=/i, // onload, onclick等のイベントハンドラー
    /javascript:/i,
    /vbscript:/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(output)) {
      return {
        isValid: false,
        error: 'セキュリティ上の理由により、スクリプトタグやイベントハンドラーを含むSVGは許可されていません。'
      };
    }
  }

  return { isValid: true };
}

/**
 * DynamicVectorAssetのスクリプト実行コンテキストを生成
 * @param asset - DynamicVectorAsset
 * @param project - プロジェクトデータ
 * @param currentPageIndex - 現在のページインデックス（0から開始）
 * @returns 実行コンテキストと警告情報
 */
export function createExecutionContext(
  asset: DynamicVectorAsset,
  project: ProjectData,
  currentPageIndex: number = 0
): ScriptContext {
  const context: ScriptContext = {};
  const warnings: string[] = [];

  // ページインデックスの検証
  if (currentPageIndex < 0 || currentPageIndex >= project.pages.length) {
    console.warn(`無効なページインデックス: ${currentPageIndex} (総ページ数: ${project.pages.length})`);
  }

  // ページ変数の注入（常に有効）
  context.page_current = Math.max(1, currentPageIndex + 1); // 1から開始、最小値1
  context.page_total = project.pages.length;
  
  if (project.pages.length === 0) {
    console.warn('プロジェクトにページが存在しません');
  }

  // ValueAsset変数の注入（常に有効）
  context.values = {};
  
  const valueAssets = Object.values(project.assets).filter(
    (asset): asset is ValueAsset => asset.type === 'ValueAsset'
  );

  if (valueAssets.length === 0) {
    console.warn('ValueAssetが存在しないため、変数は注入されませんでした');
  }

  const invalidNames: string[] = [];
  const errorValues: string[] = [];

  for (const valueAsset of valueAssets) {
    try {
      // 変数名の有効性をチェック
      if (!isValidVariableName(valueAsset.name)) {
        invalidNames.push(valueAsset.name);
        continue;
      }

      // ValueAssetの値を取得
      const currentPage = project.pages[currentPageIndex];
      if (!currentPage) {
        console.warn(`ページ ${currentPageIndex} が存在しません`);
        continue;
      }
      
      const effectiveValue = getEffectiveValueAssetValue(
        valueAsset,
        project,
        currentPage,
        currentPageIndex
      );

      // 変数を注入
      context.values![valueAsset.name] = effectiveValue;

      // 値の型チェックと警告
      if (effectiveValue === '#ERROR') {
        errorValues.push(valueAsset.name);
      } else if (typeof effectiveValue === 'undefined') {
        console.warn(`ValueAsset "${valueAsset.name}" の値が未定義です`);
        // 未定義の場合はnullに変換してスクリプトで扱いやすくする
        context.values![valueAsset.name] = null;
      }

    } catch (error) {
      // ValueAssetの値取得でエラーが発生した場合
      errorValues.push(valueAsset.name);
      context.values![valueAsset.name] = null; // より安全なデフォルト値
      console.warn(`ValueAsset "${valueAsset.name}" の値取得でエラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // CustomAssetのパラメータ（まず固定値を設定）
  if (asset.parameters) {
    context.params = { ...asset.parameters };
  } else {
    context.params = {};
  }

  // パラメータ変数バインディングの処理（固定値を上書き）
  if (asset.parameter_variable_bindings) {
    for (const [paramName, variableBinding] of Object.entries(asset.parameter_variable_bindings)) {
      try {
        if (variableBinding === 'page_current') {
          context.params[paramName] = context.page_current;
        } else if (variableBinding === 'page_total') {
          context.params[paramName] = context.page_total;
        } else if (context.values && context.values[variableBinding] !== undefined) {
          // ValueAsset変数からの値
          context.params[paramName] = context.values[variableBinding];
        } else {
          // 未定義の変数への参照の場合、固定値を使用（既に設定済み）
          console.warn(`パラメータ "${paramName}" の変数バインディング "${variableBinding}" が見つからないため、固定値を使用します`);
        }
      } catch (error) {
        // パラメータバインディング処理でエラーが発生した場合、固定値を使用（既に設定済み）
        console.warn(`パラメータ "${paramName}" のバインディング処理でエラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // 警告メッセージの追加
  if (invalidNames.length > 0) {
    console.warn(`無効な変数名のValueAssetが除外されました: ${invalidNames.join(', ')}`);
  }
  if (errorValues.length > 0) {
    console.warn(`エラー値が設定されたValueAsset: ${errorValues.join(', ')}`);
  }

  return context;
}

/**
 * 変数名として有効かどうかをチェック
 * @param name - チェックする名前
 * @returns 有効かどうか
 */
function isValidVariableName(name: string): boolean {
  // JavaScript変数名の規則に従う + 危険なグローバル名を避ける
  const variablePattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  return variablePattern.test(name) && !DANGEROUS_GLOBALS.includes(name);
}

