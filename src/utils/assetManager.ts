// 相対パス解決とアセットファイル管理機能

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * アセット管理に関するエラー
 */
export class AssetManagerError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'AssetManagerError';
  }
}

/**
 * アセットタイプ
 */
export type AssetType = 'raster' | 'vector';

/**
 * 相対パスを絶対パスに解決する
 * @param projectPath プロジェクトディレクトリのパス
 * @param assetPath アセットの相対パスまたは絶対パス
 * @returns 絶対パス
 */
export function resolveAssetPath(projectPath: string, assetPath: string): string {
  if (!assetPath || assetPath.trim() === '') {
    throw new AssetManagerError('Invalid asset path provided', 'INVALID_PATH');
  }
  // 既に絶対パスの場合はそのまま返す
  if (path.isAbsolute(assetPath)) {
    return assetPath;
  }
  return path.join(projectPath, assetPath);
}

/**
 * 絶対パスを相対パスに変換する
 * @param projectPath プロジェクトディレクトリのパス
 * @param absolutePath 絶対パス
 * @returns 相対パス
 */
export function makeAssetPathRelative(projectPath: string, absolutePath: string): string {
  // 既に相対パスの場合はそのまま返す
  if (!path.isAbsolute(absolutePath)) {
    return absolutePath;
  }

  // プロジェクトディレクトリ内のパスかチェック
  const relativePath = path.relative(projectPath, absolutePath);

  // プロジェクト外のパスの場合（../ で始まる）
  if (relativePath.startsWith('..')) {
    throw new AssetManagerError(
      `Path is outside project directory: ${absolutePath}`,
      'PATH_OUTSIDE_PROJECT'
    );
  }

  return relativePath;
}

/**
 * アセットファイルをプロジェクトにコピーする
 * @param projectPath プロジェクトディレクトリのパス
 * @param sourceFilePath コピー元ファイルのパス
 * @param assetType アセットタイプ ('images' または 'vectors' または 'fonts')
 * @returns コピー先の相対パス
 */
export async function copyAssetToProject(
  projectPath: string,
  sourceFilePath: string,
  assetType: 'images' | 'vectors' | 'fonts'
): Promise<string> {
  // パラメータ検証
  if (!projectPath || !sourceFilePath) {
    throw new AssetManagerError('Invalid parameters provided', 'INVALID_PARAMETERS');
  }

  if (assetType !== 'images' && assetType !== 'vectors' && assetType !== 'fonts') {
    throw new AssetManagerError(`Invalid asset type: ${assetType}`, 'INVALID_ASSET_TYPE');
  }

  // ソースファイルの存在確認
  try {
    const sourceStats = await fs.stat(sourceFilePath);
    if (!sourceStats.isFile()) {
      throw new AssetManagerError(`Source is not a file: ${sourceFilePath}`, 'SOURCE_NOT_FILE');
    }
  } catch (error: any) {
    if (error instanceof AssetManagerError) {
      throw error;
    }
    throw new AssetManagerError(`Source file not found: ${sourceFilePath}`, 'SOURCE_NOT_FOUND');
  }

  // ファイル名と拡張子を取得
  const originalFileName = path.basename(sourceFilePath);
  const extension = path.extname(originalFileName);
  const nameWithoutExt = path.basename(originalFileName, extension);

  // 保存先ディレクトリを決定
  const targetDir = path.join(projectPath, 'assets', assetType);

  // ディレクトリが存在しない場合は作成
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (error) {
    throw new AssetManagerError(
      `Failed to create target directory: ${targetDir}`,
      'DIRECTORY_CREATE_FAILED'
    );
  }

  // ファイル名の重複チェックと連番生成
  let targetFileName = originalFileName;
  let targetPath = path.join(targetDir, targetFileName);
  let counter = 1;

  try {
    while (true) {
      try {
        await fs.access(targetPath);
        // ファイルが存在する場合は連番を付ける
        targetFileName = `${nameWithoutExt}_${counter}${extension}`;
        targetPath = path.join(targetDir, targetFileName);
        counter++;
      } catch {
        // ファイルが存在しない場合は使用可能
        break;
      }
    }

    // ファイルをコピー
    await fs.copyFile(sourceFilePath, targetPath);

    // 相対パスを返す
    return path.join('assets', assetType, targetFileName);
  } catch (error) {
    throw new AssetManagerError(
      `Failed to copy asset: ${error instanceof Error ? error.message : String(error)}`,
      'COPY_FAILED'
    );
  }
}

/**
 * アセットファイルを検証する
 * @param filePath ファイルパス
 * @param expectedType 期待するアセットタイプ
 * @returns 検証が成功した場合はtrue
 */
export async function validateAssetFile(filePath: string, expectedType: AssetType): Promise<boolean> {
  // ファイルの存在確認
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new AssetManagerError(`Path is not a file: ${filePath}`, 'NOT_A_FILE');
    }
  } catch (error: any) {
    if (error instanceof AssetManagerError) {
      throw error;
    }
    throw new AssetManagerError(`File not found: ${filePath}`, 'FILE_NOT_FOUND');
  }

  // ファイル拡張子からタイプを判定
  const extension = path.extname(filePath);
  try {
    const actualType = getAssetTypeFromExtension(extension);
    if (actualType !== expectedType) {
      throw new AssetManagerError(
        `File type mismatch: expected ${expectedType}, but got ${actualType}`,
        'TYPE_MISMATCH'
      );
    }
  } catch (error) {
    if (error instanceof AssetManagerError) {
      throw error;
    }
    throw new AssetManagerError(`Failed to validate file: ${String(error)}`, 'VALIDATION_FAILED');
  }

  return true;
}

/**
 * ファイル拡張子からアセットタイプを取得する
 * @param extension ファイル拡張子（.を含む）
 * @returns アセットタイプ
 */
export function getAssetTypeFromExtension(extension: string): AssetType {
  const lowerExt = extension.toLowerCase();

  // 画像ファイル拡張子
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
  if (imageExtensions.includes(lowerExt)) {
    return 'raster';
  }

  // ベクター画像ファイル拡張子
  const vectorExtensions = ['.svg'];
  if (vectorExtensions.includes(lowerExt)) {
    return 'vector';
  }

  throw new AssetManagerError(`Unsupported file extension: ${extension}`, 'UNSUPPORTED_EXTENSION');
}

/**
 * プロジェクトからアセットファイルを削除
 */
export async function deleteAssetFromProject(
  projectPath: string,
  assetPath: string
): Promise<void> {
  try {
    // パスを正規化（相対パスまたは絶対パス両方に対応）
    let targetPath: string;

    if (path.isAbsolute(assetPath)) {
      // 絶対パスの場合、プロジェクト内かチェック
      if (!assetPath.startsWith(projectPath)) {
        throw new AssetManagerError(
          `Asset file is outside project directory: ${assetPath}`,
          'INVALID_PATH'
        );
      }
      targetPath = assetPath;
    } else {
      // 相対パスの場合
      if (assetPath.includes('..')) {
        throw new AssetManagerError(
          `Invalid relative path (contains '..'): ${assetPath}`,
          'INVALID_PATH'
        );
      }
      targetPath = path.join(projectPath, assetPath);
    }

    // ファイルの存在確認
    try {
      const stats = await fs.stat(targetPath);
      if (!stats.isFile()) {
        throw new AssetManagerError(
          `Path is not a file: ${assetPath}`,
          'NOT_A_FILE'
        );
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AssetManagerError(
          `Asset file not found: ${assetPath}`,
          'FILE_NOT_FOUND'
        );
      }
      throw error;
    }

    // ファイルを削除
    await fs.unlink(targetPath);

  } catch (error) {
    if (error instanceof AssetManagerError) {
      throw error;
    }
    throw new AssetManagerError(
      `Failed to delete asset file: ${error instanceof Error ? error.message : String(error)}`,
      'DELETE_FAILED'
    );
  }
}
