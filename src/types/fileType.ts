import type { FileCategory } from '../types/entities';

/**
 * サポートされているファイル拡張子
 */
const RASTER_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'];
const VECTOR_EXTENSIONS = ['.svg'];
const SUPPORTED_EXTENSIONS = [...RASTER_EXTENSIONS, ...VECTOR_EXTENSIONS];

export function getVectorExtensions(): string[] {
  return VECTOR_EXTENSIONS;
}
export function getRasterExtensions(): string[] {
  return RASTER_EXTENSIONS;
}
// ファイル拡張子のドットを除いたリストを返す
export function getSupportedExtensions(): string[] {
  return SUPPORTED_EXTENSIONS.map(ext => ext.slice(1));
}
