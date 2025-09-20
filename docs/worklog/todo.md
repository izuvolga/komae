# v0.0 リリースに向けてのTODO

## 細かい改善
- [x]: アセット IDにUUID を使うのは長過ぎます。データが冗長ですし、デバッグがしにくいです。ローカルなので衝突しないでしょう。最悪の場合、プロジェクトファイルをテキストエディタで書き換える運用も想定しているので、短くしましょう。
  - "123abcde" みたいな七桁くらいで良いと思います。命名規則は以下で。
  - ImageAsset -> img-123abcde
  - ValueAsset -> val-123abcde
  - TextAsset -> txt-123abcde
  - VectorAsset -> vec-123abcde
  - DynamicVectorAsset -> dvg-123abcde
  - Instance になったら先頭に ins-(unix時刻)- をつける
- [ ]: ImageEditModal で、Shiftキーを押しながらリサイズすると、Shiftキーを押した時点のサイズの縦横比を維持するようにする。これは元画像との縦横比を維持するのとは別にしてほしい。現状、元画像との縦横比を維持する動作はShiftキーを押しながらリサイズすると発生するが、その動作は無効にする。元画像との縦横比を維持する動作は、チェックボックスが入っている時に限って発生するようにする。チェックボックスが入っていると、Shiftキーに関わらず、元画像との縦横比を維持する。
- [ ]: VectorEditModal/DynamicVectorEditModal で、Shiftキーを押しながらリサイズすると、Shiftキーを押した時点のサイズの縦横比を維持するようにする。
- [ ]: EditModal 画面のプレビューの箇所、キャンバスサイズちょうどではなく、上下左右に10%ずつくらいに作業領域を拡大させて、キャンバス外部にはみ出す形でも編集できるようにする。
- [ ]: AssetLibrary の「アセット」の文字が大きいので修正する
- [ ]: ImageAssetInstance / TextAssetInstance / VectorAsset / DynamicVectorAsset の Edit 画面のプレビューの箇所、そのページの他のアセット（つまり Preview Window の内容）も薄くプレビューキャンバスに表示するようにする
- [ ]: ImageEditModal で Z-Index を手入力した後上下の矢印で値が変更できない。VectorAsset/DynamicVectorAsset は動作する。
- [ ]: ImageEditModal で Z-Index の衝突検知が動作してない。VectorAsset/DynamicVectorAsset は動作する。
- [ ]: ImageEditModal の「縦横比を元画像にあわせる」が機能していない。単に現在のアスペクト比をキープするだけになっている。
- [ ]: Font Management 画面の上の方が見切れている

## HTML ファイル関連
- [ ]: 次ページ、前ページを、表示画面の上半分・下半分タップのみで切り替えられるようにする
  - ./docs/design/html-export.md の "HTML Viwer" の見出し参照
- [ ]: エクスポート時に、ページ送り、ページタップ範囲のデフォルトの値を指定できるようにする
- [ ]: HTML Viewer の中にフォントのライセンス全文と著作権表示を表示する画面を追加する

## 大きめの改善
- [ ]: プロジェクト作成時に、キャンバスの色を指定できるようにする
- [ ]: ImageAsset で参照されている画像に同じものを指定可能にする
- [ ]: アセット同士のグループ化機能
- [ ]: TextAssetInstance 内部の文章で、文章内部で`%{value}`のように記述することで、ValueAssetの値を参照できる。`%p` は現在のページ数、`%P` は総ページ数を参照するために利用できる。 (asset-specification.md 参照)
- [ ]: ImageAsset にモザイクの概念をいれる 参考: https://irodori-design-web.com/blog/blog-3434/
- [ ]: 右パネルの Preview Window を別ウィンドウとして分離して表示できるようにする
- [ ]: Asset Library の Asset の表示順番をドラッグ＆ドロップで変更できるようにする（プロジェクトを保存しても順番を保持したいため、Asset にインデックスをもたせるか、assetsのデータ構造を配列にするか...要検討）
- [ ]: Asset Library の Asset を自動でソートする機能をほしい
  - 種類ごと
  - 名前順

## TextAsset 改善
- [ ]: TextAsset に rotate を対応する
- [ ]: TextAsset Bulk Edit にエディタ感のある見た目にする
  - 行番号表示
  - 編集をしたら、編集がされた行の背景色を変更する
  - yaml のフォーマットがおかしい場合には警告エラーメッセージを表示する
- [ ]: 新規アセット: スクリプト生成できる SVG (docs/design/asset-specificaiton.md)

## DynamicVectorAsset
- [ ]: DynamicVectorAsset の @parameters に紐づけられている ValueAsset の型が変化したときに、紐づけを解除して @parameters の値を初期値に変更する
- [ ]: @parameters の型に color を追加し、Edit 画面でカラーピッカーを表示する

# v0.1 リリースに向けてのTODO

## プロジェクト管理
- [ ]: 自動保存機能
- [ ]: Redo/Undo 機能

## スプレッドシート関連
- [ ]: 特定のスプレッドシートの列を非表示にする機能

## MotionAsset
- [ ]: アニメーション機能を追加（ asset-specification.md 参照）

## デザイン
- [ ]: ソフトウェアのロゴ
- [ ]: ダークモード対応

## CI/CD パイプライン
- [ ]: GitHub Actions での CI/CD パイプラインを構築
- [ ]: CLA 同意を導入 https://qiita.com/suin/items/5d53afb397e1788be61d
- [ ]: ビルド済みアプリケーションを GitHub Releases にアップロード
