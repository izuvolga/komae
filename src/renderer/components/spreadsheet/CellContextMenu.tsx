import React from 'react';
import type { AssetInstance, Page } from '../../../types/entities';
import './CellContextMenu.css';

interface CellContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  assetInstance: AssetInstance | null;
  page: Page | null;
  onClose: () => void;
  onReset: () => void;
}

export const CellContextMenu: React.FC<CellContextMenuProps> = ({
  isVisible,
  position,
  assetInstance,
  page,
  onClose,
  onReset,
}) => {
  const menuRef = React.useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible || !assetInstance || !page) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="cell-context-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 10000,
      }}
    >
      <div className="context-menu-item" onClick={onReset}>
        変更をリセット
      </div>
    </div>
  );
};