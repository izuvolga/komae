
@src/renderer/App.css って必要なんですかね。

$ grep -E '#[0-9A-Fa-f]{6}' -R src/ | grep tsx
src/renderer/utils/editModalUtils.tsx:          stroke="#007acc"
src/renderer/utils/editModalUtils.tsx:          fill="#007acc"
src/renderer/components/asset/DynamicVectorEditModal.tsx:            backgroundColor: '#f8f9fa',
src/renderer/components/asset/DynamicVectorEditModal.tsx:            borderRight: '1px solid #e9ecef',
src/renderer/components/asset/DynamicVectorEditModal.tsx:                  border: '2px solid #007bff',
src/renderer/components/asset/DynamicVectorEditModal.tsx:                  backgroundColor: '#f8f9fa'
src/renderer/components/asset/DynamicVectorEditModal.tsx:                      border: '1px dashed #007acc',
src/renderer/components/asset/DynamicVectorEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/DynamicVectorEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/DynamicVectorEditModal.tsx:            <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/DynamicVectorEditModal.tsx:            <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/DynamicVectorEditModal.tsx:            <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/DynamicVectorEditModal.tsx:            <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/TextEditModal.tsx:        stroke="${isDragging ? '#007bff' : 'rgba(0, 123, 255, 0.3)'}"
src/renderer/components/asset/TextEditModal.tsx:            backgroundColor: '#f8f9fa',
src/renderer/components/asset/TextEditModal.tsx:            borderRight: '1px solid #e9ecef',
src/renderer/components/asset/TextEditModal.tsx:                border: '2px solid #007bff',
src/renderer/components/asset/TextEditModal.tsx:                backgroundColor: '#f8f9fa'
src/renderer/components/asset/TextEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/TextEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/TextEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/TextEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/TextEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/TextEditModal.tsx:                        backgroundColor: '#f5f5f5',
src/renderer/components/asset/TextEditModal.tsx:                        backgroundColor: '#f5f5f5',
src/renderer/components/asset/TextEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/VectorEditModal.tsx:            backgroundColor: '#f8f9fa',
src/renderer/components/asset/VectorEditModal.tsx:            borderRight: '1px solid #e9ecef',
src/renderer/components/asset/VectorEditModal.tsx:                  border: '2px solid #007bff',
src/renderer/components/asset/VectorEditModal.tsx:                  backgroundColor: '#f8f9fa'
src/renderer/components/asset/VectorEditModal.tsx:                      border: '1px dashed #007acc',
src/renderer/components/asset/ImageEditModal.tsx:            backgroundColor: '#f8f9fa',
src/renderer/components/asset/ImageEditModal.tsx:            borderRight: '1px solid #e9ecef',
src/renderer/components/asset/ImageEditModal.tsx:                  border: '2px solid #007bff',
src/renderer/components/asset/ImageEditModal.tsx:                  backgroundColor: '#f8f9fa'
src/renderer/components/asset/ImageEditModal.tsx:                      border: '1px dashed #007acc',
src/renderer/components/asset/ImageEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/ImageEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/ImageEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/ImageEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/ImageEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/ImageEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/ImageEditModal.tsx:              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
src/renderer/components/asset/ImageEditModal.tsx:                  <Box key={index} sx={{ mb: 2, p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
src/renderer/components/layout/MainLayout.tsx:          stroke_color: '#000000',
src/renderer/components/layout/MainLayout.tsx:          fill_color: textIndex % 2 === 0 ? '#FFFFFF' : '#FFE4E1',
src/renderer/components/common/NumericInput.tsx:            borderBottom: '1px solid #dee2e6'
src/renderer/components/common/ZIndexInput.tsx:              borderBottom: '1px solid #dee2e6'
src/renderer/components/common/ColorPicker.tsx:          style={{ backgroundColor: disabled ? '#f5f5f5' : value }}
src/renderer/components/preview/PagePreview.tsx:          backgroundColor: '#f5f5f5',
src/renderer/components/preview/PagePreview.tsx:          backgroundColor: '#ffe6e6',
src/renderer/components/preview/PagePreview.tsx:          border: '1px solid #ff6666',
src/renderer/components/preview/PagePreview.tsx:          color: '#cc0000',




わかりました。それでは、以下の CSS ファイルは MUI 移行の対象外とします。

## エクスポート後のビューワー関連のためUI関係なし
@src/templates/viewer/viewer.css
## EnhancedSpreadsheet 関連のため
@src/renderer/components/spreadsheet/ColumnContextMenu.css
@src/renderer/components/spreadsheet/CellContextMenu.css
@src/renderer/components/spreadsheet/RowContextMenu.css
@src/renderer/components/spreadsheet/CursorOverlay.css
@src/renderer/components/spreadsheet/PageThumbnail.css
@src/renderer/components/spreadsheet/ColumnDragOverlay.css
@src/renderer/components/spreadsheet/EnhancedSpreadsheet.css

この MUI のテーマを使うと、アプリ全体の色を一括で変えられるようになるのでしょうか？
また、その色を管理するファイルはどれになりますか？

一方、まだチェックしていないものとして、以下の CSS ファイルがあります。
これらのうち、そのまま残したほうがよいもの

@src/renderer/App.css
@src/renderer/styles/common-modals.css
@src/renderer/styles/common-forms.css
@src/renderer/styles/utilities.css
@src/renderer/styles/common-buttons.css
@src/renderer/components/asset/AssetThumbnail.css
@src/renderer/components/asset/AssetParameterEditor.css
@src/renderer/components/asset/AssetLibrary.css
@src/renderer/components/notification/NotificationDisplay.css
@src/renderer/components/layout/MainLayout.css
@src/renderer/components/common/ReadOnlyInput.css
@src/renderer/components/common/ColorPicker.css
@src/renderer/components/preview/PreviewArea.css
@src/renderer/components/text/BulkEditModal.css
@src/renderer/components/font/FontAddHelpModal.css
@src/renderer/components/font/FontManagementModal.css
@src/renderer/components/font/FontLicenseHelpModal.css

@src/renderer/components/spreadsheet/ 配下には SpreadSheet の UI 用のコンポーネントがあるんですが、かなり独自の UI をしています。これは MUI を使わない方が良いのでしょうか？

わかりました、CSS Variables を後々検討しましょう。
まずは、MUI 化と CSS のリファクタリングを進めることにしましょう。
以下の画面では、まだ  modal-overlayなどの CSS のクラスを使っているようなのですが、このままでよいのですかね？もし MUI に modal-overlay に相当するものがないなら、そのままで良い気はするのですが。。

以下の 4 つのファイルはシンタックスの問題はなく、UIは表示されます。
そのため、一旦コミットしておきました。

src/renderer/components/project/ProjectCreateDialog.tsx
src/renderer/components/text/BulkEditModal.tsx
src/renderer/components/font/FontManagementModal.tsx
src/renderer/components/export/ExportDialog.tsx

まだMUI化の余地はありますか？

src/renderer/components/project/ProjectCreateDialog.tsx
src/renderer/components/text/BulkEditModal.tsx
src/renderer/components/font/FontManagementModal.tsx
src/renderer/components/export/ExportDialog.tsx



いえ、一旦そのままでよいです。
一般的に、必ずしも全て MUI 化する必要はないという理解です。
ただ、現状の ProjectCreateDialog.tsx について、少し気になる点があります。
対応言語の一覧のUIが、以前のほうが洗練されていたように思えます。
今は、language-selector-area の定義が消えてしまっていますが、、git の履歴から復活できませんかね。

@docs/design/ui-specification.md "Project Creation" の見出し 107〜164行目


```
$ rg form-section
src/renderer/components/font/FontAddModal.tsx
353:              <div className="form-section">
376:              <div className="form-section">

src/renderer/components/project/ProjectCreateDialog.tsx
265:        <div className="form-section">
```


ProjectCreateDialog.tsx の className に未定義の物があるので、確認してください。
以下のコマンドで、未定義の className を調べました。これらは MUI 化してください。

```
$ cat ./src/renderer/components/project/ProjectCreateDialog.tsx | grep -o -E 'className="[^"]+"' | sort -u | awk -F'"' '{print $2}' | awk '{print $1}' > css_list
$ comm -23 <(sort -n ./css_list) <(grep -h -of ./css_list ./**/*.css |sort -n)
custom-size-fields
form-divider
form-field
form-label
form-section
settings-info
settings-preview
size-field
```
