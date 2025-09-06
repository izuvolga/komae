CustomAssetManager.ts -- カスタムアセット管理、IPC通信の後で呼ばれるモジュールで、画面ではない
CustomAssetManagementModal.ts -- 新規アセット追加画面
CustomAssetSelectionModal.ts -- 新規アセット選択画面

---


DynaicVectorEditModal.tsx -- SVG編集画面のプレビューが div 要素なのだが、 SVG 要素に変更したい。なにのために 0.35 をかけているのか不明。

```
{/* SVG描画結果 */}
{svgResult.svg ? (
  <div
    style={{
      position: 'absolute',
      left: `${currentPos.x * 0.35}px`,
      top: `${currentPos.y * 0.35}px`,
      width: `${currentSize.width * 0.35}px`,
      height: `${currentSize.height * 0.35}px`,
      opacity: currentOpacity,
      zIndex: 1,
    }}
  >
    <svg
      width={currentSize.width * 0.35}
      height={currentSize.height * 0.35}
      viewBox={`0 0 ${currentSize.width} ${currentSize.height}`}
      style={{ width: '100%', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: svgResult.svg }}
    />
  </div>
```

Main プロセスの関数は使っているが、ページ変数の追加とか、ValueAsset変数の追加をしている。これはでも、それぞれの Instance での変数追加なので、ここでやっているのは正しそうではある？

```
  // スクリプト実行関数
  const executeScript = async () => {
...
      // MainプロセスのCustomAssetManager.generateCustomAssetSVGを呼び出し
      const result = await window.electronAPI.customAsset.generateSVG(
        customAsset.id,
        scriptParameters
      );
...
  };
```

Preview 画面での SVG の表示はどうやっているんだろう。そちらも見てみよう。
g 要素の中に svg 要素が入っている。
PosX=10, PosY=12 に設定してあるのだが、
translate をしている。

```
<g transform="translate(10, 12)" data-z-index="0" data-asset-id="dynamic-vector-746cbfcc-4f2f-45ac-af51-4792cf573a68">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="50" height="50" fill="#ff0000" rx="5"></rect></svg>
  </g>
```

g 要素、x, y は設定できないため transform を使わないといけないらしい。

