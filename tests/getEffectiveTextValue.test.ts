import {
  getEffectiveTextValue,
  TextAsset,
  TextAssetInstance,
  TextAssetInstancePhase,
  createDefaultLanguageSettings
} from '../src/types/entities';

describe('getEffectiveTextValue', () => {
  // テスト用の基本TextAsset
  const createTestAsset = (overrides: Partial<TextAsset> = {}): TextAsset => ({
    id: 'test-asset-1',
    type: 'TextAsset',
    name: 'Test Asset',
    default_text: 'Common Default Text',
    default_context: 'Test context',
    default_text_override: {},
    default_settings: createDefaultLanguageSettings(),
    ...overrides
  });

  // テスト用のTextAssetInstance
  const createTestInstance = (overrides: Partial<TextAssetInstance> = {}): TextAssetInstance => ({
    id: 'test-instance-1',
    asset_id: 'test-asset-1',
    multilingual_text: {},
    ...overrides
  });

  describe('Phase: AUTO (自動優先度)', () => {
    test('インスタンスのテキストが最優先される', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: { ja: 'Asset Japanese' }
      });
      const instance = createTestInstance({
        multilingual_text: { ja: 'Instance Japanese' }
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO);
      expect(result).toBe('Instance Japanese');
    });

    test('インスタンステキストがない場合、言語別デフォルトが使用される', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: { ja: 'Asset Japanese' }
      });
      const instance = createTestInstance({
        multilingual_text: {}
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO);
      expect(result).toBe('Asset Japanese');
    });

    test('言語別デフォルトがない場合、共通デフォルトが使用される', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: {}
      });
      const instance = createTestInstance({
        multilingual_text: {}
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO);
      expect(result).toBe('Asset Default');
    });

    test('すべてのテキストソースがない場合、空文字が返される', () => {
      const asset = createTestAsset({
        default_text: '',
        default_text_override: {}
      });
      const instance = createTestInstance({
        multilingual_text: {}
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO);
      expect(result).toBe('');
    });
  });

  describe('Phase: ASSET_LANG (アセットの言語別設定)', () => {
    test('指定言語の言語別デフォルトテキストが返される', () => {
      const asset = createTestAsset({
        default_text_override: {
          ja: 'Japanese Override',
          en: 'English Override'
        }
      });
      const instance = createTestInstance({
        multilingual_text: { ja: 'Instance Japanese' }
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.ASSET_LANG);
      expect(result).toBe('Japanese Override');
    });

    test('指定言語の言語別デフォルトがない場合、空文字が返される', () => {
      const asset = createTestAsset({
        default_text_override: { en: 'English Override' }
      });
      const instance = createTestInstance({
        multilingual_text: { ja: 'Instance Japanese' }
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.ASSET_LANG);
      expect(result).toBe('');
    });

    test('default_text_overrideがundefinedの場合、空文字が返される', () => {
      const asset = createTestAsset({
        default_text_override: undefined
      });
      const instance = createTestInstance({
        multilingual_text: { ja: 'Instance Japanese' }
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.ASSET_LANG);
      expect(result).toBe('');
    });
  });

  describe('Phase: INSTANCE_LANG (インスタンスの言語別設定)', () => {
    test('インスタンスの多言語テキストが返される', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: { ja: 'Asset Japanese' }
      });
      const instance = createTestInstance({
        multilingual_text: {
          ja: 'Instance Japanese',
          en: 'Instance English'
        }
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.INSTANCE_LANG);
      expect(result).toBe('Instance Japanese');
    });

    test('指定言語のインスタンステキストがない場合、空文字が返される', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: { ja: 'Asset Japanese' }
      });
      const instance = createTestInstance({
        multilingual_text: { en: 'Instance English' }
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.INSTANCE_LANG);
      expect(result).toBe('');
    });

    test('instanceがnullの場合、空文字が返される', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: { ja: 'Asset Japanese' }
      });

      const result = getEffectiveTextValue(asset, null, 'ja', TextAssetInstancePhase.INSTANCE_LANG);
      expect(result).toBe('');
    });
  });

  describe('Phase: ASSET_COMMON (アセットの共通設定)', () => {
    test('アセットのdefault_textが返される', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: { ja: 'Asset Japanese' }
      });
      const instance = createTestInstance({
        multilingual_text: { ja: 'Instance Japanese' }
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.ASSET_COMMON);
      expect(result).toBe('Asset Default');
    });

    test('default_textが空の場合、空文字が返される', () => {
      const asset = createTestAsset({
        default_text: '',
        default_text_override: { ja: 'Asset Japanese' }
      });
      const instance = createTestInstance({
        multilingual_text: { ja: 'Instance Japanese' }
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.ASSET_COMMON);
      expect(result).toBe('');
    });
  });

  describe('未定義の処理', () => {

    test('multilingual_textの値が未定義の場合は除外される', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: { ja: 'Asset Japanese' }
      });
      const instance = createTestInstance({
        multilingual_text: {}
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO);
      expect(result).toBe('Asset Japanese');
    });
  });

  describe('空文字列の扱い', () => {
    test('インスタンステキストが空文字列でも有効として扱われる', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: { ja: 'Asset Japanese' }
      });
      const instance = createTestInstance({
        multilingual_text: { ja: '' }
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO);
      expect(result).toBe('');
    });

    test('言語別デフォルトが空文字列でも有効として扱われる', () => {
      const asset = createTestAsset({
        default_text: 'Asset Default',
        default_text_override: { ja: '' }
      });
      const instance = createTestInstance({
        multilingual_text: {}
      });

      const result = getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO);
      expect(result).toBe('');
    });
  });

  describe('複数言語での動作', () => {
    test('異なる言語で異なるテキストが返される', () => {
      const asset = createTestAsset({
        default_text: 'Default',
        default_text_override: {
          ja: 'Japanese',
          en: 'English',
          zh: 'Chinese'
        }
      });
      const instance = createTestInstance({
        multilingual_text: {}
      });

      expect(getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO)).toBe('Japanese');
      expect(getEffectiveTextValue(asset, instance, 'en', TextAssetInstancePhase.AUTO)).toBe('English');
      expect(getEffectiveTextValue(asset, instance, 'zh', TextAssetInstancePhase.AUTO)).toBe('Chinese');
      expect(getEffectiveTextValue(asset, instance, 'ko', TextAssetInstancePhase.AUTO)).toBe('Default');
    });
  });

  describe('default_text_override が null を含む状況', () => {
    test('default_text_override を無視して default_text が返される', () => {
      const asset = createTestAsset({
        default_text: 'asset_common',
        default_text_override: {}
      });
      const instance = createTestInstance({
        multilingual_text: {
          ja: '',
        }
      });

      expect(getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO)).toBe('');
      expect(getEffectiveTextValue(asset, instance, 'en', TextAssetInstancePhase.AUTO)).toBe('asset_common');
    });
  });

  describe('default_text_override が値を含む状況', () => {
    test('default_text_override を無視して default_text が返される', () => {
      const asset = createTestAsset({
        default_text: 'asset_common',
        default_text_override: {
          ja: 'asset_lang ja',
          en: 'asset_lang en',
        }
      });
      const instance = createTestInstance({
        multilingual_text: {
          en: '',
        }
      });

      expect(getEffectiveTextValue(asset, instance, 'ja', TextAssetInstancePhase.AUTO)).toBe('asset_lang ja');
      expect(getEffectiveTextValue(asset, instance, 'en', TextAssetInstancePhase.AUTO)).toBe('');
    });
  });
});
