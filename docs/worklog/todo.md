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
- [ ]: ImageAsset / TextAsset の Edit 画面のプレビューの箇所、キャンバスサイズちょうどではなく、上下左右に10%ずつくらいに作業領域を拡大させて、キャンバス外部にはみ出す形でも編集できるようにする。
- [ ]: ImageAssetInstance / TextAssetInstance の Edit 画面のプレビューの箇所、そのページの他のアセット（つまり Preview Window の内容）も薄くプレビューキャンバスに表示するようにする
- [ ]: pages[].title の編集を可能にする
- [ ]: pages[].title が空のときに、ページタイトルを自動で生成する
  - 例: ページ1, ページ2, ページ3...

## テスト
- [x]: テストをしっかり通す
- [x]: テストの場所を、`tests/` ディレクトリではなく、テスト対象のあるディレクトリの`__tests__/` ディレクトリに移動したほうが良いか？ 例: `src/asset-manager/__tests__/asset-manager.test.ts`

## HTML ファイル関連
- [ ]: 次ページ、前ページを、表示画面の上半分・下半分タップのみで切り替えられるようにする
  - ./docs/design/html-export.md の "HTML Viwer" の見出し参照
- [ ]: エクスポート時に、ページ送り、ページタップ範囲のデフォルトの値を指定できるようにする
- [ ]: HTML Viewer の中にフォントのライセンス全文と著作権表示を表示する画面を追加する

## 大きめの改善
- [ ]: TextAssetInstance だけでなく TextAsset にも multi_language の概念を追加した方が良い？
- [ ]: 右パネルの Preview Window を別ウィンドウとして分離して表示できるようにする
- [ ]: Asset Library の Asset の表示順番をドラッグ＆ドロップで変更できるようにする（プロジェクトを保存しても順番を保持したいため、Asset にインデックスをもたせるか、assetsのデータ構造を配列にするか...要検討）
- [ ]: Asset Library の Asset を自動でソートする機能をほしい
  - 種類ごと
  - 名前順
- [ ]: SpreadSheet Window の列のバルク操作に、列自体を非表示にする機能を追加
- [ ]: TextAsset に rotate を対応する
- [ ]: TextAsset Bulk Edit にエディタ感のある見た目にする
  - 行番号表示
  - 編集をしたら、編集がされた行の背景色を変更する
  - yaml のフォーマットがおかしい場合には警告エラーメッセージを表示する
- [ ]: 新規アセット: スクリプト生成できる SVG (docs/design/asset-specificaiton.md)
- [ ]: 新規アセット: ラベル (docs/design/asset-specificaiton.md)
- [ ]: Spread Sheet 上にカーソルの概念を追加する。セルをクリックしたときに、カーソルがそのセルの位置に表示されるようにする。
  - UI: カーソルは線で表示し、カーソルの色は青色
  - キーボードの矢印キーでカーソルを移動できるようにする
  - Enterキーでそのセルの編集画面を開く
    - ImageAssetInstance の場合は ImageAsset 編集画面を開く
    - TextAssetInstance の場合は cell-content が小さなテキストボックスとなり、カーソルがそのテキストボックス内に表示される
  - Backspaceキーでカーソルの位置のセルの「変更をリセット」を行う
  - Ctrl+C あるいは Cmd+C でカーソル位置のセルの値をコピー
    - クリップボードには、その AssetInstance の情報がコピーされる
    - ペースト先のセルにペーストすると、AssetInstance の情報がペーストされる
      - 同じタイプの AssetInstance の場合は、同じ AssetInstance がペーストされる
      - 異なるタイプの AssetInstance の場合は、エラーメッセージを表示してペーストをしない

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

## CI/CD パイプライン
- [ ]: GitHub Actions での CI/CD パイプラインを構築
- [ ]: ビルド済みアプリケーションを GitHub Releases にアップロード
