import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { ImageAsset } from '../../../types/entities';
import './ImageAssetEditModal.css';

interface ImageAssetEditModalProps {
  asset: ImageAsset;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAsset: ImageAsset) => void;
}

export const ImageAssetEditModal: React.FC<ImageAssetEditModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSave,
}) => {
  const project = useProjectStore((state) => state.project);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  const [editedAsset, setEditedAsset] = useState<ImageAsset>(asset);

  useEffect(() => {
    setEditedAsset(asset);
  }, [asset]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedAsset);
    onClose();
  };

  const handleInputChange = (field: keyof ImageAsset, value: any) => {
    setEditedAsset(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMaskChange = (index: number, value: number) => {
    const newMask = [...editedAsset.default_mask] as [number, number, number, number];
    newMask[index] = value;
    setEditedAsset(prev => ({
      ...prev,
      default_mask: newMask
    }));
  };

  // 絶対パスを生成する関数
  const getAbsoluteImagePath = (relativePath: string): string => {
    if (!currentProjectPath) {
      return relativePath;
    }
    return `${currentProjectPath}/${relativePath}`;
  };

  // プレビュー表示用のスケールを計算する関数（キャンバス用）
  const calculateCanvasPreviewScale = () => {
    if (!project) return 1/3;
    return 1/3; // 800x600を1/3に固定
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="image-asset-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ImageAsset 編集 - {asset.name}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          <div className="edit-layout">
            {/* 左側：Image Preview */}
            <div className="preview-section">
              <div className="image-preview-container">
                <div 
                  className="canvas-frame"
                  style={{
                    width: project.canvas.width * calculateCanvasPreviewScale(),
                    height: project.canvas.height * calculateCanvasPreviewScale(),
                    position: 'relative',
                    border: '1px solid #ccc',
                    backgroundColor: '#f8f9fa',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={`komae-asset://${getAbsoluteImagePath(editedAsset.original_file_path)}`}
                    alt={editedAsset.name}
                    style={{
                      position: 'absolute',
                      left: (editedAsset.default_pos_x * calculateCanvasPreviewScale()),
                      top: (editedAsset.default_pos_y * calculateCanvasPreviewScale()),
                      width: (editedAsset.default_width * calculateCanvasPreviewScale()),
                      height: (editedAsset.default_height * calculateCanvasPreviewScale()),
                      opacity: editedAsset.default_opacity
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 右側：Parameters */}
            <div className="parameters-section">
              {/* Asset Name */}
              <div className="parameter-group">
                <label>アセット名</label>
                <input
                  type="text"
                  value={editedAsset.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="parameter-input"
                />
              </div>

              {/* Default Position */}
              <div className="parameter-group">
                <label>Default Position</label>
                <div className="position-inputs">
                  <div className="input-with-label">
                    <label>X:</label>
                    <input
                      type="number"
                      value={editedAsset.default_pos_x}
                      onChange={(e) => handleInputChange('default_pos_x', parseInt(e.target.value) || 0)}
                      className="parameter-input small"
                    />
                  </div>
                  <div className="input-with-label">
                    <label>Y:</label>
                    <input
                      type="number"
                      value={editedAsset.default_pos_y}
                      onChange={(e) => handleInputChange('default_pos_y', parseInt(e.target.value) || 0)}
                      className="parameter-input small"
                    />
                  </div>
                </div>
              </div>

              {/* Original Size (read-only) */}
              <div className="parameter-group">
                <label>Original Size</label>
                <div className="position-inputs">
                  <div className="input-with-label">
                    <label>W:</label>
                    <input
                      type="number"
                      value={editedAsset.original_width}
                      readOnly
                      className="parameter-input small readonly"
                    />
                  </div>
                  <div className="input-with-label">
                    <label>H:</label>
                    <input
                      type="number"
                      value={editedAsset.original_height}
                      readOnly
                      className="parameter-input small readonly"
                    />
                  </div>
                </div>
              </div>

              {/* Default Size (editable) */}
              <div className="parameter-group">
                <label>Default Size</label>
                <div className="position-inputs">
                  <div className="input-with-label">
                    <label>W:</label>
                    <input
                      type="number"
                      value={editedAsset.default_width}
                      onChange={(e) => handleInputChange('default_width', parseInt(e.target.value) || 0)}
                      className="parameter-input small"
                    />
                  </div>
                  <div className="input-with-label">
                    <label>H:</label>
                    <input
                      type="number"
                      value={editedAsset.default_height}
                      onChange={(e) => handleInputChange('default_height', parseInt(e.target.value) || 0)}
                      className="parameter-input small"
                    />
                  </div>
                </div>
              </div>

              {/* Default Opacity */}
              <div className="parameter-group">
                <label>Default Opacity</label>
                <div className="opacity-control">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={editedAsset.default_opacity}
                    onChange={(e) => handleInputChange('default_opacity', parseFloat(e.target.value))}
                    className="opacity-slider"
                  />
                  <span className="opacity-value">{editedAsset.default_opacity.toFixed(1)}</span>
                </div>
              </div>

              {/* Default Mask */}
              <div className="parameter-group">
                <label>Default Mask</label>
                <div className="mask-inputs">
                  <div className="mask-row">
                    <div className="input-with-label">
                      <label>Left:</label>
                      <input
                        type="number"
                        value={editedAsset.default_mask[0]}
                        onChange={(e) => handleMaskChange(0, parseInt(e.target.value) || 0)}
                        className="parameter-input small"
                      />
                    </div>
                    <div className="input-with-label">
                      <label>Top:</label>
                      <input
                        type="number"
                        value={editedAsset.default_mask[1]}
                        onChange={(e) => handleMaskChange(1, parseInt(e.target.value) || 0)}
                        className="parameter-input small"
                      />
                    </div>
                  </div>
                  <div className="mask-row">
                    <div className="input-with-label">
                      <label>Right:</label>
                      <input
                        type="number"
                        value={editedAsset.default_mask[2]}
                        onChange={(e) => handleMaskChange(2, parseInt(e.target.value) || 0)}
                        className="parameter-input small"
                      />
                    </div>
                    <div className="input-with-label">
                      <label>Bottom:</label>
                      <input
                        type="number"
                        value={editedAsset.default_mask[3]}
                        onChange={(e) => handleMaskChange(3, parseInt(e.target.value) || 0)}
                        className="parameter-input small"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
