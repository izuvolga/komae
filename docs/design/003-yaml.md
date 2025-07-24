# Project format with YAML

作成したプロジェクトは以下の形式で保存される。
これらのファイルを zip 圧縮したものがプロジェクトファイルとなる。

- YAML 形式
- 画像は相対パスで参照
- 画像は PNG あるいは WEBP 形式

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

# AssetAttr定義（共有属性）
asset_attrs:
  position_attrs:
    pos-center:
      name: "中央位置"
      pos_x: 384
      pos_y: 512
    pos-left:
      name: "左側立ち位置"
      pos_x: 200
      pos_y: 400
    pos-speech:
      name: "セリフ位置"
      pos_x: 150
      pos_y: 100
  
  size_attrs:
    size-standard:
      name: "標準サイズ"
      width: 320
      height: 440
    size-small:
      name: "小サイズ"
      width: 240
      height: 330

# Asset定義（テンプレート）
assets:
  # ImageAsset
  img-character-a:
    type: "ImageAsset"
    name: "キャラクターA"
    original_file_path: "assets/character_a.png"
    original_width: 320
    original_height: 440
    default_pos_x: 200
    default_pos_y: 300
    default_opacity: 1.0
    default_mask: [0, 0, 320, 440]   # [left, top, right, bottom]
  
  img-background:
    type: "ImageAsset"
    name: "背景"
    original_file_path: "assets/background.png"
    original_width: 768
    original_height: 1024
    default_pos_x: 0
    default_pos_y: 0
    default_opacity: 1.0
    default_mask: [0, 0, 768, 1024]
  
  img-effect:
    type: "ImageAsset"
    name: "エフェクト"
    original_file_path: "assets/effect.png"
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

# ページ定義
pages:
  page-001:
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
  
  page-002:
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
  
  page-003:
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

### Asset/AssetInstance/AssetAttrの完全分離

- **Assets**: テンプレート定義（default値を持つ）
- **AssetInstances**: 各ページでの具体的な配置情報
- **AssetAttrs**: 複数のAssetInstanceで共有する属性

### 参照とオーバーライドの階層

1. **Asset Default**: テンプレートのデフォルト値
2. **AssetAttr参照**: `position_attr_id`, `size_attr_id`で共有属性を参照
3. **Override**: `override_*`で個別オーバーライド

### Transform情報の完全対応

各AssetInstanceで以下を制御：
- **位置**: AssetAttr参照またはオーバーライド
- **スケール**: `transform.scale_x/scale_y`
- **回転**: `transform.rotation`
- **透明度**: `opacity`
- **マスク**: `override_mask`

### TextAssetの完全サポート

- **縦書き/横書き**: `vertical`フラグ
- **フォント設定**: `font`, `font_size`, `color_ex/in`, `stroke_width`
- **個別オーバーライド**: `override_text`, `font_override`

### 実用的な例

3ページの完整な例で以下を実証：
- 同じAssetの異なる設定での再利用
- AssetAttrによる位置の共有
- 個別オーバーライドによる細かな調整
- z_indexによるレイヤー管理

この構造により、UI設計書で定義された全機能が実現可能になります。