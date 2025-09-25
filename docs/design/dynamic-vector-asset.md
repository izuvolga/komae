
## v1
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

## v2

以下のような JavaScript ファイル（拡張子、komae.js）を読み込んで、カスタムアセットとして登録する。
コメント欄ではなく、コード内でマニフェストとして直接アセットのメタデータを定義する。

```javascript
/** @typedef {{en?:string, ja?:string}} I18nText */
/** @typedef {{
 *   id:string, version:string, author?:string, license?:string,
 *   name:I18nText, description?:Record<string,string>,
 *   canvas:{width:number,height:number},
 *   params: Record<string, {
 *     type: 'number'|'string'|'boolean',
 *     format?: 'color'|'font',
 *     enum?: readonly string[],
 *     default?: any, min?: number, max?: number, step?: number,
 *     ui?: 'slider'|'textbox'|'select'|'checkbox',
 *     title?: I18nText
 *   }>,
 *   layout?: any
 * }} Manifest */
export const manifest /** @type {Manifest} */ = {
  id: 'com.example.beautiful-rectangle',
  version: '1.0.0',
  name: { en: 'Beautiful Rectangle', ja: '美しい長方形' },
  canvas: { width: 1000, height: 1000 },
  params: {
    rx:    { type: 'number', default: 60, min: 0, max: 300, ui: 'slider', title:{en:'Corner radius', ja:'角丸半径'} },
    color: { type: 'string', format: 'color', default: '#ff0000', title:{en:'Fill color', ja:'塗り色'} },
    font:  { type: 'string', format: 'font',  default: 'system-ui', title:{en:'Font', ja:'フォント'} },
    flag:  { type: 'boolean', default: true,  title:{en:'Flag', ja:'フラグ'} },
    mode:  { type: 'string', enum: ['fast','none'], default: 'none', title:{en:'Mode', ja:'モード'} },
  },
};

export function run({ rx, color, font, flag, mode }) { /* ... */ }
```

