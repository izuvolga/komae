
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




$ for f in src/renderer/components/font/*.tsx ;do ./undefined_css.sh "$f";done

