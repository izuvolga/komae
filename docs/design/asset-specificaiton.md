## Image

エンティティ: ImageAsset
インスタンス: ImageAssetInstance

ImageAssetは、画像ファイル（PNG, WEBP形式）を表すアセット。

## Text

エンティティ: TextAsset
インスタンス: TextAssetInstance

テキストを表すアセット。
文章内部で`%{value}`のように記述することで、ValueAssetの値を参照できる。
`%p` は現在のページ数、`%P` は総ページ数を参照するために利用できる。

## Vector

エンティティ: VectorAsset
インスタンス: VectorAssetInstance

SVG形式のベクター画像を表すアセット。
いくつかのプリセットが存在する。
- 吹き出し
- 四角形

## Value

エンティティ: ValueAsset
インスタンス: ValueAssetInstance

それぞれのページに何らかの値を紐づけるためのアセット。
このアセット単体ではキャンバス上には何も変化は与えない。
ページの他の要素に値を紐づけるために利用される。
以下のような値を登録できる。

- 値
  - 文字列
  - 数値
- 数式

値は内部的には JavaScript の値として扱われ、動的型付けがされる。
ただし、明示的にどの値を結果値として登録するかを指定することもできる。

「数式」を登録すると、他のValueAssetの ID を参照して、計算結果を得ることができる。
例えば `value1` と `value2` というValueAssetがあるときに、`%{value1} + %{value2}` という数式を登録すると、これらの値の合計を得ることができる。

数式の例:
```
%{value1} + %{value2} + 1
```

数式は中間記法で、四則演算を行うことができる。
数式がエラーとなると、`#ERROR` という文字列が返される。


## DynamicVector

エンティティ: DynamicVectorAsset
インスタンス: DynamicVectorAssetInstance

「SVGのXML文字列を出力するスクリプト」をアセットして登録できる。
ページによって、動的に内容が変化する画像を実現するためのアセット。
このアセットは、普通のSVG画像の様に振る舞うが、ページ内部の他の要素の情報によって内容が変えられる。

例えばこんな感じのスクリプトを登録する。

```
function createSquareSVG(x, y, sideLength) {
  // SVGの文字列を構築
  const svgString = `<rect x="${x}" y="${y}" width="${sideLength}" height="${sideLength}" stroke="black" fill="transparent" />`;
  // 例: <rect x="50" y="50" width="100" height="100" stroke="black" fill="transparent" />
  return svgString;
}
return createSquareSVG(asset_value_1, asset_value_2, asset_value_3);
```

引数となる値（上記の例だとx, y, sideLength）は、 Dynamic SVG の AssetInstance 側で指定できる。
AssetInstance 側では、ValueAsset のname をそのまま変数として利用できる（`asset_value_1` のように）。
スクリプトは vm （Node.jsのvmモジュール）のサンドボックス環境で実行される。
HTML エクスポート時には、関数実行後の文字列が埋め込まれており、HTML ビューワーの視聴環境ではスクリプトは直接は実行されない。

## Script

エンティティ: ScriptAsset
インスタンス: ScriptAssetInstance

ScriptAssetは、ページの動作を制御するためのスクリプトを表すアセット。
JavaScript のコードを指定すると、そのページ上でそのスクリプトが実行される。
HTMLでのエクスポート後にしか動作確認はできない。

## Jump

エンティティ: JumpAsset
インスタンス: JumpAssetInstance

別のページにジャンプする選択肢を読者に提供するためのアセット
JumpAssetを設定したページに、ユーザに選択肢を表示する画面が描画される。
JumpAssetInstance には、選択肢の文言と、選択肢を選んだときに遷移するページのIDを紐づける。
さらに、それぞれの文言の座標は指定できる。
選択肢を選んだときに遷移するページのIDだけでなく、ValueAssetのIDと、期待する値も紐づけることができる。
多言語対応となっているため、TextAssetInstance 同様の構造を持っている。
HTMLでのエクスポート時には押下できるボタンが表示される
PNGの場合には、「→ XX page」という文言が小さく表示される。

```
export interface JumpAsset extends BaseAsset {
  type: 'JumpAsset';
  default_options: {
    text?: string; // 選択肢の文言（optional）
    value_asset_id?: string; // 紐づけるValueAssetのID（optional）
    target_page_id: string; // 選択肢を選んだときに遷移するページのID
    expected_value?: string | number; // 期待する値（optional）
    pos_x: number; // 選択肢の座標X
    pos_y: number; // 選択肢の座標Y
  }[];
  default_opacity: number; // 透明度（0.0 - 1.0）
}
```

## Motion

エンティティ: MotionAsset
インスタンス: MotionAssetInstance

モーションを制御するアセット
同じページにあるアセットを指定して、そのアセットアニメーションを付けることができる。
同じページに JavaScript ないし CSS を使ってアニメーションを実装できるようにする
HTMLでのエクスポート時にのみ機能する（アニメーション PNG でもやりたいけど。。）

- 拡大・縮小の繰り返し
  - 息遣いのようなアニメーションを想定
  - 画像やテキストのサイズを少しずつ大きくして、元のサイズに戻す
  - 速度、大きさ、繰り返し回数、拡大の起点を指定できる
- フェードイン・フェードアウト
  - 画像やテキストの透明度を変化させる
  - 速度、透明度の変化量、繰り返し回数を指定できる
- 別の ImageAsset/VectorAsset への切り替え
  - 画像やテキストを別の画像やテキストに切り替える
  - 切り替えのタイミング、切り替え先のアセットを指定できる
  - 複数のアセットを順番に切り替えることも可能
  - 瞬きのようなアニメーションを想定
- 角度の変化
  - 画像やテキストの回転を行う
  - 回転の角度、速度、繰り返し回数、回転の中心を指定できる
  - 腕を動かす、足を動かす、剣を振るうなどのアニメーションを想定
