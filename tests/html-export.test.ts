import { describe, test, expect } from '@jest/globals';
import type { ProjectData, Page, ImageAsset, AssetInstance } from '../src/types/entities';

// HTML出力機能をインポート（TDDのRED状態を作るため）
import { HtmlExporter, generateHtmlExport } from '../src/utils/htmlExporter';

describe('HTML Export - 単一ファイル出力', () => {
  // テスト用のプロジェクトデータ
  const mockImageAsset1: ImageAsset = {
    id: 'background-1',
    type: 'ImageAsset',
    name: '背景画像',
    original_file_path: 'assets/images/background.png',
    original_width: 800,
    original_height: 600,
    default_pos_x: 0,
    default_pos_y: 0,
    default_width: 800,
    default_height: 600,
    default_opacity: 1.0,
    default_mask: [[0, 0], [800, 0], [800, 600], [0, 600]],
  };

  const mockImageAsset2: ImageAsset = {
    id: 'character-1',
    type: 'ImageAsset',
    name: 'キャラクター',
    original_file_path: 'assets/images/character.png',
    original_width: 200,
    original_height: 300,
    default_pos_x: 300,
    default_pos_y: 200,
    default_width: 200,
    default_height: 300,
    default_opacity: 1.0,
    default_mask: [[0, 0], [200, 0], [200, 300], [0, 300]],
  };

  const mockPage1: Page = {
    id: 'page-1',
    title: 'ページ1',
    asset_instances: {
      'bg-instance': {
        id: 'bg-instance',
        asset_id: 'background-1',
        z_index: 0,
      },
      'char-instance': {
        id: 'char-instance',
        asset_id: 'character-1',
        z_index: 1,
        override_width: 240,
        override_height: 360,
        override_opacity: 0.9
      }
    }
  };

  const mockPage2: Page = {
    id: 'page-2',
    title: 'ページ2',
    asset_instances: {
      'bg-instance-2': {
        id: 'bg-instance-2',
        asset_id: 'background-1',
        z_index: 0,
        override_opacity: 0.8
      }
    }
  };

  const mockProject: ProjectData = {
    metadata: {
      komae_version: '1.0',
      project_version: '1.0',
      title: 'テストストーリー',
      description: 'HTML出力テスト用プロジェクト',
    },
    canvas: { width: 800, height: 600 },
    assets: {
      'background-1': mockImageAsset1,
      'character-1': mockImageAsset2
    },
    pages: [mockPage1, mockPage2]
  };

  describe('HTML構造生成', () => {
    test('基本的なHTML構造を生成する', () => {
      const exporter = new HtmlExporter();
      const html = exporter.generateHtmlStructure(mockProject);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<title>テストストーリー</title>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    test('ビューワー用のCSSスタイルを含む', () => {
      const exporter = new HtmlExporter();
      const html = exporter.generateHtmlStructure(mockProject);
      
      expect(html).toContain('#viewer');
      expect(html).toContain('.page-svg');
      expect(html).toContain('max-width: 90vw');
      expect(html).toContain('max-height: 90vh');
    });
  });

  describe('SVGアセット定義生成', () => {
    test('アセットを<defs>内で定義する', () => {
      const exporter = new HtmlExporter();
      const svgDefs = exporter.generateSvgAssetDefinitions(mockProject);
      
      expect(svgDefs).toContain('<defs>');
      expect(svgDefs).toContain('<g id="background-1">');
      expect(svgDefs).toContain('<g id="character-1">');
      expect(svgDefs).toContain('</defs>');
    });

    test('画像をBase64で埋め込む', () => {
      const exporter = new HtmlExporter();
      const svgDefs = exporter.generateSvgAssetDefinitions(mockProject);
      
      // Base64画像データの形式をチェック
      expect(svgDefs).toContain('data:image/');
      expect(svgDefs).toContain('base64,');
    });

    test('アセットの基本属性が正しく設定される', () => {
      const exporter = new HtmlExporter();
      const svgDefs = exporter.generateSvgAssetDefinitions(mockProject);
      
      expect(svgDefs).toContain('width="800"');
      expect(svgDefs).toContain('height="600"');
      expect(svgDefs).toContain('width="200"');
      expect(svgDefs).toContain('height="300"');
    });
  });

  describe('ページナビゲーションJavaScript生成', () => {
    test('ページ切り替え用のJavaScriptを生成する', () => {
      const exporter = new HtmlExporter();
      const script = exporter.generateNavigationScript(mockProject);
      
      expect(script).toContain('let currentPage = 0');
      expect(script).toContain('const totalPages = 2');
      expect(script).toContain('function nextPage()');
      expect(script).toContain('function prevPage()');
      expect(script).toContain('function showPage(pageIndex)');
    });

    test('各ページのアセット構成を配列で定義する', () => {
      const exporter = new HtmlExporter();
      const script = exporter.generateNavigationScript(mockProject);
      
      // ページ定義配列
      expect(script).toContain('const pages = [');
      expect(script).toContain('background-1');
      expect(script).toContain('character-1');
    });

    test('クリック/キーボードナビゲーションを含む', () => {
      const exporter = new HtmlExporter();
      const script = exporter.generateNavigationScript(mockProject);
      
      expect(script).toContain('addEventListener');
      expect(script).toContain('click');
      expect(script).toContain('keydown');
    });
  });

  describe('完全なHTML出力', () => {
    test('プロジェクト全体を単一HTMLファイルに出力する', () => {
      const html = generateHtmlExport(mockProject);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<svg');
      expect(html).toContain('<defs>');
      expect(html).toContain('<script>');
      expect(html).toContain('</html>');
    });

    test('外部依存なしの自己完結型HTMLを生成する', () => {
      const html = generateHtmlExport(mockProject);
      
      // 外部リンクがないことを確認
      expect(html).not.toContain('src="http');
      expect(html).not.toContain('href="http');
      expect(html).not.toContain('link rel="stylesheet"');
      
      // Base64埋め込みがあることを確認
      expect(html).toContain('data:image/');
    });

    test('プロジェクトタイトルが正しく設定される', () => {
      const html = generateHtmlExport(mockProject);
      
      expect(html).toContain('<title>テストストーリー</title>');
    });
  });

  describe('z_index順レンダリング', () => {
    test('ページ内のアセットがz_index順で描画される', () => {
      const exporter = new HtmlExporter();
      const script = exporter.generateNavigationScript(mockProject);
      
      // pages配列の最初の要素を確認（エスケープされた文字列を含む全体を抽出）
      const pagesArrayMatch = script.match(/const pages = \[\s*"((?:[^"\\]|\\.)*)"/);
      expect(pagesArrayMatch).toBeTruthy();
      
      const page0Content = pagesArrayMatch?.[1];
      expect(page0Content).toBeTruthy();
      
      // エスケープされた文字列を元に戻す
      const unescapedContent = page0Content?.replace(/\\"/g, '"');
      
      // backgroundがcharacterより前に定義されている（z_index順）
      const bgIndex = unescapedContent?.indexOf('background-1');
      const charIndex = unescapedContent?.indexOf('character-1');
      
      // 両方のアセットが存在することを確認
      expect(bgIndex).toBeGreaterThan(-1);
      expect(charIndex).toBeGreaterThan(-1);
      expect(bgIndex).toBeLessThan(charIndex);
    });
  });

  describe('エラーハンドリング', () => {
    test('空のプロジェクトを適切に処理する', () => {
      const emptyProject: ProjectData = {
        ...mockProject,
        assets: {},
        pages: []
      };
      
      const html = generateHtmlExport(emptyProject);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('const totalPages = 0');
    });

    test('存在しないアセットを参照するページを安全に処理する', () => {
      const invalidProject: ProjectData = {
        ...mockProject,
        pages: [{
          id: 'invalid-page',
          title: '無効なページ',
          asset_instances: {
            'invalid-instance': {
              id: 'invalid-instance',
              asset_id: 'non-existent-asset',
              z_index: 0,
              transform: { scale_x: 1.0, scale_y: 1.0, rotation: 0 },
              opacity: 1.0
            }
          }
        }]
      };
      
      // エラーを投げずに処理されることを確認
      expect(() => generateHtmlExport(invalidProject)).not.toThrow();
    });
  });
});