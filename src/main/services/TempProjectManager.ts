import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getLogger } from '../../utils/logger';

export class TempProjectManager {
  private logger = getLogger();

  /**
   * 一時プロジェクトディレクトリを作成
   * ~/Library/Application Support/komae/Cache/tmp-project-<timestamp>/
   */
  async createTempProject(): Promise<string> {
    try {
      const userDataPath = app.getPath('userData');
      const cacheDir = path.join(userDataPath, 'Cache');
      const timestamp = Date.now();
      const tempProjectDir = path.join(cacheDir, `tmp-project-${timestamp}`);

      console.log('[TempProjectManager] Creating temporary project directory:', tempProjectDir);
      await this.logger.logDevelopment('temp_project_create_start', 'Creating temporary project directory', {
        tempProjectDir
      });

      // Cacheディレクトリを作成（存在しない場合）
      await fs.mkdir(cacheDir, { recursive: true });

      // 一時プロジェクトディレクトリを作成
      await fs.mkdir(tempProjectDir, { recursive: true });

      // assetsディレクトリを作成
      const assetsDir = path.join(tempProjectDir, 'assets');
      await fs.mkdir(assetsDir, { recursive: true });

      await this.logger.logDevelopment('temp_project_create_success', 'Temporary project directory created successfully', {
        tempProjectDir,
        assetsDir
      });

      console.log('[TempProjectManager] Successfully created temp project at:', tempProjectDir);
      console.log('[TempProjectManager] Assets directory created at:', assetsDir);
      return tempProjectDir;
    } catch (error) {
      await this.logger.logError('temp_project_create_error', error as Error, {});
      throw new Error(`Failed to create temporary project: ${error}`);
    }
  }

  /**
   * 一時プロジェクトを正式なプロジェクトディレクトリに移行
   * @param tempDir 一時ディレクトリのパス
   * @param targetDir 移行先ディレクトリのパス
   */
  async migrateTempProject(tempDir: string, targetDir: string): Promise<void> {
    try {
      await this.logger.logDevelopment('temp_project_migrate_start', 'Starting temp project migration', {
        from: tempDir,
        to: targetDir
      });

      // 移行先ディレクトリが存在するかチェック
      console.log('[TempProjectManager] Checking if target directory exists:', targetDir);
      const targetExists = await this.directoryExists(targetDir);
      console.log('[TempProjectManager] Target directory exists:', targetExists);
      if (targetExists) {
        throw new Error(`Target directory already exists: ${targetDir}`);
      }

      // 一時ディレクトリが存在するかチェック
      const tempExists = await this.directoryExists(tempDir);
      if (!tempExists) {
        throw new Error(`Temporary directory does not exist: ${tempDir}`);
      }

      // 移行先の親ディレクトリを作成
      const parentDir = path.dirname(targetDir);
      await fs.mkdir(parentDir, { recursive: true });

      // 一時ディレクトリの内容を移行先にコピー
      await this.copyDirectory(tempDir, targetDir);

      // 一時ディレクトリを削除
      await this.cleanupTempProject(tempDir);

      await this.logger.logDevelopment('temp_project_migrate_success', 'Temp project migration completed successfully', {
        from: tempDir,
        to: targetDir
      });

    } catch (error) {
      await this.logger.logError('temp_project_migrate_error', error as Error, {
        tempDir,
        targetDir
      });
      throw new Error(`Failed to migrate temporary project: ${error}`);
    }
  }

  /**
   * 一時プロジェクトディレクトリを削除
   * @param tempDir 削除する一時ディレクトリのパス
   */
  async cleanupTempProject(tempDir: string): Promise<void> {
    try {
      await this.logger.logDevelopment('temp_project_cleanup_start', 'Starting temp project cleanup', {
        tempDir
      });

      const exists = await this.directoryExists(tempDir);
      if (exists) {
        await fs.rm(tempDir, { recursive: true, force: true });
        await this.logger.logDevelopment('temp_project_cleanup_success', 'Temp project cleaned up successfully', {
          tempDir
        });
      } else {
        await this.logger.logDevelopment('temp_project_cleanup_skip', 'Temp project directory does not exist, skipping cleanup', {
          tempDir
        });
      }
    } catch (error) {
      await this.logger.logError('temp_project_cleanup_error', error as Error, {
        tempDir
      });
      // クリーンアップの失敗は致命的ではないため、エラーをログに記録するのみ
      console.warn(`Failed to cleanup temporary project: ${error}`);
    }
  }

  /**
   * 全ての一時プロジェクトをクリーンアップ（アプリ終了時用）
   */
  async cleanupAllTempProjects(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      const cacheDir = path.join(userDataPath, 'Cache');

      await this.logger.logDevelopment('temp_projects_cleanup_all_start', 'Starting cleanup of all temp projects', {
        cacheDir
      });

      const exists = await this.directoryExists(cacheDir);
      if (!exists) {
        return;
      }

      const entries = await fs.readdir(cacheDir, { withFileTypes: true });
      const tempProjectDirs = entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('tmp-project-'))
        .map(entry => path.join(cacheDir, entry.name));

      for (const tempDir of tempProjectDirs) {
        await this.cleanupTempProject(tempDir);
      }

      await this.logger.logDevelopment('temp_projects_cleanup_all_success', `Cleaned up ${tempProjectDirs.length} temp projects`, {
        count: tempProjectDirs.length
      });

    } catch (error) {
      await this.logger.logError('temp_projects_cleanup_all_error', error as Error, {});
      console.warn(`Failed to cleanup all temporary projects: ${error}`);
    }
  }

  /**
   * アプリ起動時に古い一時プロジェクトをクリーンアップ（現在のプロジェクト以外）
   * @param currentProjectPath 現在開いているプロジェクトのパス（除外対象）
   */
  async cleanupOldTempProjects(currentProjectPath?: string | null): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      const cacheDir = path.join(userDataPath, 'Cache');

      console.log('[TempProjectManager] Starting startup cleanup of old temp projects');
      console.log('[TempProjectManager] Current project path:', currentProjectPath);

      await this.logger.logDevelopment('temp_projects_startup_cleanup_start', 'Starting startup cleanup of old temp projects', {
        cacheDir,
        currentProjectPath
      });

      const exists = await this.directoryExists(cacheDir);
      if (!exists) {
        console.log('[TempProjectManager] Cache directory does not exist, nothing to cleanup');
        return;
      }

      const entries = await fs.readdir(cacheDir, { withFileTypes: true });
      const tempProjectDirs = entries
        .filter(entry => entry.isDirectory() && entry.name.startsWith('tmp-project-'))
        .map(entry => path.join(cacheDir, entry.name));

      console.log('[TempProjectManager] Found', tempProjectDirs.length, 'temp project directories');

      let cleanedCount = 0;
      for (const tempDir of tempProjectDirs) {
        // 現在のプロジェクトと同じディレクトリは削除しない
        if (currentProjectPath && tempDir === currentProjectPath) {
          console.log('[TempProjectManager] Skipping current project directory:', tempDir);
          continue;
        }

        await this.cleanupTempProject(tempDir);
        cleanedCount++;
      }

      await this.logger.logDevelopment('temp_projects_startup_cleanup_success', `Startup cleanup completed, cleaned ${cleanedCount} old temp projects`, {
        totalFound: tempProjectDirs.length,
        cleaned: cleanedCount,
        skipped: tempProjectDirs.length - cleanedCount
      });

      console.log('[TempProjectManager] Startup cleanup completed:', cleanedCount, 'directories cleaned');

    } catch (error) {
      await this.logger.logError('temp_projects_startup_cleanup_error', error as Error, {
        currentProjectPath
      });
      console.warn(`Failed to cleanup old temporary projects: ${error}`);
    }
  }

  /**
   * パスが一時プロジェクトかどうかを判定
   * @param projectPath プロジェクトのパス
   */
  isTempProject(projectPath: string | null): boolean {
    if (!projectPath) return false;
    const dirname = path.basename(projectPath);
    return dirname.startsWith('tmp-project-');
  }

  /**
   * 一時プロジェクトのキャッシュディレクトリのパスを取得
   */
  getTempProjectsCacheDir(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'Cache');
  }

  // ヘルパーメソッド
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      console.log('[TempProjectManager] Checking directory existence:', dirPath);
      const stats = await fs.stat(dirPath);
      const isDir = stats.isDirectory();
      console.log('[TempProjectManager] fs.stat result - isDirectory:', isDir, 'isFile:', stats.isFile());
      return isDir;
    } catch (error) {
      console.log('[TempProjectManager] fs.stat failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}