import React from 'react';
import { IconButton, Tooltip, useTheme as useMuiTheme } from '@mui/material';
import { Brightness7 as LightIcon, Brightness4 as DarkIcon } from '@mui/icons-material';
import { useTheme } from '../../../theme/ThemeContext';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'text';
}

/**
 * ダークモード切り替えコンポーネント
 * アイコンクリックでライト・ダークテーマを切り替え
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'medium',
  variant = 'icon'
}) => {
  const { mode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();

  const isDark = mode === 'dark';
  const icon = isDark ? <LightIcon /> : <DarkIcon />;
  const tooltipText = isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え';

  if (variant === 'icon') {
    return (
      <Tooltip title={tooltipText}>
        <IconButton
          onClick={toggleTheme}
          size={size}
          sx={{
            color: muiTheme.palette.mode === 'dark' ? 'grey.300' : 'grey.700',
            '&:hover': {
              backgroundColor: muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {icon}
        </IconButton>
      </Tooltip>
    );
  }

  // 将来的にtext variantも対応可能
  return (
    <Tooltip title={tooltipText}>
      <IconButton onClick={toggleTheme} size={size}>
        {icon}
      </IconButton>
    </Tooltip>
  );
};