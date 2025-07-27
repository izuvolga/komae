import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { PanelCollapseLeftIcon } from '../icons/PanelIcons';
import type { Asset } from '../../../types/entities';
import './AssetLibrary.css';

export const AssetLibrary: React.FC = () => {
  const assets = useProjectStore((state) => state.project?.assets || {});
  const selectedAssets = useProjectStore((state) => state.ui.selectedAssets);
  const selectAssets = useProjectStore((state) => state.selectAssets);
  const importAsset = useProjectStore((state) => state.importAsset);
  const deleteAsset = useProjectStore((state) => state.deleteAsset);
  const toggleAssetLibrary = useProjectStore((state) => state.toggleAssetLibrary);
  const [draggedAsset, setDraggedAsset] = useState<string | null>(null);

  const assetList = Object.values(assets);

  const handleAssetClick = (assetId: string, ctrlKey: boolean) => {
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

  const handleImportClick = async () => {
    try {
      const result = await window.electronAPI.fileSystem.showOpenDialog({
        title: 'アセットをインポート',
        filters: [
          { name: '画像ファイル', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
          { name: 'フォントファイル', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        for (const filePath of result.filePaths) {
          try {
            await importAsset(filePath);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            alert(`ファイル "${filePath}" のインポートに失敗しました:\n${message}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to import assets:', error);
      alert('アセットのインポートに失敗しました');
    }
  };

  const handleDeleteClick = () => {
    if (selectedAssets.length === 0) return;
    
    const confirmed = confirm(`選択した${selectedAssets.length}個のアセットを削除しますか？`);
    if (confirmed) {
      selectedAssets.forEach(assetId => deleteAsset(assetId));
      selectAssets([]);
    }
  };

  const handleDragStart = (assetId: string) => {
    setDraggedAsset(assetId);
  };

  const handleDragEnd = () => {
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
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface AssetItemProps {
  asset: Asset;
  isSelected: boolean;
  isDragged: boolean;
  onClick: (assetId: string, ctrlKey: boolean) => void;
  onDragStart: (assetId: string) => void;
  onDragEnd: () => void;
}

const AssetItem: React.FC<AssetItemProps> = ({
  asset,
  isSelected,
  isDragged,
  onClick,
  onDragStart,
  onDragEnd,
}) => {
  return (
    <div
      className={`asset-item ${isSelected ? 'selected' : ''} ${isDragged ? 'dragged' : ''}`}
      draggable
      onClick={(e) => onClick(asset.id, e.ctrlKey || e.metaKey)}
      onDragStart={() => onDragStart(asset.id)}
      onDragEnd={onDragEnd}
    >
      <div className="asset-thumbnail">
        {asset.type === 'ImageAsset' ? (
          <div className="image-placeholder">IMG</div>
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