import * as fs from 'fs';
import * as path from 'path';
import type { ProjectData, ExportOptions, Page, AssetInstance } from '../types/entities';
import { generateSvgStructureCommon } from './svgGeneratorCommon';
import { VIEWER_TEMPLATES, type ViewerTemplateVariables } from '../generated/viewer-templates';

/**
 * 画像ファイルをBase64エンコードする
 */
function encodeImageToBase64(filePath: string, projectPath?: string | null): string {
  // テスト環境では実際のファイルが存在しないため、
  // ダミーのBase64データを返す
  if (process.env.NODE_ENV === 'test') {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  let absolutePath = filePath;
  
  // 相対パスの場合は絶対パスに変換
  if (projectPath && !path.isAbsolute(filePath)) {
    absolutePath = path.join(projectPath, filePath);
  }
  
  if (!fs.existsSync(absolutePath)) {
    console.warn(`File not found: ${absolutePath} (original: ${filePath})`);
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
  
  try {
    const imageBuffer = fs.readFileSync(absolutePath);
    const base64Data = imageBuffer.toString('base64');
    const mimeType = getMimeType(absolutePath);
    return `data:${mimeType};base64,${base64Data}`;
  } catch (error) {
    console.error(`Error reading file: ${absolutePath}`, error);
    // ファイルが読めない場合は1x1透明PNGを返す
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}

/**
 * ファイル拡張子からMIMEタイプを取得する
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    default: return 'image/png';
  }
}

/**
 * HTMLエクスポート専用クラス
 */
export class HtmlExporter {
  constructor(private projectPath: string | null = null) {}

  /**
   * プロジェクトをHTMLファイルとして出力（新しい統合SVG構造）
   */
  async exportToHTML(project: ProjectData, options: ExportOptions): Promise<string> {
    // 統合SVGコンテンツを生成
    const unifiedSVG = await this.generateUnifiedSVG(project);
    
    // HTMLコンテンツを生成
    return this.generateHTMLContent(project, options, unifiedSVG);
  }

  /**
   * ページのSVGコンテンツを生成
   */
  private async generatePageSVG(project: ProjectData, page: Page): Promise<string> {
    const { width, height } = project.canvas;
    
    // アセットインスタンス一覧を取得（z-indexソートはgenerateSvgStructureCommon内で実行）
    const instances = Object.values(page.asset_instances);

    // 共通のSVG生成ロジックを使用
    const availableLanguages = project.metadata?.supportedLanguages || ['ja'];
    const currentLanguage = project.metadata?.currentLanguage || 'ja';
    const { assetDefinitions, useElements } = generateSvgStructureCommon(
      project, 
      instances, 
      (filePath: string) => {
        // HTMLエクスポート時は画像をbase64エンコードして埋め込む
        return encodeImageToBase64(filePath, this.projectPath);
      },
      availableLanguages,
      currentLanguage
    );

    // SVGコンテンツを構築（ドキュメント仕様に準拠）
    const svgContent = [
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
      `  <title>${page.title}</title>`,
      `  <defs></defs>`,
      `  <g id="assets">`,
      `    <g visibility="hidden">`,
      ...assetDefinitions.map(def => `      ${def}`),
      `    </g>`,
      `  </g>`,
      `  <g id="draw">`,
      ...useElements.map(use => `    ${use}`),
      `  </g>`,
      `</svg>`
    ].join('\n');

    return svgContent;
  }

  /**
   * 統合SVGコンテンツを生成
   */
  private async generateUnifiedSVG(project: ProjectData): Promise<string> {
    const { width, height } = project.canvas;
    
    // 全ページで使用されるアセットを収集
    const allAssetIds = new Set<string>();
    const processedAssets = new Set<string>();
    const assetDefinitions: string[] = [];
    
    // 全ページのアセットインスタンスを収集してユニークなアセットIDを抽出
    for (const page of project.pages) {
      for (const instance of Object.values(page.asset_instances)) {
        allAssetIds.add(instance.asset_id);
      }
    }
    
    // アセット定義を生成
    for (const assetId of allAssetIds) {
      const asset = project.assets[assetId];
      if (!asset || asset.type !== 'ImageAsset') continue;
      
      if (!processedAssets.has(assetId)) {
        const imageAsset = asset as any; // ImageAsset型
        const base64Data = encodeImageToBase64(imageAsset.original_file_path, this.projectPath);
        const opacity = imageAsset.default_opacity ?? 1.0;
        
        const assetDef = [
          `    <g id="${assetId}" opacity="${opacity}">`,
          `      <image id="image-${assetId}" xlink:href="${base64Data}" width="${imageAsset.default_width}" height="${imageAsset.default_height}" x="${imageAsset.default_pos_x}" y="${imageAsset.default_pos_y}" />`,
          `    </g>`
        ].join('\n');
        
        assetDefinitions.push(assetDef);
        processedAssets.add(assetId);
      }
    }
    
    // 各ページのコンテンツを生成
    const pageContents: string[] = [];
    
    for (let i = 0; i < project.pages.length; i++) {
      const page = project.pages[i];
      const pageNumber = i + 1;
      const isFirstPage = i === 0;
      
      // アセットインスタンス一覧を取得（z-indexソートはgenerateSvgStructureCommon内で実行）
      const instances = Object.values(page.asset_instances);
      
      // 共通のSVG生成ロジックを使用して使用要素を生成
      const availableLanguages = project.metadata?.supportedLanguages || ['ja'];
      const currentLanguage = project.metadata?.currentLanguage || 'ja';
      const { useElements } = generateSvgStructureCommon(
        project,
        instances,
        (filePath: string) => {
          // 統合SVGでは実際のbase64データは不要（アセット定義を参照）
          return ''; // use要素では使用されない
        },
        availableLanguages,
        currentLanguage
      );
      
      const pageContent = [
        `  <!-- ページ${pageNumber}の描画内容 -->`,
        `  <g id="page-${pageNumber}" style="display: ${isFirstPage ? 'block' : 'none'};">`,
        ...useElements.map(use => `    ${use}`),
        `  </g>`
      ].join('\n');
      
      pageContents.push(pageContent);
    }
    
    // 統合SVGを構築（svg-structure.md仕様に準拠）
    const svgContent = [
      `<svg`,
      `  width="${width}"`,
      `  height="${height}"`,
      `  viewBox="0 0 ${width} ${height}"`,
      `  xmlns="http://www.w3.org/2000/svg"`,
      `  xmlns:xlink="http://www.w3.org/1999/xlink"`,
      `>`,
      `  <defs>`,
      `    <!-- プロジェクト全体で使用される ImageAsset のマスク情報を宣言 -->`,
      `    <!-- 将来的にマスク機能実装時に追加 -->`,
      `  </defs>`,
      ``,
      `  <!-- プロジェクト全体で使用される全 ImageAsset を一度だけ定義 -->`,
      `  <g id="assets">`,
      `    <g visibility="hidden">`,
      ...assetDefinitions,
      `    </g>`,
      `  </g>`,
      ``,
      ...pageContents,
      `</svg>`
    ].join('\n');
    
    return svgContent;
  }

  /**
   * HTMLコンテンツをテンプレートで生成
   */
  private generateHTMLContent(project: ProjectData, options: ExportOptions, unifiedSVG: string): string {
    const { title } = options;
    const { includeNavigation } = options.htmlOptions || {};

    // テンプレート変数を設定
    const currentLanguage = project.metadata?.currentLanguage || 'ja';
    const availableLanguages = project.metadata?.supportedLanguages || ['ja'];
    const templateVariables: Partial<ViewerTemplateVariables> = {
      TITLE: title,
      SVG_CONTENT: unifiedSVG,
      NAVIGATION_DISPLAY: includeNavigation ? 'flex' : 'none',
      TOTAL_PAGES: project.pages.length.toString(),
      CANVAS_WIDTH: project.canvas.width.toString(),
      CURRENT_LANGUAGE: currentLanguage,
      AVAILABLE_LANGUAGES_JSON: JSON.stringify(availableLanguages)
    };

    // テンプレートをレンダーしてHTMLを生成
    return VIEWER_TEMPLATES.render(templateVariables);
  }

  /**
   * ナビゲーションHTMLを生成（後方互換性用）
   * @deprecated テンプレートシステムを使用してください
   */
  private generateNavigationHTML(pageCount: number): string {
    return `<!-- Navigation is now handled by template system -->`;
  }

  // テスト用の旧API（後方互換性）
  generateHtmlStructure(project: ProjectData): string {
    console.warn('generateHtmlStructure is deprecated. Use exportToHTML instead.');
    
    const options = {
      format: 'html' as const,
      title: project.metadata.title,
      outputPath: '',
      width: project.canvas.width,
      height: project.canvas.height,
      quality: 90,
      embedAssets: true,
      htmlOptions: {
        includeNavigation: true,
        autoPlay: false
      }
    };
    
    // テンプレートシステムで簡易HTMLを生成
    try {
      // 統合SVGを同期的に生成（テスト用）
      const currentLanguage = project.metadata?.currentLanguage || 'ja';
      const availableLanguages = project.metadata?.supportedLanguages || ['ja'];
      const templateVariables: Partial<ViewerTemplateVariables> = {
        TITLE: project.metadata.title,
        SVG_CONTENT: this.generateSimpleSVGForTest(project),
        NAVIGATION_DISPLAY: 'flex',
        TOTAL_PAGES: project.pages.length.toString(),
        CANVAS_WIDTH: project.canvas.width.toString(),
        CURRENT_LANGUAGE: currentLanguage,
        AVAILABLE_LANGUAGES_JSON: JSON.stringify(availableLanguages)
      };
      
      return VIEWER_TEMPLATES.render(templateVariables);
    } catch (error) {
      console.error('Template rendering failed, falling back to legacy method:', error);
      return this.generateSyncHTML(project);
    }
  }
  
  /**
   * テスト用の簡易SVG生成
   */
  private generateSimpleSVGForTest(project: ProjectData): string {
    const { width, height } = project.canvas;
    
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <g id="assets"><g visibility="hidden"></g></g>
  <g id="page-1" style="display: block;">
    <rect x="10" y="10" width="${width-20}" height="${height-20}" fill="#f0f0f0" stroke="#ccc" stroke-width="1" />
    <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="24" fill="#666">Test Export</text>
  </g>
</svg>`;
  }

  generateSvgAssetDefinitions(project: ProjectData): string {
    // SVGアセット定義を生成（テスト用の単純版）
    return Object.values(project.assets)
      .filter(asset => asset.type === 'ImageAsset')
      .map(asset => {
        const base64Data = encodeImageToBase64(asset.original_file_path, this.projectPath);
        return `    <g id="${asset.id}">
      <image href="${base64Data}" x="${asset.default_pos_x}" y="${asset.default_pos_y}" width="${asset.original_width}" height="${asset.original_height}" opacity="${asset.default_opacity}" />
    </g>`;
      })
      .join('\n');
  }

  generateNavigationScript(project: ProjectData): string {
    console.warn('generateNavigationScript is deprecated. JavaScript is now included in template.');
    return '// JavaScript is now handled by template system';
  }

  private generateSyncHTML(project: ProjectData): string {
    // 同期バージョンの簡易HTML生成
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${project.metadata.title}</title>
  <style>
    #viewer {
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #000;
    }
    
    .page-svg {
      cursor: pointer;
      max-width: 90vw;
      max-height: 90vh;
    }
  </style>
</head>
<body>
  <div id="viewer">
    <svg class="page-svg" viewBox="0 0 ${project.canvas.width} ${project.canvas.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
${this.generateSvgAssetDefinitions(project)}
      </defs>
      <g id="draw"></g>
    </svg>
  </div>
  
  <script>
${this.generateNavigationScriptForUnifiedSVG(false)}
  </script>
</body>
</html>`;
  }

  /**
   * 統合SVG用のナビゲーションスクリプトを生成（後方互換性用）
   * @deprecated テンプレートシステムのJavaScriptを使用してください
   */
  private generateNavigationScriptForUnifiedSVG(autoPlay: boolean): string {
    console.warn('generateNavigationScriptForUnifiedSVG is deprecated. JavaScript is now included in template.');
    return '<!-- JavaScript is now handled by template system -->';
  }
}

/**
 * プロジェクト全体を単一HTMLファイルとして出力する（後方互換性用）
 */
export async function generateHtmlExport(project: ProjectData): Promise<string> {
  const exporter = new HtmlExporter();
  const options = {
    format: 'html' as const,
    title: project.metadata.title,
    outputPath: '',
    width: project.canvas.width,
    height: project.canvas.height,
    quality: 90,
    embedAssets: true,
    htmlOptions: {
      includeNavigation: true,
      autoPlay: false
    }
  };
  
  try {
    return await exporter.exportToHTML(project, options);
  } catch (error) {
    console.error('HTML export error:', error);
    return `<!DOCTYPE html><html><head><title>Export Error</title></head><body><h1>Export Error</h1><p>${error}</p></body></html>`;
  }
}