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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import type { BaseEditModalProps } from '../../../types/common';
import { useTextFieldKeyboardShortcuts } from '../../hooks/useTextFieldKeyboardShortcuts';
import { NumericInput } from '../common/NumericInput';
import { ZIndexInput } from '../common/ZIndexInput';
import { OpacityInput } from '../common/OpacityInput';
import { ReadOnlyInput } from '../common/ReadOnlyInput';
import type { VectorAsset, VectorAssetInstance, Page } from '../../../types/entities';
import { validateVectorAssetData, validateVectorAssetInstanceData } from '../../../types/entities';
import {
  convertMouseDelta,
  getCurrentPosition,
  getCurrentSize,
  getCurrentOpacity,
  getCurrentZIndex,
  validateZIndexNumber,
  ZIndexValidationResult,
} from '../../utils/editModalUtils';
import { calculateSnap, SnapGuide } from '../../utils/snapUtils';
import { EditModalSvgCanvas } from '../common/EditModalSvgCanvas';


// 統合されたプロパティ
interface VectorEditModalProps extends BaseEditModalProps<VectorAsset, VectorAssetInstance> {
  page?: Page;
}

export const VectorEditModal: React.FC<VectorEditModalProps> = ({
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
  const { handleTextFieldKeyEvent } = useTextFieldKeyboardShortcuts();

  // 編集中のデータ（モードに応じて切り替え）
  const [editedAsset, setEditedAsset] = useState<VectorAsset>(asset);
  const [editedInstance, setEditedInstance] = useState<VectorAssetInstance | null>(
    assetInstance || null
  );

  const [zIndexValidation, setZIndexValidation] = useState<ZIndexValidationResult>({ isValid: true });

  // マウス操作関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartValues, setDragStartValues] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  // アスペクト比関連の状態
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [shiftAspectRatio, setShiftAspectRatio] = useState<number | null>(null);

  // 動的スケール計算用のref
  const previewSvgRef = useRef<SVGSVGElement>(null);
  const [dynamicScale, setDynamicScale] = useState(1);
  const [scaleCalculated, setScaleCalculated] = useState(false);

  // スナップ機能関連の状態
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const SNAP_THRESHOLD = 10; // 10px以内でスナップ

  // data-theme属性の設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    setEditedAsset(asset);
    setEditedInstance(assetInstance || null);
  }, [asset, assetInstance]);

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

  // 現在の値を取得（Asset vs Instance）- 共通ユーティリティを使用

  // 値更新ハンドラー
  const handlePositionChange = (field: 'x' | 'y', value: number) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        [`default_pos_${field}`]: value,
      }));
    } else if (editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        [`override_pos_${field}`]: value,
      } : null);
    }
  };

  const handleSizeChange = (field: 'width' | 'height', value: number) => {
    let newWidth = field === 'width' ? value : currentSize.width;
    let newHeight = field === 'height' ? value : currentSize.height;

    // 縦横比チェックボックスが有効な場合、元画像の縦横比を維持
    if (aspectRatioLocked && asset.original_width && asset.original_height) {
      const originalAspectRatio = asset.original_width / asset.original_height;
      if (field === 'width') {
        newHeight = Math.round(newWidth / originalAspectRatio);
      } else {
        newWidth = Math.round(newHeight * originalAspectRatio);
      }
    }

    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        default_width: newWidth,
        default_height: newHeight,
      }));
    } else if (editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_width: newWidth,
        override_height: newHeight,
      } : null);
    }
  };

  const handleOpacityChange = (value: number) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        default_opacity: value,
      }));
    } else if (editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_opacity: value,
      } : null);
    }
  };

  const handleZIndexChange = (value: number) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        default_z_index: value,
      }));
    } else if (editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_z_index: value,
      } : null);
    }

    // Z-Index バリデーション
    validateZIndex(value);
  };

  const validateZIndex = (zIndex: number) => {
    const validation = validateZIndexNumber(zIndex, project, page, editedInstance?.id);
    setZIndexValidation(validation);
  };

  const handleSave = () => {
    try {
      if (mode === 'asset') {
        validateVectorAssetData(editedAsset);
        onSaveAsset?.(editedAsset);
      } else if (mode === 'instance' && editedInstance) {
        validateVectorAssetInstanceData(editedInstance);
        onSaveInstance?.(editedInstance);
      }
      onClose(); // 保存後にモーダルを閉じる
    } catch (error) {
      alert(`保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const currentPos = getCurrentPosition(mode, editedAsset, editedInstance);
  const currentSize = getCurrentSize(mode, editedAsset, editedInstance);
  const currentOpacity = getCurrentOpacity(mode, editedAsset, editedInstance);
  const currentZIndex = getCurrentZIndex(mode, editedAsset, editedInstance);

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


  // リサイズハンドラー
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();

    calculateDynamicScale(); // リサイズ開始時にスケール計算

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

  const handleMouseMove = (e: MouseEvent) => {
    if (!project) return;

    if (isDragging) {
      const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y, dynamicScale);

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

      // スナップした位置を適用
      handlePositionChange('x', snapResult.snappedX);
      handlePositionChange('y', snapResult.snappedY);

      // ガイドラインを更新
      setSnapGuides(snapResult.snapGuides);
    } else if (isResizing && resizeHandle) {
      const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y, dynamicScale);

      // チェックボックスが有効な場合は元画像の縦横比を適用
      let finalResizeResult;
      if (aspectRatioLocked) {
        // 元画像の縦横比を維持
        const originalAspectRatio = asset.original_width / asset.original_height;

        // キャンバス制約なしでリサイズを計算
        let newWidth = dragStartValues.width;
        let newHeight = dragStartValues.height;
        let newX = dragStartValues.x;
        let newY = dragStartValues.y;

        if (resizeHandle.includes('right')) newWidth = Math.max(10, dragStartValues.width + deltaX);
        if (resizeHandle.includes('left')) {
          newWidth = Math.max(10, dragStartValues.width - deltaX);
          newX = dragStartValues.x + dragStartValues.width - newWidth;
        }
        if (resizeHandle.includes('bottom')) newHeight = Math.max(10, dragStartValues.height + deltaY);
        if (resizeHandle.includes('top')) {
          newHeight = Math.max(10, dragStartValues.height - deltaY);
          newY = dragStartValues.y + dragStartValues.height - newHeight;
        }

        const baseResult = { x: newX, y: newY, width: newWidth, height: newHeight };

        // 元画像の縦横比に基づいてサイズを調整
        let adjustedWidth = baseResult.width;
        let adjustedHeight = baseResult.height;
        let adjustedX = baseResult.x;
        let adjustedY = baseResult.y;

        if (resizeHandle.includes('right') || resizeHandle.includes('left')) {
          // 幅ベースで元画像の縦横比を維持
          adjustedHeight = adjustedWidth / originalAspectRatio;
          if (resizeHandle.includes('top')) {
            adjustedY = dragStartValues.y + dragStartValues.height - adjustedHeight;
          }
        } else {
          // 高さベースで元画像の縦横比を維持
          adjustedWidth = adjustedHeight * originalAspectRatio;
          if (resizeHandle.includes('left')) {
            adjustedX = dragStartValues.x + dragStartValues.width - adjustedWidth;
          }
        }

        finalResizeResult = { x: adjustedX, y: adjustedY, width: adjustedWidth, height: adjustedHeight };
      } else if (isShiftPressed && shiftAspectRatio !== null) {
        // Shiftキーが押されている場合は記録された縦横比を維持
        let newWidth = dragStartValues.width;
        let newHeight = dragStartValues.height;
        let newX = dragStartValues.x;
        let newY = dragStartValues.y;

        if (resizeHandle.includes('right')) newWidth = Math.max(10, dragStartValues.width + deltaX);
        if (resizeHandle.includes('left')) {
          newWidth = Math.max(10, dragStartValues.width - deltaX);
          newX = dragStartValues.x + dragStartValues.width - newWidth;
        }
        if (resizeHandle.includes('bottom')) newHeight = Math.max(10, dragStartValues.height + deltaY);
        if (resizeHandle.includes('top')) {
          newHeight = Math.max(10, dragStartValues.height - deltaY);
          newY = dragStartValues.y + dragStartValues.height - newHeight;
        }

        const baseResult = { x: newX, y: newY, width: newWidth, height: newHeight };

        // 記録された縦横比に基づいてサイズを調整
        let shiftWidth = baseResult.width;
        let shiftHeight = baseResult.height;
        let shiftX = baseResult.x;
        let shiftY = baseResult.y;

        if (resizeHandle.includes('right') || resizeHandle.includes('left')) {
          // 幅ベースで記録された縦横比を維持
          shiftHeight = shiftWidth / shiftAspectRatio;
          if (resizeHandle.includes('top')) {
            shiftY = dragStartValues.y + dragStartValues.height - shiftHeight;
          }
        } else {
          // 高さベースで記録された縦横比を維持
          shiftWidth = shiftHeight * shiftAspectRatio;
          if (resizeHandle.includes('left')) {
            shiftX = dragStartValues.x + dragStartValues.width - shiftWidth;
          }
        }

        finalResizeResult = { x: shiftX, y: shiftY, width: shiftWidth, height: shiftHeight };
      } else {
        // 自由リサイズ（キャンバス制約なし）
        let newWidth = dragStartValues.width;
        let newHeight = dragStartValues.height;
        let newX = dragStartValues.x;
        let newY = dragStartValues.y;

        if (resizeHandle.includes('right')) newWidth = Math.max(10, dragStartValues.width + deltaX);
        if (resizeHandle.includes('left')) {
          newWidth = Math.max(10, dragStartValues.width - deltaX);
          newX = dragStartValues.x + dragStartValues.width - newWidth;
        }
        if (resizeHandle.includes('bottom')) newHeight = Math.max(10, dragStartValues.height + deltaY);
        if (resizeHandle.includes('top')) {
          newHeight = Math.max(10, dragStartValues.height - deltaY);
          newY = dragStartValues.y + dragStartValues.height - newHeight;
        }

        finalResizeResult = { x: newX, y: newY, width: newWidth, height: newHeight };
      }

      handlePositionChange('x', finalResizeResult.x);
      handlePositionChange('y', finalResizeResult.y);

      // リサイズ時は両方のサイズを直接更新
      if (mode === 'asset') {
        setEditedAsset(prev => ({
          ...prev,
          default_width: finalResizeResult.width,
          default_height: finalResizeResult.height,
        }));
      } else if (editedInstance) {
        setEditedInstance(prev => prev ? {
          ...prev,
          override_width: finalResizeResult.width,
          override_height: finalResizeResult.height,
        } : null);
      }
    }
  };;

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    // スナップガイドラインをクリア
    setSnapGuides([]);
  };

  // マウスイベントのグローバルリスナー設定
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStartPos, dragStartValues, currentPos, currentSize, resizeHandle, dynamicScale]);

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
        {mode === 'asset' ? 'SVGアセット編集' : 'SVGインスタンス編集'}
        {mode === 'instance' && page && ` - ${page.title}`}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '70vh', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* 左側：プレビュー - 固定幅 */}
          <Box
            id="vec-edit-preview-container"
            sx={{
            width: 600,
            minWidth: 600,
            p: 0,
            backgroundColor: 'action.hover',
            borderRight: '1px solid',
            borderRightColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto', // スクロール可能に
          }}>
            {/* SVG描画領域（共通コンポーネント） */}
            <EditModalSvgCanvas
              ref={previewSvgRef}
              project={project}
              currentPos={currentPos}
              currentSize={currentSize}
              currentOpacity={currentOpacity}
              svgContent={asset.svg_content}
              originalWidth={asset.original_width}
              originalHeight={asset.original_height}
              onDragStart={(e) => {
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
            />
          </Box>


          {/* 右側：プロパティ編集 - スクロール可能 */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              プロパティ
            </Typography>

                {/* 基本情報 */}
                <Box sx={{ mb: 2 }}>
                  <ReadOnlyInput
                    label="アセット名"
                    value={asset.name}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <ReadOnlyInput
                    label="ファイルパス"
                    value={asset.original_file_path}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <ReadOnlyInput
                    label="元サイズ"
                    value={`${asset.original_width} × ${asset.original_height}`}
                  />
                </Box>

                {/* 位置 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>位置</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption">X (px)</Typography>
                      <NumericInput
                        value={currentPos.x}
                        onChange={(value) => handlePositionChange('x', value)}
                        onKeyDown={handleTextFieldKeyEvent}
                        step={1}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption">Y (px)</Typography>
                      <NumericInput
                        value={currentPos.y}
                        onChange={(value) => handlePositionChange('y', value)}
                        onKeyDown={handleTextFieldKeyEvent}
                        step={1}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* サイズ */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>サイズ</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption">幅 (px)</Typography>
                      <NumericInput
                        value={currentSize.width}
                        onChange={(value) => handleSizeChange('width', value)}
                        onKeyDown={handleTextFieldKeyEvent}
                        min={1}
                        step={1}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption">高さ (px)</Typography>
                      <NumericInput
                        value={currentSize.height}
                        onChange={(value) => handleSizeChange('height', value)}
                        onKeyDown={handleTextFieldKeyEvent}
                        min={1}
                        step={1}
                      />
                    </Box>
                  </Box>
                  {/* 縦横比チェックボックス */}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={aspectRatioLocked}
                        onChange={(e) => setAspectRatioLocked(e.target.checked)}
                        size="small"
                      />
                    }
                    label="縦横比を元画像にあわせる"
                    sx={{ mt: 1 }}
                  />
                </Box>

                {/* 不透明度 */}
                <Box sx={{ mb: 2 }}>
                  <OpacityInput
                    value={currentOpacity}
                    onChange={handleOpacityChange}
                    label={mode === 'asset' ? 'Default Opacity' : 'Opacity'}
                  />
                </Box>

                {/* Z-Index */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Z-Index</Typography>
                  <ZIndexInput
                    value={currentZIndex}
                    onChange={handleZIndexChange}
                    validation={zIndexValidation}
                  />
                </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          キャンセル
        </Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};
