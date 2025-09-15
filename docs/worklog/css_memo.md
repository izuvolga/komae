このプロジェクトで利用されている CSS について質問です。
私は Electron と TypeScript を使ったプロジェクトは初心者なのでわからないのですが、
各種モーダルで利用されている CSS に同様の定義が多く見られると思います。
例えば、.form-group というクラスは複数の CSS ファイルで定義されているようです。

```
$ git grep '.form-group {'
src/renderer/components/asset/TextEditModal.css:.form-group {
src/renderer/components/asset/ValueEditModal.css:.form-group {
src/renderer/components/export/ExportDialog.css:.form-group {
```

一般的に、このような形態のプロジェクトの場合、モーダルごとにCSSを作成するものなのでしょうか。
あるいは、共通の CSS ファイルを作成して、そこにまとめるのが良いのでしょうか。
また、同じ定義を複数の CSS ファイルに記述していますが、アプリケーション上で定義が上書きされることはないのでしょうか。


わかりました。CSS統一をしましょう。しかしその前に質問です。将来的に、このアプリはダークモードに対応したいと考えています。その場合、CSSの定義を動的に変更する必要があるかと思うのですが、技術的にどのように実現できるのでしょうか。一旦、手動でのライトモード・ダークモードの切替ができるようにしたいです。
