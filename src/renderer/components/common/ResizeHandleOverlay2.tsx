import React from 'react';

interface ResizeHandleOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  currentPos: { x: number; y: number };
  currentSize: { width: number; height: number };
  onResizeMouseDown: (e: React.MouseEvent, handle: string) => void;
  zIndex?: number;
  visible?: boolean;
}

export const ResizeHandleOverlay: React.FC<ResizeHandleOverlayProps> = ({
  canvasWidth,
  canvasHeight,
  currentPos,
  currentSize,
  onResizeMouseDown,
  visible = true,
}) => {
  if (!visible) {
    return null;
  }

  // 画像とリサイズハンドルを含む十分な領域を計算
  const handleSize = 12; // リサイズハンドルのサイズ
  const imageLeft = currentPos.x;
  const imageTop = currentPos.y;
  const imageRight = imageLeft + currentSize.width;
  const imageBottom = imageTop + currentSize.height;

  // SVG領域を画像とキャンバスを含む範囲に拡張
  const svgLeft = Math.min(0, imageLeft - handleSize);
  const svgTop = Math.min(0, imageTop - handleSize);
  const svgRight = Math.max(canvasWidth, imageRight + handleSize);
  const svgBottom = Math.max(canvasHeight, imageBottom + handleSize);

  const svgWidth = svgRight - svgLeft;
  const svgHeight = svgBottom - svgTop;
  const handlerSize = Math.max(svgWidth, svgHeight) * 0.02; // キャンバスの長辺の2%をハンドルサイズにする

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      x={`${svgLeft}px`}
      y={`${svgTop}px`}
      width={`${svgWidth}px`}
      height={`${svgHeight}px`}
    >
      <g transform={`translate(${-svgLeft}, ${-svgTop})`}>
        {generateResizeHandles(currentPos, currentSize, onResizeMouseDown, handlerSize)}
      </g>
    </svg>
  );
};
export const RESIZE_HANDLES = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export const RESIZE_HANDLE_SIZE = 16;

/**
 * SVGリサイズハンドル要素を生成する
 * @param position - 要素の現在位置 {x, y}
 * @param size - 要素の現在サイズ {width, height}
 * @param onResizeMouseDown - リサイズ開始ハンドラー
 * @returns ReactElementの配列
 */
export const generateResizeHandles = (
  position: { x: number; y: number },
  size: { width: number; height: number },
  onResizeMouseDown: (e: React.MouseEvent, handle: string) => void,
  handlerSize: number = RESIZE_HANDLE_SIZE,
): React.ReactElement[] => {
  return RESIZE_HANDLES.map(handle => {
    const handleSize = handlerSize;
    let x = 0;
    let y = 0;
    let cursor = 'nw-resize';
    
    switch (handle) {
      case 'top-left':
        x = position.x;
        y = position.y;
        cursor = 'nw-resize';
        break;
      case 'top-right':
        x = (position.x + size.width) - handleSize;
        y = position.y;
        cursor = 'ne-resize';
        break;
      case 'bottom-left':
        x = position.x;
        y = (position.y + size.height) - handleSize;
        cursor = 'sw-resize';
        break;
      case 'bottom-right':
        x = (position.x + size.width) - handleSize;
        y = (position.y + size.height) - handleSize;
        cursor = 'se-resize';
        break;
    }
    
    return (
      <g key={handle}>
        {/* 外側の白い枠 */}
        <rect
          x={x}
          y={y}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#007acc"
          strokeWidth="2"
          style={{ cursor, pointerEvents: 'all' }}
          onMouseDown={(e) => onResizeMouseDown(e, handle)}
        />
        {/* 内側の青い四角 */}
        <rect
          x={x + 3}
          y={y + 3}
          width={handleSize - 6}
          height={handleSize - 6}
          fill="#007acc"
          stroke="none"
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  });
};