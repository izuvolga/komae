import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { getCustomProtocolUrl } from '../../utils/imageUtils';
import { NumericInput } from '../common/NumericInput';
import type { ImageAsset, ImageAssetInstance, Page } from '../../../types/entities';
import { getEffectiveZIndex, validateImageAssetData, validateImageAssetInstanceData } from '../../../types/entities';
import { 
  generateResizeHandles, 
  convertMouseDelta, 
  constrainToCanvas, 
  EDIT_MODAL_SCALE,
  getCurrentPosition,
  getCurrentSize,
  getCurrentOpacity,
  getCurrentZIndex
} from '../../utils/editModalUtils';
import './ImageEditModal.css';

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
  const [zIndexValidation, setZIndexValidation] = useState<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>({ isValid: true });
  const [maskEditMode, setMaskEditMode] = useState(false);

  // マウス操作関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartValues, setDragStartValues] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // マスク編集専用の状態
  const [maskDragPointIndex, setMaskDragPointIndex] = useState<number | null>(null);
  const [maskDragStartPos, setMaskDragStartPos] = useState({ x: 0, y: 0 });
  const [maskDragStartValues, setMaskDragStartValues] = useState<[[number, number], [number, number], [number, number], [number, number]]>([[0, 0], [0, 0], [0, 0], [0, 0]]);

  useEffect(() => {
    setEditedAsset(asset);
    setEditedInstance(assetInstance || null);
  }, [asset, assetInstance]);

  // Shiftキーの状態を監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  if (!isOpen || !project) return null;

  // 現在の値を取得（Asset vs Instance） - 共通ユーティリティを使用

  const getCurrentMask = () => {
    if (mode === 'instance' && editedInstance) {
      return editedInstance.override_mask ?? asset.default_mask ?? null;
    }
    return editedAsset.default_mask ?? null;
  };

  // マスクがキャンバスサイズと同じかどうかを判定
  const isCanvasSizeMask = (mask: [[number, number], [number, number], [number, number], [number, number]] | null): boolean => {
    if (!mask) return true;
    const [p1, p2, p3, p4] = mask;
    return (
      p1[0] === 0 && p1[1] === 0 &&
      p2[0] === project.canvas.width && p2[1] === 0 &&
      p3[0] === project.canvas.width && p3[1] === project.canvas.height &&
      p4[0] === 0 && p4[1] === project.canvas.height
    );
  };

  const currentPos = getCurrentPosition(mode, editedAsset, editedInstance);
  const currentSize = getCurrentSize(mode, editedAsset, editedInstance);
  const currentOpacity = getCurrentOpacity(mode, editedAsset, editedInstance);
  const currentZIndex = getCurrentZIndex(mode, editedAsset, editedInstance);
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

  const updateZIndex = (zIndex: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_z_index: zIndex,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_z_index: zIndex,
      }));
    }
  };

  // z_index専用のサニタイズ関数（整数のみ）
  const sanitizeZIndexInput = (value: string): string => {
    // 数字と-のみを許可（小数点は除外）
    let sanitized = value.replace(/[^0-9\-]/g, '');
    
    // 最初の文字以外の-を除去
    if (sanitized.indexOf('-') > 0) {
      sanitized = sanitized.replace(/-/g, '');
      if (value.startsWith('-')) {
        sanitized = '-' + sanitized;
      }
    }
    
    return sanitized;
  };

  // z_indexバリデーション関数
  const validateZIndexValue = (value: string): {
    isValid: boolean;
    error?: string;
    warning?: string;
  } => {
    const numValue = parseInt(value.trim());
    
    // 空文字列または無効な数値
    if (isNaN(numValue)) {
      return {
        isValid: false,
        error: 'z-indexは数値である必要があります'
      };
    }
    
    // 範囲チェック（-9999 〜 9999）
    if (numValue < -9999 || numValue > 9999) {
      return {
        isValid: false,
        error: 'z-indexは-9999から9999の範囲で入力してください'
      };
    }
    
    // 競合チェック（同じページ内での重複）
    let warning: string | undefined;
    if (page && project) {
      const conflicts: string[] = [];
      
      Object.values(page.asset_instances).forEach((instance) => {
        // 自分自身は除外
        if (instance.id === assetInstance?.id) return;
        
        const instanceAsset = project.assets[instance.asset_id];
        if (!instanceAsset) return;
        
        const effectiveZIndex = getEffectiveZIndex(instanceAsset, instance);
        
        if (effectiveZIndex === numValue) {
          const assetName = instanceAsset.name || instanceAsset.id;
          conflicts.push(assetName);
        }
      });
      
      if (conflicts.length > 0) {
        warning = `同じz-indexを持つアセット: ${conflicts.join(', ')}`;
      }
    }
    
    return {
      isValid: true,
      warning
    };
  };

  const updateMask = (mask: [[number, number], [number, number], [number, number], [number, number]] | undefined) => {
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

    if (mode === 'instance' && editedInstance) {
      // ImageAssetInstanceの全体バリデーション
      const validation = validateImageAssetInstanceData(editedInstance);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      if (onSaveInstance) {
        onSaveInstance(editedInstance);
      }
    } else if (mode === 'asset') {
      // ImageAssetの全体バリデーション
      const validation = validateImageAssetData(editedAsset);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      if (onSaveAsset) {
        onSaveAsset(editedAsset);
      }
    }
    onClose();
  };

  // 数値入力バリデーション関数
  const validateNumericInput = (value: string, allowNegative: boolean = true): string => {
    // 数字、-、.のみを許可
    let sanitized = value.replace(/[^0-9\-\.]/g, '');
    
    // 負数を許可しない場合は-を除去
    if (!allowNegative) {
      sanitized = sanitized.replace(/-/g, '');
    }
    
    // 最初の文字以外の-を除去
    if (sanitized.indexOf('-') > 0) {
      sanitized = sanitized.replace(/-/g, '');
      if (allowNegative && value.startsWith('-')) {
        sanitized = '-' + sanitized;
      }
    }
    
    // 複数の.を除去（最初の.のみ残す）
    const dotIndex = sanitized.indexOf('.');
    if (dotIndex !== -1) {
      const beforeDot = sanitized.substring(0, dotIndex);
      const afterDot = sanitized.substring(dotIndex + 1).replace(/\./g, '');
      // 小数点以下2位まで制限
      const limitedAfterDot = afterDot.substring(0, 2);
      sanitized = beforeDot + '.' + limitedAfterDot;
    }
    
    return sanitized;
  };

  // 数値バリデーション（フォーカスアウト時）
  const validateAndSetValue = (value: string, minValue: number = 0, fallbackValue: number): number => {
    if (value === '' || value === '-' || value === '.') {
      return fallbackValue;
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < minValue) {
      return fallbackValue;
    }
    
    // 小数点以下2位まで丸める
    return Math.round(numValue * 100) / 100;
  };

  // 数値を小数点2位まで制限して表示する関数
  const formatNumberForDisplay = (value: number): string => {
    return value.toFixed(2).replace(/\.?0+$/, '');
  };

  // Enterキーでフォーカスを外すハンドラー
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  // マウス操作のハンドラー
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
    if (currentMask) {
      setMaskDragStartValues([...currentMask]);
    }
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
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y);
        
        const constrained = constrainToCanvas(
          dragStartValues.x + deltaX,
          dragStartValues.y + deltaY,
          currentSize.width,
          currentSize.height,
          project.canvas.width,
          project.canvas.height
        );
        
        updatePosition(constrained.x, constrained.y);
      } else if (isResizing && resizeHandle) {
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y);
        
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

        // 縦横比維持: aspectRatioLockedまたはShiftキーが押されている場合
        if (aspectRatioLocked || isShiftPressed) {
          let aspectRatio;
          
          if (aspectRatioLocked) {
            // aspectRatioLockedの場合は元画像の縦横比を使用
            aspectRatio = asset.original_width / asset.original_height;
          } else if (isShiftPressed) {
            // Shiftキーの場合は現在のサイズの縦横比を使用
            aspectRatio = dragStartValues.width / dragStartValues.height;
          }
          
          if (aspectRatio) {
            if (resizeHandle.includes('right') || resizeHandle.includes('left')) {
              newHeight = newWidth / aspectRatio;
              // 上端をドラッグしている場合は、位置も調整
              if (resizeHandle.includes('top')) {
                newY = dragStartValues.y + dragStartValues.height - newHeight;
              }
            } else {
              newWidth = newHeight * aspectRatio;
              // 左端をドラッグしている場合は、位置も調整
              if (resizeHandle.includes('left')) {
                newX = dragStartValues.x + dragStartValues.width - newWidth;
              }
            }
          }
        }

        const constrained = constrainToCanvas(newX, newY, newWidth, newHeight, project.canvas.width, project.canvas.height);

        updatePosition(constrained.x, constrained.y);
        updateSize(constrained.width, constrained.height);
      } else if (maskDragPointIndex !== null && currentMask) {
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, maskDragStartPos.x, maskDragStartPos.y);
        
        const newMask = [...maskDragStartValues] as [[number, number], [number, number], [number, number], [number, number]];
        const originalPoint = maskDragStartValues[maskDragPointIndex];
        newMask[maskDragPointIndex] = [
          Math.max(0, Math.min(project.canvas.width, originalPoint[0] + deltaX)),
          Math.max(0, Math.min(project.canvas.height, originalPoint[1] + deltaY))
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
    <div className="modal-overlay">
      <div className="image-asset-edit-modal">
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
                  width: `${project.canvas.width * EDIT_MODAL_SCALE}px`, 
                  height: `${project.canvas.height * EDIT_MODAL_SCALE}px`,
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
                      left: `${currentPos.x * EDIT_MODAL_SCALE}px`,
                      top: `${currentPos.y * EDIT_MODAL_SCALE}px`,
                      width: `${currentSize.width * EDIT_MODAL_SCALE}px`,
                      height: `${currentSize.height * EDIT_MODAL_SCALE}px`,
                      opacity: currentOpacity,
                      zIndex: 1,
                    }}
                  />
                  
                  {/* インタラクション用の透明な要素 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${currentPos.x * EDIT_MODAL_SCALE}px`,
                      top: `${currentPos.y * EDIT_MODAL_SCALE}px`,
                      width: `${currentSize.width * EDIT_MODAL_SCALE}px`,
                      height: `${currentSize.height * EDIT_MODAL_SCALE}px`,
                      backgroundColor: 'transparent',
                      border: '1px dashed #007acc',
                      cursor: maskEditMode ? 'default' : 'move',
                      zIndex: 2,
                      pointerEvents: 'all',
                    }}
                    onMouseDown={handleImageMouseDown}
                  />

                  {/* マスク編集時のオーバーレイ表示 */}
                  {maskEditMode && currentMask && (
                    <>
                      {/* マスク範囲外の薄い白色オーバーレイ */}
                      <svg
                        style={{
                          position: 'absolute',
                          left: '0px',
                          top: '0px',
                          width: `${project.canvas.width * EDIT_MODAL_SCALE}px`,
                          height: `${project.canvas.height * EDIT_MODAL_SCALE}px`,
                          zIndex: 2,
                          pointerEvents: 'none',
                        }}
                      >
                        <defs>
                          <mask id="maskOverlay">
                            <rect
                              x="0"
                              y="0"
                              width={project.canvas.width * EDIT_MODAL_SCALE}
                              height={project.canvas.height * EDIT_MODAL_SCALE}
                              fill="white"
                            />
                            <polygon
                              points={currentMask.map(point => `${point[0] * EDIT_MODAL_SCALE},${point[1] * EDIT_MODAL_SCALE}`).join(' ')}
                              fill="black"
                            />
                          </mask>
                        </defs>
                        <rect
                          x="0"
                          y="0"
                          width={project.canvas.width * EDIT_MODAL_SCALE}
                          height={project.canvas.height * EDIT_MODAL_SCALE}
                          fill="rgba(255, 255, 255, 0.6)"
                          mask="url(#maskOverlay)"
                        />
                      </svg>
                      
                      {/* マスクポリゴン表示 */}
                      <svg
                        style={{
                          position: 'absolute',
                          left: '0px',
                          top: '0px',
                          width: `${project.canvas.width * EDIT_MODAL_SCALE}px`,
                          height: `${project.canvas.height * EDIT_MODAL_SCALE}px`,
                          zIndex: 3,
                          pointerEvents: 'none',
                        }}
                      >
                        <polygon
                          points={currentMask.map(point => `${point[0] * EDIT_MODAL_SCALE},${point[1] * EDIT_MODAL_SCALE}`).join(' ')}
                          fill="rgba(255, 0, 0, 0.2)"
                          stroke="red"
                          strokeWidth="1"
                        />
                        {currentMask.map((point, index) => {
                          const handleSize = 16; // ハンドルのサイズ
                          const x = point[0] * EDIT_MODAL_SCALE;
                          const y = point[1] * EDIT_MODAL_SCALE;
                          // ハンドルを矩形の内側に配置するためのオフセット
                          const offset = handleSize / 2;
                          const offset_direction = [
                            [ 1,  1], // 左上
                            [-1,  1], // 右上
                            [-1, -1], // 右下
                            [ 1, -1]  // 左下
                          ][index];

                          return (
                            <g key={index}>
                              {/* 外側の白い枠 */}
                              <rect
                                x={x - handleSize / 2 + offset * offset_direction[0]}
                                y={y - handleSize / 2 + offset * offset_direction[1]}
                                width={handleSize}
                                height={handleSize}
                                fill="white"
                                stroke="red"
                                strokeWidth="2"
                                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                                onMouseDown={(e) => handleMaskPointMouseDown(e, index)}
                              />
                              {/* 内側の赤い四角 */}
                              <rect
                                x={x - handleSize / 2 + 3 + offset * offset_direction[0]}
                                y={y - handleSize / 2 + 3 + offset * offset_direction[1]}
                                width={handleSize - 6}
                                height={handleSize - 6}
                                fill="red"
                                stroke="none"
                                style={{ pointerEvents: 'none' }}
                              />
                            </g>
                          );
                        })}
                      </svg>
                    </>
                  )}

                  {/* SVGベースのリサイズハンドル */}
                  {!maskEditMode && (
                    <svg
                      style={{
                        position: 'absolute',
                        left: '0px',
                        top: '0px',
                        width: `${project.canvas.width * EDIT_MODAL_SCALE}px`,
                        height: `${project.canvas.height * EDIT_MODAL_SCALE}px`,
                        zIndex: 4,
                        pointerEvents: 'none',
                      }}
                    >
                      {generateResizeHandles(currentPos, currentSize, handleResizeMouseDown)}
                    </svg>
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
                      <NumericInput
                        value={asset.original_width}
                        onChange={(value) => {
                          setEditedAsset(prev => ({ ...prev, original_width: value }));
                        }}
                        min={0.01}
                        decimals={2}
                        className="small"
                      />
                      <NumericInput
                        value={asset.original_height}
                        onChange={(value) => {
                          setEditedAsset(prev => ({ ...prev, original_height: value }));
                        }}
                        min={0.01}
                        decimals={2}
                        className="small"
                      />
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
                    <NumericInput
                      value={currentSize.width}
                      onChange={(value) => {
                        if (aspectRatioLocked) {
                          const aspectRatio = asset.original_width / asset.original_height;
                          updateSize(value, value / aspectRatio);
                        } else {
                          updateSize(value, currentSize.height);
                        }
                      }}
                      min={0.01}
                      decimals={2}
                      className="small"
                    />
                    <NumericInput
                      value={currentSize.height}
                      onChange={(value) => {
                        if (aspectRatioLocked) {
                          const aspectRatio = asset.original_width / asset.original_height;
                          updateSize(value * aspectRatio, value);
                        } else {
                          updateSize(currentSize.width, value);
                        }
                      }}
                      min={0.01}
                      decimals={2}
                      className="small"
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
                    <NumericInput
                      value={currentPos.x}
                      onChange={(value) => {
                        updatePosition(value, currentPos.y);
                      }}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                    <NumericInput
                      value={currentPos.y}
                      onChange={(value) => {
                        updatePosition(currentPos.x, value);
                      }}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
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

              {/* Z-Index（マスク編集時は非表示） */}
              {!maskEditMode && (
                <div className="param-group">
                  <div className="z-index-section">
                    <span>{mode === 'asset' ? 'Default Z-Index' : 'Z-Index'}</span>
                    <div className="z-index-controls">
                      <input
                        type="text"
                        value={tempInputValues.z_index ?? currentZIndex.toString()}
                        onChange={(e) => {
                          const sanitized = sanitizeZIndexInput(e.target.value);
                          setTempInputValues(prev => ({ ...prev, z_index: sanitized }));
                          
                          // バリデーション実行
                          const validation = validateZIndexValue(sanitized);
                          setZIndexValidation(validation);
                        }}
                        onBlur={(e) => {
                          const validated = parseInt(e.target.value) || currentZIndex;
                          updateZIndex(validated);
                          setTempInputValues(prev => {
                            const newTemp = { ...prev };
                            delete newTemp.z_index;
                            return newTemp;
                          });
                        }}
                        onKeyDown={handleKeyDown}
                        className={`z-index-input ${
                          !zIndexValidation.isValid ? 'error' : 
                          zIndexValidation.warning ? 'warning' : ''
                        }`}
                      />
                      <span className={`z-index-info ${
                        !zIndexValidation.isValid ? 'error' : 
                        zIndexValidation.warning ? 'warning' : ''
                      }`}>
                        {!zIndexValidation.isValid && zIndexValidation.error ? 
                          zIndexValidation.error :
                          zIndexValidation.warning ? 
                          zIndexValidation.warning :
                          mode === 'instance' && editedInstance?.override_z_index !== undefined 
                            ? `(overriding default: ${asset.default_z_index})`
                            : mode === 'instance' 
                            ? `(using default: ${asset.default_z_index})`
                            : '(layer order: lower = background)'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* マスク編集切り替えボタン（Asset編集時のみ、マスク編集時は非表示） */}
              {mode === 'asset' && !maskEditMode && (
              <div className="mask-edit-toggle">
                <button
                  type="button"
                  className={`mask-toggle-btn ${maskEditMode ? 'active' : ''}`}
                  onClick={() => {
                    if (!maskEditMode) {
                      // マスク編集モードに入る時、マスクが未定義の場合、キャンバスサイズの4点に設定
                      if (!editedAsset.default_mask) {
                        const canvasWidth = project.canvas.width;
                        const canvasHeight = project.canvas.height;
                        const newMask: [[number, number], [number, number], [number, number], [number, number]] = [
                          [0, 0],                         // 左上
                          [canvasWidth, 0],              // 右上
                          [canvasWidth, canvasHeight],   // 右下
                          [0, canvasHeight]              // 左下
                        ];
                        setEditedAsset(prev => ({ ...prev, default_mask: newMask }));
                      }
                    }
                    setMaskEditMode(!maskEditMode);
                  }}
                >
                  ✏️ Mask Edit Mode
                </button>
              </div>
              )}

              {/* マスク編集パラメータ */}
              {maskEditMode && currentMask && (
                <div className="mask-params">
                  <span>Default Mask</span>
                  {currentMask.map((point, index) => (
                    <div key={index} className="mask-point-row">
                      <span>P{index + 1}:</span>
                      <label>x</label>
                      <input
                        type="text"
                        value={tempInputValues[`mask_${index}_x`] ?? formatNumberForDisplay(point[0])}
                        onChange={(e) => {
                          const sanitized = validateNumericInput(e.target.value, true);
                          setTempInputValues(prev => ({ ...prev, [`mask_${index}_x`]: sanitized }));
                        }}
                        onBlur={(e) => {
                          const validated = validateAndSetValue(e.target.value, -9999, point[0]);
                          const newMask = [...currentMask] as [[number, number], [number, number], [number, number], [number, number]];
                          newMask[index] = [validated, point[1]];
                          updateMask(newMask);
                          setTempInputValues(prev => {
                            const newTemp = { ...prev };
                            delete newTemp[`mask_${index}_x`];
                            return newTemp;
                          });
                        }}
                        onKeyDown={handleKeyDown}
                        className="mask-input"
                      />
                      <label>y</label>
                      <input
                        type="text"
                        value={tempInputValues[`mask_${index}_y`] ?? formatNumberForDisplay(point[1])}
                        onChange={(e) => {
                          const sanitized = validateNumericInput(e.target.value, true);
                          setTempInputValues(prev => ({ ...prev, [`mask_${index}_y`]: sanitized }));
                        }}
                        onBlur={(e) => {
                          const validated = validateAndSetValue(e.target.value, -9999, point[1]);
                          const newMask = [...currentMask] as [[number, number], [number, number], [number, number], [number, number]];
                          newMask[index] = [point[0], validated];
                          updateMask(newMask);
                          setTempInputValues(prev => {
                            const newTemp = { ...prev };
                            delete newTemp[`mask_${index}_y`];
                            return newTemp;
                          });
                        }}
                        onKeyDown={handleKeyDown}
                        className="mask-input"
                      />
                    </div>
                  ))}
                  
                  {/* Exit Mask Editor ボタン */}
                  <div className="mask-edit-toggle" style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      className="back-button"
                      onClick={() => {
                        const effectiveMask = isCanvasSizeMask(currentMask) ? undefined : currentMask;
                        updateMask(effectiveMask);
                        setMaskEditMode(false)
                      }}
                    >
                      ← Exit Mask Editor
                    </button>
                  </div>
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
