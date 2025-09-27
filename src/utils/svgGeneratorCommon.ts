import type { ProjectData, ImageAsset, TextAsset, VectorAsset, DynamicVectorAsset, AssetInstance, ImageAssetInstance, TextAssetInstance, VectorAssetInstance, DynamicVectorAssetInstance, FontInfo } from '../types/entities';
import { getEffectiveZIndex, getEffectiveTextValue, getEffectiveFontSize, getEffectivePosition, getEffectiveColors, getEffectiveFontFace, getEffectiveVertical, getEffectiveStrokeWidth, getEffectiveLeading, getEffectiveOpacity, getEffectiveZIndexForLanguage, getEffectiveScaleX, getEffectiveScaleY, getEffectiveRotate, getEffectiveCharRotate, TextAssetInstancePhase } from '../types/entities';

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
        return font.name;
      } else if (font.id === 'system-ui') {
        // システムフォントの場合
        return 'system-ui, -apple-system, sans-serif';
      } else {
        // ビルトイン・カスタムフォントの場合はIDを使用
        return font.id;
      }
    }
  }

  // フォールバック：システムUIまたはフォントIDをそのまま使用
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
export async function generateCompleteSvg(
  project: ProjectData,
  instances: AssetInstance[],
  getProtocolUrl: (filePath: string) => string,
  currentLanguage?: string,
  customAssets?: Record<string, any>, // テスト用のCustomAsset情報
  pageIndex: number = 0
): Promise<string> {
  const availableLanguages = project.metadata?.supportedLanguages || ['ja'];
  const { assetDefinitions, useElements } = await generateSvgStructureCommon(
    project,
    instances,
    getProtocolUrl,
    availableLanguages,
    currentLanguage || 'ja',
    pageIndex,
    customAssets
  );

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
    ...clipPathDefinitions.map(def => `    ${def}`),
    `  </defs>`,
    ``,
    `  <g id="assets">`,
    `    <g visibility="hidden">`,
    ...assetDefinitions.map(def => `      ${def}`),
    `    </g>`,
    `  </g>`,
    ``,
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
export async function generateSvgStructureCommon(
  project: ProjectData,
  instances: AssetInstance[],
  getProtocolUrl: (filePath: string) => string,
  availableLanguages: string[],
  currentLanguage: string,
  pageIndex: number = 0,
  customAssets?: Record<string, any>,
  customAssetManager?: any // CustomAssetManagerのインスタンス（Mainプロセス用）
): Promise<SvgStructureResult> {
  const assetDefinitions: string[] = [];
  const useElements: string[] = [];
  const processedAssets = new Set<string>();

  // z_indexに基づいてインスタンスをソート
  const sortedInstances = instances
    .map(instance => {
      const asset = project.assets[instance.asset_id];
      return { instance, asset, zIndex: asset ? getEffectiveZIndex(asset, instance, currentLanguage) : 0 };
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
        const filePath = imageAsset.original_file.path;
        const protocolUrl = getProtocolUrl(filePath);
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
      if (!processedAssets.has(asset.id)) {
        processedAssets.add(asset.id);
        const assetDef = await generateVectorAssetDefinition(project, vectorAsset);
        assetDefinitions.push(assetDef);
        processedAssets.add(asset.id);
      }
      const useElement = generateUseElement(vectorAsset, instance);
      useElements.push(useElement);

    } else if (asset.type === 'DynamicVectorAsset') {
      const dynamicVectorAsset = asset as DynamicVectorAsset;

      // 新しい非同期のgenerateDynamicVectorElement関数を呼び出し
      const dynamicVectorElement = await generateDynamicVectorElement(
        dynamicVectorAsset,
        instance as DynamicVectorAssetInstance,
        project,
        pageIndex,
        customAssets,
        customAssetManager
      );

      if (dynamicVectorElement) {
        useElements.push(dynamicVectorElement);
      }
    }
  }

  return { assetDefinitions, useElements };
}

/**
 * DynamicVectorAssetのSVG要素を生成する
 */
function wrapDynamicVectorSVG(
  asset: DynamicVectorAsset,
  instance: DynamicVectorAssetInstance,
  svgContent: string
): string {
  const x = instance.override_pos_x ?? asset.default_pos_x;
  const y = instance.override_pos_y ?? asset.default_pos_y;
  const z_index = instance.override_z_index ?? asset.default_z_index;
  const opacity = instance.override_opacity ?? asset.default_opacity;
  const width = instance.override_width ?? asset.default_width;
  const height = instance.override_height ?? asset.default_height;
  const originalWidth = asset.original_width;
  const originalHeight = asset.original_height;
  const scaleX = width / originalWidth;
  const scaleY = height / originalHeight;
  // SVG 内部での X, Y 座標は scale 処理を考慮して調整
  const adjustedX = x * (1 / scaleX);
  const adjustedY = y * (1 / scaleY);
  const content = `<svg
    xmlns="http://www.w3.org/2000/svg"
    id="dynamic-vector-${instance.id}"
    data-z-index="${z_index}"
    x="${adjustedX}px"
    y="${adjustedY}px"
    width="${originalWidth}px"
    height="${originalHeight}px"
    transform="scale(${width / originalWidth}, ${height / originalHeight})"
    style="opacity: ${opacity};">
    ${svgContent}
  </svg>`;
  return content;
}

async function generateDynamicVectorElement(
  asset: DynamicVectorAsset,
  instance: DynamicVectorAssetInstance,
  project: ProjectData,
  pageIndex: number,
  customAssets?: Record<string, any>,
  customAssetManager?: any
): Promise<string | null> {

  try {
    // パラメータを構築（DynamicVectorEditModal.tsxのexecuteScript関数と同様）
    const scriptParameters = { ...(asset.parameters || {}) };
    const currentPage = project.pages[pageIndex];
    const currentPageInstances = new Map<string, AssetInstance>();
    Object.values(currentPage.asset_instances).forEach(ins => {
      if (ins.asset_id) {
        currentPageInstances.set(ins.asset_id, ins);
      }
    });

    // parameter_variable_bindingsによるValueAsset参照の値解決
    if (asset.parameter_variable_bindings) {
      for (const [paramName, valueAssetId] of Object.entries(asset.parameter_variable_bindings)) {
        const valueAsset = project.assets[valueAssetId];

        if (valueAsset && valueAsset.type === 'ValueAsset') {
          // 現在のページでのValueAssetInstanceの値を取得
          const valueInstance = currentPageInstances.get(valueAssetId);
          let resolvedValue = valueAsset.initial_value;

          if (valueInstance && 'override_value' in valueInstance) {
            resolvedValue = valueInstance.override_value ?? valueAsset.initial_value;
          }

          // パラメータ値を上書き
          scriptParameters[paramName] = resolvedValue;
        }
      }
    }

    // ページ変数を追加
    if (asset.use_page_variables) {
      scriptParameters['page_current'] = pageIndex + 1;
      scriptParameters['page_total'] = project.pages.length;
    }

    // ValueAsset変数を追加
    if (asset.use_value_variables) {
      // 現在のページを特定
      const currentPage = project.pages[pageIndex];
      if (currentPage) {
        Object.values(project.assets).forEach(assetItem => {
          if (assetItem.type === 'ValueAsset') {
            const valueInstance = currentPage.asset_instances[assetItem.id];
            let value = assetItem.initial_value;

            if (valueInstance && 'override_value' in valueInstance) {
              value = valueInstance.override_value ?? value;
            }

            scriptParameters[assetItem.name] = value;
          }
        });
      }
    }

    let svgContent: string;

    // MainプロセスかRendererプロセスかを判定
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // Rendererプロセス: IPCを使用
      svgContent = await (window as any).electronAPI.customAsset.generateSVG(
        asset.custom_asset_id,
        scriptParameters
      );
    } else if (customAssetManager) {
      // Mainプロセス: 渡されたCustomAssetManagerインスタンスを使用
      svgContent = await customAssetManager.generateCustomAssetSVG(
        asset.custom_asset_id,
        scriptParameters
      );
    } else {
      // CustomAssetManagerが渡されていない場合
      console.error('[generateDynamicVectorElement] No CustomAssetManager instance provided for Main process');
      throw new Error('CustomAssetManager instance is required for Main process execution');
    }

    if (!svgContent || typeof svgContent !== 'string') {
      return null;
    }

    return wrapDynamicVectorSVG(asset, instance, svgContent);

  } catch (error) {
    console.error(`DynamicVectorAsset "${asset.name}" rendering error:`, error);
    return null;
  }
}

/**
 * 画像アセット定義を生成する（<defs>内で使用）
 */
function generateImageAssetDefinition(asset: ImageAsset, protocolUrl: string): string {
  // const x = asset.default_pos_x;
  // const y = asset.default_pos_y;
  // const width = asset.default_width;
  // const height = asset.default_height;
  const width = asset.original_width;
  const height = asset.original_height;

  return [
    `<image id="${asset.id}"`,
    `  xlink:href="${protocolUrl}"`,
    `  width="${width}" height="${height}" x="0" y="0" preserveAspectRatio="none"/>`,
  ].join('\n      ');
}

/**
 * 画像アセット定義を生成する（<defs>内で使用）
 * 元データを忠実に再現するデータを生成
 */
async function generateVectorAssetDefinition(project: ProjectData, asset: VectorAsset): Promise<string> {
  const width = asset.original_width;
  const height = asset.original_height;
  let content: string;
  // Rendererプロセス: IPCを使用
  content = await (window as any).electronAPI.asset.readFileContent(asset);
  // TODO: どうも Main プロセスでは動作しないらしい？
  return [
    `<svg id="${asset.id}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" x="0" y="0" preserveAspectRatio="none">`,
    `  ${content}`,
    `</svg>`,
  ].join('\n      ');
}

/**
 * use要素を生成する（描画時に使用）
 * editModalUtils.tsx の wrapSVGWithParentContainer と動作をあわせること
 */
function generateUseElement(asset: ImageAsset | VectorAsset, instance: AssetInstance): string {
  // Transform文字列を構築
  const transforms: string[] = [];

  const imageInstance = instance as ImageAssetInstance | VectorAssetInstance;

  // 位置調整
  let translateX = asset.default_pos_x;
  let translateY = asset.default_pos_y;
  if ('override_pos_x' in instance || 'override_pos_y' in instance) {
    translateX = imageInstance.override_pos_x ?? asset.default_pos_x;
    translateY = imageInstance.override_pos_y ?? asset.default_pos_y;
  }
  // アセットのデフォルト位置からの差分を計算してtranslateに追加
  if (translateX !== 0 || translateY !== 0) {
    transforms.push(`translate(${translateX},${translateY})`);
  }

  // サイズ調整
  let scaleX = asset.default_width / asset.original_width;
  let scaleY = asset.default_height / asset.original_height;
  if ('override_width' in instance || 'override_height' in instance) {
    const width = imageInstance.override_width ?? asset.default_width;
    const height = imageInstance.override_height ?? asset.default_height;
    // デフォルトサイズからの倍率を計算してscaleに追加
    scaleX = width / asset.original_width;
    scaleY = height / asset.original_height;
  }
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX},${scaleY})`);
  }

  // opacity調整
  let finalOpacity = asset.default_opacity;
  if ('override_opacity' in instance) {
    if (imageInstance.override_opacity !== undefined) {
      finalOpacity = imageInstance.override_opacity;
    }
  }
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  const opacityAttr = finalOpacity !== undefined ? ` opacity="${finalOpacity}"` : '';
  let results = [];

  // マスク適用
  const maskId = getMaskId(asset, imageInstance);
  if (maskId) {
    // use要素にclip-path属性を追加。MDMによると<use>要素には指定できるはずなのだが、なぜか効かないため、<g>要素で囲む
    results.push(`<g clip-path="url(#${maskId})">`);
  }
  results.push(`<use href="#${asset.id}"${transformAttr}${opacityAttr} />`);
  if (maskId) {
    results.push(`</g>`);
  }
  return results.join('\n');
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
    if (!asset) continue;
    if (asset.type !== 'ImageAsset' && asset.type !== 'VectorAsset') continue;
    const graphicAsset = asset as ImageAsset | VectorAsset;
    const graphicInstance = instance as ImageAssetInstance | VectorAssetInstance;

    // インスタンスレベルのマスクを優先、なければアセットレベルのマスクを使用
    const mask = graphicInstance.override_mask ?? graphicAsset.default_mask;
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
function getMaskId(asset: ImageAsset | VectorAsset, instance: ImageAssetInstance): string | null {
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
export function generateMultilingualTextElement(
  asset: TextAsset,
  instance: AssetInstance,
  availableLanguages: string[],
  currentLanguage: string,
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO,
  domId?: string,
  overridePos?: { x: number; y: number }, // 位置を強制的に上書きする。プレビュー時に利用。text要素は座標を含むため。
): string {
  const textInstance = instance as TextAssetInstance;
  const results: string[] = [];

  // 各言語について個別にテキスト要素を生成
  for (const lang of availableLanguages) {
    const isCurrentLanguage = lang === currentLanguage;
    const displayStyle = isCurrentLanguage ? '' : ' style="display: none;"';

    // 新仕様多言語対応ヘルパー関数を使用して各言語の値を取得
    const finalPos = getEffectivePosition(asset, textInstance, lang, phase);
    const finalPosX = overridePos ? overridePos.x : finalPos.x;
    const finalPosY = overridePos ? overridePos.y : finalPos.y;
    const finalFontSize = getEffectiveFontSize(asset, textInstance, lang, phase);
    const finalOpacity = getEffectiveOpacity(asset, textInstance, lang, phase);
    const finalScaleX = getEffectiveScaleX(asset, textInstance, lang, phase);
    const finalScaleY = getEffectiveScaleY(asset, textInstance, lang, phase);
    const finalRotate = getEffectiveRotate(asset, textInstance, lang, phase);
    const textContent = getEffectiveTextValue(asset, textInstance, lang, phase);

    // テキスト内容が空の場合はスキップ
    if (!textContent || textContent.trim() === '') {
      continue;
    }

    const textElement = generateSingleLanguageTextElement(asset, textInstance, lang, finalPosX, finalPosY, finalFontSize, finalOpacity, textContent);

    // transform属性を構築（scale、rotate等の変換）
    const transforms = [];
    if (finalScaleX !== 1.0 || finalScaleY !== 1.0) {
      transforms.push(`scale(${finalScaleX}, ${finalScaleY})`);
    }
    if (finalRotate !== 0) {
      transforms.push(`rotate(${finalRotate})`);
    }
    const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';

    // ID属性を追加（domIdが指定されている場合）
    const idAttribute = domId ? ` id="${domId}"` : '';
    // lang-{languageCode}クラスを追加
    const languageElement = `<g class="lang-${lang}" opacity="${finalOpacity}"${displayStyle}${idAttribute}${transformAttr}>${textElement}</g>`;
    results.push(languageElement);
  }

  return results.join('\n');
}

/**
 * 単一言語のテキスト要素を生成する（内部ヘルパー関数）
 */
function generateSingleLanguageTextElement(
  asset: TextAsset,
  textInstance: TextAssetInstance,
  language: string,
  posX: number,
  posY: number,
  fontSize: number,
  opacity: number,
  textContent: string
): string {
  const effectiveFont = getEffectiveFontFace(asset, textInstance, language);
  const font = resolveSvgFontName(effectiveFont || 'system-ui');
  const strokeWidth = getEffectiveStrokeWidth(asset, textInstance, language);
  const colors = getEffectiveColors(asset, textInstance, language);
  const strokeColor = colors.stroke;
  const fillColor = colors.fill;
  const leading = getEffectiveLeading(asset, textInstance, language);
  const vertical = getEffectiveVertical(asset, textInstance, language);
  const charRotate = getEffectiveCharRotate(asset, textInstance, language);

  // XMLエスケープを適用 (TODO: 必要か？)
  const escapedText = escapeXml(textContent);

  // Transform設定（位置調整）
  const transforms: string[] = [];
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';

  /**
   * 座標系の改善:
   * posX, posYは描画エリア全体の基準点を表すように変更
   * - 横書き: 描画エリア全体の左上 (posX, posY)
   * - 縦書き: 描画エリア全体の右上 (posX, posY)
   *
   * 以下の理由により、TextAsset ではtspanは使わず、代わりにtext要素を文字ごとに生成する
   * 1. 縦書きでは writing-mode="vertical-rl" を指定することが一般的であるが、描画の結果がブラウザにより異なる点を確認している
   *   特に、glyph-orientation-vertical は deprecated であり、tspan を使っても期待通りに動作しない場合があるが、
   *   text要素では transform 属性を使って自前で回転を制御できる（英数字だけを90度回転させる等の制御も可能）
   * 2. 文字ごとに text 要素を生成することで、各文字の位置を明示的に制御でき、ブラウザ間の互換性が向上する。例えば、rotate 属性の描画
   *   に関しては、ブラウザ間で描画結果が異なるが、text属性でtransformを指定することで、より一貫した描画が可能になる
   */
  if (vertical) {
    // 縦書きテキスト：右上(posX, posY)を基準点として文字を配置
    const lines = escapedText.split('\n');
    const textBody: string[] = [];

    lines.forEach((line, lineIndex) => {
      // 各行のx座標を計算（右から左に配置、基準点は右上）
      const lineXPos = posX - (lineIndex * fontSize); // 右端から左に配置

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        // 縦書きの場合、最初の文字のY座標はposYからフォントサイズ分下
        // （SVGのtext要素はベースラインが基準のため）
        const charYPos = posY + fontSize + (i * (fontSize + leading));

        const posattributes = `x="${lineXPos}" y="${charYPos}"`;
        const fontattributes = `font-size="${fontSize}" font-family="${font}"`;
        const fillattributes = `fill="${fillColor}"`;

        // 文字の中心点を計算（縦書きの場合）
        const centerX = lineXPos - fontSize / 2;
        const centerY = charYPos - fontSize / 2;

        // char_rotateが0でない場合、文字の中心を基準とした回転transformを追加
        const charTransformAttr = charRotate !== 0
          ? ` transform="rotate(${charRotate} ${centerX} ${centerY})"`
          : '';

        // SVG のデフォルトでは、ストロークは文字の中央に描画されるため、太いストロークの場合、文字が潰れてしまうことがある。
        // これを防ぐため、ストロークを文字の内側に描画するには、paint-order プロパティを使用するのだが、
        // 作成時点で paint-order はすべてのブラウザでサポートされているわけではないため、text要素を2回重ねて描画する方法を採用する。
        // さらに、縦書きの場合、text-anchor="end"を指定して文字の右端をX座標の基準に配置する。
        textBody.push(`    <text text-anchor="end" ${posattributes} ${fontattributes} stroke="${strokeColor}" stroke-width="${strokeWidth}" ${fillattributes}${charTransformAttr}>${char}</text>`);
        textBody.push(`    <text text-anchor="end" ${posattributes} ${fontattributes} stroke="${fillColor}" ${fillattributes}${charTransformAttr}>${char}</text>`);
      }
    });
    return textBody.join('\n');
  } else {
    // 横書きテキスト：左上(posX, posY)を基準点として文字を配置
    const lines = escapedText.split('\n');
    const textBody: string[] = [];

    lines.forEach((line, lineIndex) => {
      // 各行のY座標を計算（上から下に配置、基準点は左上）
      // 最初の行のY座標はposYからフォントサイズ分下
      // （SVGのtext要素はベースラインが基準のため）
      const lineYPos = posY + fontSize + (lineIndex * (fontSize + leading));

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        // 各文字のX座標を計算（左から右に配置）
        const charXPos = posX + (i * fontSize);

        const posattributes = `x="${charXPos}" y="${lineYPos}"`;
        const fontattributes = `font-size="${fontSize}" font-family="${font}"`;
        const fillattributes = `fill="${fillColor}"`;

        // 文字の中心点を計算（横書きの場合）
        const centerX = charXPos + fontSize / 2;
        const centerY = lineYPos - fontSize / 2;

        // char_rotateが0でない場合、文字の中心を基準とした回転transformを追加
        const charTransformAttr = charRotate !== 0
          ? ` transform="rotate(${charRotate} ${centerX} ${centerY})"`
          : '';

        // SVG のデフォルトでは、ストロークは文字の中央に描画されるため、太いストロークの場合、文字が潰れてしまうことがある。
        // これを防ぐため、ストロークを文字の内側に描画するには、paint-order プロパティを使用するのだが、
        // 作成時点で paint-order はすべてのブラウザでサポートされているわけではないため、text要素を2回重ねて描画する方法を採用する。
        textBody.push(`    <text ${posattributes} ${fontattributes} stroke="${strokeColor}" stroke-width="${strokeWidth}" ${fillattributes}${charTransformAttr}>${char}</text>`);
        textBody.push(`    <text ${posattributes} ${fontattributes} stroke="${fillColor}" ${fillattributes}${charTransformAttr}>${char}</text>`);
      }
    });
    return textBody.join('\n');
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
    domId?: string; // 追加のdiv要素のID（必要に応じて）
  } = {},
  phase: TextAssetInstancePhase = TextAssetInstancePhase.AUTO,
): string {
  const { width = 800, height = 600, backgroundColor = 'transparent', domId = 'temp-preview' } = options;

  // 一時的なインスタンスオブジェクトを作成（instanceがない場合）
  const tempInstance = instance || {
    id: 'temp-preview',
    asset_id: asset.id,
  };

  // TextSVG要素を生成（プレビュー用は単一言語）
  const availableLanguages = [currentLanguage];
  const textElement = generateMultilingualTextElement(asset, tempInstance, availableLanguages, currentLanguage, phase, domId);

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
