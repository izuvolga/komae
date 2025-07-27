import type { ProjectData, Page, ImageAsset, AssetInstance } from '../types/entities';

/**
 * SVG生成エンジンクラス
 * ImageAssetのみに対応したSVG生成機能を提供
 */
export class SvgGenerator {
  /**
   * SVGヘッダーを生成する
   */
  generateSvgHeader(width: number, height: number): string {
    // TDD RED状態: まだ実装されていない
    throw new Error('Not implemented yet');
  }

  /**
   * ImageAssetからSVG image要素を生成する
   */
  generateImageElement(asset: ImageAsset, instance: AssetInstance): string {
    // TDD RED状態: まだ実装されていない
    throw new Error('Not implemented yet');
  }
}

/**
 * ページ全体のSVGを生成する
 */
export function generateSvgForPage(project: ProjectData, page: Page): string {
  // TDD RED状態: まだ実装されていない
  throw new Error('Not implemented yet');
}