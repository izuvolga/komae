import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { ImageEditModal } from '../asset/ImageEditModal';
import type { ImageAsset, ImageAssetInstance, Page } from '../../../types/entities';
import './Spreadsheet.css';

export const Spreadsheet: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const currentPage = useProjectStore((state) => state.ui.currentPage);
  const activeWindow = useProjectStore((state) => state.ui.activeWindow);
  const toggleAssetInstance = useProjectStore((state) => state.toggleAssetInstance);
  const updateAssetInstance = useProjectStore((state) => state.updateAssetInstance);
  const [editingInstance, setEditingInstance] = useState<{
    instance: ImageAssetInstance;
    asset: ImageAsset;
    page: Page;
  } | null>(null);

  if (!project) return null;

  const pages = project.pages;
  const assets = Object.values(project.assets);
  
  // 現在のページを取得、なければ最初のページ
  const currentPageData = currentPage 
    ? pages.find(page => page.id === currentPage) 
    : pages[0];

  const handleCellClick = (pageId: string, assetId: string) => {
    toggleAssetInstance(pageId, assetId);
  };

  const handleCellDoubleClick = (pageId: string, assetId: string) => {
    const page = pages.find(p => p.id === pageId);
    const asset = project.assets[assetId];
    
    if (!page || !asset || asset.type !== 'ImageAsset') return;
    
    // そのページでアセットインスタンスを検索
    const instance = Object.values(page.asset_instances).find(
      (inst: any) => inst.asset_id === assetId
    ) as ImageAssetInstance;
    
    if (instance) {
      setEditingInstance({
        instance,
        asset: asset as ImageAsset,
        page,
      });
    }
  };

  const handleInstanceSave = (updatedInstance: ImageAssetInstance) => {
    if (editingInstance) {
      updateAssetInstance(editingInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingInstance(null);
  };

  const handleModalClose = () => {
    setEditingInstance(null);
  };

  const isAssetUsedInPage = (pageId: string, assetId: string): boolean => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return false;
    
    return Object.values(page.asset_instances).some(
      (instance: any) => instance.asset_id === assetId
    );
  };

  return (
    <div className="spreadsheet">
      <div className="spreadsheet-container">
        {/* ヘッダー行 */}
        <div className="spreadsheet-header">
          <div className="cell header-cell corner-cell">ページ</div>
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
              {/* ページ名セル */}
              <div className="cell page-cell">
                <div className="page-info">
                  <span className="page-number">{pageIndex + 1}</span>
                  <span className="page-title">{page.title}</span>
                </div>
              </div>
              
              {/* アセットセル */}
              {assets.map((asset) => (
                <div
                  key={`${page.id}-${asset.id}`}
                  className={`cell asset-cell ${
                    isAssetUsedInPage(page.id, asset.id) ? 'used' : 'unused'
                  }`}
                >
                  <div className="cell-content">
                    <div 
                      className="usage-indicator-area"
                      onClick={() => handleCellClick(page.id, asset.id)}
                    >
                      {isAssetUsedInPage(page.id, asset.id) ? (
                        <div className="usage-indicator active">●</div>
                      ) : (
                        <div className="usage-indicator inactive">○</div>
                      )}
                    </div>
                    {isAssetUsedInPage(page.id, asset.id) && asset.type === 'ImageAsset' && (
                      <button
                        className="edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellDoubleClick(page.id, asset.id);
                        }}
                        title="ImageAssetInstanceを編集"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 右側の詳細パネル */}
      {activeWindow === 'asset' && currentPageData && (
        <div className="detail-panel">
          <h4>ページ詳細</h4>
          <div className="detail-content">
            <div className="detail-item">
              <label>ページ名:</label>
              <span>{currentPageData.title}</span>
            </div>
            <div className="detail-item">
              <label>使用アセット数:</label>
              <span>{Object.keys(currentPageData.asset_instances).length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ImageAssetInstance編集モーダル */}
      {editingInstance && (
        <ImageEditModal
          mode="instance"
          asset={editingInstance.asset}
          assetInstance={editingInstance.instance}
          page={editingInstance.page}
          isOpen={!!editingInstance}
          onClose={handleModalClose}
          onSaveInstance={handleInstanceSave}
        />
      )}
    </div>
  );
};