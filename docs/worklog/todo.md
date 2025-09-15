# v0.0 リリースに向けてのTODO

## 細かい改善
- [x]: EnhancedSpreadSheet のセルが非表示状態でも、✏️ を押下したらEditModalを表示する
- [x]: AssetLibrary の Asset のサムネイルを表示する
  - TextAsset ... T の文字（現在のまま）
  - ValueAsset ... V の文字（現在のまま）
  - VectorAsset ... 線画のアイコン
  - DynamicVectorAsset ... 線画のアイコン（ValueAssetが紐づいている場合は ValueAssetの初期値利用）
- [x]: 以下の EditModal で、マウス操作があるものは全て SVG のハンドラを利用する（DynamicVectorEditModal.tsx 参考）
  - @src/renderer/components/asset/ValueEditModal.tsx
  - @src/renderer/components/asset/DynamicVectorEditModal.tsx
  - @src/renderer/components/asset/TextEditModal.tsx
  - @src/renderer/components/asset/VectorEditModal.tsx
  - @src/renderer/components/asset/ImageEditModal.tsx
- [x]: EditModal で、共通処理があるものは共通化する
- [x]: ValueAssetEditModal のプレビュー画面が不要なので削除
- [ ]: TextEditModal の Z-Index が正常に動作していない？
- [ ]: スプレッドシートのヘッダ部分から、アセットの編集・削除ができるようにする（そもそも左パネル必要なのか？という...）
- [ ]: スプレッドシートの TextEditModal の ヘッダを右クリックしたら「すべて確認用テキストにする」を入れる。instance.multilingual_text のその言語の値を undefined にする
- [ ]: EditModal 画面のプレビューの箇所、キャンバスサイズちょうどではなく、上下左右に10%ずつくらいに作業領域を拡大させて、キャンバス外部にはみ出す形でも編集できるようにする。
- [ ]: ImageAssetInstance / TextAssetInstance の Edit 画面のプレビューの箇所、そのページの他のアセット（つまり Preview Window の内容）も薄くプレビューキャンバスに表示するようにする
- [ ]: EnhancedSpreadSheet のセルに SVG のサムネを表示する
  - @src/renderer/components/asset/DynamicVectorEditModal.tsx
  - @src/renderer/components/asset/VectorEditModal.tsx
- [ ]: ValueAsset を編集してなくても編集済みのマークが付くようになるのを修正
- [ ]: Library -> Custom Assets にサムネを表示する
- [ ]: EnhancedSpreadSheet を横方向に中途半端な位置にスクロールしたままにすると、列の入れ替えのときに半透明な四角が違和感のある位置に出る
- [ ]: EnhancedSpreadSheet のセルそれぞれに画像を表示するのはやめて、デザインを刷新する

## HTML ファイル関連
- [ ]: 次ページ、前ページを、表示画面の上半分・下半分タップのみで切り替えられるようにする
  - ./docs/design/html-export.md の "HTML Viwer" の見出し参照
- [ ]: エクスポート時に、ページ送り、ページタップ範囲のデフォルトの値を指定できるようにする
- [ ]: HTML Viewer の中にフォントのライセンス全文と著作権表示を表示する画面を追加する

## 大きめの改善
- [ ]: CSS をリファクタリングする
- [ ]: TextAssetInstance 内部の文章で、文章内部で`%{value}`のように記述することで、ValueAssetの値を参照できる。`%p` は現在のページ数、`%P` は総ページ数を参照するために利用できる。 (asset-specification.md 参照)
- [ ]: ImageAsset にモザイクの概念をいれる 参考: https://irodori-design-web.com/blog/blog-3434/
- [ ]: 右パネルの Preview Window を別ウィンドウとして分離して表示できるようにする
- [ ]: Asset Library の Asset の表示順番をドラッグ＆ドロップで変更できるようにする（プロジェクトを保存しても順番を保持したいため、Asset にインデックスをもたせるか、assetsのデータ構造を配列にするか...要検討）
- [ ]: Asset Library の Asset を自動でソートする機能をほしい
  - 種類ごと
  - 名前順
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
