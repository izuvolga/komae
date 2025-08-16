/**
 * imageUtils.ts のユニットテスト
 * カスタムプロトコル関連の機能と画像処理ユーティリティをテスト
 */

import { 
  resolveAssetPath, 
  getAbsoluteImagePath, 
  getCustomProtocolUrl, 
  loadImageAsDataUrl,
  calculateThumbnailSize,
  isImageFile 
} from '../src/renderer/utils/imageUtils';

// ElectronAPI のモック
const mockElectronAPI = {
  fileSystem: {
    readImageAsDataUrl: jest.fn()
  },
  project: {
    getCurrentPath: jest.fn()
  }
};


describe('imageUtils.ts ユニットテスト', () => {
  
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.clearAllMocks();
    
    // console のモック（ログ出力を抑制）
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // デフォルトでElectronAPIのモックをリセット
    mockElectronAPI.fileSystem.readImageAsDataUrl.mockReset();
    mockElectronAPI.project.getCurrentPath.mockReset();
    
    // window.electronAPI を毎回新たに設定し直す
    (global as any).window = {
      electronAPI: mockElectronAPI
    };
  });

  afterEach(() => {
    // console のモックを復元
    jest.restoreAllMocks();
  });

  describe('resolveAssetPath()', () => {
    
    test('プロジェクトパスがnullの場合、相対パスをそのまま返す', () => {
      const result = resolveAssetPath('assets/image.png', null);
      expect(result).toBe('assets/image.png');
    });

    test('既に絶対パス（Unix形式）の場合、そのまま返す', () => {
      const absolutePath = '/Users/test/project/assets/image.png';
      const result = resolveAssetPath(absolutePath, '/Users/test/project');
      expect(result).toBe(absolutePath);
    });

    test('既に絶対パス（Windows形式）の場合、そのまま返す', () => {
      const absolutePath = 'C:\\Users\\test\\project\\assets\\image.png';
      const result = resolveAssetPath(absolutePath, '/Users/test/project');
      expect(result).toBe(absolutePath);
    });

    test('相対パスを正しく絶対パスに変換する', () => {
      const result = resolveAssetPath('assets/image.png', '/Users/test/project');
      expect(result).toBe('/Users/test/project/assets/image.png');
    });

    test('空文字列の相対パスを処理する', () => {
      const result = resolveAssetPath('', '/Users/test/project');
      expect(result).toBe('/Users/test/project/');
    });
  });

  describe('getAbsoluteImagePath()', () => {
    
    test('既に絶対パスの場合、そのまま返す', () => {
      const absolutePath = '/Users/test/image.png';
      const result = getAbsoluteImagePath(absolutePath, '/Users/test/project');
      expect(result).toBe(absolutePath);
    });

    test('カスタムプロトコルの場合にはそのまま', () => {
      const result = getAbsoluteImagePath('komae-asset:///Users/test/project/assets/image.png', '/Users/test/project');
      expect(result).toBe('komae-asset:///Users/test/project/assets/image.png');
    });

    test('プロジェクトパスがnullの場合、相対パスをそのまま返す', () => {
      const result = getAbsoluteImagePath('assets/image.png', null);
      expect(result).toBe('assets/image.png');
    });

    test('相対パスを正しく絶対パスに変換する', () => {
      const result = getAbsoluteImagePath('assets/image.png', '/Users/test/project');
      expect(result).toBe('/Users/test/project/assets/image.png');
    });

  });

  describe('getCustomProtocolUrl()', () => {
    
    test('相対パスを正しくカスタムプロトコルURLに変換する', () => {
      const result = getCustomProtocolUrl('assets/image.png', '/Users/test/project');
      expect(result).toBe('komae-asset:///Users/test/project/assets/image.png');
    });

    test('絶対パスを正しくカスタムプロトコルURLに変換する', () => {
      const result = getCustomProtocolUrl('/Users/test/image.png', '/Users/test/project');
      expect(result).toBe('komae-asset:///Users/test/image.png');
    });

    test('プロジェクトパスがnullの場合の処理', () => {
      const result = getCustomProtocolUrl('assets/image.png', null);
      expect(result).toBe('komae-asset://assets/image.png');
    });

    test('空文字列のパスを処理する', () => {
      const result = getCustomProtocolUrl('', '/Users/test/project');
      expect(result).toBe('komae-asset:///Users/test/project/');
    });

    test('空白を含むファイル名の正しいエンコーディング', () => {
      const result = getCustomProtocolUrl('assets/my image file.png', '/Users/test/project');
      expect(result).toBe('komae-asset:///Users/test/project/assets/my%20image%20file.png');
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

    test('既にカスタムプロトコルの場合はエンコーディングしない', () => {
      const customUrl = 'komae-asset:///Users/test/project/assets/my image.png';
      const result = getCustomProtocolUrl(customUrl, '/Users/test/project');
      expect(result).toBe(customUrl);
    });
  });

  describe('loadImageAsDataUrl()', () => {
    
    test('フォールバック動作の確認（ElectronAPIが利用できない場合）', async () => {
      // Node.js環境ではwindow.electronAPIが存在しないため、フォールバックが期待される
      const result = await loadImageAsDataUrl('/Users/test/image.png', '/Users/test/project');
      
      // フォールバック：1x1透明PNG
      expect(result).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    });

    test('相対パスの解決ロジックの確認', async () => {
      // 相対パスを絶対パスに変換する処理のテスト
      const result = await loadImageAsDataUrl('assets/image.png', '/Users/test/project');
      
      // フォールバックが返されるが、resolveAssetPathが呼び出されることを期待
      expect(result).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    });

    test('ElectronAPIが失敗した場合、フォールバック画像を返す', async () => {
      mockElectronAPI.fileSystem.readImageAsDataUrl.mockRejectedValue(new Error('File not found'));

      const result = await loadImageAsDataUrl('/Users/test/nonexistent.png', '/Users/test/project');
      
      // フォールバック：1x1透明PNG
      expect(result).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    });

    test('ElectronAPIがundefinedを返した場合、フォールバック画像を返す', async () => {
      mockElectronAPI.fileSystem.readImageAsDataUrl.mockResolvedValue(undefined);

      const result = await loadImageAsDataUrl('/Users/test/image.png', '/Users/test/project');
      
      expect(result).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    });

    test('プロジェクトパスがnullの場合の処理', async () => {
      const result = await loadImageAsDataUrl('/Users/test/image.png', null);
      
      // フォールバックが返される
      expect(result).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    });

    test('再試行機能：相対パスでプロジェクトパスがない場合のタイムアウト動作', async () => {
      // 相対パスでプロジェクトパスがない場合、再試行して最終的にフォールバックを返す
      const result = await loadImageAsDataUrl('assets/image.png', null);
      
      // 再試行後にフォールバックが返される
      expect(result).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }, 10000);
  });

  describe('calculateThumbnailSize()', () => {
    
    test('幅が制限を超える場合、幅に合わせてリサイズする', () => {
      const result = calculateThumbnailSize(200, 100, 100, 200);
      expect(result).toEqual({ width: 100, height: 50 });
    });

    test('高さが制限を超える場合、高さに合わせてリサイズする', () => {
      const result = calculateThumbnailSize(100, 200, 200, 100);
      expect(result).toEqual({ width: 50, height: 100 });
    });

    test('両方の制限内の場合、最大サイズにスケールアップする', () => {
      const result = calculateThumbnailSize(50, 50, 100, 100);
      expect(result).toEqual({ width: 100, height: 100 });
    });

    test('正方形画像の処理', () => {
      const result = calculateThumbnailSize(200, 200, 100, 100);
      expect(result).toEqual({ width: 100, height: 100 });
    });

    test('極端に横長の画像の処理', () => {
      const result = calculateThumbnailSize(1000, 100, 200, 200);
      expect(result).toEqual({ width: 200, height: 20 });
    });

    test('極端に縦長の画像の処理', () => {
      const result = calculateThumbnailSize(100, 1000, 200, 200);
      expect(result).toEqual({ width: 20, height: 200 });
    });

    test('小数点を含む計算結果の丸め処理', () => {
      const result = calculateThumbnailSize(150, 100, 100, 100);
      expect(result).toEqual({ width: 100, height: 67 }); // 66.666... -> 67
    });

    test('ゼロサイズの処理（NaNが返される）', () => {
      const result = calculateThumbnailSize(0, 0, 100, 100);
      expect(result).toEqual({ width: NaN, height: NaN });
    });
  });

  describe('isImageFile()', () => {
    
    test('PNG ファイルを正しく判定する', () => {
      expect(isImageFile('image.png')).toBe(true);
      expect(isImageFile('image.PNG')).toBe(true);
    });

    test('JPEG ファイルを正しく判定する', () => {
      expect(isImageFile('image.jpg')).toBe(true);
      expect(isImageFile('image.jpeg')).toBe(true);
      expect(isImageFile('image.JPEG')).toBe(true);
    });

    test('その他の画像ファイルを正しく判定する', () => {
      expect(isImageFile('image.gif')).toBe(true);
      expect(isImageFile('image.webp')).toBe(true);
      expect(isImageFile('image.svg')).toBe(true);
      expect(isImageFile('image.bmp')).toBe(true);
    });

    test('非画像ファイルを正しく判定する', () => {
      expect(isImageFile('document.txt')).toBe(false);
      expect(isImageFile('data.json')).toBe(false);
      expect(isImageFile('script.js')).toBe(false);
      expect(isImageFile('style.css')).toBe(false);
    });

    test('拡張子がないファイルを正しく判定する', () => {
      expect(isImageFile('README')).toBe(false);
      expect(isImageFile('Makefile')).toBe(false);
    });

    test('複数のドットを含むファイル名の処理', () => {
      expect(isImageFile('my.image.file.png')).toBe(true);
      expect(isImageFile('config.backup.json')).toBe(false);
    });

    test('パスを含むファイル名の処理', () => {
      expect(isImageFile('/path/to/image.png')).toBe(true);
      expect(isImageFile('/path/to/document.txt')).toBe(false);
      expect(isImageFile('C:\\Users\\test\\image.jpg')).toBe(true);
    });

    test('空文字列の処理', () => {
      expect(isImageFile('')).toBe(false);
    });
  });

  describe('統合テスト', () => {
    
    test('相対パス → 絶対パス → カスタムプロトコル の変換フロー', () => {
      const relativePath = 'assets/background.png';
      const projectPath = '/Users/test/project.komae';
      
      // Step 1: 相対パス解決
      const absolutePath = resolveAssetPath(relativePath, projectPath);
      expect(absolutePath).toBe('/Users/test/project.komae/assets/background.png');
      
      // Step 2: カスタムプロトコル変換
      const protocolUrl = getCustomProtocolUrl(relativePath, projectPath);
      expect(protocolUrl).toBe('komae-asset:///Users/test/project.komae/assets/background.png');
    });


    test('画像ファイル判定とサムネイルサイズ計算の組み合わせ', () => {
      const filePath = 'assets/large-image.jpg';
      
      expect(isImageFile(filePath)).toBe(true);
      
      const thumbnailSize = calculateThumbnailSize(1920, 1080, 120, 80);
      expect(thumbnailSize).toEqual({ width: 120, height: 68 });
    });
  });
});
