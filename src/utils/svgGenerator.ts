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
    return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  }

  /**
   * ImageAssetからSVG image要素を生成する
   */
  generateImageElement(asset: ImageAsset, instance: AssetInstance): string {
    const x = asset.default_pos_x;
    const y = asset.default_pos_y;
    const width = asset.original_width;
    const height = asset.original_height;
    const opacity = instance.opacity ?? asset.default_opacity ?? 1.0;
    
    // Transform文字列を構築
    const transforms = [];
    if (instance.transform) {
      const { scale_x, scale_y, rotation } = instance.transform;
      if (scale_x !== 1.0 || scale_y !== 1.0) {
        transforms.push(`scale(${scale_x}, ${scale_y})`);
      }
      if (rotation !== 0) {
        transforms.push(`rotate(${rotation})`);
      }
    }
    
    const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
    
    return `<image href="${asset.original_file_path}" x="${x}" y="${y}" width="${width}" height="${height}" opacity="${opacity}"${transformAttr} />`;
  }
}

/**
 * ページ全体のSVGを生成する
 */
export function generateSvgForPage(project: ProjectData, page: Page): string {
  const generator = new SvgGenerator();
  
  // XML宣言
  const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
  
  // SVGヘッダー
  const svgHeader = generator.generateSvgHeader(project.canvas.width, project.canvas.height);
  
  // アセットインスタンスをz_index順でソート
  const instances = Object.values(page.asset_instances).sort((a, b) => a.z_index - b.z_index);
  
  // 各アセットインスタンスをSVG要素に変換
  const imageElements = instances
    .map(instance => {
      const asset = project.assets[instance.asset_id];
      if (!asset || asset.type !== 'ImageAsset') {
        return null; // 存在しないアセットやImageAsset以外はスキップ
      }
      return generator.generateImageElement(asset as ImageAsset, instance);
    })
    .filter(element => element !== null);
  
  // SVGを組み立て
  const svgContent = [
    xmlDeclaration,
    svgHeader,
    ...imageElements,
    '</svg>'
  ].join('\n');
  
  return svgContent;
}