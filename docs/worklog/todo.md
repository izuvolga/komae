# v0.0 リリースに向けてのTODO

## 細かい改善
- [x]: プロジェクト名に空白が含まれるとアセットが正常に読み込まれない。
  - i.e "komae-asset:///Users/greymd/Desktop/aaa bbb/assets/images/1-18.jpg"
  - なぜか上のようなパスを読み込んでくれない
- [x]: プロジェクトの assets/fonts ディレクトリはもはや不要なので作らない
- [x]: プロジェクトを開いたときに存在しないアセットは assets/ ディレクトリ配下から削除
  - 実装してほしい： assetsディレクトリをスキャンして、プロジェクトファイルに記載のないファイルを削除
  - 実装不要： プロジェクトファイルに記載されているアセットのうち、元ファイル（original_file_path）が存在しないものを削除
- [x]: ImageAsset のマスクの処理が ImageEditModal.tsx の中で編集はできるがそれ以外では効果がない
  - docs/design/svg-structure.md のマスク情報の記述を参考に、マスクの処理を SVG に適用する
  - Preview Window でのプレビューもマスクが適用されていない
  - HTML でエクスポートしてもマスクが適用されていない
  - ImageEditModal でのマスクの編集は不要
- [x]: 後方互換性は保たなくて良いので、TextAsset/TextAssetInstance/LanguageOverride 旧バージョンでしか使われていない項目を削除してください。エンティティ定義、ProjectManager、移行判定ロジックなど全て。
- [x]: TextEditModal の言語別の設定が一気に表示されるとプレビューをどうして良いかわからないので、プレビュー画面を増やす？
- [x]: pages[].title の編集を可能にする
  - Spread Sheet Window の最も左側
  - デフォルトでは、データ上は空のままにしておく。
  - 空の場合は、UI 上は数字が表示される 例: 1, 2, 3...
- [x]: ValueAsset のアセット名は半角英数字と一部の記号のみを許可するようにしてください。変数名として利用するためです。
- [ ]: DynamicVectorAsset の @parameters を編集しても、リアルタイムに DynamicVectorEditModal のプレビューに反映されない
- [ ]: DynamicVectorAsset を追加した後、一度プロジェクトを保存し、再度開いたとっきに、@parameters の編集の UI が表示されず、編集ができなくなる。
- [ ]: ImageAsset / TextAsset の Edit 画面のプレビューの箇所、キャンバスサイズちょうどではなく、上下左右に10%ずつくらいに作業領域を拡大させて、キャンバス外部にはみ出す形でも編集できるようにする。
- [ ]: ImageAssetInstance / TextAssetInstance の Edit 画面のプレビューの箇所、そのページの他のアセット（つまり Preview Window の内容）も薄くプレビューキャンバスに表示するようにする

## テスト
- [x]: テストをしっかり通す
- [x]: テストの場所を、`tests/` ディレクトリではなく、テスト対象のあるディレクトリの`__tests__/` ディレクトリに移動したほうが良いか？ 例: `src/asset-manager/__tests__/asset-manager.test.ts`

## HTML ファイル関連
- [ ]: 次ページ、前ページを、表示画面の上半分・下半分タップのみで切り替えられるようにする
  - ./docs/design/html-export.md の "HTML Viwer" の見出し参照
- [ ]: エクスポート時に、ページ送り、ページタップ範囲のデフォルトの値を指定できるようにする
- [ ]: HTML Viewer の中にフォントのライセンス全文と著作権表示を表示する画面を追加する

## Enhanced Spread Sheet
- [x]: SpreadSheet Window の一番上の特定の列を右クリックして表示されるメニュー（ColumnContextMenu.tsx）、指定した列自体を非表示にする機能を追加
  - 詳細は ui-specification.md の "Column" の見出し配下の項目を参照
  - Google Spread Sheet のように、特定の列を非表示にする機能
  - 非表示にした列は、再度表示するための UI も必要
- [x]: SpreadSheet Window の一番左の特定の行を右クリックして表示されるメニューに、指定した行自体を非表示にする機能を追加
  - 詳細は ui-specification.md の "Row" の見出し配下の項目を参照
- [x]: Spread Sheet 上にカーソルの概念を追加する。セルをクリックしたときに、カーソルがそのセルの位置に表示されるようにする。
  - UI: カーソルは線で表示し、カーソルの色は青色
  - キーボードの矢印キーでカーソルを移動できるようにする
  - Enterキーでそのセルの編集画面を開く
    - ImageAssetInstance の場合は ImageAsset 編集画面を開く
    - TextAssetInstance の場合は cell-content が小さなテキストボックスとなり、カーソルがそのテキストボックス内に表示される（既存の Inline Edit が発動するだけ）
  - Backspaceキーでカーソルの位置のセルの「変更をリセット」を行う
  - Ctrl+C あるいは Cmd+C でカーソル位置のセルの値をコピー
    - クリップボードには、その AssetInstance の情報がコピーされる
    - ペースト先のセルにペーストすると、AssetInstance の情報がペーストされる
      - 同じタイプの AssetInstance の場合は、同じ AssetInstance がペーストされる
      - 異なるタイプの AssetInstance の場合は、エラーメッセージを表示してペーストをしない



## 大きめの改善
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
