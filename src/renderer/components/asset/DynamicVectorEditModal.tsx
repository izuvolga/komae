import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type {
  DynamicVectorAsset,
  DynamicVectorAssetInstance,
  Page,
  ProjectData,
  ValueAssetInstance
} from '../../../types/entities';
import {
  getEffectiveZIndex,
  validateDynamicVectorAssetData,
  validateDynamicVectorAssetInstanceData
} from '../../../types/entities';
import { 
  generateResizeHandles, 
  convertMouseDelta, 
  constrainToCanvas, 
  EDIT_MODAL_SCALE,
  getCurrentPosition,
  getCurrentSize,
  getCurrentOpacity,
  getCurrentZIndex,
  wrapSVGWithParentContainer
} from '../../utils/editModalUtils';
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
  
  // ValueAsset参照の状態管理
  const [parameterBindings, setParameterBindings] = useState<Record<string, string>>({});
  
  // CustomAssetの状態管理
  const [customAsset, setCustomAsset] = useState<any>(null);
  
  // ValueAssetの一覧
  const [availableValueAssets, setAvailableValueAssets] = useState<{
    string: Array<{ id: string; name: string; value: any }>;
    number: Array<{ id: string; name: string; value: any }>;
  }>({ string: [], number: [] });

  // バリデーション状態
  const [zIndexValidation, setZIndexValidation] = useState<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>({ isValid: true });

  // マウス操作関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartValues, setDragStartValues] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

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

  // ValueAsset一覧を取得・更新する関数
  const updateAvailableValueAssets = useCallback(() => {
    if (!project) {
      setAvailableValueAssets({ string: [], number: [] });
      return;
    }

    // Asset編集モードの場合、pageがなくても進行できるように修正
    const instanceMemo = new Map<string, ValueAssetInstance>();
    if (mode === 'instance') {
      if (page) {
        Object.values(page.asset_instances).forEach(instance => {
          if (instance.asset_id) {
            instanceMemo.set(instance.asset_id, instance);
          }
        });
      } else {
        setAvailableValueAssets({ string: [], number: [] });
        return;
      }
    }

    const stringAssets: Array<{ id: string; name: string; value: any }> = [];
    const numberAssets: Array<{ id: string; name: string; value: any }> = [];

    Object.values(project.assets).forEach(assetItem => {
      if (assetItem.type === 'ValueAsset') {
        let currentValue: any;
        
        if (mode === 'instance' && page) {
          // Instance編集モード: ページの値を優先
          // const valueInstance = Object.values(page.asset_instances).find(instance => instance.asset_id === assetItem.id);
          const valueInstance = instanceMemo.get(assetItem.id);
          if (valueInstance && 'override_value' in valueInstance) {
            currentValue = valueInstance.override_value ?? assetItem.initial_value;
          } else {
            currentValue = assetItem.initial_value;
          }
        } else {
          // Asset編集モード: initial_valueを使用
          currentValue = assetItem.initial_value;
        }

        const valueAssetInfo = {
          id: assetItem.id,
          name: assetItem.name,
          value: currentValue
        };

        if (assetItem.value_type === 'string') {
          stringAssets.push(valueAssetInfo);
        } else if (assetItem.value_type === 'number') {
          numberAssets.push(valueAssetInfo);
        }
      }
    });

    setAvailableValueAssets({ string: stringAssets, number: numberAssets });
  }, [project, page, mode]);

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

    // parameter_variable_bindingsを初期化
    setParameterBindings(asset.parameter_variable_bindings || {});

    // ValueAsset一覧を更新
    updateAvailableValueAssets();
  }, [asset, assetInstance, updateAvailableValueAssets]);

  // Shiftキーの状態を監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // マウス移動とマウスアップのハンドラー（グローバルイベント）
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!project) return;
      
      if (isDragging) {
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y);
        const currentSizeForDrag = getCurrentSize(mode, editedAsset, editedInstance);
        
        const constrained = constrainToCanvas(
          dragStartValues.x + deltaX,
          dragStartValues.y + deltaY,
          currentSizeForDrag.width,
          currentSizeForDrag.height,
          project.canvas.width,
          project.canvas.height
        );
        
        updatePosition(constrained.x, constrained.y);
      } else if (isResizing && resizeHandle) {
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y);
        
        let newWidth = dragStartValues.width;
        let newHeight = dragStartValues.height;
        let newX = dragStartValues.x;
        let newY = dragStartValues.y;

        if (resizeHandle.includes('right')) {
          newWidth = Math.max(10, dragStartValues.width + deltaX);
        } else if (resizeHandle.includes('left')) {
          newWidth = Math.max(10, dragStartValues.width - deltaX);
          newX = dragStartValues.x + deltaX;
        }

        if (resizeHandle.includes('bottom')) {
          newHeight = Math.max(10, dragStartValues.height + deltaY);
        } else if (resizeHandle.includes('top')) {
          newHeight = Math.max(10, dragStartValues.height - deltaY);
          newY = dragStartValues.y + deltaY;
        }

        // 縦横比維持: Shiftキーが押されている場合
        if (isShiftPressed) {
          const aspectRatio = editedAsset.default_width / editedAsset.default_height;
          
          if (resizeHandle.includes('right') || resizeHandle.includes('left')) {
            newHeight = newWidth / aspectRatio;
            // 上端をドラッグしている場合は、位置も調整
            if (resizeHandle.includes('top')) {
              newY = dragStartValues.y + dragStartValues.height - newHeight;
            }
          } else {
            newWidth = newHeight * aspectRatio;
            // 左端をドラッグしている場合は、位置も調整
            if (resizeHandle.includes('left')) {
              newX = dragStartValues.x + dragStartValues.width - newWidth;
            }
          }
        }

        const constrained = constrainToCanvas(newX, newY, newWidth, newHeight, project.canvas.width, project.canvas.height);

        updatePosition(constrained.x, constrained.y);
        updateSize(constrained.width, constrained.height);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStartPos, dragStartValues, resizeHandle, isShiftPressed, project?.canvas]);

  // パラメータが変更されたときにSVGを再実行（デバウンス処理付き）
  const scheduleExecution = useCallback(() => {
    if (executionTimerRef.current) {
      clearTimeout(executionTimerRef.current);
    }

    executionTimerRef.current = setTimeout(async () => {
      await executeScript();
    }, 300);
  }, [customAsset, parameterValues]);;

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
  const executeScript = async () => {
    if (!customAsset) {
      setSvgResult({ svg: null, error: null });
      return;
    }

    setIsExecuting(true);

    try {
      // パラメータを構築（ValueAsset参照を考慮した値解決）
      const scriptParameters: Record<string, number | string> = {};
      
      // 各パラメータの値を解決
      Object.keys(parameterValues).forEach(paramName => {
        scriptParameters[paramName] = resolveParameterValue(paramName);
      });

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

      // MainプロセスのCustomAssetManager.generateCustomAssetSVGを呼び出し
      const result = await window.electronAPI.customAsset.generateSVG(
        customAsset.id,
        scriptParameters
      );

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

  // 現在の値を取得 - 共通ユーティリティを使用

  const currentPos = getCurrentPosition(mode, editedAsset, editedInstance);
  const currentSize = getCurrentSize(mode, editedAsset, editedInstance);
  const currentOpacity = getCurrentOpacity(mode, editedAsset, editedInstance);
  const currentZIndex = getCurrentZIndex(mode, editedAsset, editedInstance);

  // SVGを親SVG要素でラップして位置・サイズ・不透明度を制御 - 共通ユーティリティを使用

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
        parameter_variable_bindings: Object.keys(parameterBindings).length > 0 ? parameterBindings : undefined,
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

  // マウス操作のハンドラー
  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const canvasRect = document.querySelector('.dve-canvas-frame')?.getBoundingClientRect();
    if (!canvasRect) return;
    
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({
      x: currentPos.x,
      y: currentPos.y,
      width: currentSize.width,
      height: currentSize.height
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({
      x: currentPos.x,
      y: currentPos.y,
      width: currentSize.width,
      height: currentSize.height
    });
  };

  // ValueAsset参照による値解決
  const resolveParameterValue = useCallback((paramName: string): number | string => {
    // ValueAsset参照がある場合
    if (parameterBindings[paramName] && project) {
      const valueAssetId = parameterBindings[paramName];
      const valueAsset = project.assets[valueAssetId];
      
      if (valueAsset && valueAsset.type === 'ValueAsset') {
        if (mode === 'instance' && page) {
          // Instance編集: 現在ページでの値: asset_instancesの中から、asset_idがvalueAssetIdと一致するものを探す
          const valueInstance = Object.values(page.asset_instances).find(instance => instance.asset_id === valueAssetId);
          if (valueInstance && 'override_value' in valueInstance) {
            return valueInstance.override_value ?? valueAsset.initial_value;
          }
        }
        // Asset編集 or Instance編集でもoverride値がない場合: initial_value
        return valueAsset.initial_value;
      }
    }
    
    // 直接入力値を使用
    return parameterValues[paramName] ?? '';
  }, [parameterBindings, parameterValues, project, page, mode]);

  // パラメータ変更ハンドラー
  const handleParameterChange = (paramName: string, value: number | string) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  // ValueAsset参照の変更ハンドラー
  const handleParameterBindingChange = (paramName: string, valueAssetId: string) => {
    if (valueAssetId === '') {
      // 「直接入力」を選択
      setParameterBindings(prev => {
        const newBindings = { ...prev };
        delete newBindings[paramName];
        return newBindings;
      });
    } else {
      // ValueAssetを選択
      setParameterBindings(prev => ({
        ...prev,
        [paramName]: valueAssetId,
      }));
    }
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
                  width: `${project.canvas.width * EDIT_MODAL_SCALE}px`,
                  height: `${project.canvas.height * EDIT_MODAL_SCALE}px`,
                  border: '2px solid #007bff',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  backgroundColor: '#f8f9fa'
                }}>
                  {/* SVG描画結果: wrapDynamicVectorSVG と同様 */}
                  {svgResult.svg ? (
                    <svg
                      width='100%'
                      height='100%'
                      viewBox={`0 0 ${project.canvas.width} ${project.canvas.height}`}
                      xmlns="http://www.w3.org/2000/svg"
                      dangerouslySetInnerHTML={{ __html: `${wrapSVGWithParentContainer(
                        svgResult.svg,
                        currentPos.x,
                        currentPos.y,
                        currentSize.width,
                        currentSize.height,
                        currentOpacity,
                        editedAsset.original_width,
                        editedAsset.original_height)}` }}
                      />
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

                  {/* インタラクション用の透明な要素（ドラッグエリア） */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${currentPos.x * EDIT_MODAL_SCALE}px`,
                      top: `${currentPos.y * EDIT_MODAL_SCALE}px`,
                      width: `${currentSize.width * EDIT_MODAL_SCALE}px`,
                      height: `${currentSize.height * EDIT_MODAL_SCALE}px`,
                      backgroundColor: 'transparent',
                      border: '1px dashed #007acc',
                      cursor: 'move',
                      zIndex: 2,
                      pointerEvents: 'all',
                    }}
                    onMouseDown={handleImageMouseDown}
                  />

                  {/* SVGベースのリサイズハンドル */}
                  <svg
                    style={{
                      position: 'absolute',
                      left: '0px',
                      top: '0px',
                      width: `${project.canvas.width * EDIT_MODAL_SCALE}px`,
                      height: `${project.canvas.height * EDIT_MODAL_SCALE}px`,
                      zIndex: 3,
                      pointerEvents: 'none',
                    }}
                  >
                    {generateResizeHandles(currentPos, currentSize, handleResizeMouseDown)}
                  </svg>
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
                        const isBindingSet = parameterBindings[paramName];
                        const resolvedValue = resolveParameterValue(paramName);
                        const availableAssets = isNumber ? availableValueAssets.number : availableValueAssets.string;
                        
                        return (
                          <div key={paramName} className="dve-parameter-row">
                            <div className="dve-parameter-info">
                              <label className="dve-parameter-name">{paramName}</label>
                              <span className="dve-parameter-type">({isNumber ? 'number' : 'string'})</span>
                            </div>
                            <div className="dve-parameter-input">
                              <div className="dve-parameter-input-field">
                                {isNumber ? (
                                  <input
                                    type="number"
                                    value={isBindingSet ? resolvedValue : (parameterValues[paramName] || paramValue || 0)}
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
                                    disabled={!!isBindingSet}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={isBindingSet ? resolvedValue : (parameterValues[paramName] || paramValue || '')}
                                    onChange={(e) => {
                                      handleParameterChange(paramName, e.target.value);
                                      scheduleExecution();
                                    }}
                                    onBlur={() => scheduleExecution()}
                                    className="dve-text-input"
                                    disabled={!!isBindingSet}
                                  />
                                )}
                              </div>
                              <select
                                value={parameterBindings[paramName] || ''}
                                onChange={(e) => {
                                  handleParameterBindingChange(paramName, e.target.value);
                                  scheduleExecution();
                                }}
                                className="dve-parameter-dropdown"
                              >
                                <option value="">直接入力</option>
                                {availableAssets.map(valueAsset => (
                                  <option key={valueAsset.id} value={valueAsset.id}>
                                    {valueAsset.name} ({valueAsset.value})
                                  </option>
                                ))}
                              </select>
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

              {/* Original Width / Height (Default values, read-only) */}
              <div className="dve-param-group">
                <div className="dve-size-section">
                  <span>Original Width / Height</span>
                  <div className="dve-input-row">
                    <input
                      type="number"
                      value={editedAsset.original_width}
                      disabled
                      className="dve-number-input dve-readonly"
                    />
                    <input
                      type="number"
                      value={editedAsset.original_height}
                      disabled
                      className="dve-number-input dve-readonly"
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
