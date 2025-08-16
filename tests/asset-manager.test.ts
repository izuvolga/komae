// 相対パス解決とアセットファイル管理機能のテスト

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { 
  resolveAssetPath,
  makeAssetPathRelative,
  copyAssetToProject,
  validateAssetFile,
  getAssetTypeFromExtension,
  deleteAssetFromProject,
  AssetManagerError 
} from '../src/utils/assetManager';

describe('相対パス解決とアセットファイル管理', () => {
  let tempDir: string;
  let projectDir: string;
  let testImageFile: string;
  
  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'komae-asset-test-'));
    projectDir = path.join(tempDir, 'test-project.komae');
    
    // プロジェクトディレクトリ構造を作成
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'images'), { recursive: true });
    
    // テスト用のアセットファイルを作成
    testImageFile = path.join(tempDir, 'test-image.png');
    
    await fs.writeFile(testImageFile, 'fake image data', 'utf8');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  describe('resolveAssetPath', () => {
    test('相対パスを絶対パスに変換できる', () => {
      const relativePath = 'assets/images/sample.png';
      const expectedPath = path.join(projectDir, 'assets', 'images', 'sample.png');
      
      const result = resolveAssetPath(projectDir, relativePath);
      expect(result).toBe(expectedPath);
    });

    test('既に絶対パスの場合はそのまま返す', () => {
      const absolutePath = path.join(projectDir, 'assets', 'images', 'sample.png');
      
      const result = resolveAssetPath(projectDir, absolutePath);
      expect(result).toBe(absolutePath);
    });

    test('無効なパスでエラーが発生する', () => {
      const invalidPath = '';
      
      expect(() => resolveAssetPath(projectDir, invalidPath)).toThrow(AssetManagerError);
    });
  });

  describe('makeAssetPathRelative', () => {
    test('絶対パスを相対パスに変換できる', () => {
      const absolutePath = path.join(projectDir, 'assets', 'images', 'sample.png');
      const expectedRelative = 'assets/images/sample.png';
      
      const result = makeAssetPathRelative(projectDir, absolutePath);
      expect(result).toBe(expectedRelative);
    });

    test('プロジェクト外のパスでエラーが発生する', () => {
      const outsidePath = path.join(tempDir, 'outside.png');
      
      expect(() => makeAssetPathRelative(projectDir, outsidePath)).toThrow(AssetManagerError);
    });

    test('既に相対パスの場合はそのまま返す', () => {
      const relativePath = 'assets/images/sample.png';
      
      const result = makeAssetPathRelative(projectDir, relativePath);
      expect(result).toBe(relativePath);
    });
  });

  describe('copyAssetToProject', () => {
    test('画像ファイルをプロジェクトにコピーできる', async () => {
      const result = await copyAssetToProject(projectDir, testImageFile, 'images');
      
      expect(result.startsWith('assets/images/')).toBe(true);
      expect(result.endsWith('.png')).toBe(true);
      
      // ファイルがコピーされたことを確認
      const copiedPath = path.join(projectDir, result);
      const stats = await fs.stat(copiedPath);
      expect(stats.isFile()).toBe(true);
    });


    test('存在しないソースファイルでエラーが発生する', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.png');
      
      await expect(copyAssetToProject(projectDir, nonExistentFile, 'images')).rejects.toThrow(AssetManagerError);
    });

    test('無効なアセットタイプでエラーが発生する', async () => {
      await expect(copyAssetToProject(projectDir, testImageFile, 'invalid' as any)).rejects.toThrow(AssetManagerError);
    });

    test('同名ファイルがある場合は連番を付ける', async () => {
      // 同じファイルを2回コピー
      const firstResult = await copyAssetToProject(projectDir, testImageFile, 'images');
      const secondResult = await copyAssetToProject(projectDir, testImageFile, 'images');
      
      expect(firstResult).not.toBe(secondResult);
      expect(secondResult).toMatch(/_\d+\.png$/); // 連番が付いていることを確認
    });
  });

  describe('validateAssetFile', () => {
    test('有効な画像ファイルの検証が成功する', async () => {
      await expect(validateAssetFile(testImageFile, 'image')).resolves.toBe(true);
    });


    test('存在しないファイルでエラーが発生する', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.png');
      
      await expect(validateAssetFile(nonExistentFile, 'image')).rejects.toThrow(AssetManagerError);
    });

  });

  describe('getAssetTypeFromExtension', () => {
    test('画像拡張子から正しいタイプを取得できる', () => {
      expect(getAssetTypeFromExtension('.png')).toBe('image');
      expect(getAssetTypeFromExtension('.jpg')).toBe('image');
      expect(getAssetTypeFromExtension('.jpeg')).toBe('image');
      expect(getAssetTypeFromExtension('.gif')).toBe('image');
      expect(getAssetTypeFromExtension('.webp')).toBe('image');
    });


    test('大文字小文字を区別しない', () => {
      expect(getAssetTypeFromExtension('.PNG')).toBe('image');
      expect(getAssetTypeFromExtension('.SVG')).toBe('vector');
    });

    test('サポートされていない拡張子でエラーが発生する', () => {
      expect(() => getAssetTypeFromExtension('.txt')).toThrow(AssetManagerError);
      expect(() => getAssetTypeFromExtension('.doc')).toThrow(AssetManagerError);
    });
  });

  describe('deleteAssetFromProject', () => {
    test('コピーしたアセットファイルを削除できる', async () => {
      // まずファイルをコピー
      const relativePath = await copyAssetToProject(projectDir, testImageFile, 'images');
      const absolutePath = resolveAssetPath(projectDir, relativePath);
      
      // ファイルが存在することを確認
      const statsBefore = await fs.stat(absolutePath);
      expect(statsBefore.isFile()).toBe(true);
      
      // ファイルを削除
      await deleteAssetFromProject(projectDir, relativePath);
      
      // ファイルが削除されたことを確認
      await expect(fs.stat(absolutePath)).rejects.toThrow();
    });

    test('存在しないファイルの削除でエラーが発生する', async () => {
      const nonExistentPath = 'assets/images/nonexistent.png';
      
      await expect(deleteAssetFromProject(projectDir, nonExistentPath)).rejects.toThrow(AssetManagerError);
    });

    test('プロジェクト外のパスでエラーが発生する', async () => {
      const outsidePath = '../outside.png';
      
      await expect(deleteAssetFromProject(projectDir, outsidePath)).rejects.toThrow(AssetManagerError);
    });

    test('絶対パスでもファイル削除できる', async () => {
      // まずファイルをコピー
      const relativePath = await copyAssetToProject(projectDir, testImageFile, 'images');
      const absolutePath = resolveAssetPath(projectDir, relativePath);
      
      // 絶対パスで削除
      await deleteAssetFromProject(projectDir, absolutePath);
      
      // ファイルが削除されたことを確認
      await expect(fs.stat(absolutePath)).rejects.toThrow();
    });

  });

  describe('パス処理の統合テスト', () => {
    test('ファイルコピー後に相対パス化ができる', async () => {
      const copiedRelativePath = await copyAssetToProject(projectDir, testImageFile, 'images');
      const absolutePath = resolveAssetPath(projectDir, copiedRelativePath);
      const backToRelative = makeAssetPathRelative(projectDir, absolutePath);
      
      expect(backToRelative).toBe(copiedRelativePath);
    });

    test('プロジェクト内外のパス操作が正しく動作する', () => {
      const insidePath = path.join(projectDir, 'assets', 'images', 'test.png');
      const outsidePath = path.join(tempDir, 'outside.png');
      
      // プロジェクト内パスは相対パス化できる
      expect(() => makeAssetPathRelative(projectDir, insidePath)).not.toThrow();
      
      // プロジェクト外パスは相対パス化できない
      expect(() => makeAssetPathRelative(projectDir, outsidePath)).toThrow(AssetManagerError);
    });

    test('ファイルのコピーと削除のライフサイクル', async () => {
      // ファイルをコピー
      const relativePath = await copyAssetToProject(projectDir, testImageFile, 'images');
      const absolutePath = resolveAssetPath(projectDir, relativePath);
      
      // ファイルが存在することを確認
      const statsBefore = await fs.stat(absolutePath);
      expect(statsBefore.isFile()).toBe(true);
      
      // ファイルを削除
      await deleteAssetFromProject(projectDir, relativePath);
      
      // ファイルが削除されたことを確認
      await expect(fs.stat(absolutePath)).rejects.toThrow();
      
      // 同じファイルを再度コピーできることを確認
      const newRelativePath = await copyAssetToProject(projectDir, testImageFile, 'images');
      const newAbsolutePath = resolveAssetPath(projectDir, newRelativePath);
      const statsAfter = await fs.stat(newAbsolutePath);
      expect(statsAfter.isFile()).toBe(true);
    });
  });
});