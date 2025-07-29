import type { ProjectData, ImageAsset, AssetInstance, ImageAssetInstance } from '../types/entities';

/**
 * 共通のSVG構造生成ロジック
 * レンダラーとメインプロセスの両方で使用可能
 */
export interface SvgStructureResult {
  assetDefinitions: string[];
  useElements: string[];
}

/**
 * ドキュメント仕様に従ったSVG構造を生成する
 * svg-structure.mdの仕様に準拠して、アセット定義と使用要素を分離
 */
export function generateSvgStructureCommon(
  project: ProjectData, 
  instances: AssetInstance[], 
  getProtocolUrl: (filePath: string) => string
): SvgStructureResult {
  const assetDefinitions: string[] = [];
  const useElements: string[] = [];
  const processedAssets = new Set<string>();

  for (const instance of instances) {
    const asset = project.assets[instance.asset_id];
    if (!asset || asset.type !== 'ImageAsset') {
      continue;
    }

    const imageAsset = asset as ImageAsset;
    
    // アセット定義を追加（初回のみ）
    if (!processedAssets.has(asset.id)) {
      const protocolUrl = getProtocolUrl(imageAsset.original_file_path);
      const assetDef = generateAssetDefinition(imageAsset, protocolUrl);
      assetDefinitions.push(assetDef);
      processedAssets.add(asset.id);
    }

    // 使用要素を追加（インスタンスごと）
    const useElement = generateUseElement(imageAsset, instance);
    useElements.push(useElement);
  }

  return { assetDefinitions, useElements };
}

/**
 * アセット定義を生成する（<defs>内で使用）
 */
function generateAssetDefinition(asset: ImageAsset, protocolUrl: string): string {
  const x = asset.default_pos_x;
  const y = asset.default_pos_y;
  const width = asset.original_width;
  const height = asset.original_height;
  const opacity = asset.default_opacity ?? 1.0;
  
  return [
    `<g id="${asset.id}" opacity="${opacity}">`,
    `  <image id="image-${asset.id}" xlink:href="${protocolUrl}" width="${width}" height="${height}" x="${x}" y="${y}" />`,
    `</g>`
  ].join('\n      ');
}

/**
 * use要素を生成する（描画時に使用）
 */
function generateUseElement(asset: ImageAsset, instance: AssetInstance): string {
  // Transform文字列を構築
  const transforms = [];
  
  // 位置調整（ImageAssetInstanceのみ対応）
  if (instance.asset_id && 'override_pos_x' in instance) {
    const imageInstance = instance as ImageAssetInstance;
    const posX = imageInstance.override_pos_x ?? asset.default_pos_x;
    const posY = imageInstance.override_pos_y ?? asset.default_pos_y;
    if (posX !== asset.default_pos_x || posY !== asset.default_pos_y) {
      const translateX = posX - asset.default_pos_x;
      const translateY = posY - asset.default_pos_y;
      transforms.push(`translate(${translateX},${translateY})`);
    }
  }
  
  // スケール調整
  if (instance.transform) {
    const { scale_x, scale_y, rotation } = instance.transform;
    if (scale_x !== 1.0 || scale_y !== 1.0) {
      transforms.push(`scale(${scale_x ?? 1.0},${scale_y ?? 1.0})`);
    }
    if (rotation !== 0) {
      transforms.push(`rotate(${rotation ?? 0})`);
    }
  }
  
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  const opacityAttr = instance.opacity !== undefined ? ` opacity="${instance.opacity}"` : '';
  
  return `<use href="#${asset.id}"${transformAttr}${opacityAttr} />`;
}