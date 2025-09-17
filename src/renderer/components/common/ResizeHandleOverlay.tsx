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

  return (
    <svg
      style={{
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: `${canvasWidth * EDIT_MODAL_SCALE}px`,
        height: `${canvasHeight * EDIT_MODAL_SCALE}px`,
        zIndex,
        pointerEvents: 'none',
      }}
    >
      {generateResizeHandles(currentPos, currentSize, onResizeMouseDown)}
    </svg>
  );
};