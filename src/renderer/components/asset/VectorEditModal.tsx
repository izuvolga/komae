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
  Grid,
  Paper,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { NumericInput } from '../common/NumericInput';
import { ZIndexInput } from '../common/ZIndexInput';
import { OpacityInput } from '../common/OpacityInput';
import { ReadOnlyInput } from '../common/ReadOnlyInput';
import type { VectorAsset, VectorAssetInstance, Page } from '../../../types/entities';
import { getEffectiveZIndex, validateVectorAssetData, validateVectorAssetInstanceData } from '../../../types/entities';
import { 
  generateResizeHandles, 
  convertMouseDelta, 
  constrainToCanvas, 
  EDIT_MODAL_SCALE,
  getCurrentPosition,
  getCurrentSize,
  getCurrentOpacity,
  getCurrentZIndex,
  wrapSVGWithParentContainer,
  validateZIndexNumber,
  ZIndexValidationResult,
  calculateResizeValues,
  ResizeCalculationParams
} from '../../utils/editModalUtils';

// 編集モードの種類
type EditMode = 'asset' | 'instance';

// 統合されたプロパティ
interface VectorEditModalProps {
  mode: EditMode;
  asset: VectorAsset;
  assetInstance?: VectorAssetInstance;
  page?: Page;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsset?: (updatedAsset: VectorAsset) => void;
  onSaveInstance?: (updatedInstance: VectorAssetInstance) => void;
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
  const project = useProjectStore((state) => state.project);

  // 編集中のデータ（モードに応じて切り替え）
  const [editedAsset, setEditedAsset] = useState<VectorAsset>(asset);
  const [editedInstance, setEditedInstance] = useState<VectorAssetInstance | null>(
    assetInstance || null
  );

  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
  const [zIndexValidation, setZIndexValidation] = useState<ZIndexValidationResult>({ isValid: true });

  // マウス操作関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartValues, setDragStartValues] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  useEffect(() => {
    setEditedAsset(asset);
    setEditedInstance(assetInstance || null);
  }, [asset, assetInstance]);

  if (!isOpen || !project) return null;

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
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        [`default_${field}`]: value,
      }));
    } else if (editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        [`override_${field}`]: value,
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

  // SVGを親SVG要素でラップして位置・サイズ・不透明度を制御 - 共通ユーティリティを使用

  // ドラッグ操作ハンドラー
  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({
      x: currentPos.x,
      y: currentPos.y,
      width: currentSize.width,
      height: currentSize.height
    });
  };

  // リサイズハンドラー
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
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

  const handleMouseMove = (e: MouseEvent) => {
    if (!project) return;
    
    if (isDragging) {
      const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y);
      const currentSizeForDrag = getCurrentSize(mode, editedAsset, editedInstance);
      
      const constrained = constrainToCanvas(
        dragStartValues.x + deltaX,
        dragStartValues.y + deltaY,
        currentSizeForDrag.width,
        currentSizeForDrag.height,
        project.canvas.width,
        project.canvas.height
      );
      
      handlePositionChange('x', constrained.x);
      handlePositionChange('y', constrained.y);
    } else if (isResizing && resizeHandle) {
      const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y);
      
      const resizeResult = calculateResizeValues({
        deltaX,
        deltaY,
        dragStartValues,
        resizeHandle,
        canvasWidth: project.canvas.width,
        canvasHeight: project.canvas.height,
        minSize: 10
      });

      handlePositionChange('x', resizeResult.x);
      handlePositionChange('y', resizeResult.y);
      handleSizeChange('width', resizeResult.width);
      handleSizeChange('height', resizeResult.height);
    }
  };;

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
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
  }, [isDragging, isResizing, dragStartPos, dragStartValues, currentPos, currentSize, resizeHandle]);

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
          <Box sx={{
            width: 400,
            minWidth: 400,
            p: 2,
            backgroundColor: '#f8f9fa',
            borderRight: '1px solid #e9ecef',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
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
                  {/* SVG描画結果 */}
                  <svg
                    width='100%'
                    height='100%'
                    viewBox={`0 0 ${project.canvas.width} ${project.canvas.height}`}
                    xmlns="http://www.w3.org/2000/svg"
                    dangerouslySetInnerHTML={{ __html: `${wrapSVGWithParentContainer(
                      asset.svg_content,
                      currentPos.x,
                      currentPos.y,
                      currentSize.width,
                      currentSize.height,
                      currentOpacity,
                      asset.original_width,
                      asset.original_height)}` }}
                    />

                  {/* インタラクション用の透明な要素（ドラッグエリア） */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${currentPos.x * EDIT_MODAL_SCALE}px`,
                      top: `${currentPos.y * EDIT_MODAL_SCALE}px`,
                      width: `${currentSize.width * EDIT_MODAL_SCALE}px`,
                      height: `${currentSize.height * EDIT_MODAL_SCALE}px`,
                      backgroundColor: 'transparent',
                      border: '1px dashed #007acc',
                      cursor: 'move',
                      zIndex: 2,
                      pointerEvents: 'all',
                    }}
                    onMouseDown={handlePreviewMouseDown}
                  />

                  {/* SVGベースのリサイズハンドル */}
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
                    {generateResizeHandles(currentPos, currentSize, handleResizeMouseDown)}
                  </svg>
                </div>
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
                        step={1}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption">Y (px)</Typography>
                      <NumericInput
                        value={currentPos.y}
                        onChange={(value) => handlePositionChange('y', value)}
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
                        min={1}
                        step={1}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption">高さ (px)</Typography>
                      <NumericInput
                        value={currentSize.height}
                        onChange={(value) => handleSizeChange('height', value)}
                        min={1}
                        step={1}
                      />
                    </Box>
                  </Box>
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
