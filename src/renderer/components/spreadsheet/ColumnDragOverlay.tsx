import React from 'react';
import './ColumnDragOverlay.css';
import { useProjectStore } from '../../stores/projectStore';

interface ColumnDragOverlayProps {
  isDragging: boolean;
  draggedAssetId: string | null;
  draggedAssetIndex: number;
  currentMouseX: number;
  originalRect: DOMRect | null;
  insertIndex: number;
  visibleAssetsCount: number;
}

export const ColumnDragOverlay: React.FC<ColumnDragOverlayProps> = React.memo(({
  isDragging,
  draggedAssetId,
  draggedAssetIndex,
  currentMouseX,
  originalRect,
  insertIndex,
  visibleAssetsCount
}) => {

  if (!isDragging || !originalRect || draggedAssetId === null || draggedAssetIndex < 0) {
    return null;
  }
  const showAssetLibrary = useProjectStore((state) => state.ui.showAssetLibrary);
  const assetLibraryWidth = useProjectStore((state) => state.ui.assetLibraryWidth);
  const assetLibraryOffset = showAssetLibrary ? assetLibraryWidth : 0;

  // ドラッグ中の影（半透明矩形）のスタイル
  const shadowStyle: React.CSSProperties = {
    position: 'fixed',
    left: currentMouseX - originalRect.width / 2,
    top: originalRect.top,
    width: originalRect.width,
    height: originalRect.height, // TODO: 高さをSpreadSheet いっぱいにしたい
    zIndex: 1000,
    pointerEvents: 'none',
  };

  // 挿入位置インディケーターのスタイル
  const insertIndicatorStyle: React.CSSProperties = {
    position: 'fixed',
    top: originalRect.top,
    height: originalRect.height,
    width: 3,
    zIndex: 999,
    pointerEvents: 'none',
  };

  // 挿入位置の計算
  const getInsertIndicatorLeft = () => {
    if (!originalRect) return 0;

    const COLUMN_WIDTH = originalRect.width; // アセット列の幅
    const FIRST_COLUMN_WIDTH = 70; // TODO: ページ番号列、DOMから取得したい
    const SECOND_COLUMN_WIDTH = 120; // TODO: プレビュー列、DOMから取得したい
    const baseX = FIRST_COLUMN_WIDTH + SECOND_COLUMN_WIDTH + assetLibraryOffset;
    if (insertIndex === 0) {
      // 最初のアセット列の前
      return baseX;
    } else if (insertIndex >= visibleAssetsCount) {
      // 最後のアセット列の後
      return baseX + visibleAssetsCount * COLUMN_WIDTH;
    } else {
      // 中間の位置
      return baseX + insertIndex * COLUMN_WIDTH;
    }
  };

  return (
    <>
      {/* ドラッグ中の影 */}
      <div
        className="column-drag-shadow"
        style={shadowStyle}
      >
        <div className="column-drag-shadow-content">
          Asset {draggedAssetIndex + 1}
        </div>
      </div>

      {/* 挿入位置インディケーター */}
      <div
        className="column-insert-indicator"
        style={{
          ...insertIndicatorStyle,
          left: getInsertIndicatorLeft(),
        }}
      />
    </>
  );
});
