import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { getCustomProtocolUrl } from '../../utils/imageUtils';
import type { ImageAsset, ImageAssetInstance, Page } from '../../../types/entities';
import './ImageAssetEditModal.css';

// 編集モードの種類
type EditMode = 'asset' | 'instance';

// 統合されたプロパティ
interface ImageEditModalProps {
  mode: EditMode;
  asset: ImageAsset;
  assetInstance?: ImageAssetInstance;
  page?: Page;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsset?: (updatedAsset: ImageAsset) => void;
  onSaveInstance?: (updatedInstance: ImageAssetInstance) => void;
}

export const ImageEditModal: React.FC<ImageEditModalProps> = ({
  mode,
  asset,
  assetInstance,
  page,
  isOpen,
  onClose,
  onSaveAsset,
  onSaveInstance,
}) => {
  const project = useProjectStore((state) => state.project);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  
  // 編集中のデータ（モードに応じて切り替え）
  const [editedAsset, setEditedAsset] = useState<ImageAsset>(asset);
  const [editedInstance, setEditedInstance] = useState<ImageAssetInstance | null>(
    assetInstance || null
  );

  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
  const [maskEditMode, setMaskEditMode] = useState(false);

  // マウス操作関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartValues, setDragStartValues] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  // マスク編集専用の状態
  const [maskDragPointIndex, setMaskDragPointIndex] = useState<number | null>(null);
  const [maskDragStartPos, setMaskDragStartPos] = useState({ x: 0, y: 0 });
  const [maskDragStartValues, setMaskDragStartValues] = useState<[[number, number], [number, number], [number, number], [number, number]]>([[0, 0], [0, 0], [0, 0], [0, 0]]);

  useEffect(() => {
    setEditedAsset(asset);
    setEditedInstance(assetInstance || null);
  }, [asset, assetInstance]);

  if (!isOpen || !project) return null;

  // 現在の値を取得（Asset vs Instance）
  const getCurrentPosition = () => {
    if (mode === 'instance' && editedInstance) {
      return {
        x: editedInstance.override_pos_x ?? asset.default_pos_x,
        y: editedInstance.override_pos_y ?? asset.default_pos_y,
      };
    }
    return {
      x: editedAsset.default_pos_x,
      y: editedAsset.default_pos_y,
    };
  };

  const getCurrentSize = () => {
    if (mode === 'instance' && editedInstance) {
      return {
        width: editedInstance.override_width ?? asset.default_width,
        height: editedInstance.override_height ?? asset.default_height,
      };
    }
    return {
      width: editedAsset.default_width,
      height: editedAsset.default_height,
    };
  };

  const getCurrentOpacity = () => {
    if (mode === 'instance' && editedInstance) {
      return editedInstance.override_opacity ?? asset.default_opacity;
    }
    return editedAsset.default_opacity;
  };

  const getCurrentMask = () => {
    if (mode === 'instance' && editedInstance) {
      return editedInstance.override_mask ?? asset.default_mask;
    }
    return editedAsset.default_mask;
  };

  const currentPos = getCurrentPosition();
  const currentSize = getCurrentSize();
  const currentOpacity = getCurrentOpacity();
  const currentMask = getCurrentMask();

  // 値の更新（Asset vs Instance）
  const updatePosition = (x: number, y: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_pos_x: x,
        override_pos_y: y,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_pos_x: x,
        default_pos_y: y,
      }));
    }
  };

  const updateSize = (width: number, height: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_width: width,
        override_height: height,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_width: width,
        default_height: height,  
      }));
    }
  };

  const updateOpacity = (opacity: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_opacity: opacity,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_opacity: opacity,
      }));
    }
  };

  const updateMask = (mask: [[number, number], [number, number], [number, number], [number, number]]) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_mask: mask,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_mask: mask,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'instance' && editedInstance && onSaveInstance) {
      onSaveInstance(editedInstance);
    } else if (mode === 'asset' && onSaveAsset) {
      onSaveAsset(editedAsset);
    }
    onClose();
  };

  // Enterキーでフォーカスを外すハンドラー
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  // マウス操作のハンドラー（既存のImageAssetEditModalから移植）
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (maskEditMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const canvasRect = document.querySelector('.canvas-frame')?.getBoundingClientRect();
    if (!canvasRect) return;
    
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({
      x: currentPos.x,
      y: currentPos.y,
      width: currentSize.width,
      height: currentSize.height
    });
  };

  const handleMaskPointMouseDown = (e: React.MouseEvent, pointIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setMaskDragPointIndex(pointIndex);
    setMaskDragStartPos({ x: e.clientX, y: e.clientY });
    setMaskDragStartValues([...currentMask]);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    if (maskEditMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({
      x: currentPos.x,
      y: currentPos.y,
      width: currentSize.width,
      height: currentSize.height
    });
  };

  // マウス移動とマウスアップのハンドラー（グローバルイベント）
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = (e.clientX - dragStartPos.x) / 0.35;
        const deltaY = (e.clientY - dragStartPos.y) / 0.35;
        
        const newX = Math.max(0, Math.min(project.canvas.width - currentSize.width, dragStartValues.x + deltaX));
        const newY = Math.max(0, Math.min(project.canvas.height - currentSize.height, dragStartValues.y + deltaY));
        
        updatePosition(newX, newY);
      } else if (isResizing && resizeHandle) {
        const deltaX = (e.clientX - dragStartPos.x) / 0.35;
        const deltaY = (e.clientY - dragStartPos.y) / 0.35;
        
        let newWidth = dragStartValues.width;
        let newHeight = dragStartValues.height;
        let newX = dragStartValues.x;
        let newY = dragStartValues.y;

        if (resizeHandle.includes('right')) {
          newWidth = Math.max(10, dragStartValues.width + deltaX);
        } else if (resizeHandle.includes('left')) {
          newWidth = Math.max(10, dragStartValues.width - deltaX);
          newX = dragStartValues.x + deltaX;
        }

        if (resizeHandle.includes('bottom')) {
          newHeight = Math.max(10, dragStartValues.height + deltaY);
        } else if (resizeHandle.includes('top')) {
          newHeight = Math.max(10, dragStartValues.height - deltaY);
          newY = dragStartValues.y + deltaY;
        }

        if (aspectRatioLocked) {
          const aspectRatio = dragStartValues.width / dragStartValues.height;
          if (resizeHandle.includes('right') || resizeHandle.includes('left')) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }

        newX = Math.max(0, Math.min(project.canvas.width - newWidth, newX));
        newY = Math.max(0, Math.min(project.canvas.height - newHeight, newY));
        newWidth = Math.min(newWidth, project.canvas.width - newX);
        newHeight = Math.min(newHeight, project.canvas.height - newY);

        updatePosition(newX, newY);
        updateSize(newWidth, newHeight);
      } else if (maskDragPointIndex !== null) {
        const deltaX = (e.clientX - maskDragStartPos.x) / 0.35;
        const deltaY = (e.clientY - maskDragStartPos.y) / 0.35;
        
        const newMask = [...maskDragStartValues] as [[number, number], [number, number], [number, number], [number, number]];
        const originalPoint = maskDragStartValues[maskDragPointIndex];
        newMask[maskDragPointIndex] = [
          Math.max(0, Math.min(currentSize.width, originalPoint[0] + deltaX)),
          Math.max(0, Math.min(currentSize.height, originalPoint[1] + deltaY))
        ];
        
        updateMask(newMask);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      setMaskDragPointIndex(null);
    };

    if (isDragging || isResizing || maskDragPointIndex !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, maskDragPointIndex, dragStartPos, dragStartValues, maskDragStartPos, maskDragStartValues, resizeHandle, aspectRatioLocked, currentSize, project.canvas]);

  const imagePath = getCustomProtocolUrl(asset.original_file_path, currentProjectPath);

  const modalTitle = mode === 'instance' ? `ImageAssetInstance 編集: ${asset.name}` : `ImageAsset 編集: ${asset.name}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="image-asset-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{modalTitle}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="edit-layout">
            {/* 左側: プレビューエリア */}
            <div className="preview-section">
              <div className="image-preview-container">
                <div className="canvas-frame" style={{ 
                  position: 'relative', 
                  width: `${project.canvas.width * 0.35}px`, 
                  height: `${project.canvas.height * 0.35}px`,
                  border: '2px solid #007bff',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  backgroundColor: '#f8f9fa'
                }}>
                  <img
                    src={imagePath}
                    alt={asset.name}
                    style={{
                      position: 'absolute',
                      left: `${currentPos.x * 0.35}px`,
                      top: `${currentPos.y * 0.35}px`,
                      width: `${currentSize.width * 0.35}px`,
                      height: `${currentSize.height * 0.35}px`,
                      opacity: currentOpacity,
                      zIndex: 1,
                    }}
                  />
                  
                  {/* インタラクション用の透明な要素 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${currentPos.x * 0.35}px`,
                      top: `${currentPos.y * 0.35}px`,
                      width: `${currentSize.width * 0.35}px`,
                      height: `${currentSize.height * 0.35}px`,
                      backgroundColor: 'transparent',
                      border: '1px dashed #007acc',
                      cursor: maskEditMode ? 'default' : 'move',
                      zIndex: 2,
                      pointerEvents: 'all',
                    }}
                    onMouseDown={handleImageMouseDown}
                  />

                  {/* マスクポリゴン表示 */}
                  {maskEditMode && (
                    <svg
                      style={{
                        position: 'absolute',
                        left: `${currentPos.x * 0.35}px`,
                        top: `${currentPos.y * 0.35}px`,
                        width: `${currentSize.width * 0.35}px`,
                        height: `${currentSize.height * 0.35}px`,
                        zIndex: 3,
                        pointerEvents: 'none',
                      }}
                    >
                      <polygon
                        points={currentMask.map(point => `${point[0] * 0.35},${point[1] * 0.35}`).join(' ')}
                        fill="rgba(255, 0, 0, 0.2)"
                        stroke="red"
                        strokeWidth="1"
                      />
                      {currentMask.map((point, index) => (
                        <circle
                          key={index}
                          cx={point[0] * 0.35}
                          cy={point[1] * 0.35}
                          r="8"
                          fill="red"
                          stroke="white"
                          strokeWidth="1"
                          style={{ cursor: 'pointer', pointerEvents: 'all' }}
                          onMouseDown={(e) => handleMaskPointMouseDown(e, index)}
                        />
                      ))}
                    </svg>
                  )}

                  {/* リサイズハンドル */}
                  {!maskEditMode && (
                    <>
                      {/* 角のハンドル */}
                      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(handle => {
                        const isTopLeft = handle === 'top-left';
                        const isTopRight = handle === 'top-right';
                        const isBottomLeft = handle === 'bottom-left';
                        const isBottomRight = handle === 'bottom-right';
                        
                        return (
                          <div
                            key={handle}
                            style={{
                              position: 'absolute',
                              left: isTopLeft || isBottomLeft ? `${(currentPos.x - 4) * 0.35}px` : `${(currentPos.x + currentSize.width - 4) * 0.35}px`,
                              top: isTopLeft || isTopRight ? `${(currentPos.y - 4) * 0.35}px` : `${(currentPos.y + currentSize.height - 4) * 0.35}px`,
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#007acc',
                              cursor: isTopLeft || isBottomRight ? 'nw-resize' : 'ne-resize',
                              zIndex: 4,
                            }}
                            onMouseDown={(e) => handleResizeMouseDown(e, handle)}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 右側: パラメータ編集エリア */}
            <div className="params-section">
              {/* Asset Name（上方に配置、マスク編集時は非表示） */}
              {mode === 'asset' && !maskEditMode && (
                <div className="param-group">
                  <div className="name-section">
                    <span>Asset Name</span>
                    <input
                      type="text"
                      value={editedAsset.name}
                      onChange={(e) => setEditedAsset(prev => ({ ...prev, name: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      className="name-input"
                    />
                  </div>
                </div>
              )}
              
              {/* 元画像情報（Asset編集時のみ、マスク編集時は非表示） */}
              {mode === 'asset' && !maskEditMode && (
                <div className="original-info">
                  <div className="size-display">
                    <span>Original Width/Height</span>
                    <div className="size-inputs">
                      <input type="number" value={asset.original_width} readOnly className="readonly-input" />
                      <input type="number" value={asset.original_height} readOnly className="readonly-input" />
                    </div>
                  </div>
                </div>
              )}

              {/* デフォルトサイズ（マスク編集時は非表示） */}
              {!maskEditMode && (
              <div className="param-group">
                <div className="size-display">
                  <span>{mode === 'asset' ? 'Default Width/Height' : 'Width/Height'}</span>
                  <div className="size-inputs">
                    <input
                      type="number"
                      value={currentSize.width}
                      onChange={(e) => {
                        const newWidth = parseFloat(e.target.value) || 0;
                        if (aspectRatioLocked) {
                          const aspectRatio = currentSize.width / currentSize.height;
                          updateSize(newWidth, newWidth / aspectRatio);
                        } else {
                          updateSize(newWidth, currentSize.height);
                        }
                      }}
                      onKeyDown={handleKeyDown}
                    />
                    <input
                      type="number"
                      value={currentSize.height}
                      onChange={(e) => {
                        const newHeight = parseFloat(e.target.value) || 0;
                        if (aspectRatioLocked) {
                          const aspectRatio = currentSize.width / currentSize.height;
                          updateSize(newHeight * aspectRatio, newHeight);
                        } else {
                          updateSize(currentSize.width, newHeight);
                        }
                      }}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </div>
                <div className="aspect-ratio-lock">
                  <label>
                    <input
                      type="checkbox"
                      checked={aspectRatioLocked}
                      onChange={(e) => setAspectRatioLocked(e.target.checked)}
                    />
                    縦横比を元画像にあわせる
                  </label>
                </div>
              </div>
              )}

              {/* 位置（マスク編集時は非表示） */}
              {!maskEditMode && (
              <div className="param-group">
                <div className="size-display">
                  <span>{mode === 'asset' ? 'Default PosX/PosY' : 'PosX/PosY'}</span>
                  <div className="size-inputs">
                    <input
                      type="number"
                      value={currentPos.x}
                      onChange={(e) => updatePosition(parseFloat(e.target.value) || 0, currentPos.y)}
                      onKeyDown={handleKeyDown}
                    />
                    <input
                      type="number"
                      value={currentPos.y}
                      onChange={(e) => updatePosition(currentPos.x, parseFloat(e.target.value) || 0)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                </div>
              </div>
              )}

              {/* 透明度（マスク編集時は非表示） */}
              {!maskEditMode && (
              <div className="param-group">
                <div className="opacity-section">
                  <span>{mode === 'asset' ? 'Default Opacity' : 'Opacity'}</span>
                  <div className="opacity-controls">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={currentOpacity}
                      onChange={(e) => updateOpacity(parseFloat(e.target.value))}
                      className="opacity-slider"
                    />
                    <span className="opacity-value">{currentOpacity.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              )}

              {/* Instance固有: Z-Index（マスク編集時は非表示） */}
              {mode === 'instance' && editedInstance && !maskEditMode && (
                <div className="param-group">
                  <div className="z-index-section">
                    <span>Z-Index</span>
                    <input
                      type="number"
                      value={editedInstance.z_index}
                      onChange={(e) => setEditedInstance(prev => prev ? {
                        ...prev,
                        z_index: parseInt(e.target.value) || 0
                      } : null)}
                      onKeyDown={handleKeyDown}
                      className="z-index-input"
                    />
                  </div>
                </div>
              )}

              {/* マスク編集切り替えボタン（Asset編集時のみ、マスク編集時は非表示） */}
              {mode === 'asset' && !maskEditMode && (
              <div className="mask-edit-toggle">
                <button
                  type="button"
                  className={`mask-toggle-btn ${maskEditMode ? 'active' : ''}`}
                  onClick={() => setMaskEditMode(!maskEditMode)}
                >
                  ✏️ Mask Edit Mode
                </button>
              </div>
              )}

              {/* マスク編集パラメータ */}
              {maskEditMode && (
                <div className="mask-params">
                  <span>Default Mask</span>
                  {currentMask.map((point, index) => (
                    <div key={index} className="mask-point-row">
                      <span>P{index + 1}:</span>
                      <label>x</label>
                      <input
                        type="number"
                        value={Math.round(point[0])}
                        onChange={(e) => {
                          const newMask = [...currentMask] as [[number, number], [number, number], [number, number], [number, number]];
                          newMask[index] = [parseFloat(e.target.value) || 0, point[1]];
                          updateMask(newMask);
                        }}
                        onKeyDown={handleKeyDown}
                        className="mask-input"
                      />
                      <label>y</label>
                      <input
                        type="number"
                        value={Math.round(point[1])}
                        onChange={(e) => {
                          const newMask = [...currentMask] as [[number, number], [number, number], [number, number], [number, number]];
                          newMask[index] = [point[0], parseFloat(e.target.value) || 0];
                          updateMask(newMask);
                        }}
                        onKeyDown={handleKeyDown}
                        className="mask-input"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            キャンセル
          </button>
          <button type="button" onClick={handleSubmit} className="btn-primary">
            保存
          </button>
        </div>
      </div>
    </div>
  );
};