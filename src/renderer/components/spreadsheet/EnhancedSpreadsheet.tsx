import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { PageThumbnail } from './PageThumbnail';
import { ImageAssetInstanceEditModal } from '../asset/ImageAssetInstanceEditModal';
import type { ImageAsset, ImageAssetInstance, Page } from '../../../types/entities';
import './EnhancedSpreadsheet.css';
import './PageThumbnail.css';

export const EnhancedSpreadsheet: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const addPage = useProjectStore((state) => state.addPage);
  const deletePage = useProjectStore((state) => state.deletePage);
  const setCurrentPage = useProjectStore((state) => state.setCurrentPage);
  const toggleAssetInstance = useProjectStore((state) => state.toggleAssetInstance);
  const updateAssetInstance = useProjectStore((state) => state.updateAssetInstance);
  const showAssetLibrary = useProjectStore((state) => state.ui.showAssetLibrary);
  const showPreview = useProjectStore((state) => state.ui.showPreview);
  const assetLibraryWidth = useProjectStore((state) => state.ui.assetLibraryWidth);
  const previewWidth = useProjectStore((state) => state.ui.previewWidth);
  
  const [draggedAsset, setDraggedAsset] = useState<string | null>(null);
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined);
  const [editingInstance, setEditingInstance] = useState<{
    instance: ImageAssetInstance;
    asset: ImageAsset;
    page: Page;
  } | null>(null);
  
  // パン機能用のstate
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });
  const [panStartScroll, setPanStartScroll] = useState({ x: 0, y: 0 });
  const spreadsheetRef = React.useRef<HTMLDivElement>(null);

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
      
      // 最小幅を保証
      const finalWidth = Math.max(availableWidth, 300);
      setMaxWidth(finalWidth);
    };

    // 初期計算
    calculateMaxWidth();
    
    // ウィンドウリサイズ監視
    window.addEventListener('resize', calculateMaxWidth);
    
    // レンダリング後の再計算（タイミング問題対応）
    const timeoutId = setTimeout(calculateMaxWidth, 0);
    
    return () => {
      window.removeEventListener('resize', calculateMaxWidth);
      clearTimeout(timeoutId);
    };
  }, [showAssetLibrary, showPreview, assetLibraryWidth, previewWidth]);

  // パン機能のイベントハンドラー
  useEffect(() => {
    const container = spreadsheetRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      // 中ボタン（ホイールボタン）の場合のみパン開始
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        setPanStartPos({ x: e.clientX, y: e.clientY });
        setPanStartScroll({ x: container.scrollLeft, y: container.scrollTop });
        document.body.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      
      e.preventDefault();
      const deltaX = e.clientX - panStartPos.x;
      const deltaY = e.clientY - panStartPos.y;
      
      // パン方向を逆にする（ドラッグ方向と逆方向にスクロール）
      const newScrollX = panStartScroll.x - deltaX;
      const newScrollY = panStartScroll.y - deltaY;
      
      container.scrollLeft = newScrollX;
      container.scrollTop = newScrollY;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && isPanning) {
        e.preventDefault();
        setIsPanning(false);
        document.body.style.cursor = '';
      }
    };

    // コンテキストメニューを無効化（中ボタンクリック時）
    const handleContextMenu = (e: MouseEvent) => {
      if (isPanning) {
        e.preventDefault();
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isPanning, panStartPos, panStartScroll]);

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

  const handleEditClick = (pageId: string, assetId: string) => {
    const page = project.pages.find(p => p.id === pageId);
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

  const handlePreviewClick = (pageId: string) => {
    setCurrentPage(pageId);
  };

  const isAssetUsedInPage = (pageId: string, assetId: string): boolean => {
    const page = project.pages.find(p => p.id === pageId);
    if (!page) return false;
    
    return Object.values(page.asset_instances).some(
      (instance: any) => instance.asset_id === assetId
    );
  };

  return (
    <div 
      className="enhanced-spreadsheet scrollbar-large"
      style={{ 
        maxWidth,
        width: maxWidth ? `${maxWidth}px` : 'auto'
      }}
      ref={spreadsheetRef}
    >
      <div 
        className="spreadsheet-table"
      >
        {/* ヘッダー行 */}
        <div className="spreadsheet-header">
          <div className="cell header-cell page-number-header">#</div>
          <div className="cell header-cell delete-header">削除</div>
          <div className="cell header-cell preview-column-header">Preview</div>
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
                  <PageThumbnail
                    project={project}
                    page={page}
                    width={80}
                    height={60}
                    className="small"
                    onClick={() => handlePreviewClick(page.id)}
                  />
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
                    <button
                      className={`toggle-button ${
                        isAssetUsedInPage(page.id, asset.id) ? 'active' : 'inactive'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCellClick(page.id, asset.id);
                      }}
                      title={`${asset.name}の表示を${isAssetUsedInPage(page.id, asset.id) ? 'OFF' : 'ON'}にする`}
                    >
                      {isAssetUsedInPage(page.id, asset.id) ? '✓' : '×'}
                    </button>
                    {isAssetUsedInPage(page.id, asset.id) && asset.type === 'ImageAsset' && (
                      <button
                        className="edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(page.id, asset.id);
                        }}
                        title={`${asset.name}のインスタンスを編集`}
                      >
                        %
                      </button>
                    )}
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

      {/* ImageAssetInstance編集モーダル */}
      {editingInstance && (
        <ImageAssetInstanceEditModal
          assetInstance={editingInstance.instance}
          asset={editingInstance.asset}
          page={editingInstance.page}
          isOpen={!!editingInstance}
          onClose={handleModalClose}
          onSave={handleInstanceSave}
        />
      )}
    </div>
  );
};