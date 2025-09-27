import {getRasterExtensions, getVectorExtensions} from '@/types/fileType';
import { FileCategory } from '@/types/entities';
import path from 'path';

/**
 * ファイルパスからファイルタイプを判定
 * @param filePath - ファイルパス
 * @returns 'raster' | 'vector'
 * @throws Error サポートされていないファイルタイプの場合
 */
export function determineFileType(filePath: string): FileCategory {
  const ext = path.extname(filePath).toLowerCase();

  if (getVectorExtensions().includes(ext)) {
    return 'vector';
  }

  if (getRasterExtensions().includes(ext)) {
    return 'raster';
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
