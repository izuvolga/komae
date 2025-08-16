import { generateSvgStructureCommon, generateCompleteSvg } from '../src/utils/svgGeneratorCommon';
import { mockProject, mockTextAsset, mockTextAssetInstance } from './fixtures/sampleProject';
import type { AssetInstance } from '../src/types/entities';

describe('SVG Generator for TextAsset', () => {
  const mockProtocolUrl = (filePath: string) => `file://${filePath}`;

  describe('generateSvgStructureCommon - TextAsset', () => {
    it('TextAssetInstanceから正しいSVG要素を生成できること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl, mockProject.metadata.supportedLanguages, mockProject.metadata.currentLanguage);
      
      expect(result.useElements).toHaveLength(1);
      const textElement = result.useElements[0];
      
      // svg-structure.md仕様に準拠した基本構造をチェック
      expect(textElement).toContain('<g class="lang-ja"');
      expect(textElement).toContain('font-family="system-ui, -apple-system, sans-serif"');
      expect(textElement).toContain('font-size="80"'); // アセットのデフォルトフォントサイズ
      expect(textElement).toContain('もっと！'); // 多言語オーバーライドのテキスト
      expect(textElement).toContain('x="134.13333333333335"'); // アセットのdefault位置
      expect(textElement).toContain('y="400.37333333333333"'); // アセットのdefault位置
      expect(textElement).toContain('opacity="1"'); // デフォルトのopacity
    });

    it('TextAssetで二重text要素（縁取り＋塗り）が生成されること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl, mockProject.metadata.supportedLanguages, mockProject.metadata.currentLanguage);
      const textElement = result.useElements[0];
      
      // svg-structure.md仕様：縁取り用とフィル用の二重text要素
      const textMatches = textElement.match(/<text[^>]*>/g);
      expect(textMatches).toHaveLength(4); // 日本語と英語それぞれで縁取り+塗りの2つずつ = 4つ
      
      // 縁取り用のtext要素
      expect(textElement).toContain('stroke="#000000"');
      expect(textElement).toContain('fill="#000000"');
      expect(textElement).toContain('stroke-width="2"');
      
      // フィル用のtext要素  
      expect(textElement).toContain('stroke="none"');
      expect(textElement).toContain('fill="#ff0000"');
    });

    it('多言語対応でlang-{languageCode}クラスが適用されること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl, mockProject.metadata.supportedLanguages, mockProject.metadata.currentLanguage);
      const textElement = result.useElements[0];
      
      // 多言語対応のクラス名
      expect(textElement).toContain('class="lang-ja"');
      expect(textElement).toContain('class="lang-en"');
      
      // 日本語版が表示され、英語版が非表示
      expect(textElement).toContain('<g class="lang-ja" opacity="1">');
      expect(textElement).toContain('<g class="lang-en" opacity="1" style="display: none;">');
      
      // 各言語のテキスト内容
      expect(textElement).toContain('もっと！'); // 日本語
      expect(textElement).toContain('Get more'); // 英語
    });

    it('複数行テキストで行間（leading）が適用されること', () => {
      // 複数行テキストのTextAssetを作成
      const multilineTextAsset = {
        ...mockTextAsset,
        default_text: '第一行\n第二行\n第三行',
        vertical: false, // 横書きでテスト
        leading: 8.0,
      };
      
      const multilineProject = {
        ...mockProject,
        assets: {
          ...mockProject.assets,
          'text-1c835411-9001-4633-a120-2a8ae273b8cb': multilineTextAsset,
        },
      };

      // 複数行テキスト用のインスタンス（横書き）
      const multilineInstance = {
        ...mockTextAssetInstance,
        multilingual_overrides: {
          ja: {
            override_text: '第一行\n第二行\n第三行',
          },
        },
      };

      const instances: AssetInstance[] = [multilineInstance];
      
      const result = generateSvgStructureCommon(multilineProject, instances, mockProtocolUrl, multilineProject.metadata.supportedLanguages, multilineProject.metadata.currentLanguage);
      const textElement = result.useElements[0];
      
      // 行間の設定が反映されている
      const tspanMatches = textElement.match(/<tspan[^>]*dy="[^"]*"/g);
      expect(tspanMatches).toBeTruthy();
      
      // leadingが適用された行間計算（font_size + leading）
      expect(textElement).toContain('dy="88"'); // 80 + 8 (font_size + leading)
    });

    it('マイナス値のleadingが適用されること', () => {
      // マイナス値leadingのTextAssetを作成
      const negativeLeadingTextAsset = {
        ...mockTextAsset,
        default_text: '行間縮小\nテスト',
        vertical: false, // 横書きでテスト
        leading: -5.0, // マイナス値
      };
      
      const negativeLeadingProject = {
        ...mockProject,
        assets: {
          ...mockProject.assets,
          'text-1c835411-9001-4633-a120-2a8ae273b8cb': negativeLeadingTextAsset,
        },
      };

      // マイナスleading用のインスタンス（横書き）
      const negativeLeadingInstance = {
        ...mockTextAssetInstance,
        multilingual_overrides: {
          ja: {
            override_text: '行間縮小\nテスト',
          },
        },
      };

      const instances: AssetInstance[] = [negativeLeadingInstance];
      
      const result = generateSvgStructureCommon(negativeLeadingProject, instances, mockProtocolUrl, negativeLeadingProject.metadata.supportedLanguages, negativeLeadingProject.metadata.currentLanguage);
      const textElement = result.useElements[0];
      
      // マイナスleadingが適用された行間計算（font_size + leading）
      expect(textElement).toContain('dy="75"'); // 80 + (-5) = 75 (font_size + leading)
    });

    it('XMLエスケープが正しく適用されること', () => {
      const specialCharsInstance = {
        ...mockTextAssetInstance,
        multilingual_overrides: {
          ja: {
            override_text: '<test>&"special"&</test>',
          },
        },
      };
      
      const instances: AssetInstance[] = [specialCharsInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl, mockProject.metadata.supportedLanguages, mockProject.metadata.currentLanguage);
      const textElement = result.useElements[0];
      
      // XML特殊文字がエスケープされている
      expect(textElement).toContain('&amp;'); // & は &amp; にエスケープされる
      expect(textElement).toContain('&lt;'); // < は &lt; にエスケープされる
      expect(textElement).toContain('&gt;'); // > は &gt; にエスケープされる
      expect(textElement).toContain('&quot;'); // " は &quot; にエスケープされる
      expect(textElement).not.toContain('<test>&"special"&</test>');
    });

    it('AssetとInstanceの値の優先順位が正しく適用されること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl, mockProject.metadata.supportedLanguages, mockProject.metadata.currentLanguage);
      const textElement = result.useElements[0];
      
      // Instance値が優先されている
      expect(textElement).toContain('font-size="80"'); // アセットのdefault_font_size
      expect(textElement).toContain('x="134.13333333333335"'); // アセットのdefault位置
      expect(textElement).toContain('y="400.37333333333333"'); // アセットのdefault位置  
      expect(textElement).toContain('opacity="1"'); // デフォルトのopacity
      expect(textElement).toContain('もっと！'); // instanceの多言語オーバーライドテキスト
    });
  });

  describe('generateCompleteSvg - TextAsset統合テスト', () => {
    it('完全なSVGドキュメントにTextAssetが含まれること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateCompleteSvg(mockProject, instances, mockProtocolUrl);
      
      // 基本的なSVG構造
      expect(result).toContain('<svg');
      expect(result).toContain('viewBox="0 0 768 1024"');
      expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
      
      // TextAsset要素が含まれている
      expect(result).toContain('font-family="system-ui, -apple-system, sans-serif"');
      expect(result).toContain('もっと！'); // 多言語オーバーライドテキスト
      
      // 構造が正しい
      expect(result).toContain('<g id="draw">');
      expect(result).toContain('</svg>');
    });
  });
});