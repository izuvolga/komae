// Zodスキーマによるプロジェクトデータバリデーションのテスト

import { mockProject, mockImageAsset, mockTextAsset, mockPage } from './fixtures/sampleProject';
import { 
  validateProjectData, 
  validateAsset, 
  validatePage,
  ValidationError 
} from '../src/utils/validation';

describe('Zodスキーマによるデータバリデーション', () => {
  
  describe('validateProjectData', () => {
    test('有効なプロジェクトデータのバリデーションが成功する', () => {
      expect(() => validateProjectData(mockProject)).not.toThrow();
      
      const result = validateProjectData(mockProject);
      expect(result).toEqual(mockProject);
    });

    test('metadataが不正な場合にValidationErrorが発生する', () => {
      const invalidProject = {
        ...mockProject,
        metadata: {
          ...mockProject.metadata,
          komae_version: '', // 空文字列は無効
        }
      };

      expect(() => validateProjectData(invalidProject)).toThrow(ValidationError);
    });

    test('canvasが不正な場合にValidationErrorが発生する', () => {
      const invalidProject = {
        ...mockProject,
        canvas: {
          width: -100, // 負の値は無効
          height: 600
        }
      };

      expect(() => validateProjectData(invalidProject)).toThrow(ValidationError);
    });

    test('pagesが配列でない場合にValidationErrorが発生する', () => {
      const invalidProject = {
        ...mockProject,
        pages: {} // 配列である必要がある
      };

      expect(() => validateProjectData(invalidProject)).toThrow(ValidationError);
    });

    test('必須フィールドが欠如している場合にValidationErrorが発生する', () => {
      const invalidProject = {
        metadata: mockProject.metadata,
        canvas: mockProject.canvas,
        assets: mockProject.assets,
        // pages フィールドが欠如
      };

      expect(() => validateProjectData(invalidProject as any)).toThrow(ValidationError);
    });
  });

  describe('validateAsset', () => {
    test('有効なImageAssetのバリデーションが成功する', () => {
      expect(() => validateAsset(mockImageAsset)).not.toThrow();
      
      const result = validateAsset(mockImageAsset);
      expect(result).toEqual(mockImageAsset);
    });

    test('有効なTextAssetのバリデーションが成功する', () => {
      expect(() => validateAsset(mockTextAsset)).not.toThrow();
      
      const result = validateAsset(mockTextAsset);
      expect(result).toEqual(mockTextAsset);
    });

    test('不正なAssetタイプでValidationErrorが発生する', () => {
      const invalidAsset = {
        ...mockImageAsset,
        type: 'InvalidAsset' // 無効なタイプ
      };

      expect(() => validateAsset(invalidAsset as any)).toThrow(ValidationError);
    });

    test('ImageAssetで必須フィールドが欠如している場合にValidationErrorが発生する', () => {
      const invalidAsset = {
        ...mockImageAsset,
        original_width: undefined // 必須フィールドが欠如
      };

      expect(() => validateAsset(invalidAsset as any)).toThrow(ValidationError);
    });

    test('TextAssetで不正なフォントサイズでValidationErrorが発生する', () => {
      const invalidAsset = {
        ...mockTextAsset,
        default_language_settings: {
          'ja': {
            override_font_size: -10 // 負の値は無効
          }
        }
      };

      expect(() => validateAsset(invalidAsset as any)).toThrow(ValidationError);
    });
  });

  describe('validatePage', () => {
    test('有効なPageのバリデーションが成功する', () => {
      expect(() => validatePage(mockPage)).not.toThrow();
      
      const result = validatePage(mockPage);
      expect(result).toEqual(mockPage);
    });

    test('不正なページIDでValidationErrorが発生する', () => {
      const invalidPage = {
        ...mockPage,
        id: '' // 空文字列は無効
      };

      expect(() => validatePage(invalidPage as any)).toThrow(ValidationError);
    });

    test('asset_instancesが不正な場合にValidationErrorが発生する', () => {
      const invalidPage = {
        ...mockPage,
        asset_instances: 'invalid' // オブジェクトである必要がある
      };

      expect(() => validatePage(invalidPage as any)).toThrow(ValidationError);
    });
  });

  describe('ネストされたバリデーション', () => {
    test('プロジェクト内のアセットバリデーションが正しく動作する', () => {
      const projectWithInvalidAsset = {
        ...mockProject,
        assets: {
          'invalid-asset': {
            id: 'invalid-asset',
            type: 'InvalidType', // 無効なタイプ
            name: 'Invalid Asset'
          }
        }
      };

      expect(() => validateProjectData(projectWithInvalidAsset as any)).toThrow(ValidationError);
    });

    test('プロジェクト内のページバリデーションが正しく動作する', () => {
      const projectWithInvalidPage = {
        ...mockProject,
        pages: [
          {
            id: '', // 無効なID
            title: 'Invalid Page',
            asset_instances: {}
          }
        ]
      };

      expect(() => validateProjectData(projectWithInvalidPage as any)).toThrow(ValidationError);
    });
  });
});