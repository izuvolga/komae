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
  svgContent: string;
  originalWidth?: number;
  originalHeight?: number;

  // インタラクション
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent, handle: string) => void;

  // スナップ機能
  snapGuides: SnapGuide[];

  // マスク機能
  maskMode?: 'none' | 'edit' | 'apply';
  maskCoords?: [[number, number], [number, number], [number, number], [number, number]] | null;
  onMaskPointDragStart?: (e: React.MouseEvent, pointIndex: number) => void;
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
  snapGuides,
  maskMode = 'none',
  maskCoords,
  onMaskPointDragStart
}, ref) => {
  // 動的余白計算（キャンバス長辺の10%）
  const margin = Math.max(project.canvas.width, project.canvas.height) * 0.1;
  const handleSize = Math.max(project.canvas.width, project.canvas.height) * 0.04; // キャンバスの長辺の4%をハンドルサイズにする
  const content = wrapSVGWithParentContainer(
              svgContent,
              currentPos.x + margin,
              currentPos.y + margin,
              currentSize.width,
              currentSize.height,
              currentOpacity,
              originalWidth || 0,
              originalHeight || 0
            )
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
      {(maskMode === 'none' || maskMode === 'edit') && (
        <g
          dangerouslySetInnerHTML={{
            __html: content
          }}
        />
      )}
      {/* SVG描画結果（マスク適用） */}
      { maskMode === 'apply' && maskCoords && (
        <>
          <defs>
            <clipPath id={`maskClip-${project.canvas.width}-${project.canvas.height}`}>
              <polygon
                points={maskCoords.map(point => `${point[0] + margin},${point[1] + margin}`).join(' ')}
              />
            </clipPath>
          </defs>
          <g
            clipPath={`url(#maskClip-${project.canvas.width}-${project.canvas.height})`}
            dangerouslySetInnerHTML={{
              __html: content
            }}
          />
        </>
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

      {/* インタラクション用透明エリア（マスクモード時は無効化） */}
      {maskMode !== 'edit' && (
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
      )}

      {/* リサイズハンドル（マスクモード時は非表示） */}
      <ResizeHandleOverlay
        canvasWidth={project.canvas.width}
        canvasHeight={project.canvas.height}
        currentPos={{
          x: currentPos.x + margin,
          y: currentPos.y + margin
        }}
        currentSize={currentSize}
        onResizeMouseDown={onResizeStart}
        handleSize={handleSize}
        visible={maskMode !== 'edit'}
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
          strokeWidth="3"
          strokeDasharray="4,4"
          style={{ pointerEvents: 'none' }}
        />
      ))}

      {/* マスク機能 */}
      {maskMode === 'edit' && maskCoords && (
        <>
          {/* マスク範囲外の薄い白色オーバーレイ */}
          <defs>
            <mask id={`maskOverlay-${project.canvas.width}-${project.canvas.height}`}>
              <rect
                x={margin}
                y={margin}
                width={project.canvas.width}
                height={project.canvas.height}
                fill="white"
              />
              <polygon
                points={maskCoords.map(point => `${point[0] + margin},${point[1] + margin}`).join(' ')}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x={margin}
            y={margin}
            width={project.canvas.width}
            height={project.canvas.height}
            fill="rgba(255, 255, 255, 0.6)"
            mask={`url(#maskOverlay-${project.canvas.width}-${project.canvas.height})`}
          />

          {/* マスクポリゴン表示 */}
          <polygon
            points={maskCoords.map(point => `${point[0] + margin},${point[1] + margin}`).join(' ')}
            fill="rgba(255, 0, 0, 0.2)"
            stroke="red"
            strokeWidth="1"
            style={{ pointerEvents: 'none' }}
          />

          {/* マスクポイントハンドル */}
          {maskCoords.map((point, index) => {
            const localHandleSize = handleSize;
            const x = point[0] + margin;
            const y = point[1] + margin;
            const offset = localHandleSize / 2;
            const offset_direction = [
              [ 1,  1], // 左上
              [-1,  1], // 右上
              [-1, -1], // 右下
              [ 1, -1]  // 左下
            ][index];

            return (
              <g key={`mask-handle-${index}`}>
                {/* 外側の白い枠 */}
                <circle
                  cx={x}
                  cy={y}
                  r={localHandleSize / 2}
                  fill="white"
                  stroke="red"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => onMaskPointDragStart?.(e, index)}
                />
                {/* 内側の赤い四角 */}
                <circle
                  cx={x}
                  cy={y}
                  r={localHandleSize / 2 - 3}
                  fill="red"
                  stroke="none"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
});

EditModalSvgCanvas.displayName = 'EditModalSvgCanvas';