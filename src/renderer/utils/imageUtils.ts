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
    console.debug('[resolveAssetPath] Path is already absolute:', relativePath);
    return relativePath;
  }
  
  // プロジェクトディレクトリをベースとして相対パスを解決
  const resolvedPath = `${projectPath}/${relativePath}`;
  
  // 重複チェック：パス内に同じディレクトリ名が連続している場合の修正
  const pathParts = resolvedPath.split('/');
  const deduplicatedParts: string[] = [];
  
  for (let i = 0; i < pathParts.length; i++) {
    const currentPart = pathParts[i];
    const prevPart: string | undefined = deduplicatedParts[deduplicatedParts.length - 1];
    
    // 同じディレクトリ名が連続している場合はスキップ（ただし空文字列は除く）
    if (currentPart && currentPart === prevPart && currentPart.includes('.komae')) {
      console.warn('[resolveAssetPath] Duplicate directory detected, skipping:', currentPart);
      continue;
    }
    
    deduplicatedParts.push(currentPart);
  }
  
  const finalPath = deduplicatedParts.join('/');
  console.debug('[resolveAssetPath] Path resolution:', {
    original: relativePath,
    projectPath,
    resolved: resolvedPath,
    final: finalPath
  });
  
  return finalPath;
};

/**
 * ファイルパスから画像のBase64 DataURLを生成する
 * RendererプロセスからElectronAPIを通じて画像を読み込む
 */
export const loadImageAsDataUrl = async (filePath: string, projectPath?: string | null): Promise<string> => {
  try {
    // 相対パスの場合は絶対パスに変換
    const resolvedPath = projectPath ? resolveAssetPath(filePath, projectPath) : filePath;
    
    console.debug('[loadImageAsDataUrl] Loading image:', {
      original: filePath,
      projectPath,
      resolved: resolvedPath
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
      error: error instanceof Error ? error.message : String(error)
    });
    
    // フォールバック：1x1透明PNG
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
};

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