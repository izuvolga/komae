import { ProjectData, Asset, Page, AssetInstance } from '../../src/types/entities';

export const mockImageAsset: Asset = {
  id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
  type: 'ImageAsset',
  name: '1-18',
  original_file_path: 'assets/images/1-18.jpg',
  original_width: 1428,
  original_height: 802,
  default_pos_x: 8.571428571428651,
  default_pos_y: 260,
  default_width: 730.8571428571428,
  default_height: 410.4673869547819,
  default_opacity: 1,
  default_z_index: 0,
};

export const mockTextAsset: Asset = {
  id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
  type: 'TextAsset',
  name: 'New Text',
  default_text: '熱くなれよ！',
  default_fill_color: '#ff0000',
  default_stroke_color: '#000000',
  default_opacity: 1,
  default_z_index: 3,
  default_language_settings: {
    'ja': {
      override_pos_x: 134.13333333333335,
      override_pos_y: 400.37333333333333,
      override_font: 'system-ui',
      override_font_size: 80,
      override_stroke_width: 2,
      override_leading: 0,
      override_vertical: false,
    }
  }
};

export const mockVectorAsset: Asset = {
  id: 'vector-7011a954-c8c3-49bc-a48c-2554755d7da7',
  type: 'VectorAsset',
  name: 'rect',
  original_file_path: 'assets/vectors/rect.svg',
  original_width: 100,
  original_height: 100,
  default_pos_x: -25.093333333333348,
  default_pos_y: 207.01333333333332,
  default_width: 813.3866666666667,
  default_height: 420.8533333333334,
  default_opacity: 1,
  default_z_index: 2,
  svg_content: `<?xml version="1.0" standalone="no"?>
<svg width="100" height="100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="60" height="60" stroke="black" fill="transparent" stroke-width="5"/>
</svg>`,
};

export const mockPage1: Page = {
  id: 'page-6356f254-ca44-4700-ab0f-429955fe9472',
  title: 'Page 1',
  asset_instances: {
    'instance-1755323995449': {
      id: 'instance-1755323995449',
      asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
      override_z_index: 1,
    },
    'instance-1755353627147': {
      id: 'instance-1755353627147',
      asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
      multilingual_text: {
        ja: 'もっと！',
        en: 'Get more',
      },
    },
    'instance-1755353812019': {
      id: 'instance-1755353812019',
      asset_id: 'vector-7011a954-c8c3-49bc-a48c-2554755d7da7',
    },
  },
};

export const mockPage2: Page = {
  id: 'page-1755324019333',
  title: 'Page 2',
  asset_instances: {
    'instance-1755324022065': {
      id: 'instance-1755324022065',
      asset_id: 'img-f3227b66-61ec-428d-adb2-e4f1526e378c',
    },
    'instance-1755353628134': {
      id: 'instance-1755353628134',
      asset_id: 'text-1c835411-9001-4633-a120-2a8ae273b8cb',
    },
    'instance-1755353814087': {
      id: 'instance-1755353814087',
      asset_id: 'vector-7011a954-c8c3-49bc-a48c-2554755d7da7',
    },
  },
};

export const mockProject: ProjectData = {
  metadata: {
    komae_version: '1.0',
    project_version: '1.0',
    title: 'aaa',
    supportedLanguages: ['ja', 'en'],
    currentLanguage: 'ja',
  },
  canvas: {
    width: 768,
    height: 1024,
  },
  assets: {
    'img-f3227b66-61ec-428d-adb2-e4f1526e378c': mockImageAsset,
    'text-1c835411-9001-4633-a120-2a8ae273b8cb': mockTextAsset,
    'vector-7011a954-c8c3-49bc-a48c-2554755d7da7': mockVectorAsset,
  },
  pages: [mockPage1, mockPage2],
};

// Legacy exports for backward compatibility
export const mockTextAssetInstance = mockPage1.asset_instances['instance-1755353627147'];
export const mockPage = mockPage1;