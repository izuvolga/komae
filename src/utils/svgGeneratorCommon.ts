import type { ProjectData, ImageAsset, TextAsset, AssetInstance, ImageAssetInstance } from '../types/entities';

/**
 * 共通のSVG構造生成ロジック
 * レンダラーとメインプロセスの両方で使用可能
 */
export interface SvgStructureResult {
  assetDefinitions: string[];
  useElements: string[];
}

/**
 * 完全なSVG文字列を生成する（PagePreview用）
 */
export function generateCompleteSvg(
  project: ProjectData, 
  instances: AssetInstance[], 
  getProtocolUrl: (filePath: string) => string
): string {
  const { assetDefinitions, useElements } = generateSvgStructureCommon(project, instances, getProtocolUrl);
  
  // SVGを組み立て（svg-structure.md仕様に準拠）
  const svgContent = [
    `<svg`,
    `  id="komae-preview"`,
    `  width="100%"`,
    `  height="100%"`,
    `  viewBox="0 0 ${project.canvas.width} ${project.canvas.height}"`,
    `  xmlns="http://www.w3.org/2000/svg"`,
    `  xmlns:xlink="http://www.w3.org/1999/xlink"`,
    `  visibility="visible"`,
    `>`,
    `  <defs>`,
    `    <!-- 存在するImageAssetにあるマスク情報をすべて宣言する -->`,
    `    <!-- 将来的にマスク機能実装時に追加 -->`,
    `  </defs>`,
    ``,
    `  <!-- 存在するImageAssetをすべて宣言する -->`,
    `  <g id="assets">`,
    `    <g visibility="hidden">`,
    ...assetDefinitions.map(def => `      ${def}`),
    `    </g>`,
    `  </g>`,
    ``,
    `  <!-- JavaScriptで各pageの内容をid="draw"の中に描画する -->`,
    `  <g id="draw">`,
    ...useElements.map(use => `    ${use}`),
    `  </g>`,
    `</svg>`,
  ].join('\n');
  
  return svgContent;
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
    if (!asset) {
      continue;
    }

    if (asset.type === 'ImageAsset') {
      const imageAsset = asset as ImageAsset;
      
      // アセット定義を追加（初回のみ）
      if (!processedAssets.has(asset.id)) {
        const protocolUrl = getProtocolUrl(imageAsset.original_file_path);
        const assetDef = generateImageAssetDefinition(imageAsset, protocolUrl);
        assetDefinitions.push(assetDef);
        processedAssets.add(asset.id);
      }

      // 使用要素を追加（インスタンスごと）
      const useElement = generateUseElement(imageAsset, instance);
      useElements.push(useElement);
      
    } else if (asset.type === 'TextAsset') {
      const textAsset = asset as TextAsset;
      
      // テキストアセットは直接インライン要素として追加
      const textElement = generateTextElement(textAsset, instance);
      useElements.push(textElement);
    }
  }

  return { assetDefinitions, useElements };
}

/**
 * 画像アセット定義を生成する（<defs>内で使用）
 */
function generateImageAssetDefinition(asset: ImageAsset, protocolUrl: string): string {
  const x = asset.default_pos_x;
  const y = asset.default_pos_y;
  const width = asset.default_width;
  const height = asset.default_height;
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
  const transforms: string[] = [];
  
  // 位置調整（ImageAssetInstanceのみ対応）
  if ('override_pos_x' in instance || 'override_pos_y' in instance) {
    const imageInstance = instance as ImageAssetInstance;
    const posX = imageInstance.override_pos_x ?? asset.default_pos_x;
    const posY = imageInstance.override_pos_y ?? asset.default_pos_y;
    
    // アセットのデフォルト位置からの差分を計算してtranslateに追加
    const translateX = posX - asset.default_pos_x;
    const translateY = posY - asset.default_pos_y;
    if (translateX !== 0 || translateY !== 0) {
      transforms.push(`translate(${translateX},${translateY})`);
    }
  }
  
  // サイズ调整（ImageAssetInstanceのみ対応）
  if ('override_width' in instance || 'override_height' in instance) {
    const imageInstance = instance as ImageAssetInstance;
    const width = imageInstance.override_width ?? asset.default_width;
    const height = imageInstance.override_height ?? asset.default_height;
    
    // デフォルトサイズからの倍率を計算してscaleに追加
    const scaleX = width / asset.default_width;
    const scaleY = height / asset.default_height;
    if (scaleX !== 1 || scaleY !== 1) {
      transforms.push(`scale(${scaleX},${scaleY})`);
    }
  }
  
  // opacity調整（ImageAssetInstanceの override_opacity を優先、なければAssetのdefault_opacity）
  let finalOpacity = asset.default_opacity;
  if ('override_opacity' in instance) {
    const imageInstance = instance as ImageAssetInstance;
    if (imageInstance.override_opacity !== undefined) {
      finalOpacity = imageInstance.override_opacity;
    }
  }
  
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  const opacityAttr = finalOpacity !== undefined ? ` opacity="${finalOpacity}"` : '';
  
  return `<use href="#${asset.id}"${transformAttr}${opacityAttr} />`;
}

/**
 * テキスト要素を生成する（直接描画用）
 */
function generateTextElement(asset: TextAsset, instance: AssetInstance): string {
  // Transform文字列を構築
  const transforms: string[] = [];
  
  // 位置調整（TextAssetInstanceのみ対応）
  let finalPosX = asset.default_pos_x;
  let finalPosY = asset.default_pos_y;
  if ('override_pos_x' in instance || 'override_pos_y' in instance) {
    const textInstance = instance as any; // TextAssetInstance
    if (textInstance.override_pos_x !== undefined) finalPosX = textInstance.override_pos_x;
    if (textInstance.override_pos_y !== undefined) finalPosY = textInstance.override_pos_y;
    
    // デフォルト位置からの差分を計算してtranslateに追加
    const translateX = finalPosX - asset.default_pos_x;
    const translateY = finalPosY - asset.default_pos_y;
    if (translateX !== 0 || translateY !== 0) {
      transforms.push(`translate(${translateX},${translateY})`);
    }
  }
  
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  
  // font_size調整（TextAssetInstanceの override_font_size を優先）
  let finalFontSize = asset.font_size;
  if ('override_font_size' in instance) {
    const textInstance = instance as any; // TextAssetInstance
    if (textInstance.override_font_size !== undefined) {
      finalFontSize = textInstance.override_font_size;
    }
  }
  
  // opacity調整（TextAssetInstanceの override_opacity を優先、なければTextAssetのopacity）
  let finalOpacity = asset.opacity;
  if ('override_opacity' in instance) {
    const textInstance = instance as any; // TextAssetInstance
    if (textInstance.override_opacity !== undefined) {
      finalOpacity = textInstance.override_opacity;
    }
  }
  const opacityAttr = finalOpacity !== 1 ? ` opacity="${finalOpacity}"` : '';
  
  // テキストスタイルを構築
  const textStyle = `font-family: ${asset.font}; font-size: ${finalFontSize}px; fill: ${asset.fill_color}; stroke: ${asset.stroke_color}; stroke-width: ${asset.stroke_width}px;`;
  
  // テキストコンテンツを取得（override_textがあればそれを使用）
  let textContent = asset.default_text;
  if ('override_text' in instance) {
    const textInstance = instance as any; // TextAssetInstance
    if (textInstance.override_text !== undefined) {
      textContent = textInstance.override_text;  
    }
  }
  
  if (asset.vertical) {
    // 縦書きテキストの処理
    return `<text x="${asset.default_pos_x}" y="${asset.default_pos_y}" style="${textStyle}" writing-mode="tb"${transformAttr}${opacityAttr}>${textContent}</text>`;
  } else {
    // 横書きテキストの処理
    return `<text x="${asset.default_pos_x}" y="${asset.default_pos_y}" style="${textStyle}"${transformAttr}${opacityAttr}>${textContent}</text>`;
  }
}
