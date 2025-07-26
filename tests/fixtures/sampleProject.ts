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
  default_opacity: 1.0,
  default_mask: [0, 0, 300, 400],
};

export const mockTextAsset: Asset = {
  id: 'test-text-1',
  type: 'TextAsset',
  name: 'テストテキスト',
  default_text: 'こんにちは',
  font: 'assets/fonts/test-font.ttf', // 相対パス
  stroke_width: 2.0,
  font_size: 24,
  color_ex: '#000000',
  color_in: '#FFFFFF',
  default_pos_x: 200,
  default_pos_y: 300,
  vertical: true,
};

export const mockPage: Page = {
  id: 'test-page-1',
  title: 'テストページ',
  asset_instances: {
    'instance-1': {
      id: 'instance-1',
      asset_id: 'test-image-1',
      z_index: 0,
      transform: {
        scale_x: 1.0,
        scale_y: 1.0,
        rotation: 0,
      },
      opacity: 1.0,
    },
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
  asset_attrs: {
    position_attrs: {
      'pos-center': {
        name: '中央位置',
        pos_x: 400,
        pos_y: 300,
      },
    },
    size_attrs: {
      'size-standard': {
        name: '標準サイズ',
        width: 320,
        height: 440,
      },
    },
  },
  assets: {
    'test-image-1': mockImageAsset,
    'test-text-1': mockTextAsset,
  },
  pages: [mockPage], // 配列形式に変更
};