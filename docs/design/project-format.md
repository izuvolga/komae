# Project Format Specification

Komaeプロジェクトはディレクトリベースで管理され、メインプロジェクトファイル（project.komae）にはYAML形式でプロジェクト情報を保存します。

## ディレクトリ構造

```
my_story/                          # プロジェクトディレクトリ
├── my_story.komae                 # メインプロジェクトファイル（YAML形式）
├── assets/                        # アセットファイル
│   ├── images/                    # 画像ファイル（PNG, WEBP形式）
│   └── fonts/                     # フォントファイル（TTF, OTF形式）
└── .komae/                        # 内部設定（隠しディレクトリ）
```

## project.komae の仕様

- **フォーマット**: YAML形式
- **相対パス参照**: アセットファイルは `assets/` からの相対パス
- **文字エンコーディング**: UTF-8


### クロスプラットフォーム対応

#### ファイル検出ロジック
アプリケーションは以下の順序でプロジェクトファイルを検出します：

1. **ディレクトリが指定された場合**
   - `[ディレクトリ名]/[ディレクトリ名].komae` を検索

2. **ファイルが指定された場合**（Windows主要パターン）:
   - 指定されたファイルを直接読み込み
   - 親ディレクトリを基準として相対パス解決

#### 開発・デバッグ時の配慮
- 開発モードでは両方のパターンをサポート
- ログ出力でどちらの方式で開かれたかを明示
- エラー時には適切なプラットフォーム固有のガイダンスを表示

```yaml
# プロジェクト基本情報
komae_version: "1.0"              # Komaeソフトウェアのバージョン
project_version: "1.0"            # プロジェクトファイル形式のバージョン
title: "私の物語"                  # プロジェクトの名称
description: "キャラクターの日常を描いた作品"  # プロジェクトの説明（オプション）

# キャンバス情報
canvas:
  width: 768                      # キャンバス幅
  height: 1024                    # キャンバス高さ

# Asset定義
assets:
  # ImageAsset
  img-character-a:
    type: "ImageAsset"
    name: "キャラクターA"
    original_file_path: "assets/images/character_a.png"
    original_width: 320
    original_height: 440
    default_pos_x: 200
    default_pos_y: 300
    default_opacity: 1.0
    default_mask: [0, 0, 320, 440]   # [left, top, right, bottom]
  
  img-background:
    type: "ImageAsset"
    name: "背景"
    original_file_path: "assets/images/background.png"
    original_width: 768
    original_height: 1024
    default_pos_x: 0
    default_pos_y: 0
    default_opacity: 1.0
    default_mask: [0, 0, 768, 1024]
  
  img-effect:
    type: "ImageAsset"
    name: "エフェクト"
    original_file_path: "assets/images/effect.png"
    original_width: 400
    original_height: 300
    default_pos_x: 100
    default_pos_y: 50
    default_opacity: 0.8
    default_mask: [0, 0, 400, 300]
  
  # TextAsset
  text-speech:
    type: "TextAsset"
    name: "セリフ"
    default_text: "こんにちは！"
    font: "assets/fonts/NotoSansJP-Regular.ttf"
    stroke_width: 2.0
    font_size: 24
    color_ex: "#000000"              # 縁取りの色
    color_in: "#FFFFFF"              # 内部の色
    default_pos_x: 150
    default_pos_y: 100
    vertical: true                   # 縦書き
  
  text-title:
    type: "TextAsset"
    name: "タイトル"
    default_text: "物語のタイトル"
    font: "assets/fonts/CustomFont-Bold.ttf"
    stroke_width: 3.0
    font_size: 32
    color_ex: "#000000"
    color_in: "#FF0000"
    default_pos_x: 384
    default_pos_y: 100
    vertical: false                  # 横書き

# ページ定義（配列形式 - 順序重要）
pages:
  - id: "page-1753563500000-35vhjp7gy"
    title: "ページ1"
    asset_instances:
      # 背景（最背面）
      instance-bg-001:
        asset_id: "img-background"
        z_index: 0
        # Asset Defaultを使用（参照なし）
        transform:
          scale_x: 1.0
          scale_y: 1.0
          rotation: 0
        opacity: 1.0
      
      # キャラクター
      instance-char-001:
        asset_id: "img-character-a"
        z_index: 1
        position_attr_id: "pos-left"    # PositionAssetAttr参照
        size_attr_id: "size-standard"   # SizeAssetAttr参照
        transform:
          scale_x: 1.2
          scale_y: 1.2
          rotation: 0
        opacity: 0.9
        override_mask: [10, 20, 310, 420]  # マスクをオーバーライド
      
      # セリフ
      instance-speech-001:
        asset_id: "text-speech"
        z_index: 2
        position_attr_id: "pos-speech"  # PositionAssetAttr参照
        override_text: "こんにちは！\nお元気ですか？"  # テキストをオーバーライド
        transform:
          scale_x: 1.0
          scale_y: 1.0
          rotation: 0
        opacity: 1.0
        font_override:                  # フォント設定をオーバーライド
          size: 20
          color_in: "#FFFF00"
  
  - id: "page-1753563500001-abvhjp7gy"
    title: "ページ2"
    asset_instances:
      # 背景（同じAssetを再利用）
      instance-bg-002:
        asset_id: "img-background"
        z_index: 0
        transform:
          scale_x: 1.0
          scale_y: 1.0
          rotation: 0
        opacity: 1.0
      
      # キャラクター（位置とスケールを変更）
      instance-char-002:
        asset_id: "img-character-a"
        z_index: 1
        position_attr_id: "pos-center"  # 異なるPositionAssetAttrを参照
        override_pos_x: 300             # さらに位置をオーバーライド
        override_pos_y: 400
        transform:
          scale_x: 0.8
          scale_y: 0.8
          rotation: -5                  # 少し回転
        opacity: 1.0
      
      # 返事のセリフ
      instance-reply-002:
        asset_id: "text-speech"
        z_index: 2
        override_pos_x: 400
        override_pos_y: 200
        override_text: "はい、元気です！"
        transform:
          scale_x: 1.0
          scale_y: 1.0
          rotation: 0
        opacity: 1.0
        font_override:
          size: 18
          color_ex: "#0000FF"
  
  - id: "page-1753563500002-cdvhjp7gy"
    title: "ページ3"
    asset_instances:
      # エフェクト背景
      instance-effect-003:
        asset_id: "img-effect"
        z_index: 0
        transform:
          scale_x: 2.0
          scale_y: 2.0
          rotation: 0
        opacity: 0.5
      
      # キャラクター（大きく表示）
      instance-char-003:
        asset_id: "img-character-a"
        z_index: 1
        position_attr_id: "pos-center"
        transform:
          scale_x: 1.5
          scale_y: 1.5
          rotation: 10
        opacity: 1.0
      
      # タイトル（横書き）
      instance-title-003:
        asset_id: "text-title"
        z_index: 2
        override_text: "終わり"
        transform:
          scale_x: 1.0
          scale_y: 1.0
          rotation: 0
        opacity: 1.0
```

## データ構造の特徴

### ページ順序の明確な管理

- **配列形式**: ページ順序が配列インデックスで明確に管理される
- **順序操作**: 挿入、移動、削除が直感的
- **UI連携**: SpreadSheetの行順序と配列順序が一致

### Asset/AssetInstanceの分離

- **Assets**: テンプレート定義（default値を持つ）
- **AssetInstances**: 各ページでの具体的な配置情報

### 参照とオーバーライドの階層

1. **Asset Default**: テンプレートのデフォルト値
3. **Override**: `override_*`で個別オーバーライド

### ID管理とページ操作

```typescript
// ページ順序変更
const movePageUp = (index: number) => {
  if (index > 0) {
    [pages[index], pages[index-1]] = [pages[index-1], pages[index]];
  }
};

// 新ページ挿入
const insertPageAt = (index: number, newPage: Page) => {
  pages.splice(index, 0, newPage);
};

// 自動ID生成
const createNewPage = (title: string): Page => ({
  id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title,
  asset_instances: {}
});
```

### 実用的な例

3ページの完整な例で以下を実証：
- 配列形式でのページ順序管理
- 同じAssetの異なる設定での再利用
- 個別オーバーライドによる細かな調整
- z_indexによるレイヤー管理
