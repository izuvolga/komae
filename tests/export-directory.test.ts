/**
 * エクスポート先ディレクトリ構造管理機能のユニットテスト
 * docs/design/export-directory-structure.md の仕様に基づく
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExportDirectoryManager, ExportDirectoryOptions, DirectoryValidationResult } from '../src/utils/exportDirectory';
import type { ExportFormat } from '../src/types/entities';

describe('ExportDirectoryManager', () => {
  const testBaseDir = path.join(__dirname, 'temp-export-test');
  let manager: ExportDirectoryManager;

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    try {
      await fs.mkdir(testBaseDir, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }
    manager = new ExportDirectoryManager();
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
  });

  describe('HTML形式のディレクトリ構造管理', () => {

    test('単一HTMLファイル用のディレクトリ構造を準備する', async () => {
      const options: ExportDirectoryOptions = {
        format: 'html',
        outputPath: path.join(testBaseDir, 'output'),
        projectName: 'test-project',
        overwriteExisting: true
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(path.join(testBaseDir, 'output', 'test-project.html'));
      
      // 親ディレクトリが作成されていることを確認
      const parentDir = path.dirname(result.outputPath);
      const stats = await fs.stat(parentDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('既存のHTMLファイルを上書きできる', async () => {
      const outputPath = path.join(testBaseDir, 'output');
      const htmlPath = path.join(outputPath, 'existing-project.html');
      
      // 既存のHTMLファイルを作成
      await fs.mkdir(outputPath, { recursive: true });
      await fs.writeFile(htmlPath, '<html>existing content</html>');

      const options: ExportDirectoryOptions = {
        format: 'html',
        outputPath,
        projectName: 'existing-project',
        overwriteExisting: true
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(htmlPath);
    });

    test('既存のHTMLファイルを上書きしない設定で競合を検出する', async () => {
      const outputPath = path.join(testBaseDir, 'output');
      const htmlPath = path.join(outputPath, 'conflict-project.html');
      
      // 既存のHTMLファイルを作成
      await fs.mkdir(outputPath, { recursive: true });
      await fs.writeFile(htmlPath, '<html>existing content</html>');

      const options: ExportDirectoryOptions = {
        format: 'html',
        outputPath,
        projectName: 'conflict-project',
        overwriteExisting: false
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('既存のファイルが存在します');
      expect(result.conflictingPaths).toContain(htmlPath);
    });

    test('無効な出力パスでエラーを返す', async () => {
      const options: ExportDirectoryOptions = {
        format: 'html',
        outputPath: '/invalid/path/that/cannot/be/created',
        projectName: 'test-project',
        overwriteExisting: true
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('PNG形式のディレクトリ構造管理', () => {

    test('PNG出力用のプロジェクトディレクトリを作成する', async () => {
      const options: ExportDirectoryOptions = {
        format: 'png',
        outputPath: path.join(testBaseDir, 'png-output'),
        projectName: 'png-project',
        overwriteExisting: true,
        pageCount: 5
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(path.join(testBaseDir, 'png-output', 'png-project'));
      
      // プロジェクトディレクトリが作成されていることを確認
      const stats = await fs.stat(result.outputPath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('既存のPNGプロジェクトディレクトリをクリーンアップする', async () => {
      const outputPath = path.join(testBaseDir, 'png-output');
      const projectDir = path.join(outputPath, 'existing-png-project');
      
      // 既存のプロジェクトディレクトリとファイルを作成
      await fs.mkdir(projectDir, { recursive: true });
      await fs.writeFile(path.join(projectDir, '1.png'), 'old png data');
      await fs.writeFile(path.join(projectDir, '2.png'), 'old png data');
      await fs.writeFile(path.join(projectDir, 'extra.txt'), 'extra file');

      const options: ExportDirectoryOptions = {
        format: 'png',
        outputPath,
        projectName: 'existing-png-project',
        overwriteExisting: true,
        pageCount: 3
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(true);
      
      // ディレクトリは存在するが、中身はクリーンアップされている
      const stats = await fs.stat(result.outputPath);
      expect(stats.isDirectory()).toBe(true);
      
      const files = await fs.readdir(result.outputPath);
      expect(files).toHaveLength(0); // 既存ファイルが削除されている
    });

    test('既存のPNGプロジェクトディレクトリを上書きしない設定で競合を検出する', async () => {
      const outputPath = path.join(testBaseDir, 'png-output');
      const projectDir = path.join(outputPath, 'conflict-png-project');
      
      // 既存のプロジェクトディレクトリを作成
      await fs.mkdir(projectDir, { recursive: true });
      await fs.writeFile(path.join(projectDir, '1.png'), 'existing png');

      const options: ExportDirectoryOptions = {
        format: 'png',
        outputPath,
        projectName: 'conflict-png-project',
        overwriteExisting: false,
        pageCount: 2
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('既存のディレクトリが存在します');
      expect(result.conflictingPaths).toContain(projectDir);
    });

    test('PNGページファイルの予想パスを提供する', async () => {
      const options: ExportDirectoryOptions = {
        format: 'png',
        outputPath: path.join(testBaseDir, 'png-output'),
        projectName: 'page-test',
        overwriteExisting: true,
        pageCount: 3
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(true);
      expect(result.expectedPagePaths).toBeDefined();
      expect(result.expectedPagePaths).toHaveLength(3);
      expect(result.expectedPagePaths![0]).toBe(path.join(result.outputPath, '1.png'));
      expect(result.expectedPagePaths![1]).toBe(path.join(result.outputPath, '2.png'));
      expect(result.expectedPagePaths![2]).toBe(path.join(result.outputPath, '3.png'));
    });
  });

  describe('ディレクトリ検証機能', () => {

    test('有効な出力パスを正しく検証する', async () => {
      const validPath = path.join(testBaseDir, 'valid-output');
      
      const result = await manager.validateOutputPath(validPath);

      expect(result.isValid).toBe(true);
      expect(result.canWrite).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('既存ファイルとの名前衝突を検出する', async () => {
      const outputPath = path.join(testBaseDir, 'collision-test');
      const conflictFile = path.join(outputPath, 'conflict.html');
      
      // 既存ファイルを作成
      await fs.mkdir(outputPath, { recursive: true });
      await fs.writeFile(conflictFile, 'existing file');

      const result = await manager.validateOutputPath(outputPath, {
        expectedFiles: ['conflict.html']
      });

      expect(result.isValid).toBe(false);
      expect(result.hasConflicts).toBe(true);
      expect(result.conflictingItems).toContain('conflict.html');
    });

    test('書き込み権限がない場合のエラーを検出する', async () => {
      // このテストは実際の権限設定が困難なため、スキップまたはモック化
      // 代わりに、存在しないパスでの検証テストを行う
      const invalidPath = '/root/no-permission-path';

      const result = await manager.validateOutputPath(invalidPath);

      // 権限エラーまたはパス無効エラーが発生することを期待
      expect(result.isValid).toBe(false);
    });
  });

  describe('ユーティリティ機能', () => {

    test('プロジェクト名から有効なファイル名を生成する', () => {
      const unsafeNames = [
        'プロジェクト<>:"/\\|?*名前',
        'project with spaces',
        '日本語プロジェクト',
        'UPPER_case_project'
      ];

      unsafeNames.forEach(unsafeName => {
        const safeName = manager.sanitizeFileName(unsafeName);
        
        expect(safeName).not.toMatch(/[<>:"/\\|?*]/);
        expect(safeName.length).toBeGreaterThan(0);
      });
    });

    test('ファイル拡張子に応じた適切なファイル名を生成する', () => {
      const htmlFileName = manager.generateOutputFileName('test-project', 'html');
      const pngDirName = manager.generateOutputFileName('test-project', 'png');

      expect(htmlFileName).toBe('test-project.html');
      expect(pngDirName).toBe('test-project'); // PNGの場合はディレクトリ名
    });

    test('エクスポート完了後のクリーンアップができる', async () => {
      const tempDir = path.join(testBaseDir, 'cleanup-test');
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(path.join(tempDir, 'temp.txt'), 'temporary file');

      await manager.cleanupTemporaryFiles(tempDir);

      // 一時ファイルが削除されていることを確認
      const exists = await fs.access(path.join(tempDir, 'temp.txt')).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {

    test('不正なエクスポート形式でエラーを返す', async () => {
      const options: ExportDirectoryOptions = {
        format: 'invalid-format' as ExportFormat,
        outputPath: path.join(testBaseDir, 'output'),
        projectName: 'test',
        overwriteExisting: true
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('サポートされていないエクスポート形式');
    });

    test('空のプロジェクト名でエラーを返す', async () => {
      const options: ExportDirectoryOptions = {
        format: 'html',
        outputPath: path.join(testBaseDir, 'output'),
        projectName: '',
        overwriteExisting: true
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('プロジェクト名は必須です');
    });

    test('PNG形式でページ数が指定されていない場合のエラー', async () => {
      const options: ExportDirectoryOptions = {
        format: 'png',
        outputPath: path.join(testBaseDir, 'output'),
        projectName: 'test-project',
        overwriteExisting: true
        // pageCount が不足
      };

      const result = await manager.prepareExportDirectory(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PNG形式ではページ数 (pageCount) が必要です');
    });
  });

  describe('統合テスト', () => {

    test('HTML形式の完全なエクスポートフロー', async () => {
      const options: ExportDirectoryOptions = {
        format: 'html',
        outputPath: path.join(testBaseDir, 'integration-html'),
        projectName: 'integration-test',
        overwriteExisting: true
      };

      // 1. ディレクトリ準備
      const prepareResult = await manager.prepareExportDirectory(options);
      expect(prepareResult.success).toBe(true);

      // 2. ファイル書き込みシミュレーション
      await fs.writeFile(prepareResult.outputPath, '<html><body>Test Export</body></html>');

      // 3. ファイルが正しく作成されたことを確認
      const content = await fs.readFile(prepareResult.outputPath, 'utf-8');
      expect(content).toContain('Test Export');
    });

    test('PNG形式の完全なエクスポートフロー', async () => {
      const options: ExportDirectoryOptions = {
        format: 'png',
        outputPath: path.join(testBaseDir, 'integration-png'),
        projectName: 'integration-test',
        overwriteExisting: true,
        pageCount: 2
      };

      // 1. ディレクトリ準備
      const prepareResult = await manager.prepareExportDirectory(options);
      expect(prepareResult.success).toBe(true);

      // 2. PNGファイル書き込みシミュレーション
      const pagePaths = prepareResult.expectedPagePaths!;
      for (const pagePath of pagePaths) {
        await fs.writeFile(pagePath, 'fake png data');
      }

      // 3. ファイルが正しく作成されたことを確認
      for (const pagePath of pagePaths) {
        const exists = await fs.access(pagePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });
});