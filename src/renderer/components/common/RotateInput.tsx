import React, { useCallback } from 'react';
import { Box, Typography, Slider, TextField } from '@mui/material';

interface RotateInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
}

/**
 * Rotate入力コンポーネント
 * スライダー + 数値入力の組み合わせで回転角度を調整
 * デフォルトは0-360度の範囲
 */
export const RotateInput: React.FC<RotateInputProps> = ({
  value,
  onChange,
  label = '回転角度',
  disabled = false,
  className = '',
  min = 0,
  max = 360
}) => {
  // 値を指定の範囲にクランプ
  const clampValue = useCallback((inputValue: number): number => {
    return Math.max(min, Math.min(max, inputValue));
  }, [min, max]);

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

  // 現在の値を指定の範囲にクランプ
  const clampedValue = clampValue(value || 0);

  return (
    <Box className={className} sx={{ width: '100%' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>{label}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Slider
            value={clampedValue}
            onChange={(_, newValue) => onChange(newValue as number)}
            min={min}
            max={max}
            step={1}
            disabled={disabled}
            sx={{ flex: 1 }}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value)}°`}
          />
          <TextField
            type="number"
            value={clampedValue}
            onChange={handleNumberChange}
            disabled={disabled}
            size="small"
            inputProps={{
              min: min,
              max: max,
              step: 1
            }}
            sx={{ width: 80 }}
          />
        </Box>
      </Box>
    </Box>
  );
};