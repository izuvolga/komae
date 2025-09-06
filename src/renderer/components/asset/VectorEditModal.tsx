import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { NumericInput } from '../common/NumericInput';
import type { VectorAsset, VectorAssetInstance, Page } from '../../../types/entities';
import { getEffectiveZIndex, validateVectorAssetData, validateVectorAssetInstanceData } from '../../../types/entities';
import './VectorEditModal.css';

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
  const [zIndexValidation, setZIndexValidation] = useState<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>({ isValid: true });

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

  // 現在の値を取得（Asset vs Instance）
  const getCurrentPosition = () => {
    if (mode === 'instance' && editedInstance) {
      return {
        x: editedInstance.override_pos_x ?? asset.default_pos_x,
        y: editedInstance.override_pos_y ?? asset.default_pos_y,
      };
    }
    return { x: editedAsset.default_pos_x, y: editedAsset.default_pos_y };
  };

  const getCurrentSize = () => {
    if (mode === 'instance' && editedInstance) {
      return {
        width: editedInstance.override_width ?? asset.default_width,
        height: editedInstance.override_height ?? asset.default_height,
      };
    }
    return { width: editedAsset.default_width, height: editedAsset.default_height };
  };

  const getCurrentOpacity = () => {
    if (mode === 'instance' && editedInstance) {
      return editedInstance.override_opacity ?? asset.default_opacity;
    }
    return editedAsset.default_opacity;
  };

  const getCurrentZIndex = () => {
    if (mode === 'instance' && editedInstance) {
      return editedInstance.override_z_index ?? asset.default_z_index;
    }
    return editedAsset.default_z_index;
  };

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
    if (!project || !page) {
      setZIndexValidation({ isValid: true });
      return;
    }

    // 同じページの他のアセットインスタンスとの重複チェック
    const otherInstances = Object.values(page.asset_instances)
      .filter(inst => inst.id !== editedInstance?.id);

    const conflicts = otherInstances.filter(inst => {
      const otherAsset = project.assets[inst.asset_id];
      if (!otherAsset) return false;

      const effectiveZIndex = getEffectiveZIndex(otherAsset, inst);
      return effectiveZIndex === zIndex;
    });

    if (conflicts.length > 0) {
      const conflictNames = conflicts.map(inst => project.assets[inst.asset_id]?.name).join(', ');
      setZIndexValidation({
        isValid: true,
        warning: `Z-Index ${zIndex} は他のアセット (${conflictNames}) と重複しています`
      });
    } else {
      setZIndexValidation({ isValid: true });
    }
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

  const currentPos = getCurrentPosition();
  const currentSize = getCurrentSize();
  const currentOpacity = getCurrentOpacity();
  const currentZIndex = getCurrentZIndex();

  // TODO: DynamicVectorEditModal にも同様の処理があるので共通化を検討
  // SVGを親SVG要素でラップして位置・サイズ・不透明度を制御
  const wrapSVGWithParentContainer = (svgContent: string, x: number, y: number, width: number, height: number, opacity: number): string => {
    const originalWidth = asset.original_width;
    const originalHeight = asset.original_height;
    const scaleX = width / originalWidth;
    const scaleY = height / originalHeight;
    // SVG 内部での X, Y 座標は scale 処理を考慮して調整
    const adjustedX = x * (1 / scaleX);
    const adjustedY = y * (1 / scaleY);

    return `<svg version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      x="${adjustedX}px"
      y="${adjustedY}px"
      width="${originalWidth}px"
      height="${originalHeight}px"
      transform="scale(${width / originalWidth}, ${height / originalHeight})"
      style="opacity: ${opacity};">
        ${svgContent}
    </svg>`;
  };

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
    if (isDragging) {
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      // キャンバス比率に合わせたスケール計算
      const canvasWidth = Math.min(300, 300 * (project?.canvas.width || 800) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600));
      const canvasHeight = Math.min(300, 300 * (project?.canvas.height || 600) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600));
      const scaleX = canvasWidth / (project?.canvas.width || 800);
      const scaleY = canvasHeight / (project?.canvas.height || 600);

      // 位置変更
      const newX = dragStartValues.x + deltaX / scaleX;
      const newY = dragStartValues.y + deltaY / scaleY;

      handlePositionChange('x', newX);
      handlePositionChange('y', newY);
    } else if (isResizing && resizeHandle) {
      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      // キャンバス比率に合わせたスケール計算
      const canvasWidth = Math.min(300, 300 * (project?.canvas.width || 800) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600));
      const canvasHeight = Math.min(300, 300 * (project?.canvas.height || 600) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600));
      const scaleX = canvasWidth / (project?.canvas.width || 800);
      const scaleY = canvasHeight / (project?.canvas.height || 600);

      let newWidth = dragStartValues.width;
      let newHeight = dragStartValues.height;
      let newX = dragStartValues.x;
      let newY = dragStartValues.y;

      switch (resizeHandle) {
        case 'top-left':
          newWidth = Math.max(10, dragStartValues.width - deltaX / scaleX);
          newHeight = Math.max(10, dragStartValues.height - deltaY / scaleY);
          newX = dragStartValues.x + (dragStartValues.width - newWidth);
          newY = dragStartValues.y + (dragStartValues.height - newHeight);
          break;
        case 'top-right':
          newWidth = Math.max(10, dragStartValues.width + deltaX / scaleX);
          newHeight = Math.max(10, dragStartValues.height - deltaY / scaleY);
          newY = dragStartValues.y + (dragStartValues.height - newHeight);
          break;
        case 'bottom-left':
          newWidth = Math.max(10, dragStartValues.width - deltaX / scaleX);
          newHeight = Math.max(10, dragStartValues.height + deltaY / scaleY);
          newX = dragStartValues.x + (dragStartValues.width - newWidth);
          break;
        case 'bottom-right':
          newWidth = Math.max(10, dragStartValues.width + deltaX / scaleX);
          newHeight = Math.max(10, dragStartValues.height + deltaY / scaleY);
          break;
      }

      handlePositionChange('x', newX);
      handlePositionChange('y', newY);
      handleSizeChange('width', newWidth);
      handleSizeChange('height', newHeight);
    }
  };

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
    <div className="modal-overlay">
      <div className="vector-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mode === 'asset' ? 'SVGアセット編集' : 'SVGインスタンス編集'}
            {mode === 'instance' && page && ` - ${page.title}`}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="edit-panels">
            {/* 左側：プレビュー */}
            <div className="preview-panel">
              <div className="canvas-preview">
                {/* キャンバス比率のプレビュー領域 */}
                <div
                  className="canvas-container"
                  style={{
                    position: 'relative',
                    width: Math.min(300, 300 * (project?.canvas.width || 800) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600)),
                    height: Math.min(300, 300 * (project?.canvas.height || 600) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600)),
                    border: '2px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    overflow: 'visible',
                  }}
                >
                  {/* キャンバス背景 */}
                  <div
                    className="canvas-background"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                    }}
                  />

                  {/* SVGアセットプレビュー */}
                  <div
                    className="svg-asset-preview"
                    style={{
                      position: 'absolute',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      userSelect: 'none',
                      transformOrigin: 'top left',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                    }}
                    onMouseDown={handlePreviewMouseDown}
                  >
                    {/* キャンバスサイズに合わせたSVG表示 */}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: `<svg width="100%" height="100%" viewBox="0 0 ${project?.canvas.width || 800} ${project?.canvas.height || 600}" xmlns="http://www.w3.org/2000/svg">
                          ${wrapSVGWithParentContainer(asset.svg_content, currentPos.x, currentPos.y, currentSize.width, currentSize.height, currentOpacity)}
                        </svg>`
                      }}
                    />
                  </div>

                  {/* アセットのリサイズハンドル */}
                  {(() => {
                    const canvasWidth = Math.min(300, 300 * (project?.canvas.width || 800) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600));
                    const canvasHeight = Math.min(300, 300 * (project?.canvas.height || 600) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600));
                    const scaleX = canvasWidth / (project?.canvas.width || 800);
                    const scaleY = canvasHeight / (project?.canvas.height || 600);
                    const handleSize = 8;

                    return ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(handle => {
                      let x = 0;
                      let y = 0;
                      let cursor = 'nw-resize';

                      switch (handle) {
                        case 'top-left':
                          x = currentPos.x * scaleX - handleSize / 2;
                          y = currentPos.y * scaleY - handleSize / 2;
                          cursor = 'nw-resize';
                          break;
                        case 'top-right':
                          x = (currentPos.x + currentSize.width) * scaleX - handleSize / 2;
                          y = currentPos.y * scaleY - handleSize / 2;
                          cursor = 'ne-resize';
                          break;
                        case 'bottom-left':
                          x = currentPos.x * scaleX - handleSize / 2;
                          y = (currentPos.y + currentSize.height) * scaleY - handleSize / 2;
                          cursor = 'sw-resize';
                          break;
                        case 'bottom-right':
                          x = (currentPos.x + currentSize.width) * scaleX - handleSize / 2;
                          y = (currentPos.y + currentSize.height) * scaleY - handleSize / 2;
                          cursor = 'se-resize';
                          break;
                      }

                      return (
                        <div
                          key={handle}
                          style={{
                            position: 'absolute',
                            left: `${x}px`,
                            top: `${y}px`,
                            width: `${handleSize}px`,
                            height: `${handleSize}px`,
                            backgroundColor: '#3b82f6',
                            cursor: cursor,
                            zIndex: 10,
                            border: '1px solid #ffffff',
                            borderRadius: '2px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          }}
                          onMouseDown={(e) => handleResizeMouseDown(e, handle)}
                        />
                      );
                    });
                  })()
                  }
                </div>
              </div>
            </div>

            {/* 右側：プロパティ編集 */}
            <div className="properties-panel">
              <h3>プロパティ</h3>

              {/* 基本情報 */}
              <div className="property-group">
                <label>アセット名</label>
                <input
                  type="text"
                  value={asset.name}
                  readOnly
                  className="readonly-input"
                />
              </div>

              <div className="property-group">
                <label>ファイルパス</label>
                <input
                  type="text"
                  value={asset.original_file_path}
                  readOnly
                  className="readonly-input"
                />
              </div>

              <div className="property-group">
                <label>元サイズ</label>
                <div className="size-display">
                  {asset.original_width} × {asset.original_height}
                </div>
              </div>

              {/* 位置 */}
              <div className="property-group">
                <label>位置</label>
                <div className="position-inputs">
                  <div className="input-with-label">
                    <label>X (px)</label>
                    <NumericInput
                      value={currentPos.x}
                      onChange={(value) => handlePositionChange('x', value)}
                      step={1}
                    />
                  </div>
                  <div className="input-with-label">
                    <label>Y (px)</label>
                    <NumericInput
                      value={currentPos.y}
                      onChange={(value) => handlePositionChange('y', value)}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              {/* サイズ */}
              <div className="property-group">
                <label>サイズ</label>
                <div className="size-inputs">
                  <div className="input-with-label">
                    <label>幅 (px)</label>
                    <NumericInput
                      value={currentSize.width}
                      onChange={(value) => handleSizeChange('width', value)}
                      min={1}
                      step={1}
                    />
                  </div>
                  <div className="input-with-label">
                    <label>高さ (px)</label>
                    <NumericInput
                      value={currentSize.height}
                      onChange={(value) => handleSizeChange('height', value)}
                      min={1}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              {/* 不透明度 */}
              <div className="property-group">
                <div className="opacity-section">
                  <span>{mode === 'asset' ? 'Default Opacity' : 'Opacity'}</span>
                  <div className="opacity-controls">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={currentOpacity}
                      onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                      className="opacity-slider"
                    />
                    <span className="opacity-value">{currentOpacity.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Z-Index */}
              <div className="property-group">
                <label>Z-Index</label>
                <NumericInput
                  value={currentZIndex}
                  onChange={handleZIndexChange}
                  step={1}
                />
                {zIndexValidation.warning && (
                  <div className="validation-warning">
                    ⚠️ {zIndexValidation.warning}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
