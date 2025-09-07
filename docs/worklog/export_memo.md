以下にエクスポートのソースコードがあるが、プレビュー画面でのエクスポートに使われてそう？
src/utils/htmlExporter.ts
src/utils/svgGeneratorCommon.ts

が、そこには DynamicVectorAsset の型をサポートしているように見える。

@src/renderer/components/export/ExportDialog.tsx

プロジェクトのエクスポートのダイアログからエクスポートをする。

DynamicVectorAsset の型をサポートしているように見える。

---

どうも svgGeneratorCommon.ts で、 Main プロセスと Renderer プロセス化を判定して、Main プロセスの場合に処理する箇所でエラーが発生しているらしい。

```
    // MainプロセスかRendererプロセスかを判定
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      console.log('[generateDynamicVectorElement] Running in Renderer process, using IPC to generate SVG');
      // Rendererプロセス: IPCを使用
      svgContent = await (window as any).electronAPI.customAsset.generateSVG(
        asset.custom_asset_id,
        scriptParameters
      );
    } else {
      // Mainプロセス: 直接CustomAssetManagerを使用
      console.log('[generateDynamicVectorElement] Running in Main process, using CustomAssetManager directly');
      // TODO: ここで処理が止まって、null が返されてしまう
      const { CustomAssetManager } = eval('require')('../main/services/CustomAssetManager');
      console.log('[generateDynamicVectorElement] CustomAssetManager loaded:', CustomAssetManager);
      const customAssetManager = CustomAssetManager.getInstance();
      svgContent = await customAssetManager.generateCustomAssetSVG(
        asset.custom_asset_id,
        scriptParameters
      );
    }
```
