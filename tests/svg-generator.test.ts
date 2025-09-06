import {
  generateSvgStructureCommon,
  generateCompleteSvg,
  generateMultilingualTextElement,
  setFontInfoCache,
  SvgStructureResult,
} from '../src/utils/svgGeneratorCommon';
import { mockProject, mockImageAsset, mockTextAsset, mockVectorAsset } from './fixtures/sampleProject';
import type { AssetInstance, FontInfo } from '../src/types/entities';
import { FontType } from '../src/types/entities';

describe('SVG Generator Common', () => {
  beforeEach(() => {
    // フォント情報のキャッシュをクリア
    setFontInfoCache([]);
  });

  describe('generateSvgStructureCommon', () => {
    test('ImageAssetとTextAssetを含むSVG構造を正しく生成できる', async () => {
      const instances: AssetInstance[] = [
        {
          id: 'instance-1',
          asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
        },
        {
          id: 'instance-2',
          asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
          multilingual_text: {
            ja: 'もっと！',
            en: 'Get more',
          },
        },
      ];

      const mockProtocolUrl = (filePath: string) => `komae-asset://${filePath}`;
      const availableLanguages = ['ja', 'en'];
      const currentLanguage = 'ja';

      const result: SvgStructureResult = await generateSvgStructureCommon(
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

    test('VectorAssetを含むSVG構造を正しく生成できる', async () => {
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
      const result = await generateSvgStructureCommon(
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

    test('z-index順でソートされることを確認', async () => {
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
      const result = await generateSvgStructureCommon(
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

    test('存在しないアセットIDは無視される', async () => {
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
      const result = await generateSvgStructureCommon(
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
          multilingual_text: {
            ja: 'テストテキスト',
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
          multilingual_text: {
            ja: '日本語',
            en: 'English',
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
        multilingual_text: {
          ja: '日本語テスト',
          en: 'English Test',
          zh: '中文测试',
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
          type: FontType.CUSTOM,
          path: '/path/to/custom-font.woff2',
          isGoogleFont: false,
        },
        {
          id: 'google-font',
          name: 'Roboto',
          type: FontType.BUILTIN,
          path: '/path/to/roboto.woff2',
          isGoogleFont: true,
        },
      ];
      setFontInfoCache(fontInfos);

      const textAssetWithCustomFont = {
        ...mockTextAsset,
        default_settings: {
          font: 'custom-font',
          font_size: 80,
          override_pos_x: 134.13333333333335,
          override_pos_y: 400.37333333333333,
          stroke_width: 2,
          leading: 0,
          vertical: false,
        }
      };

      const instance: AssetInstance = {
        id: 'font-test-instance',
        asset_id: textAssetWithCustomFont.id,
        multilingual_text: {
          ja: 'カスタムフォント',
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
        multilingual_text: {
          ja: '<test>&"special"&</test>',
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
    test('不正なプロジェクトデータでもクラッシュしない', async () => {
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
      
      expect(async () => {
        await generateSvgStructureCommon(invalidProject, instances, mockProtocolUrl, ['ja'], 'ja');
      }).not.toThrow();

      const result = await generateSvgStructureCommon(
        invalidProject,
        instances,
        mockProtocolUrl,
        ['ja'],
        'ja'
      );

      expect(result.assetDefinitions).toHaveLength(0);
      expect(result.useElements).toHaveLength(0);
    });

    test('空の言語配列でもエラーにならない', async () => {
      const instances: AssetInstance[] = [
        {
          id: 'empty-lang-test',
          asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
        },
      ];

      const mockProtocolUrl = (filePath: string) => filePath;
      
      expect(async () => {
        await generateSvgStructureCommon(mockProject, instances, mockProtocolUrl, [], 'ja');
      }).not.toThrow();
    });
  });

  describe('マスク処理（clipPath）機能', () => {
    test('マスクが設定されたImageAssetでclipPath定義が生成される', () => {
      const maskPoints: [[number, number], [number, number], [number, number], [number, number]] = [
        [100, 100], [500, 100], [500, 400], [100, 400]
      ];

      // マスク付きImageAssetInstanceを作成
      const instances: AssetInstance[] = [
        {
          id: 'instance-with-mask',
          asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
          override_mask: maskPoints,
        },
      ];

      const mockProtocolUrl = (filePath: string) => `komae-asset://${filePath}`;
      const result = generateCompleteSvg(mockProject, instances, mockProtocolUrl, 'ja');

      // clipPath定義が<defs>内に生成されている
      expect(result).toContain('<defs>');
      expect(result).toContain('<clipPath id="');
      expect(result).toContain('<path d="M 100 100 L 500 100 L 500 400 L 100 400 Z" />');
      expect(result).toContain('</clipPath>');

      // use要素にclip-path属性が適用されている
      expect(result).toContain('clip-path="url(#mask-');
      expect(result).toContain('href="#img-f3227b66-61ec-428d-adb2-e4f1526e378c"');
    });

    test('アセットレベルのdefault_maskが使用される', () => {
      // プロジェクトにdefault_maskを持つImageAssetを追加
      const projectWithMask = {
        ...mockProject,
        assets: {
          ...mockProject.assets,
          'img-with-default-mask': {
            ...mockImageAsset,
            id: 'img-with-default-mask',
            default_mask: [[50, 50], [250, 50], [250, 200], [50, 200]] as [[number, number], [number, number], [number, number], [number, number]],
          },
        },
      };

      const instances: AssetInstance[] = [
        {
          id: 'instance-default-mask',
          asset_id: 'img-with-default-mask',
        },
      ];

      const mockProtocolUrl = (filePath: string) => `komae-asset://${filePath}`;
      const result = generateCompleteSvg(projectWithMask, instances, mockProtocolUrl, 'ja');

      // default_maskが適用されている
      expect(result).toContain('M 50 50 L 250 50 L 250 200 L 50 200 Z');
      expect(result).toContain('clip-path="url(#mask-');
    });

    test('override_maskがdefault_maskより優先される', () => {
      const defaultMask: [[number, number], [number, number], [number, number], [number, number]] = [
        [0, 0], [100, 0], [100, 100], [0, 100]
      ];
      const overrideMask: [[number, number], [number, number], [number, number], [number, number]] = [
        [200, 200], [400, 200], [400, 350], [200, 350]
      ];

      const projectWithDefaultMask = {
        ...mockProject,
        assets: {
          ...mockProject.assets,
          'img-with-masks': {
            ...mockImageAsset,
            id: 'img-with-masks',
            default_mask: defaultMask,
          },
        },
      };

      const instances: AssetInstance[] = [
        {
          id: 'instance-override-mask',
          asset_id: 'img-with-masks',
          override_mask: overrideMask,
        },
      ];

      const mockProtocolUrl = (filePath: string) => `komae-asset://${filePath}`;
      const result = generateCompleteSvg(projectWithDefaultMask, instances, mockProtocolUrl, 'ja');

      // override_maskのパスが使用されている
      expect(result).toContain('M 200 200 L 400 200 L 400 350 L 200 350 Z');
      // default_maskのパスは使用されていない
      expect(result).not.toContain('M 0 0 L 100 0 L 100 100 L 0 100 Z');
    });

    test('マスクがないImageAssetではclip-path属性が追加されない', () => {
      const instances: AssetInstance[] = [
        {
          id: 'instance-no-mask',
          asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
        },
      ];

      const mockProtocolUrl = (filePath: string) => `komae-asset://${filePath}`;
      const result = generateCompleteSvg(mockProject, instances, mockProtocolUrl, 'ja');

      // clip-path属性がない
      expect(result).not.toContain('clip-path="url(#');
      // 通常のuse要素は生成されている
      expect(result).toContain('href="#img-f3227b66-61ec-428d-adb2-e4f1526e378c"');
    });

    test('同じマスクを持つ複数のインスタンスで重複するclipPath定義が回避される', () => {
      const sameMask: [[number, number], [number, number], [number, number], [number, number]] = [
        [10, 10], [90, 10], [90, 90], [10, 90]
      ];

      const instances: AssetInstance[] = [
        {
          id: 'instance-1',
          asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
          override_mask: sameMask,
        },
        {
          id: 'instance-2', 
          asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
          override_mask: sameMask,
        },
      ];

      const mockProtocolUrl = (filePath: string) => `komae-asset://${filePath}`;
      const result = generateCompleteSvg(mockProject, instances, mockProtocolUrl, 'ja');

      // clipPath定義は1つだけ生成される
      const clipPathMatches = result.match(/<clipPath id="/g);
      expect(clipPathMatches).toHaveLength(1);

      // 両方のuse要素で同じclipPathが参照される  
      const clipPathRefs = result.match(/clip-path="url\(#[^"]+\)"/g);
      expect(clipPathRefs).toHaveLength(2);
    });

    test('TextAssetやVectorAssetにはマスクが適用されない', () => {
      const instances: AssetInstance[] = [
        {
          id: 'text-instance',
          asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
        },
        {
          id: 'vector-instance',
          asset_id: 'vector-7011a954-c8c3-49bc-a48c-2554755d7da7',
        },
      ];

      const mockProtocolUrl = (filePath: string) => `komae-asset://${filePath}`;
      const result = generateCompleteSvg(mockProject, instances, mockProtocolUrl, 'ja');

      // clipPath定義が生成されない
      expect(result).not.toContain('<clipPath');
      // TextAsset要素は正常に生成される
      expect(result).toContain('font-family=');
      // VectorAsset要素は正常に生成される
      expect(result).toContain('vector-instance-');
    });
  });
});
