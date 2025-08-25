import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { NumericInput } from '../common/NumericInput';
import type { DynamicVectorAsset, DynamicVectorAssetInstance, Page, ProjectData } from '../../../types/entities';
import { getEffectiveZIndex, validateDynamicVectorAssetData, validateDynamicVectorAssetInstanceData } from '../../../types/entities';
import './DynamicVectorEditModal.css';

// 編集モードの種類
type EditMode = 'asset' | 'instance';

interface DynamicVectorEditModalProps {
  mode: EditMode;
  asset: DynamicVectorAsset;
  assetInstance?: DynamicVectorAssetInstance;
  page?: Page;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsset?: (updatedAsset: DynamicVectorAsset) => void;
  onSaveInstance?: (updatedInstance: DynamicVectorAssetInstance) => void;
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
  
  // 編集中のデータ（モードに応じて切り替え）
  const [editedAsset, setEditedAsset] = useState<DynamicVectorAsset>(asset);
  const [editedInstance, setEditedInstance] = useState<DynamicVectorAssetInstance | null>(
    assetInstance || null
  );

  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
  const [zIndexValidation, setZIndexValidation] = useState<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>({ isValid: true });

  // SVG実行結果
  const [svgResult, setSvgResult] = useState<SVGExecutionResult>({ svg: null, error: null });
  const [isExecuting, setIsExecuting] = useState(false);

  // パラメータ値の状態管理
  const [parameterValues, setParameterValues] = useState<Record<string, number | string>>({});

  // 実行タイマー用のref
  const executionTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setEditedAsset(asset);
    setEditedInstance(assetInstance || null);
    
    // CustomAssetのパラメータ値を初期化
    const initialParams: Record<string, number | string> = {};
    if (asset.customAssetParameters) {
      Object.entries(asset.customAssetParameters).forEach(([key, value]) => {
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
    }, 300); // 300ms後に実行
  }, [parameterValues, editedAsset.script]);

  useEffect(() => {
    scheduleExecution();
    return () => {
      if (executionTimerRef.current) {
        clearTimeout(executionTimerRef.current);
      }
    };
  }, [scheduleExecution]);

  if (!isOpen || !project) return null;

  // スクリプト実行関数
  const executeScript = () => {
    if (!editedAsset.script.trim()) {
      setSvgResult({ svg: null, error: null });
      return;
    }

    setIsExecuting(true);

    try {
      // パラメータを構築
      const scriptParameters = { ...parameterValues };
      
      // ページ変数を追加（use_page_variablesがtrueの場合）
      if (editedAsset.use_page_variables && page && project) {
        const pageIndex = project.pages.findIndex(p => p.id === page.id);
        scriptParameters['page_current'] = pageIndex + 1;
        scriptParameters['page_total'] = project.pages.length;
      }

      // ValueAsset変数を追加（use_value_variablesがtrueの場合）
      if (editedAsset.use_value_variables && page && project) {
        // ValueAssetの値を取得して変数として追加
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

      // スクリプト実行用の関数を作成
      const scriptFunction = new Function(...Object.keys(scriptParameters), editedAsset.script);
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

  // 現在の値を取得（Asset vs Instance）
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

  // 値の更新（Asset vs Instance）
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

  // z_index専用のサニタイズ関数（整数のみ）
  const sanitizeZIndexInput = (value: string): string => {
    // 数字と-のみを許可（小数点は除外）
    let sanitized = value.replace(/[^0-9\-]/g, '');
    
    // 最初の文字以外の-を除去
    if (sanitized.indexOf('-') > 0) {
      sanitized = sanitized.replace(/-/g, '');
      if (value.startsWith('-')) {
        sanitized = '-' + sanitized;
      }
    }
    
    return sanitized;
  };

  // z_indexバリデーション関数
  const validateZIndexValue = (value: string): {
    isValid: boolean;
    error?: string;
    warning?: string;
  } => {
    const numValue = parseInt(value.trim());
    
    // 空文字列または無効な数値
    if (isNaN(numValue)) {
      return {
        isValid: false,
        error: 'z-indexは数値である必要があります'
      };
    }
    
    // 範囲チェック（-9999 〜 9999）
    if (numValue < -9999 || numValue > 9999) {
      return {
        isValid: false,
        error: 'z-indexは-9999から9999の範囲で入力してください'
      };
    }
    
    // 競合チェック（同じページ内での重複）
    let warning: string | undefined;
    if (page && project) {
      const conflicts: string[] = [];
      
      Object.values(page.asset_instances).forEach((instance) => {
        // 自分自身は除外
        if (instance.id === assetInstance?.id) return;
        
        const instanceAsset = project.assets[instance.asset_id];
        if (!instanceAsset) return;
        
        const effectiveZIndex = getEffectiveZIndex(instanceAsset, instance);
        
        if (effectiveZIndex === numValue) {
          const assetName = instanceAsset.name || instanceAsset.id;
          conflicts.push(assetName);
        }
      });
      
      if (conflicts.length > 0) {
        warning = `同じz-indexを持つアセット: ${conflicts.join(', ')}`;
      }
    }
    
    return {
      isValid: true,
      warning
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'instance' && editedInstance) {
      // DynamicVectorAssetInstanceの全体バリデーション
      const validation = validateDynamicVectorAssetInstanceData(editedInstance);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      if (onSaveInstance) {
        onSaveInstance(editedInstance);
      }
    } else if (mode === 'asset') {
      // パラメータ値を保存
      const updatedAsset = {
        ...editedAsset,
        customAssetParameters: { ...parameterValues },
      };
      
      // DynamicVectorAssetの全体バリデーション
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

  // Enterキーでフォーカスを外すハンドラー
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
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

  // CustomAssetのパラメータ情報を取得
  const customAssetParams = asset.customAssetInfo?.parameters || {};
  const hasParameters = Object.keys(customAssetParams).length > 0;

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
                      onKeyDown={handleKeyDown}
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
                      {Object.entries(customAssetParams).map(([paramName, paramDef]: [string, any]) => (
                        <div key={paramName} className="dve-parameter-row">
                          <div className="dve-parameter-info">
                            <label className="dve-parameter-name">{paramName}</label>
                            <span className="dve-parameter-type">({paramDef.type || 'any'})</span>
                          </div>
                          <div className="dve-parameter-input">
                            {paramDef.type === 'number' ? (
                              <input
                                type="number"
                                value={parameterValues[paramName] || paramDef.default || 0}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  if (!isNaN(value)) {
                                    handleParameterChange(paramName, value);
                                  }
                                }}
                                onBlur={() => {
                                  // フォーカスアウト時に再実行をスケジュール
                                  scheduleExecution();
                                }}
                                className="dve-number-input"
                                step="any"
                              />
                            ) : (
                              <input
                                type="text"
                                value={parameterValues[paramName] || paramDef.default || ''}
                                onChange={(e) => {
                                  handleParameterChange(paramName, e.target.value);
                                }}
                                onBlur={() => {
                                  // フォーカスアウト時に再実行をスケジュール
                                  scheduleExecution();
                                }}
                                className="dve-text-input"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 位置設定 */}
              <div className="dve-param-group">
                <div className="dve-size-display">
                  <span>PosX / PosY</span>
                  <div className="dve-size-inputs">
                    <NumericInput
                      value={currentPos.x}
                      onChange={(value) => {
                        updatePosition(value, currentPos.y);
                      }}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                    <NumericInput
                      value={currentPos.y}
                      onChange={(value) => {
                        updatePosition(currentPos.x, value);
                      }}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                  </div>
                </div>
              </div>

              {/* サイズ設定 */}
              <div className="dve-param-group">
                <div className="dve-size-display">
                  <span>Width / Height</span>
                  <div className="dve-size-inputs">
                    <NumericInput
                      value={currentSize.width}
                      onChange={(value) => {
                        updateSize(value, currentSize.height);
                      }}
                      min={0.01}
                      decimals={2}
                      className="small"
                    />
                    <NumericInput
                      value={currentSize.height}
                      onChange={(value) => {
                        updateSize(currentSize.width, value);
                      }}
                      min={0.01}
                      decimals={2}
                      className="small"
                    />
                  </div>
                </div>
              </div>

              {/* 透明度 */}
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
                      onChange={(e) => updateOpacity(parseFloat(e.target.value))}
                      className="dve-opacity-slider"
                    />
                    <span className="dve-opacity-value">{currentOpacity.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Z-Index */}
              <div className="dve-param-group">
                <div className="dve-z-index-section">
                  <span>Z-Index</span>
                  <div className="dve-z-index-controls">
                    <input
                      type="text"
                      value={tempInputValues.z_index ?? currentZIndex.toString()}
                      onChange={(e) => {
                        const sanitized = sanitizeZIndexInput(e.target.value);
                        setTempInputValues(prev => ({ ...prev, z_index: sanitized }));
                        
                        // バリデーション実行
                        const validation = validateZIndexValue(sanitized);
                        setZIndexValidation(validation);
                      }}
                      onBlur={(e) => {
                        const validated = parseInt(e.target.value) || currentZIndex;
                        updateZIndex(validated);
                        setTempInputValues(prev => {
                          const newTemp = { ...prev };
                          delete newTemp.z_index;
                          return newTemp;
                        });
                      }}
                      onKeyDown={handleKeyDown}
                      className={`dve-z-index-input ${
                        !zIndexValidation.isValid ? 'error' : 
                        zIndexValidation.warning ? 'warning' : ''
                      }`}
                    />
                    <span className={`dve-z-index-info ${
                      !zIndexValidation.isValid ? 'error' : 
                      zIndexValidation.warning ? 'warning' : ''
                    }`}>
                      {!zIndexValidation.isValid && zIndexValidation.error ? 
                        zIndexValidation.error :
                        zIndexValidation.warning ? 
                        zIndexValidation.warning :
                        mode === 'instance' && editedInstance?.override_z_index !== undefined 
                          ? `(overriding default: ${asset.default_z_index})`
                          : mode === 'instance' 
                          ? `(using default: ${asset.default_z_index})`
                          : '(layer order: lower = background)'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dve-modal-footer">
          <button type="button" onClick={onClose} className="dve-btn-secondary">
            キャンセル
          </button>
          <button type="button" onClick={handleSubmit} className="dve-btn-primary">
            保存
          </button>
        </div>
      </div>
    </div>
  );
};