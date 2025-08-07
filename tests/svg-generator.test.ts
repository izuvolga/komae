import { generateSvgStructureCommon, generateCompleteSvg } from '../src/utils/svgGeneratorCommon';
import { mockProject, mockTextAsset, mockTextAssetInstance } from './fixtures/sampleProject';
import type { AssetInstance } from '../src/types/entities';

describe('SVG Generator for TextAsset', () => {
  const mockProtocolUrl = (filePath: string) => `file://${filePath}`;

  describe('generateSvgStructureCommon - TextAsset', () => {
    it('TextAssetInstanceから正しいSVG要素を生成できること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl);
      
      expect(result.useElements).toHaveLength(1);
      const textElement = result.useElements[0];
      
      // svg-structure.md仕様に準拠した基本構造をチェック
      expect(textElement).toContain('<g opacity=');
      expect(textElement).toContain('font-family="Arial"');
      expect(textElement).toContain('font-size="28"'); // override_font_sizeを使用
      expect(textElement).toContain('上'); // 縦書きなので文字が分割されている
      expect(textElement).toContain('書');
      expect(textElement).toContain('x="200"'); // アセットのdefault位置
      expect(textElement).toContain('y="300"'); // アセットのdefault位置
      expect(textElement).toContain('transform="translate(50,50)"'); // 差分位置
      expect(textElement).toContain('opacity="0.8"'); // override_opacityを使用
    });

    it('TextAssetで二重text要素（縁取り＋塗り）が生成されること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl);
      const textElement = result.useElements[0];
      
      // svg-structure.md仕様：縁取り用とフィル用の二重text要素
      const textMatches = textElement.match(/<text[^>]*>/g);
      expect(textMatches).toHaveLength(2);
      
      // 縁取り用のtext要素
      expect(textElement).toContain('stroke="#000000"');
      expect(textElement).toContain('fill="#000000"');
      expect(textElement).toContain('stroke-width="2"');
      
      // フィル用のtext要素  
      expect(textElement).toContain('stroke="none"');
      expect(textElement).toContain('fill="#FFFFFF"');
    });

    it('縦書きTextAssetでtspan要素による文字分割が行われること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl);
      const textElement = result.useElements[0];
      
      // 縦書きの場合、文字ごとにtspan要素で分割
      expect(textElement).toContain('writing-mode="vertical-rl"');
      expect(textElement).toContain('<tspan');
      
      // 各文字がtspanで個別に処理される
      const tspanMatches = textElement.match(/<tspan[^>]*>/g);
      expect(tspanMatches!.length).toBeGreaterThan(0);
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
          'test-text-1': multilineTextAsset,
        },
      };

      // 複数行テキスト用のインスタンス（横書き）
      const multilineInstance = {
        ...mockTextAssetInstance,
        override_text: '第一行\n第二行\n第三行',
      };

      const instances: AssetInstance[] = [multilineInstance];
      
      const result = generateSvgStructureCommon(multilineProject, instances, mockProtocolUrl);
      const textElement = result.useElements[0];
      
      // 行間の設定が反映されている
      const tspanMatches = textElement.match(/<tspan[^>]*dy="[^"]*"/g);
      expect(tspanMatches).toBeTruthy();
      
      // leadingが適用された行間計算（font_size + leading）
      expect(textElement).toContain('dy="36"'); // 28 + 8 (font_size + leading)
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
          'test-text-1': negativeLeadingTextAsset,
        },
      };

      // マイナスleading用のインスタンス（横書き）
      const negativeLeadingInstance = {
        ...mockTextAssetInstance,
        override_text: '行間縮小\nテスト',
      };

      const instances: AssetInstance[] = [negativeLeadingInstance];
      
      const result = generateSvgStructureCommon(negativeLeadingProject, instances, mockProtocolUrl);
      const textElement = result.useElements[0];
      
      // マイナスleadingが適用された行間計算（font_size + leading）
      expect(textElement).toContain('dy="23"'); // 28 + (-5) = 23 (font_size + leading)
    });

    it('XMLエスケープが正しく適用されること', () => {
      const specialCharsInstance = {
        ...mockTextAssetInstance,
        override_text: '<test>&"special"&</test>',
      };
      
      const instances: AssetInstance[] = [specialCharsInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl);
      const textElement = result.useElements[0];
      
      // XML特殊文字がエスケープされている（縦書きなので文字分割される）
      expect(textElement).toContain('&'); // & は &amp; にエスケープされ、文字分割される
      expect(textElement).toContain('l'); // < は &lt; にエスケープされ、lが含まれる
      expect(textElement).toContain('g'); // > は &gt; にエスケープされ、gが含まれる
      expect(textElement).toContain('q'); // " は &quot; にエスケープされ、qが含まれる
      expect(textElement).not.toContain('<test>&"special"&</test>');
    });

    it('AssetとInstanceの値の優先順位が正しく適用されること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateSvgStructureCommon(mockProject, instances, mockProtocolUrl);
      const textElement = result.useElements[0];
      
      // Instance値が優先されている
      expect(textElement).toContain('font-size="28"'); // instanceのoverride_font_size
      expect(textElement).toContain('x="200"'); // アセットのdefault位置
      expect(textElement).toContain('y="300"'); // アセットのdefault位置  
      expect(textElement).toContain('transform="translate(50,50)"'); // 差分変換
      expect(textElement).toContain('opacity="0.8"'); // instanceのoverride_opacity
      expect(textElement).toContain('上'); // instanceのoverride_textの一部
    });
  });

  describe('generateCompleteSvg - TextAsset統合テスト', () => {
    it('完全なSVGドキュメントにTextAssetが含まれること', () => {
      const instances: AssetInstance[] = [mockTextAssetInstance];
      
      const result = generateCompleteSvg(mockProject, instances, mockProtocolUrl);
      
      // 基本的なSVG構造
      expect(result).toContain('<svg');
      expect(result).toContain('viewBox="0 0 800 600"');
      expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
      
      // TextAsset要素が含まれている
      expect(result).toContain('font-family="Arial"');
      expect(result).toContain('上'); // 縦書きで文字分割されている
      
      // 構造が正しい
      expect(result).toContain('<g id="draw">');
      expect(result).toContain('</svg>');
    });
  });
});