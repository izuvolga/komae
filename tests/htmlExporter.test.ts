import { HtmlExporter } from '../src/utils/htmlExporter';
import { mockProject } from './fixtures/sampleProject';
import { ProjectData, FontType, ExportOptions } from '../src/types/entities';
import path from 'path';
import fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock path module for consistent testing
jest.mock('path');
const mockedPath = path as jest.Mocked<typeof path>;

// Mock Electron with comprehensive API
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/fonts/path'),
    getAppPath: jest.fn(() => '/mock/app/path'),
  },
}));

// Mock the svgGeneratorCommon module to avoid complex dependencies
jest.mock('../src/utils/svgGeneratorCommon', () => ({
  generateSvgStructureCommon: jest.fn(() => ({
    assetDefinitions: ['<g id="mock-asset">Mock Asset</g>'],
    useElements: ['<use href="#mock-asset" x="0" y="0"/>']
  })),
  setFontInfoCache: jest.fn(),
}));

describe('HtmlExporter', () => {
  let htmlExporter: HtmlExporter;
  let testProject: ProjectData;
  const mockProjectPath = '/mock/project/path';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup project data
    testProject = JSON.parse(JSON.stringify(mockProject));
    
    // Initialize HtmlExporter with empty availableFonts array
    htmlExporter = new HtmlExporter(mockProjectPath, []);
    
    // Setup common fs mocks
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(Buffer.from('mock file content'));
    mockedFs.writeFileSync.mockImplementation();
    mockedFs.mkdirSync.mockImplementation();
    
    // Setup path mocks
    mockedPath.join.mockImplementation((...args) => args.join('/'));
    mockedPath.dirname.mockImplementation((filePath) => filePath.split('/').slice(0, -1).join('/'));
    mockedPath.extname.mockImplementation((filePath) => {
      const parts = filePath.split('.');
      return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
    });
    mockedPath.basename.mockImplementation((filePath) => filePath.split('/').pop() || '');
  });

  describe('constructor', () => {
    test('should initialize with project path', () => {
      const exporter = new HtmlExporter('/test/path');
      expect(exporter.projectPath).toBe('/test/path');
    });

    test('should initialize with empty available fonts array', () => {
      const exporter = new HtmlExporter('/test/path');
      expect(exporter.availableFonts).toEqual([]);
    });
  });

  describe('exportToHTML method', () => {
    const createExportOptions = (outputPath: string): ExportOptions => ({
      format: 'html',
      title: 'Test Export',
      outputPath,
      width: testProject.canvas.width,
      height: testProject.canvas.height,
      quality: 1.0,
      embedAssets: true,
      htmlOptions: {
        embedFonts: true,
        navigation: true
      }
    });

    test('should export project to HTML content', async () => {
      const options = createExportOptions('/mock/output');
      
      const htmlContent = await htmlExporter.exportToHTML(testProject, options);
      
      // Verify that HTML content is returned
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="ja">');
      expect(htmlContent).toContain('</html>');
      expect(htmlContent).toContain('<svg');
      expect(htmlContent).toContain('</svg>');
    });

    test('should handle project with no text elements', async () => {
      const projectWithoutText: ProjectData = {
        ...testProject,
        assets: Object.fromEntries(
          Object.entries(testProject.assets).filter(([_, asset]) => asset.type !== 'TextAsset')
        ),
        pages: testProject.pages.map(page => ({
          ...page,
          asset_instances: Object.fromEntries(
            Object.entries(page.asset_instances).filter(([_, instance]) => {
              const asset = testProject.assets[instance.asset_id];
              return asset && asset.type !== 'TextAsset';
            })
          )
        }))
      };

      const options = createExportOptions('/mock/output');
      const htmlContent = await htmlExporter.exportToHTML(projectWithoutText, options);
      
      expect(htmlContent).toContain('<!DOCTYPE html>');
    });

    test('should handle empty project', async () => {
      const emptyProject: ProjectData = {
        ...testProject,
        assets: {},
        pages: []
      };

      const options = createExportOptions('/mock/output');
      const htmlContent = await htmlExporter.exportToHTML(emptyProject, options);
      
      expect(htmlContent).toContain('<!DOCTYPE html>');
    });
  });

  describe('font handling during export', () => {
    const createExportOptions = (outputPath: string): ExportOptions => ({
      format: 'html',
      title: 'Test Export',
      outputPath,
      width: testProject.canvas.width,
      height: testProject.canvas.height,
      quality: 1.0,
      embedAssets: true,
      htmlOptions: {
        embedFonts: true,
        navigation: true
      }
    });

    test('should handle fonts during export process', async () => {
      // Setup fonts that would be found during export
      htmlExporter.availableFonts = [
        { id: 'system-ui', name: 'System UI', type: FontType.BUILTIN, path: '/system/fonts/ui.ttf' }
      ];

      const options = createExportOptions('/mock/output');
      const htmlContent = await htmlExporter.exportToHTML(testProject, options);
      
      // Verify export completed successfully with fonts
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<svg');
    });

    test('should handle export without custom fonts', async () => {
      // No custom fonts available
      htmlExporter.availableFonts = [];

      const options = createExportOptions('/mock/output');
      const htmlContent = await htmlExporter.exportToHTML(testProject, options);
      
      expect(htmlContent).toContain('<!DOCTYPE html>');
    });
  });

  describe('HTML content generation', () => {
    const createExportOptions = (width: number = 768, height: number = 1024): ExportOptions => ({
      format: 'html',
      title: 'Test Export',
      outputPath: '/mock/output',
      width,
      height,
      quality: 1.0,
      embedAssets: true,
      htmlOptions: {
        embedFonts: true,
        navigation: true
      }
    });

    test('should generate complete HTML with SVG content', async () => {
      const options = createExportOptions();
      const htmlContent = await htmlExporter.exportToHTML(testProject, options);
      
      // Check that HTML content contains expected structure
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<svg');
      expect(htmlContent).toContain('</svg>');
      expect(htmlContent).toContain(`width="${testProject.canvas.width}"`);
      expect(htmlContent).toContain(`height="${testProject.canvas.height}"`);
    });

    test('should handle custom canvas dimensions', async () => {
      const customProject = {
        ...testProject,
        canvas: {
          width: 1024,
          height: 768
        }
      };

      const options = createExportOptions(1024, 768);
      const htmlContent = await htmlExporter.exportToHTML(customProject, options);
      
      expect(htmlContent).toContain('width="1024"');
      expect(htmlContent).toContain('height="768"');
    });

    test('should handle projects with empty pages', async () => {
      const emptyPageProject = {
        ...testProject,
        pages: [{
          ...testProject.pages[0],
          asset_instances: {}
        }]
      };

      const options = createExportOptions();
      const htmlContent = await htmlExporter.exportToHTML(emptyPageProject, options);
      
      // Verify that export completed without errors
      expect(htmlContent).toContain('<!DOCTYPE html>');
    });
  });

  describe('utility methods', () => {
    test('should generate navigation HTML', () => {
      const nav = htmlExporter.generateNavigationHTML();
      
      expect(nav).toBeDefined();
      expect(typeof nav).toBe('string');
    });

    test('should handle deprecated navigation script', () => {
      // This method logs a deprecation warning
      const script = htmlExporter.generateNavigationScript(testProject);
      
      expect(script).toContain('// JavaScript is now handled by template system');
    });

    test('should generate simple SVG for testing', () => {
      const svg = htmlExporter.generateSimpleSVGForTest(testProject);
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('<rect');
      expect(svg).toContain('fill="#f0f0f0"'); // Actual background color
      expect(svg).toContain('Test Export'); // Contains title text
    });
  });


  describe('error handling', () => {
    const createExportOptions = (): ExportOptions => ({
      format: 'html',
      title: 'Test Export',
      outputPath: '/mock/output',
      width: testProject.canvas.width,
      height: testProject.canvas.height,
      quality: 1.0,
      embedAssets: true,
      htmlOptions: {
        embedFonts: true,
        navigation: true
      }
    });

    test('should handle missing assets gracefully', async () => {
      const projectWithMissingAssets: ProjectData = {
        ...testProject,
        pages: [{
          ...testProject.pages[0],
          asset_instances: {
            'missing-instance': {
              id: 'missing-instance',
              asset_id: 'non-existent-asset'
            }
          }
        }]
      };

      const options = createExportOptions();
      
      // Should not throw error even with missing assets
      const htmlContent = await htmlExporter.exportToHTML(projectWithMissingAssets, options);
      expect(htmlContent).toContain('<!DOCTYPE html>');
    });
  });

  describe('integration tests', () => {
    const createExportOptions = (): ExportOptions => ({
      format: 'html',
      title: 'Test Export',
      outputPath: '/mock/output',
      width: testProject.canvas.width,
      height: testProject.canvas.height,
      quality: 1.0,
      embedAssets: true,
      htmlOptions: {
        embedFonts: true,
        navigation: true
      }
    });

    test('should complete full export workflow', async () => {
      // Setup fonts
      htmlExporter.availableFonts = [
        { id: 'Noto Sans JP', name: 'Noto Sans JP Regular', type: FontType.BUILTIN, path: '/fonts/noto.ttf' }
      ];

      const options = createExportOptions();
      const htmlContent = await htmlExporter.exportToHTML(testProject, options);
      
      // Should complete without throwing and return HTML content
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<svg');
      expect(htmlContent).toContain('</svg>');
    });

    test('should handle multiple export calls', async () => {
      const options = createExportOptions();
      
      // Run export twice to ensure consistency
      const htmlContent1 = await htmlExporter.exportToHTML(testProject, options);
      const htmlContent2 = await htmlExporter.exportToHTML(testProject, options);
      
      // Should return consistent HTML content
      expect(htmlContent1).toContain('<!DOCTYPE html>');
      expect(htmlContent2).toContain('<!DOCTYPE html>');
    });
  });
});