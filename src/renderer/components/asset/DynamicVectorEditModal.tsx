import React, { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { NumericInput } from '../common/NumericInput';
import type { DynamicVectorAsset, DynamicVectorAssetInstance, Page } from '../../../types/entities';
import { 
  getEffectiveZIndex, 
  validateDynamicVectorAssetData, 
  validateDynamicVectorAssetInstanceData 
} from '../../../types/entities';
import { 
  executeScript, 
  createExecutionContext, 
  wrapSVGContent,
  type ScriptExecutionResult 
} from '../../../utils/dynamicVectorEngine';
import './DynamicVectorEditModal.css';

// 編集モードの種類
type EditMode = 'asset' | 'instance';

// 統合されたプロパティ
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

  const [zIndexValidation, setZIndexValidation] = useState<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>({ isValid: true });

  // スクリプト関連の状態
  const [scriptExecutionResult, setScriptExecutionResult] = useState<ScriptExecutionResult | null>(null);
  const [previewSVG, setPreviewSVG] = useState<string>('');
  const [showConsole, setShowConsole] = useState(false);

  // プレビュー更新のデバウンス用
  const [previewUpdateTimer, setPreviewUpdateTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setEditedAsset(asset);
    setEditedInstance(assetInstance || null);
  }, [asset, assetInstance]);

  if (!isOpen || !project) return null;

  // 現在のページインデックスを取得
  const getCurrentPageIndex = useCallback(() => {
    if (!project || !page) return 0;
    return project.pages.findIndex(p => p.id === page.id);
  }, [project, page]);

  // プレビュー更新関数
  const updatePreview = useCallback((script: string) => {
    if (!project) return;

    const pageIndex = getCurrentPageIndex();
    const context = createExecutionContext(editedAsset, project, pageIndex);
    
    // スクリプト実行
    const result = executeScript(script, context);
    setScriptExecutionResult(result);

    if (result.success && result.svgContent) {
      // SVGをラップしてプレビュー用に準備
      const wrappedSVG = wrapSVGContent(result.svgContent, editedAsset.default_width, editedAsset.default_height);
      setPreviewSVG(wrappedSVG);
    } else {
      setPreviewSVG('');
    }
  }, [editedAsset, project, getCurrentPageIndex]);

  // デバウンス付きプレビュー更新
  const debouncedUpdatePreview = useCallback((script: string) => {
    if (previewUpdateTimer) {
      clearTimeout(previewUpdateTimer);
    }
    
    const timer = setTimeout(() => {
      updatePreview(script);
    }, 500); // 500ms後に更新
    
    setPreviewUpdateTimer(timer);
  }, [previewUpdateTimer, updatePreview]);

  // 初回プレビュー生成
  useEffect(() => {
    if (isOpen) {
      updatePreview(editedAsset.script);
    }
  }, [isOpen, updatePreview, editedAsset.script]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (previewUpdateTimer) {
        clearTimeout(previewUpdateTimer);
      }
    };
  }, [previewUpdateTimer]);

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

  // 値更新ハンドラー
  const handleNameChange = (value: string) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        name: value,
      }));
    }
  };

  const handleScriptChange = (value: string) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        script: value,
      }));
    }
    // プレビューをデバウンス更新
    debouncedUpdatePreview(value);
  };

  const handleUsePageVariablesChange = (checked: boolean) => {
    if (mode === 'asset') {
      const updatedAsset = {
        ...editedAsset,
        use_page_variables: checked,
      };
      setEditedAsset(updatedAsset);
      // プレビューを即座に更新
      updatePreview(updatedAsset.script);
    }
  };

  const handleUseValueVariablesChange = (checked: boolean) => {
    if (mode === 'asset') {
      const updatedAsset = {
        ...editedAsset,
        use_value_variables: checked,
      };
      setEditedAsset(updatedAsset);
      // プレビューを即座に更新
      updatePreview(updatedAsset.script);
    }
  };

  const handlePositionChange = (field: 'x' | 'y', value: number) => {
    if (mode === 'asset') {
      setEditedAsset(prev => ({
        ...prev,
        [`default_pos_${field}`]: value,
      }));
    } else if (editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        [`override_pos_${field}`]: value,
      } : null);
    }
  };

  const handleSizeChange = (field: 'width' | 'height', value: number) => {
    if (mode === 'asset') {
      const updatedAsset = {
        ...editedAsset,
        [`default_${field}`]: value,
      };
      setEditedAsset(updatedAsset);
      // サイズ変更時はプレビューを更新（SVGのラッピングサイズが変わるため）
      updatePreview(updatedAsset.script);
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

  const validateZIndex = (zIndex: number) => {
    if (!project || !page) {
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
      onClose(); // 保存後にモーダルを閉じる
    } catch (error) {
      alert(`保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const currentPos = getCurrentPosition();
  const currentSize = getCurrentSize();
  const currentOpacity = getCurrentOpacity();
  const currentZIndex = getCurrentZIndex();

  // 行番号付きテキストエリアのヘルパー関数
  const getLineNumbers = (text: string): string => {
    const lines = text.split('\n');
    return Array.from({ length: lines.length }, (_, i) => i + 1).join('\n');
  };

  return (
    <div className="modal-overlay">
      <div className="dynamic-vector-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {mode === 'asset' ? 'Dynamic SVGアセット編集' : 'Dynamic SVGインスタンス編集'}
            {mode === 'instance' && page && ` - ${page.title}`}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="edit-panels">
            {/* 左側：スクリプトエディタ */}
            <div className="script-panel">
              <div className="script-header">
                <h3>JavaScript スクリプト</h3>
                <div className="script-controls">
                  <button 
                    className={`console-toggle ${showConsole ? 'active' : ''}`}
                    onClick={() => setShowConsole(!showConsole)}
                  >
                    Console
                  </button>
                </div>
              </div>
              
              {/* 変数設定 */}
              {mode === 'asset' && (
                <div className="variable-settings">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editedAsset.use_page_variables}
                      onChange={(e) => handleUsePageVariablesChange(e.target.checked)}
                    />
                    ページ変数を使用 (page_current, page_total)
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editedAsset.use_value_variables}
                      onChange={(e) => handleUseValueVariablesChange(e.target.checked)}
                    />
                    ValueAsset変数を使用
                  </label>
                </div>
              )}

              {/* スクリプトエディタ */}
              <div className="script-editor-container">
                <div className="line-numbers">
                  <pre>{getLineNumbers(editedAsset.script)}</pre>
                </div>
                <textarea
                  className="script-editor"
                  value={editedAsset.script}
                  onChange={(e) => handleScriptChange(e.target.value)}
                  placeholder={'// SVG要素を返すJavaScriptを記述してください\n// 例:\nreturn \'<circle cx="50" cy="50" r="25" fill="red" />\';\n// 利用可能な変数:\n// - page_current, page_total (ページ変数が有効な場合)\n// - ValueAsset名 (Value変数が有効な場合)'}
                  spellCheck={false}
                  disabled={mode === 'instance'}
                />
              </div>

              {/* エラー・警告表示 */}
              {scriptExecutionResult && !scriptExecutionResult.success && (
                <div className="execution-error">
                  <h4>実行エラー</h4>
                  <p>{scriptExecutionResult.error}</p>
                  {scriptExecutionResult.debugInfo?.lineNumber && (
                    <p>行 {scriptExecutionResult.debugInfo.lineNumber}</p>
                  )}
                </div>
              )}

              {scriptExecutionResult && scriptExecutionResult.warnings && scriptExecutionResult.warnings.length > 0 && (
                <div className="execution-warnings">
                  <h4>警告</h4>
                  <ul>
                    {scriptExecutionResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* コンソール出力 */}
              {showConsole && scriptExecutionResult?.debugInfo?.consoleOutput && (
                <div className="console-output">
                  <h4>Console Output</h4>
                  <pre>
                    {scriptExecutionResult.debugInfo.consoleOutput.join('\n')}
                  </pre>
                </div>
              )}
            </div>
            
            {/* 中央：プレビュー */}
            <div className="preview-panel">
              <h3>プレビュー</h3>
              <div className="canvas-preview">
                <div 
                  className="canvas-container"
                  style={{
                    position: 'relative',
                    width: Math.min(250, 250 * (project?.canvas.width || 800) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600)),
                    height: Math.min(250, 250 * (project?.canvas.height || 600) / Math.max(project?.canvas.width || 800, project?.canvas.height || 600)),
                    border: '2px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    overflow: 'visible',
                  }}
                >
                  {/* キャンバス背景 */}
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
                  
                  {/* SVGプレビュー */}
                  {previewSVG && (
                    <div 
                      className="svg-preview-content"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: `<svg width="100%" height="100%" viewBox="0 0 ${project?.canvas.width || 800} ${project?.canvas.height || 600}" xmlns="http://www.w3.org/2000/svg">
                            <g transform="translate(${currentPos.x}, ${currentPos.y})" opacity="${currentOpacity}">
                              ${previewSVG}
                            </g>
                          </svg>`
                        }}
                      />
                    </div>
                  )}
                  
                  {!previewSVG && (
                    <div className="no-preview">
                      {scriptExecutionResult?.error ? 'エラーのため表示できません' : '実行中...'}
                    </div>
                  )}
                </div>
              </div>

              {/* 実行時間表示 */}
              {scriptExecutionResult?.executionTime && (
                <div className="execution-time">
                  実行時間: {scriptExecutionResult.executionTime}ms
                </div>
              )}
            </div>
            
            {/* 右側：プロパティ編集 */}
            <div className="properties-panel">
              <h3>プロパティ</h3>
              
              {/* 基本情報 */}
              <div className="property-group">
                <label>アセット名</label>
                <input
                  type="text"
                  value={editedAsset.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={mode === 'instance'}
                  className={mode === 'instance' ? 'readonly-input' : ''}
                />
              </div>

              {/* 位置 */}
              <div className="property-group">
                <label>位置</label>
                <div className="position-inputs">
                  <div className="input-with-label">
                    <label>X (px)</label>
                    <NumericInput
                      value={currentPos.x}
                      onChange={(value) => handlePositionChange('x', value)}
                      step={1}
                    />
                  </div>
                  <div className="input-with-label">
                    <label>Y (px)</label>
                    <NumericInput
                      value={currentPos.y}
                      onChange={(value) => handlePositionChange('y', value)}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              {/* サイズ */}
              <div className="property-group">
                <label>サイズ</label>
                <div className="size-inputs">
                  <div className="input-with-label">
                    <label>幅 (px)</label>
                    <NumericInput
                      value={currentSize.width}
                      onChange={(value) => handleSizeChange('width', value)}
                      min={1}
                      step={1}
                    />
                  </div>
                  <div className="input-with-label">
                    <label>高さ (px)</label>
                    <NumericInput
                      value={currentSize.height}
                      onChange={(value) => handleSizeChange('height', value)}
                      min={1}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              {/* 不透明度 */}
              <div className="property-group">
                <div className="opacity-section">
                  <span>{mode === 'asset' ? 'Default Opacity' : 'Opacity'}</span>
                  <div className="opacity-controls">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={currentOpacity}
                      onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                      className="opacity-slider"
                    />
                    <span className="opacity-value">{currentOpacity.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Z-Index */}
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
  );
};