# SVG Structure

本プロジェクトでは、各ページを SVG 形式で定義し、アセットを ID 付きで定義する。
さらに、極力同じアセットを使いまわすことで、ファイル容量を節約しつつ、ページごとに異なるアセットの組み合わせを描画する仕組みを実現する。
これは、エクスポート時のフォーマットでの表示に利用される。

```
<!-- ビューワーの SVG 要素の定義 -->
<svg
  id="{}"
  width="400"
  viewBox="0 0 768 1024"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  visibility="hidden"
>
    <defs>
        <!-- 存在する ImageAsset にあるマスク情報をすべて宣言する -->
        <clipPath id="mask-id-circle"><path d="..パス指定"/></clipPath>
    </defs>

    <!-- 存在する ImageAsset をすべて宣言する -->
    <g id="assets">
        <g visibility="hidden">
            <g id="background" opacity="1">
                <image id="image-background1" xlink:href="data:image/png;base64,ABCDEFG..." width="768" height="1024" x="0" y="0" clip-path="url(#mask-id-circle)" />
            </g>
            <g id="character" opacity="1">
                <image id="image-background2" xlink:href="data:image/png;base64,ABCDEFG..." width="768" height="1024" x="0" y="0" clip-path="url(#mask-id-circle)" />
            </g>
        </g>
    </g>

    <!-- JavaScript で各 page の内容を id="draw" の中に描画する -->
    <g id="draw">
        <use href="#background" /><use href="#character1" />
    </g>
</svg>
<!-- ページ SVG 要素の定義終了 -->
```

ただし、アプリ起動中の Preview Window では、実際にOS上にあるファイルの内容を優先するため、ローカルPC  内部のパスとして参照する。

```
<image id="image-background1" xlink:href="/path/to/file/background1.png" width="768" height="1024" x="0" y="0" clip-path="url(#mask-id-circle)" />
```

### TextAssetInstance の表現

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

もし vertical が true の場合、一文字ずつ
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


