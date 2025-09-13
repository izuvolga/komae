/**
 * TextAsset多言語機能のテスト
 * default_language_settings, override_language_settings機能
 */

import {
  createDefaultTextAsset,
  getEffectiveLanguageSetting,
  getEffectiveFontSize,
  getEffectivePosition,
  getEffectiveFontFace,
  getEffectiveVertical,
  validateTextAssetData,
  validateTextAssetInstanceData,
} from '../src/types/entities';
import type { TextAsset, TextAssetInstance, LanguageSettings } from '../src/types/entities';

describe('TextAsset Multilingual Features', () => {
  describe('createDefaultTextAsset', () => {
    it('should create TextAsset with basic required fields', () => {
      const asset = createDefaultTextAsset({ name: 'Test Text' });

      expect(asset.name).toBe('Test Text');
      expect(asset.type).toBe('TextAsset');
      expect(asset.default_text).toBe('');
      expect(asset.default_context).toBe('');
      // 新仕様では default_settings に完全なデフォルト値が設定される
      expect(asset.default_settings).toEqual({
        pos_x: 300,
        pos_y: 300,
        font: 'system-ui',
        font_size: 64,
        stroke_width: 2,
        leading: 0,
        vertical: false,
        opacity: 1.0,
        z_index: 2,
        fill_color: '#000000',
        stroke_color: '#FFFFFF',
      });
      expect(asset.default_language_override).toBeUndefined();
    });

    it('should create TextAsset with language settings when supported languages are provided', () => {
      const supportedLanguages = ['ja', 'en', 'zh'];
      const asset = createDefaultTextAsset({
        name: 'Multilingual Text',
        supportedLanguages
      });

      // 新しい設計では、supportedLanguagesが提供された場合でも
      // default_settingsには完全なデフォルト値が設定され、default_language_overrideはundefined
      expect(asset.default_settings).toEqual({
        pos_x: 300,
        pos_y: 300,
        font: 'system-ui',
        font_size: 64,
        stroke_width: 2,
        leading: 0,
        vertical: false,
        opacity: 1.0,
        z_index: 2,
        fill_color: '#000000',
        stroke_color: '#FFFFFF',
      });
      expect(asset.default_language_override).toBeUndefined();
    });
  });


  describe('Language-specific effective value functions', () => {
    let testAsset: TextAsset;
    let testInstance: TextAssetInstance;

    beforeEach(() => {
      testAsset = createDefaultTextAsset({
        name: 'Test Asset',
        supportedLanguages: ['ja', 'en']
      });

      // Set up asset with new design: default_settings + default_language_override
      testAsset.default_settings = {
        font_size: 20, // Common default
        pos_x: 100,
        pos_y: 100,
      };

      testAsset.default_language_override = {
        'en': {
          font_size: 18,
          pos_x: 200,
          font: 'Arial',
        },
        'ja': {
          font_size: 24,
          vertical: true,
        }
      };

      testInstance = {
        id: 'test-instance',
        asset_id: testAsset.id,
        multilingual_text: {
          'ja': '日本語テキスト',
          'en': 'English Text',
        },
        override_language_settings: {
          'en': {
            font_size: 16, // Override asset's default
            opacity: 0.5,
          }
        }
      };
    });

    describe('getEffectiveLanguageSetting', () => {
      it('should return instance override when available', () => {
        const result = getEffectiveLanguageSetting(testAsset, testInstance, 'en', 'font_size');
        expect(result).toBe(16); // From instance override
      });

      it('should return asset language override when no instance override', () => {
        const result = getEffectiveLanguageSetting(testAsset, testInstance, 'ja', 'font_size');
        expect(result).toBe(24); // From asset language override
      });

      it('should return common setting when no language-specific setting exists', () => {
        const result = getEffectiveLanguageSetting(testAsset, testInstance, 'zh', 'font_size');
        expect(result).toBe(20); // From common default_settings
      });
    });

    describe('getEffectiveFontSize', () => {
      it('should use instance override first', () => {
        const result = getEffectiveFontSize(testAsset, testInstance, 'en');
        expect(result).toBe(16); // Instance override
      });

      it('should use asset language default when no instance override', () => {
        const result = getEffectiveFontSize(testAsset, testInstance, 'ja');
        expect(result).toBe(24); // Asset language default
      });

      it('should use asset base font_size when no language-specific setting', () => {
        const result = getEffectiveFontSize(testAsset, testInstance, 'zh');
        expect(result).toBe(20); // From common default_settings (not the global default)
      });
    });

    describe('getEffectivePosition', () => {
      it('should return language-specific position when available', () => {
        const result = getEffectivePosition(testAsset, testInstance, 'en');
        expect(result).toEqual({
          x: 200, // From asset language default
          y: 100 // Default position
        });
      });

      it('should return base position when no language-specific override', () => {
        const result = getEffectivePosition(testAsset, testInstance, 'ja');
        expect(result).toEqual({
          x: 100, // Default position
          y: 100 // Default position
        });
      });
    });

    describe('getEffectiveFontFace', () => {
      it('should return language-specific font when available', () => {
        const result = getEffectiveFontFace(testAsset, testInstance, 'en');
        expect(result).toBe('Arial'); // From asset language default
      });

      it('should return base font when no language-specific override', () => {
        const result = getEffectiveFontFace(testAsset, testInstance, 'ja');
        expect(result).toBe('system-ui'); // Default font
      });
    });

    describe('getEffectiveVertical', () => {
      it('should return language-specific vertical setting when available', () => {
        const result = getEffectiveVertical(testAsset, testInstance, 'ja');
        expect(result).toBe(true); // From asset language default
      });

      it('should return base vertical setting when no language-specific override', () => {
        const result = getEffectiveVertical(testAsset, testInstance, 'en');
        expect(result).toBe(false); // Default vertical setting
      });
    });
  });

  describe('Validation', () => {
    describe('validateTextAssetData', () => {
      it('should validate TextAsset with new language settings', () => {
        const asset = createDefaultTextAsset({
          name: 'Valid Asset',
          supportedLanguages: ['ja', 'en']
        });

        asset.default_language_override = {
          'en': {
            font_size: 20,
            opacity: 0.8,
          }
        };

        const result = validateTextAssetData(asset);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should catch invalid font sizes in language settings', () => {
        const asset = createDefaultTextAsset({
          name: 'Invalid Asset',
          supportedLanguages: ['ja', 'en']
        });

        asset.default_language_override = {
          'en': {
            font_size: -5, // Invalid
          }
        };

        const result = validateTextAssetData(asset);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('en言語のフォントサイズは0より大きい値を入力してください。現在の値: -5');
      });

      it('should catch invalid opacity in language settings', () => {
        const asset = createDefaultTextAsset({
          name: 'Invalid Asset',
          supportedLanguages: ['ja']
        });

        asset.default_language_override = {
          'ja': {
            opacity: 1.5, // Invalid (> 1.0)
          }
        };

        const result = validateTextAssetData(asset);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('ja言語の不透明度の値は0から1の範囲で入力してください');
      });
    });

    describe('validateTextAssetInstanceData', () => {
      it('should validate TextAssetInstance with new language settings', () => {
        const instance: TextAssetInstance = {
          id: 'test-instance',
          asset_id: 'test-asset',
          multilingual_text: { 'ja': 'テスト' },
          override_language_settings: {
            'en': {
              font_size: 18,
              opacity: 0.9,
            }
          }
        };

        const result = validateTextAssetInstanceData(instance);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should catch invalid values in instance language settings', () => {
        const instance: TextAssetInstance = {
          id: 'test-instance',
          asset_id: 'test-asset',
          multilingual_text: { 'ja': 'テスト' },
          override_language_settings: {
            'en': {
              font_size: -10, // Invalid
              stroke_width: -1, // Invalid
            }
          }
        };

        const result = validateTextAssetInstanceData(instance);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('en言語のフォントサイズは0より大きい値を入力してください。現在の値: -10');
        expect(result.errors).toContain('en言語のストローク幅は0以上の値を入力してください。現在の値: -1');
      });
    });
  });

});
