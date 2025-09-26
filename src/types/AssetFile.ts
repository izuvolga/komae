// AssetFileクラス - ファイル管理の統一クラス
import * as fs from 'fs';
import * as path from 'path';

export type FileType = 'raster' | 'vector';

export interface AssetFileData {
  path: string;
  type: FileType;
  hash: string;
  originalWidth: number;
  originalHeight: number;
}

/**
 * アセットファイルを管理するクラス
 * ラスタ画像とベクタ画像を統一的に扱う
 */
export class AssetFile {
  public readonly path: string;
  public readonly type: FileType;
  public readonly hash: string;
  public readonly originalWidth: number;
  public readonly originalHeight: number;

  constructor(params: {
    path: string;
    type: FileType;
    hash: string;
    originalWidth: number;
    originalHeight: number;
  }) {
    this.path = params.path;
    this.type = params.type;
    this.hash = params.hash;
    this.originalWidth = params.originalWidth;
    this.originalHeight = params.originalHeight;
  }

  /**
   * ファイル内容を読み込む（SVGファイルの場合）
   * ラスタ画像の場合は使用しない
   */
  async getContent(projectPath: string): Promise<string> {
    if (this.type !== 'vector') {
      throw new Error('getContent() is only available for vector files');
    }

    const fullPath = path.resolve(projectPath, this.path);
    return fs.readFileSync(fullPath, 'utf8');
  }

  /**
   * SVG要素を生成する統一インターフェース
   * ラスタ画像: <image>要素、ベクタ画像: SVGコンテンツ直接埋め込み
   */
  async generateSVGElement(
    width: number,
    height: number,
    projectPath: string,
    urlResolver?: (filePath: string, projectPath: string) => string
  ): Promise<string> {
    if (this.type === 'raster') {
      // ラスタ画像の場合：<image>要素を生成
      let protocolUrl: string;
      if (urlResolver) {
        protocolUrl = urlResolver(this.path, projectPath);
      } else {
        // Fallback: シンプルなfile://プロトコル
        const fullPath = path.resolve(projectPath, this.path);
        protocolUrl = `file://${fullPath}`;
      }
      return `<image xlink:href="${protocolUrl}" x="0" y="0" width="${width}" height="${height}" />`;
    } else {
      // ベクタ画像の場合：SVGコンテンツを直接読み込み
      const svgContent = await this.getContent(projectPath);
      return svgContent;
    }
  }

  /**
   * ファイルの整合性をチェック（ハッシュ値の比較）
   */
  async validateIntegrity(projectPath: string): Promise<boolean> {
    try {
      const { calculateFileHash } = await import('../utils/fileTypeDetection');
      const fullPath = path.resolve(projectPath, this.path);
      const currentHash = await calculateFileHash(fullPath);
      return currentHash === this.hash;
    } catch (error) {
      return false;
    }
  }

  /**
   * シリアライゼーション用のJSON形式に変換
   */
  toJSON(): AssetFileData {
    return {
      path: this.path,
      type: this.type,
      hash: this.hash,
      originalWidth: this.originalWidth,
      originalHeight: this.originalHeight,
    };
  }

  /**
   * JSON形式からAssetFileインスタンスを復元
   */
  static fromJSON(data: AssetFileData): AssetFile {
    return new AssetFile({
      path: data.path,
      type: data.type,
      hash: data.hash,
      originalWidth: data.originalWidth,
      originalHeight: data.originalHeight,
    });
  }

  /**
   * 重複検知（ハッシュベースでの比較）
   */
  static findDuplicates(files: AssetFile[]): AssetFile[][] {
    const hashGroups = new Map<string, AssetFile[]>();

    for (const file of files) {
      if (!hashGroups.has(file.hash)) {
        hashGroups.set(file.hash, []);
      }
      hashGroups.get(file.hash)!.push(file);
    }

    // 2つ以上のファイルを持つグループのみ返す（重複）
    return Array.from(hashGroups.values()).filter(group => group.length > 1);
  }
}