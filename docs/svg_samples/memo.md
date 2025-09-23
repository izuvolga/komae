# SVG で文字を縦書きにする方式比較

export.html に入れてエクスポート状況も確認

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>SVG to PNG Export</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      margin: 20px;
    }
    #downloadBtn {
      padding: 10px 20px;
      font-size: 16px;
      margin-bottom: 20px;
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&display=swap" rel="stylesheet">

</head>
<body>
  <button style="position: absolute; top: 250px; left: 200px;" id="downloadBtn">Download PNG</button>

  <!-- SVG描画（対象はbody直下の最初のsvg要素） -->
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 1000 1000">
    <rect width="100%" height="100%" fill="pink" />
    <g opacity="1">
      <text x="0" y="0" font-family="Hachi Maru Pop" font-size="64" stroke="none" fill="#000000" writing-mode="vertical-rl">
        <tspan x="500" y="100">テ</tspan>
        <tspan x="500" dy="0">キ</tspan>
        <tspan x="500" dy="0">ス</tspan>
        <tspan x="500" dy="0">ト</tspan>
        <tspan x="436" y="100">A</tspan>
        <tspan x="436" dy="0">A</tspan>
        <tspan x="436" dy="0">A</tspan>
        <tspan x="436" dy="0">A</tspan>
      </text></g>
    </g>
  </svg>

  <script type="module">
    document.getElementById("downloadBtn").addEventListener("click", function () {
      // body直下の最初のSVG要素を取得
      const svg = document.querySelector("body > svg");
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);

      const img = new Image();
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext("2d");

        // 背景を白にしたい場合
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        const a = document.createElement("a");
        var ua = navigator.userAgent.toLowerCase();
        var isSafari = /safari/.test(ua);
        var isChrome = /chrome/.test(ua);
        var isOpera = /opera/.test(ua);
        if (isSafari && !isChrome && !isOpera) {
          var browser = "safari";
        } else if (isChrome && !isOpera) {
          var browser = "chrome";
        } else {
          var browser = "firefox";
        }

        a.setAttribute("download", "export_" + browser + ".png");
        a.dispatchEvent(new MouseEvent("click"));

        a.download = "export_" + browser + ".png";
        a.href = canvas.toDataURL("image/png");
        a.click();
      };
      img.src = url;
    });
  </script>
</body>
</html>
```

## シンプルな方法

writing-mode="vertical-rl"（縦書き・右から左へ）
writing-mode="vertical-lr"（縦書き・左から右へ）を指定

```
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 1000 1000">
    <rect width="100%" height="100%" fill="pink" />
    <g opacity="1">
      <text x="0" y="0"
            font-family='Hachi Maru Pop'
            font-size="64"
            stroke="none" fill="#000000"
            writing-mode="vertical-rl" glyph-orientation-vertical="0">
        <tspan x="500" dy="0">テキスト</tspan>
        <tspan x="500" dy="0">AAAA</tspan>
      </text>
    </g>
  </svg>
```
Firefox OK
Chrome OK
Safari NG 一つだけレイアウトがずれる。

行間が大きすぎる？

transform は g ないし text 要素に適用でき、tspan には適用できない
ただし tspan には rotate 属性があるので指定できるのだが、更にズレる。

```
        <tspan x="500" dy="0" rotate="45">AAAA</tspan>
```
Firefox OK
Chrome OK
Safari NG (回転の方向が逆では??)


が、色々検証を進めたところ、 glyph-orientation-vertical="0" が Safari で悪さをしているようだ。

```
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 1000 1000">
    <rect width="100%" height="100%" fill="pink" />
    <g opacity="1">
      <text x="0" y="0"
            font-family='Hachi Maru Pop'
            font-size="64"
            stroke="none" fill="#000000"
            writing-mode="vertical-rl">
        <tspan x="500" dy="0">あいABえお</tspan>
        <tspan x="400" dy="0">AAAA</tspan>
      </text>
    </g>
  </svg>
```
=> これはすべての環境で概ね同じに見える。
Safari が若干行間をおかしくしているが...

https://wisdom.sakura.ne.jp/web/xml/svg/svg4.html

> writing-mode が rl-tb または rl の状態にのみ有効になる glyph-orientation-vertica プロパティを使うことによって、この問題を解決することができます。 glyph-orientation-vertica プロパティにはデフォルトである auto が設定されています。 auto の場合、全角文字はグリフ方位を 0 に、半角文字は 90 に設定されます。 auto 以外の値を設定する場合は 0、90、180、270 のいずれかの角度に制限されています。

なるほど。縦書きテキストのときに、 glyph-orientation-vertical="0" を指定すると、全角文字は縦向き、半角文字は横向きになる。
が、実装がみんなぶっ壊れている気がする。
- glyph-orientation-vertical, Chrome と Firefox は無視する
- glyph-orientation-vertical, Safari は指定すると動いてくれるのだが、0にすると行間が広がる

https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/glyph-orientation-vertical
=> このオプション、Deprecated になってた...

しかし、このオプションを消せば Safari もまともに動くようになる。
これは朗報かもしれない。

## 現在の方法

```
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 1000 1000">
    <rect width="100%" height="100%" fill="pink" />
    <g opacity="1">
      <text x="0" y="0" font-family="Hachi Maru Pop" font-size="64" stroke="none" fill="#000000" writing-mode="vertical-rl">
        <tspan x="500" y="100">テ</tspan>
        <tspan x="500" dy="0">キ</tspan>
        <tspan x="500" dy="0">ス</tspan>
        <tspan x="500" dy="0">ト</tspan>
        <tspan x="436" y="100">A</tspan>
        <tspan x="436" dy="0">A</tspan>
        <tspan x="436" dy="0">A</tspan>
        <tspan x="436" dy="0">A</tspan>
      </text></g>
    </g>
  </svg>
```
Firefox OK
Chrome OK
Safari OK

制御しやすい方法ではある。

## 実際にbulkgauge で採用していた方法

```
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 1000 1000">
    <rect width="100%" height="100%" fill="pink" />
    <g opacity="1">
      <text x="500" y="64" dy="0" font-family="Hachi Maru Pop" font-size="64" stroke="none" fill="#000000">あ</text>
      <text x="500" y="64" dy="64" font-family="Hachi Maru Pop" font-size="64" stroke="none" fill="#000000">い</text>
      <text x="500" y="64" dy="128" font-family="Hachi Maru Pop" font-size="64" stroke="none" fill="#000000" transform="rotate(90, 532, 160)">A</text> <!-- 128+(64/2)文字の中心を指定 -->
      <text x="500" y="64" dy="192" font-family="Hachi Maru Pop" font-size="64" stroke="none" fill="#000000" transform="rotate(90, 532, 224)">B</text>
      <text x="500" y="64" dy="256" font-family="Hachi Maru Pop" font-size="64" stroke="none" fill="#000000">う</text>
      <text x="500" y="64" dy="320" font-family="Hachi Maru Pop" font-size="64" stroke="none" fill="#000000">え</text>
    </g>
  </svg>
```

力技だが、一番各環境での差分が少ないように見える。

Firefox OK
Chrome OK
Safari OK

## ハイブリッド方式

基本はシンプルな方法で、半角英字だけ tspan で囲んで位置を調整する。

```
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 1000 1000">
    <rect width="100%" height="100%" fill="pink" />
    <g opacity="1">
      <text x="0" y="0"
            font-family='Hachi Maru Pop'
            font-size="64"
            stroke="none" fill="#000000"
            writing-mode="vertical-rl">
        <tspan x="500" dy="0"><tspan>あ</tspan><tspan>い</tspan><tspan rotate="-45">A</tspan><tspan>B</tspan><tspan>う</tspan><tspan>え</tspan></tspan>
        <tspan x="400" y="0"><tspan>A</tspan><tspan>A</tspan><tspan>A</tspan><tspan>A</tspan></tspan>
      </text>
    </g>
  </svg>
```
=> ブラウザでだいぶズレる...
