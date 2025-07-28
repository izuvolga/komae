# HTML Export Format

## HTML Export Output

Project を HTML として出力すると、おおむね以下のようなコードが生成される。

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Komae Story</title>
  <style>
    /* フォントのBase64埋め込み */
    @font-face {
      font-family: 'NotoSansJP';
      src: url(data:font/truetype;charset=utf-8;base64,AAEAAAATAQAAAB...);
    }
    @font-face {
      font-family: 'CustomFont';
      src: url(data:font/truetype;charset=utf-8;base64,AAEAAAATAQAAAB...);
    }
    
    /* ビューワーのスタイル */
    #viewer {
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #000;
    }
    
    .page-svg {
      cursor: pointer;
      max-width: 90vw;
      max-height: 90vh;
    }
    
    .page-svg[data-visible="false"] {
      display: none;
    }
  </style>
</head>
<body>
  <script>
    <!--
      ビューワーとして動作するための JavaScript コード (略)
      ここで id="draw" の内容を描画し、ページ切り替えやアセットの表示制御を行う。
      ここで const でページの内容を含む配列を定義し、各ページの SVG 要素を管理する。

      例えば
      page[0] = "<use href="#background" /><use href="#character1" />"
      page[1] = "<use href="#background" /><use href="#character2" />"
      という内容になる。
    -->
  </script>

  <!-- !!! ここに上述の "SVG Structure (svg-structure.md)" の内容を埋め込む !!! -->
  <svg ... 中略>
    <g id="draw">
      <!-- ここにページごとのアセットを動的に挿入する -->
    </g>
  </svg>

</body>
</html>
```

上記で、例えば2ページ目になれば、"draw" の内容は動的に変更される。

上記の概要は、あくまでも本質的な技術的な HTML による作品実現方法を示したものであり、実際の出力はプロジェクトの内容やアセット、フレームワークに応じて異なってよい。

要は、ImageAsset をあらかじめ ID つきで定義し、JavaScript でその ID を参照して描画することで、同じ画像を使いまわしつつ、ページごとに異なるアセットの組み合わせを描画する仕組みを実現する本質が踏襲されていればよい。

他にも、次のページに切り替えるための JavaScript コードや、ボタン、ページごとのアセットの表示制御なども実際には含まれるべきではあるが、ここでは省略する。


## 設計の特徴

### AssetInstanceベースの構造

各ページは個別の`<svg>`要素として定義され、その中に**AssetInstance**がz_index順で配置される。

- **ImageAssetInstance**: `<g>`要素内の`<image>`として表現
- **TextAssetInstance**: `<g>`要素内の`<text>`として表現

### Transform属性の適用

各AssetInstanceは`<g>`要素の`transform`属性で以下を制御：

```html
<g transform="translate(x,y) scale(scale_x,scale_y) rotate(angle)">
```

### 個別設定のオーバーライド

- **位置**: `translate(x,y)`
- **スケール**: `scale(scale_x,scale_y)`  
- **回転**: `rotate(angle)`
- **透明度**: `opacity`属性
- **マスク**: `<clipPath>`要素を使用

### TextAssetの表現

`{...}` の部分は、アプリケーションにより置き換えられるテンプレート文字列で、実際の値が挿入される。
詳細は data-types.md を参照。

```
<g opacity="{opacity}">
  <text
    stroke-width="{stroke_width}"
    font-family={font}
    font-size={font_size}
    stroke="{color_ex}"
    fill="{color_ex}"
    x="{x}"
    y="{y}"
    dy="{dy}"
    opacity="{opacity}"
    transform="rotate({rotate} {rotate_x} {rotate_y})"
  >
  {msg}
  </text>
  <text
    font-family={font}
    font-size={font_size}
    stroke="{color_in}"
    fill="{color_in}"
    x="{x}"
    y="{y}"
    dy="{dy}"
    opacity="{opacity}"
    transform="rotate({rotate} {rotate_x} {rotate_y})"
  >
  {msg}
  </text>
</g>
```

もし vertical が true の場合、位置門司市文字が
`<tspan>`要素で分割され、`dy`属性で行間を調整する。
以下は、SVG を生成する擬似的な Python コードの例です。

```python
textbody = []
for line in msg.rstrip().split("\n"):
    line = self.convertText(line)
    textbody.append('<tspan x="{x}" dy="{dy}">{msg}</tspan>'.format(x=x, dy=self.font_size + self.leading, msg=line))
msgs.append("""
<g opacity="{opacity}" class="{dom_class}">
  <text
    x="{x}"
    y="{y}"
    font-family="{font}"
    font-size="{font_size}"
    stroke="{color_ex}"
    fill="{color_ex}"
    stroke-width="{stroke_width}"
    opacity="{opacity}"
    transform="rotate({rotate} {rotate_x} {rotate_y})"
  >
  {msg}
  </text>
  <text
    x="{x}"
    y="{y}"
    font-family="{font}"
    font-size="{font_size}"
    stroke="{color_in}"
    fill="{color_in}"
    opacity="{opacity}"
    transform="rotate({rotate} {rotate_x} {rotate_y})"
  >
  {msg}
  </text>
</g>
""".format(x=x,
        y=y,
        font=self.font,
        font_size=self.font_size,
        color_ex=self.color_ex,
        color_in=self.color_in,
        stroke_width=self.stroke_width,
        opacity=opacity,
        rotate_x=x,
        rotate_y=y,
        rotate=rotate,
        dom_class=self.dom_class + with_class,
        msg="\n".join(textbody)
    )
```

### Base64埋め込み

- **画像**: `data:image/png;base64,...`
- **フォント**: `data:font/truetype;charset=utf-8;base64,...`

これにより、外部ファイル依存なしの単一HTMLファイルとして出力する。
