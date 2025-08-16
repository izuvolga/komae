/**
 * カスタムプロトコルURLエンコード/デコードのテスト
 */

import { getCustomProtocolUrl } from '../src/renderer/utils/imageUtils';

describe('カスタムプロトコルのURLエンコード/デコード', () => {
  describe('getCustomProtocolUrl', () => {
    test('空白を含むファイルパスが正しくエンコードされる', () => {
      const projectPath = '/Users/test/projects/test project';
      const relativePath = 'assets/images/test image.jpg';
      
      const result = getCustomProtocolUrl(relativePath, projectPath);
      
      // 空白文字が%20にエンコードされることを確認
      expect(result).toBe('komae-asset:///Users/test/projects/test%20project/assets/images/test%20image.jpg');
    });

    test('空白を含む日本語ファイルパスが正しくエンコードされる', () => {
      const projectPath = '/Users/greymd/Desktop/aaa bbb';
      const relativePath = 'assets/images/1-18.jpg';
      
      const result = getCustomProtocolUrl(relativePath, projectPath);
      
      // 空白文字が%20にエンコードされることを確認
      expect(result).toBe('komae-asset:///Users/greymd/Desktop/aaa%20bbb/assets/images/1-18.jpg');
    });

    test('特殊文字を含むファイルパスが正しくエンコードされる', () => {
      const projectPath = '/Users/test/projects/test&project';
      const relativePath = 'assets/images/test#image.jpg';
      
      const result = getCustomProtocolUrl(relativePath, projectPath);
      
      // 特殊文字がエンコードされることを確認
      expect(result).toContain('komae-asset://');
      expect(result).toContain('%26'); // &がエンコードされる
      expect(result).toContain('%23'); // #がエンコードされる
    });

    test('日本語ファイル名の正しいエンコーディング', () => {
      const result = getCustomProtocolUrl('assets/画像ファイル.jpg', '/Users/test/project');
      expect(result).toBe('komae-asset:///Users/test/project/assets/%E7%94%BB%E5%83%8F%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB.jpg');
    });

    test('特殊文字を含むディレクトリ名とファイル名のエンコーディング', () => {
      const result = getCustomProtocolUrl('assets/My Photos & Videos/image (1).png', '/Users/test/My Project');
      expect(result).toBe('komae-asset:///Users/test/My%20Project/assets/My%20Photos%20%26%20Videos/image%20(1).png');
    });

    test('パーセント文字を含むファイル名のエンコーディング', () => {
      const result = getCustomProtocolUrl('assets/100% complete.png', '/Users/test/project');
      expect(result).toBe('komae-asset:///Users/test/project/assets/100%25%20complete.png');
    });

    test('パス区切り文字がエンコードされないことを確認', () => {
      const result = getCustomProtocolUrl('assets/sub/dir/file.png', '/Users/test/project');
      expect(result).toBe('komae-asset:///Users/test/project/assets/sub/dir/file.png');
      // パス区切り文字の/が%2Fになっていないことを確認
      expect(result).not.toContain('%2F');
    });

    test('既にkomae-asset://プロトコルの場合はそのまま返される', () => {
      const projectPath = '/Users/test/projects/test project';
      const relativePath = 'komae-asset://existing-protocol-url';
      
      const result = getCustomProtocolUrl(relativePath, projectPath);
      
      expect(result).toBe('komae-asset://existing-protocol-url');
    });

    test('既にカスタムプロトコルの場合はエンコーディングしない', () => {
      const customUrl = 'komae-asset:///Users/test/project/assets/my image.png';
      const result = getCustomProtocolUrl(customUrl, '/Users/test/project');
      expect(result).toBe(customUrl);
    });

    test('通常のファイルパス（空白なし）は正常に処理される', () => {
      const projectPath = '/Users/test/projects/normal-project';
      const relativePath = 'assets/images/normal-image.jpg';
      
      const result = getCustomProtocolUrl(relativePath, projectPath);
      
      expect(result).toBe('komae-asset:///Users/test/projects/normal-project/assets/images/normal-image.jpg');
    });
  });

  describe('URLデコード処理（メインプロセス側のシミュレーション）', () => {
    test('メインプロセスでの完全な処理フローをテスト', () => {
      // エンコード・デコードの完全フロー
      const originalPath = '/Users/greymd/Desktop/aaa bbb/assets/images/1-18.jpg';
      
      // 1. Rendererプロセス: エンコードしてkomae-asset://URLを生成
      const encodedPath = encodeURIComponent(originalPath);
      const url = `komae-asset://${encodedPath}`;
      
      // 2. メインプロセス: URLを解析（実際の処理順序）
      let filePath = url.substring(13);
      
      // URLデコードを実行
      filePath = decodeURIComponent(filePath);
      
      // URLデコード後に余分なスラッシュを除去
      if (filePath.startsWith('//')) {
        filePath = filePath.substr(1);
      }
      
      expect(filePath).toBe(originalPath);
    });

    test('特殊文字を含むパスの完全フロー', () => {
      const originalPath = '/Users/test/projects/test&project/assets/images/test#image.jpg';
      
      // エンコード
      const encodedPath = encodeURIComponent(originalPath);
      const url = `komae-asset://${encodedPath}`;
      
      // デコード（メインプロセス処理：修正後の順序）
      let filePath = url.substring(13);
      filePath = decodeURIComponent(filePath);
      if (filePath.startsWith('//')) {
        filePath = filePath.substr(1);
      }
      
      expect(filePath).toBe(originalPath);
    });
  });
});
