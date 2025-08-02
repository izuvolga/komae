import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { getRendererLogger, UIPerformanceTracker } from '../../utils/logger';
import { PanelCollapseLeftIcon } from '../icons/PanelIcons';
import { AssetThumbnail } from './AssetThumbnail';
import { ImageAssetEditModal } from './ImageAssetEditModal';
import type { Asset, ImageAsset } from '../../../types/entities';
import './AssetLibrary.css';

export const AssetLibrary: React.FC = () => {
  const assets = useProjectStore((state) => state.project?.assets || {});
  const selectedAssets = useProjectStore((state) => state.ui.selectedAssets);
  const selectAssets = useProjectStore((state) => state.selectAssets);
  const importAsset = useProjectStore((state) => state.importAsset);
  const deleteAsset = useProjectStore((state) => state.deleteAsset);
  const updateAsset = useProjectStore((state) => state.updateAsset);
  const toggleAssetLibrary = useProjectStore((state) => state.toggleAssetLibrary);
  const [draggedAsset, setDraggedAsset] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<ImageAsset | null>(null);
  const logger = getRendererLogger();

  const assetList = Object.values(assets);

  const handleAssetClick = (assetId: string, ctrlKey: boolean) => {
    logger.logUserInteraction('asset_select', 'AssetLibrary', {
      assetId,
      ctrlKey,
      selectionType: ctrlKey ? 'multiple' : 'single',
      currentSelection: selectedAssets.length,
    });

    if (ctrlKey) {
      // 複数選択
      const isSelected = selectedAssets.includes(assetId);
      if (isSelected) {
        selectAssets(selectedAssets.filter(id => id !== assetId));
      } else {
        selectAssets([...selectedAssets, assetId]);
      }
    } else {
      // 単一選択
      selectAssets([assetId]);
    }
  };

  const handleAssetDoubleClick = (asset: Asset) => {
    logger.logUserInteraction('asset_double_click', 'AssetLibrary', {
      assetId: asset.id,
      assetType: asset.type,
      assetName: asset.name,
    });

    if (asset.type === 'ImageAsset') {
      let editingAsset = asset as ImageAsset;
      logger.logUserInteraction('asset_edit_open', 'ImageAsset', {
        assetId: editingAsset.id,
        assetName: editingAsset.name,
      });
      setEditingAsset(editingAsset);
    }
  };

  const handleModalClose = () => {
    setEditingAsset(null);
  };

  const handleAssetSave = (updatedAsset: ImageAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    logger.logUserInteraction('asset_save', 'AssetLibrary', {
      assetId: updatedAsset.id,
      assetName: updatedAsset.name,
    });
  };

  const handleImportClick = async () => {
    const tracker = new UIPerformanceTracker('asset_import_dialog');
    
    try {
      await logger.logUserInteraction('asset_import_dialog_open', 'AssetLibrary', {
        currentAssetCount: assetList.length,
      });

      const result = await window.electronAPI?.fileSystem?.showOpenDialog({
        title: 'アセットをインポート',
        filters: [
          { name: '画像ファイル', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      await tracker.end({ dialogResult: result.canceled ? 'canceled' : 'confirmed' });

      if (!result.canceled && result.filePaths.length > 0) {
        await logger.logUserInteraction('asset_import_start', 'AssetLibrary', {
          fileCount: result.filePaths.length,
          filePaths: result.filePaths.map((p: string) => p.split('/').pop() || p), // ファイル名のみをログ
        });

        let successCount = 0;
        let errorCount = 0;

        for (const filePath of result.filePaths) {
          try {
            await importAsset(filePath);
            successCount++;
          } catch (error) {
            errorCount++;
            const message = error instanceof Error ? error.message : String(error);
            await logger.logError('asset_import_file', error as Error, {
              filePath: filePath.split('/').pop() || filePath,
              component: 'AssetLibrary',
            });
            alert(`ファイル "${filePath}" のインポートに失敗しました:\n${message}`);
          }
        }

        await logger.logUserInteraction('asset_import_complete', 'AssetLibrary', {
          totalFiles: result.filePaths.length,
          successCount,
          errorCount,
          newAssetCount: assetList.length,
        });
      }
    } catch (error) {
      await logger.logError('asset_import_dialog', error as Error, {
        component: 'AssetLibrary',
      });
      console.error('Failed to import assets:', error);
      alert('アセットのインポートに失敗しました');
    }
  };

  const handleDeleteClick = async () => {
    if (selectedAssets.length === 0) return;
    
    logger.logUserInteraction('asset_delete_confirm', 'AssetLibrary', {
      selectedCount: selectedAssets.length,
      selectedAssets: selectedAssets,
    });

    const confirmed = confirm(`選択した${selectedAssets.length}個のアセットを削除しますか？`);
    if (confirmed) {
      logger.logUserInteraction('asset_delete_execute', 'AssetLibrary', {
        deletedCount: selectedAssets.length,
        deletedAssets: selectedAssets,
      });

      // 非同期処理として各アセットを削除
      try {
        for (const assetId of selectedAssets) {
          await deleteAsset(assetId);
        }
        selectAssets([]);
      } catch (error) {
        console.error('Failed to delete assets:', error);
        logger.logError('asset_delete_batch', error as Error, {
          selectedAssets,
          component: 'AssetLibrary',
        });
        alert('アセットの削除中にエラーが発生しました');
      }
    } else {
      logger.logUserInteraction('asset_delete_cancel', 'AssetLibrary', {
        selectedCount: selectedAssets.length,
      });
    }
  };

  const handleDragStart = (assetId: string) => {
    logger.logUserInteraction('asset_drag_start', 'AssetLibrary', {
      assetId,
      assetName: assets[assetId]?.name,
    });
    setDraggedAsset(assetId);
  };

  const handleDragEnd = () => {
    if (draggedAsset) {
      logger.logUserInteraction('asset_drag_end', 'AssetLibrary', {
        assetId: draggedAsset,
      });
    }
    setDraggedAsset(null);
  };

  return (
    <div className="asset-library">
      <div className="asset-library-header">
        <div className="header-left">
          <button 
            className="panel-toggle-btn asset-close-btn"
            onClick={toggleAssetLibrary}
            title="アセットライブラリを閉じる"
          >
            <PanelCollapseLeftIcon />
          </button>
          <h3>アセット</h3>
        </div>
        <div className="asset-actions">
          <button className="btn-icon" onClick={handleImportClick} title="アセットをインポート">
            +
          </button>
          <button 
            className="btn-icon" 
            onClick={handleDeleteClick}
            disabled={selectedAssets.length === 0}
            title="選択したアセットを削除"
          >
            ×
          </button>
        </div>
      </div>

      <div className="asset-list scrollbar-large">
        {assetList.length === 0 ? (
          <div className="empty-state">
            <p>アセットがありません</p>
            <button className="btn-small" onClick={handleImportClick}>
              アセットをインポート
            </button>
          </div>
        ) : (
          assetList.map((asset) => (
            <AssetItem
              key={asset.id}
              asset={asset}
              isSelected={selectedAssets.includes(asset.id)}
              isDragged={draggedAsset === asset.id}
              onClick={handleAssetClick}
              onDoubleClick={handleAssetDoubleClick}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>

      {/* ImageAsset編集モーダル */}
      {editingAsset && (
        <ImageAssetEditModal
          asset={editingAsset}
          isOpen={!!editingAsset}
          onClose={handleModalClose}
          onSave={handleAssetSave}
        />
      )}
    </div>
  );
};

interface AssetItemProps {
  asset: Asset;
  isSelected: boolean;
  isDragged: boolean;
  onClick: (assetId: string, ctrlKey: boolean) => void;
  onDoubleClick: (asset: Asset) => void;
  onDragStart: (assetId: string) => void;
  onDragEnd: () => void;
}

const AssetItem: React.FC<AssetItemProps> = ({
  asset,
  isSelected,
  isDragged,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
}) => {
  return (
    <div
      className={`asset-item ${isSelected ? 'selected' : ''} ${isDragged ? 'dragged' : ''}`}
      draggable
      onClick={(e) => onClick(asset.id, e.ctrlKey || e.metaKey)}
      onDoubleClick={() => onDoubleClick(asset)}
      onDragStart={() => onDragStart(asset.id)}
      onDragEnd={onDragEnd}
    >
      <div className="asset-thumbnail">
        {asset.type === 'ImageAsset' ? (
          <AssetThumbnail asset={asset as ImageAsset} />
        ) : (
          <div className="text-placeholder">TXT</div>
        )}
      </div>
      <div className="asset-info">
        <div className="asset-name" title={asset.name}>
          {asset.name}
        </div>
        <div className="asset-type">
          {asset.type === 'ImageAsset' ? '画像' : 'テキスト'}
        </div>
        {asset.type === 'ImageAsset' && (
          <div className="asset-path" title={asset.original_file_path}>
            {asset.original_file_path}
          </div>
        )}
      </div>
    </div>
  );
};
