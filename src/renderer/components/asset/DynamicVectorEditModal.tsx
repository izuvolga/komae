import React, { useState, useEffect } from 'react';
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

  const generatePreviewSVG = async () => {
    if (!customAssetInfo || !asset.customAssetId) return;
    
    setIsGeneratingPreview(true);
    setPreviewError(null);
    
    try {
      const currentParams = editedAsset.customAssetParameters || {};
      
      // TODO: Implement generateCustomAssetSVG API
      // For now, show placeholder message
      setPreviewError('SVG generation not yet implemented');
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
        <div className="modal-header">
          <h2>
            {mode === 'asset' ? 'Dynamic SVGアセット編集' : 'Dynamic SVGインスタンス編集'}
            {mode === 'instance' && page && ` - ${page.title}`}
            {customAssetInfo && (
              <span className="custom-asset-badge">
                CustomAsset: {customAssetInfo?.metadata?.name || 'Loading...'}
              </span>
            )}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="edit-panels">
            {/* 左側：プレビューとCustomAsset情報 */}
            <div className="preview-panel">
              <h3>プレビュー</h3>
              
              {/* CustomAsset情報表示 */}
              <div className="custom-asset-info">
                {isLoadingCustomAsset ? (
                  <div className="loading-state">CustomAsset情報を読み込み中...</div>
                ) : customAssetInfo ? (
                  <div className="asset-info-card">
                    <div className="info-header">
                      <strong>{customAssetInfo.metadata?.name || 'Unknown'}</strong>
                      <span className="version">v{customAssetInfo.metadata?.version || '1.0'}</span>
                    </div>
                    {customAssetInfo.metadata?.description && (
                      <p className="description">{customAssetInfo.metadata.description}</p>
                    )}
                    {customAssetInfo.metadata?.author && (
                      <p className="author">作者: {customAssetInfo.metadata.author}</p>
                    )}
                  </div>
                ) : (
                  <div className="error-state">CustomAsset情報の取得に失敗しました</div>
                )}
              </div>

              {/* プレビュー領域 */}
              <div className="preview-container">
                <div className="canvas-preview">
                  <div 
                    className="canvas-container"
                    style={{
                      position: 'relative',
                      width: Math.min(240, 240 * (project?.canvas.width || 800) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600)),
                      height: Math.min(240, 240 * (project?.canvas.height || 600) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600)),
                      border: '2px solid #d1d5db',
                      backgroundColor: '#ffffff',
                      overflow: 'visible',
                    }}
                  >
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
                    
                    {/* SVGプレビュー表示 */}
                    {isGeneratingPreview ? (
                      <div className="preview-loading">
                        <div className="loading-spinner">生成中...</div>
                      </div>
                    ) : previewError ? (
                      <div className="preview-error">
                        <div className="error-message">
                          <p>⚠️ プレビュー生成エラー</p>
                          <p>{previewError}</p>
                        </div>
                      </div>
                    ) : previewSVG ? (
                      <div className="svg-preview-content">
                        <svg
                          width="100%"
                          height="100%"
                          viewBox={`0 0 ${currentSize.width} ${currentSize.height}`}
                          style={{
                            position: 'absolute',
                            top: `${(currentPos.y / (project?.canvas.height || 600)) * 100}%`,
                            left: `${(currentPos.x / (project?.canvas.width || 800)) * 100}%`,
                            width: `${(currentSize.width / (project?.canvas.width || 800)) * 100}%`,
                            height: `${(currentSize.height / (project?.canvas.height || 600)) * 100}%`,
                            opacity: currentOpacity,
                            zIndex: currentZIndex,
                          }}
                          dangerouslySetInnerHTML={{ __html: previewSVG }}
                        />
                      </div>
                    ) : (
                      <div className="asset-preview-placeholder">
                        <div className="preview-info">
                          <p>⚡ Dynamic SVG</p>
                          <p>位置: ({currentPos.x}, {currentPos.y})</p>
                          <p>サイズ: {currentSize.width} × {currentSize.height}</p>
                          <p>不透明度: {Math.round(currentOpacity * 100)}%</p>
                          <p>Z-Index: {currentZIndex}</p>
                          <button 
                            className="generate-preview-btn"
                            onClick={generatePreviewSVG}
                          >
                            プレビューを生成
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 右側：すべてのパラメータ */}
            <div className="properties-panel">
              <h3>プロパティ</h3>
              
              {/* アセット名（Asset編集時のみ） */}
              {mode === 'asset' && (
                <div className="property-group">
                  <label>アセット名</label>
                  <input
                    type="text"
                    value={editedAsset.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="property-input"
                  />
                </div>
              )}

              {/* CustomAssetパラメータ（Asset編集時のみ） */}
              {console.log('Parameter rendering check:', { 
                mode, 
                customAssetInfo: !!customAssetInfo, 
                metadata: !!customAssetInfo?.metadata, 
                params: !!customAssetInfo?.metadata?.params,
                directParams: !!customAssetInfo?.params,
                parametersArray: !!customAssetInfo?.parameters,
                parametersLength: customAssetInfo?.parameters?.length || 0
              })}
              {mode === 'asset' && customAssetInfo?.parameters && customAssetInfo.parameters.length > 0 && (
                <div className="property-group">
                  <div className="parameters-section">
                    {customAssetInfo.parameters.map((paramInfo: any, index: number) => {
                      // parameters配列の各要素を処理
                      const paramName = paramInfo.name;
                      const currentValue = editedAsset.customAssetParameters?.[paramName] ?? paramInfo.defaultValue;
                      const variableBinding = editedAsset.parameterVariableBindings?.[paramName];
                      const displayName = `var_${index + 1}`;
                      
                      return (
                        <div key={paramName} className="parameter-row">
                          <div className="parameter-label">
                            <span className="parameter-display-name">{displayName}</span>
                            <span className="parameter-actual-name">({paramName})</span>
                          </div>
                          <div className="parameter-controls">
                            {paramInfo.type === 'number' ? (
                              <NumericInput
                                value={typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 0}
                                onChange={(value) => {
                                  const newParams = { ...editedAsset.customAssetParameters, [paramName]: value };
                                  handleCustomAssetParameterChange(newParams);
                                }}
                                min={paramInfo.min}
                                max={paramInfo.max}
                                step={paramInfo.step || 1}
                              />
                            ) : (
                              <input
                                type="text"
                                value={String(currentValue)}
                                onChange={(e) => {
                                  const newParams = { ...editedAsset.customAssetParameters, [paramName]: e.target.value };
                                  handleCustomAssetParameterChange(newParams);
                                }}
                                className="parameter-text-input"
                              />
                            )}
                            {/* 変数バインディング選択 */}
                            <select
                              value={variableBinding || ''}
                              onChange={(e) => {
                                const newBinding = e.target.value || null;
                                handleParameterVariableChange(paramName, newBinding);
                              }}
                              className="variable-binding-select"
                            >
                              <option value="">固定値</option>
                              <optgroup label="ページ変数">
                                <option value="page_current">page_current</option>
                                <option value="page_total">page_total</option>
                              </optgroup>
                              <optgroup label="値アセット変数">
                                {project ? Object.entries(project.assets)
                                  .filter(([_, asset]) => asset.type === 'ValueAsset')
                                  .filter(([_, valueAsset]) => {
                                    const name = valueAsset.name;
                                    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
                                  })
                                  .map(([assetId, valueAsset]) => (
                                    <option key={assetId} value={valueAsset.name}>
                                      {valueAsset.name}
                                    </option>
                                  )) : []
                                }
                              </optgroup>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* デバッグ情報（Asset編集時のみ、パラメータが表示されない場合の診断用） */}
              {mode === 'asset' && !(customAssetInfo?.parameters && customAssetInfo.parameters.length > 0) && (
                <div className="property-group">
                  <label>デバッグ情報</label>
                  <div style={{ fontSize: '12px', color: '#666', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                    <div>CustomAsset ID: {editedAsset.customAssetId || 'なし'}</div>
                    <div>CustomAsset情報: {customAssetInfo ? '読み込み済み' : 'なし'}</div>
                    <div>メタデータ: {customAssetInfo?.metadata ? '存在' : 'なし'}</div>
                    <div>メタデータパラメータ: {customAssetInfo?.metadata?.params ? 'あり' : 'なし'}</div>
                    <div>直接パラメータ: {customAssetInfo?.params ? 'あり' : 'なし'}</div>
                    {isLoadingCustomAsset && <div>ローディング中...</div>}
                  </div>
                </div>
              )}

              {/* 位置・サイズ・外観設定 */}
              <div className="property-group">
                <label>位置</label>
                <div className="property-row">
                  <div className="input-group">
                    <label>PosX</label>
                    <NumericInput
                      value={currentPos.x}
                      onChange={(value) => handlePositionChange('x', value)}
                      step={1}
                    />
                  </div>
                  <div className="input-group">
                    <label>PosY</label>
                    <NumericInput
                      value={currentPos.y}
                      onChange={(value) => handlePositionChange('y', value)}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div className="property-group">
                <label>サイズ</label>
                <div className="property-row">
                  <div className="input-group">
                    <label>Width</label>
                    <NumericInput
                      value={currentSize.width}
                      onChange={(value) => handleSizeChange('width', value)}
                      min={1}
                      step={1}
                    />
                  </div>
                  <div className="input-group">
                    <label>Height</label>
                    <NumericInput
                      value={currentSize.height}
                      onChange={(value) => handleSizeChange('height', value)}
                      min={1}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div className="property-group">
                <label>Opacity</label>
                <div className="opacity-control">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={currentOpacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                    className="opacity-slider"
                  />
                  <span className="opacity-percentage">
                    {Math.round(currentOpacity * 100)}%
                  </span>
                </div>
              </div>

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

        {/* フッター：アクションボタン */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
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