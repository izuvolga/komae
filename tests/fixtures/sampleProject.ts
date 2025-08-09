import { ProjectData, Asset, Page } from '../../src/types/entities';

export const mockImageAsset: Asset = {
  id: 'test-image-1',
  type: 'ImageAsset',
  name: 'テスト画像',
  original_file_path: 'assets/images/test-image.png', // 相対パス
  original_width: 300,
  original_height: 400,
  default_pos_x: 100,
  default_pos_y: 150,
  default_width: 300,
  default_height: 400,
  default_opacity: 1.0,
  default_z_index: 0,
  default_mask: [[0, 0], [300, 0], [300, 400], [0, 400]],
};

export const mockTextAsset: Asset = {
  id: 'test-text-1',
  type: 'TextAsset',
  name: 'テストテキスト',
  default_text: 'こんにちは\n世界',
  font: 'Arial',
  stroke_width: 2.0,
  stroke_color: '#000000',
  fill_color: '#FFFFFF',
  font_size: 24,
  default_pos_x: 200,
  default_pos_y: 300,
  opacity: 1.0,
  leading: 4.0,
  vertical: true,
  default_z_index: 1,
};

// TextAssetInstanceのモックデータ
export const mockTextAssetInstance = {
  id: 'instance-text-1',
  asset_id: 'test-text-1',
  override_text: '上書きされたテキスト',
  override_pos_x: 250,
  override_pos_y: 350,
  override_font_size: 28,
  override_opacity: 0.8,
  override_z_index: 2,
};

export const mockPage: Page = {
  id: 'test-page-1',
  title: 'テストページ',
  asset_instances: {
    'instance-1': {
      id: 'instance-1',
      asset_id: 'test-image-1',
      z_index: 0,
    },
    'instance-text-1': mockTextAssetInstance,
  },
};

export const mockProject: ProjectData = {
  metadata: {
    komae_version: '1.0',
    project_version: '1.0',
    title: 'テストプロジェクト',
    description: 'テスト用のプロジェクトデータ',
  },
  canvas: {
    width: 800,
    height: 600,
  },
  assets: {
    'test-image-1': mockImageAsset,
    'test-text-1': mockTextAsset,
  },
  pages: [mockPage], // 配列形式に変更
};