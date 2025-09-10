import React, { useState, useEffect, useCallback } from 'react';
import { ValueAsset, ValueAssetInstance, Page, ProjectData, validateValueAssetData, validateValueAssetInstanceData } from '../../../types/entities';
import { useProjectStore } from '../../stores/projectStore';
import { evaluateFormula, getEffectiveValueAssetValue, parseFormulaReferences } from '../../../utils/valueEvaluation';
import { ReadOnlyInput } from '../common/ReadOnlyInput';
import './ValueEditModal.css';

type EditMode = 'asset' | 'instance';

export interface ValueEditModalProps {
  mode: EditMode;
  asset: ValueAsset;
  assetInstance?: ValueAssetInstance;
  page?: Page;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsset?: (updatedAsset: ValueAsset) => void;
  onSaveInstance?: (updatedInstance: ValueAssetInstance) => void;
}

export const ValueEditModal: React.FC<ValueEditModalProps> = ({
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
  const getCurrentLanguage = useProjectStore((state) => state.getCurrentLanguage);
  
  // Asset編集用のstate
  const [editingAsset, setEditingAsset] = useState<ValueAsset>(asset);
  
  // Instance編集用のstate
  const [editingInstance, setEditingInstance] = useState<ValueAssetInstance>(
    assetInstance || {
      id: `value-instance-${Date.now()}`,
      asset_id: asset.id,
      override_value: undefined,
    }
  );
  
  // UI入力用の一時的なstate
  const [tempInputValues, setTempInputValues] = useState({
    name: '',
    value_type: 'string' as 'string' | 'number' | 'formula',
    initial_value: '',
    new_page_behavior: 'reset' as 'reset' | 'inherit',
    override_value: '',
  });

  // プレビュー値
  const [previewValue, setPreviewValue] = useState<any>('');
  const [previewError, setPreviewError] = useState<string>('');
  // バリデーション状態
  const [nameValidation, setNameValidation] = useState<{
    isValid: boolean;
    errorMessage: string;
  }>({ isValid: true, errorMessage: '' });

  // 変数名バリデーション関数
  const validateVariableName = useCallback((name: string) => {
    if (!name || name.trim() === '') {
      return { isValid: false, errorMessage: 'アセット名は必須です。' };
    }
    
    const variableNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!variableNamePattern.test(name)) {
      return { 
        isValid: false, 
        errorMessage: '変数名として使用されるため、英字またはアンダースコアで始まり、英数字とアンダースコアのみを含む必要があります。' 
      };
    }
    
    return { isValid: true, errorMessage: '' };
  }, []);

  // プロップスが変更されたときにローカル状態を更新
  useEffect(() => {
    setEditingAsset(asset);
    setEditingInstance(assetInstance || {
      id: `value-instance-${Date.now()}`,
      asset_id: asset.id,
      override_value: undefined,
    });

    if (mode === 'asset') {
      setTempInputValues({
        name: asset.name,
        value_type: asset.value_type,
        initial_value: String(asset.initial_value),
        new_page_behavior: asset.new_page_behavior,
        override_value: '',
      });
      
      // 名前のバリデーションを実行
      setNameValidation(validateVariableName(asset.name));
    } else {
      const currentValue = assetInstance?.override_value !== undefined 
        ? assetInstance.override_value 
        : asset.initial_value;
      
      setTempInputValues({
        name: asset.name,
        value_type: asset.value_type,
        initial_value: String(asset.initial_value),
        new_page_behavior: asset.new_page_behavior,
        override_value: String(currentValue),
      });
    }
  }, [asset, assetInstance, mode, validateVariableName]);

  // 名前が変更されたときのバリデーション
  useEffect(() => {
    if (mode === 'asset') {
      setNameValidation(validateVariableName(tempInputValues.name));
    }
  }, [tempInputValues.name, mode, validateVariableName]);

  // プレビュー値を更新
  useEffect(() => {
    if (!project || !page) {
      setPreviewValue('');
      setPreviewError('');
      return;
    }

    try {
      const currentAsset = mode === 'asset' ? editingAsset : asset;
      const currentInstance = mode === 'instance' ? editingInstance : undefined;
      
      // ページインデックスを取得
      const pageIndex = project.pages.findIndex(p => p.id === page.id);
      
      let valueToEvaluate: any;
      
      if (mode === 'asset') {
        // Asset編集モード：一時入力値を使用
        const tempAsset: ValueAsset = {
          ...currentAsset,
          value_type: tempInputValues.value_type,
          initial_value: tempInputValues.initial_value,
        };
        
        if (tempAsset.value_type === 'formula') {
          const result = evaluateFormula(tempInputValues.initial_value, project, page, pageIndex);
          if (result.isError) {
            setPreviewError(result.errorMessage || '数式エラー');
            setPreviewValue('#ERROR');
          } else {
            setPreviewError('');
            setPreviewValue(result.value);
          }
        } else if (tempAsset.value_type === 'number') {
          const numValue = parseFloat(tempInputValues.initial_value);
          setPreviewValue(isNaN(numValue) ? 0 : numValue);
          setPreviewError('');
        } else {
          setPreviewValue(tempInputValues.initial_value);
          setPreviewError('');
        }
      } else {
        // Instance編集モード：オーバーライド値を使用
        valueToEvaluate = tempInputValues.override_value !== '' 
          ? tempInputValues.override_value 
          : currentAsset.initial_value;

        if (currentAsset.value_type === 'formula') {
          const result = evaluateFormula(valueToEvaluate, project, page, pageIndex);
          if (result.isError) {
            setPreviewError(result.errorMessage || '数式エラー');
            setPreviewValue('#ERROR');
          } else {
            setPreviewError('');
            setPreviewValue(result.value);
          }
        } else if (currentAsset.value_type === 'number') {
          const numValue = parseFloat(valueToEvaluate);
          setPreviewValue(isNaN(numValue) ? 0 : numValue);
          setPreviewError('');
        } else {
          setPreviewValue(valueToEvaluate);
          setPreviewError('');
        }
      }
    } catch (error) {
      setPreviewError('プレビューの生成に失敗しました');
      setPreviewValue('#ERROR');
    }
  }, [tempInputValues, editingAsset, editingInstance, mode, project, page]);

  const handleSave = useCallback(() => {
    if (mode === 'asset') {
      // バリデーションチェック
      if (!nameValidation.isValid) {
        alert(`バリデーションエラー:\n${nameValidation.errorMessage}`);
        return;
      }

      // Asset保存
      const updatedAsset: ValueAsset = {
        ...editingAsset,
        name: tempInputValues.name,
        value_type: tempInputValues.value_type,
        initial_value: tempInputValues.value_type === 'number' 
          ? parseFloat(tempInputValues.initial_value) || 0
          : tempInputValues.initial_value,
        new_page_behavior: tempInputValues.new_page_behavior,
      };

      const validation = validateValueAssetData(updatedAsset);
      if (!validation.isValid) {
        alert(`バリデーションエラー:\n${validation.errors.join('\n')}`);
        return;
      }

      setEditingAsset(updatedAsset);
      onSaveAsset?.(updatedAsset);
    } else {
      // Instance保存
      const updatedInstance: ValueAssetInstance = {
        ...editingInstance,
        override_value: tempInputValues.override_value !== '' 
          ? (asset.value_type === 'number' 
              ? parseFloat(tempInputValues.override_value) || 0
              : tempInputValues.override_value)
          : undefined,
      };

      const validation = validateValueAssetInstanceData(updatedInstance);
      if (!validation.isValid) {
        alert(`バリデーションエラー:\n${validation.errors.join('\n')}`);
        return;
      }

      setEditingInstance(updatedInstance);
      onSaveInstance?.(updatedInstance);
    }
    onClose();
  }, [mode, editingAsset, editingInstance, tempInputValues, asset.value_type, nameValidation, onSaveAsset, onSaveInstance, onClose]);;

  const getTitle = () => {
    if (mode === 'asset') {
      return 'ValueAsset 編集';
    } else {
      return `ValueAsset インスタンス編集 - ${page && project ? `Page ${project.pages.findIndex(p => p.id === page.id) + 1}` : ''}`;
    }
  };

  const getHelpText = (field: string) => {
    switch (field) {
      case 'name':
        return '変数名として使用されます。英字またはアンダースコア(_)で始まり、英数字とアンダースコア(_)のみを含む必要があります。';
      case 'new_page_behavior':
        return '新しいページが追加された時の動作を設定します。「初期値にリセット」は常に初期値を使用し、「前のページの値を継承」は前のページの値を引き継ぎます。';
      case 'formula':
        return '数式では %{変数ID} で他のValueAssetを参照できます。%p で現在のページ番号、%P で総ページ数を取得できます。例: %{value1} + %{value2} + 1';
      default:
        return '';
    }
  };;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="value-edit-modal">
        <div className="modal-header">
          <h2>{getTitle()}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="value-edit-main">
            <div className="value-edit-form">
              {mode === 'asset' && (
                <>
                  <div className="form-group">
                    <label>
                      アセット名
                      <span className="help-icon" title={getHelpText('name')}>?</span>
                      <input
                        type="text"
                        value={tempInputValues.name}
                        onChange={(e) => setTempInputValues(prev => ({...prev, name: e.target.value}))}
                        placeholder="アセット名を入力"
                        className={!nameValidation.isValid ? 'input-error' : ''}
                      />
                      {!nameValidation.isValid && (
                        <div className="validation-error">
                          {nameValidation.errorMessage}
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      値の型
                      <select
                        value={tempInputValues.value_type}
                        onChange={(e) => setTempInputValues(prev => ({...prev, value_type: e.target.value as any}))}
                      >
                        <option value="string">文字列</option>
                        <option value="number">数値</option>
                        <option value="formula">数式</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      初期値
                      {tempInputValues.value_type === 'formula' && (
                        <span className="help-icon" title={getHelpText('formula')}>?</span>
                      )}
                      {tempInputValues.value_type === 'formula' ? (
                        <textarea
                          value={tempInputValues.initial_value}
                          onChange={(e) => setTempInputValues(prev => ({...prev, initial_value: e.target.value}))}
                          placeholder="例: %{value1} + %{value2} + 1"
                          rows={3}
                        />
                      ) : (
                        <input
                          type={tempInputValues.value_type === 'number' ? 'number' : 'text'}
                          value={tempInputValues.initial_value}
                          onChange={(e) => setTempInputValues(prev => ({...prev, initial_value: e.target.value}))}
                          placeholder={tempInputValues.value_type === 'number' ? '0' : '初期値を入力'}
                        />
                      )}
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      新規ページでの動作
                      <span className="help-icon" title={getHelpText('new_page_behavior')}>?</span>
                    </label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          value="reset"
                          checked={tempInputValues.new_page_behavior === 'reset'}
                          onChange={(e) => setTempInputValues(prev => ({...prev, new_page_behavior: 'reset'}))}
                        />
                        初期値にリセット
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          value="inherit"
                          checked={tempInputValues.new_page_behavior === 'inherit'}
                          onChange={(e) => setTempInputValues(prev => ({...prev, new_page_behavior: 'inherit'}))}
                        />
                        前のページの値を継承
                      </label>
                    </div>
                  </div>
                </>
              )}

              {mode === 'instance' && (
                <>
                  <div className="current-result">
                    <strong>現在の値:</strong> {previewError ? `エラー: ${previewError}` : String(previewValue)}
                  </div>

                  <div className="form-group">
                    <ReadOnlyInput
                      label="アセット名"
                      value={asset.name}
                    />
                  </div>

                  <div className="form-group">
                    <ReadOnlyInput
                      label="初期値"
                      value={String(asset.initial_value)}
                    />
                  </div>

                  <div className="form-group">
                    <ReadOnlyInput
                      label="値の型"
                      value={asset.value_type === 'string' ? '文字列' : asset.value_type === 'number' ? '数値' : '数式'}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      オーバーライド値
                      {asset.value_type === 'formula' && (
                        <span className="help-icon" title={getHelpText('formula')}>?</span>
                      )}
                      {asset.value_type === 'formula' ? (
                        <textarea
                          value={tempInputValues.override_value}
                          onChange={(e) => setTempInputValues(prev => ({...prev, override_value: e.target.value}))}
                          placeholder="このページ用の数式を入力（空白の場合はアセットの初期値を使用）"
                          rows={3}
                        />
                      ) : (
                        <input
                          type={asset.value_type === 'number' ? 'number' : 'text'}
                          value={tempInputValues.override_value}
                          onChange={(e) => setTempInputValues(prev => ({...prev, override_value: e.target.value}))}
                          placeholder="このページ用の値（空白の場合はアセットの初期値を使用）"
                        />
                      )}
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button">
            キャンセル
          </button>
          <button 
            onClick={handleSave} 
            className="save-button"
            disabled={mode === 'asset' && !nameValidation.isValid}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};