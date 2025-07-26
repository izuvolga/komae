import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import './EnhancedSpreadsheet.css';

export const EnhancedSpreadsheet: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const addPage = useProjectStore((state) => state.addPage);
  const deletePage = useProjectStore((state) => state.deletePage);
  const setCurrentPage = useProjectStore((state) => state.setCurrentPage);
  const toggleAssetInstance = useProjectStore((state) => state.toggleAssetInstance);
  const showAssetLibrary = useProjectStore((state) => state.ui.showAssetLibrary);
  const showPreview = useProjectStore((state) => state.ui.showPreview);
  const assetLibraryWidth = useProjectStore((state) => state.ui.assetLibraryWidth);
  const previewWidth = useProjectStore((state) => state.ui.previewWidth);
  
  const [draggedAsset, setDraggedAsset] = useState<string | null>(null);
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined);

  if (!project) return null;

  const pages = Object.values(project.pages);
  const assets = Object.values(project.assets);

  // 中央パネルの最大幅を計算
  useEffect(() => {
    const calculateMaxWidth = () => {
      const windowWidth = window.innerWidth;
      let availableWidth = windowWidth;
      
      // アセットライブラリが表示されている場合はその幅を引く
      if (showAssetLibrary) {
        availableWidth -= assetLibraryWidth;
      }
      
      // プレビューが表示されている場合はその幅を引く
      if (showPreview) {
        availableWidth -= previewWidth;
      }
      
      // 余白やボーダーを考慮
      availableWidth -= 20;
      
      // 最小幅を保証
      const finalWidth = Math.max(availableWidth, 300);
      setMaxWidth(finalWidth);
    };

    calculateMaxWidth();
    
    // ウィンドウリサイズ監視
    window.addEventListener('resize', calculateMaxWidth);
    
    return () => {
      window.removeEventListener('resize', calculateMaxWidth);
    };
  }, [showAssetLibrary, showPreview, assetLibraryWidth, previewWidth]);

  const handleAddPage = () => {
    const pageNumber = pages.length + 1;
    const newPage = {
      id: `page-${Date.now()}`,
      title: `Page ${pageNumber}`,
      asset_instances: {},
    };
    addPage(newPage);
  };

  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) {
      alert('最後のページは削除できません');
      return;
    }
    
    const confirmed = confirm('このページを削除しますか？');
    if (confirmed) {
      deletePage(pageId);
    }
  };

  const handleCellClick = (pageId: string, assetId: string) => {
    toggleAssetInstance(pageId, assetId);
  };

  const handlePreviewClick = (pageId: string) => {
    setCurrentPage(pageId);
  };

  const isAssetUsedInPage = (pageId: string, assetId: string): boolean => {
    const page = project.pages[pageId];
    if (!page) return false;
    
    return Object.values(page.asset_instances).some(
      instance => instance.asset_id === assetId
    );
  };

  return (
    <div 
      className="enhanced-spreadsheet"
      style={{ maxWidth }}
    >
      <div 
        className="spreadsheet-table"
        style={{ maxWidth }}
      >
        {/* ヘッダー行 */}
        <div className="spreadsheet-header">
          <div className="cell header-cell page-number-header">#</div>
          <div className="cell header-cell delete-header">削除</div>
          <div className="cell header-cell preview-header">Preview</div>
          {assets.map((asset) => (
            <div key={asset.id} className="cell header-cell asset-header">
              <div className="asset-header-content">
                <span className="asset-name" title={asset.name}>
                  {asset.name}
                </span>
                <span className="asset-type">
                  {asset.type === 'ImageAsset' ? '画像' : 'テキスト'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* データ行 */}
        <div className="spreadsheet-body">
          {pages.map((page, pageIndex) => (
            <div key={page.id} className="spreadsheet-row">
              {/* ページ番号セル */}
              <div className="cell page-number-cell">
                {pageIndex + 1}
              </div>
              
              {/* 削除ボタンセル */}
              <div className="cell delete-cell">
                <button
                  className="delete-page-btn"
                  onClick={() => handleDeletePage(page.id)}
                  disabled={pages.length <= 1}
                  title="ページを削除"
                >
                  ×
                </button>
              </div>
              
              {/* プレビューセル */}
              <div 
                className="cell preview-cell"
                onClick={() => handlePreviewClick(page.id)}
              >
                <div className="page-preview">
                  <div className="preview-mini-canvas">
                    {/* 簡易プレビュー - 使用されているアセット数を表示 */}
                    <div className="preview-content">
                      <div className="page-title">{page.title}</div>
                      <div className="asset-count">
                        {Object.keys(page.asset_instances).length}個
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* アセットセル */}
              {assets.map((asset) => (
                <div
                  key={`${page.id}-${asset.id}`}
                  className={`cell asset-cell ${
                    isAssetUsedInPage(page.id, asset.id) ? 'used' : 'unused'
                  }`}
                  onClick={() => handleCellClick(page.id, asset.id)}
                >
                  <div className="cell-content">
                    <input
                      type="checkbox"
                      checked={isAssetUsedInPage(page.id, asset.id)}
                      onChange={() => handleCellClick(page.id, asset.id)}
                      className="asset-checkbox"
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
          
          {/* 新規ページ追加行 */}
          <div className="spreadsheet-row add-page-row">
            <div className="cell add-page-cell">
              <button className="add-page-btn" onClick={handleAddPage}>
                + 新しいページを追加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};