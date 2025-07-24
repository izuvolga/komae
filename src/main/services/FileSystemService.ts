import * as fs from 'fs/promises';
import type { Stats } from 'fs';
import * as path from 'path';

export class FileSystemService {
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async copyFile(source: string, destination: string): Promise<void> {
    const destDir = path.dirname(destination);
    await this.ensureDirectory(destDir);
    await fs.copyFile(source, destination);
  }

  async readFile(filePath: string): Promise<Buffer> {
    return await fs.readFile(filePath);
  }

  async writeFile(filePath: string, data: Buffer | string): Promise<void> {
    const dir = path.dirname(filePath);
    await this.ensureDirectory(dir);
    await fs.writeFile(filePath, data);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      // ファイルが存在しない場合は無視
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getFileStats(filePath: string): Promise<Stats> {
    return await fs.stat(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  getFileName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }
}