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
- [x]: ImageEditModal で、Shiftキーを押しながらリサイズすると、Shiftキーを押した時点のサイズの縦横比を維持するようにする。これは元画像との縦横比を維持するのとは別にしてほしい。現状、元画像との縦横比を維持する動作はShiftキーを押しながらリサイズすると発生するが、その動作は無効にする。元画像との縦横比を維持する動作は、チェックボックスが入っている時に限って発生するようにする。チェックボックスが入っていると、Shiftキーに関わらず、元画像との縦横比を維持する。
- [x]: 同様に、VectorEditModal/DynamicVectorEditModal において
  - 縦横比を元画像に合わせるチェックボックスを追加
  - Shiftキーを押しながらリサイズすると、Shiftキーを押した時点のサイズの縦横比を維持するようにする。
- [x]: ImageEditModal において、キャンバスサイズが横長（16:9）になるとプレビューが見切れます。まず、プレビューの箇所を横スクロールできるようにするか、プレビューの箇所をキャンバスサイズに合わせて拡大縮小するようにする。
- [x]: EditModal 画面のプレビューの箇所、キャンバスサイズちょうどではなく、上下左右に10%ずつくらいに作業領域を拡大させて、キャンバス外部にはみ出す形でも編集できるようにする。
- [x]: AssetLibrary の「アセット」の文字が大きいので修正する
- [x]: ImageEditModal の「縦横比を元画像にあわせる」が機能していない。単に現在のアスペクト比をキープするだけになっている。
- [x]: Asset Librry でのアイコンが統一されていない（追加画面とサムネイル）ので統一
- [x]: プロジェクト作成に"crop169" とか"crop43" とかのアイコンを追加する
- [x]: Font Management 画面の上の方が見切れている
- [x]: UI のボタンはできるだけアイコン化、言語は極力使わないようにする
- [x]: 新規プロジェクトに最初に1ページは追加する
- [ ]: ImageAssetInstance / TextAssetInstance / VectorAsset / DynamicVectorAsset で、キーボードの上下左右キーで自動的に 1px X/Y 座標を移動できるようにする
- [ ]: ImageAssetInstance / TextAssetInstance / VectorAsset / DynamicVectorAsset の Edit 画面のプレビューの箇所、そのページの他のアセット（つまり Preview Window の内容）も薄くプレビューキャンバスに表示するようにする
- [ ]: ImageEditModal で Z-Index を手入力した後上下の矢印で値が変更できない。VectorAsset/DynamicVectorAsset は動作する。
- [x]: ImageEditModal で Z-Index の衝突検知が動作してない。VectorAsset/DynamicVectorAsset は動作する。
- [ ]: ImageAssetInstance / VectorAsset / DynamicVectorAsset は、統一的なモーダルで行けるんじゃないか？
- [ ]: 2ページ作成、2ページ目にカーソルを合わせた状態で、2ページ目を削除すると、カーソルがセルがない場所に存在する
- [ ]: プロジェクト作成ページの改善
  - [x]: 言語選択画面は、MUI の https://mui.com/material-ui/react-autocomplete/#checkboxes を使う
  - キャンバスサイズ選択するときのアイコンと実際のサイズがあってない
  - キャンバスのデフォルトの色を選択できるようにする
  - 対応言語の横のヘルプアイコンをホバーにする
  - プロジェクト名の横にヘルプアイコンをつけて以下の説明をする
    - デフォルトだと "Untitled" にする
    - 内部的な名前なので、実際のファイル名にはならない、<プロジェクト名>および配下の<プロジェクト名>.komae は書き換えてOK
  - 「説明」の横にヘルプアイコンをつけて「メモ用です。HTMLエクスポート時には含まれません。」と説明する
- [ ]: Custom Asset Management のいち関係
  - ゴミ箱と追加を逆に
  - プレビューとアセット一覧を逆に
  - コード領域が全部見れるように
- [ ]: TextEditAsset の縦書き
  - https://mui.com/material-ui/react-toggle-button/#size と TextRotateVertical TextRotationNone を使う
- [x]: アプリ立ち上げ時の動作について改善をしたいです。
  - アプリ立ち上げ直後は、サンプルプロジェクト / 新規プロジェクト / プロジェクトを開く の3択を表示する画面が表示されます。
  - しかし、いきなり UI 画面を表示してほしいです。
  - そしてアセットやページの追加などができるようにしてほしいです。
  - ファイル上書き保存のボタンを押下したときに、もし1度も保存してなければ、はじめて保存先のファイルを表示するようにしてほしいです。
    - デフォルトでは言語は 日本語 / 英語 / 中国語 （今後ロケール取得を試すので、TODOコメントを追加して）、キャンバスサイズは 768x1024、プロジェクト名は Untitled で
  - 開発中、いちいちサンプルプロジェクトを開くのが面倒なので...
  - 今後、初期の画面が不要というユーザもいるかもしれないので、設定で初期画面を表示しないようにできるようにする。そのため、現在の初期立ち上げ画面自体は残す。
  - もしかしたら、project の管理構造上、実装は面倒かもしれないので、まずは実装方針の調査をしてほしい。
- [x]: プロジェクトを保存するときに Untitled.komae になるのだが、上書き保存しても何も反映されない。というかフォルダ作成をしてほしい。
- [x]: プロジェクトを保存せずアセットをインポートすることができない
- [x]: 途中でプロジェクトの対応言語の変更ができるようにしたい
- [ ]: ValueAsset 改善
  - color 型対応
  - string 型の多言語対応
- [ ]: カスタムアセットのIDがファイル名になっているのを何とかする
- [ ]: プレビューエリアの背景が透明になってる？
- [ ]: 通知がモーダルの黒い背景の裏側にある
- [ ]: 新規プロジェクトを作成したとき、プレビューエリアの拡大方法がズレている。
- [ ]: アプリ設定画面にダークモードのトグルを追加
- [ ]: アプリ設定画面をツールバーから参照させるようにし、コマンド + , で開けるようにする
- [ ]: ツールバーのタイトルを Electron ではなくアプリ名にする。
- [ ]: hiddenColumns, hiddenRows は komae ファイルではなく、ローカルストレージに保存するようにする
- [ ]: 各ヘッダに、z-index をホバーで表示する & overrideのあったセルの上に z-index を表示する
- [ ]: たまに ImageAsset のサムネイルが表示されないことがあるのでリトライか？

## HTML ファイル関連
- [ ]: 次ページ、前ページを、表示画面の上半分・下半分タップのみで切り替えられるようにする
  - ./docs/design/html-export.md の "HTML Viwer" の見出し参照
- [ ]: エクスポート時に、ページ送り、ページタップ範囲のデフォルトの値を指定できるようにする
- [ ]: HTML Viewer の中にフォントのライセンス全文と著作権表示を表示する画面を追加する

## 大きめの改善
- [ ]: 「保存」という概念自体、なくして、すべての画面で自動保存にする
- [ ]: プロジェクト作成時に、キャンバスの色を指定できるようにする
- [ ]: ImageAsset で参照されている画像に同じものを指定可能にする
- [ ]: アセット同士のグループ化機能
- [ ]: TextAssetInstance 内部の文章で、文章内部で`%{value}`のように記述することで、ValueAssetの値を参照できる。`%p` は現在のページ数、`%P` は総ページ数を参照するために利用できる。 (asset-specification.md 参照)
- [ ]: ImageAsset にモザイクの概念をいれる 参考: https://irodori-design-web.com/blog/blog-3434/
- [ ]: 右パネルの Preview Window を別ウィンドウとして分離して表示できるようにする
- [ ]: Asset Library の Asset の表示順番をドラッグ＆ドロップで変更できるようにする（プロジェクトを保存しても順番を保持したいため、Asset にインデックスをもたせるか、assetsのデータ構造を配列にするか...要検討）
- [ ]: 一時プロジェクトに変更を加えて（どうやって検知する？） New Oproject/Open Project を押したときに、変更を保存するかどうかを確認するモーダルを表示する
- [ ]: Asset Library の Asset を自動でソートする機能をほしい
  - 種類ごと
  - 名前順
- [ ]: 初期起動画面は Xcode ライクにする

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
- [ ]: @parameters の型に font を追加し、フォントのプロダウン
- [ ]: @parameters の型に bool を追加し、トグルスイッチ
- [ ]: githubのurlからインポートできるようにする
- [ ]: generateSVG ではなく、もっと良い名前にする
  - run, build, create など
- [ ]: 専用の構造体を受け取るようにする
  - asset/instance/アプリ名(komae) など。
  - instance.asset.width, instance.asset.height instance.width, instance.height
- [ ]: 丸、三角、四角、多角形など、基本図形を描画するカスタムアセットをビルトインで追加する

# v0.1 リリースに向けてのTODO


## プロジェクト管理
- [ ]: 自動保存機能
- [ ]: Redo/Undo 機能

## アプリ名
- [ ]: 本当に komae でよいのか？
  - 狛江市、COMAE いずれもすでに一般名詞である
  - ブレスト
    - koma は日本語の駒（将棋の駒、コマ、漫画のコマ）を意味する
    - このアプリは物理的には「しかけ絵本」の概念
    - イタリア語の漫画複数形 (fumetti)
    - イタリア語の写真（複数形） (fotografie) + 
  - 候補
    - comasta はどうか？ (COMA = Comic AniMAtion の略)
    - comasti (COMA + STI = Comic Animation + SToRy Interface)
    - Komae Studio わかりやすく。アプリ名自体は komae のままでもよい（一番これがしっくりきてる）

## スプレッドシート関連
- [x]: 特定のスプレッドシートの列を非表示にする機能

## MotionAsset
- [ ]: アニメーション機能を追加（ asset-specification.md 参照）

## デザイン
- [ ]: ソフトウェアのロゴ
- [x]: ダークモード対応

## CI/CD パイプライン
- [ ]: GitHub Actions での CI/CD パイプラインを構築
- [ ]: CLA 同意を導入 https://qiita.com/suin/items/5d53afb397e1788be61d
- [ ]: ビルド済みアプリケーションを GitHub Releases にアップロード

## v2 移行
- [ ]: 画像のrotate機能
- [ ]: JumpAsset
  - 選択肢を表示して、選択されたら指定されたページに移動するアセット
