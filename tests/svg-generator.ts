import {
  generateSvgStructureCommon,
  generateCompleteSvg,
  generateMultilingualTextElement,
  setFontInfoCache,
  SvgStructureResult,
} from '../src/utils/svgGeneratorCommon';
import { mockProject, mockImageAsset, mockTextAsset, mockVectorAsset } from './fixtures/sampleProject';
import type { AssetInstance, FontInfo } from '../src/types/entities';

describe('SVG Generator Common', () => {
  beforeEach(() => {
    // フォント情報のキャッシュをクリア
    setFontInfoCache([]);
  });

  describe('generateSvgStructureCommon', () => {
    test('ImageAssetとTextAssetを含むSVG構造を正しく生成できる', () => {
      const instances: AssetInstance[] = [
        {
          id: 'instance-1',
          asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
        },
        {
          id: 'instance-2',
          asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
          multilingual_overrides: {
            ja: { override_text: 'もっと！' },
            en: { override_text: 'Get more' },
          },
        },
      ];

      const mockProtocolUrl = (filePath: string) => `komae-asset://${filePath}`;
      const availableLanguages = ['ja', 'en'];
      const currentLanguage = 'ja';

      const result: SvgStructureResult = generateSvgStructureCommon(
        mockProject,
        instances,
        mockProtocolUrl,
        availableLanguages,
        currentLanguage
      );

      // アセット定義が生成されることを確認（ImageAssetのみ）
      expect(result.assetDefinitions).toHaveLength(1);
      expect(result.assetDefinitions[0]).toContain('img-f3227b66-61ec-428d-adb2-e4f1526e378c');
      expect(result.assetDefinitions[0]).toContain('komae-asset://assets/images/1-18.jpg');

      // 使用要素が生成されることを確認（ImageAsset + TextAsset）
      expect(result.useElements).toHaveLength(2);
      
      // ImageAssetのuse要素
      expect(result.useElements[0]).toContain('href="#img-f3227b66-61ec-428d-adb2-e4f1526e378c"');
      
      // TextAssetの多言語要素
      expect(result.useElements[1]).toContain('class="lang-ja"');
      expect(result.useElements[1]).toContain('class="lang-en"');
      expect(result.useElements[1]).toContain('もっと！');
      expect(result.useElements[1]).toContain('Get more');
    });

    test('VectorAssetを含むSVG構造を正しく生成できる', () => {
      const instances: AssetInstance[] = [
        {
          id: 'instance-vector',
          asset_id: 'vector-7011a954-c8c3-49bc-a48c-2554755d7da7',
          override_pos_x: 100,
          override_pos_y: 200,
          override_width: 50,
          override_height: 50,
        },
      ];

      const mockProtocolUrl = (filePath: string) => `file://${filePath}`;
      const result = generateSvgStructureCommon(
        mockProject,
        instances,
        mockProtocolUrl,
        ['ja'],
        'ja'
      );

      // VectorAssetはアセット定義に含まれない
      expect(result.assetDefinitions).toHaveLength(0);

      // VectorAssetは直接使用要素として生成される
      expect(result.useElements).toHaveLength(1);
      expect(result.useElements[0]).toContain('vector-instance-');
      expect(result.useElements[0]).toContain('<svg');
      expect(result.useElements[0]).toContain('transform="scale(');
      expect(result.useElements[0]).toContain('<rect x="20" y="20" width="60" height="60"');
    });

    test('z-index順でソートされることを確認', () => {
      const instances: AssetInstance[] = [
        {
          id: 'instance-text',
          asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb', // default_z_index: 3
        },
        {
          id: 'instance-image',
          asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c', // default_z_index: 0
        },
      ];

      const mockProtocolUrl = (filePath: string) => filePath;
      const result = generateSvgStructureCommon(
        mockProject,
        instances,
        mockProtocolUrl,
        ['ja'],
        'ja'
      );

      // z-index 0（画像）が先、z-index 3（テキスト）が後
      expect(result.useElements).toHaveLength(2);
      expect(result.useElements[0]).toContain('href="#img-');
      expect(result.useElements[1]).toContain('font-family=');
    });

    test('存在しないアセットIDは無視される', () => {
      const instances: AssetInstance[] = [
        {
          id: 'instance-invalid',
          asset_id: 'nonexistent-asset',
        },
        {
          id: 'instance-valid',
          asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
        },
      ];

      const mockProtocolUrl = (filePath: string) => filePath;
      const result = generateSvgStructureCommon(
        mockProject,
        instances,
        mockProtocolUrl,
        ['ja'],
        'ja'
      );

      // 有効なアセットのみ処理される
      expect(result.assetDefinitions).toHaveLength(1);
      expect(result.useElements).toHaveLength(1);
    });
  });

  describe('generateCompleteSvg', () => {
    test('完全なSVGドキュメントを生成できる', () => {
      const instances: AssetInstance[] = [
        {
          id: 'instance-1',
          asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
        },
        {
          id: 'instance-2',
          asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
          multilingual_overrides: {
            ja: { override_text: 'テストテキスト' },
          },
        },
      ];

      const mockProtocolUrl = (filePath: string) => `file://${filePath}`;
      const result = generateCompleteSvg(mockProject, instances, mockProtocolUrl, 'ja');

      // 基本的なSVG構造
      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
      expect(result).toContain('id="komae-preview"');
      expect(result).toContain('viewBox="0 0 768 1024"');
      expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(result).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');

      // defs セクション
      expect(result).toContain('<defs>');
      expect(result).toContain('</defs>');

      // assets セクション
      expect(result).toContain('<g id="assets">');
      expect(result).toContain('visibility="hidden"');

      // draw セクション
      expect(result).toContain('<g id="draw">');
      
      // アセットの内容
      expect(result).toContain('img-f3227b66-61ec-428d-adb2-e4f1526e378c');
      expect(result).toContain('テストテキスト');
    });

    test('言語指定なしでデフォルト言語（ja）が使用される', () => {
      const instances: AssetInstance[] = [
        {
          id: 'instance-text',
          asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
          multilingual_overrides: {
            ja: { override_text: '日本語' },
            en: { override_text: 'English' },
          },
        },
      ];

      const mockProtocolUrl = (filePath: string) => filePath;
      const result = generateCompleteSvg(mockProject, instances, mockProtocolUrl);

      // デフォルト言語（ja）が表示される
      expect(result).toContain('class="lang-ja" opacity="1">');
      expect(result).toContain('class="lang-en" opacity="1" style="display: none;">');
      expect(result).toContain('日本語');
      expect(result).toContain('English');
    });

    test('空のインスタンス配列でも有効なSVGが生成される', () => {
      const instances: AssetInstance[] = [];
      const mockProtocolUrl = (filePath: string) => filePath;
      const result = generateCompleteSvg(mockProject, instances, mockProtocolUrl, 'ja');

      expect(result).toContain('<svg');
      expect(result).toContain('</svg>');
      expect(result).toContain('<g id="assets">');
      expect(result).toContain('<g id="draw">');
      
      // 内容は空だが構造は維持される
      expect(result).toContain('visibility="hidden">\n    </g>');
    });
  });

  describe('generateMultilingualTextElement', () => {
    test('多言語テキスト要素を正しく生成できる', () => {
      const textAsset = mockTextAsset;
      const instance: AssetInstance = {
        id: 'test-instance',
        asset_id: textAsset.id,
        multilingual_overrides: {
          ja: { override_text: '日本語テスト' },
          en: { override_text: 'English Test' },
          zh: { override_text: '中文测试' },
        },
      };

      const availableLanguages = ['ja', 'en', 'zh'];
      const currentLanguage = 'en';

      const result = generateMultilingualTextElement(
        textAsset,
        instance,
        availableLanguages,
        currentLanguage
      );

      // 各言語のクラスが含まれている
      expect(result).toContain('class="lang-ja"');
      expect(result).toContain('class="lang-en"');
      expect(result).toContain('class="lang-zh"');

      // 現在の言語（en）が表示され、他は非表示
      expect(result).toContain('class="lang-ja" opacity="1" style="display: none;">');
      expect(result).toContain('class="lang-en" opacity="1">'); // style属性なし = 表示
      expect(result).toContain('class="lang-zh" opacity="1" style="display: none;">');

      // 各言語のテキスト内容
      expect(result).toContain('日本語テスト');
      expect(result).toContain('English Test');
      expect(result).toContain('中文测试');

      // 二重text要素（縁取り + 塗り）
      const textMatches = result.match(/<text[^>]*>/g);
      expect(textMatches).toHaveLength(6); // 3言語 × 2要素（縁取り+塗り）

      // フォント設定
      expect(result).toContain('font-family="system-ui, -apple-system, sans-serif"');
      expect(result).toContain('font-size="80"');
    });

    test('フォントキャッシュが設定されている場合の処理', () => {
      // フォント情報キャッシュを設定
      const fontInfos: FontInfo[] = [
        {
          id: 'custom-font',
          name: 'Custom Font',
          isGoogleFont: false,
          category: 'sans-serif',
        },
        {
          id: 'google-font',
          name: 'Roboto',
          isGoogleFont: true,
          category: 'sans-serif',
        },
      ];
      setFontInfoCache(fontInfos);

      const textAssetWithCustomFont = {
        ...mockTextAsset,
        font: 'custom-font',
      };

      const instance: AssetInstance = {
        id: 'font-test-instance',
        asset_id: textAssetWithCustomFont.id,
        multilingual_overrides: {
          ja: { override_text: 'カスタムフォント' },
        },
      };

      const result = generateMultilingualTextElement(
        textAssetWithCustomFont,
        instance,
        ['ja'],
        'ja'
      );

      // カスタムフォントIDがそのまま使用される
      expect(result).toContain('font-family="custom-font"');
      expect(result).toContain('カスタムフォント');
    });

    test('XMLエスケープが正しく適用される', () => {
      const instance: AssetInstance = {
        id: 'escape-test',
        asset_id: mockTextAsset.id,
        multilingual_overrides: {
          ja: { override_text: '<test>&"special"&</test>' },
        },
      };

      const result = generateMultilingualTextElement(
        mockTextAsset,
        instance,
        ['ja'],
        'ja'
      );

      // XML特殊文字がエスケープされている
      expect(result).toContain('&lt;test&gt;&amp;&quot;special&quot;&amp;&lt;/test&gt;');
      expect(result).not.toContain('<test>&"special"&</test>');
    });
  });

  describe('エラーハンドリング', () => {
    test('不正なプロジェクトデータでもクラッシュしない', () => {
      const invalidProject = {
        ...mockProject,
        assets: {},
      };

      const instances: AssetInstance[] = [
        {
          id: 'invalid-instance',
          asset_id: 'nonexistent-asset',
        },
      ];

      const mockProtocolUrl = (filePath: string) => filePath;
      
      expect(() => {
        generateSvgStructureCommon(invalidProject, instances, mockProtocolUrl, ['ja'], 'ja');
      }).not.toThrow();

      const result = generateSvgStructureCommon(
        invalidProject,
        instances,
        mockProtocolUrl,
        ['ja'],
        'ja'
      );

      expect(result.assetDefinitions).toHaveLength(0);
      expect(result.useElements).toHaveLength(0);
    });

    test('空の言語配列でもエラーにならない', () => {
      const instances: AssetInstance[] = [
        {
          id: 'empty-lang-test',
          asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
        },
      ];

      const mockProtocolUrl = (filePath: string) => filePath;
      
      expect(() => {
        generateSvgStructureCommon(mockProject, instances, mockProtocolUrl, [], 'ja');
      }).not.toThrow();
    });
  });
});
