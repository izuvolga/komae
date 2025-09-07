以下にエクスポートのソースコードがあるが、プレビュー画面でのエクスポートに使われてそう？
src/utils/htmlExporter.ts
src/utils/svgGeneratorCommon.ts

が、そこには DynamicVectorAsset の型をサポートしているように見える。

@src/renderer/components/export/ExportDialog.tsx

プロジェクトのエクスポートのダイアログからエクスポートをする。
