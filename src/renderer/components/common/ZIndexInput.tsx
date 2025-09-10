import React, { useState, useCallback, useRef, useEffect } from 'react';
import './ZIndexInput.css';

export interface ZIndexValidationResult {
  isValid: boolean;
  warning?: string;
  error?: string;
}

interface ZIndexInputProps {
  value: number;
  onChange: (value: number) => void;
  validation?: ZIndexValidationResult;
  disabled?: boolean;
  className?: string;
}

/**
 * Z-Index専用入力コンポーネント
 * 整数値のみを扱い、バリデーション表示機能付き
 */
export const ZIndexInput: React.FC<ZIndexInputProps> = ({
  value,
  onChange,
  validation,
  disabled = false,
  className = ''
}) => {
  // 常に整数値を扱う
  const intValue = Math.floor(value);
  const [inputValue, setInputValue] = useState(intValue.toString());
  const [isEditing, setIsEditing] = useState(false);
  
  // 連続増減のためのタイマー管理
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPressingRef = useRef(false);
  
  // 現在の値をリアルタイムで参照するためのref
  const currentValueRef = useRef(intValue);
  
  // valueが変更されたらrefも更新（同期的に更新）
  useEffect(() => {
    const newIntValue = Math.floor(value);
    currentValueRef.current = newIntValue;
    if (!isEditing) {
      setInputValue(newIntValue.toString());
    }
  }, [value, isEditing]);

  // refの初期値とvalueの同期を確実にする
  useEffect(() => {
    currentValueRef.current = Math.floor(value);
  }, [value]);

  // タイマーをクリアする関数
  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isPressingRef.current = false;
  }, []);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  // 入力値の検証と正規化（整数のみ）
  const validateAndFormat = useCallback((inputStr: string): number => {
    // 空文字の場合は0として扱う
    if (inputStr.trim() === '') {
      return 0;
    }

    // 数値以外の文字を除去（- のみ許可、小数点は除去）
    const cleanedInput = inputStr.replace(/[^-0-9]/g, '');
    const num = parseInt(cleanedInput, 10);

    if (isNaN(num)) {
      return intValue; // 無効な入力の場合は元の値を保持
    }

    return num;
  }, [intValue]);

  // 入力フォーカス時
  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setInputValue(intValue.toString());
  }, [intValue]);

  // 入力フォーカスアウト時
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const validatedValue = validateAndFormat(inputValue);
    setInputValue(validatedValue.toString());
    
    if (validatedValue !== intValue) {
      onChange(validatedValue);
    }
  }, [inputValue, intValue, validateAndFormat, onChange]);

  // 入力値変更時
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // 数字と負号のみを許可
    const filtered = e.target.value.replace(/[^-0-9]/g, '');
    setInputValue(filtered);
  }, []);

  // Enterキー押下時
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  // 値を増加させる関数
  const performIncrement = useCallback(() => {
    if (disabled) return;
    
    // より確実に現在の値を取得
    const currentValue = Math.floor(value);
    const newValue = currentValue + 1;
    
    onChange(newValue);
    if (!isEditing) {
      setInputValue(newValue.toString());
    }
  }, [disabled, onChange, isEditing, value]);

  // 値を減少させる関数
  const performDecrement = useCallback(() => {
    if (disabled) return;
    
    // より確実に現在の値を取得
    const currentValue = Math.floor(value);
    const newValue = currentValue - 1;
    
    onChange(newValue);
    if (!isEditing) {
      setInputValue(newValue.toString());
    }
  }, [disabled, onChange, isEditing, value]);

  // 連続増減を開始する関数
  const startContinuousChange = useCallback((incrementFn: () => void) => {
    if (disabled || isPressingRef.current) return;
    
    isPressingRef.current = true;
    
    // 最初の変更を即座に実行
    incrementFn();
    
    // 初期遅延後に連続実行を開始（500ms後）
    timeoutRef.current = setTimeout(() => {
      if (isPressingRef.current) {
        intervalRef.current = setInterval(() => {
          if (isPressingRef.current) {
            incrementFn();
          } else {
            clearTimers();
          }
        }, 100); // 100ms間隔で連続実行
      }
    }, 500);
  }, [disabled, clearTimers]);

  // マウスダウン時の処理（増加ボタン）
  const handleIncrementMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startContinuousChange(performIncrement);
  }, [startContinuousChange, performIncrement]);

  // マウスダウン時の処理（減少ボタン）
  const handleDecrementMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startContinuousChange(performDecrement);
  }, [startContinuousChange, performDecrement]);

  // マウスアップ時やリーブ時の処理
  const handleMouseUpOrLeave = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  // 表示用の値を決定（常に整数）
  const displayValue = isEditing ? inputValue : intValue.toString();

  // グローバルマウスイベントのリスナーを追加
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      clearTimers();
    };

    const handleBlur = () => {
      clearTimers();
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [clearTimers]);

  // バリデーション状態に基づくクラス名
  const validationClass = validation ? 
    (!validation.isValid ? 'error' : validation.warning ? 'warning' : '') : '';

  return (
    <div className={`zindex-input-container ${className}`}>
      <div className={`zindex-input ${disabled ? 'disabled' : ''} ${validationClass}`}>
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="zindex-input-field"
          placeholder="0"
        />
        <div className="zindex-input-buttons">
          <button
            type="button"
            className="zindex-input-btn increment"
            onMouseDown={handleIncrementMouseDown}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            disabled={disabled}
            title="長押しで連続増加"
          >
            ▲
          </button>
          <button
            type="button"
            className="zindex-input-btn decrement"
            onMouseDown={handleDecrementMouseDown}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            disabled={disabled}
            title="長押しで連続減少"
          >
            ▼
          </button>
        </div>
      </div>
      {/* バリデーション結果の表示 */}
      {validation && (validation.error || validation.warning) && (
        <div className={`zindex-validation ${validationClass}`}>
          {validation.error && <span className="error-icon">❌</span>}
          {validation.warning && <span className="warning-icon">⚠️</span>}
          <span className="validation-message">
            {validation.error || validation.warning}
          </span>
        </div>
      )}
    </div>
  );
};