import React from 'react';
import { generateResizeHandles, EDIT_MODAL_SCALE } from '../../utils/editModalUtils';

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
  zIndex = 3,
  visible = true,
}) => {
  if (!visible) {
    return null;
  }

  // 画像とリサイズハンドルを含む十分な領域を計算
  const handleSize = 12; // リサイズハンドルのサイズ
  const imageLeft = currentPos.x * EDIT_MODAL_SCALE;
  const imageTop = currentPos.y * EDIT_MODAL_SCALE;
  const imageRight = imageLeft + (currentSize.width * EDIT_MODAL_SCALE);
  const imageBottom = imageTop + (currentSize.height * EDIT_MODAL_SCALE);

  // SVG領域を画像とキャンバスを含む範囲に拡張
  const svgLeft = Math.min(0, imageLeft - handleSize);
  const svgTop = Math.min(0, imageTop - handleSize);
  const svgRight = Math.max(canvasWidth * EDIT_MODAL_SCALE, imageRight + handleSize);
  const svgBottom = Math.max(canvasHeight * EDIT_MODAL_SCALE, imageBottom + handleSize);

  const svgWidth = svgRight - svgLeft;
  const svgHeight = svgBottom - svgTop;

  return (
    <svg
      style={{
        position: 'absolute',
        left: `${svgLeft}px`,
        top: `${svgTop}px`,
        width: `${svgWidth}px`,
        height: `${svgHeight}px`,
        zIndex,
        pointerEvents: 'none',
      }}
    >
      <g transform={`translate(${-svgLeft}, ${-svgTop})`}>
        {generateResizeHandles(currentPos, currentSize, onResizeMouseDown)}
      </g>
    </svg>
  );
};