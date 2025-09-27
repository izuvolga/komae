# v0.0 リリースに向けてのTODO

## 細かい改善
- [x]: Vector アセットのマスクがプロジェクトに保存されない
- [ ]: AsssetLibrary 側のアセットをクリックしたら、SpreadSheet 側の該当アセットがハイライトされるようにする
- [ ]: escapeXml 関数、必要か？
- [ ]: エクセルヘッダの#の箇所を?にして説明を表示
- [ ]: プレビュー画面でマウスのホバーでアセットの編集画面を開くようにする
- [ ]: TextAssetが存在しないときには、多言語プルダウンメニューとテキストアセット一括編集は非活性化
- [ ]: 多言語のプルダウンメニューが、アプリ自体の言語設定ぽくて紛らわしいので、UIを改善する
- [ ]: ImageAssetInstance / TextAssetInstance / VectorAsset / DynamicVectorAsset で、キーボードの上下左右キーで自動的に 1px X/Y 座標を移動できるようにする
- [ ]: ImageAssetInstance / TextAssetInstance / VectorAsset / DynamicVectorAsset の Edit 画面のプレビューの箇所、そのページの他のアセット（つまり Preview Window の内容）も薄くプレビューキャンバスに表示するようにする
- [ ]: ImageAssetInstance / VectorAsset は、統一的なモーダルで行けるんじゃないか？
- [ ]: 2ページ作成、2ページ目にカーソルを合わせた状態で、2ページ目を削除すると、カーソルがセルがない場所に存在する
- [x]: TextEditAsset の縦書き
  - https://mui.com/material-ui/react-toggle-button/#size と TextRotateVertical TextRotationNone を使う
- [ ]: ValueAsset 改善
  - color 型対応
  - string 型の多言語対応
- [x]: hiddenColumns, hiddenRows は .komae ファイルではなく、別の箇所に保存するようにしてください
  - ローカルストレージ
  - ui-state.yaml みたいなファイル
- [ ]: 各ヘッダに、z-index をホバーで表示する & overrideのあったセルの上に z-index を表示する
- [ ]: たまに ImageAsset のサムネイルが表示されないことがあるのでリトライなど対応を講じる
- [ ]: プロジェクトの背景色を SVG で生成する
- [ ]: 通知の位置が、プレビューウィンドウのトグルボタンを隠すのがちょっとうざい
- [ ]: エクスポート画面が崩れているので修正
- [ ]: エクスポートがうまく動いてないのでなおす
- [x]: PreviewArea, AssetLibrary の表示トグル状態も ui-state.yaml に保存する
- [x]: 以下のファイルにおいても、共通フック useTextFieldKeyboardShortcuts を利用する
  - [x]:src/renderer/components/asset/ValueEditModal.tsx
  - [x]:src/renderer/components/asset/DynamicVectorEditModal.tsx
  - [x]:src/renderer/components/asset/VectorEditModal.tsx => そもそもなさそう
  - [x]:src/renderer/components/asset/ImageEditModal.tsx
  - [x]:src/renderer/components/text/BulkEditModal.tsx (テキストエリア)
  - [x]:src/renderer/components/font/FontManagementModal.tsx (サンプルテキストの箇所)
  - [x]:src/renderer/components/font/FontAddModal.tsx (Google Fonts URL の箇所)

## HTML ファイル関連
- [ ]: 次ページ、前ページを、表示画面の上半分・下半分タップのみで切り替えられるようにする
  - ./docs/design/html-export.md の "HTML Viwer" の見出し参照
- [ ]: エクスポート時に、ページ送り、ページタップ範囲のデフォルトの値を指定できるようにする
- [ ]: HTML Viewer の中にフォントのライセンス全文と著作権表示を表示する画面を追加する

## 大きめの改善
- [ ]: 各モーダルの「保存」という概念自体、なくして、すべての画面で自動保存にするべきか。
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

## ImageAsset 改善
- [ ]: マスクの画面の UI が流石に紛らわしすぎる

## TextAsset 改善
- [x]: bulkgauge と同じ方式で各文字を<text>に分割する
- [x]: EditModal の範囲選択エリアを、DOM要素の値を使ってより正確な値にする
- [x]: TextAsset に scale_x, scale_y を対応する
- [ ]: TextAsset に rotate を対応する
- [ ]: TextAsset で日本語の句読点 + 縦書きがおかしい点を解消する。
  - 中国語、台湾語、朝鮮語の句読点も確認する
  - モンゴル語は縦書きだが、左から右に書くため無視かなぁ。すでに国内はキリル文字だっていうし。
- [ ]: TextAsset Bulk Edit にエディタ感のある見た目にする
  - 行番号表示
  - 編集をしたら、編集がされた行の背景色を変更する
  - yaml のフォーマットがおかしい場合には警告エラーメッセージを表示する
- [ ]: 新規アセット: スクリプト生成できる SVG (docs/design/asset-specificaiton.md)
- [ ]: 塗りの色にグラデーション使えないかなぁ

## DynamicVectorAsset
- [ ]: 名前を ShapeAsset に変える（対外的にはカスタム図形アセット）
- [ ]: カスタムアセットのIDがファイル名になっているのを何とかする
- [ ]: フォーマットを JSDoc 対応させる
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
  - 丸
  - 三角形
  - 四角形
  - 多角形
  - 矢印
  - 吹き出し (参考: https://qleanmarket.amanaimages.com/items/FYI04531140)
    - 丸
    - トゲトゲ
    - 塗りつぶし トゲトゲ (https://comic.smiles55.jp/guide/12971/)
    - 雲のようなふわふわ
    - ふにゃふにゃ
  - 集中線
  - 囲むモヤ
  - 一方向のモヤ
  - HPゲージ
  - ライフゲージ
  - ページ番号

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

## MotionAsset
- [ ]: アニメーション機能を追加（ asset-specification.md 参照）

## デザイン
- [ ]: ソフトウェアのロゴ

## CI/CD パイプライン
- [ ]: GitHub Actions での CI/CD パイプラインを構築
- [ ]: CLA 同意を導入 https://qiita.com/suin/items/5d53afb397e1788be61d
- [ ]: ビルド済みアプリケーションを GitHub Releases にアップロード

## v2 移行
- [ ]: 画像のrotate機能
- [ ]: JumpAsset
  - 選択肢を表示して、選択されたら指定されたページに移動するアセット

## その他
- [ ]: ipwho.is を使って、ユーザーの国を特定し、国ごとに特定のコンテンツを表示する機能を考える
  - 日本国内向けには、モザイクを表示する
