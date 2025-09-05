import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type {
  DynamicVectorAsset,
  DynamicVectorAssetInstance,
  Page,
  ProjectData
} from '../../../types/entities';
import {
  getEffectiveZIndex,
  validateDynamicVectorAssetData,
  validateDynamicVectorAssetInstanceData
} from '../../../types/entities';
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

interface SVGExecutionResult {
  svg: string | null;
  error: string | null;
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

  // 編集中のデータ
  const [editedAsset, setEditedAsset] = useState<DynamicVectorAsset>(asset);
  const [editedInstance, setEditedInstance] = useState<DynamicVectorAssetInstance | null>(
    assetInstance || null
  );

  // SVG実行結果
  const [svgResult, setSvgResult] = useState<SVGExecutionResult>({ svg: null, error: null });
  const [isExecuting, setIsExecuting] = useState(false);

  // パラメータ値の状態管理
  const [parameterValues, setParameterValues] = useState<Record<string, number | string>>({});
  
  // CustomAssetの状態管理
  const [customAsset, setCustomAsset] = useState<any>(null);

  // バリデーション状態
  const [zIndexValidation, setZIndexValidation] = useState<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>({ isValid: true });

  // 実行タイマー用のref
  const executionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // CustomAssetを取得するuseEffect
  useEffect(() => {
    const fetchCustomAsset = async () => {
      if (asset.custom_asset_id) {
        try {
          const customAssetData = await window.electronAPI.customAsset.getAsset(asset.custom_asset_id);
          setCustomAsset(customAssetData);
        } catch (error) {
          console.error('Failed to fetch custom asset:', error);
        }
      }
    };

    fetchCustomAsset();
  }, [asset.custom_asset_id]);

  useEffect(() => {
    setEditedAsset(asset);
    setEditedInstance(assetInstance || null);

    // CustomAssetのパラメータ値を初期化
    const initialParams: Record<string, number | string> = {};
    if (asset.parameters) {
      Object.entries(asset.parameters).forEach(([key, value]) => {
        initialParams[key] = value;
      });
    }
    setParameterValues(initialParams);
  }, [asset, assetInstance]);

  // パラメータが変更されたときにSVGを再実行（デバウンス処理付き）
  const scheduleExecution = useCallback(() => {
    if (executionTimerRef.current) {
      clearTimeout(executionTimerRef.current);
    }

    executionTimerRef.current = setTimeout(() => {
      executeScript();
    }, 300);
  }, [customAsset, parameterValues]);

  useEffect(() => {
    if (customAsset && customAsset.script) {
      scheduleExecution();
    }
    return () => {
      if (executionTimerRef.current) {
        clearTimeout(executionTimerRef.current);
      }
    };
  }, [parameterValues, customAsset, scheduleExecution]);

  if (!isOpen || !project) return null;

  // スクリプト実行関数
  const executeScript = () => {
    if (!customAsset || !customAsset.script || !customAsset.script.trim()) {
      setSvgResult({ svg: null, error: null });
      return;
    }

    setIsExecuting(true);

    try {
      // パラメータを構築
      const scriptParameters = { ...parameterValues };

      // ページ変数を追加
      if (editedAsset.use_page_variables && page && project) {
        const pageIndex = project.pages.findIndex(p => p.id === page.id);
        scriptParameters['page_current'] = pageIndex + 1;
        scriptParameters['page_total'] = project.pages.length;
      }

      // ValueAsset変数を追加
      if (editedAsset.use_value_variables && page && project) {
        Object.values(project.assets).forEach(assetItem => {
          if (assetItem.type === 'ValueAsset') {
            const valueInstance = page.asset_instances[assetItem.id];
            let value = assetItem.initial_value;

            if (valueInstance && 'override_value' in valueInstance) {
              value = valueInstance.override_value ?? value;
            }

            scriptParameters[assetItem.name] = value;
          }
        });
      }

      // スクリプト実行
      const scriptFunction = new Function(...Object.keys(scriptParameters), customAsset.script);
      const result = scriptFunction(...Object.values(scriptParameters));

      if (typeof result === 'string') {
        setSvgResult({ svg: result, error: null });
      } else {
        setSvgResult({ svg: null, error: 'スクリプトは文字列を返す必要があります' });
      }
    } catch (error) {
      setSvgResult({
        svg: null,
        error: error instanceof Error ? error.message : 'スクリプトの実行でエラーが発生しました'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 現在の値を取得
  const getCurrentPosition = () => {
    if (mode === 'instance' && editedInstance) {
      return {
        x: editedInstance.override_pos_x ?? asset.default_pos_x,
        y: editedInstance.override_pos_y ?? asset.default_pos_y,
      };
    }
    return {
      x: editedAsset.default_pos_x,
      y: editedAsset.default_pos_y,
    };
  };

  const getCurrentSize = () => {
    if (mode === 'instance' && editedInstance) {
      return {
        width: editedInstance.override_width ?? asset.default_width,
        height: editedInstance.override_height ?? asset.default_height,
      };
    }
    return {
      width: editedAsset.default_width,
      height: editedAsset.default_height,
    };
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

  const currentPos = getCurrentPosition();
  const currentSize = getCurrentSize();
  const currentOpacity = getCurrentOpacity();
  const currentZIndex = getCurrentZIndex();

  // 値の更新
  const updatePosition = (x: number, y: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_pos_x: x,
        override_pos_y: y,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_pos_x: x,
        default_pos_y: y,
      }));
    }
  };

  const updateSize = (width: number, height: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_width: width,
        override_height: height,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_width: width,
        default_height: height,
      }));
    }
  };

  const updateOpacity = (opacity: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_opacity: opacity,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_opacity: opacity,
      }));
    }
  };

  const updateZIndex = (zIndex: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_z_index: zIndex,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_z_index: zIndex,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'instance' && editedInstance) {
      const validation = validateDynamicVectorAssetInstanceData(editedInstance);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      if (onSaveInstance) {
        onSaveInstance(editedInstance);
      }
    } else if (mode === 'asset') {
      const updatedAsset = {
        ...editedAsset,
        parameters: { ...parameterValues },
      };

      const validation = validateDynamicVectorAssetData(updatedAsset);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      if (onSaveAsset) {
        onSaveAsset(updatedAsset);
      }
    }
    onClose();
  };

  // パラメータ変更ハンドラー
  const handleParameterChange = (paramName: string, value: number | string) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const modalTitle = mode === 'instance'
    ? `DynamicVectorAssetInstance 編集: ${asset.name}`
    : `DynamicVectorAsset 編集: ${asset.name}`;

  // CustomAssetのパラメータ情報を取得（配列として処理）
  const assetParameters = asset.parameters || {};
  const hasParameters = Object.keys(assetParameters).length > 0;

  return (
    <div className="dve-modal-overlay">
      <div className="dve-modal">
        <div className="dve-modal-header">
          <h2>{modalTitle}</h2>
          <button className="dve-close-button" onClick={onClose}>×</button>
        </div>

        <div className="dve-modal-content">
          <div className="dve-edit-layout">
            {/* 左側: プレビューパネル */}
            <div className="dve-preview-panel">
              <div className="dve-preview-container">
                <div className="dve-canvas-frame" style={{
                  position: 'relative',
                  width: `${project.canvas.width * 0.35}px`,
                  height: `${project.canvas.height * 0.35}px`,
                  border: '2px solid #007bff',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  backgroundColor: '#f8f9fa'
                }}>
                  {/* SVG描画結果 */}
                  {svgResult.svg ? (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${currentPos.x * 0.35}px`,
                        top: `${currentPos.y * 0.35}px`,
                        width: `${currentSize.width * 0.35}px`,
                        height: `${currentSize.height * 0.35}px`,
                        opacity: currentOpacity,
                        zIndex: 1,
                      }}
                    >
                      <svg
                        width={currentSize.width * 0.35}
                        height={currentSize.height * 0.35}
                        viewBox={`0 0 ${currentSize.width} ${currentSize.height}`}
                        style={{ width: '100%', height: '100%' }}
                        dangerouslySetInnerHTML={{ __html: svgResult.svg }}
                      />
                    </div>
                  ) : svgResult.error ? (
                    <div className="dve-error-display">
                      <div className="dve-error-icon">⚠️</div>
                      <div className="dve-error-message">{svgResult.error}</div>
                    </div>
                  ) : (
                    <div className="dve-empty-preview">
                      <div className="dve-empty-icon">📝</div>
                      <div className="dve-empty-message">スクリプトを入力してください</div>
                    </div>
                  )}

                  {/* 実行中インジケーター */}
                  {isExecuting && (
                    <div className="dve-execution-indicator">
                      <div className="dve-spinner"></div>
                      <span>実行中...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右側: 設定パネル */}
            <div className="dve-settings-panel">
              {/* Asset Name（Asset編集時のみ） */}
              {mode === 'asset' && (
                <div className="dve-param-group">
                  <div className="dve-name-section">
                    <span>Name</span>
                    <input
                      type="text"
                      value={editedAsset.name}
                      onChange={(e) => setEditedAsset(prev => ({ ...prev, name: e.target.value }))}
                      className="dve-name-input"
                    />
                  </div>
                </div>
              )}

              {/* パラメータ編集（@parametersがある場合のみ） */}
              {hasParameters && (
                <div className="dve-param-group">
                  <div className="dve-parameters-section">
                    <span>@parameters</span>
                    <div className="dve-parameters-list">
                      {Object.entries(assetParameters).map(([paramName, paramValue], index: number) => {
                        const isNumber = typeof paramValue === 'number';
                        return (
                          <div key={paramName} className="dve-parameter-row">
                            <div className="dve-parameter-info">
                              <label className="dve-parameter-name">{paramName}</label>
                              <span className="dve-parameter-type">({isNumber ? 'number' : 'string'})</span>
                            </div>
                            <div className="dve-parameter-input">
                              {isNumber ? (
                                <input
                                  type="number"
                                  value={parameterValues[paramName] || paramValue || 0}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value)) {
                                      handleParameterChange(paramName, value);
                                      scheduleExecution();
                                    }
                                  }}
                                  onBlur={() => scheduleExecution()}
                                  className="dve-number-input"
                                  step="any"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={parameterValues[paramName] || paramValue || ''}
                                  onChange={(e) => {
                                    handleParameterChange(paramName, e.target.value);
                                    scheduleExecution();
                                  }}
                                  onBlur={() => scheduleExecution()}
                                  className="dve-text-input"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* PosX / PosY */}
              <div className="dve-param-group">
                <div className="dve-position-section">
                  <span>PosX / PosY</span>
                  <div className="dve-input-row">
                    <input
                      type="number"
                      value={currentPos.x}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          updatePosition(value, currentPos.y);
                        }
                      }}
                      className="dve-number-input"
                      step="0.01"
                    />
                    <input
                      type="number"
                      value={currentPos.y}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          updatePosition(currentPos.x, value);
                        }
                      }}
                      className="dve-number-input"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Width / Height */}
              <div className="dve-param-group">
                <div className="dve-size-section">
                  <span>Width / Height</span>
                  <div className="dve-input-row">
                    <input
                      type="number"
                      value={currentSize.width}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          updateSize(value, currentSize.height);
                        }
                      }}
                      className="dve-number-input"
                      step="0.01"
                      min="0"
                    />
                    <input
                      type="number"
                      value={currentSize.height}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          updateSize(currentSize.width, value);
                        }
                      }}
                      className="dve-number-input"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Opacity */}
              <div className="dve-param-group">
                <div className="dve-opacity-section">
                  <span>Opacity</span>
                  <div className="dve-opacity-controls">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={currentOpacity}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        updateOpacity(value);
                      }}
                      className="dve-opacity-slider"
                    />
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={currentOpacity}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          const clampedValue = Math.max(0, Math.min(1, value));
                          updateOpacity(clampedValue);
                        }
                      }}
                      className="dve-opacity-number"
                    />
                  </div>
                </div>
              </div>

              {/* Z-Index */}
              <div className="dve-param-group">
                <div className="dve-zindex-section">
                  <span>Z-Index</span>
                  <span className="dve-zindex-hint">(layer order: lower = background)</span>
                  <input
                    type="number"
                    value={currentZIndex}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        updateZIndex(value);
                      }
                    }}
                    className="dve-zindex-input"
                  />
                  {zIndexValidation.warning && (
                    <div className="dve-validation-warning">{zIndexValidation.warning}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dve-modal-footer">
          <button type="button" onClick={onClose} className="dve-button-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="dve-button-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
