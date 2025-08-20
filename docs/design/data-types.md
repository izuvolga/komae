## Entity

このアプリケーションには以下のエンティティが存在する

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
    - VectorAsset ... SVGベクター画像を表現するためのテンプレート

- AssetInstance
  - 背景: 実態として全く同じ画像を複数のページで何度も使うことは少なく、微妙に位置を変えたり、サイズを変えたりすることが多い。そのため、ちょっとした位置の変更のたびに Asset が増えるのは非効率的である。そこで、Asset の属性情報を極力使いまわしつつ、 Page ごとに微妙に異なる配置情報を持つことができるようにするための概念。
  - Asset をコピーして作成される
  - AssetInstance を Page 上に配置することで、Page の内容が決まる。
  - AssetInstance を Page 上に配置すれば、Page が一つの絵になる。
  - Page 内部に複数存在することができ、AssetInstance 同士の順番がある。
  - なぜ Asset が存在するのかというと、AssetInstance はその Page 固有の情報を持つため、同じ Asset を使っていても、Page ごとに異なる AssetInstance が存在することができる。
  - 例えば、特定の ImageAsset に特定のキャラクターの画像を使っていても、微妙にキャラクターの位置を変更できる。
    - Page 1 では、キャラクターの位置を左に配置し、Page 2 では右に配置することができる。その際は、ImageAsset は同じでも、Page 1 と Page 2 では異なる AssetInstance が存在し、異なる座標を持つことになる。


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

作中のテキストを表現するためのテンプレートで、以下の属性をもつ。

```
id: テンプレートのID (ユーザーが指定する必要はない)
name: テキストの名前 (デフォルトは "Text")
default_context: そのテキストの表す文脈 (例: 'キャラクターAの叫び声') (optional)
default_text: デフォルトのテキストの内容
default_settings: 全言語共通のデフォルト設定
  - LanguageSettings オブジェクト
  - 位置、フォント、サイズなどの共通設定を定義
default_language_override: 言語別のオーバーライド設定 (optional)
  - Record<string, LanguageSettings> 形式
  - キーは言語コード（例: 'ja', 'en'）
  - 値はLanguageSettingsオブジェクト
  - 特定の言語でのみ異なる設定が必要な場合に使用
```

Asset Library では、テキスト自体は保持できず、あくまでフォントサイズや色、位置などの設定を保持できる。
UI については ui-specification.md の「TextAsset 編集画面」の見出し以下を参照。

**新しい2層設計の仕組み：**
1. `default_settings`: 全言語に共通で適用される基本設定（位置、フォントサイズなど）
2. `default_language_override`: 特定の言語でのみ異なる設定が必要な場合の上書き設定

この設計により、多くの設定は共通化しつつ、必要に応じて言語別の微調整が可能。
例：共通で「位置(100,200)、サイズ24px」を設定し、日本語のみ「縦書き」、英語のみ「Arial字体」を追加設定。
TextAssetInstanceでは、さらに個別の微調整や特殊なケースのみ編集。


### VectorAsset

SVGベクター画像を表現するためのテンプレートで、以下の属性をもつ。

```
id: テンプレートのID (ユーザーが指定する必要はない)
name: SVG画像の名前 (デフォルトはファイル名)
original_file_path: SVGファイルのファイルパス（絶対パス）
original_width: 元SVGファイルの幅（SVGのwidth属性またはviewBoxから取得）
original_height: 元SVGファイルの高さ（SVGのheight属性またはviewBoxから取得）
default_pos_x: デフォルトのX座標
default_pos_y: デフォルトのY座標
default_width: デフォルトの幅（レンダリング時のサイズ）
default_height: デフォルトの高さ（レンダリング時のサイズ）
default_opacity: デフォルトの不透明度（0.0〜1.0）
default_z_index: デフォルトのレイヤー順序
svg_content: SVGファイルの内容をテキストとして保持（XMLパース済み）
```

VectorAssetの特徴：
- SVGファイルの内容を`svg_content`フィールドに文字列として保持
- ベクター画像なので無限拡大・縮小が可能
- `original_width`/`original_height`はSVGの元サイズ
- `default_width`/`default_height`は実際のレンダリングサイズ
- ImageAssetとは異なり、再利用定義は作成せずインスタンスごとにインライン描画

## DynamicSvgAsset

```
id: テンプレートのID (ユーザーが指定する必要はない)
name: テキストの名前 (デフォルトは "Text")
script: SVGを生成するためのスクリプト
arguments: スクリプトに渡す引数のリスト
```

## AssetInstance

Assetを実際のPageに配置する際のインスタンス。以下の属性をもつ。

### ImageAssetInstance

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

### TextAssetInstance

```
id: インスタンスのID (ユーザーが指定する必要はない)
asset_id: 参照するTextAssetのID
override_context: TextAssetのdefault_contextを上書きする文脈情報 (optional)
multilingual_text: 言語別のテキスト内容
  - Record<string, string> 形式
  - キーは言語コード（例: 'ja', 'en'）
  - 値はその言語でのテキスト内容
override_language_settings: インスタンス個別の言語別設定 (optional)
  - Record<string, LanguageSettings> 形式
  - キーは言語コード（例: 'ja', 'en'）
  - 値はLanguageSettingsオブジェクト
  - TextAssetのdefault_settingsおよびdefault_language_overrideを個別にオーバーライドする場合に使用
  - 設定の優先順序で最も高い優先度を持つ
```

**注意：** TextAssetInstanceには、override_opacityやoverride_z_indexのような直接的なオーバーライドフィールドは存在しません。これらの設定はすべてoverride_language_settingsの中のLanguageSettingsオブジェクトで管理されます。

### LanguageSettings

言語別の設定で、TextAssetの default_settings、default_language_override と TextAssetInstance の override_language_settings で共通して使用される。以下の属性をもつ：

```
override_pos_x: X座標 (optional)
override_pos_y: Y座標 (optional)
override_font: フォント選択 (optional)
override_font_size: フォントサイズ (optional)
override_stroke_width: テキストの縁取りの幅（0.0以上） (optional)
override_leading: 行間設定 (optional)
override_vertical: 縦書き設定 (optional)
override_opacity: 不透明度（0.0〜1.0） (optional)
override_z_index: レイヤー順序 (optional)
override_fill_color: テキストの内部の色（RGBA形式の文字列） (optional)
override_stroke_color: テキストの縁取りの色（RGBA形式の文字列） (optional)
```

設定の適用順序（優先度の高い順）：
1. TextAssetInstance の override_language_settings（個別オーバーライド設定）- 最優先
2. TextAsset の default_language_override（言語別オーバーライド設定）
3. TextAsset の default_settings（全言語共通設定）
4. システムのデフォルト値（フォントサイズ64px、位置100,100など）

この階層により、共通設定をベースに、必要に応じて言語別・インスタンス別の細かい調整が可能。

### VectorAssetInstance

VectorAssetを実際のPageに配置する際のインスタンス。以下の属性をもつ。

```
id: インスタンスのID (ユーザーが指定する必要はない)
asset_id: 参照するVectorAssetのID
override_pos_x: VectorAssetのdefault_pos_xを上書きするX座標 (optional)
override_pos_y: VectorAssetのdefault_pos_yを上書きするY座標 (optional)
override_width: VectorAssetのdefault_widthを上書きする幅 (optional)
override_height: VectorAssetのdefault_heightを上書きする高さ (optional)
override_opacity: VectorAssetのdefault_opacityを上書きする不透明度 (optional)
override_z_index: VectorAssetのdefault_z_indexを上書きするレイヤー順序 (optional)
```

VectorAssetInstanceの特徴：
- VectorAssetの各デフォルト値を個別にオーバーライド可能
- SVG要素の位置・サイズ・透明度を柔軟に調整
- z_indexによる他アセットとの重なり順制御
- インスタンスごとにSVG要素として直接レンダリング
- オーバーライドされた値はSVGのx, y, width, height, opacity属性に直接適用

## DynamicSvgAssetInstance

TODO
