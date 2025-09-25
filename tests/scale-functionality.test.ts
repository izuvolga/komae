/**
 * スケール機能のテスト
 */

import {
  createDefaultTextAsset,
  getEffectiveScaleX,
  getEffectiveScaleY,
  TextAssetInstancePhase,
} from '../src/types/entities';
import { generateMultilingualTextElement } from '../src/utils/svgGeneratorCommon';
import type { TextAsset, TextAssetInstance } from '../src/types/entities';

describe('Scale Functionality', () => {
  describe('getEffectiveScaleX and getEffectiveScaleY', () => {
    let testAsset: TextAsset;
    let testInstance: TextAssetInstance;

    beforeEach(() => {
      testAsset = createDefaultTextAsset({
        name: 'Scale Test Asset',
        supportedLanguages: ['ja', 'en']
      });

      // Set up asset with scale settings
      testAsset.default_settings = {
        scale_x: 1.5,
        scale_y: 2.0,
      };

      testAsset.default_language_override = {
        'en': {
          scale_x: 0.8,
          scale_y: 1.2,
        },
      };

      testInstance = {
        id: 'test-instance',
        asset_id: testAsset.id,
        multilingual_text: {
          'ja': '日本語',
          'en': 'English',
        },
        override_language_settings: {
          'en': {
            scale_x: 0.5, // Override asset's scale
          }
        }
      };
    });

    it('should return default scale when no language-specific override exists', () => {
      const scaleX = getEffectiveScaleX(testAsset, testInstance, 'ja');
      const scaleY = getEffectiveScaleY(testAsset, testInstance, 'ja');

      expect(scaleX).toBe(1.5); // From default_settings
      expect(scaleY).toBe(2.0); // From default_settings
    });

    it('should return asset language override when available', () => {
      const scaleX = getEffectiveScaleX(testAsset, testInstance, 'en');
      const scaleY = getEffectiveScaleY(testAsset, testInstance, 'en');

      expect(scaleX).toBe(0.5); // From instance override
      expect(scaleY).toBe(1.2); // From asset language override (no instance override for scale_y)
    });

    it('should return default value (1.0) when no scale is set', () => {
      const defaultAsset = createDefaultTextAsset({ name: 'Default Asset' });
      const defaultInstance: TextAssetInstance = {
        id: 'default-instance',
        asset_id: defaultAsset.id,
        multilingual_text: { 'ja': 'テスト' }
      };

      const scaleX = getEffectiveScaleX(defaultAsset, defaultInstance, 'ja');
      const scaleY = getEffectiveScaleY(defaultAsset, defaultInstance, 'ja');

      expect(scaleX).toBe(1.0); // Default value
      expect(scaleY).toBe(1.0); // Default value
    });
  });

  describe('Scale rendering in SVG', () => {
    let testAsset: TextAsset;
    let testInstance: TextAssetInstance;

    beforeEach(() => {
      testAsset = createDefaultTextAsset({
        name: 'Scale Render Test',
        supportedLanguages: ['ja', 'en']
      });

      testAsset.default_settings = {
        scale_x: 2.0,
        scale_y: 1.5,
        pos_x: 100,
        pos_y: 100,
        font_size: 20,
      };

      testInstance = {
        id: 'test-instance',
        asset_id: testAsset.id,
        multilingual_text: {
          'ja': 'テスト',
          'en': 'Test',
        },
      };
    });

    it('should include transform attribute with scale when scale is not 1.0', () => {
      // Mock generateSingleLanguageTextElement を避けるため、直接 SVG を生成する方法を検討
      // ここでは transform 属性が含まれることをテストする
      const result = generateMultilingualTextElement(
        testAsset,
        testInstance,
        ['ja', 'en'],
        'ja',
        TextAssetInstancePhase.AUTO
      );

      // transform属性が含まれることを確認
      expect(result).toContain('transform="scale(2, 1.5)"');

      // 各言語のg要素が含まれることを確認
      expect(result).toContain('class="lang-ja"');
      expect(result).toContain('class="lang-en"');
    });

    it('should not include transform attribute when scale is 1.0', () => {
      // デフォルトのスケール値（1.0, 1.0）を使用
      const defaultAsset = createDefaultTextAsset({
        name: 'Default Scale Asset',
        supportedLanguages: ['ja']
      });
      const defaultInstance: TextAssetInstance = {
        id: 'default-instance',
        asset_id: defaultAsset.id,
        multilingual_text: { 'ja': 'テスト' }
      };

      const result = generateMultilingualTextElement(
        defaultAsset,
        defaultInstance,
        ['ja'],
        'ja',
        TextAssetInstancePhase.AUTO
      );

      // transform属性が含まれないことを確認
      expect(result).not.toContain('transform=');
    });
  });
});