
# File structure

Project を HTML として出力すると、おおむね以下のようなコードが生成される想定です。

```html
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
    font-family: 'font1';
    src: url(data:font/truetype;charset=utf-8;base64,...
}
@font-face {
    font-family: 'font2';
    src: url(data:font/truetype;charset=utf-8;base64,...
}
  </style>
</head>
<body>
  <script>
  <!00 ビューワーとして動作するための JavaScript コード -->
  </script>

  <div id="viewer">
  
    <!-- 全てのページで利用する共通の SVG 定義 -->
    <svg class="defs" width="0" height="0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" visibility="visible">
        <defs>
        <!-- SVG の表現で必要な諸々の表現>
        </defs>
        <g id="layer1" opacity="1">
          <image xlink:href="data:image/png;base64,..." width="768" height="1024" x="0" />
        </g>
        <g id="layer2" opacity="1">
          <image xlink:href="data:image/png;base64,..." width="768" height="1024" x="0" />
        </g>
        <g id="layer3" opacity="1">
          <image xlink:href="data:image/png;base64,..." width="768" height="1024" x="0" />
        </g>
    </svg>
  
    <!-- それぞれのページ定義 -->
    <svg
      id="page-001"
      width="300"
      viewBox="0 0 768 1024"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      visibility="hidden"
    >
      <use class="layer1" href="#layer1" />
      <use class="layer2" href="#layer2" />
      <use class="layer3" href="#layer3" />
    </svg>
  </div>
</body>
```


<div id="viewer"> 要素にはページが表示されます。
JavaScript の箇所は割愛していますが、ページの上半分で前のページ、下半分で次のページに移動するようなビューワーとして動作するためのコードが入ります。 `<svg class="defs">` 要素には、全てのページで共通して利用される SVG の定義が入ります。

また、画像は `<image>` 要素の `xlink:href` 属性に Base64 エンコードされたデータが入ります。これにより、外部ファイルを参照せずに画像を埋め込むことができます。font も同様に、`@font-face` で Base64 エンコードされたフォントデータを直接埋め込むことができます。

