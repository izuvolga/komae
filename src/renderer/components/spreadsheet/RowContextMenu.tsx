import React from 'react';
import type { Page } from '../../../types/entities';
import './RowContextMenu.css';

interface RowContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  page: Page;
  pageIndex: number;
  totalPages: number;
  onClose: () => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onResetAll: () => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
  onDelete: () => void;
}

export const RowContextMenu: React.FC<RowContextMenuProps> = ({
  isVisible,
  position,
  page,
  pageIndex,
  totalPages,
  onClose,
  onShowAll,
  onHideAll,
  onResetAll,
  onInsertAbove,
  onInsertBelow,
  onDelete,
}) => {
  if (!isVisible) return null;

  const handleMenuClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* 背景クリックで閉じる */}
      <div className="row-context-menu-backdrop" onClick={onClose} />
      
      {/* メニュー本体 */}
      <div 
        className="row-context-menu"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="row-context-menu-header">
          <span className="page-title">ページ {pageIndex + 1}</span>
          <span className="page-subtitle">{page.title}</span>
        </div>
        
        <div className="row-context-menu-items">
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
          
          <button 
            className="menu-item reset"
            onClick={() => handleMenuClick(onResetAll)}
          >
            全て変更リセット
          </button>
          
          <div className="menu-separator" />
          
          <button 
            className="menu-item"
            onClick={() => handleMenuClick(onInsertAbove)}
          >
            上に挿入
          </button>
          
          <button 
            className="menu-item"
            onClick={() => handleMenuClick(onInsertBelow)}
          >
            下に挿入
          </button>
          
          <div className="menu-separator" />
          
          <button 
            className="menu-item delete"
            onClick={() => handleMenuClick(onDelete)}
            disabled={totalPages <= 1}
          >
            削除
          </button>
        </div>
      </div>
    </>
  );
};