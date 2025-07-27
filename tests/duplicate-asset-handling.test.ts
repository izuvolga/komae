/**
 * Tests for duplicate asset name handling
 * 
 * 重複アセット名のハンドリング機能のテスト
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { 
  detectDuplicateAssetName,
  generateUniqueAssetName,
  resolveDuplicateAssetConflict,
  DuplicateResolutionStrategy
} from '../src/utils/duplicateAssetHandler';
import { ProjectData } from '../src/types/entities';

describe('Duplicate Asset Handling', () => {
  let tempDir: string;
  let mockProject: ProjectData;

  beforeEach(async () => {
    // テスト用一時ディレクトリを作成
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'komae-test-duplicate-'));
    
    // モックプロジェクトデータ
    mockProject = {
      metadata: {
        komae_version: '1.0',
        project_version: '1.0',
        title: 'Test Project',
        description: 'Test project for duplicate handling',
      },
      canvas: {
        width: 800,
        height: 600,
      },
      asset_attrs: {
        position_attrs: {},
        size_attrs: {},
      },
      assets: {
        'img-1': {
          id: 'img-1',
          type: 'ImageAsset',
          name: 'sample',
          original_file_path: 'assets/images/sample.png',
          original_width: 800,
          original_height: 600,
          default_pos_x: 0,
          default_pos_y: 0,
          default_scale_x: 1,
          default_scale_y: 1,
        },
        'img-2': {
          id: 'img-2',
          type: 'ImageAsset',
          name: 'background',
          original_file_path: 'assets/images/background.jpg',
          original_width: 1920,
          original_height: 1080,
          default_pos_x: 0,
          default_pos_y: 0,
          default_scale_x: 1,
          default_scale_y: 1,
        },
      },
      pages: [],
    };
  });

  afterEach(async () => {
    // テスト用ディレクトリを削除
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('detectDuplicateAssetName', () => {
    it('should detect duplicate asset names', () => {
      const result = detectDuplicateAssetName('sample', mockProject);
      expect(result.isDuplicate).toBe(true);
      expect(result.existingAsset).toBeDefined();
      expect(result.existingAsset?.name).toBe('sample');
    });

    it('should not detect duplicates for unique names', () => {
      const result = detectDuplicateAssetName('unique_name', mockProject);
      expect(result.isDuplicate).toBe(false);
      expect(result.existingAsset).toBeUndefined();
    });

    it('should be case-sensitive for duplicate detection', () => {
      const result1 = detectDuplicateAssetName('Sample', mockProject);
      const result2 = detectDuplicateAssetName('SAMPLE', mockProject);
      
      expect(result1.isDuplicate).toBe(false);
      expect(result2.isDuplicate).toBe(false);
    });
  });

  describe('generateUniqueAssetName', () => {
    it('should generate unique name for first duplicate', () => {
      const uniqueName = generateUniqueAssetName('sample', mockProject);
      expect(uniqueName).toBe('sample_1');
    });

    it('should generate incremental names for multiple duplicates', () => {
      // 追加のダミーアセットでsample_1も存在する状況を作成
      mockProject.assets['img-3'] = {
        id: 'img-3',
        type: 'ImageAsset',
        name: 'sample_1',
        original_file_path: 'assets/images/sample_1.png',
        original_width: 800,
        original_height: 600,
        default_pos_x: 0,
        default_pos_y: 0,
        default_scale_x: 1,
        default_scale_y: 1,
      };

      const uniqueName = generateUniqueAssetName('sample', mockProject);
      expect(uniqueName).toBe('sample_2');
    });

    it('should handle edge case with gaps in numbering', () => {
      // sample_1, sample_3 が存在するが sample_2 が存在しない場合
      mockProject.assets['img-3'] = {
        id: 'img-3',
        type: 'ImageAsset',
        name: 'sample_1',
        original_file_path: 'assets/images/sample_1.png',
        original_width: 800,
        original_height: 600,
        default_pos_x: 0,
        default_pos_y: 0,
        default_scale_x: 1,
        default_scale_y: 1,
      };
      
      mockProject.assets['img-4'] = {
        id: 'img-4',
        type: 'ImageAsset',
        name: 'sample_3',
        original_file_path: 'assets/images/sample_3.png',
        original_width: 800,
        original_height: 600,
        default_pos_x: 0,
        default_pos_y: 0,
        default_scale_x: 1,
        default_scale_y: 1,
      };

      const uniqueName = generateUniqueAssetName('sample', mockProject);
      expect(uniqueName).toBe('sample_2');
    });

    it('should return original name if no duplicates exist', () => {
      const uniqueName = generateUniqueAssetName('unique_name', mockProject);
      expect(uniqueName).toBe('unique_name');
    });
  });

  describe('resolveDuplicateAssetConflict', () => {
    const newAssetInfo = {
      name: 'sample',
      filePath: '/path/to/sample.png',
      type: 'image' as const,
    };

    it('should resolve with RENAME strategy', async () => {
      const result = await resolveDuplicateAssetConflict(
        newAssetInfo,
        mockProject,
        DuplicateResolutionStrategy.RENAME
      );

      expect(result.resolvedName).toBe('sample_1');
      expect(result.strategy).toBe(DuplicateResolutionStrategy.RENAME);
      expect(result.originalName).toBe('sample');
    });

    it('should resolve with REPLACE strategy', async () => {
      const result = await resolveDuplicateAssetConflict(
        newAssetInfo,
        mockProject,
        DuplicateResolutionStrategy.REPLACE
      );

      expect(result.resolvedName).toBe('sample');
      expect(result.strategy).toBe(DuplicateResolutionStrategy.REPLACE);
      expect(result.shouldReplaceExisting).toBe(true);
    });

    it('should resolve with CANCEL strategy', async () => {
      const result = await resolveDuplicateAssetConflict(
        newAssetInfo,
        mockProject,
        DuplicateResolutionStrategy.CANCEL
      );

      expect(result.strategy).toBe(DuplicateResolutionStrategy.CANCEL);
      expect(result.shouldCancel).toBe(true);
    });

    it('should resolve with AUTO_RENAME strategy', async () => {
      const result = await resolveDuplicateAssetConflict(
        newAssetInfo,
        mockProject,
        DuplicateResolutionStrategy.AUTO_RENAME
      );

      expect(result.resolvedName).toBe('sample_1');
      expect(result.strategy).toBe(DuplicateResolutionStrategy.AUTO_RENAME);
      expect(result.wasAutoRenamed).toBe(true);
    });

    it('should handle no duplicates gracefully', async () => {
      const uniqueAssetInfo = {
        name: 'unique_asset',
        filePath: '/path/to/unique_asset.png',
        type: 'image' as const,
      };

      const result = await resolveDuplicateAssetConflict(
        uniqueAssetInfo,
        mockProject,
        DuplicateResolutionStrategy.RENAME
      );

      expect(result.resolvedName).toBe('unique_asset');
      expect(result.originalName).toBe('unique_asset');
      expect(result.wasAutoRenamed).toBe(false);
    });
  });

  describe('Integration with existing asset management', () => {
    it('should maintain consistency with asset name patterns', () => {
      // 既存のアセット管理との整合性確認
      const baseName = 'test-asset_with-special.chars';
      const uniqueName = generateUniqueAssetName(baseName, mockProject);
      
      // 重複していない場合は元の名前をそのまま返す
      expect(uniqueName).toBe('test-asset_with-special.chars');
      expect(uniqueName).toMatch(/^[\w\-\.]+$/);
    });

    it('should handle very long asset names', () => {
      const longName = 'a'.repeat(200); // 非常に長いアセット名
      const uniqueName = generateUniqueAssetName(longName, mockProject);
      
      // 重複していない場合は元の名前をそのまま返す
      expect(uniqueName).toBe(longName);
      expect(uniqueName.length).toBe(200);
    });

    it('should handle Unicode characters in asset names', () => {
      const unicodeName = '画像アセット_テスト';
      const uniqueName = generateUniqueAssetName(unicodeName, mockProject);
      
      // 重複していない場合は元の名前をそのまま返す
      expect(uniqueName).toBe('画像アセット_テスト');
    });
  });
});