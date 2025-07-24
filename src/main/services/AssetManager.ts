import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileSystemService } from './FileSystemService';
import type { Asset, ImageAsset, TextAsset } from '../../types/entities';

export class AssetManager {
  private fileSystemService: FileSystemService;

  constructor() {
    this.fileSystemService = new FileSystemService();
  }

  async importAsset(filePath: string): Promise<Asset> {
    const extension = this.fileSystemService.getFileExtension(filePath);
    const fileName = this.fileSystemService.getFileName(filePath);

    if (this.isImageFile(extension)) {
      return await this.importImageAsset(filePath, fileName);
    } else {
      throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  private async importImageAsset(filePath: string, fileName: string): Promise<ImageAsset> {
    // 画像の基本情報を取得（実際の実装では画像ライブラリを使用）
    const imageInfo = await this.getImageInfo(filePath);
    
    const asset: ImageAsset = {
      id: `img-${uuidv4()}`,
      type: 'ImageAsset',
      name: fileName,
      original_file_path: filePath,
      original_width: imageInfo.width,
      original_height: imageInfo.height,
      default_pos_x: 0,
      default_pos_y: 0,
      default_opacity: 1.0,
      default_mask: [0, 0, imageInfo.width, imageInfo.height],
    };

    return asset;
  }

  async createTextAsset(name: string, defaultText: string): Promise<TextAsset> {
    const asset: TextAsset = {
      id: `text-${uuidv4()}`,
      type: 'TextAsset',
      name: name,
      default_text: defaultText,
      font: 'system-ui', // デフォルトフォント
      stroke_width: 2.0,
      font_size: 24,
      color_ex: '#000000',
      color_in: '#FFFFFF',
      default_pos_x: 100,
      default_pos_y: 100,
      vertical: false,
    };

    return asset;
  }

  async deleteAsset(assetId: string): Promise<void> {
    // TODO: アセットファイルの削除処理
    // プロジェクトディレクトリ内のアセットファイルを削除
    console.log(`Deleting asset: ${assetId}`);
  }

  async optimizeAsset(assetId: string): Promise<Asset> {
    // TODO: 画像最適化処理
    // 画像圧縮、リサイズなどの最適化
    throw new Error('Asset optimization not implemented yet');
  }

  private isImageFile(extension: string): boolean {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
    return imageExtensions.includes(extension);
  }

  private async getImageInfo(filePath: string): Promise<{ width: number; height: number }> {
    // TODO: 実際の画像情報を取得する実装
    // 現在はダミーデータを返す
    return { width: 800, height: 600 };
  }
}