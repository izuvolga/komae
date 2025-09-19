import { createTheme } from '@mui/material/styles';

// 現在のプロジェクトカラーパレットに基づいたMUIテーマ
export const komaeTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6', // 現在の btn-primary カラー
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6b7280', // 現在の secondary カラー
      light: '#9ca3af',
      dark: '#374151',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc3545', // 現在の btn-danger カラー
      light: '#f87171',
      dark: '#c82333',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#000000',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      disabled: '#9ca3af',
    },
    divider: '#e5e7eb',
  },
  typography: {
    fontFamily: [
      'Roboto',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
      color: '#1f2937',
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#1f2937',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#374151',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
      color: '#374151',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#374151',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#6b7280',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none', // ボタンテキストの大文字変換を無効化
    },
  },
  shape: {
    borderRadius: 6, // 現在のborder-radiusに合わせる
  },
  spacing: 8, // 8px単位のスペーシング
  components: {
    // MUIコンポーネントのデフォルトスタイルをカスタマイズ
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          padding: '10px 20px',
          borderRadius: '6px',
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 600,
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid #e5e7eb',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          gap: '12px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            '& fieldset': {
              borderColor: '#d1d5db',
            },
            '&:hover fieldset': {
              borderColor: '#9ca3af',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#f3f4f6',
          },
        },
      },
    },
  },
});

// ダークモード用テーマ（将来の拡張用）
export const komaeDarkTheme = createTheme({
  ...komaeTheme,
  palette: {
    ...komaeTheme.palette,
    mode: 'dark',
    primary: {
      main: '#60a5fa', // ダークモードでより明るい青色（blue-400相当）
      light: '#93c5fd', // さらに明るい青色（blue-300相当）
      dark: '#3b82f6', // 元の青色
      contrastText: '#ffffff',
    },
    background: {
      default: '#111827',
      paper: '#111827',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      disabled: '#6b7280',
    },
    divider: '#374151',
    action: { // AssetLibrary の + ボタンの色調整用
      hover: '#4b5563', // ダークモードでのホバー色（より明るいグレー）
      selected: '#6b7280', // 選択時の色
      disabled: '#374151', // 無効時の色
      disabledBackground: '#1f2937', // 無効時の背景色
    },
  },
  components: {
    ...komaeTheme.components,
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            color: '#d1d5db', // ダークモードでのラベル色
            '&.Mui-focused': {
              color: '#60a5fa', // フォーカス時のラベル色
            },
            '&.Mui-disabled': {
              color: '#6b7280', // 無効時のラベル色
            },
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            color: '#f9fafb', // 入力テキストの色
            '& fieldset': {
              borderColor: '#4b5563', // ダークモードでのボーダー色
            },
            '&:hover fieldset': {
              borderColor: '#6b7280', // ホバー時のボーダー色
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
              borderWidth: '2px',
            },
          },
          '& .MuiInputBase-input': {
            color: '#f9fafb', // 入力値の色
            '&::placeholder': {
              color: '#9ca3af', // プレースホルダーの色
              opacity: 1,
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#374151', // ダークモードでのホバー色
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#d1d5db', // ダークモードでのラベル色
          '&.Mui-focused': {
            color: '#60a5fa', // フォーカス時の色
          },
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          color: '#d1d5db', // ダークモードでのラベル色
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: '#6b7280', // 未選択時の色
          '&.Mui-checked': {
            color: '#3b82f6', // 選択時の色
          },
        },
      },
    },
    MuiMenu: { // + ボタンのメニュー用スタイル調整
      styleOverrides: {
        paper: {
          backgroundColor: '#1f2937', // ダークモードでのメニュー背景色
          border: '1px solid #374151', // ボーダー色
        },
      },
    },
    MuiMenuItem: { // + ボタンのメニュー用スタイル調整
      styleOverrides: {
        root: {
          color: '#f9fafb', // ダークモードでのメニューアイテムテキスト色
          '&:hover': {
            backgroundColor: '#374151', // ホバー時の背景色
          },
          '&.Mui-selected': {
            backgroundColor: '#4b5563', // 選択時の背景色
            '&:hover': {
              backgroundColor: '#6b7280', // 選択時のホバー背景色
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: '#374151', // ダークモードでのChip背景色
          color: '#d1d5db', // ダークモードでのChipテキスト色
          border: '1px solid #4b5563', // ダークモードでのChipボーダー色
          '&.MuiChip-outlined': {
            backgroundColor: 'transparent',
            borderColor: '#4b5563',
            color: '#d1d5db',
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: 'inherit', // 親から色を継承（text.primaryまたはtext.secondaryが適用される）
        },
        body2: {
          color: '#d1d5db', // body2（よく使われるラベル用）の色を明示的に設定
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#60a5fa', // ダークモードでのスライダーメイン色（明るい青）
        },
        rail: {
          backgroundColor: '#4b5563', // ダークモードでのレール色
        },
        track: {
          backgroundColor: '#60a5fa', // ダークモードでのトラック色（明るい青）
        },
        thumb: {
          backgroundColor: '#60a5fa', // ダークモードでのつまみ色（明るい青）
          '&:hover': {
            boxShadow: '0 0 0 8px rgba(96, 165, 250, 0.16)', // 明るい青に対応
          },
        },
        valueLabel: {
          backgroundColor: '#1f2937', // ダークモードでの値ラベル背景色
          color: '#f9fafb', // ダークモードでの値ラベルテキスト色
        },
      },
    },
  },
});
