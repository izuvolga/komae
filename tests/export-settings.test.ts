import { describe, test, expect } from '@jest/globals';
import type { ProjectData, ExportFormat, ExportOptions } from '../src/types/entities';

// エクスポート設定管理機能をインポート（TDDのRED状態を作るため）
import { ExportSettingsManager, validateExportSettings, getDefaultExportSettings } from '../src/utils/exportSettings';

describe('Export Settings Manager', () => {
  // テスト用のプロジェクトデータ
  const mockProject: ProjectData = {
    metadata: {
      komae_version: '1.0',
      project_version: '1.0',
      title: 'テストプロジェクト',
      description: 'エクスポート設定テスト用',
    },
    canvas: { width: 800, height: 600 },
    asset_attrs: {
      position_attrs: {},
      size_attrs: {},
    },
    assets: {},
    pages: []
  };

  describe('デフォルト設定の生成', () => {
    test('プロジェクトに基づくデフォルトエクスポート設定を生成する', () => {
      const defaultSettings = getDefaultExportSettings(mockProject);
      
      expect(defaultSettings.format).toBe('html');
      expect(defaultSettings.title).toBe('テストプロジェクト');
      expect(defaultSettings.width).toBe(800);
      expect(defaultSettings.height).toBe(600);
      expect(defaultSettings.quality).toBe(90);
      expect(defaultSettings.embedAssets).toBe(true);
    });

    test('HTMLエクスポート用のデフォルト設定を含む', () => {
      const defaultSettings = getDefaultExportSettings(mockProject);
      
      expect(defaultSettings.htmlOptions).toBeDefined();
      expect(defaultSettings.htmlOptions?.singleFile).toBe(true);
      expect(defaultSettings.htmlOptions?.includeNavigation).toBe(true);
      expect(defaultSettings.htmlOptions?.autoPlay).toBe(false);
    });

    test('SVGエクスポート用のデフォルト設定を含む', () => {
      const defaultSettings = getDefaultExportSettings(mockProject);
      
      expect(defaultSettings.svgOptions).toBeDefined();
      expect(defaultSettings.svgOptions?.separateFiles).toBe(true);
      expect(defaultSettings.svgOptions?.embedImages).toBe(true);
      expect(defaultSettings.svgOptions?.optimizeSize).toBe(false);
    });
  });

  describe('エクスポート設定の検証', () => {
    test('正しい設定を検証して成功する', () => {
      const validSettings: ExportOptions = {
        format: 'html',
        title: 'テストエクスポート',
        outputPath: '/test/output',
        width: 1024,
        height: 768,
        quality: 85,
        embedAssets: true,
        htmlOptions: {
          singleFile: true,
          includeNavigation: true,
          autoPlay: false
        }
      };

      const result = validateExportSettings(validSettings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('無効な画質設定を検出する', () => {
      const invalidSettings: ExportOptions = {
        format: 'html',
        title: 'テスト',
        outputPath: '/test',
        width: 800,
        height: 600,
        quality: 101, // 無効（0-100の範囲外）
        embedAssets: true
      };

      const result = validateExportSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('画質は0から100の間で設定してください');
    });

    test('無効な画像サイズを検出する', () => {
      const invalidSettings: ExportOptions = {
        format: 'svg',
        title: 'テスト',
        outputPath: '/test',
        width: 0, // 無効
        height: -100, // 無効
        quality: 90,
        embedAssets: true
      };

      const result = validateExportSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('幅は1以上で設定してください');
      expect(result.errors).toContain('高さは1以上で設定してください');
    });

    test('必須フィールドの不足を検出する', () => {
      const incompleteSettings: Partial<ExportOptions> = {
        format: 'html',
        // title, outputPath, width, height が不足
      };

      const result = validateExportSettings(incompleteSettings as ExportOptions);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('ExportSettingsManager クラス', () => {
    let manager: ExportSettingsManager;

    beforeEach(() => {
      manager = new ExportSettingsManager();
    });

    test('設定の作成と取得ができる', () => {
      const settings: ExportOptions = {
        format: 'html',
        title: 'テスト設定',
        outputPath: '/export/test',
        width: 1920,
        height: 1080,
        quality: 95,
        embedAssets: true
      };

      manager.setSettings(settings);
      const retrieved = manager.getSettings();
      
      expect(retrieved).toEqual(settings);
    });

    test('設定の部分更新ができる', () => {
      const initialSettings = getDefaultExportSettings(mockProject);
      manager.setSettings(initialSettings);

      manager.updateSettings({
        quality: 75,
        embedAssets: false
      });

      const updated = manager.getSettings();
      expect(updated.quality).toBe(75);
      expect(updated.embedAssets).toBe(false);
      expect(updated.format).toBe(initialSettings.format); // 他は変更されない
    });

    test('無効な設定更新を拒否する', () => {
      const validSettings = getDefaultExportSettings(mockProject);
      manager.setSettings(validSettings);

      expect(() => {
        manager.updateSettings({
          quality: 150 // 無効な値
        });
      }).toThrow();

      // 設定は変更されていない
      const current = manager.getSettings();
      expect(current.quality).toBe(validSettings.quality);
    });

    test('プリセット設定を適用できる', () => {
      manager.applyPreset('web-optimized');
      const settings = manager.getSettings();

      expect(settings.format).toBe('html');
      expect(settings.quality).toBe(80);
      expect(settings.embedAssets).toBe(true);
      expect(settings.htmlOptions?.singleFile).toBe(true);
    });

    test('異なるプリセット設定を提供する', () => {
      manager.applyPreset('high-quality');
      const highQualitySettings = manager.getSettings();

      manager.applyPreset('small-size');
      const smallSizeSettings = manager.getSettings();

      expect(highQualitySettings.quality).toBeGreaterThan(smallSizeSettings.quality);
    });

    test('エクスポート可能性をチェックできる', () => {
      const validSettings = getDefaultExportSettings(mockProject);
      manager.setSettings(validSettings);

      const canExport = manager.canExport(mockProject);
      expect(canExport).toBe(true);
    });

    test('空のプロジェクトのエクスポート可能性を正しく判定する', () => {
      const emptyProject: ProjectData = {
        ...mockProject,
        pages: []
      };

      const settings = getDefaultExportSettings(emptyProject);
      manager.setSettings(settings);

      const canExport = manager.canExport(emptyProject);
      expect(canExport).toBe(false); // ページがないのでエクスポート不可
    });
  });

  describe('プリセット設定', () => {
    test('利用可能なプリセット一覧を取得できる', () => {
      const manager = new ExportSettingsManager();
      const presets = manager.getAvailablePresets();

      expect(presets).toContain('web-optimized');
      expect(presets).toContain('high-quality');
      expect(presets).toContain('small-size');
      expect(presets).toContain('print-ready');
    });

    test('各プリセットに説明が含まれる', () => {
      const manager = new ExportSettingsManager();
      const presetInfo = manager.getPresetInfo('web-optimized');

      expect(presetInfo.name).toBe('web-optimized');
      expect(presetInfo.description).toBeDefined();
      expect(presetInfo.description.length).toBeGreaterThan(0);
    });
  });

  describe('設定の永続化', () => {
    test('設定をJSONとして出力できる', () => {
      const manager = new ExportSettingsManager();
      const settings = getDefaultExportSettings(mockProject);
      manager.setSettings(settings);

      const jsonString = manager.exportSettingsAsJson();
      const parsed = JSON.parse(jsonString);

      expect(parsed.format).toBe(settings.format);
      expect(parsed.title).toBe(settings.title);
    });

    test('JSONから設定を復元できる', () => {
      const originalSettings = getDefaultExportSettings(mockProject);
      const manager1 = new ExportSettingsManager();
      manager1.setSettings(originalSettings);

      const jsonString = manager1.exportSettingsAsJson();

      const manager2 = new ExportSettingsManager();
      manager2.importSettingsFromJson(jsonString);

      const restoredSettings = manager2.getSettings();
      expect(restoredSettings).toEqual(originalSettings);
    });

    test('無効なJSONからの復元でエラーを発生させる', () => {
      const manager = new ExportSettingsManager();

      expect(() => {
        manager.importSettingsFromJson('invalid json');
      }).toThrow();

      expect(() => {
        manager.importSettingsFromJson('{"invalid": "settings"}');
      }).toThrow();
    });
  });
});