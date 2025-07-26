// プロジェクトディレクトリの作成・管理機能のテスト

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { 
  createProjectDirectory, 
  validateProjectDirectory,
  getProjectFilePath,
  getAssetsDirectoryPath,
  ensureAssetsDirectories,
  ProjectDirectoryError 
} from '../src/utils/projectDirectory';

describe('プロジェクトディレクトリの作成・管理', () => {
  let tempDir: string;
  
  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'komae-project-test-'));
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  describe('createProjectDirectory', () => {
    test('新しいプロジェクトディレクトリを作成できる', async () => {
      const projectPath = path.join(tempDir, 'test-project.komae');
      
      await createProjectDirectory(projectPath);
      
      // ディレクトリが作成されたことを確認
      const stats = await fs.stat(projectPath);
      expect(stats.isDirectory()).toBe(true);
      
      // assets/ ディレクトリが作成されたことを確認
      const assetsPath = path.join(projectPath, 'assets');
      const assetsStats = await fs.stat(assetsPath);
      expect(assetsStats.isDirectory()).toBe(true);
      
      // assets/images/ ディレクトリが作成されたことを確認
      const imagesPath = path.join(assetsPath, 'images');
      const imagesStats = await fs.stat(imagesPath);
      expect(imagesStats.isDirectory()).toBe(true);
      
      // assets/fonts/ ディレクトリが作成されたことを確認
      const fontsPath = path.join(assetsPath, 'fonts');
      const fontsStats = await fs.stat(fontsPath);
      expect(fontsStats.isDirectory()).toBe(true);
    });

    test('既存のディレクトリがある場合はエラーが発生する', async () => {
      const projectPath = path.join(tempDir, 'existing-project.komae');
      
      // 先にディレクトリを作成
      await fs.mkdir(projectPath, { recursive: true });
      
      await expect(createProjectDirectory(projectPath)).rejects.toThrow(ProjectDirectoryError);
    });

    test('無効なパスでエラーが発生する', async () => {
      const invalidPath = '';
      
      await expect(createProjectDirectory(invalidPath)).rejects.toThrow(ProjectDirectoryError);
    });

    test('.komae 拡張子でない場合はエラーが発生する', async () => {
      const invalidPath = path.join(tempDir, 'invalid-project.txt');
      
      await expect(createProjectDirectory(invalidPath)).rejects.toThrow(ProjectDirectoryError);
    });
  });

  describe('validateProjectDirectory', () => {
    test('有効なプロジェクトディレクトリの検証が成功する', async () => {
      const projectPath = path.join(tempDir, 'valid-project.komae');
      
      // プロジェクトディレクトリを作成
      await createProjectDirectory(projectPath);
      
      // project.komae ファイルを作成
      const projectFilePath = path.join(projectPath, 'project.komae');
      await fs.writeFile(projectFilePath, 'metadata:\n  komae_version: "1.0"', 'utf8');
      
      await expect(validateProjectDirectory(projectPath)).resolves.toBe(true);
    });

    test('存在しないディレクトリでエラーが発生する', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.komae');
      
      await expect(validateProjectDirectory(nonExistentPath)).rejects.toThrow(ProjectDirectoryError);
    });

    test('project.komaee ファイルがない場合はエラーが発生する', async () => {
      const projectPath = path.join(tempDir, 'no-project-file.komae');
      
      // ディレクトリのみ作成（project.komae ファイルなし）
      await fs.mkdir(projectPath, { recursive: true });
      
      await expect(validateProjectDirectory(projectPath)).rejects.toThrow(ProjectDirectoryError);
    });

    test('assets/ ディレクトリがない場合はエラーが発生する', async () => {
      const projectPath = path.join(tempDir, 'no-assets-dir.komae');
      
      // ディレクトリとproject.komaeファイルのみ作成
      await fs.mkdir(projectPath, { recursive: true });
      const projectFilePath = path.join(projectPath, 'project.komae');
      await fs.writeFile(projectFilePath, 'metadata:\n  komae_version: "1.0"', 'utf8');
      
      await expect(validateProjectDirectory(projectPath)).rejects.toThrow(ProjectDirectoryError);
    });
  });

  describe('ヘルパー関数', () => {
    test('getProjectFilePath が正しいパスを返す', () => {
      const projectPath = '/path/to/project.komae';
      const expected = '/path/to/project.komae/project.komae';
      
      expect(getProjectFilePath(projectPath)).toBe(expected);
    });

    test('getAssetsDirectoryPath が正しいパスを返す', () => {
      const projectPath = '/path/to/project.komae';
      const expected = '/path/to/project.komae/assets';
      
      expect(getAssetsDirectoryPath(projectPath)).toBe(expected);
    });

    test('ensureAssetsDirectories でサブディレクトリが作成される', async () => {
      const projectPath = path.join(tempDir, 'ensure-assets.komae');
      await fs.mkdir(projectPath, { recursive: true });
      
      await ensureAssetsDirectories(projectPath);
      
      // assets/images/ が作成されたことを確認
      const imagesPath = path.join(projectPath, 'assets', 'images');
      const imagesStats = await fs.stat(imagesPath);
      expect(imagesStats.isDirectory()).toBe(true);
      
      // assets/fonts/ が作成されたことを確認
      const fontsPath = path.join(projectPath, 'assets', 'fonts');
      const fontsStats = await fs.stat(fontsPath);
      expect(fontsStats.isDirectory()).toBe(true);
    });
  });

  describe('ディレクトリ構造の確認', () => {
    test('作成されたディレクトリが正しい構造を持つ', async () => {
      const projectPath = path.join(tempDir, 'structure-test.komae');
      
      await createProjectDirectory(projectPath);
      
      // 期待される構造
      const expectedPaths = [
        projectPath,
        path.join(projectPath, 'assets'),
        path.join(projectPath, 'assets', 'images'),
        path.join(projectPath, 'assets', 'fonts')
      ];
      
      for (const expectedPath of expectedPaths) {
        const stats = await fs.stat(expectedPath);
        expect(stats.isDirectory()).toBe(true);
      }
    });
  });
});