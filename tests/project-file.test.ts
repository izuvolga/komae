// YAML プロジェクトファイル（project.komae）の保存・読み込み機能のテスト

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ProjectData } from '../src/types/entities';
import { mockProject } from './fixtures/sampleProject';

// テスト対象の関数
import { saveProjectFile, loadProjectFile, ProjectFileError } from '../src/utils/projectFile';

describe('YAML プロジェクトファイルの保存・読み込み', () => {
  let tempDir: string;
  
  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'komae-test-'));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  describe('saveProjectFile', () => {
    test('プロジェクトデータをYAML形式で保存できる', async () => {
      const filePath = path.join(tempDir, 'project.komae');
      const projectData = mockProject;

      await expect(saveProjectFile(filePath, projectData)).resolves.toBeUndefined();
      
      // ファイルが作成されたことを確認
      const stats = await fs.stat(filePath);
      expect(stats.isFile()).toBe(true);
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
      const filePath = path.join(tempDir, 'load-test.komae');
      
      // 先にファイルを保存
      await saveProjectFile(filePath, mockProject);

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
      const nonExistentPath = path.join(tempDir, 'nonexistent.komae');

      await expect(loadProjectFile(nonExistentPath)).rejects.toThrow(ProjectFileError);
    });

    test('不正なYAMLファイルでエラーが発生する', async () => {
      const invalidYamlPath = path.join(tempDir, 'invalid.komae');
      
      // 不正なYAMLファイルを作成
      await fs.writeFile(invalidYamlPath, 'invalid: yaml: content: [', 'utf8');

      await expect(loadProjectFile(invalidYamlPath)).rejects.toThrow(ProjectFileError);
    });

    test('不正なプロジェクト構造でエラーが発生する', async () => {
      const invalidStructurePath = path.join(tempDir, 'invalid-structure.komae');
      
      // 不正な構造のYAMLファイルを作成
      await fs.writeFile(invalidStructurePath, 'invalid_structure: true', 'utf8');

      await expect(loadProjectFile(invalidStructurePath)).rejects.toThrow(ProjectFileError);
    });
  });

  describe('YAML形式の確認', () => {
    test('配列形式のページ定義が正しく保存・読み込みされる', async () => {
      const filePath = path.join(tempDir, 'array-pages.komae');
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
      const filePath = path.join(tempDir, 'relative-paths.komae');
      
      await saveProjectFile(filePath, mockProject);
      const result = await loadProjectFile(filePath);

      const imageAsset = Object.values(result.assets).find(asset => asset.type === 'ImageAsset');
      const textAsset = Object.values(result.assets).find(asset => asset.type === 'TextAsset');

      if (imageAsset && imageAsset.type === 'ImageAsset') {
        expect(imageAsset.original_file_path).toMatch(/^assets\/images\//);
      }
      
      if (textAsset && textAsset.type === 'TextAsset') {
        expect(textAsset.default_settings?.fill_color).toBe('#ff0000');
      }
    });
  });

  describe('Zodバリデーション統合', () => {
    test('バリデーションエラーのあるプロジェクトファイルでエラーが発生する', async () => {
      const invalidProjectPath = path.join(tempDir, 'invalid-validation.komae');
      
      // バリデーションに引っかかるデータを作成（負のcanvas幅）
      const invalidProjectData = {
        metadata: {
          komae_version: '1.0',
          project_version: '1.0',
          title: 'Invalid Project'
        },
        canvas: {
          width: -100, // 負の値は無効
          height: 600
        },
        assets: {},
        pages: []
      };

      // 直接YAMLファイルを作成（Zodバリデーションを回避するため）
      const yamlContent = `
metadata:
  komae_version: "1.0"
  project_version: "1.0"
  title: "Invalid Project"
  supportedLanguages:
    - ja
  currentLanguage: ja
canvas:
  width: -100
  height: 600
assets: {}
pages: []
`;
      await fs.writeFile(invalidProjectPath, yamlContent, 'utf8');

      await expect(loadProjectFile(invalidProjectPath)).rejects.toThrow(ProjectFileError);
    });

    test('有効なプロジェクトデータは正常にバリデーションを通過する', async () => {
      const validProjectPath = path.join(tempDir, 'valid-validation.komae');
      
      // 有効なプロジェクトデータで保存
      await saveProjectFile(validProjectPath, mockProject);
      
      // 読み込みでもバリデーションが通過することを確認
      const result = await loadProjectFile(validProjectPath);
      
      expect(result).toBeDefined();
      expect(result.metadata.title).toBe(mockProject.metadata.title);
      expect(result.canvas.width).toBe(mockProject.canvas.width);
      expect(Array.isArray(result.pages)).toBe(true);
    });
  });
});
