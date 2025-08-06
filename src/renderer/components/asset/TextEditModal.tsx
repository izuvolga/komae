import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { TextAsset } from '../../../types/entities';
import './TextEditModal.css';

export interface TextEditModalProps {
  mode: 'asset' | 'instance';
  asset?: TextAsset;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsset?: (updatedAsset: TextAsset) => void;
}

export const TextEditModal: React.FC<TextEditModalProps> = ({
  mode,
  asset,
  isOpen,
  onClose,
  onSaveAsset,
}) => {
  const [editingAsset, setEditingAsset] = useState<TextAsset | null>(null);
  const canvasConfig = useProjectStore((state) => state.project?.canvas);

  useEffect(() => {
    if (isOpen && asset) {
      setEditingAsset({ ...asset });
    }
  }, [isOpen, asset]);

  if (!isOpen || !editingAsset) return null;

  const handleInputChange = (field: keyof TextAsset, value: any) => {
    if (!editingAsset) return;
    
    setEditingAsset({
      ...editingAsset,
      [field]: value,
    });
  };

  const formatNumberForDisplay = (value: number): string => {
    return value.toFixed(2).replace(/\.?0+$/, '');
  };

  const handleNumberInputChange = (field: keyof TextAsset, value: string) => {
    const numValue = parseFloat(value) || 0;
    handleInputChange(field, numValue);
  };

  const handleSave = () => {
    if (editingAsset && onSaveAsset) {
      onSaveAsset(editingAsset);
    }
    onClose();
  };

  // モーダル外側クリックでの閉じる処理を削除

  return (
    <div className="text-edit-modal-overlay">
      <div className="text-edit-modal">
        <div className="text-edit-modal-header">
          <h3>テキストアセット編集</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="text-edit-modal-content">
          <div className="text-edit-preview">
            <h4>プレビュー</h4>
            <div className="preview-container" style={{
              width: canvasConfig?.width || 800,
              height: canvasConfig?.height || 600,
            }}>
              <div
                className="text-preview"
                style={{
                  fontSize: `${editingAsset.font_size}px`,
                  color: editingAsset.fill_color,
                  textShadow: editingAsset.stroke_width > 0 ? `0 0 ${editingAsset.stroke_width}px ${editingAsset.stroke_color}` : 'none',
                  opacity: editingAsset.opacity,
                  writingMode: editingAsset.vertical ? 'vertical-rl' : 'horizontal-tb',
                  lineHeight: editingAsset.leading ? `${editingAsset.leading}px` : 'normal',
                  position: 'absolute',
                  left: `${editingAsset.default_pos_x}px`,
                  top: `${editingAsset.default_pos_y}px`,
                }}
              >
                {editingAsset.default_text}
              </div>
            </div>
          </div>

          <div className="text-edit-form">
            {/* 基本情報 */}
            <div className="form-section">
              <h4>基本設定</h4>
              <div className="form-row">
                <label>
                  名前:
                  <input
                    type="text"
                    value={editingAsset.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  デフォルトテキスト:
                  <textarea
                    value={editingAsset.default_text}
                    onChange={(e) => handleInputChange('default_text', e.target.value)}
                    rows={3}
                  />
                </label>
              </div>
            </div>

            {/* フォント設定 */}
            <div className="form-section">
              <h4>フォント設定</h4>
              <div className="form-row">
                <label>
                  フォントパス:
                  <input
                    type="text"
                    value={editingAsset.font}
                    onChange={(e) => handleInputChange('font', e.target.value)}
                    placeholder="フォントファイルのパス"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  フォントサイズ:
                  <input
                    type="number"
                    value={formatNumberForDisplay(editingAsset.font_size)}
                    onChange={(e) => handleNumberInputChange('font_size', e.target.value)}
                    min="0.01"
                    step="0.01"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  行間:
                  <input
                    type="number"
                    value={formatNumberForDisplay(editingAsset.leading)}
                    onChange={(e) => handleNumberInputChange('leading', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  <input
                    type="checkbox"
                    checked={editingAsset.vertical}
                    onChange={(e) => handleInputChange('vertical', e.target.checked)}
                  />
                  縦書き
                </label>
              </div>
            </div>

            {/* 色設定 */}
            <div className="form-section">
              <h4>色設定</h4>
              <div className="form-row">
                <label>
                  塗りの色:
                  <input
                    type="color"
                    value={editingAsset.fill_color}
                    onChange={(e) => handleInputChange('fill_color', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  縁取りの色:
                  <input
                    type="color"
                    value={editingAsset.stroke_color}
                    onChange={(e) => handleInputChange('stroke_color', e.target.value)}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  縁取り幅:
                  <input
                    type="number"
                    value={formatNumberForDisplay(editingAsset.stroke_width)}
                    onChange={(e) => handleNumberInputChange('stroke_width', e.target.value)}
                    min="0"
                    max="1"
                    step="0.01"
                  />
                </label>
              </div>
            </div>

            {/* 位置・透明度設定 */}
            <div className="form-section">
              <h4>位置・透明度設定</h4>
              <div className="form-row form-row-double">
                <label>
                  X座標:
                  <input
                    type="number"
                    value={formatNumberForDisplay(editingAsset.default_pos_x)}
                    onChange={(e) => handleNumberInputChange('default_pos_x', e.target.value)}
                    step="0.01"
                  />
                </label>
                <label>
                  Y座標:
                  <input
                    type="number"
                    value={formatNumberForDisplay(editingAsset.default_pos_y)}
                    onChange={(e) => handleNumberInputChange('default_pos_y', e.target.value)}
                    step="0.01"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  不透明度:
                  <input
                    type="number"
                    value={formatNumberForDisplay(editingAsset.opacity)}
                    onChange={(e) => handleNumberInputChange('opacity', e.target.value)}
                    min="0"
                    max="1"
                    step="0.01"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="text-edit-modal-footer">
          <button onClick={onClose} className="cancel-button">キャンセル</button>
          <button onClick={handleSave} className="save-button">保存</button>
        </div>
      </div>
    </div>
  );
};