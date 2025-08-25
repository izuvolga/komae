
以下のような JavaScript ファイル（拡張子、komae.js）を読み込んで、カスタムアセットとして登録する機能がある。

```
// ==CustomAsset==
// @name         Beautiful Rectangle
// @type         DynamicVector
// @version      1.0.0
// @author       Test Author
// @description  A beautiful rectangle generator
// @parameters   width:number:100, height:number:60, color:string:#ff0000
// ==/CustomAsset==

function generateSVG(params) {
  const { width = 100, height = 60, color = '#ff0000' } = params;
  return `<rect width="${width}" height="${height}" fill="${color}" rx="5"/>`;
}
```

上記のコードは、幅、高さ、色をパラメータとして受け取り、SVG の長方形を生成するカスタムアセットを定義している。
@type には DynamicVector を指定しているため、生成されるアセットは DynamicVectorAsset となる。
@parameters には、パラメータの名前、型、デフォルト値をカンマ区切りで指定している。
