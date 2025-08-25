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

export const DynamicVectorEditModal: React.FC<DynamicVectorEditModalProps> = ({
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
  const [editedAsset, setEditedAsset] = useState<DynamicVectorAsset>(() => ({
    ...asset,
    // ページ変数をデフォルトでONに設定
    use_page_variables: asset.use_page_variables ?? true,
    use_value_variables: asset.use_value_variables ?? true,
  }));
  const [editedInstance, setEditedInstance] = useState<DynamicVectorAssetInstance | null>(
    assetInstance || null
  );

  // CustomAsset関連の状態
  const [customAssetInfo, setCustomAssetInfo] = useState<any>(null);
  const [isLoadingCustomAsset, setIsLoadingCustomAsset] = useState(false);
  
  // プレビューSVG生成の状態
  const [previewSVG, setPreviewSVG] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // バリデーション状態
  const [zIndexValidation, setZIndexValidation] = useState<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>({ isValid: true });

  // 初期化とCustomAsset情報の取得
  useEffect(() => {
    setEditedAsset(asset);
    setEditedInstance(assetInstance || null);
    
    // DynamicVectorAssetは常にCustomAssetなので情報を取得
    if (asset.customAssetId) {
      loadCustomAssetInfo(asset.customAssetId);
    }
  }, [asset, assetInstance]);

  // CustomAsset情報が読み込まれたらプレビューを生成
  useEffect(() => {
    if (customAssetInfo && editedAsset.script) {
      generatePreviewSVG();
    }
  }, [customAssetInfo, editedAsset.script, editedAsset.customAssetParameters]);

  const loadCustomAssetInfo = async (customAssetId: string) => {
    try {
      setIsLoadingCustomAsset(true);
      const info = await window.electronAPI.customAsset.getAssetInfo(customAssetId);
      setCustomAssetInfo(info);
    } catch (error) {
      console.error('Failed to load custom asset info:', error);
      setCustomAssetInfo(null);
    } finally {
      setIsLoadingCustomAsset(false);
    }
  };

  const generatePreviewSVG = async () => {
    if (!project || !editedAsset.customAssetId) {
      setPreviewSVG(null);
      setPreviewError('プロジェクトまたはCustomAsset IDが見つかりません');
      return;
    }

    try {
      setIsGeneratingPreview(true);
      setPreviewError(null);

      // スクリプト実行コンテキストを作成（ページインデックス0でプレビュー）
      const executionContext = createExecutionContext(editedAsset, project, 0);
      
      // スクリプトを実行してSVGコンテンツを生成
      const executionResult = executeScript(editedAsset.script, executionContext);
      
      if (!executionResult.success || !executionResult.svgContent) {
        setPreviewSVG(null);
        setPreviewError(executionResult.error || 'SVG生成に失敗しました');
        return;
      }

      // 警告がある場合は表示
      if (executionResult.warnings && executionResult.warnings.length > 0) {
        console.warn('Preview generation warnings:', executionResult.warnings);
      }

      setPreviewSVG(executionResult.svgContent);
    } catch (error) {
      console.error('Preview generation error:', error);
      setPreviewSVG(null);
      setPreviewError(error instanceof Error ? error.message : 'プレビュー生成中にエラーが発生しました');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

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

  // イベントハンドラー
  const handleNameChange = (value: string) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        name: value,
      }));
    }
  };

  const handlePositionChange = (field: 'x' | 'y', value: number) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        [`default_pos_${field}`]: value,
      }));
      // プレビューを更新（位置変更は表示位置のみなのでSVG内容は再生成不要）
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
      // サイズ変更は表示サイズのみなのでSVG内容は再生成不要
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
      // 不透明度変更は表示スタイルのみなのでSVG内容は再生成不要
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

  const handleCustomAssetParameterChange = (parameters: Record<string, number | string>) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        customAssetParameters: parameters,
        customParameters: parameters, // 別名フィールドも更新
      }));
      // パラメータ変更時にプレビューを再生成
      setTimeout(() => generatePreviewSVG(), 100);
    }
  };

  const handleParameterVariableChange = (parameterName: string, variableBinding: string | null) => {
    if (mode === 'asset') {
      setEditedAsset(prev => {
        const newBindings = { ...prev.parameterVariableBindings };
        if (variableBinding === null) {
          // null の場合は削除
          delete newBindings[parameterName];
        } else {
          // string の場合は設定
          newBindings[parameterName] = variableBinding;
        }
        
        return {
          ...prev,
          parameterVariableBindings: newBindings,
        };
      });
      // パラメータ変数の変更時にプレビューを再生成
      setTimeout(() => generatePreviewSVG(), 100);
    }
  };

  const validateZIndex = (zIndex: number) => {
    if (!project || !page || mode === 'asset') {
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
        const validation = validateDynamicVectorAssetData(editedAsset);
        if (!validation.isValid) {
          alert(`保存に失敗しました: ${validation.errors.join(', ')}`);
          return;
        }
        onSaveAsset?.(editedAsset);
      } else if (mode === 'instance' && editedInstance) {
        const validation = validateDynamicVectorAssetInstanceData(editedInstance);
        if (!validation.isValid) {
          alert(`保存に失敗しました: ${validation.errors.join(', ')}`);
          return;
        }
        onSaveInstance?.(editedInstance);
      }
      onClose();
    } catch (error) {
      alert(`保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const currentPos = getCurrentPosition();
  const currentSize = getCurrentSize();
  const currentOpacity = getCurrentOpacity();
  const currentZIndex = getCurrentZIndex();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="dynamic-vector-edit-modal" onClick={(e) => e.stopPropagation()}>
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

        <div className="modal-content">
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
              {mode === 'asset' && customAssetInfo?.metadata?.params && (
                <div className="property-group">
                  <div className="parameters-section">
                    {Object.entries(customAssetInfo.metadata.params).map(([paramName, paramInfo], index) => {
                      // paramInfoの型アサーション
                      const param = paramInfo as { type: string; defaultValue: any; min?: number; max?: number; step?: number };
                      const currentValue = editedAsset.customAssetParameters?.[paramName] ?? param.defaultValue;
                      const variableBinding = editedAsset.parameterVariableBindings?.[paramName];
                      const displayName = `var_${index + 1}`;
                      
                      return (
                        <div key={paramName} className="parameter-row">
                          <div className="parameter-label">
                            <span className="parameter-display-name">{displayName}</span>
                            <span className="parameter-actual-name">({paramName})</span>
                          </div>
                          <div className="parameter-controls">
                            {param.type === 'number' ? (
                              <NumericInput
                                value={typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 0}
                                onChange={(value) => {
                                  const newParams = { ...editedAsset.customAssetParameters, [paramName]: value };
                                  handleCustomAssetParameterChange(newParams);
                                }}
                                min={param.min}
                                max={param.max}
                                step={param.step || 1}
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
                                {Object.entries(project.assets)
                                  .filter(([_, asset]) => asset.type === 'ValueAsset')
                                  .filter(([_, valueAsset]) => {
                                    const name = valueAsset.name;
                                    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
                                  })
                                  .map(([assetId, valueAsset]) => (
                                    <option key={assetId} value={valueAsset.name}>
                                      {valueAsset.name}
                                    </option>
                                  ))
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

          {/* フッター：アクションボタン */}
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
    </div>
  );
};

export default DynamicVectorEditModal;