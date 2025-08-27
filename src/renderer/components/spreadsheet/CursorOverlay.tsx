import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import './CursorOverlay.css';

interface CursorOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ containerRef }) => {
  const cursor = useProjectStore((state) => state.ui.cursor);
  const showAssetLibrary = useProjectStore((state) => state.ui.showAssetLibrary);
  const assetLibraryWidth = useProjectStore((state) => state.ui.assetLibraryWidth);
  const [cursorStyle, setCursorStyle] = useState<React.CSSProperties>({});
  const [isCursorVisible, setIsCursorVisible] = useState(true);

  useEffect(() => {
    if (!cursor.visible || !cursor.pageId || !cursor.assetId || !containerRef.current) {
      return;
    }

    const updateCursorPosition = () => {
      if (!containerRef.current) return;

      // カーソル位置のセルを見つける
      const cellElement = containerRef.current.querySelector(
        `[data-page-id="${cursor.pageId}"][data-asset-id="${cursor.assetId}"]`
      ) as HTMLElement;

      if (cellElement) {
        // セルのBoundingClientRectを取得
        const cellRect = cellElement.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // AssetLibraryのオフセットを計算（開いている場合のみ）
        const assetLibraryOffset = showAssetLibrary ? assetLibraryWidth : 0;

        // Toolbar要素を取得してその高さを動的に計算
        const toolbarElement = document.querySelector('.toolbar') as HTMLElement;
        const toolbarHeight = toolbarElement ? toolbarElement.getBoundingClientRect().height : 0;

        // スプレッドシートヘッダーの高さを取得
        const headerElement = containerRef.current.querySelector('.spreadsheet-header') as HTMLElement;
        const headerHeight = headerElement ? headerElement.getBoundingClientRect().height : 0;

        // セルのコンテナ内での相対位置を計算（getBoundingClientRect は既にスクロール考慮済み）
        const relativeLeft = cellRect.left - containerRect.left + assetLibraryOffset;
        const relativeTop = cellRect.top - containerRect.top + toolbarHeight;

        // ヘッダー領域との重なりを検出
        const cellTopInContainer = cellRect.top - containerRect.top;
        const headerBottomInContainer = headerHeight;
        const isOverlappingWithHeader = cellTopInContainer < headerBottomInContainer;

        // カーソルの可視性を決定
        setIsCursorVisible(!isOverlappingWithHeader);

        setCursorStyle({
          left: relativeLeft,
          top: relativeTop,
          width: cellRect.width,
          height: cellRect.height,
        });
      }
    };

    // 初期位置設定
    updateCursorPosition();

    // スクロール時の位置更新
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updateCursorPosition);
      // リサイズ時も更新
      window.addEventListener('resize', updateCursorPosition);
      return () => {
        container.removeEventListener('scroll', updateCursorPosition);
        window.removeEventListener('resize', updateCursorPosition);
      };
    }
  }, [cursor.visible, cursor.pageId, cursor.assetId, containerRef, showAssetLibrary, assetLibraryWidth]);

  if (!cursor.visible || !isCursorVisible) {
    return null;
  }

  return (
    <div className="cursor-overlay">
      <div className="cursor-cell" style={cursorStyle} />
    </div>
  );
};
