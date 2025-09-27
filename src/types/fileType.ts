export type FileCategory = 'raster' | 'vector';

interface fileTypeInfo {
  ext: string;
  mineType: string;
}

const RASTER_EXTENSIONS: fileTypeInfo[] = [
  { ext: '.png', mineType: 'image/png' },
  { ext: '.jpg', mineType: 'image/jpeg' },
  { ext: '.jpeg', mineType: 'image/jpeg' },
  { ext: '.webp', mineType: 'image/webp' },
  { ext: '.bmp', mineType: 'image/bmp' },
  { ext: '.gif', mineType: 'image/gif' },
];

const VECTOR_EXTENSIONS: fileTypeInfo[] = [
  { ext: '.svg', mineType: 'image/svg+xml' },
  // { ext: '.ai', mineType: 'application/postscript' },
  // { ext: '.eps', mineType: 'application/postscript' },
];
const SUPPORTED_EXTENSIONS = [...RASTER_EXTENSIONS, ...VECTOR_EXTENSIONS];

export function getVectorExtensions(): string[] {
  return VECTOR_EXTENSIONS.map(v => v.ext);
}
export function getRasterExtensions(): string[] {
  return RASTER_EXTENSIONS.map(v => v.ext);
}
export function getSupportedMimeTypes(): string[] {
  return SUPPORTED_EXTENSIONS.map(v => v.mineType);
}
// ファイル拡張子のドットを除いたリストを返す
export function getSupportedExtensionsNoDot(): string[] {
  return SUPPORTED_EXTENSIONS.map(v => v.ext.replace('.', ''));
}
export function getMimeTypeFromExtension(ext: string): string | null {
  // もしドットがなければ付与する
  if (!ext.startsWith('.')) {
    ext = '.' + ext;
  }
  const info = SUPPORTED_EXTENSIONS.find(v => v.ext === ext.toLowerCase());
  return info ? info.mineType : null;
}
