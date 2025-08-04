
## Entity

このアプリケーションには以下のエンティティが存在する

- Project
  - アプリケーションが開く成果物のまとまり。Photosshopでいう psd ファイルに相当するもの。
  - アプリケーションを何も指定せず開くと空のプロジェクトが作成される。

- Page
  - Page は Project の中に複数存在することができる。
  - Page は順序を持つ。

- Asset
  - 画像や、セリフの吹き出し、エフェクトなどPage 上に配置される要素を抽象化した概念。
  - 背景やキャラクター、セリフの吹き出し、エフェクト表現などの情報を含む
  - Asset Window (ui.md 参照) に画像をドラッグアンドドロップしたり、メニューバーから新規作成したりすれば Asset を Project に追加することができる。
  - Asset は、Asset Window にのみ存在する。
  - 現時点で、以下の種類の Asset が存在する:
    - ImageAsset ... 画像を表現するためのテンプレート
    - TextAsset ... テキストを表現するためのテンプレート

- AssetInstance
  - 背景: 実態として全く同じ画像を複数のページで何度も使うことは少なく、微妙に位置を変えたり、サイズを変えたりすることが多い。そのため、ちょっとした位置の変更のたびに Asset が増えるのは非効率的である。そこで、Asset の属性情報を極力使いまわしつつ、 Page ごとに微妙に異なる配置情報を持つことができるようにするための概念。
  - Asset をコピーして作成される
  - AssetInstance を Page 上に配置することで、Page の内容が決まる。
  - AssetInstance を Page 上に配置すれば、Page が一つの絵になる。
  - Page 内部に複数存在することができ、AssetInstance 同士の順番がある。
  - なぜ Asset が存在するのかというと、AssetInstance はその Page 固有の情報を持つため、同じ Asset を使っていても、Page ごとに異なる AssetInstance が存在することができる。
  - 例えば、特定の ImageAsset に特定のキャラクターの画像を使っていても、微妙にキャラクターの位置を変更できる。
    - Page 1 では、キャラクターの位置を左に配置し、Page 2 では右に配置することができる。その際は、ImageAsset は同じでも、Page 1 と Page 2 では異なる AssetInstance が存在し、異なる座標を持つことになる。

- AssetAttr
  - Asset に付随する属性情報を複数のAssetInstanceで共有するための概念
  - 例えば、複数のキャラクターを「立ち位置A」という同じPositionAssetAttrで参照することで、磁石のように同じ位置に配置することができる
  - UI上では、ImageAssetTemplateの編集画面でドロップダウンメニュー`[v]`から選択可能
  - 特定のAssetAttrを複数のAssetInstanceから参照することができる
  - AssetAttrの名前は、対応するAssetTemplateの名前と同じになる
  - 現時点では、以下の種類のAssetAttrが存在する:
    - PositionAssetAttr ... pos_x, pos_yの組。座標情報を共有
    - SizeAssetAttr ... width, heightの組。サイズ情報を共有


### ImageAsset

画像を表現するためのテンプレートで、以下の属性をもつ。

```
id: テンプレートのID (ユーザーが指定する必要はない)
name: 画像の名前 (デフォルトはファイル名)
original_file_path: 画像のファイルパス（絶対パス）
original_width: 元画像の幅
original_height: 元画像の高さ
default_pos_x: デフォルトのX座標
default_pos_y: デフォルトのY座標
default_opacity: デフォルトの不透明度（0.0〜1.0）
default_mask: デフォルトのマスク情報で、4点の値の配列。それぞれの値は (x, y) 座標のタプル。4点を囲んだ矩形範囲が表示される。
```

### TextAsset

テキストを表現するためのテンプレートで、以下の属性をもつ。

```
id: テンプレートのID (ユーザーが指定する必要はない)
name: テキストの名前 (デフォルトは "Text")
default_text: デフォルトのテキストの内容（TextAssetInstance で未設定の場合に使用される）
font: フォントのファイルパス（絶対パス）
stroke_width: テキストの縁取りの幅（0.0〜1.0）
font_size: テキストのフォントサイズ（ピクセル単位）
color_ex: テキストの縁取りの色（RGBA形式の文字列、例: '#FF0000'）
color_in: テキストの内部の色（RGBA形式の文字列、例: '#FFFFFF'）
default_pos_x: デフォルトのX座標
default_pos_y: デフォルトのY座標
vertical: # true の場合、縦書き
```

### AssetInstance

AssetTemplateを実際のPageに配置する際のインスタンス。以下の属性をもつ。

#### ImageAssetInstance

```
id: インスタンスのID (ユーザーが指定する必要はない)
asset_id: 参照するImageAssetのID
page_id: 配置されるPageのID
z_index: 描画順序（数値が大きいほど前面に表示）
position_attr_id: 参照するPositionAssetAttrのID (optional)
size_attr_id: 参照するSizeAssetAttrのID (optional)
override_pos_x: AssetAttrやAssetのdefault値を上書きするX座標 (optional)
override_pos_y: AssetAttrやAssetのdefault値を上書きするY座標 (optional)
override_opacity: デフォルトの不透明度を上書き (optional)
override_mask: デフォルトのマスク情報を上書き (optional)
transform: 変形情報
  scale_x: X軸スケール（1.0が等倍）
  scale_y: Y軸スケール（1.0が等倍）
  rotation: 回転角度（度数法）
```

#### TextAssetInstance

```
id: インスタンスのID (ユーザーが指定する必要はない)
asset_id: 参照するTextAssetのID
page_id: 配置されるPageのID
z_index: 描画順序（数値が大きいほど前面に表示）
position_attr_id: 参照するPositionAssetAttrのID (optional)
override_text: Assetのdefault_textを上書きするテキスト内容 (optional)
override_pos_x: AssetAttrやAssetのdefault値を上書きするX座標 (optional)
override_pos_y: AssetAttrやAssetのdefault値を上書きするY座標 (optional)
font_override: フォント設定の上書き (optional)
  size: フォントサイズ
  color_ex: 縁取りの色
  color_in: 内部の色
transform: 変形情報
  scale_x: X軸スケール（1.0が等倍）
  scale_y: Y軸スケール（1.0が等倍）
  rotation: 回転角度（度数法）
```

### PositionAssetAttr

位置情報を共有するための属性。

```
id: 属性のID (ユーザーが指定する必要はない)
name: 属性の名前（例: "立ち位置A", "セリフ位置"）
pos_x: X座標
pos_y: Y座標
```

### SizeAssetAttr

サイズ情報を共有するための属性。

```
id: 属性のID (ユーザーが指定する必要はない)
name: 属性の名前（例: "標準サイズ", "拡大表示"）
width: 幅
height: 高さ
```
