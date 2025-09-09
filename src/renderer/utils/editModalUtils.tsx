/**
 * EditModal共通ユーティリティ
 * 複数のEditModalで共有される機能を提供
 */

import React from 'react';

/**
 * SVGリサイズハンドルのプロパティ
 */
export interface ResizeHandleProps {
  /** ハンドル識別子 */
  handle: string;
  /** X座標 */
  x: number;
  /** Y座標 */
  y: number;
  /** カーソルスタイル */
  cursor: string;
  /** マウスダウンハンドラー */
  onMouseDown: (e: React.MouseEvent, handle: string) => void;
}

/**
 * リサイズハンドルの設定
 */
export const RESIZE_HANDLES = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type ResizeHandleType = typeof RESIZE_HANDLES[number];

/**
 * EditModalで使用される標準スケールファクター
 */
export const EDIT_MODAL_SCALE = 0.35;

/**
 * リサイズハンドルのサイズ（px）
 */
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
  onResizeMouseDown: (e: React.MouseEvent, handle: string) => void
): React.ReactElement[] => {
  return RESIZE_HANDLES.map(handle => {
    const handleSize = RESIZE_HANDLE_SIZE;
    let x = 0;
    let y = 0;
    let cursor = 'nw-resize';
    
    switch (handle) {
      case 'top-left':
        x = position.x * EDIT_MODAL_SCALE;
        y = position.y * EDIT_MODAL_SCALE;
        cursor = 'nw-resize';
        break;
      case 'top-right':
        x = (position.x + size.width) * EDIT_MODAL_SCALE - handleSize;
        y = position.y * EDIT_MODAL_SCALE;
        cursor = 'ne-resize';
        break;
      case 'bottom-left':
        x = position.x * EDIT_MODAL_SCALE;
        y = (position.y + size.height) * EDIT_MODAL_SCALE - handleSize;
        cursor = 'sw-resize';
        break;
      case 'bottom-right':
        x = (position.x + size.width) * EDIT_MODAL_SCALE - handleSize;
        y = (position.y + size.height) * EDIT_MODAL_SCALE - handleSize;
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

/**
 * マウス座標をキャンバス座標に変換
 * @param clientX - マウスのクライアントX座標
 * @param clientY - マウスのクライアントY座標
 * @param startX - ドラッグ開始時のクライアントX座標
 * @param startY - ドラッグ開始時のクライアントY座標
 * @returns 変換されたデルタ座標 {deltaX, deltaY}
 */
export const convertMouseDelta = (
  clientX: number,
  clientY: number,
  startX: number,
  startY: number
): { deltaX: number; deltaY: number } => {
  return {
    deltaX: (clientX - startX) / EDIT_MODAL_SCALE,
    deltaY: (clientY - startY) / EDIT_MODAL_SCALE,
  };
};

/**
 * キャンバス境界内に座標を制限
 * @param x - X座標
 * @param y - Y座標
 * @param width - 幅
 * @param height - 高さ
 * @param canvasWidth - キャンバス幅
 * @param canvasHeight - キャンバス高さ
 * @returns 制限された座標とサイズ
 */
export const constrainToCanvas = (
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } => {
  const constrainedX = Math.max(0, Math.min(canvasWidth - width, x));
  const constrainedY = Math.max(0, Math.min(canvasHeight - height, y));
  const constrainedWidth = Math.min(width, canvasWidth - constrainedX);
  const constrainedHeight = Math.min(height, canvasHeight - constrainedY);
  
  return {
    x: constrainedX,
    y: constrainedY,
    width: constrainedWidth,
    height: constrainedHeight,
  };
};