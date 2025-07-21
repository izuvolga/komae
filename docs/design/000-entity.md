
## Entity

このアプリケーションには以下のエンティティが存在する

- Project
  - アプリケーションが開く成果物のまとまり。Photosshopでいう psd ファイルに相当するもの。
  - アプリケーションを何も指定せず開くと空のプロジェクトが作成される。

- Page
  - Page は Project の中に複数存在することができる。
  - Page は順序を持つ。

- AssetTemplate
  - 画像や、セリフの吹き出し、エフェクトなどPage 上に配置される要素を抽象化した概念。
  - 背景やキャラクター、セリフの吹き出し、エフェクト表現などの情報を含む
  - Asset Window (ui.md 参照) に画像をドラッグアンドドロップしたり、メニューバーから新規作成したりすれば AssetTemplate を Project に追加することができる。
  - AssetTemplate は、Asset Window にのみ存在する。
  - 現時点で、以下の種類の AssetTemplate が存在する:
    - ImageAssetTemplate ... 画像を表現するためのテンプレート
    - ImageGroupAssetTemplate ... 複数の画像をまとめて表現するためのテンプレート
    - TextAssetTemplate ... テキストを表現するためのテンプレート

- AssetInstance
  - AssetTemplate をコピーして作成される
  - AssetInstance を Page 上に配置することで、Page の内容が決まる。
  - AssetInstance を Page 上に配置すれば、Page が一つの絵になる。
  - Page 内部に複数存在することができ、AssetInstance 同士の順番がある。
  - なぜ AssetTemplate が存在するのかというと、AssetInstance はその Page 固有の情報を持つため、同じ AssetTemplate を使っていても、Page ごとに異なる AssetInstance が存在することができる。
  - 例えば、特定の ImageAssetTemplate に特定のキャラクターの画像を使っていても、微妙にキャラクターの位置を変更できる。
    - Page 1 では、キャラクターの位置を左に配置し、Page 2 では右に配置することができる。その際は、ImageAssetTemplate は同じでも、Page 1 と Page 2 では異なる AssetInstance が存在し、異なる座標を持つことになる。

- (将来) ArrangePreset
  - AssetInstance の配置情報を表現するための概念。
  - 特定の ArrangePreset を複数の AssetInstance から参照することができる。
  - 例えば、別々のキャラクターの立ち絵を配置する際に、同じ ArrangePreset を参照することで、同じ位置に配置することができる。
  - まだ将来的な概念のため、一旦は実装しなくてよい。


### ImageAssetTemplate

画像を表現するためのテンプレートで、以下の属性をもつ。

```
id: インスタンスのID (ユーザーが指定する必要はない)
name: 画像の名前 (デフォルトはファイル名)
width: 画像の幅
height: 画像の高さ
posX: 画像のX座標
posY: 画像のY座標 (yamlとの互換性のため、posX, posY としている)
path: 画像のファイルパス（絶対パス）
opacity: 画像の不透明度（0.0〜1.0）
mask: 画像のマスク情報で、4つの整数値（左、上、右、下）の配列。その４点の矩形範囲のみが表示される。
```

###  ImageGroupAssetTemplate

複数の画像をまとめて表現するためのテンプレートで、以下の属性をもつ。

```
id: インスタンスのID (自動生成のため、ユーザーが指定する必要はない)
name: グループの名前 (デフォルトはファイル名)
images: ImageAssetTemplate の配列
```

### TextAssetTemplate

テキストを表現するためのテンプレートで、以下の属性をもつ。

```
id: インスタンスのID (ユーザーが指定する必要はない)
name: テキストの名前 (デフォルトは "Text")
text: テキストの内容
font: フォントのファイルパス（絶対パス）
```
