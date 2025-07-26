// YAML プロジェクトファイル（project.komae）の保存・読み込み機能のテスト

import { ProjectData } from '../src/types/entities';
import { mockProject } from './fixtures/sampleProject';

// テスト対象の関数（まだ実装されていない）
import { saveProjectFile, loadProjectFile, ProjectFileError } from '../src/utils/projectFile';

describe('YAML プロジェクトファイルの保存・読み込み', () => {
  
  describe('saveProjectFile', () => {
    test('プロジェクトデータをYAML形式で保存できる', async () => {
      const filePath = '/test/project.komae';
      const projectData = mockProject;

      await expect(saveProjectFile(filePath, projectData)).resolves.toBeUndefined();
    });

    test('無効なファイルパスでエラーが発生する', async () => {
      const invalidPath = '';
      const projectData = mockProject;

      await expect(saveProjectFile(invalidPath, projectData)).rejects.toThrow(ProjectFileError);
    });

    test('無効なプロジェクトデータでエラーが発生する', async () => {
      const filePath = '/test/project.komae';
      const invalidData = null as any;

      await expect(saveProjectFile(filePath, invalidData)).rejects.toThrow(ProjectFileError);
    });
  });

  describe('loadProjectFile', () => {
    test('YAMLファイルからプロジェクトデータを読み込める', async () => {
      const filePath = '/test/project.komae';

      const result = await loadProjectFile(filePath);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.komae_version).toBe('1.0');
      expect(result.metadata.project_version).toBe('1.0');
      expect(result.canvas).toBeDefined();
      expect(result.assets).toBeDefined();
      expect(result.pages).toBeDefined();
      expect(Array.isArray(result.pages)).toBe(true);
    });

    test('存在しないファイルでエラーが発生する', async () => {
      const nonExistentPath = '/test/nonexistent.komae';

      await expect(loadProjectFile(nonExistentPath)).rejects.toThrow(ProjectFileError);
    });

    test('不正なYAMLファイルでエラーが発生する', async () => {
      const invalidYamlPath = '/test/invalid.komae';

      await expect(loadProjectFile(invalidYamlPath)).rejects.toThrow(ProjectFileError);
    });

    test('不正なプロジェクト構造でエラーが発生する', async () => {
      const invalidStructurePath = '/test/invalid-structure.komae';

      await expect(loadProjectFile(invalidStructurePath)).rejects.toThrow(ProjectFileError);
    });
  });

  describe('YAML形式の確認', () => {
    test('配列形式のページ定義が正しく保存・読み込みされる', async () => {
      const filePath = '/test/array-pages.komae';
      const projectWithArrayPages: ProjectData = {
        ...mockProject,
        pages: [
          {
            id: 'page-001',
            title: 'ページ1',
            asset_instances: {}
          },
          {
            id: 'page-002', 
            title: 'ページ2',
            asset_instances: {}
          }
        ]
      };

      await saveProjectFile(filePath, projectWithArrayPages);
      const result = await loadProjectFile(filePath);

      expect(Array.isArray(result.pages)).toBe(true);
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].id).toBe('page-001');
      expect(result.pages[0].title).toBe('ページ1');
      expect(result.pages[1].id).toBe('page-002');
      expect(result.pages[1].title).toBe('ページ2');
    });

    test('相対パスのアセットファイル参照が保持される', async () => {
      const filePath = '/test/relative-paths.komae';
      
      await saveProjectFile(filePath, mockProject);
      const result = await loadProjectFile(filePath);

      const imageAsset = Object.values(result.assets).find(asset => asset.type === 'ImageAsset');
      const textAsset = Object.values(result.assets).find(asset => asset.type === 'TextAsset');

      if (imageAsset && imageAsset.type === 'ImageAsset') {
        expect(imageAsset.original_file_path).toMatch(/^assets\/images\//);
      }
      
      if (textAsset && textAsset.type === 'TextAsset') {
        expect(textAsset.font).toMatch(/^assets\/fonts\//);
      }
    });
  });
});