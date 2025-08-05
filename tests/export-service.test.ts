// Jest is used in this project
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExportService } from '../src/main/services/ExportService';
import type { ProjectData, ExportOptions } from '../src/types/entities';

describe('ExportService', () => {
  let exportService: ExportService;
  let testOutputDir: string;
  let mockProject: ProjectData;

  beforeEach(async () => {
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
          default_mask: [[0, 0], [400, 0], [400, 300], [0, 300]],
        },
        'test-text-1': {
          id: 'test-text-1',
          type: 'TextAsset',
          name: 'Test Text 1',
          default_text: 'Hello World',
          font: 'Arial',
          stroke_width: 2.0,
          font_size: 24,
          color_ex: '#000000',
          color_in: '#FFFFFF',
          default_pos_x: 200,
          default_pos_y: 100,
          vertical: false,
        },
      },
      pages: [
        {
          id: 'page-1',
          title: 'Page 1',
          asset_instances: {
            'instance-1': {
              id: 'instance-1',
              asset_id: 'test-image-1',
              z_index: 0,
            },
            'instance-2': {
              id: 'instance-2',
              asset_id: 'test-text-1',
              z_index: 1,
            },
          },
        },
        {
          id: 'page-2',
          title: 'Page 2',
          asset_instances: {
            'instance-3': {
              id: 'instance-3',
              asset_id: 'test-text-1',
              z_index: 0,
              override_pos_x: 250,
              override_pos_y: 150,
            },
          },
        },
      ],
    };

    // テスト用ディレクトリを作成
    try {
      await fs.mkdir(testOutputDir, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }
  });

  afterEach(async () => {
    // テスト用ディレクトリを削除
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // 削除に失敗しても継続
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  describe('HTML Export', () => {
    it('should export project as single HTML file', async () => {
      const options: ExportOptions = {
        format: 'html',
        title: 'Test Export',
        outputPath: testOutputDir,
        width: 800,
        height: 600,
        quality: 90,
        embedAssets: true,
        htmlOptions: {
          singleFile: true,
          includeNavigation: true,
          autoPlay: false,
        },
      };

      const result = await exportService.exportProject(mockProject, options);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(path.join(testOutputDir, 'Test_Export.html'));

      // HTMLファイルが作成されているかチェック
      const htmlExists = await fs.access(result.outputPath).then(() => true).catch(() => false);
      expect(htmlExists).toBe(true);

      // HTMLファイルの内容をチェック
      const htmlContent = await fs.readFile(result.outputPath, 'utf-8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<title>Test Export</title>');
      expect(htmlContent).toContain('<svg'); // SVGコンテンツが含まれている
      expect(htmlContent).toContain('Page 1'); // ページタイトルが含まれている
      expect(htmlContent).toContain('Page 2');
    });

    it('should handle HTML export with navigation', async () => {
      const options: ExportOptions = {
        format: 'html',
        title: 'Navigation Test',
        outputPath: testOutputDir,
        width: 800,
        height: 600,
        quality: 90,
        embedAssets: true,
        htmlOptions: {
          singleFile: true,
          includeNavigation: true,
          autoPlay: false,
        },
      };

      const result = await exportService.exportProject(mockProject, options);
      const htmlContent = await fs.readFile(result.outputPath, 'utf-8');

      // ナビゲーション要素が含まれているかチェック
      expect(htmlContent).toContain('navigation');
      expect(htmlContent).toContain('button'); // ナビゲーションボタン
      expect(htmlContent).toContain('onclick'); // JavaScript機能
    });
  });

  describe('PNG Export', () => {
    it('should export project as PNG files', async () => {
      const options: ExportOptions = {
        format: 'png',
        title: 'PNG Test',
        outputPath: testOutputDir,
        width: 800,
        height: 600,
        quality: 90,
        embedAssets: false,
      };

      const result = await exportService.exportProject(mockProject, options);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(path.join(testOutputDir, 'PNG_Test'));

      // PNG画像ディレクトリが作成されているかチェック
      const dirExists = await fs.access(result.outputPath).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);

      // 各ページのPNG画像が作成されているかチェック
      const page1Png = path.join(result.outputPath, '1.png');
      const page2Png = path.join(result.outputPath, '2.png');

      const page1Exists = await fs.access(page1Png).then(() => true).catch(() => false);
      const page2Exists = await fs.access(page2Png).then(() => true).catch(() => false);

      expect(page1Exists).toBe(true);
      expect(page2Exists).toBe(true);

      // PNGファイルのサイズをチェック（空でないことを確認）
      const page1Stats = await fs.stat(page1Png);
      const page2Stats = await fs.stat(page2Png);

      expect(page1Stats.size).toBeGreaterThan(0);
      expect(page2Stats.size).toBeGreaterThan(0);
    });

    it('should handle PNG quality settings', async () => {
      const highQualityOptions: ExportOptions = {
        format: 'png',
        title: 'High Quality PNG',
        outputPath: testOutputDir,
        width: 800,
        height: 600,
        quality: 100,
        embedAssets: false,
      };

      const lowQualityOptions: ExportOptions = {
        format: 'png',
        title: 'Low Quality PNG',
        outputPath: testOutputDir,
        width: 800,
        height: 600,
        quality: 10,
        embedAssets: false,
      };

      const highQualityResult = await exportService.exportProject(mockProject, highQualityOptions);
      const lowQualityResult = await exportService.exportProject(mockProject, lowQualityOptions);

      expect(highQualityResult.success).toBe(true);
      expect(lowQualityResult.success).toBe(true);

      // 高品質の方がファイルサイズが大きいことを確認
      const highQualityFile = path.join(highQualityResult.outputPath, '1.png');
      const lowQualityFile = path.join(lowQualityResult.outputPath, '1.png');

      const highQualityStats = await fs.stat(highQualityFile);
      const lowQualityStats = await fs.stat(lowQualityFile);

      expect(highQualityStats.size).toBeGreaterThan(lowQualityStats.size);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid output path', async () => {
      const options: ExportOptions = {
        format: 'html',
        title: 'Invalid Path Test',
        outputPath: '/root/nonexistent/readonly', // より確実に失敗するパス
        width: 800,
        height: 600,
        quality: 90,
        embedAssets: true,
        htmlOptions: {
          singleFile: true,
          includeNavigation: true,
          autoPlay: false,
        },
      };

      await expect(exportService.exportProject(mockProject, options)).rejects.toThrow();
    });

    it('should handle empty project data', async () => {
      const emptyProject: ProjectData = {
        ...mockProject,
        pages: [],
        assets: {},
      };

      const options: ExportOptions = {
        format: 'html',
        title: 'Empty Project',
        outputPath: testOutputDir,
        width: 800,
        height: 600,
        quality: 90,
        embedAssets: true,
        htmlOptions: {
          singleFile: true,
          includeNavigation: true,
          autoPlay: false,
        },
      };

      await expect(exportService.exportProject(emptyProject, options)).rejects.toThrow('No pages to export');
    });

    it('should handle missing asset references', async () => {
      const brokenProject: ProjectData = {
        ...mockProject,
        pages: [
          {
            id: 'broken-page',
            title: 'Broken Page',
            asset_instances: {
              'broken-instance': {
                id: 'broken-instance',
                asset_id: 'nonexistent-asset',
                z_index: 0,
              },
            },
          },
        ],
      };

      const options: ExportOptions = {
        format: 'html',
        title: 'Broken Project',
        outputPath: testOutputDir,
        width: 800,
        height: 600,
        quality: 90,
        embedAssets: true,
        htmlOptions: {
          singleFile: true,
          includeNavigation: true,
          autoPlay: false,
        },
      };

      await expect(exportService.exportProject(brokenProject, options)).rejects.toThrow();
    });
  });

  describe('SVG Generation', () => {
    it('should generate valid SVG content for pages', async () => {
      const svgContent = await exportService.generatePageSVG(mockProject, mockProject.pages[0]);

      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('</svg>');
      expect(svgContent).toContain('width="800"');
      expect(svgContent).toContain('height="600"');
      
      // アセットインスタンスがSVGに含まれているかチェック
      expect(svgContent).toContain('Hello World'); // テキストコンテンツ
    });

    it('should handle position overrides correctly in SVG', async () => {
      const svgContent = await exportService.generatePageSVG(mockProject, mockProject.pages[1]);

      // 位置がオーバーライドされている場合、transformが生成される
      expect(svgContent).toContain('translate'); // 位置変換
      expect(svgContent).toContain('Hello World'); // テキストコンテンツ
    });

    it('should handle z-index ordering in SVG', async () => {
      const svgContent = await exportService.generatePageSVG(mockProject, mockProject.pages[0]);

      // z-indexの順序が保たれているかチェック（低い値が先に来る）
      const imageIndex = svgContent.indexOf('test-image-1');
      const textIndex = svgContent.indexOf('Hello World');
      expect(imageIndex).toBeLessThan(textIndex);
    });
  });
});