/**
 * 相対パスを絶対パスに変換する
 * プロジェクトディレクトリをベースとして相対パスを解決
 */
const resolveAssetPath = (relativePath: string, projectPath: string | null): string => {
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
const getAbsoluteImagePath = (relativePath: string, projectPath: string | null): string => {
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

  // 絶対パスをカスタムプロトコルURLに変換（パス区切り文字はエンコードしない）
  // パスの各セグメントをエンコードしてから結合
  const pathSegments = absolutePath.split('/');
  const encodedSegments = pathSegments.map(segment => {
    // 空のセグメント（ルートの場合など）はそのまま
    if (segment === '') return segment;
    // 各セグメントをエンコード（ファイル名に特殊文字が含まれる場合に対応）
    return encodeURIComponent(segment);
  });
  const encodedPath = encodedSegments.join('/');

  return `komae-asset://${encodedPath}`;
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
