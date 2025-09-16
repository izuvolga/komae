import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { komaeTheme } from './muiTheme';

// Roboto フォントのインポート
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * MUIテーマプロバイダーコンポーネント
 * アプリケーション全体にMUIテーマを適用する
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <MuiThemeProvider theme={komaeTheme}>
      {/* CssBaseline: ブラウザのデフォルトCSSをリセットし、一貫したベーススタイルを提供 */}
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};