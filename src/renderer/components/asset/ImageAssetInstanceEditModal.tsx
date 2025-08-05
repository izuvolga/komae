import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { ImageAsset, ImageAssetInstance, Page } from '../../../types/entities';
import './ImageAssetEditModal.css';

interface ImageAssetInstanceEditModalProps {
  assetInstance: ImageAssetInstance;
  asset: ImageAsset;
  page: Page;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedInstance: ImageAssetInstance) => void;
}

export const ImageAssetInstanceEditModal: React.FC<ImageAssetInstanceEditModalProps> = ({
  assetInstance,
  asset,
  page,
  isOpen,
  onClose,
  onSave,
}) => {
  const project = useProjectStore((state) => state.project);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  const [editedInstance, setEditedInstance] = useState<ImageAssetInstance>(assetInstance);

  useEffect(() => {
    setEditedInstance(assetInstance);
  }, [assetInstance]);

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedInstance);
    onClose();
  };

  const handleInputChange = (field: keyof ImageAssetInstance, value: any) => {
    setEditedInstance(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 現在の位置とサイズを取得（オーバーライドまたはデフォルト値）
  const getCurrentPosition = () => ({
    x: editedInstance.override_pos_x ?? asset.default_pos_x,
    y: editedInstance.override_pos_y ?? asset.default_pos_y,
  });

  const getCurrentSize = () => ({
    width: asset.default_width * editedInstance.transform.scale_x,
    height: asset.default_height * editedInstance.transform.scale_y,
  });

  const currentPos = getCurrentPosition();
  const currentSize = getCurrentSize();

  const imagePath = currentProjectPath 
    ? `komae-asset://${encodeURIComponent(currentProjectPath)}/${encodeURIComponent(asset.id)}`
    : asset.original_file_path;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="image-asset-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ImageAssetInstance 編集: {asset.name}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="edit-layout">
            {/* 左側: プレビューエリア */}
            <div className="preview-section">
              <h3>プレビュー</h3>
              <div className="image-preview-container">
                <div className="canvas-frame" style={{ position: 'relative', width: '280px', height: '210px' }}>
                  <img
                    src={imagePath}
                    alt={asset.name}
                    style={{
                      position: 'absolute',
                      left: `${currentPos.x * 0.35}px`, // スケール調整
                      top: `${currentPos.y * 0.35}px`,
                      width: `${currentSize.width * 0.35}px`,
                      height: `${currentSize.height * 0.35}px`,
                      opacity: editedInstance.opacity,
                      transform: `rotate(${editedInstance.transform.rotation}deg)`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 右側: パラメータ編集エリア */}
            <div className="params-section">
              <div className="param-group">
                <h4>基本情報</h4>
                <div className="param-row">
                  <label>Z-Index:</label>
                  <input
                    type="number"
                    value={editedInstance.z_index}
                    onChange={(e) => handleInputChange('z_index', parseInt(e.target.value))}
                  />
                </div>
                <div className="param-row">
                  <label>透明度:</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={editedInstance.opacity}
                    onChange={(e) => handleInputChange('opacity', parseFloat(e.target.value))}
                  />
                  <span>{editedInstance.opacity.toFixed(2)}</span>
                </div>
                <div className="param-row">
                  <label>回転角度:</label>
                  <input
                    type="number"
                    value={editedInstance.transform.rotation}
                    onChange={(e) => handleInputChange('transform', {
                      ...editedInstance.transform,
                      rotation: parseFloat(e.target.value)
                    })}
                  />
                  <span>度</span>
                </div>
              </div>

              <div className="param-group">
                <h4>位置</h4>
                <div className="param-row">
                  <label>X:</label>
                  <input
                    type="number"
                    value={currentPos.x}
                    onChange={(e) => {
                      setEditedInstance(prev => ({
                        ...prev,
                        override_pos_x: parseFloat(e.target.value),
                      }));
                    }}
                  />
                </div>
                <div className="param-row">
                  <label>Y:</label>
                  <input
                    type="number"
                    value={currentPos.y}
                    onChange={(e) => {
                      setEditedInstance(prev => ({
                        ...prev,
                        override_pos_y: parseFloat(e.target.value),
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="param-group">
                <h4>サイズ</h4>
                <div className="param-row">
                  <label>幅:</label>
                  <input
                    type="number"
                    value={Math.round(currentSize.width)}
                    onChange={(e) => {
                      const newWidth = parseFloat(e.target.value);
                      const scaleX = newWidth / asset.default_width;
                      setEditedInstance(prev => ({
                        ...prev,
                        transform: {
                          ...prev.transform,
                          scale_x: scaleX,
                        }
                      }));
                    }}
                  />
                </div>
                <div className="param-row">
                  <label>高さ:</label>
                  <input
                    type="number"
                    value={Math.round(currentSize.height)}
                    onChange={(e) => {
                      const newHeight = parseFloat(e.target.value);
                      const scaleY = newHeight / asset.default_height;
                      setEditedInstance(prev => ({
                        ...prev,
                        transform: {
                          ...prev.transform,
                          scale_y: scaleY,
                        }
                      }));
                    }}
                  />
                </div>
              </div>
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