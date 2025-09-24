import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TextField, IconButton, Box } from '@mui/material';
import { KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';

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
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
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
  className = '',
  onKeyDown
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);
  
  // 連続増減のためのタイマー管理
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPressingRef = useRef(false);
  
  // 現在の値をリアルタイムで参照するためのref
  const currentValueRef = useRef(value);
  
  // valueが変更されたらrefも更新
  useEffect(() => {
    currentValueRef.current = value;
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
    setInputValue(value.toFixed(decimals));
  }, [value, decimals]);

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
    // デフォルトの動作（Enter時にblur）を先に処理
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      console.log('DEBUG: Enter key pressed, input blurred.');
      // Enterキーの場合は外部ハンドラーに渡さない（blurに専念）
      return;
    }

    // Enterキー以外の場合は外部からのonKeyDownハンドラーを実行
    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [onKeyDown]);

  // 値を増加させる関数
  const performIncrement = useCallback(() => {
    if (disabled) return;
    
    const currentValue = currentValueRef.current;
    const newValue = formatNumber(currentValue + step);
    
    if (max === undefined || newValue <= max) {
      onChange(newValue);
      setInputValue(newValue.toString());
    } else {
      clearTimers();
    }
  }, [step, max, disabled, formatNumber, onChange, clearTimers]);

  // 値を減少させる関数
  const performDecrement = useCallback(() => {
    if (disabled) return;
    
    const currentValue = currentValueRef.current;
    const newValue = formatNumber(currentValue - step);
    
    if (min === undefined || newValue >= min) {
      onChange(newValue);
      setInputValue(newValue.toString());
    } else {
      clearTimers();
    }
  }, [step, min, disabled, formatNumber, onChange, clearTimers]);

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

  // 表示用の値を決定
  const displayValue = isEditing ? inputValue : value.toFixed(decimals);

  // グローバルマウスイベントのリスナーを追加（マウスアップ時にタイマーをクリア）
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      clearTimers();
    };

    // ページがフォーカスを失った時にもタイマーをクリア
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

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', width: '100%' }} className={className}>
      <TextField
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        size="small"
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            paddingRight: '48px'
          }
        }}
      />
      <Box sx={{
        position: 'absolute',
        right: 1,
        top: 1,
        bottom: 1,
        display: 'flex',
        flexDirection: 'column',
        width: 24
      }}>
        <IconButton
          size="small"
          onMouseDown={handleIncrementMouseDown}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          disabled={disabled || (max !== undefined && value >= max)}
          title="長押しで連続増加"
          sx={{
            flex: 1,
            minHeight: 0,
            borderRadius: '0 3px 0 0',
            fontSize: '10px',
            padding: 0,
            borderBottom: '1px solid #dee2e6'
          }}
        >
          <KeyboardArrowUp fontSize="inherit" />
        </IconButton>
        <IconButton
          size="small"
          onMouseDown={handleDecrementMouseDown}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          disabled={disabled || (min !== undefined && value <= min)}
          title="長押しで連続減少"
          sx={{
            flex: 1,
            minHeight: 0,
            borderRadius: '0 0 3px 0',
            fontSize: '10px',
            padding: 0
          }}
        >
          <KeyboardArrowDown fontSize="inherit" />
        </IconButton>
      </Box>
    </Box>
  );
};