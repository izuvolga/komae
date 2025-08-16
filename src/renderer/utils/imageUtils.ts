/**
 * 画像ファイル読み込み用ユーティリティ関数
 */

/**
 * 相対パスを絶対パスに変換する
 * プロジェクトディレクトリをベースとして相対パスを解決
 */
export const resolveAssetPath = (relativePath: string, projectPath: string | null): string => {
  if (!projectPath) {
    console.warn('[resolveAssetPath] No project path provided, returning relative path as-is:', relativePath);
    return relativePath;
  }
  // 既に絶対パスの場合はそのまま返す
  if (relativePath.startsWith('/') || relativePath.match(/^[A-Za-z]:/)) {
    console.log('[resolveAssetPath] Path is already absolute:', relativePath);
    return relativePath;
  }
  // プロジェクトディレクトリをベースとして相対パスを解決
  const resolvedPath = `${projectPath}/${relativePath}`;
  return resolvedPath;
};

/**
 * プレビュー用に絶対パスを生成する
 * ドキュメント仕様（svg-structure.md）に従い、アプリ起動中はローカルファイルパスを使用
 */
export const getAbsoluteImagePath = (relativePath: string, projectPath: string | null): string => {
  // 既にkomae-asset://プロトコルの場合はそのまま返す
  if (relativePath.startsWith('komae-asset://')) {
    return relativePath;
  }
  
  // 既に絶対パスの場合はそのまま返す
  if (relativePath.startsWith('/') || relativePath.match(/^[A-Za-z]:/)) {
    return relativePath;
  }
  
  // プロジェクトパスがない場合は相対パスをそのまま返す
  if (!projectPath) {
    console.warn('[getAbsoluteImagePath] No project path provided for relative path:', relativePath);
    return relativePath;
  }
  
  // resolveAssetPathを使用して絶対パスを生成
  return resolveAssetPath(relativePath, projectPath);
};

/**
 * プレビュー用にカスタムプロトコルURLを生成する
 * komae-asset://プロトコルを使用してローカルファイルにアクセス
 */
export const getCustomProtocolUrl = (relativePath: string, projectPath: string | null): string => {
  const absolutePath = getAbsoluteImagePath(relativePath, projectPath);
  
  // 既にカスタムプロトコルの場合はそのまま返す
  if (absolutePath.startsWith('komae-asset://')) {
    return absolutePath;
  }
  
  // 絶対パスをカスタムプロトコルURLに変換（ファイルパスをURLエンコード）
  const encodedPath = encodeURIComponent(absolutePath);
  return `komae-asset://${encodedPath}`;
};

/**
 * ファイルパスから画像のBase64 DataURLを生成する
 * RendererプロセスからElectronAPIを通じて画像を読み込む
 */
export const loadImageAsDataUrl = async (filePath: string, projectPath?: string | null): Promise<string> => {
  return await loadImageWithRetry(filePath, projectPath, 0);
};

/**
 * プロジェクトパス同期を待って画像を読み込む（再試行機能付き）
 */
async function loadImageWithRetry(filePath: string, projectPath: string | null | undefined, retryCount: number): Promise<string> {
  const maxRetries = 3;
  const retryDelay = 100; // 100ms
  
  try {
    // 相対パスでプロジェクトパスが利用できない場合の対処
    const isRelativePath = !filePath.startsWith('/') && !filePath.match(/^[A-Za-z]:/);
    
    if (isRelativePath && !projectPath && retryCount < maxRetries) {
      console.log(`[loadImageAsDataUrl] Relative path without project path, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries + 1}):`, filePath);
      
      // プロジェクトパスの同期を待つ
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // プロジェクトストアから最新のプロジェクトパスを取得
      try {
        const latestProjectPath = await window.electronAPI?.project?.getCurrentPath?.();
        return await loadImageWithRetry(filePath, latestProjectPath, retryCount + 1);
      } catch {
        // getCurrentPathが失敗した場合は再試行
        return await loadImageWithRetry(filePath, projectPath, retryCount + 1);
      }
    }
    
    // 相対パスの場合は絶対パスに変換
    const resolvedPath = projectPath ? resolveAssetPath(filePath, projectPath) : filePath;
    
    console.log('[loadImageAsDataUrl] Loading image:', {
      original: filePath,
      projectPath,
      resolved: resolvedPath,
      retryCount
    });
    
    // ElectronAPIを通じて画像ファイルを読み込み
    const imageData = await window.electronAPI?.fileSystem?.readImageAsDataUrl?.(resolvedPath);
    
    if (!imageData) {
      throw new Error('画像の読み込みに失敗しました');
    }
    
    console.debug('[loadImageAsDataUrl] Image loaded successfully, data length:', imageData.length);
    return imageData;
  } catch (error) {
    console.error('[loadImageAsDataUrl] Failed to load image:', {
      filePath,
      projectPath,
      retryCount,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // 相対パスでプロジェクトパスが利用できない場合で、まだ再試行可能な場合
    const isRelativePath = !filePath.startsWith('/') && !filePath.match(/^[A-Za-z]:/);
    if (isRelativePath && !projectPath && retryCount < maxRetries) {
      console.debug(`[loadImageAsDataUrl] Retrying after error (attempt ${retryCount + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      try {
        const latestProjectPath = await window.electronAPI?.project?.getCurrentPath?.();
        return await loadImageWithRetry(filePath, latestProjectPath, retryCount + 1);
      } catch {
        return await loadImageWithRetry(filePath, projectPath, retryCount + 1);
      }
    }
    
    // フォールバック：1x1透明PNG
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}

/**
 * 画像のサムネイルサイズを計算する
 */
export const calculateThumbnailSize = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio);
  
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio)
  };
};

/**
 * ファイル拡張子から画像タイプかどうかを判定
 */
export const isImageFile = (filePath: string): boolean => {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
  const extension = filePath.toLowerCase().split('.').pop();
  return extension ? imageExtensions.includes(`.${extension}`) : false;
};
