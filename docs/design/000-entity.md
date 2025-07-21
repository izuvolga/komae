
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

