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
    default_width: 320
    default_height: 440
    default_opacity: 1.0
    default_z_index: 1
    default_mask: [0, 0, 320, 440]   # [left, top, right, bottom]
  
  img-background:
    type: "ImageAsset"
    name: "背景"
    original_file_path: "assets/images/background.png"
    original_width: 768
    original_height: 1024
    default_pos_x: 0
    default_pos_y: 0
    default_width: 768
    default_height: 1024
    default_opacity: 1.0
    default_z_index: 0
    default_mask: [0, 0, 768, 1024]
  
  img-effect:
    type: "ImageAsset"
    name: "エフェクト"
    original_file_path: "assets/images/effect.png"
    original_width: 400
    original_height: 300
    default_pos_x: 100
    default_pos_y: 50
    default_width: 400
    default_height: 300
    default_opacity: 0.8
    default_z_index: 2
    default_mask: [0, 0, 400, 300]
  
  # TextAsset
  text-speech:
    type: "TextAsset"
    name: "セリフ"
    default_text: "こんにちは！"
    font: "assets/fonts/NotoSansJP-Regular.ttf"
    stroke_width: 2.0
    font_size: 24
    stroke_color: "#000000"          # 縁取りの色
    fill_color: "#FFFFFF"            # 内部の色
    default_pos_x: 150
    default_pos_y: 100
    opacity: 1.0
    leading: 28
    vertical: true                   # 縦書き
    default_z_index: 10
  
  text-title:
    type: "TextAsset"
    name: "タイトル"
    default_text: "物語のタイトル"
    font: "assets/fonts/CustomFont-Bold.ttf"
    stroke_width: 3.0
    font_size: 32
    stroke_color: "#000000"
    fill_color: "#FF0000"
    default_pos_x: 384
    default_pos_y: 100
    opacity: 1.0
    leading: 36
    vertical: false                  # 横書き
    default_z_index: 5

# ページ定義（配列形式 - 順序重要）
pages:
  - id: "page-1753563500000-35vhjp7gy"
    title: "ページ1"
    asset_instances:
      # 背景（最背面）
      instance-bg-001:
        asset_id: "img-background"
        # Asset のdefault_z_index (0) を使用
      
      # キャラクター
      instance-char-001:
        asset_id: "img-character-a"
        # Asset のdefault_z_index (1) を使用
        override_pos_x: 200
        override_pos_y: 300
        override_width: 384            # 1.2倍にスケール
        override_height: 528           # 1.2倍にスケール
        override_opacity: 0.9
        override_mask: [10, 20, 310, 420]  # マスクをオーバーライド
      
      # セリフ
      instance-speech-001:
        asset_id: "text-speech"
        override_z_index: 15           # デフォルト(10)より前面に表示
        override_pos_x: 150
        override_pos_y: 100
        override_text: "こんにちは！\nお元気ですか？"  # テキストをオーバーライド
        override_font_size: 20
  
  - id: "page-1753563500001-abvhjp7gy"
    title: "ページ2"
    asset_instances:
      # 背景（同じAssetを再利用）
      instance-bg-002:
        asset_id: "img-background"
        # Asset のdefault_z_index (0) を使用
      
      # キャラクター（位置とスケールを変更）
      instance-char-002:
        asset_id: "img-character-a"
        # Asset のdefault_z_index (1) を使用
        override_pos_x: 300
        override_pos_y: 400
        override_width: 256            # 0.8倍にスケール
        override_height: 352           # 0.8倍にスケール
      
      # 返事のセリフ
      instance-reply-002:
        asset_id: "text-speech"
        # Asset のdefault_z_index (10) を使用
        override_pos_x: 400
        override_pos_y: 200
        override_text: "はい、元気です！"
        override_font_size: 18
  
  - id: "page-1753563500002-cdvhjp7gy"
    title: "ページ3"
    asset_instances:
      # エフェクト背景
      instance-effect-003:
        asset_id: "img-effect"
        override_z_index: 0           # デフォルト(2)より背面に表示
        override_width: 800           # 2倍にスケール
        override_height: 600          # 2倍にスケール
        override_opacity: 0.5
      
      # キャラクター（大きく表示）
      instance-char-003:
        asset_id: "img-character-a"
        # Asset のdefault_z_index (1) を使用
        override_pos_x: 284           # 中央配置調整
        override_pos_y: 262           # 中央配置調整
        override_width: 480           # 1.5倍にスケール
        override_height: 660          # 1.5倍にスケール
      
      # タイトル（横書き）
      instance-title-003:
        asset_id: "text-title"
        # Asset のdefault_z_index (5) を使用
        override_text: "終わり"
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

1. **Asset Default**: テンプレートのデフォルト値（`default_*`フィールド）
2. **Override**: `override_*`で個別オーバーライド

### z_index管理システム

- **Asset Level**: 各Asset に`default_z_index`を設定（ImageAsset, TextAsset）
- **Instance Level**: 必要に応じて`override_z_index`でオーバーライド可能
- **有効値取得**: `getEffectiveZIndex(asset, instance)`で最終的なz_index値を計算
- **レイヤー順序**: SVG生成時に有効z_index値でソートして描画順序を決定

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
