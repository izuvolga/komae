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

