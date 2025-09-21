import React, { forwardRef } from 'react';
import type { ProjectData } from '../../../types/entities';
import { wrapSVGWithParentContainer } from '../../utils/editModalUtils';
import { ResizeHandleOverlay } from './ResizeHandleOverlay2';
import { SnapGuide } from '../../utils/snapUtils';

interface EditModalSvgCanvasProps {
  // 基本情報
  project: ProjectData;
  currentPos: { x: number; y: number };
  currentSize: { width: number; height: number };
  currentOpacity: number;

  // SVG描画内容
  svgContent: string | null;
  originalWidth?: number;
  originalHeight?: number;

  // インタラクション
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent, handle: string) => void;

  // スナップ機能
  snapGuides: SnapGuide[];
}

export const EditModalSvgCanvas = forwardRef<SVGSVGElement, EditModalSvgCanvasProps>(({
  project,
  currentPos,
  currentSize,
  currentOpacity,
  svgContent,
  originalWidth,
  originalHeight,
  onDragStart,
  onResizeStart,
  snapGuides
}, ref) => {
  // 動的余白計算（キャンバス長辺の10%）
  const margin = Math.max(project.canvas.width, project.canvas.height) * 0.1;

  return (
    <svg
      ref={ref}
      width="100%"
      height="100%"
      viewBox={`0 0 ${project.canvas.width + margin * 2} ${project.canvas.height + margin * 2}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* キャンバス背景 */}
      <rect
        x={margin}
        y={margin}
        width={project.canvas.width}
        height={project.canvas.height}
        fill="#f5f5f5"
        rx="2"
        style={{
          filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.2))',
          position: 'relative'
        }}
      />

      {/* SVG描画結果 */}
      {svgContent && (
        <g
          dangerouslySetInnerHTML={{
            __html: wrapSVGWithParentContainer(
              svgContent,
              currentPos.x + margin,
              currentPos.y + margin,
              currentSize.width,
              currentSize.height,
              currentOpacity,
              originalWidth || 0,
              originalHeight || 0
            )
          }}
        />
      )}

      {/* キャンバス枠線 */}
      <rect
        x={margin}
        y={margin}
        width={project.canvas.width}
        height={project.canvas.height}
        stroke="#3b82f6"
        strokeWidth="5"
        fill="none"
        rx="2"
      />

      {/* インタラクション用透明エリア */}
      <rect
        x={currentPos.x + margin}
        y={currentPos.y + margin}
        width={currentSize.width}
        height={currentSize.height}
        fill="transparent"
        stroke="#007acc"
        strokeWidth="5.0"
        strokeDasharray="4"
        style={{ cursor: 'move' }}
        onMouseDown={onDragStart}
      />

      {/* リサイズハンドル */}
      <ResizeHandleOverlay
        canvasWidth={project.canvas.width}
        canvasHeight={project.canvas.height}
        currentPos={{
          x: currentPos.x + margin,
          y: currentPos.y + margin
        }}
        currentSize={currentSize}
        onResizeMouseDown={onResizeStart}
        visible={true}
      />

      {/* スナップガイドライン */}
      {snapGuides.map((guide, index) => (
        <line
          key={index}
          x1={guide.type === 'vertical' ? guide.position + margin : guide.start + margin}
          y1={guide.type === 'vertical' ? guide.start + margin : guide.position + margin}
          x2={guide.type === 'vertical' ? guide.position + margin : guide.end + margin}
          y2={guide.type === 'vertical' ? guide.end + margin : guide.position + margin}
          stroke="#ff4444"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          style={{ pointerEvents: 'none' }}
        />
      ))}
    </svg>
  );
});

EditModalSvgCanvas.displayName = 'EditModalSvgCanvas';