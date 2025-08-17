import type { ProjectData, ImageAsset, TextAsset, VectorAsset, AssetInstance, ImageAssetInstance, TextAssetInstance, VectorAssetInstance, FontInfo } from '../types/entities';
import { getEffectiveZIndex, getEffectiveTextValue, getEffectiveFontSize, getEffectivePosX, getEffectivePosY, getEffectiveOpacity, getEffectiveFont, getEffectiveVertical, getEffectiveLeading } from '../types/entities';

/**
 * フォント情報のキャッシュ
 * レンダラープロセスでのフォント情報取得用
 */
let fontInfoCache: FontInfo[] | null = null;

/**
 * フォント情報キャッシュを設定
 */
export function setFontInfoCache(fonts: FontInfo[]): void {
  fontInfoCache = fonts;
}

/**
 * フォント情報キャッシュを取得
 */
export function getFontInfoCache(): FontInfo[] | null {
  return fontInfoCache;
}

/**
 * フォントIDから適切なSVG用フォント名を取得
 */
function resolveSvgFontName(fontId: string): string {
  // フォント情報がキャッシュされている場合は参照
  if (fontInfoCache) {
    const font = fontInfoCache.find(f => f.id === fontId);
    if (font) {
      if (font.isGoogleFont) {
        // Google Fontsの場合はフォント名を使用
        console.log(`[SVG] Resolved Google Font: ${fontId} -> "${font.name}"`);
        return font.name;
      } else if (font.id === 'system-ui') {
        // システムフォントの場合
        return 'system-ui, -apple-system, sans-serif';
      } else {
        // ビルトイン・カスタムフォントの場合はIDを使用
        console.log(`[SVG] Resolved builtin/custom font: ${fontId} -> "${font.id}"`);
        return font.id;
      }
    }
  }
  
  // フォールバック：システムUIまたはフォントIDをそのまま使用
  console.log(`[SVG] Font fallback: ${fontId} (no cache)`);
  return fontId === 'system-ui' ? 'system-ui, -apple-system, sans-serif' : fontId;
}

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
  getProtocolUrl: (filePath: string) => string,
  currentLanguage?: string
): string {
  const availableLanguages = project.metadata?.supportedLanguages || ['ja'];
  const { assetDefinitions, useElements } = generateSvgStructureCommon(project, instances, getProtocolUrl, availableLanguages, currentLanguage || 'ja');
  
  // マスク定義を生成
  const clipPathDefinitions = generateAllClipPathDefinitions(project, instances);
  
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
    `    <!-- プロジェクト全体で使用されるImageAssetのマスク情報を宣言 -->`,
    ...clipPathDefinitions.map(def => `    ${def}`),
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
  getProtocolUrl: (filePath: string) => string,
  availableLanguages: string[],
  currentLanguage: string
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
      
      // テキストアセットは多言語対応インライン要素として追加
      const textElement = generateMultilingualTextElement(textAsset, instance, availableLanguages, currentLanguage);
      useElements.push(textElement);
      
    } else if (asset.type === 'VectorAsset') {
      const vectorAsset = asset as VectorAsset;
      
      // VectorAssetは毎回インライン要素として追加（インスタンスごとに異なる変形が必要）
      const vectorElement = generateVectorElement(vectorAsset, instance as VectorAssetInstance);
      useElements.push(vectorElement);
    }
  }

  return { assetDefinitions, useElements };
}

/**
 * VectorAsset要素を生成する
 */
function generateVectorElement(asset: VectorAsset, instance: VectorAssetInstance): string {
  // インスタンスのオーバーライド値を取得
  const posX = instance.override_pos_x ?? asset.default_pos_x;
  const posY = instance.override_pos_y ?? asset.default_pos_y;
  const width = instance.override_width ?? asset.default_width;
  const height = instance.override_height ?? asset.default_height;
  const opacity = instance.override_opacity ?? asset.default_opacity;
  
  // 修正されたwrapSVGWithParentContainer関数のロジックを適用
  const originalWidth = asset.original_width;
  const originalHeight = asset.original_height;
  const scaleX = width / originalWidth;
  const scaleY = height / originalHeight;
  
  // SVG 内部での X, Y 座標は scale 処理を考慮して調整
  const adjustedX = posX * (1 / scaleX);
  const adjustedY = posY * (1 / scaleY);
  
  const wrappedSVG = `<svg version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    x="${adjustedX}px"
    y="${adjustedY}px"
    width="${originalWidth}px"
    height="${originalHeight}px"
    transform="scale(${scaleX}, ${scaleY})"
    style="opacity: ${opacity};">
      ${asset.svg_content}
  </svg>`;
  
  // グループ要素でラップ（ID付き）
  return [
    `<g id="vector-instance-${instance.id}">`,
    `  ${wrappedSVG}`,
    `</g>`
  ].join('\n    ');
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
  
  // サイズ調整（ImageAssetInstanceのみ対応）
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
  
  // マスク適用（ImageAssetでマスクが存在する場合）
  let clipPathAttr = '';
  const imageInstance = instance as ImageAssetInstance;
  const maskId = getMaskId(asset, imageInstance);
  if (maskId) {
    clipPathAttr = ` clip-path="url(#${maskId})"`;
  }
  
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  const opacityAttr = finalOpacity !== undefined ? ` opacity="${finalOpacity}"` : '';
  
  return `<use href="#${asset.id}"${transformAttr}${opacityAttr}${clipPathAttr} />`;
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
 * マスクの座標をSVGのclipPath要素として生成
 */
function generateClipPathDefinition(maskId: string, mask: [[number, number], [number, number], [number, number], [number, number]]): string {
  const [p1, p2, p3, p4] = mask;
  const pathData = `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} L ${p4[0]} ${p4[1]} Z`;
  
  return [
    `<clipPath id="${maskId}">`,
    `  <path d="${pathData}" />`,
    `</clipPath>`
  ].join('\n    ');
}

/**
 * プロジェクト内のすべてのマスクからclipPath定義を生成
 */
export function generateAllClipPathDefinitions(project: ProjectData, instances: AssetInstance[]): string[] {
  const clipPaths: string[] = [];
  const processedMasks = new Set<string>();

  for (const instance of instances) {
    const asset = project.assets[instance.asset_id];
    if (!asset || asset.type !== 'ImageAsset') continue;

    const imageAsset = asset as ImageAsset;
    const imageInstance = instance as ImageAssetInstance;
    
    // インスタンスレベルのマスクを優先、なければアセットレベルのマスクを使用
    const mask = imageInstance.override_mask ?? imageAsset.default_mask;
    if (!mask) continue;

    // マスクIDを生成（アセットID + マスクのハッシュで重複回避）
    const maskHash = mask.flat().join('-');
    const maskId = `mask-${asset.id}-${maskHash.replace(/[.-]/g, '_')}`;
    
    if (!processedMasks.has(maskId)) {
      clipPaths.push(generateClipPathDefinition(maskId, mask));
      processedMasks.add(maskId);
    }
  }

  return clipPaths;
}

/**
 * インスタンスに適用されるマスクIDを取得
 */
function getMaskId(asset: ImageAsset, instance: ImageAssetInstance): string | null {
  const mask = instance.override_mask ?? asset.default_mask;
  if (!mask) return null;

  const maskHash = mask.flat().join('-');
  return `mask-${asset.id}-${maskHash.replace(/[.-]/g, '_')}`;
}

/**
 * 多言語対応テキスト要素を生成する（直接描画用）
 * 全ての利用可能言語についてlang-{languageCode}クラス付きでテキスト要素を生成
 * svg-structure.md仕様に完全準拠
 */
export function generateMultilingualTextElement(asset: TextAsset, instance: AssetInstance, availableLanguages: string[], currentLanguage: string): string {
  const textInstance = instance as TextAssetInstance;
  const results: string[] = [];
  
  // 各言語について個別にテキスト要素を生成
  for (const lang of availableLanguages) {
    const isCurrentLanguage = lang === currentLanguage;
    const displayStyle = isCurrentLanguage ? '' : ' style="display: none;"';
    
    // 多言語対応ヘルパー関数を使用して各言語の値を取得
    const finalPosX = getEffectivePosX(asset, textInstance, lang);
    const finalPosY = getEffectivePosY(asset, textInstance, lang);
    const finalFontSize = getEffectiveFontSize(asset, textInstance, lang);
    const finalOpacity = getEffectiveOpacity(asset, textInstance, lang);
    const textContent = getEffectiveTextValue(asset, textInstance, lang);
    
    // テキスト内容が空の場合はスキップ
    if (!textContent || textContent.trim() === '') {
      continue;
    }
    
    const textElement = generateSingleLanguageTextElement(asset, textInstance, lang, finalPosX, finalPosY, finalFontSize, finalOpacity, textContent);
    
    // lang-{languageCode}クラスを追加
    const languageElement = `<g class="lang-${lang}" opacity="${finalOpacity}"${displayStyle}>${textElement}</g>`;
    results.push(languageElement);
  }
  
  return results.join('\n');
}

/**
 * 単一言語のテキスト要素を生成する（内部ヘルパー関数）
 */
function generateSingleLanguageTextElement(asset: TextAsset, textInstance: TextAssetInstance, language: string, finalPosX: number, finalPosY: number, finalFontSize: number, finalOpacity: number, textContent: string): string {
  const effectiveFont = getEffectiveFont(asset, textInstance, language);
  const font = resolveSvgFontName(effectiveFont || 'Arial');
  const strokeWidth = asset.stroke_width || 0;
  const strokeColor = asset.stroke_color || '#000000';
  const fillColor = asset.fill_color || '#FFFFFF';
  const effectiveLeading = getEffectiveLeading(asset, textInstance, language);
  const leading = effectiveLeading || 0;
  const vertical = getEffectiveVertical(asset, textInstance, language);

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

    return `<text
    x="${asset.default_pos_x}"
    y="${asset.default_pos_y}"
    font-family="${font}"
    font-size="${finalFontSize}"
    stroke="${strokeColor}"
    fill="${strokeColor}"
    stroke-width="${strokeWidth}"
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
    writing-mode="vertical-rl"${transformAttr}
  >
${textBody.join('\n')}
  </text>`;
  } else {
    // 横書きテキスト：行ごとにtspan要素
    const lines = escapedText.split('\n');
    const textBody: string[] = [];
    
    lines.forEach((line, index) => {
      const dyValue = index === 0 ? 0 : finalFontSize + leading;
      textBody.push(`    <tspan x="${asset.default_pos_x}" dy="${dyValue}">${line}</tspan>`);
    });

    return `<text
    x="${asset.default_pos_x}"
    y="${asset.default_pos_y}"
    font-family="${font}"
    font-size="${finalFontSize}"
    stroke="${strokeColor}"
    fill="${strokeColor}"
    stroke-width="${strokeWidth}"${transformAttr}
  >
${textBody.join('\n')}
  </text>
  <text
    x="${asset.default_pos_x}"
    y="${asset.default_pos_y}"
    font-family="${font}"
    font-size="${finalFontSize}"
    stroke="none"
    fill="${fillColor}"${transformAttr}
  >
${textBody.join('\n')}
  </text>`;
  }
}

/**
 * TextAsset/TextAssetInstanceのプレビュー用SVGを生成する
 */
export function generateTextPreviewSVG(
  asset: TextAsset,
  instance?: any, // TextAssetInstance型（anyで代用）
  currentLanguage: string = 'ja',
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
  
  // TextSVG要素を生成（プレビュー用は単一言語）
  const availableLanguages = [currentLanguage];
  const textElement = generateMultilingualTextElement(asset, tempInstance, availableLanguages, currentLanguage);

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
