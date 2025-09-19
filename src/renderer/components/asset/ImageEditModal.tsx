import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Paper,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Close as CloseIcon, Crop as CropIcon } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import type { BaseEditModalProps, EditMode } from '../../../types/common';
import { useEditModalSubmit } from '../../hooks/useEditModalSubmit';
import { getCustomProtocolUrl } from '../../utils/imageUtils';
import { NumericInput } from '../common/NumericInput';
import { ZIndexInput } from '../common/ZIndexInput';
import { OpacityInput } from '../common/OpacityInput';
import { ReadOnlyInput } from '../common/ReadOnlyInput';
import type { ImageAsset, ImageAssetInstance, Page } from '../../../types/entities';
import { getEffectiveZIndex, validateImageAssetData, validateImageAssetInstanceData } from '../../../types/entities';
import {
  convertMouseDelta,
  constrainToCanvas,
  EDIT_MODAL_SCALE,
  getCurrentPosition,
  getCurrentSize,
  getCurrentOpacity,
  getCurrentZIndex,
  validateZIndexValue,
  sanitizeZIndexInput,
  validateNumericInput,
  validateAndSetNumericValue,
  formatNumberForDisplay,
  calculateResizeValues,
  ResizeCalculationParams
} from '../../utils/editModalUtils';
import { ResizeHandleOverlay } from '../common/ResizeHandleOverlay';

// 統合されたプロパティ
interface ImageEditModalProps extends BaseEditModalProps<ImageAsset, ImageAssetInstance> {
  page?: Page;
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
  const { mode: themeMode } = useTheme();
  const project = useProjectStore((state) => state.project);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);

  // 編集中のデータ（モードに応じて切り替え）
  const [editedAsset, setEditedAsset] = useState<ImageAsset>(asset);
  const [editedInstance, setEditedInstance] = useState<ImageAssetInstance | null>(
    assetInstance || null
  );

  // Submit処理フック
  const { handleSubmit } = useEditModalSubmit({
    mode,
    editedAsset,
    editedInstance,
    onSaveAsset,
    onSaveInstance,
    onClose,
    validateAsset: validateImageAssetData,
    validateInstance: validateImageAssetInstanceData
  });

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

  // data-theme属性の設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

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

  // z_index専用のサニタイズ関数、バリデーション関数、数値入力検証は共通ユーティリティを使用

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


  // 数値入力バリデーション関数、数値バリデーション、表示フォーマット関数は共通ユーティリティを使用

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
    
    const canvasRect = document.querySelector('[data-canvas-frame]')?.getBoundingClientRect();
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
        
        const resizeResult = calculateResizeValues({
          deltaX,
          deltaY,
          dragStartValues,
          resizeHandle,
          aspectRatioLocked: aspectRatioLocked || isShiftPressed,
          canvasWidth: project.canvas.width,
          canvasHeight: project.canvas.height,
          minSize: 10
        });

        updatePosition(resizeResult.x, resizeResult.y);
        updateSize(resizeResult.width, resizeResult.height);
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
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        zIndex: 1300,
        '& .MuiDialog-paper': {
          width: '90vw',
          maxWidth: '1200px',
          height: '80vh',
          maxHeight: '800px',
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pr: 1,
        }}
      >
        {modalTitle}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '70vh', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* 左側: プレビューエリア - 固定幅 */}
          <Box sx={{
            width: 400,
            minWidth: 400,
            p: 2,
            backgroundColor: 'action.hover', // より明るいグレー
            borderRight: '1px solid',
            borderRightColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Box
              data-canvas-frame
              sx={{
                  position: 'relative',
                  width: `${project.canvas.width * EDIT_MODAL_SCALE}px`,
                  height: `${project.canvas.height * EDIT_MODAL_SCALE}px`,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  overflow: 'hidden',
                  boxShadow: 2,
                  backgroundColor: 'grey.50'
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

                  {/* リサイズハンドル */}
                  <ResizeHandleOverlay
                    canvasWidth={project.canvas.width}
                    canvasHeight={project.canvas.height}
                    currentPos={currentPos}
                    currentSize={currentSize}
                    onResizeMouseDown={handleResizeMouseDown}
                    zIndex={4}
                    visible={!maskEditMode}
                  />
                </Box>
          </Box>

          {/* 右側: パラメータ編集エリア - スクロール可能 */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {/* Asset Name（上方に配置、マスク編集時は非表示） */}
            {mode === 'asset' && !maskEditMode && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <TextField
                  label="Asset Name"
                  value={editedAsset.name}
                  onChange={(e) => setEditedAsset(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              </Box>
            )}
              
            {/* 元画像情報（Asset編集時のみ、マスク編集時は非表示） */}
            {mode === 'asset' && !maskEditMode && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <ReadOnlyInput
                  label="Original Width/Height"
                  value={`${asset.original_width} × ${asset.original_height}`}
                />
              </Box>
            )}

            {/* デフォルトサイズ（マスク編集時は非表示） */}
            {!maskEditMode && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  {mode === 'asset' ? 'Default Width/Height' : 'Width/Height'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption">幅</Typography>
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
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption">高さ</Typography>
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
                  </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={aspectRatioLocked}
                        onChange={(e) => setAspectRatioLocked(e.target.checked)}
                        size="small"
                      />
                    }
                    label="縦横比を元画像にあわせる"
                  />
                </Box>
              </Box>
            )}

            {/* 位置（マスク編集時は非表示） */}
            {!maskEditMode && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  {mode === 'asset' ? 'Default PosX/PosY' : 'PosX/PosY'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption">X (px)</Typography>
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
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption">Y (px)</Typography>
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
                  </Box>
                </Box>
              </Box>
            )}

            {/* 透明度（マスク編集時は非表示） */}
            {!maskEditMode && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <OpacityInput
                  value={currentOpacity}
                  onChange={updateOpacity}
                  label={mode === 'asset' ? 'Default Opacity' : 'Opacity'}
                />
              </Box>
            )}

            {/* Z-Index（マスク編集時は非表示） */}
            {!maskEditMode && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  {mode === 'asset' ? 'Default Z-Index' : 'Z-Index'}
                </Typography>
                <Box sx={{ '& .MuiTextField-root': { mb: 1 } }}>
                  <ZIndexInput
                    value={currentZIndex}
                    onChange={updateZIndex}
                    validation={zIndexValidation}
                  />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 1,
                    color: !zIndexValidation.isValid ? 'error.main' :
                           zIndexValidation.warning ? 'warning.main' : 'text.secondary'
                  }}
                >
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
                </Typography>
              </Box>
            )}

              {/* マスク編集切り替えボタン（Asset編集時のみ、マスク編集時は非表示） */}
            {mode === 'asset' && !maskEditMode && (
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="outlined"
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
                  startIcon={<CropIcon />}
                >
                  Mask Edit Mode
                </Button>
              </Box>
            )}

            {/* マスク編集パラメータ - MUI化 */}
            {maskEditMode && currentMask && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid', borderBottomColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Default Mask
                </Typography>
                {currentMask.map((point, index) => (
                  <Box key={index} sx={{
                    mb: 2,
                    p: 2,
                    backgroundColor: 'action.hover', // テーマの色を使用
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider' // ダークモードでも適切なボーダー色
                  }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      P{index + 1}:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption">X</Typography>
                        <NumericInput
                          value={point[0]}
                          onChange={(value) => {
                            const newMask = [...currentMask] as [[number, number], [number, number], [number, number], [number, number]];
                            newMask[index] = [value, point[1]];
                            updateMask(newMask);
                          }}
                          min={-9999}
                          max={9999}
                          decimals={2}
                          className="small"
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption">Y</Typography>
                        <NumericInput
                          value={point[1]}
                          onChange={(value) => {
                            const newMask = [...currentMask] as [[number, number], [number, number], [number, number], [number, number]];
                            newMask[index] = [point[0], value];
                            updateMask(newMask);
                          }}
                          min={-9999}
                          max={9999}
                          decimals={2}
                          className="small"
                        />
                      </Box>
                    </Box>
                  </Box>
                ))}

                {/* Exit Mask Editor ボタン */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const effectiveMask = isCanvasSizeMask(currentMask) ? undefined : currentMask;
                      updateMask(effectiveMask);
                      setMaskEditMode(false);
                    }}
                    startIcon={<span>←</span>}
                  >
                    Exit Mask Editor
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          キャンセル
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};
