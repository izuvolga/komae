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
 * @param projectPath プロジェクトディレクトリのパス (.komae拡張子)
 */
export async function createProjectDirectory(projectPath: string): Promise<void> {
  // TODO: 実装が必要
  throw new Error('createProjectDirectory not implemented');
}

/**
 * プロジェクトディレクトリの構造を検証する
 * @param projectPath プロジェクトディレクトリのパス
 * @returns 検証が成功した場合はtrue
 */
export async function validateProjectDirectory(projectPath: string): Promise<boolean> {
  // TODO: 実装が必要
  throw new Error('validateProjectDirectory not implemented');
}

/**
 * プロジェクトファイル（project.komae）のパスを取得する
 * @param projectPath プロジェクトディレクトリのパス
 * @returns project.komaeファイルのフルパス
 */
export function getProjectFilePath(projectPath: string): string {
  // TODO: 実装が必要
  throw new Error('getProjectFilePath not implemented');
}

/**
 * アセットディレクトリのパスを取得する
 * @param projectPath プロジェクトディレクトリのパス
 * @returns assetsディレクトリのフルパス
 */
export function getAssetsDirectoryPath(projectPath: string): string {
  // TODO: 実装が必要
  throw new Error('getAssetsDirectoryPath not implemented');
}

/**
 * アセット用のサブディレクトリ（images/、fonts/）を作成する
 * @param projectPath プロジェクトディレクトリのパス
 */
export async function ensureAssetsDirectories(projectPath: string): Promise<void> {
  // TODO: 実装が必要
  throw new Error('ensureAssetsDirectories not implemented');
}