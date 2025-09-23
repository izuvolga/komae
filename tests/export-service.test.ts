// Jest is used in this project
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExportService } from '../src/main/services/ExportService';
import type { ProjectData, ExportOptions } from '../src/types/entities';

describe('ExportService', function () {
  let exportService: ExportService;
  let testOutputDir: string;
  let mockProject: ProjectData;

  beforeEach(async () => {
    // Electronのappオブジェクトを直接グローバルにモック
    const mockApp = {
      getAppPath: jest.fn(() => '/mock/app/path'),
      getPath: jest.fn((name: string) => {
        if (name === 'userData') return '/mock/userData';
        return '/mock/path';
      })
    };
    
    // グローバルなモック設定
    jest.doMock('electron', () => ({
      app: mockApp
    }), { virtual: true });
    
    // htmlExporter で使用される app を直接モック
    global.app = mockApp;

    // fsモジュールのexistsSyncとreaddirSyncをモック
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'readdirSync').mockReturnValue([]);

    // テスト用ログディレクトリを作成
    const logDir = path.join(process.env.HOME || '~', '.komae', 'logs');
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      // ディレクトリ作成に失敗しても継続
    }

    exportService = new ExportService();
    testOutputDir = path.join(__dirname, 'temp-export-test');
    
    // テスト用プロジェクトデータを作成
    mockProject = {
      metadata: {
        komae_version: '1.0',
        project_version: '1.0',
        title: 'Test Project',
        description: 'Test export project',
        supportedLanguages: ['ja', 'en'],
        currentLanguage: 'ja'
      },
      canvas: { width: 800, height: 600 },
      assets: {
        'test-image-1': {
          id: 'test-image-1',
          type: 'ImageAsset',
          name: 'Test Image 1',
          original_file_path: '/test/image1.png',
          original_width: 400,
          original_height: 300,
          default_pos_x: 100,
          default_pos_y: 50,
          default_width: 400,
          default_height: 300,
          default_opacity: 1.0,
          default_z_index: 0,
          default_mask: [[0, 0], [400, 0], [400, 300], [0, 300]],
        },
        'test-text-1': {
          id: 'test-text-1',
          type: 'TextAsset',
          name: 'Test Text 1',
          default_text: 'Hello World',
          font: 'Arial',
          stroke_width: 1,
          font_size: 24,
          stroke_color: '#000000',
          fill_color: '#FFFFFF',
          default_pos_x: 200,
          default_pos_y: 100,
          opacity: 1.0,
          leading: 0,
          vertical: false,
          default_z_index: 1,
        }
      },
      pages: [
        {
          id: 'page-1',
          title: 'Test Page 1',
          asset_instances: {
            'instance-1': {
              id: 'instance-1',
              asset_id: 'test-image-1',
            },
            'instance-2': {
              id: 'instance-2',
              asset_id: 'test-text-1',
            }
          }
        },
        {
          id: 'page-2', 
          title: 'Test Page 2',
          asset_instances: {
            'instance-3': {
              id: 'instance-3',
              asset_id: 'test-text-1',
            }
          }
        }
      ]
    };
  });

  afterEach(async () => {
    // テストファイルのクリーンアップ
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // ファイルが存在しない場合は無視
    }
    
    // モックをリセット
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('HTML Export', () => {
    test('HTMLエクスポートが成功する', async () => {
      const options: ExportOptions = {
        format: 'html',
        outputPath: testOutputDir,
        title: 'Test Export',
        width: 800,
        height: 600,
        quality: 90
      };

      const result = await exportService.exportProject(mockProject, options);
      
      expect(result.success).toBe(true);
      expect(result.outputPath).toContain('Test_Export.html');
      expect(result.message).toContain('HTML export completed');
    });

    test('無効なオプションでエクスポートが失敗する', async () => {
      const options: ExportOptions = {
        format: 'html',
        outputPath: '',
        title: 'Test Export',
        width: 800,
        height: 600,
        quality: 90
      };

      await expect(exportService.exportProject(mockProject, options)).rejects.toThrow('Output path is required');
    });
  });

  describe('PNG Export', () => {
    test('PNGエクスポートが成功する', async () => {
      const options: ExportOptions = {
        format: 'png',
        outputPath: testOutputDir,
        title: 'Test PNG Export',
        width: 800,
        height: 600,
        quality: 90
      };

      const result = await exportService.exportProject(mockProject, options);
      
      expect(result.success).toBe(true);
      expect(result.outputPath).toContain('Test_PNG_Export');
      expect(result.message).toContain('PNG export completed');
      expect(result.message).toContain('2 files'); // 2ページ分
    });
  });

  describe('Validation', () => {
    test('空のページでエクスポートが失敗する', async () => {
      const emptyProject = { ...mockProject, pages: [] };
      const options: ExportOptions = {
        format: 'html',
        outputPath: testOutputDir,
        title: 'Test Export',
        width: 800,
        height: 600,
        quality: 90
      };

      await expect(exportService.exportProject(emptyProject, options)).rejects.toThrow('No pages to export');
    });

    test('無効なキャンバスサイズでエクスポートが失敗する', async () => {
      const options: ExportOptions = {
        format: 'html',
        outputPath: testOutputDir,
        title: 'Test Export',
        width: 0,
        height: 600,
        quality: 90
      };

      await expect(exportService.exportProject(mockProject, options)).rejects.toThrow('Invalid canvas dimensions');
    });
  });
});