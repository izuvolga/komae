import React, { useCallback } from 'react';
import './OpacityInput.css';

interface OpacityInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Opacity入力コンポーネント
 * スライダー + 数値入力の組み合わせで0-1の範囲の値を調整
 */
export const OpacityInput: React.FC<OpacityInputProps> = ({
  value,
  onChange,
  label = 'Opacity',
  disabled = false,
  className = ''
}) => {
  // 値を0-1の範囲にクランプ
  const clampValue = useCallback((inputValue: number): number => {
    return Math.max(0, Math.min(1, inputValue));
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  }, [onChange]);

  const handleNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      const clampedValue = clampValue(newValue);
      onChange(clampedValue);
    }
  }, [onChange, clampValue]);

  // 現在の値を0-1の範囲にクランプ
  const clampedValue = clampValue(value);

  return (
    <div className={`opacity-input-container ${className}`}>
      <div className="opacity-section">
        <span>{label}</span>
        <div className="opacity-controls">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={clampedValue}
            onChange={handleSliderChange}
            disabled={disabled}
            className="opacity-slider"
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={clampedValue}
            onChange={handleNumberChange}
            disabled={disabled}
            className="opacity-number"
          />
        </div>
      </div>
    </div>
  );
};