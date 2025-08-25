import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { NumericInput } from '../common/NumericInput';
import type { DynamicVectorAsset, DynamicVectorAssetInstance, Page, ProjectData } from '../../../types/entities';
import { 
  getEffectiveZIndex, 
  validateDynamicVectorAssetData,
  validateDynamicVectorAssetInstanceData 
} from '../../../types/entities';
import { createExecutionContext, executeScript } from '../../../utils/dynamicVectorEngine';
import './DynamicVectorEditModal.css';

export interface DynamicVectorEditModalProps {
  mode: 'asset' | 'instance';
  asset: DynamicVectorAsset;
  assetInstance?: DynamicVectorAssetInstance;
  page?: Page;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsset?: (asset: DynamicVectorAsset) => void;
  onSaveInstance?: (instance: DynamicVectorAssetInstance) => void;
}

export function DynamicVectorEditModal({ 
  mode,
  asset,
  assetInstance,
  page,
  isOpen, 
  onClose, 
  onSaveAsset,
  onSaveInstance
}: DynamicVectorEditModalProps) {
  const { project } = useProjectStore();
  
  // Position, Size, Opacity types from entities
  type Position = { x: number; y: number };
  type Size = { width: number; height: number };
  
  const [editedAsset, setEditedAsset] = useState<DynamicVectorAsset>(asset);
  const [editedInstance, setEditedInstance] = useState<DynamicVectorAssetInstance | null>(assetInstance || null);
  const [customAssetInfo, setCustomAssetInfo] = useState<any>(null);
  const [isLoadingCustomAsset, setIsLoadingCustomAsset] = useState(false);
  const [previewSVG, setPreviewSVG] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [autoPreview, setAutoPreview] = useState<boolean>(true);

  // Current values (Asset or Instance)
  const currentPos = mode === 'instance' && editedInstance 
    ? { x: editedInstance.override_pos_x ?? editedAsset.default_pos_x, y: editedInstance.override_pos_y ?? editedAsset.default_pos_y }
    : { x: editedAsset.default_pos_x, y: editedAsset.default_pos_y };
  const currentSize = mode === 'instance' && editedInstance 
    ? { width: editedInstance.override_width ?? editedAsset.default_width, height: editedInstance.override_height ?? editedAsset.default_height }
    : { width: editedAsset.default_width, height: editedAsset.default_height };  
  const currentOpacity = mode === 'instance' && editedInstance ? (editedInstance.override_opacity ?? editedAsset.default_opacity) : editedAsset.default_opacity;
  const currentZIndex = mode === 'instance' && editedInstance 
    ? (editedInstance.override_z_index ?? editedAsset.default_z_index) 
    : editedAsset.default_z_index;

  const zIndexValidation = { warning: null as string | null };

  // Get available variables from ValueAssets
  const availableVariables = project ? Object.entries(project.assets)
    .filter(([_, asset]) => asset.type === 'ValueAsset')
    .filter(([_, valueAsset]) => {
      const name = valueAsset.name;
      return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
    })
    .map(([assetId, valueAsset]) => ({
      id: assetId,
      name: valueAsset.name
    })) : [];

  // debounce用のRef
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (asset.customAssetId) {
      console.log('Fetching CustomAsset info for:', asset.customAssetId);
      setIsLoadingCustomAsset(true);
      window.electronAPI.customAsset.getAssetInfo(asset.customAssetId)
        .then((info: any) => {
          console.log('Received CustomAsset info:', info);
          console.log('Parameters found:', info?.parameters);
          if (info?.parameters) {
            console.log('Parameter details:', info.parameters);
          }
          setCustomAssetInfo(info);
        })
        .catch((error: any) => {
          console.error('Failed to load custom asset info:', error);
        })
        .finally(() => {
          setIsLoadingCustomAsset(false);
        });
    }
  }, [asset.customAssetId]);

  // リアルタイムプレビュー更新のuseEffect
  useEffect(() => {
    if (!autoPreview || !customAssetInfo || !project) return;

    // debounce処理
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = setTimeout(() => {
      generatePreviewSVG();
    }, 300); // 300ms delay

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [
    editedAsset.customAssetParameters,
    editedAsset.parameterVariableBindings,
    currentPos.x,
    currentPos.y,
    currentSize.width,
    currentSize.height,
    currentOpacity,
    currentZIndex,
    autoPreview,
    customAssetInfo,
    project
  ]);

  const generatePreviewSVG = async () => {
    if (!project) return;
    
    setIsGeneratingPreview(true);
    setPreviewError(null);
    
    try {
      // 統一されたdynamicVector APIを使用
      const svgContent = await window.electronAPI.dynamicVector.generateSVG(
        editedAsset,
        editedInstance,
        project,
        0 // pageIndex
      );
      
      setPreviewSVG(svgContent);
    } catch (error) {
      console.error('Preview generation failed:', error);
      setPreviewError(error instanceof Error ? error.message : 'プレビュー生成に失敗しました');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleNameChange = (name: string) => {
    setEditedAsset(prev => ({ ...prev, name }));
  };

  const handleCustomAssetParameterChange = (newParams: Record<string, any>) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({ ...prev, customAssetParameters: newParams }));
    }
  };

  const handleParameterVariableChange = (paramName: string, variableName: string | null) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        parameterVariableBindings: {
          ...prev.parameterVariableBindings,
          [paramName]: variableName!
        }
      }));
    }
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    if (mode === 'instance' && editedInstance) {
      const property = axis === 'x' ? 'override_pos_x' : 'override_pos_y';
      setEditedInstance(prev => prev ? {
        ...prev,
        [property]: value
      } : null);
    } else {
      const property = axis === 'x' ? 'default_pos_x' : 'default_pos_y';
      setEditedAsset(prev => ({
        ...prev,
        [property]: value
      }));
    }
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    if (mode === 'instance' && editedInstance) {
      const property = dimension === 'width' ? 'override_width' : 'override_height';
      setEditedInstance(prev => prev ? {
        ...prev,
        [property]: value
      } : null);
    } else {
      const property = dimension === 'width' ? 'default_width' : 'default_height';
      setEditedAsset(prev => ({
        ...prev,
        [property]: value
      }));
    }
  };

  const handleOpacityChange = (opacity: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? { ...prev, override_opacity: opacity } : null);
    } else {
      setEditedAsset(prev => ({ ...prev, default_opacity: opacity }));
    }
  };

  const handleZIndexChange = (zIndex: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? { ...prev, override_z_index: zIndex } : null);
    } else {
      setEditedAsset(prev => ({ ...prev, default_z_index: zIndex }));
    }
  };

  const handleSave = () => {
    try {
      if (mode === 'asset') {
        const validation = validateDynamicVectorAssetData(editedAsset);
        if (!validation.isValid) {
          alert(`アセットデータが無効です: ${validation.errors.join(', ')}`);
          return;
        }
        onSaveAsset?.(editedAsset);
      } else if (mode === 'instance' && editedInstance) {
        const validation = validateDynamicVectorAssetInstanceData(editedInstance);
        if (!validation.isValid) {
          alert(`インスタンスデータが無効です: ${validation.errors.join(', ')}`);
          return;
        }
        onSaveInstance?.(editedInstance);
      }
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      alert('保存に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content dynamic-vector-edit-modal" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="modal-header">
          <h2>DynamicVectorAsset {mode === 'instance' ? 'インスタンス' : 'アセット'} 編集</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* 2パネル構成のメインコンテンツ */}
        <div className="modal-body two-panel-layout">
          {/* 左パネル: プレビューエリア */}
          <div className="left-panel">
            <div className="preview-section">
              <h3>プレビュー</h3>
              <div className="preview-controls">
                <div className="preview-control-group">
                  <button onClick={generatePreviewSVG} disabled={isGeneratingPreview}>
                    {isGeneratingPreview ? 'プレビュー生成中...' : 'プレビュー更新'}
                  </button>
                  <label className="auto-preview-toggle">
                    <input
                      type="checkbox"
                      checked={autoPreview}
                      onChange={(e) => setAutoPreview(e.target.checked)}
                    />
                    自動更新
                  </label>
                </div>
              </div>
              {previewError && (
                <div className="preview-error">
                  エラー: {previewError}
                </div>
              )}
              {previewSVG && (
                <div className="dynamic-vector-preview-container">
                  <div 
                    dangerouslySetInnerHTML={{ __html: previewSVG }}
                    style={{
                      transform: `translate(${currentPos.x}px, ${currentPos.y}px)`,
                      opacity: currentOpacity,
                      zIndex: currentZIndex
                    }}
                  />
                </div>
              )}
              {!previewSVG && !previewError && !isGeneratingPreview && (
                <div className="preview-placeholder">
                  プレビューを生成するには「プレビュー更新」ボタンをクリックしてください
                </div>
              )}
            </div>
          </div>

          {/* 右パネル: 編集フォーム */}
          <div className="right-panel">
            <div className="edit-forms">
              {/* アセット名編集 (asset mode only) */}
              {mode === 'asset' && (
                <div className="section">
                  <h3>アセット設定</h3>
                  <div className="form-group">
                    <label>アセット名:</label>
                    <input
                      type="text"
                      value={editedAsset.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="アセット名を入力"
                    />
                  </div>
                </div>
              )}

              {/* CustomAsset Parameters Section (asset mode only) */}
              {mode === 'asset' && customAssetInfo && (
                <div className="section">
                  <h3>@parameters</h3>
                  {isLoadingCustomAsset ? (
                    <p>カスタムアセット情報を読み込み中...</p>
                  ) : (
                    customAssetInfo.parameters && customAssetInfo.parameters.length > 0 ? (
                      <div className="parameters-grid">
                        {customAssetInfo.parameters.map((paramInfo: any, index: number) => {
                          const displayName = paramInfo.editName || paramInfo.displayName || paramInfo.name;
                          const currentValue = editedAsset.customAssetParameters?.[paramInfo.name] || paramInfo.defaultValue || '';
                          const variableBinding = editedAsset.parameterVariableBindings?.[paramInfo.name] || '';
                          
                          return (
                            <div key={paramInfo.name} className="parameter-item">
                              <div className="parameter-header">
                                <label>{displayName}:</label>
                                <small>({paramInfo.name})</small>
                              </div>
                              <div className="parameter-controls">
                                <div className="parameter-value">
                                  <label>値:</label>
                                  <input
                                    type={paramInfo.type === 'number' ? 'number' : 'text'}
                                    value={currentValue}
                                    onChange={(e) => {
                                      const newValue = paramInfo.type === 'number' ? 
                                        (e.target.value === '' ? '' : parseFloat(e.target.value)) : 
                                        e.target.value;
                                      handleCustomAssetParameterChange({
                                        ...editedAsset.customAssetParameters,
                                        [paramInfo.name]: newValue
                                      });
                                    }}
                                    placeholder={`デフォルト: ${paramInfo.defaultValue}`}
                                  />
                                </div>
                                <div className="parameter-variable">
                                  <label>変数バインド:</label>
                                  <select
                                    value={variableBinding}
                                    onChange={(e) => handleParameterVariableChange(paramInfo.name, e.target.value || null)}
                                  >
                                    <option value="">-- 変数を選択 --</option>
                                    <optgroup label="ページ変数">
                                      <option value="page_current">page_current</option>
                                      <option value="page_total">page_total</option>
                                    </optgroup>
                                    <optgroup label="値アセット変数">
                                      {availableVariables.map((variable) => (
                                        <option key={variable.id} value={variable.name}>
                                          {variable.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </div>
                              </div>
                              <div className="parameter-description">
                                <small>{paramInfo.description || 'パラメータの説明なし'}</small>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p>このカスタムアセットに@parametersが定義されていません。</p>
                    )
                  )}
                </div>
              )}

              {/* Position Section */}
              <div className="section">
                <h3>位置 (Position)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>X座標:</label>
                    <input
                      type="number"
                      value={currentPos.x}
                      onChange={(e) => handlePositionChange('x', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Y座標:</label>
                    <input
                      type="number"
                      value={currentPos.y}
                      onChange={(e) => handlePositionChange('y', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Size Section */}
              <div className="section">
                <h3>サイズ (Size)</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>幅 (Width):</label>
                    <input
                      type="number"
                      value={currentSize.width}
                      onChange={(e) => handleSizeChange('width', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>高さ (Height):</label>
                    <input
                      type="number"
                      value={currentSize.height}
                      onChange={(e) => handleSizeChange('height', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Opacity Section */}
              <div className="section">
                <h3>不透明度 (Opacity)</h3>
                <div className="form-group">
                  <label>不透明度 (0-1):</label>
                  <input
                    type="number"
                    value={currentOpacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
              </div>

              {/* Z-Index Section */}
              <div className="section">
                <h3>レイヤー順序 (Z-Index)</h3>
                <div className="form-group">
                  <label>Z-Index:</label>
                  <input
                    type="number"
                    value={currentZIndex}
                    onChange={(e) => handleZIndexChange(parseInt(e.target.value) || 0)}
                  />
                  {zIndexValidation.warning && (
                    <div className="validation-warning">{zIndexValidation.warning}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター：アクションボタン */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} style={{ color: '#000' }}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
