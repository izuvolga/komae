
## Entity

このアプリケーションには以下のエンティティが存在する

### 多言語対応について

テキスト要素に対する包括的な多言語対応機能を実装。
- プロジェクトごとに現在言語（currentLanguage）を設定
- TextAssetInstanceは言語別オーバーライド（multilingual_overrides）をサポート
- 各言語に対して、テキスト内容、位置、フォント、サイズなどを個別設定可能
- 言語切り替え時に動的にテキスト表示が更新される

- Project
  - アプリケーションが開く成果物のまとまり。Photosshopでいう psd ファイルに相当するもの。
  - アプリケーションを何も指定せず開くと空のプロジェクトが作成される。
  - プロジェクトメタデータ（ProjectMetadata）に多言語対応設定を含む：
    - currentLanguage: 現在選択されている言語コード
    - availableLanguages: 利用可能な言語のリスト

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

**Note**: AssetAttr系は削除されました。以前はPositionAssetAttrとSizeAssetAttrでAssetInstance間で属性を共有する仕組みがありましたが、データ構造を簡略化するため、AssetInstanceに直接override_width/heightフィールドを追加する方式に変更されました。

**多言語対応に伴うTextAssetInstance構造の変更**: TextAssetInstanceの既存override_*フィールド（override_text、override_pos_x、override_pos_y、override_font_size、override_opacity、override_z_index）は削除され、multilingual_overridesフィールドのみに統合されました。これにより、言語ごとに個別のオーバーライド設定が可能になり、よりクリーンで拡張性の高いデータ構造を実現しています。


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
default_width: デフォルトの幅
default_height: デフォルトの高さ
default_opacity: デフォルトの不透明度（0.0〜1.0）
default_z_index: デフォルトのレイヤー順序
default_mask: デフォルトのマスク情報で、4点の値の配列。それぞれの値は (x, y) 座標のタプル。4点を囲んだ矩形範囲が表示される。
```

### TextAsset

テキストを表現するためのテンプレートで、以下の属性をもつ。

```
id: テンプレートのID (ユーザーが指定する必要はない)
name: テキストの名前 (デフォルトは "Text")
default_text: デフォルトのテキストの内容
font: フォントID（FontInfoのidを参照）
stroke_width: テキストの縁取りの幅（0.0以上）
font_size: テキストのフォントサイズ（ピクセル単位、1以上）
stroke_color: テキストの縁取りの色（RGBA形式の文字列、例: '#FF0000'）
fill_color: テキストの内部の色（RGBA形式の文字列、例: '#FFFFFF'）
default_pos_x: デフォルトのX座標
default_pos_y: デフォルトのY座標
opacity: デフォルトの不透明度（0.0〜1.0）
leading: テキストの行間（verticalがtrueの場合にのみ利用）
vertical: 縦書き設定（true の場合、縦書き）
default_z_index: デフォルトのレイヤー順序
```

### AssetInstance

AssetTemplateを実際のPageに配置する際のインスタンス。以下の属性をもつ。

#### ImageAssetInstance

```
id: インスタンスのID (ユーザーが指定する必要はない)
asset_id: 参照するImageAssetのID
override_pos_x: ImageAssetのdefault_pos_xを上書きするX座標 (optional)
override_pos_y: ImageAssetのdefault_pos_yを上書きするY座標 (optional)
override_width: ImageAssetのdefault_widthを上書きする幅 (optional)
override_height: ImageAssetのdefault_heightを上書きする高さ (optional)
override_opacity: ImageAssetのdefault_opacityを上書きする不透明度 (optional)
override_z_index: ImageAssetのdefault_z_indexを上書きするレイヤー順序 (optional)
override_mask: ImageAssetのdefault_maskを上書きするマスク情報 (optional)
```

#### TextAssetInstance

**多言語対応の簡素化された構造**

```
id: インスタンスのID (ユーザーが指定する必要はない)
asset_id: 参照するTextAssetのID
multilingual_overrides: 言語別オーバーライド設定 (optional)
  - Record<string, LanguageOverrides> 形式
  - キーは言語コード（例: 'ja', 'en'）
  - 値はLanguageOverridesオブジェクト
```

#### LanguageOverrides

言語別のオーバーライド設定で、以下の属性をもつ：

```
override_text: TextAssetのdefault_textを上書きするテキスト内容 (optional)
override_pos_x: TextAssetのdefault_pos_xを上書きするX座標 (optional)
override_pos_y: TextAssetのdefault_pos_yを上書きするY座標 (optional)
override_font_size: TextAssetのfont_sizeを上書きするフォントサイズ (optional)
override_opacity: TextAssetのopacityを上書きする不透明度 (optional)
override_z_index: TextAssetのdefault_z_indexを上書きするレイヤー順序 (optional)
override_font: 言語別フォント選択 (optional)
override_leading: 言語別行間設定 (optional)
override_vertical: 言語別縦書き設定 (optional)
```
