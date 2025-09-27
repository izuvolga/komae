import * as fs from 'fs/promises';
import type { Stats } from 'fs';
import * as path from 'path';
import { getMimeTypeFromExtension } from '@/types/fileType';

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

  /**
   * 画像ファイルをBase64 DataURLとして読み込む
   */
  async readImageAsDataUrl(filePath: string): Promise<string> {
    try {
      console.debug('[FileSystemService] Reading image file:', filePath);
      
      // 相対パスが渡された場合の警告
      if (!filePath.startsWith('/') && !filePath.match(/^[A-Za-z]:/)) {
        console.warn('[FileSystemService] Relative path detected - this should be resolved before reaching main process:', filePath);
      }
      
      const imageBuffer = await fs.readFile(filePath);
      const mimeType = this.getMimeType(filePath);
      const base64Data = imageBuffer.toString('base64');
      return `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error('Failed to read image file:', error);
      console.error('[FileSystemService] File path that failed:', filePath);
      
      // フォールバック：1x1透明PNG
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
  }

  /**
   * ファイル拡張子からMIMEタイプを取得
   */
  private getMimeType(filePath: string): string {
    const ext = this.getFileExtension(filePath);
    return getMimeTypeFromExtension(ext) ?? 'image/png';
  }
}
