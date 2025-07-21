# Project format with YAML

作成したプロジェクトは以下の形式で保存される。

- YAML 形式
- 画像は相対パスで参照
- 画像は PNG あるいは WEBP 形式

```yaml
title: "ここにプロジェクトの名称"
description: "プロジェクトの説明。オプション"
campus: # キャンパス情報
  w: 768
  h: 1024
assets: # アセットのリスト
  - id: "asset-1" # アセットのID
    type: "ImageAssetTemplate" # アセットの種類
    name: "キャラクターA" # アセットの名前
    image: "assets/character_a.png" # 画像の相対パス
  - id: "asset-2"
    type: "TextAssetTemplate"
    name: "セリフA"
    text: "こんにちは！"
pages: # ページのリスト
  - id: "page-1" # ページのID
    title: "ページ1"
    assets: # ページに配置されたアセットのリスト
      - asset_id: "asset-1" # アセットのID
        x: 100 # X座標
        y: 200 # Y座標
      - asset_id: "asset-2"
        x: 150
        y: 300
```
