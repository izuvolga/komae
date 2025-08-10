# v0.0 リリースに向けてのTODO

## プロジェクト管理
- [x]: プロジェクト新規作成時にキャンパスサイズを指定できるように（現在は800x600固定）

## ImageAsset 関連
- [x]: SpreadSheet 上の ImageAssetInstance のパラメータ値をプレビューに反映させる
- [x]: ImageAsset 編集画面のDEFAULT SIZE の縦横比を固定するオプション
- [x]: ImageAsset 編集画面のプレビュー上でマウスで編集できるようにする
- [x]: ImageAsset 編集画面のマスク範囲もマウスで編集できるようにする
- [x]: Assset Window 上で ImageAsset を右クリックしたら、メニューを表示して、そこからも編集画面を開けるようにする
- [x]: テキストボックスの数値入力バリデーション実装（小数点2位まで、数字と-と.のみ可能）
- [x]: スプレッドシートのセルのボタンをクリックして、モーダルを表示、ImageAssetInstance を編集できるようにする（ImageAsset 編集画面と同様の画面だが、z-indexも追加で編集できるようになっている）
- [x]: ImageAsset 編集画面 で マウスの左クリックをモーダル内部で押下した状態で、モーダルの外側にマウスを移動させて、左クリックを離すと、モーダルが消えてしまう。
- [x]: ImageAsset 編集画面 で小数第2位までをテキストボックス上に表示する。現在は小数点が延々と表示してしまっている。
- [x]: Original Width/Heightのバリデーション（0以下の値を入力不可）
- [x]: Default Width/Heightのバリデーション（空白時は一時的OK、フォーカスアウト時にバリデーションで元の値に戻す）
- [x]: Shiftキーを押しながらリサイズハンドルをドラッグするとその時点のサイズの縦横比を維持しながらサイズ変更
- [x]: マスク編集時にExit Mask Editorボタンを追加して元の編集画面に戻る機能
- [x]: マスク座標のテキストボックスのバリデーション（数字、-、.のみ、小数点2位まで、フォーカスアウト時バリデーション）
- [x]: マスク編集時の初期値をキャンバスサイズの4点に設定
- [x]: マスク編集画面をより ui-specification.md に近づける（マスクと、ImageAssetの表示）

## Asset Library 関連
- [x]: Asset Window 上に画像ファイルをドラッグ＆ドロップすれば ImageAsset を追加できるようにする

## TextAsset 関連
- [x]: TextAsset/TextAssetInstance のエンティティを docs/design/data-types.md にあわせる
- [x]: Asset Window の + ボタンをクリックしたときにプルダウンボックスを表示し、画像, テキストの2項目を表示
- [x]: TextAsset を追加できるようにする
- [x]: TextAsset の編集画面を作成する
- [x]: TextAssetInstance の編集画面を作成する
- [x]: TextAsset/TextAssetInstance の SVG エクスポート機能を実装する
- [x]: スプレッドシートをダブルクリックして使える TextAssetInstance の編集画面を作成する

## Spread Sheet Window 関連
- [x]: Spread Sheetの列ヘッダーレイアウトを仕様に合わせる（#, Preview, アセット列の順番）
- [x]: 各行の削除ボタン[x]を左端の#列の横に配置する
- [x]: 各セルのレイアウトを仕様に合わせる（左側：チェックボックス+編集ボタン、右側：コンテンツ）
- [x]: TextAssetInstanceのcell-contentに実際のテキスト（default_textまたはoverride_text）を表示
- [x]: TextAssetInstanceのoverride_textバリデーション問題を修正（Zodスキーマ修正）
- [x]: override値がある場合にセルの右上に青い三角形のoverride表示を追加
- [x]: アセット列のヘッダーを右クリックして列全体に対する編集メニューを表示

## HTML ファイル関連
- [x]: エクスポートした HTML ファイルの画像が base64 になってないので修正
- [x]: 画像アセットのみで正常な HTML のエクスポートをできるようにする
- [x]: 画像とテキストアセットを含めて正常な HTML のエクスポートをできるようにする
- [ ]: 次ページ、前ページを、表示画面の上半分・下半分タップのみで切り替えられるようにする

## 細かい改善
- [x]: SpreadSheetWindow のセルを非表示にすると編集ボタンが消えてしまうが編集ボタンは常に表示しててほしい。
- [x]: SpreadSheetWindow のセルに ImageAssetInstance のプレビューが表示されない
- [x]: プロジェクトのエクスポートの「出力先ディレクトリ」の箇所で開くダイアログでディレクトリを選択できず、ファイル用のダイアログになってる
- [x]: プロジェクトのエクスポートの「プロジェクト名」→「ファイル名」
- [x]: 右パネルの Preview Window において、ズームスライダーをトグルスイッチにして、トグルが ON の間は Preview Window のサイズにあわせて自動的にキャンバスがズームするようになったらより良い。それができるなら、起動時にトグルスイッチは ON の状態でよい。ui-specification.md の Preview Controls 参照
- [x]: TextAsset の編集画面のプレビューの内容が大きすぎるので、キャンバスサイズの比率は保ちながら、表示ウィンドウのサイズに合わせて縮小して表示するようにする
- [x]: SpreadSheetWindow の行の先頭を右クリックしたら、列単位のバルク操作ができるようにしてほしい。内容は、既存の行単位のバルク操作と同様（ui-specification.md の Row 参照）
- [x]: 上記にそれに加えてSpreadSheetWindow の行の先頭を右クリックしたら、「上に挿入」「下に挿入」「削除」のメニューも表示して、行の追加・削除ができるようにする（ui-specification.md の Row 参照）
- [x]: z_index の値を、ImageAsset/TextAsset に設定し、AssetInstance 側でオーバーライドできるようにする
- [x]: z_index の値の値の管理がおかしい。SpreadSheet のバルク編集で「全て変更をリセット」を選択したときに、z_index の値がリセットされない。
- [x]: AssetManager.ts の Asset 初期化処理も entities.ts にまとめる
- [x]: Asset/AssetInstance の編集画面の数値の入力フィールドに上下ボタンを追加して、数値を増減できるようにする。増減の単位は1ずつ。小数を含む場合でも1ずつ増減できるようにする。
- [ ]: システムのビルトインのフォントが、一旦 Custom Font 画面を開かないと利用できるようにならない。アプリ起動直後に利用できるようにしたい。
- [ ]: TextAsset/TextAssetInstance のプレビュー画面でPosX/Yの位置をマウスのドラッグ・アンド・ドロップで変更できるようにする
- [ ]: Preview Window の「自動ズーム」と「キャンバスをプレビュー画面に収める」を統合する
  - 事実上「キャンバスをプレビュー画面に収める」と「自動ズーム」は同じ挙動をする機能なので、統合する。
  - 現状、「キャンバスをプレビュー画面に収める」はボタンとして機能するがトグルスイッチとして機能させる
  - 「キャンバスをプレビュー画面に収める」はデフォルトで ON の状態で起動する（「自動ズーム」と同様に動作する）
  - ON の際は、fit-btn は暗い灰色となる（トグルスイッチの ON の状態）
  - 「自動ズーム」のボタンの扱い
    - 「キャンバスをプレビュー画面に収める」のトグルスイッチの左側に移動する
    - 「自動ズーム」のボタンは削除する
  - Preview Window で倍率の変更やスクロールをしたら「キャンバスをプレビュー画面に収める」は OFF になる
- [ ]: Spread Sheet のセルを右クリックしたら「変更をリセット」を表示するようにする
- [ ]: Spread Sheet 上で TextAssetInstance のセルのcell-contentの箇所を左クリックしたら、直接表示中の override_text を編集できるようにする。
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
- [ ]: Project Header のプルダウンメニューのデザインがダサいので改善する
- [ ]: Electron のメインウィンドウの Bar が「Komae - Sequential Panel Illustration Creator」固定だが、プロジェクトが読まれたらプロジェクト名を表示するようにする
- [ ]: Asset に追加する画像として SVG も対応する
  - SVG ファイルを Asset Window にドラッグ＆ドロップしたら、ImageAsset とは別に VectorAsset を作成する
- [ ]: ImageAsset のマスクの処理がうまくいってないので修正する
  - エクスポートしてもマスクが適用されていない
  - Preview Window でのプレビューもマスクが適用されていない
- [ ]: ImageAsset / TextAsset の Edit 画面のプレビューの箇所、キャンバスサイズちょうどではなく、上下左右に10%ずつくらいに作業領域を拡大させて、キャンバス外部にはみ出す形でも編集できるようにする。
- [ ]: Custom Font の中にライセンス全文と著作権表示を表示する画面を追加する
- [ ]: HTML Viewer の中にフォントのライセンス全文と著作権表示を表示する画面を追加する

## フォント管理機能
デフォルトではビルドインで用意されているフォントを表示し、ユーザーがフォントファイルを追加できるようにする（ui-specification.md の Font Management 参照）
- [x]: ツールバーのメニューに、フォント管理の機能を追加。
- [x]: TextAsset/TextAssetInstance 編集画面でフォントを選択できるようにする。

## 多言語テキスト作成支援
ui-specification.md の Project Creation / Project Header を参照
- [x]: Lang 対応のために ProjectData のエンティティを修正
- [x]: Lang 対応のために TextAsset / TextAssetInstance のエンティティを修正

## SpreadSheet での z_index 編集機能（将来実装）
- [ ]: SpreadSheet のアセットセル内に小さな z_index 数値入力フィールドを追加
  - 仕様: cell-manage部分（30px幅）に8-9pxフォントサイズの数値入力（20x12px程度）
  - 表示: アセットインスタンス使用時のみ表示、getEffectiveZIndex()の値を表示
  - 編集: 直接入力でoverride_z_indexを更新、デフォルト値と異なる場合は青背景でハイライト
  - UI: ツールチップで詳細情報表示、右クリックで「デフォルトに戻す」メニュー
  - レイアウト: チェックボックス、編集ボタン、z_index入力の縦並び配置

## 大きめの改善
- [ ]: 右パネルの Preview Window を別ウィンドウとして分離して表示できるようにする
- [ ]: Asset Library の Asset の表示順番をドラッグ＆ドロップで変更できるようにする（プロジェクトを保存しても順番を保持したいため、Asset にインデックスをもたせるか、assetsのデータ構造をにするか...要検討）
- [ ]: Asset Library の Asset をソートする機能をほしい
- [ ]: SpreadSheet Window の列のバルク操作に、列自体を非表示にする機能を追加
- [ ]: TextAsset に rotate を対応する
- [ ]: TextAsset Bulk Edit にエディタ感のある見た目にする
  - 行番号表示
  - 編集をしたら、編集がされた行の背景色を変更する
  - yaml のフォーマットがおかしい場合には警告エラーメッセージを表示する
- [ ]: 新規アセット: スクリプト生成できる SVG
- [ ]: 新規アセット: ラベル


# v0.1 リリースに向けてのTODO

## プロジェクト管理
- [ ]: 自動保存機能
- [ ]: Redo/Undo 機能

## スプレッドシート関連
- [ ]: 特定のスプレッドシートの列を非表示にする機能

## デザイン
- [ ]: ソフトウェアのロゴ

## CI/CD パイプライン
- [ ]: GitHub Actions での CI/CD パイプラインを構築
- [ ]: ビルド済みアプリケーションを GitHub Releases にアップロード
