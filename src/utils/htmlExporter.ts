import type { ProjectData } from '../types/entities';

/**
 * HTML出力エンジンクラス
 * プロジェクト全体を単一のHTMLファイルとして出力
 */
export class HtmlExporter {
  /**
   * 基本的なHTML構造を生成する
   */
  generateHtmlStructure(project: ProjectData): string {
    // TDD RED状態: まだ実装されていない
    throw new Error('Not implemented yet');
  }

  /**
   * SVGアセット定義（<defs>内）を生成する
   */
  generateSvgAssetDefinitions(project: ProjectData): string {
    // TDD RED状態: まだ実装されていない
    throw new Error('Not implemented yet');
  }

  /**
   * ページナビゲーション用JavaScriptを生成する
   */
  generateNavigationScript(project: ProjectData): string {
    // TDD RED状態: まだ実装されていない
    throw new Error('Not implemented yet');
  }
}

/**
 * プロジェクト全体を単一HTMLファイルとして出力する
 */
export function generateHtmlExport(project: ProjectData): string {
  // TDD RED状態: まだ実装されていない
  throw new Error('Not implemented yet');
}