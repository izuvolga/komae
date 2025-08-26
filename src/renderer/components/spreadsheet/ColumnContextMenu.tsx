import React from 'react';
import type { Asset } from '../../../types/entities';
import './ColumnContextMenu.css';

interface ColumnContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  asset: Asset;
  onClose: () => void;
  onHideColumn: () => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onResetAll: () => void;
}

export const ColumnContextMenu: React.FC<ColumnContextMenuProps> = ({
  isVisible,
  position,
  asset,
  onClose,
  onHideColumn,
  onShowAll,
  onHideAll,
  onResetAll,
}) => {
  if (!isVisible) return null;

  const handleMenuClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* 背景クリックで閉じる */}
      <div className="column-context-menu-backdrop" onClick={onClose} />
      
      {/* メニュー本体 */}
      <div 
        className="column-context-menu"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="column-context-menu-header">
          <span className="asset-name">{asset.name}</span>
          <span className="asset-type">
            {asset.type === 'ImageAsset' ? '画像' : 'テキスト'}
          </span>
        </div>
        
        <div className="column-context-menu-items">
          <button 
            className="menu-item hide-column"
            onClick={() => handleMenuClick(onHideColumn)}
          >
            列を非表示
          </button>
          
          <div className="menu-separator" />
          
          <button 
            className="menu-item"
            onClick={() => handleMenuClick(onShowAll)}
          >
            全て表示
          </button>
          
          <button 
            className="menu-item"
            onClick={() => handleMenuClick(onHideAll)}
          >
            全て隠す
          </button>
          
          <div className="menu-separator" />
          
          <button 
            className="menu-item reset"
            onClick={() => handleMenuClick(onResetAll)}
          >
            全て変更リセット
          </button>
        </div>
      </div>
    </>
  );
};
