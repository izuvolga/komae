// ファイルタイプ判定とハッシュ計算ユーティリティ
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FileType } from '../types/AssetFile';

/**
 * サポートされているファイル拡張子
 */
const RASTER_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'];
const VECTOR_EXTENSIONS = ['.svg'];
const SUPPORTED_EXTENSIONS = [...RASTER_EXTENSIONS, ...VECTOR_EXTENSIONS];

/**
 * ファイルパスからファイルタイプを判定
 * @param filePath - ファイルパス
 * @returns 'raster' | 'vector'
 * @throws Error サポートされていないファイルタイプの場合
 */
export function determineFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();

  if (VECTOR_EXTENSIONS.includes(ext)) {
    return 'vector';
  }

  if (RASTER_EXTENSIONS.includes(ext)) {
    return 'raster';
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * ファイルがサポートされているかどうかを判定
 * @param filePath - ファイルパス
 * @returns boolean
 */
export function isSupportedFileType(filePath: string): boolean {
  try {
    determineFileType(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * ファイルのハッシュ値を計算
 * @param filePath - ファイルパス
 * @returns Promise<string> SHA-256ハッシュ値
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * サポートされているファイル拡張子の一覧を取得
 * @returns string[] 拡張子のリスト
 */
export function getSupportedExtensions(): string[] {
  return [...SUPPORTED_EXTENSIONS];
}

/**
 * ラスタ画像の拡張子かどうかを判定
 * @param filePath - ファイルパス
 * @returns boolean
 */
export function isRasterExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return RASTER_EXTENSIONS.includes(ext);
}

/**
 * ベクタ画像の拡張子かどうかを判定
 * @param filePath - ファイルパス
 * @returns boolean
 */
export function isVectorExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return VECTOR_EXTENSIONS.includes(ext);
}