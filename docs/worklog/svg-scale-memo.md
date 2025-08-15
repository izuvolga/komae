## v1
```
  // SVGを親SVG要素でラップして位置・サイズ・不透明度を制御
  const wrapSVGWithParentContainer = (svgContent: string, x: number, y: number, width: number, height: number, opacity: number): string => {
    // 元SVGのサイズを考慮した自動フィット動作の計算
    const originalWidth = asset.original_width;
    const originalHeight = asset.original_height;
    
    // 内側SVGが親にアスペクト比保持でフィットしたときのサイズを計算
    const scaleToFit = Math.min(width / originalWidth, height / originalHeight);
    const actualFitWidth = originalWidth * scaleToFit;
    const actualFitHeight = originalHeight * scaleToFit;
    
    // 目標サイズと自動フィットサイズの比率でスケールを計算
    const scaleX = width / actualFitWidth;
    const scaleY = height / actualFitHeight;
    
    return `<svg version="1.1" x="${x}px" y="${y}px" width="${width}px" height="${height}px" style="opacity: ${opacity};" xmlns="http://www.w3.org/2000/svg">
      <g transform="scale(${scaleX}, ${scaleY})">
        ${svgContent}
      </g>
    </svg>`;
  };
```

## v2
```
const wrapSVGWithParentContainer = (svgContent: string, x: number, y: number, width: number,
height: number, opacity: number): string => {
  // 元のSVGのサイズを取得（viewBoxまたはwidth/height属性から）
  const originalWidth = asset.original_width;
  const originalHeight = asset.original_height;

  // スケール計算により、子SVGを親SVGのサイズに正確に合わせることができます。横幅と高さの比率
を個別に計算し、SVGを均等に拡大縮小します。
  const scaleX = width / originalWidth;
  const scaleY = height / originalHeight;

  // 新しいSVG要素を生成し、transformを使用して子SVGをスケーリング
  return `<svg version="1.1" x="${x}px" y="${y}px" width="${width}px" height="${height}px"
style="opacity: ${opacity};" xmlns="http://www.w3.org/2000/svg">
    <g transform="scale(${scaleX}, ${scaleY})">
      ${svgContent}
    </g>
  </svg>`;
};
```

## v3
```
  // SVGを親SVG要素でラップして位置・サイズ・不透明度を制御
  const wrapSVGWithParentContainer = (svgContent: string, x: number, y: number, width: number, height: number, opacity: number): string => {
    // 元SVGのサイズを考慮した自動フィット動作の計算
    const originalWidth = asset.original_width;
    const originalHeight = asset.original_height;
    
    // 内側SVGが親にアスペクト比保持でフィットしたときのサイズを計算
    const scaleToFit = Math.min(width / originalWidth, height / originalHeight);
    const actualFitWidth = originalWidth * scaleToFit;
    const actualFitHeight = originalHeight * scaleToFit;
    
    // 目標サイズと自動フィットサイズの比率でスケールを計算
    const scaleX = width / actualFitWidth;
    const scaleY = height / actualFitHeight;

    // スケール後のSVGを中央に配置するためのtranslate計算
    const translateX = (width - originalWidth * scaleX) / 2;
    const translateY = (height - originalHeight * scaleY) / 2;
    
    return `<svg version="1.1" x="${x - translateX}px" y="${y - translateY}px" width="${width}px" height="${height}px" style="opacity: ${opacity};" xmlns="http://www.w3.org/2000/svg">
      <g transform="scale(${scaleX}, ${scaleY})">
        ${svgContent}
      </g>
    </svg>`;
  };
```

スケールなしだと、横幅を300pxにすると真ん中に100pxの正方形が
設置される。元のSVGが正方形なので。
ただ、これは理想状態ではない。正方形が長方形に伸びてほしい。


```
        |------300px------|
    --- o-----+------+-----o
     |  |     |      |     |
100px|  |     |      |     |
    --- o-----+------+-----o
              | 100px|
```

が、ここで scale 処理 scale(3,1) を入れてしまうと、困ったことになる。
四角形が極端に横にずれるのである。
大きく右側にずれる。


```
        |------300px------|
    --- o------------------o     +------------------+
     |  |                  |     |                  |
100px|  |                  |     |                  |
    --- o------------------o     +------------------+
```

viewBox の 0,0をデフォルトでは基準にするためらしい。

https://stackoverflow.com/questions/6711610/how-to-set-transform-origin-in-svg

```
transform="translate(cx, cy) scale(sx sy) translate(-cx, -cy)"
```

つまり、一旦座標を画像の真ん中に持ってきて拡大縮小し、
そしてもとに戻す、という処理をする必要がある。

ちょっと意味がわからんな。
試しに 300px, 100px のそれぞれの中間点の 150px, 50px  にしてみるか。
