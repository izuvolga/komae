import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { TextAsset, TextAssetInstance, Page } from '../../../types/entities';
import './TextEditModal.css';

// 編集モードの種類
type EditMode = 'asset' | 'instance';

export interface TextEditModalProps {
  mode: EditMode;
  asset: TextAsset;
  assetInstance?: TextAssetInstance;
  page?: Page;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsset?: (updatedAsset: TextAsset) => void;
  onSaveInstance?: (updatedInstance: TextAssetInstance) => void;
}

export const TextEditModal: React.FC<TextEditModalProps> = ({
  mode,
  asset,
  assetInstance,
  page,
  isOpen,
  onClose,
  onSaveAsset,
  onSaveInstance,
}) => {
  const [editingAsset, setEditingAsset] = useState<TextAsset>(asset);
  const [editingInstance, setEditingInstance] = useState<TextAssetInstance | null>(
    assetInstance || null
  );
  const canvasConfig = useProjectStore((state) => state.project?.canvas);

  useEffect(() => {
    if (isOpen) {
      setEditingAsset({ ...asset });
      setEditingInstance(assetInstance ? { ...assetInstance } : null);
    }
  }, [isOpen, asset, assetInstance]);

  if (!isOpen || !editingAsset) return null;

  // 現在の値を取得する（instanceモードではoverride値を優先）
  const getCurrentValue = (assetField: keyof TextAsset, instanceField?: keyof TextAssetInstance): any => {
    if (mode === 'instance' && editingInstance && instanceField && editingInstance[instanceField] !== undefined) {
      return editingInstance[instanceField];
    }
    return editingAsset[assetField];
  };

  const handleInputChange = (field: keyof TextAsset, value: any) => {
    if (mode === 'asset') {
      setEditingAsset({
        ...editingAsset,
        [field]: value,
      });
    }
  };

  const handleInstanceChange = (field: keyof TextAssetInstance, value: any) => {
    if (mode === 'instance' && editingInstance) {
      setEditingInstance({
        ...editingInstance,
        [field]: value,
      });
    }
  };

  const formatNumberForDisplay = (value: number): string => {
    return value.toFixed(2).replace(/\.?0+$/, '');
  };

  const handleNumberInputChange = (field: keyof TextAsset, value: string) => {
    const numValue = parseFloat(value) || 0;
    handleInputChange(field, numValue);
  };

  const handleSave = () => {
    if (mode === 'asset' && onSaveAsset) {
      onSaveAsset(editingAsset);
    } else if (mode === 'instance' && editingInstance && onSaveInstance) {
      onSaveInstance(editingInstance);
    }
    onClose();
  };

  // モーダル外側クリックでの閉じる処理を削除

  return (
    <div className="text-edit-modal-overlay">
      <div className="text-edit-modal">
        <div className="text-edit-modal-header">
          <h3>{mode === 'asset' ? 'テキストアセット編集' : 'テキストアセットインスタンス編集'}</h3>
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
                  fontSize: `${getCurrentValue('font_size', 'override_font_size')}px`,
                  color: editingAsset.fill_color,
                  textShadow: editingAsset.stroke_width > 0 ? `0 0 ${editingAsset.stroke_width}px ${editingAsset.stroke_color}` : 'none',
                  opacity: getCurrentValue('opacity', 'override_opacity'),
                  writingMode: editingAsset.vertical ? 'vertical-rl' : 'horizontal-tb',
                  lineHeight: editingAsset.leading ? `${editingAsset.leading}px` : 'normal',
                  position: 'absolute',
                  left: `${getCurrentValue('default_pos_x', 'override_pos_x')}px`,
                  top: `${getCurrentValue('default_pos_y', 'override_pos_y')}px`,
                }}
              >
                {getCurrentValue('default_text', 'override_text')}
              </div>
            </div>
          </div>

          <div className="text-edit-form">
            {/* 基本情報 */}
            <div className="form-section">
              <h4>基本設定</h4>
              {mode === 'asset' && (
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
              )}
              <div className="form-row">
                <label>
                  {mode === 'asset' ? 'デフォルトテキスト:' : 'テキスト内容:'}
                  <textarea
                    value={getCurrentValue('default_text', 'override_text')}
                    onChange={(e) => {
                      if (mode === 'asset') {
                        handleInputChange('default_text', e.target.value);
                      } else {
                        handleInstanceChange('override_text', e.target.value);
                      }
                    }}
                    rows={3}
                  />
                </label>
              </div>
            </div>

            {/* フォント設定 */}
            <div className="form-section">
              <h4>フォント設定</h4>
              {mode === 'asset' && (
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
              )}
              <div className="form-row">
                <label>
                  フォントサイズ:
                  <input
                    type="number"
                    value={formatNumberForDisplay(getCurrentValue('font_size', 'override_font_size'))}
                    onChange={(e) => {
                      const numValue = parseFloat(e.target.value) || 0;
                      if (mode === 'asset') {
                        handleInputChange('font_size', numValue);
                      } else {
                        handleInstanceChange('override_font_size', numValue);
                      }
                    }}
                    min="0.01"
                    step="0.01"
                  />
                </label>
              </div>
              {mode === 'asset' && (
                <>
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
                </>
              )}
            </div>

            {/* 色設定 - AssetInstanceモードでは表示しない */}
            {mode === 'asset' && (
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
            )}

            {/* 位置・透明度設定 */}
            <div className="form-section">
              <h4>位置・透明度設定</h4>
              <div className="form-row form-row-double">
                <label>
                  X座標:
                  <input
                    type="number"
                    value={formatNumberForDisplay(getCurrentValue('default_pos_x', 'override_pos_x'))}
                    onChange={(e) => {
                      const numValue = parseFloat(e.target.value) || 0;
                      if (mode === 'asset') {
                        handleInputChange('default_pos_x', numValue);
                      } else {
                        handleInstanceChange('override_pos_x', numValue);
                      }
                    }}
                    step="0.01"
                  />
                </label>
                <label>
                  Y座標:
                  <input
                    type="number"
                    value={formatNumberForDisplay(getCurrentValue('default_pos_y', 'override_pos_y'))}
                    onChange={(e) => {
                      const numValue = parseFloat(e.target.value) || 0;
                      if (mode === 'asset') {
                        handleInputChange('default_pos_y', numValue);
                      } else {
                        handleInstanceChange('override_pos_y', numValue);
                      }
                    }}
                    step="0.01"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  不透明度:
                  <input
                    type="number"
                    value={formatNumberForDisplay(getCurrentValue('opacity', 'override_opacity'))}
                    onChange={(e) => {
                      const numValue = parseFloat(e.target.value) || 0;
                      if (mode === 'asset') {
                        handleInputChange('opacity', numValue);
                      } else {
                        handleInstanceChange('override_opacity', numValue);
                      }
                    }}
                    min="0"
                    max="1"
                    step="0.01"
                  />
                </label>
              </div>

              {/* z_index設定 - instanceモードのみ */}
              {mode === 'instance' && editingInstance && (
                <div className="form-row">
                  <label>
                    レイヤー順序 (z-index):
                    <input
                      type="number"
                      value={editingInstance.z_index}
                      onChange={(e) => {
                        const numValue = parseInt(e.target.value) || 0;
                        handleInstanceChange('z_index', numValue);
                      }}
                      min="0"
                      step="1"
                    />
                  </label>
                </div>
              )}
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