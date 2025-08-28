import React from 'react';
import './ColumnDragOverlay.css';
import { useProjectStore } from '../../stores/projectStore';
import { createColumnDragCalculator } from '../../utils/columnDragCalculations';

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
  // Hooksは最初に呼び出す（条件分岐の前に）
  const showAssetLibrary = useProjectStore((state) => state.ui.showAssetLibrary);
  const assetLibraryWidth = useProjectStore((state) => state.ui.assetLibraryWidth);
  const pages = useProjectStore((state) => state.project?.pages || []);

  // 早期returnは全てのHooks呼び出し後に行う
  if (!isDragging || !originalRect || draggedAssetId === null || draggedAssetIndex < 0) {
    return null;
  }

  const assetLibraryOffset = showAssetLibrary ? assetLibraryWidth : 0;

  // ページ数を取得
  const pageCount = pages.length;

  // ページ数に基づいてフル高さを計算
  const getFullHeightByPageCount = (): number => {
    if (pageCount === 0) {
      // フォールバック：originalRectの高さを使用
      return originalRect.height;
    }

    // asset-cellクラスの実際の高さを取得
    const assetCell = document.querySelector('.asset-cell');
    const cellHeight = assetCell ? assetCell.getBoundingClientRect().height : originalRect.height;

    // ヘッダー高さ + (ページ数 × アセットセル高さ)
    const headerHeight = originalRect.height; // ヘッダー自体の高さ
    const totalDataHeight = pageCount * cellHeight;

    console.log(`計算中: ページ数=${pageCount}, アセットセル高さ=${cellHeight}, ヘッダー高さ=${headerHeight}, 合計高さ=${headerHeight + totalDataHeight}`);

    return headerHeight + totalDataHeight;
  };

  const fullHeight = getFullHeightByPageCount();

  // ドラッグ中の影（半透明矩形）のスタイル
  const shadowStyle: React.CSSProperties = {
    position: 'fixed',
    left: currentMouseX - originalRect.width / 2,
    top: originalRect.top,
    width: originalRect.width,
    height: fullHeight, // SpreadSheetの下端までの高さ
    zIndex: 1000,
    pointerEvents: 'none',
  };

  // 挿入位置インディケーターのスタイル
  const insertIndicatorStyle: React.CSSProperties = {
    position: 'fixed',
    top: originalRect.top,
    height: fullHeight, // SpreadSheetの下端までの高さ
    width: 3,
    zIndex: 999,
    pointerEvents: 'none',
  };

  // 挿入位置の計算（新しいユーティリティクラスを使用）
  const getInsertIndicatorLeft = () => {
    const calculator = createColumnDragCalculator(originalRect, assetLibraryOffset, visibleAssetsCount);
    
    if (!calculator) {
      console.warn('[ColumnDragOverlay] Failed to create calculator - originalRect is null');
      return 0;
    }
    
    return calculator.insertIndexToPixelLeft(insertIndex);
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
