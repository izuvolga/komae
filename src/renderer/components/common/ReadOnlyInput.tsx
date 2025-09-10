import React from 'react';
import './ReadOnlyInput.css';

interface ReadOnlyInputProps {
  value: string | number;
  label?: string;
  className?: string;
}

/**
 * 読み取り専用表示コンポーネント
 * 編集不可の情報を統一されたスタイルで表示
 */
export const ReadOnlyInput: React.FC<ReadOnlyInputProps> = ({
  value,
  label,
  className = ''
}) => {
  return (
    <div className={`readonly-input-container ${className}`}>
      {label && <label className="readonly-input-label">{label}</label>}
      <div className="readonly-input-display">
        {value}
      </div>
    </div>
  );
};