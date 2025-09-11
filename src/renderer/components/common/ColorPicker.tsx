import React, { useState, useRef, useCallback } from 'react';
import './ColorPicker.css';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * カラーピッカーコンポーネント
 * 色表示矩形 + 16進数入力欄の組み合わせ
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  className = ''
}) => {
  const hiddenColorPickerRef = useRef<HTMLInputElement>(null);
  
  // 16進数値を取得（#を除去）
  const getHexValue = useCallback((colorValue: string): string => {
    return colorValue.startsWith('#') ? colorValue.slice(1) : colorValue;
  }, []);

  // 16進数値を正規化（#付きで返す）
  const normalizeColorValue = useCallback((hexValue: string): string => {
    // #を除去
    const cleanHex = hexValue.replace('#', '');
    
    // 3桁を6桁に展開 (RGB -> RRGGBB)
    if (cleanHex.length === 3) {
      return `#${cleanHex.split('').map(c => c + c).join('')}`;
    }
    
    // 6桁の場合はそのまま
    if (cleanHex.length === 6) {
      return `#${cleanHex}`;
    }
    
    // 無効な値の場合は元の値を返す
    return value;
  }, [value]);

  // 16進数値の妥当性チェック
  const isValidHex = useCallback((hexValue: string): boolean => {
    const cleanHex = hexValue.replace('#', '');
    return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(cleanHex);
  }, []);

  // 色表示矩形クリック時
  const handleColorDisplayClick = useCallback((e: React.MouseEvent) => {
    if (disabled || !hiddenColorPickerRef.current) return;
    
    // 色表示ボタンの位置を取得
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const colorPicker = hiddenColorPickerRef.current;
    
    // 一時的に表示してクリック（色表示ボタンの左側に配置）
    colorPicker.style.position = 'fixed';
    colorPicker.style.left = `${rect.left - 250}px`; // 色表示ボタンの左側に250px移動
    colorPicker.style.top = `${rect.top}px`; // 色表示ボタンと同じ高さ
    colorPicker.style.zIndex = '9999';
    colorPicker.style.opacity = '0';
    colorPicker.style.pointerEvents = 'auto';
    colorPicker.style.width = '50px';
    colorPicker.style.height = '50px';
    
    // HEXモードを示すデータ属性を設定（ブラウザによってはサポート）
    colorPicker.setAttribute('data-format', 'hex');
    colorPicker.setAttribute('data-color-format', 'hex');
    
    // 位置設定が確実に適用されるまで少し待ってからクリック
    setTimeout(() => {
      colorPicker.click();
    }, 10);
    
    // クリック後に元に戻す
    setTimeout(() => {
      colorPicker.style.position = 'absolute';
      colorPicker.style.width = '1px';
      colorPicker.style.height = '1px';
      colorPicker.style.opacity = '0';
      colorPicker.style.pointerEvents = 'none';
      colorPicker.style.zIndex = '-1';
    }, 150);
  }, [disabled]);

  // カラーピッカーからの色変更
  const handleColorPickerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange(e.target.value);
  }, [disabled, onChange]);

  // 16進数入力欄の変更
  const handleHexInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const inputValue = e.target.value.toUpperCase();
    
    // 16進数文字のみを許可
    const filteredValue = inputValue.replace(/[^0-9A-F]/g, '');
    
    // 6文字制限
    const limitedValue = filteredValue.slice(0, 6);
    
    // 3桁または6桁の場合のみ色を更新
    if (limitedValue.length === 3 || limitedValue.length === 6) {
      const normalizedColor = normalizeColorValue(limitedValue);
      onChange(normalizedColor);
    }
  }, [disabled, onChange, normalizeColorValue]);

  const hexValue = getHexValue(value);

  return (
    <div className={`color-picker-container ${className}`}>
      {label && <label className="color-picker-label">{label}</label>}
      <div className="color-picker-controls">
        <div 
          className={`color-display ${disabled ? 'disabled' : ''}`}
          style={{ backgroundColor: disabled ? '#f5f5f5' : value }}
          onClick={handleColorDisplayClick}
          title="クリックでカラーピッカーを開く"
        />
        <input
          type="text"
          value={hexValue}
          onChange={handleHexInputChange}
          disabled={disabled}
          className="hex-input"
          placeholder="FFFFFF"
          maxLength={6}
        />
        <input
          type="color"
          value={value}
          onChange={handleColorPickerChange}
          disabled={disabled}
          className="hidden-color-picker"
          ref={hiddenColorPickerRef}
          data-format="hex"
          data-color-format="hex"
        />
      </div>
    </div>
  );
};