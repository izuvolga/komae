// YAML プロジェクトファイル（project.komae）の保存・読み込み機能

import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { ProjectData } from '../types/entities';
import { validateProjectData } from './validation';

/**
 * プロジェクトファイル操作に関するエラー
 */
export class ProjectFileError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ProjectFileError';
  }
}

/**
 * プロジェクトデータをYAML形式でファイルに保存する
 * @param filePath 保存先ファイルパス
 * @param projectData 保存するプロジェクトデータ
 */
export async function saveProjectFile(filePath: string, projectData: ProjectData): Promise<void> {
  if (!filePath || filePath.trim() === '') {
    throw new ProjectFileError('Invalid file path provided', 'INVALID_PATH');
  }

  if (!projectData) {
    throw new ProjectFileError('Invalid project data provided', 'INVALID_DATA');
  }

  try {
    const yamlContent = yaml.dump(projectData, {
      indent: 2,
      lineWidth: -1, // 行の折り返しを無効にする
      noRefs: true,  // 参照を使わない
    });

    await fs.writeFile(filePath, yamlContent, 'utf8');
  } catch (error) {
    if (error instanceof ProjectFileError) {
      throw error;
    }
    throw new ProjectFileError(
      `Failed to save project file: ${error instanceof Error ? error.message : String(error)}`,
      'SAVE_FAILED'
    );
  }
}

/**
 * YAMLファイルからプロジェクトデータを読み込む
 * @param filePath 読み込み元ファイルパス
 * @returns プロジェクトデータ
 */
export async function loadProjectFile(filePath: string): Promise<ProjectData> {
  if (!filePath || filePath.trim() === '') {
    throw new ProjectFileError('Invalid file path provided', 'INVALID_PATH');
  }

  try {
    // ファイルの存在確認
    try {
      await fs.access(filePath);
    } catch {
      throw new ProjectFileError(`File not found: ${filePath}`, 'FILE_NOT_FOUND');
    }

    // ファイルを読み込み
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    // YAMLをパース
    let parsedData: any;
    try {
      parsedData = yaml.load(fileContent);
    } catch (yamlError) {
      throw new ProjectFileError(
        `Invalid YAML format: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`,
        'INVALID_YAML'
      );
    }

    // 基本的な構造検証
    if (!parsedData || typeof parsedData !== 'object') {
      throw new ProjectFileError('Invalid project structure: root must be an object', 'INVALID_STRUCTURE');
    }

    const requiredFields = ['metadata', 'canvas', 'assets', 'pages'];
    for (const field of requiredFields) {
      if (!(field in parsedData)) {
        throw new ProjectFileError(`Invalid project structure: missing required field '${field}'`, 'INVALID_STRUCTURE');
      }
    }

    // pages が配列であることを確認
    if (!Array.isArray(parsedData.pages)) {
      throw new ProjectFileError('Invalid project structure: pages must be an array', 'INVALID_STRUCTURE');
    }

    // Zodスキーマによる詳細なバリデーション
    try {
      return validateProjectData(parsedData);
    } catch (validationError: any) {
      console.error('Detailed validation error:', validationError);
      if (validationError.issues) {
        console.error('Validation issues:', JSON.stringify(validationError.issues, null, 2));
      }
      throw new ProjectFileError(
        `Project validation failed: ${validationError.message}`,
        'VALIDATION_FAILED'
      );
    }
  } catch (error) {
    if (error instanceof ProjectFileError) {
      throw error;
    }
    throw new ProjectFileError(
      `Failed to load project file: ${error instanceof Error ? error.message : String(error)}`,
      'LOAD_FAILED'
    );
  }
}