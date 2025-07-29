/**
 * エクスポート先ディレクトリ構造管理機能
 * docs/design/export-directory-structure.md の仕様に基づく実装
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ExportFormat } from '../types/entities';

/**
 * エクスポートディレクトリ準備のオプション
 */
export interface ExportDirectoryOptions {
  format: ExportFormat;
  outputPath: string;
  projectName: string;
  overwriteExisting: boolean;
  pageCount?: number; // PNG形式で必要
}

/**
 * ディレクトリ準備結果
 */
export interface ExportDirectoryResult {
  success: boolean;
  outputPath: string;
  error?: string;
  conflictingPaths?: string[];
  expectedPagePaths?: string[]; // PNG形式の場合のページファイルパス
}

/**
 * ディレクトリ検証結果
 */
export interface DirectoryValidationResult {
  isValid: boolean;
  canWrite: boolean;
  hasConflicts: boolean;
  conflictingItems: string[];
  errors: string[];
}

/**
 * ディレクトリ検証オプション
 */
export interface ValidationOptions {
  expectedFiles?: string[];
}

/**
 * エクスポートディレクトリ管理クラス
 */
export class ExportDirectoryManager {
  
  /**
   * エクスポート用ディレクトリを準備する
   */
  async prepareExportDirectory(options: ExportDirectoryOptions): Promise<ExportDirectoryResult> {
    // 入力検証
    if (!options.projectName || options.projectName.trim() === '') {
      return {
        success: false,
        outputPath: '',
        error: 'プロジェクト名は必須です'
      };
    }

    if (!['html', 'png', 'svg'].includes(options.format)) {
      return {
        success: false,
        outputPath: '',
        error: `サポートされていないエクスポート形式: ${options.format}`
      };
    }

    if (options.format === 'png' && (options.pageCount === undefined || options.pageCount <= 0)) {
      return {
        success: false,
        outputPath: '',
        error: 'PNG形式ではページ数 (pageCount) が必要です'
      };
    }

    try {
      if (options.format === 'html') {
        return await this.prepareHtmlExport(options);
      } else if (options.format === 'png') {
        return await this.preparePngExport(options);
      } else {
        return {
          success: false,
          outputPath: '',
          error: `エクスポート形式 ${options.format} はまだ実装されていません`
        };
      }
    } catch (error) {
      return {
        success: false,
        outputPath: '',
        error: `エクスポート準備エラー: ${error}`
      };
    }
  }

  /**
   * HTML形式エクスポート用のディレクトリ準備
   */
  private async prepareHtmlExport(options: ExportDirectoryOptions): Promise<ExportDirectoryResult> {
    const fileName = this.generateOutputFileName(options.projectName, 'html');
    const outputFilePath = path.join(options.outputPath, fileName);
    
    // 既存ファイルの競合チェック
    if (!options.overwriteExisting) {
      try {
        await fs.access(outputFilePath, fs.constants.F_OK);
        return {
          success: false,
          outputPath: outputFilePath,
          error: '既存のファイルが存在します',
          conflictingPaths: [outputFilePath]
        };
      } catch {
        // ファイルが存在しないのでOK
      }
    }

    // 親ディレクトリの作成
    try {
      await fs.mkdir(options.outputPath, { recursive: true });
    } catch (error) {
      return {
        success: false,
        outputPath: outputFilePath,
        error: `出力ディレクトリの作成に失敗: ${error}`
      };
    }

    return {
      success: true,
      outputPath: outputFilePath
    };
  }

  /**
   * PNG形式エクスポート用のディレクトリ準備
   */
  private async preparePngExport(options: ExportDirectoryOptions): Promise<ExportDirectoryResult> {
    const projectDirName = this.generateOutputFileName(options.projectName, 'png');
    const projectDirPath = path.join(options.outputPath, projectDirName);
    
    // 既存ディレクトリの競合チェック
    if (!options.overwriteExisting) {
      try {
        await fs.access(projectDirPath, fs.constants.F_OK);
        return {
          success: false,
          outputPath: projectDirPath,
          error: '既存のディレクトリが存在します',
          conflictingPaths: [projectDirPath]
        };
      } catch {
        // ディレクトリが存在しないのでOK
      }
    }

    // プロジェクトディレクトリの作成
    try {
      await fs.mkdir(projectDirPath, { recursive: true });
      
      // 既存のディレクトリの場合は中身をクリーンアップ
      if (options.overwriteExisting) {
        await this.cleanupTemporaryFiles(projectDirPath);
      }
    } catch (error) {
      return {
        success: false,
        outputPath: projectDirPath,
        error: `プロジェクトディレクトリの作成に失敗: ${error}`
      };
    }

    // 期待されるページファイルパスを生成
    const expectedPagePaths: string[] = [];
    for (let i = 1; i <= (options.pageCount || 0); i++) {
      expectedPagePaths.push(path.join(projectDirPath, `${i}.png`));
    }

    return {
      success: true,
      outputPath: projectDirPath,
      expectedPagePaths
    };
  }

  /**
   * 出力パスの検証を行う
   */
  async validateOutputPath(outputPath: string, options?: ValidationOptions): Promise<DirectoryValidationResult> {
    const result: DirectoryValidationResult = {
      isValid: true,
      canWrite: true,
      hasConflicts: false,
      conflictingItems: [],
      errors: []
    };

    try {
      // 親ディレクトリの存在確認と作成可能性チェック
      const parentDir = path.dirname(outputPath);
      
      try {
        await fs.access(parentDir, fs.constants.F_OK);
      } catch {
        // 親ディレクトリが存在しない場合、作成可能かチェック
        try {
          await fs.mkdir(parentDir, { recursive: true });
          await fs.rmdir(parentDir); // テスト用に作成したディレクトリを削除
        } catch (error) {
          result.isValid = false;
          result.canWrite = false;
          result.errors.push('出力先ディレクトリを作成できません');
          return result;
        }
      }

      // 書き込み権限チェック
      try {
        await fs.access(parentDir, fs.constants.W_OK);
      } catch {
        result.isValid = false;
        result.canWrite = false;
        result.errors.push('出力先ディレクトリに書き込み権限がありません');
        return result;
      }

      // 期待されるファイルとの競合チェック
      if (options?.expectedFiles) {
        try {
          const existingItems = await fs.readdir(outputPath);
          
          for (const expectedFile of options.expectedFiles) {
            if (existingItems.includes(expectedFile)) {
              result.hasConflicts = true;
              result.conflictingItems.push(expectedFile);
            }
          }
          
          if (result.hasConflicts) {
            result.isValid = false;
            result.errors.push('既存のファイルとの競合があります');
          }
        } catch {
          // ディレクトリが存在しない場合は競合なし
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`検証エラー: ${error}`);
    }

    return result;
  }

  /**
   * ファイル名をサニタイズする（安全な文字のみ使用）
   */
  sanitizeFileName(fileName: string): string {
    // 危険な文字を除去し、安全なファイル名を生成
    return fileName
      .replace(/[<>:"/\\|?*]/g, '') // Windows/Linux で危険な文字を除去
      .replace(/\s+/g, '_') // 複数の空白文字をアンダースコアに変換
      .replace(/^\.+/, '') // 先頭のドット除去
      .trim() || 'untitled'; // 空になった場合はデフォルト名
  }

  /**
   * エクスポート形式に応じた出力ファイル名を生成する
   */
  generateOutputFileName(projectName: string, format: ExportFormat): string {
    const safeName = this.sanitizeFileName(projectName);
    
    switch (format) {
      case 'html':
        return `${safeName}.html`;
      case 'png':
        return safeName; // PNGの場合はディレクトリ名
      case 'svg':
        return safeName; // SVGの場合もディレクトリ名（将来実装）
      default:
        throw new Error(`サポートされていないエクスポート形式: ${format}`);
    }
  }

  /**
   * 一時ファイルのクリーンアップ
   */
  async cleanupTemporaryFiles(directoryPath: string): Promise<void> {
    try {
      // ディレクトリ内のすべてのファイルとサブディレクトリを削除
      const items = await fs.readdir(directoryPath);
      
      for (const item of items) {
        const itemPath = path.join(directoryPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          await fs.rm(itemPath, { recursive: true, force: true });
        } else {
          await fs.unlink(itemPath);
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合やアクセス権限がない場合は無視
      console.warn(`一時ファイルのクリーンアップに失敗: ${error}`);
    }
  }
}