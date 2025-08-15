

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
