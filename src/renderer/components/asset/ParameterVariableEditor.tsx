import React from 'react';
import { ProjectData, ValueAsset } from '../../../types/entities';

interface ParameterVariableEditorProps {
  customAssetParams: Record<string, any>; // CustomAssetのパラメータ定義
  currentParameterValues: Record<string, number | string>; // 現在のパラメータ値
  currentParameterVariableBindings?: Record<string, string>; // 現在の変数バインディング
  project: ProjectData;
  onParameterVariableChange: (parameterName: string, variableBinding: string | null) => void;
}

export const ParameterVariableEditor: React.FC<ParameterVariableEditorProps> = ({
  customAssetParams,
  currentParameterValues,
  currentParameterVariableBindings = {},
  project,
  onParameterVariableChange,
}) => {
  // プロジェクトからValueAssetを取得
  const getValueAssets = (): ValueAsset[] => {
    return Object.values(project.assets).filter(
      (asset): asset is ValueAsset => asset.type === 'ValueAsset'
    );
  };

  const valueAssets = getValueAssets();

  return (
    <div className="parameter-variable-editor">
      <div className="variable-status-info">
        <div className="status-item">
          <span className="status-label">ページ変数:</span>
          <span className="status-value enabled">ON (page_current, page_total)</span>
        </div>
        <div className="status-item">
          <span className="status-label">ValueAsset変数:</span>
          <span className="status-value enabled">ON</span>
        </div>
      </div>

      <div className="parameter-bindings">
        <h4>パラメータ変数バインディング</h4>
        {Object.entries(customAssetParams).map(([paramName, paramDef]) => (
          <div key={paramName} className="parameter-binding-row">
            <div className="parameter-info">
              <label className="parameter-name">{paramName}</label>
              <span className="parameter-type">({paramDef.type || 'any'})</span>
              <span className="parameter-current-value">
                現在値: {currentParameterValues[paramName] ?? paramDef.default ?? 'N/A'}
              </span>
            </div>
            <div className="variable-selector">
              <select
                value={currentParameterVariableBindings[paramName] || ''}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  onParameterVariableChange(
                    paramName,
                    selectedValue === '' ? null : selectedValue
                  );
                }}
              >
                <option value="">固定値を使用</option>
                <optgroup label="ページ変数">
                  <option value="page_current">page_current (現在ページ番号)</option>
                  <option value="page_total">page_total (総ページ数)</option>
                </optgroup>
                {valueAssets.length > 0 && (
                  <optgroup label="ValueAsset変数">
                    {valueAssets.map((valueAsset) => (
                      <option key={valueAsset.id} value={valueAsset.name}>
                        {valueAsset.name} ({valueAsset.value_type})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        ))}

        {Object.keys(customAssetParams).length === 0 && (
          <div className="no-parameters-message">
            このCustomAssetにはパラメータが定義されていません。
          </div>
        )}
      </div>
    </div>
  );
};