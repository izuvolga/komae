import React, { useState, useEffect, useRef } from 'react';
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
  validateZIndexNumber,
  ZIndexValidationResult,
  sanitizeZIndexInput,
  validateNumericInput,
  validateAndSetNumericValue,
  formatNumberForDisplay,
  calculateResizeValues,
  ResizeCalculationParams
} from '../../utils/editModalUtils';
import { calculateSnap, SnapGuide } from '../../utils/snapUtils';
import { EditModalSvgCanvas } from '../common/EditModalSvgCanvas';
import { useTextFieldKeyboardShortcuts } from '../../hooks/useTextFieldKeyboardShortcuts';

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
  const [zIndexValidation, setZIndexValidation] = useState<ZIndexValidationResult>({ isValid: true });
  const [maskEditMode, setMaskEditMode] = useState(false);

  // マウス操作関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartValues, setDragStartValues] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [shiftAspectRatio, setShiftAspectRatio] = useState<number | null>(null);

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

  // 動的スケール計算用のref
  const previewSvgRef = useRef<SVGSVGElement>(null);
  const [dynamicScale, setDynamicScale] = useState(1);
  const [scaleCalculated, setScaleCalculated] = useState(false);

  // スナップ機能関連の状態
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const SNAP_THRESHOLD = 10; // 10px以内でスナップ

  // ドラッグ開始時にスケールを計算する関数
  const calculateDynamicScale = () => {
    if (scaleCalculated || !previewSvgRef.current || !project) return;

    const svgElement = previewSvgRef.current;
    const svgRect = svgElement.getBoundingClientRect();
    const canvasWidth = project.canvas.width;

    // SVGの実際の描画エリア幅を取得
    const svgDisplayWidth = svgRect.width;

    // viewBoxで設定されている総幅は canvasWidth + margin*2 なので、
    // キャンバス部分の幅は (canvasWidth / (canvasWidth + margin*2)) * svgDisplayWidth
    const canvasDisplayWidth = (canvasWidth / (canvasWidth + margin * 2)) * svgDisplayWidth;

    // スケール計算: 表示されているキャンバス幅 / 実際のキャンバス幅
    const calculatedScale = canvasDisplayWidth / canvasWidth;

    console.log(`VectorEditModal scale calculation:
      - Canvas width: ${canvasWidth}px
      - SVG display width: ${svgDisplayWidth}px
      - Canvas display width: ${canvasDisplayWidth}px
      - Calculated scale: ${calculatedScale}`);

    setDynamicScale(calculatedScale);
    setScaleCalculated(true);
  };

  if (!isOpen || !project) return null;

  // 動的余白計算（キャンバス長辺の10%）
  const margin = Math.max(project.canvas.width, project.canvas.height) * 0.1;

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
  const { handleTextFieldKeyEvent } = useTextFieldKeyboardShortcuts();

  // Shiftキーの状態を監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isShiftPressed) {
        setIsShiftPressed(true);
        // Shiftキーが押された瞬間の現在のサイズの縦横比を記録
        const currentWidth = currentSize.width;
        const currentHeight = currentSize.height;
        if (currentWidth > 0 && currentHeight > 0) {
          setShiftAspectRatio(currentWidth / currentHeight);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        setShiftAspectRatio(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentSize, isShiftPressed]);

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
    // Z-Index衝突検知
    validateZIndex(zIndex);
  };

  const validateZIndex = (zIndex: number) => {
    const validation = validateZIndexNumber(zIndex, project, page, editedInstance?.id);
    setZIndexValidation(validation);
  };

  // z_index専用のサニタイズ関数、バリデーション関数、数値入力検証は共通ユーティリティを使用

  const updateMask = (mask: [[number, number], [number, number], [number, number], [number, number]] | undefined) => {
    // キャンバスの四隅と同じ場合かつ、画像編集モードの場合にはマスクを削除（undefinedに設定）
    let finalMask = mask;
    if (mask && isCanvasSizeMask(mask) && !maskEditMode) {
      finalMask = undefined;
    }

    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_mask: finalMask,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_mask: finalMask,
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
        // 提案された新しい位置を計算
        const proposedX = dragStartValues.x + deltaX;
        const proposedY = dragStartValues.y + deltaY;
        // スナップ計算を実行
        const snapResult = calculateSnap(
          proposedX,
          proposedY,
          currentSize.width,
          currentSize.height,
          project.canvas.width,
          project.canvas.height,
          SNAP_THRESHOLD
        );
        // スナップガイドを更新
        setSnapGuides(snapResult.snapGuides);
        // キャンバス外への移動を許可
        updatePosition(snapResult.snappedX, snapResult.snappedY);
      } else if (isResizing && resizeHandle) {
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y);
        
        // チェックボックスが有効な場合は元画像の縦横比を適用
        let finalResizeResult;
        if (aspectRatioLocked) {
          // 元画像の縦横比を維持
          const originalAspectRatio = asset.original_width / asset.original_height;

          // まず通常のリサイズを計算（キャンバス制約なし）
          const baseResult = calculateResizeValues({
            deltaX,
            deltaY,
            dragStartValues,
            resizeHandle,
            aspectRatioLocked: false,
            minSize: 10
          });

          // 元画像の縦横比に基づいてサイズを調整
          let newWidth = baseResult.width;
          let newHeight = baseResult.height;
          let newX = baseResult.x;
          let newY = baseResult.y;

          if (resizeHandle.includes('right') || resizeHandle.includes('left')) {
            // 幅ベースで元画像の縦横比を維持
            newHeight = newWidth / originalAspectRatio;
            if (resizeHandle.includes('top')) {
              newY = dragStartValues.y + dragStartValues.height - newHeight;
            }
          } else {
            // 高さベースで元画像の縦横比を維持
            newWidth = newHeight * originalAspectRatio;
            if (resizeHandle.includes('left')) {
              newX = dragStartValues.x + dragStartValues.width - newWidth;
            }
          }

          finalResizeResult = { x: newX, y: newY, width: newWidth, height: newHeight };
        } else if (isShiftPressed && shiftAspectRatio !== null) {
          // Shiftキーが押されている場合は記録された縦横比を維持
          const baseResult = calculateResizeValues({
            deltaX,
            deltaY,
            dragStartValues,
            resizeHandle,
            aspectRatioLocked: false,
            minSize: 10
          });

          // 記録された縦横比に基づいてサイズを調整
          let newWidth = baseResult.width;
          let newHeight = baseResult.height;
          let newX = baseResult.x;
          let newY = baseResult.y;

          if (resizeHandle.includes('right') || resizeHandle.includes('left')) {
            // 幅ベースで記録された縦横比を維持
            newHeight = newWidth / shiftAspectRatio;
            if (resizeHandle.includes('top')) {
              newY = dragStartValues.y + dragStartValues.height - newHeight;
            }
          } else {
            // 高さベースで記録された縦横比を維持
            newWidth = newHeight * shiftAspectRatio;
            if (resizeHandle.includes('left')) {
              newX = dragStartValues.x + dragStartValues.width - newWidth;
            }
          }

          finalResizeResult = { x: newX, y: newY, width: newWidth, height: newHeight };
        } else {
          // 自由リサイズ（キャンバス制約なし）
          finalResizeResult = calculateResizeValues({
            deltaX,
            deltaY,
            dragStartValues,
            resizeHandle,
            aspectRatioLocked: false,
            minSize: 10
          });
        }

        updatePosition(finalResizeResult.x, finalResizeResult.y);
        updateSize(finalResizeResult.width, finalResizeResult.height);
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
      setSnapGuides([]); // スナップガイドをクリア
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
  function wrapImagePathBySvg(path: string) {
    return `<image xlink:href="${path}" x="0" y="0" width="${asset.original_width}" height="${asset.original_height}" />`;
  }
    

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
          <Box
            id="img-edit-preview-container"
            sx={{
              width: 600,
              minWidth: 600,
              p: 4, // キャンバス外表示のためpaddingを増加
              backgroundColor: 'action.hover', // より明るいグレー
              borderRight: '1px solid',
              borderRightColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto' // スクロールを許可
          }}>
            {/* SVG描画領域（共通コンポーネント） */}
            <EditModalSvgCanvas
              ref={previewSvgRef}
              project={project}
              currentPos={currentPos}
              currentSize={currentSize}
              currentOpacity={currentOpacity}
              svgContent={wrapImagePathBySvg(imagePath)}
              originalWidth={asset.original_width}
              originalHeight={asset.original_height}
              onDragStart={(e) => {
                if (maskEditMode) return;
                e.preventDefault();
                calculateDynamicScale(); // ドラッグ開始時にスケール計算
                setIsDragging(true);
                setDragStartPos({ x: e.clientX, y: e.clientY });
                setDragStartValues({
                  x: currentPos.x,
                  y: currentPos.y,
                  width: currentSize.width,
                  height: currentSize.height
                });
              }}
              onResizeStart={handleResizeMouseDown}
              snapGuides={snapGuides}
              maskMode={
                maskEditMode ? 'edit' :
                currentMask && !isCanvasSizeMask(currentMask) ? 'apply' :
                'none'
              }
              maskCoords={currentMask}
              onMaskPointDragStart={handleMaskPointMouseDown}
            />
          </Box>

          {/* 右側: パラメータ編集エリア - スクロール可能 */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pt: 5 }}>
            {/* Asset Name（上方に配置、マスク編集時は非表示） */}
            {mode === 'asset' && !maskEditMode && (
              <Box sx={{ mb: 3, pb: 1, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <TextField
                  label="Asset Name"
                  value={editedAsset.name}
                  onChange={(e) => setEditedAsset(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={handleTextFieldKeyEvent}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              </Box>
            )}

            {/* デフォルトサイズ（マスク編集時は非表示） */}
            {!maskEditMode && (
              <Box sx={{ mb: 2, pb: 1, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
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
                      onKeyDown={handleTextFieldKeyEvent}
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
                      onKeyDown={handleTextFieldKeyEvent}
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
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setAspectRatioLocked(isChecked);

                          if (isChecked) {
                            // チェックされた時、元画像のアスペクト比に戻す
                            const originalAspectRatio = asset.original_width / asset.original_height;
                            const currentWidth = currentSize.width;
                            const newHeight = currentWidth / originalAspectRatio;
                            updateSize(currentWidth, newHeight);
                          }
                        }}
                        size="small"
                      />
                    }
                    label={`縦横比を元画像にあわせる(${asset.original_width}×${asset.original_height})`}
                  />
                </Box>
              </Box>
            )}

            {/* 位置（マスク編集時は非表示） */}
            {!maskEditMode && (
              <Box sx={{ mb: 2, pb: 1, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption">X (px)</Typography>
                    <NumericInput
                      value={currentPos.x}
                      onChange={(value) => {
                        updatePosition(value, currentPos.y);
                      }}
                      onKeyDown={handleTextFieldKeyEvent}
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
                      onKeyDown={handleTextFieldKeyEvent}
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
              <Box sx={{ mb: 2, pb: 1, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <OpacityInput
                  value={currentOpacity}
                  onChange={updateOpacity}
                  label={mode === 'asset' ? 'デフォルト透明度' : '透明度'}
                />
              </Box>
            )}

            {/* Z-Index（マスク編集時は非表示） */}
            {!maskEditMode && (
              <Box sx={{ mb: 2, pb: 1, borderBottom: '1px solid',
                borderBottomColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  {mode === 'asset' ? 'デフォルト Z-Index' : 'Z-Index'}
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
                  デフォルトマスク
                </Typography>
                {currentMask.map((point, index) => (
                  <Box key={index} sx={{
                    mb: 2,
                    p: 2,
                    backgroundColor: 'background.paper', // テーマの色を使用
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
                          onKeyDown={handleTextFieldKeyEvent}
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
                          onKeyDown={handleTextFieldKeyEvent}
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
