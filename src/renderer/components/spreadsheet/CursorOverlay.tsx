import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import './CursorOverlay.css';

interface CursorOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ containerRef }) => {
  const cursor = useProjectStore((state) => state.ui.cursor);
  const [cursorStyle, setCursorStyle] = useState<React.CSSProperties>({});

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
        // セルのcontainerRef内での相対位置を計算
        const cellRect = cellElement.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // コンテナのスクロール位置を取得
        const scrollLeft = containerRef.current.scrollLeft;
        const scrollTop = containerRef.current.scrollTop;

        // セルのコンテナ内での正確な位置を計算
        const relativeLeft = cellRect.left - containerRect.left + scrollLeft;
        const relativeTop = cellRect.top - containerRect.top + scrollTop;

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
  }, [cursor.visible, cursor.pageId, cursor.assetId, containerRef]);

  if (!cursor.visible) {
    return null;
  }

  return (
    <div className="cursor-overlay">
      <div className="cursor-cell" style={cursorStyle} />
    </div>
  );
};