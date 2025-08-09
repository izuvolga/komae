import type { ProjectData, ImageAsset, TextAsset, AssetInstance, ImageAssetInstance } from '../types/entities';
import { getEffectiveZIndex } from '../types/entities';

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

  // z_indexに基づいてインスタンスをソート
  const sortedInstances = instances
    .map(instance => {
      const asset = project.assets[instance.asset_id];
      return { instance, asset, zIndex: asset ? getEffectiveZIndex(asset, instance) : 0 };
    })
    .filter(item => item.asset) // Assetが存在するもののみ
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const { instance, asset } of sortedInstances) {
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
 * XMLエスケープを行う
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * テキスト要素を生成する（直接描画用）
 * svg-structure.md仕様に完全準拠
 */
function generateTextElement(asset: TextAsset, instance: AssetInstance): string {
  // TextAssetInstanceからオーバーライド値を取得
  const textInstance = instance as any; // TextAssetInstance型
  
  // 現在の値を取得（instanceのoverride値を優先）
  const finalPosX = textInstance.override_pos_x ?? asset.default_pos_x;
  const finalPosY = textInstance.override_pos_y ?? asset.default_pos_y;
  const finalFontSize = textInstance.override_font_size ?? asset.font_size;
  const finalOpacity = textInstance.override_opacity ?? asset.opacity ?? 1.0;
  const textContent = textInstance.override_text ?? asset.default_text;
  const font = asset.font || 'Arial';
  const strokeWidth = asset.stroke_width || 0;
  const strokeColor = asset.stroke_color || '#000000';
  const fillColor = asset.fill_color || '#FFFFFF';
  const leading = asset.leading || 0;
  const vertical = asset.vertical || false;

  // XMLエスケープを適用
  const escapedText = escapeXml(textContent);

  // Transform設定（位置調整）
  const transforms: string[] = [];
  const translateX = finalPosX - asset.default_pos_x;
  const translateY = finalPosY - asset.default_pos_y;
  if (translateX !== 0 || translateY !== 0) {
    transforms.push(`translate(${translateX},${translateY})`);
  }
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';

  if (vertical) {
    // 縦書きテキスト：tspan要素で文字分割（複数行対応）
    const lines = escapedText.split('\n');
    const textBody: string[] = [];
    
    lines.forEach((line, lineIndex) => {
      // 各行のx座標を計算（右から左に配置）
      const lineXPos = asset.default_pos_x - (lineIndex * finalFontSize);
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        // 各行の最初の文字では初期Y位置に戻る、それ以外は相対移動
        if (i === 0) {
          // 行の最初の文字：初期Y位置を設定
          textBody.push(`    <tspan x="${lineXPos}" y="${asset.default_pos_y}">${char}</tspan>`);
        } else {
          // 行内の後続文字：下方向に移動
          textBody.push(`    <tspan x="${lineXPos}" dy="${leading}">${char}</tspan>`);
        }
      }
    });

    return `<g opacity="${finalOpacity}">
  <text
    x="${asset.default_pos_x}"
    y="${asset.default_pos_y}"
    font-family="${font}"
    font-size="${finalFontSize}"
    stroke="${strokeColor}"
    fill="${strokeColor}"
    stroke-width="${strokeWidth}"
    opacity="${finalOpacity}"
    writing-mode="vertical-rl"${transformAttr}
  >
${textBody.join('\n')}
  </text>
  <text
    x="${asset.default_pos_x}"
    y="${asset.default_pos_y}"
    font-family="${font}"
    font-size="${finalFontSize}"
    stroke="none"
    fill="${fillColor}"
    opacity="${finalOpacity}"
    writing-mode="vertical-rl"${transformAttr}
  >
${textBody.join('\n')}
  </text>
</g>`;
  } else {
    // 横書きテキスト：行ごとにtspan要素
    const lines = escapedText.split('\n');
    const textBody: string[] = [];
    
    lines.forEach((line, index) => {
      const dyValue = index === 0 ? 0 : finalFontSize + leading;
      textBody.push(`    <tspan x="${asset.default_pos_x}" dy="${dyValue}">${line}</tspan>`);
    });

    return `<g opacity="${finalOpacity}">
  <text
    x="${asset.default_pos_x}"
    y="${asset.default_pos_y}"
    font-family="${font}"
    font-size="${finalFontSize}"
    stroke="${strokeColor}"
    fill="${strokeColor}"
    stroke-width="${strokeWidth}"
    opacity="${finalOpacity}"${transformAttr}
  >
${textBody.join('\n')}
  </text>
  <text
    x="${asset.default_pos_x}"
    y="${asset.default_pos_y}"
    font-family="${font}"
    font-size="${finalFontSize}"
    stroke="none"
    fill="${fillColor}"
    opacity="${finalOpacity}"${transformAttr}
  >
${textBody.join('\n')}
  </text>
</g>`;
  }
}

/**
 * TextAsset/TextAssetInstanceのプレビュー用SVGを生成する
 */
export function generateTextPreviewSVG(
  asset: TextAsset,
  instance?: any, // TextAssetInstance型（anyで代用）
  options: {
    width?: number;
    height?: number;
    backgroundColor?: string;
  } = {}
): string {
  const { width = 800, height = 600, backgroundColor = 'transparent' } = options;
  
  // 一時的なインスタンスオブジェクトを作成（instanceがない場合）
  const tempInstance = instance || {
    id: 'temp-preview',
    asset_id: asset.id,
  };
  
  // TextSVG要素を生成
  const textElement = generateTextElement(asset, tempInstance);

  return `<svg
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  xmlns="http://www.w3.org/2000/svg"
  style="background: ${backgroundColor === 'transparent' ? 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+CjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+Cjwvc3ZnPgo=)' : backgroundColor};"
>
  ${textElement}
</svg>`;
}
