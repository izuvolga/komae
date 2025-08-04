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
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  // 一時的な入力値を保持（空文字列対応のため）
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});

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

  // 数値フィールドの入力変更処理（一時的に文字列を保持）
  const handleNumericInputChange = (field: keyof ImageAsset, value: string) => {
    setTempInputValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 数値フィールドのフォーカスアウト処理（数値に変換してAssetに反映）
  const handleNumericInputBlur = (field: keyof ImageAsset, value: string) => {
    const numericValue = value === '' ? 0 : (parseInt(value) || 0);
    setEditedAsset(prev => ({
      ...prev,
      [field]: numericValue
    }));
    // 一時的な値をクリア
    setTempInputValues(prev => {
      const newTemp = { ...prev };
      delete newTemp[field];
      return newTemp;
    });
  };

  // 縦横比固定での サイズ変更処理
  const handleSizeChange = (field: 'default_width' | 'default_height', value: string) => {
    if (!aspectRatioLocked) {
      // 縦横比固定が無効の場合は通常の変更
      handleNumericInputChange(field, value);
      return;
    }

    // 縦横比固定が有効の場合
    if (value === '') {
      // 空白の場合は一時的に保持
      handleNumericInputChange(field, value);
    } else {
      // 数値が入力された場合は自動調整（最小値1を保証）
      const numericValue = Math.max(1, parseInt(value) || 1);
      const originalAspectRatio = editedAsset.original_width / editedAsset.original_height;
      
      if (field === 'default_width') {
        // 幅が変更された場合、高さを自動調整
        const newHeight = Math.max(1, Math.round(numericValue / originalAspectRatio));
        setEditedAsset(prev => ({
          ...prev,
          default_width: numericValue,
          default_height: newHeight
        }));
        // 両方の一時的な値をクリア
        setTempInputValues(prev => {
          const newTemp = { ...prev };
          delete newTemp['default_width'];
          delete newTemp['default_height'];
          return newTemp;
        });
      } else {
        // 高さが変更された場合、幅を自動調整
        const newWidth = Math.max(1, Math.round(numericValue * originalAspectRatio));
        setEditedAsset(prev => ({
          ...prev,
          default_width: newWidth,
          default_height: numericValue
        }));
        // 両方の一時的な値をクリア
        setTempInputValues(prev => {
          const newTemp = { ...prev };
          delete newTemp['default_width'];
          delete newTemp['default_height'];
          return newTemp;
        });
      }
    }
  };

  // 縦横比固定でのサイズフィールドのフォーカスアウト処理
  const handleSizeBlur = (field: 'default_width' | 'default_height', value: string) => {
    // サイズフィールドは最小値1を保証
    const numericValue = Math.max(1, value === '' ? 1 : (parseInt(value) || 1));
    
    if (!aspectRatioLocked) {
      // 縦横比固定が無効の場合は通常のblur処理だが、最小値1を保証
      setEditedAsset(prev => ({
        ...prev,
        [field]: numericValue
      }));
      // 一時的な値をクリア
      setTempInputValues(prev => {
        const newTemp = { ...prev };
        delete newTemp[field];
        return newTemp;
      });
      return;
    }

    // 縦横比固定が有効の場合
    const originalAspectRatio = editedAsset.original_width / editedAsset.original_height;
    
    if (field === 'default_width') {
      const newHeight = Math.max(1, Math.round(numericValue / originalAspectRatio));
      setEditedAsset(prev => ({
        ...prev,
        default_width: numericValue,
        default_height: newHeight
      }));
    } else {
      const newWidth = Math.max(1, Math.round(numericValue * originalAspectRatio));
      setEditedAsset(prev => ({
        ...prev,
        default_width: newWidth,
        default_height: numericValue
      }));
    }
  };

  const handleMaskChange = (pointIndex: number, coordIndex: number, value: string) => {
    setTempInputValues(prev => ({
      ...prev,
      [`mask_${pointIndex}_${coordIndex}`]: value
    }));
  };

  const handleMaskBlur = (pointIndex: number, coordIndex: number, value: string) => {
    const numericValue = value === '' ? 0 : (parseInt(value) || 0);
    const newMask = editedAsset.default_mask.map((point, i) => 
      i === pointIndex ? 
        point.map((coord, j) => j === coordIndex ? numericValue : coord) as [number, number] :
        point
    ) as [[number, number], [number, number], [number, number], [number, number]];
    
    setEditedAsset(prev => ({
      ...prev,
      default_mask: newMask
    }));
    // 一時的な値をクリア
    setTempInputValues(prev => {
      const newTemp = { ...prev };
      delete newTemp[`mask_${pointIndex}_${coordIndex}`];
      return newTemp;
    });
  };

  // 表示用の値を取得する関数（一時的な値があればそれを、なければAssetの値を使用）
  const getDisplayValue = (field: keyof ImageAsset): string | number => {
    if (tempInputValues[field] !== undefined) {
      return tempInputValues[field];
    }
    return editedAsset[field] as string | number;
  };

  // マスク値の表示用の値を取得
  const getMaskDisplayValue = (pointIndex: number, coordIndex: number): string | number => {
    const tempKey = `mask_${pointIndex}_${coordIndex}`;
    if (tempInputValues[tempKey] !== undefined) {
      return tempInputValues[tempKey];
    }
    return editedAsset.default_mask[pointIndex][coordIndex];
  };

  // プレビュー用の数値を取得（一時的な値も数値として扱う）
  const getPreviewValue = (field: keyof ImageAsset): number => {
    if (tempInputValues[field] !== undefined) {
      const tempValue = tempInputValues[field];
      const numericValue = tempValue === '' ? 0 : (parseInt(tempValue) || 0);
      
      // サイズフィールドは最小値1を保証
      if (field === 'default_width' || field === 'default_height') {
        return Math.max(1, numericValue);
      }
      
      return numericValue;
    }
    return editedAsset[field] as number;
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
                      left: (getPreviewValue('default_pos_x') * calculateCanvasPreviewScale()),
                      top: (getPreviewValue('default_pos_y') * calculateCanvasPreviewScale()),
                      width: (getPreviewValue('default_width') * calculateCanvasPreviewScale()),
                      height: (getPreviewValue('default_height') * calculateCanvasPreviewScale()),
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
                      value={getDisplayValue('default_pos_x')}
                      onChange={(e) => handleNumericInputChange('default_pos_x', e.target.value)}
                      onBlur={(e) => handleNumericInputBlur('default_pos_x', e.target.value)}
                      className="parameter-input small"
                    />
                  </div>
                  <div className="input-with-label">
                    <label>Y:</label>
                    <input
                      type="number"
                      value={getDisplayValue('default_pos_y')}
                      onChange={(e) => handleNumericInputChange('default_pos_y', e.target.value)}
                      onBlur={(e) => handleNumericInputBlur('default_pos_y', e.target.value)}
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
                
                {/* 縦横比固定オプション */}
                <div className="aspect-ratio-control">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={aspectRatioLocked}
                      onChange={(e) => setAspectRatioLocked(e.target.checked)}
                      className="aspect-ratio-checkbox"
                    />
                    <span className="checkmark"> </span>
                    <span>元画像の縦横比を保持</span>
                  </label>
                </div>
                
                <div className="position-inputs">
                  <div className="input-with-label">
                    <label>W:</label>
                    <input
                      type="number"
                      min="1"
                      value={getDisplayValue('default_width')}
                      onChange={(e) => handleSizeChange('default_width', e.target.value)}
                      onBlur={(e) => handleSizeBlur('default_width', e.target.value)}
                      className="parameter-input small"
                    />
                  </div>
                  <div className="input-with-label">
                    <label>H:</label>
                    <input
                      type="number"
                      min="1"
                      value={getDisplayValue('default_height')}
                      onChange={(e) => handleSizeChange('default_height', e.target.value)}
                      onBlur={(e) => handleSizeBlur('default_height', e.target.value)}
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
                <label>Default Mask (4点座標)</label>
                <div className="mask-inputs">
                  <div className="mask-row">
                    <div className="input-with-label">
                      <label>P1 X:</label>
                      <input
                        type="number"
                        value={getMaskDisplayValue(0, 0)}
                        onChange={(e) => handleMaskChange(0, 0, e.target.value)}
                        onBlur={(e) => handleMaskBlur(0, 0, e.target.value)}
                        className="parameter-input small"
                      />
                    </div>
                    <div className="input-with-label">
                      <label>P1 Y:</label>
                      <input
                        type="number"
                        value={getMaskDisplayValue(0, 1)}
                        onChange={(e) => handleMaskChange(0, 1, e.target.value)}
                        onBlur={(e) => handleMaskBlur(0, 1, e.target.value)}
                        className="parameter-input small"
                      />
                    </div>
                  </div>
                  <div className="mask-row">
                    <div className="input-with-label">
                      <label>P2 X:</label>
                      <input
                        type="number"
                        value={getMaskDisplayValue(1, 0)}
                        onChange={(e) => handleMaskChange(1, 0, e.target.value)}
                        onBlur={(e) => handleMaskBlur(1, 0, e.target.value)}
                        className="parameter-input small"
                      />
                    </div>
                    <div className="input-with-label">
                      <label>P2 Y:</label>
                      <input
                        type="number"
                        value={getMaskDisplayValue(1, 1)}
                        onChange={(e) => handleMaskChange(1, 1, e.target.value)}
                        onBlur={(e) => handleMaskBlur(1, 1, e.target.value)}
                        className="parameter-input small"
                      />
                    </div>
                  </div>
                  <div className="mask-row">
                    <div className="input-with-label">
                      <label>P3 X:</label>
                      <input
                        type="number"
                        value={getMaskDisplayValue(2, 0)}
                        onChange={(e) => handleMaskChange(2, 0, e.target.value)}
                        onBlur={(e) => handleMaskBlur(2, 0, e.target.value)}
                        className="parameter-input small"
                      />
                    </div>
                    <div className="input-with-label">
                      <label>P3 Y:</label>
                      <input
                        type="number"
                        value={getMaskDisplayValue(2, 1)}
                        onChange={(e) => handleMaskChange(2, 1, e.target.value)}
                        onBlur={(e) => handleMaskBlur(2, 1, e.target.value)}
                        className="parameter-input small"
                      />
                    </div>
                  </div>
                  <div className="mask-row">
                    <div className="input-with-label">
                      <label>P4 X:</label>
                      <input
                        type="number"
                        value={getMaskDisplayValue(3, 0)}
                        onChange={(e) => handleMaskChange(3, 0, e.target.value)}
                        onBlur={(e) => handleMaskBlur(3, 0, e.target.value)}
                        className="parameter-input small"
                      />
                    </div>
                    <div className="input-with-label">
                      <label>P4 Y:</label>
                      <input
                        type="number"
                        value={getMaskDisplayValue(3, 1)}
                        onChange={(e) => handleMaskChange(3, 1, e.target.value)}
                        onBlur={(e) => handleMaskBlur(3, 1, e.target.value)}
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
