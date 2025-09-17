import React from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ThemeContextProvider, useTheme } from './ThemeContext';

// Roboto フォントのインポート
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * 内部のMUIテーマプロバイダーコンポーネント
 * ThemeContextから動的テーマを受け取ってMUIに適用
 */
const InnerThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <MuiThemeProvider theme={theme}>
      {/* CssBaseline: ブラウザのデフォルトCSSをリセットし、一貫したベーススタイルを提供 */}
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

/**
 * メインのテーマプロバイダーコンポーネント
 * アプリケーション全体にテーマコンテキストとMUIテーマを適用する
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <ThemeContextProvider>
      <InnerThemeProvider>
        {children}
      </InnerThemeProvider>
    </ThemeContextProvider>
  );
};