import React, { useCallback } from 'react';
import { Box, Typography, Slider, TextField } from '@mui/material';

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
    <Box className={className} sx={{ width: '100%' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>{label}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Slider
            value={clampedValue}
            onChange={(_, newValue) => onChange(newValue as number)}
            min={0}
            max={1}
            step={0.01}
            disabled={disabled}
            sx={{ flex: 1 }}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
          />
          <TextField
            type="number"
            value={clampedValue}
            onChange={handleNumberChange}
            disabled={disabled}
            size="small"
            inputProps={{
              min: 0,
              max: 1,
              step: 0.01
            }}
            sx={{ width: 80 }}
          />
        </Box>
      </Box>
    </Box>
  );
};