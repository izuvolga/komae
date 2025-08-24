import React from 'react';
import './AssetParameterEditor.css';

export interface CustomAssetParameter {
  name: string;
  type: 'number' | 'string';
  defaultValue: number | string;
}

interface AssetParameterEditorProps {
  parameters: CustomAssetParameter[];
  values: Record<string, number | string>;
  onChange: (values: Record<string, number | string>) => void;
  disabled?: boolean;
}

const AssetParameterEditor: React.FC<AssetParameterEditorProps> = ({
  parameters,
  values,
  onChange,
  disabled = false,
}) => {
  const handleParameterChange = (paramName: string, value: number | string) => {
    onChange({
      ...values,
      [paramName]: value,
    });
  };

  const handleNumberChange = (paramName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      handleParameterChange(paramName, value);
    }
  };

  const handleStringChange = (paramName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    handleParameterChange(paramName, event.target.value);
  };

  const resetToDefault = (param: CustomAssetParameter) => {
    handleParameterChange(param.name, param.defaultValue);
  };

  if (parameters.length === 0) {
    return (
      <div className="asset-parameter-editor">
        <div className="parameter-empty-state">
          このCustomAssetにはパラメータがありません
        </div>
      </div>
    );
  }

  return (
    <div className="asset-parameter-editor">
      <div className="parameter-header">
        <h4>パラメータ設定</h4>
        <span className="parameter-count">{parameters.length} parameters</span>
      </div>
      
      <div className="parameter-list">
        {parameters.map((param) => (
          <div key={param.name} className="parameter-item">
            <div className="parameter-info">
              <label className="parameter-label">
                {param.name}
                <span className="parameter-type">({param.type})</span>
              </label>
              <button
                type="button"
                className="parameter-reset-button"
                onClick={() => resetToDefault(param)}
                disabled={disabled}
                title={`デフォルト値に戻す: ${param.defaultValue}`}
              >
                Reset
              </button>
            </div>
            
            <div className="parameter-input">
              {param.type === 'number' ? (
                <input
                  type="number"
                  value={typeof values[param.name] === 'number' ? values[param.name] : param.defaultValue}
                  onChange={(e) => handleNumberChange(param.name, e)}
                  disabled={disabled}
                  className="parameter-number-input"
                  step="any"
                />
              ) : (
                <input
                  type="text"
                  value={typeof values[param.name] === 'string' ? values[param.name] : param.defaultValue}
                  onChange={(e) => handleStringChange(param.name, e)}
                  disabled={disabled}
                  className="parameter-string-input"
                />
              )}
            </div>
            
            <div className="parameter-default">
              <span>デフォルト: {String(param.defaultValue)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetParameterEditor;