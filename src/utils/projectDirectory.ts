// プロジェクトディレクトリの作成・管理機能

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * プロジェクトディレクトリ操作に関するエラー
 */
export class ProjectDirectoryError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ProjectDirectoryError';
  }
}

/**
 * プロジェクトディレクトリを作成する
 * @param projectPath プロジェクトディレクトリのパス
 */
export async function createProjectDirectory(projectPath: string): Promise<void> {
  // パスの検証
  if (!projectPath || projectPath.trim() === '') {
    throw new ProjectDirectoryError('Invalid project path provided', 'INVALID_PATH');
  }

  // 既存ディレクトリの確認
  try {
    await fs.access(projectPath);
    throw new ProjectDirectoryError(`Directory already exists: ${projectPath}`, 'DIRECTORY_EXISTS');
  } catch (error: any) {
    // ディレクトリが存在しない場合は続行（期待する動作）
    if (error instanceof ProjectDirectoryError) {
      throw error;
    }
  }

  try {
    // プロジェクトディレクトリを作成
    await fs.mkdir(projectPath, { recursive: true });
    
    // アセットディレクトリ構造を作成
    await ensureAssetsDirectories(projectPath);
  } catch (error) {
    throw new ProjectDirectoryError(
      `Failed to create project directory: ${error instanceof Error ? error.message : String(error)}`,
      'CREATE_FAILED'
    );
  }
}

/**
 * プロジェクトディレクトリの構造を検証する
 * @param projectPath プロジェクトディレクトリのパス
 * @returns 検証が成功した場合はtrue
 */
export async function validateProjectDirectory(projectPath: string): Promise<boolean> {
  // パスの検証
  if (!projectPath || projectPath.trim() === '') {
    throw new ProjectDirectoryError('Invalid project path provided', 'INVALID_PATH');
  }

  try {
    // プロジェクトディレクトリの存在確認
    const dirStats = await fs.stat(projectPath);
    if (!dirStats.isDirectory()) {
      throw new ProjectDirectoryError(`Path is not a directory: ${projectPath}`, 'NOT_DIRECTORY');
    }

    // project.komae ファイルの存在確認
    const projectFilePath = getProjectFilePath(projectPath);
    try {
      const fileStats = await fs.stat(projectFilePath);
      if (!fileStats.isFile()) {
        throw new ProjectDirectoryError(`project.komae is not a file: ${projectFilePath}`, 'INVALID_PROJECT_FILE');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new ProjectDirectoryError(`project.komae file not found: ${projectFilePath}`, 'PROJECT_FILE_MISSING');
      }
      throw error;
    }

    // assets/ ディレクトリの存在確認
    const assetsPath = getAssetsDirectoryPath(projectPath);
    try {
      const assetsStats = await fs.stat(assetsPath);
      if (!assetsStats.isDirectory()) {
        throw new ProjectDirectoryError(`assets path is not a directory: ${assetsPath}`, 'INVALID_ASSETS_DIR');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new ProjectDirectoryError(`assets directory not found: ${assetsPath}`, 'ASSETS_DIR_MISSING');
      }
      throw error;
    }

    return true;
  } catch (error: any) {
    if (error instanceof ProjectDirectoryError) {
      throw error;
    }
    if (error.code === 'ENOENT') {
      throw new ProjectDirectoryError(`Directory not found: ${projectPath}`, 'DIRECTORY_NOT_FOUND');
    }
    throw new ProjectDirectoryError(
      `Failed to validate project directory: ${error.message}`,
      'VALIDATION_FAILED'
    );
  }
}

/**
 * プロジェクトファイル（project.komae）のパスを取得する
 * @param projectPath プロジェクトディレクトリのパス
 * @returns project.komaeファイルのフルパス
 */
export function getProjectFilePath(projectPath: string): string {
  return path.join(projectPath, 'project.komae');
}

/**
 * アセットディレクトリのパスを取得する
 * @param projectPath プロジェクトディレクトリのパス
 * @returns assetsディレクトリのフルパス
 */
export function getAssetsDirectoryPath(projectPath: string): string {
  return path.join(projectPath, 'assets');
}

/**
 * アセット用のサブディレクトリ（images/、fonts/）を作成する
 * @param projectPath プロジェクトディレクトリのパス
 */
export async function ensureAssetsDirectories(projectPath: string): Promise<void> {
  const assetsPath = getAssetsDirectoryPath(projectPath);
  const imagesPath = path.join(assetsPath, 'images');
  const fontsPath = path.join(assetsPath, 'fonts');

  await fs.mkdir(assetsPath, { recursive: true });
  await fs.mkdir(imagesPath, { recursive: true });
  await fs.mkdir(fontsPath, { recursive: true });
}
