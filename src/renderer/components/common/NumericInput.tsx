import React, { useState, useCallback } from 'react';
import './NumericInput.css';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * 数値入力コンポーネント（上下ボタン付き）
 * 増減の単位は1ずつ、小数を含む場合でも1ずつ増減できる
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = 2,
  disabled = false,
  placeholder,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);

  // 数値を指定した小数点以下桁数で丸める
  const formatNumber = useCallback((num: number): number => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }, [decimals]);

  // 入力値の検証と正規化
  const validateAndFormat = useCallback((inputStr: string): number => {
    // 空文字の場合は0として扱う
    if (inputStr.trim() === '') {
      return 0;
    }

    // 数値以外の文字を除去（-, . は許可）
    const cleanedInput = inputStr.replace(/[^-0-9.]/g, '');
    const num = parseFloat(cleanedInput);

    if (isNaN(num)) {
      return value; // 無効な入力の場合は元の値を保持
    }

    // min/max の範囲チェック
    let clampedNum = num;
    if (min !== undefined && clampedNum < min) {
      clampedNum = min;
    }
    if (max !== undefined && clampedNum > max) {
      clampedNum = max;
    }

    return formatNumber(clampedNum);
  }, [value, min, max, formatNumber]);

  // 入力フォーカス時
  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setInputValue(value.toString());
  }, [value]);

  // 入力フォーカスアウト時
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const validatedValue = validateAndFormat(inputValue);
    setInputValue(validatedValue.toString());
    
    if (validatedValue !== value) {
      onChange(validatedValue);
    }
  }, [inputValue, value, validateAndFormat, onChange]);

  // 入力値変更時
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  // Enterキー押下時
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  // 上ボタンクリック（+1）
  const handleIncrement = useCallback(() => {
    if (disabled) return;
    
    const newValue = formatNumber(value + step);
    if (max === undefined || newValue <= max) {
      onChange(newValue);
      setInputValue(newValue.toString());
    }
  }, [value, step, max, disabled, formatNumber, onChange]);

  // 下ボタンクリック（-1）
  const handleDecrement = useCallback(() => {
    if (disabled) return;
    
    const newValue = formatNumber(value - step);
    if (min === undefined || newValue >= min) {
      onChange(newValue);
      setInputValue(newValue.toString());
    }
  }, [value, step, min, disabled, formatNumber, onChange]);

  // 表示用の値を決定
  const displayValue = isEditing ? inputValue : value.toFixed(decimals);

  return (
    <div className={`numeric-input ${className} ${disabled ? 'disabled' : ''}`}>
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="numeric-input-field"
      />
      <div className="numeric-input-buttons">
        <button
          type="button"
          className="numeric-input-btn increment"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          title="増加 (+1)"
        >
          ▲
        </button>
        <button
          type="button"
          className="numeric-input-btn decrement"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && value <= min)}
          title="減少 (-1)"
        >
          ▼
        </button>
      </div>
    </div>
  );
};