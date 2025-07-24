import React from 'react';
import { useProjectStore } from '../../stores/projectStore';
import './Spreadsheet.css';

export const Spreadsheet: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const currentPage = useProjectStore((state) => state.ui.currentPage);
  const activeWindow = useProjectStore((state) => state.ui.activeWindow);
  const toggleAssetInstance = useProjectStore((state) => state.toggleAssetInstance);

  if (!project) return null;

  const pages = Object.values(project.pages);
  const assets = Object.values(project.assets);
  
  // 現在のページを取得、なければ最初のページ
  const currentPageData = currentPage ? project.pages[currentPage] : pages[0];

  const handleCellClick = (pageId: string, assetId: string) => {
    toggleAssetInstance(pageId, assetId);
  };

  const isAssetUsedInPage = (pageId: string, assetId: string): boolean => {
    const page = project.pages[pageId];
    if (!page) return false;
    
    return Object.values(page.asset_instances).some(
      instance => instance.asset_id === assetId
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
                  onClick={() => handleCellClick(page.id, asset.id)}
                >
                  <div className="cell-content">
                    {isAssetUsedInPage(page.id, asset.id) ? (
                      <div className="usage-indicator active">●</div>
                    ) : (
                      <div className="usage-indicator inactive">○</div>
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
    </div>
  );
};