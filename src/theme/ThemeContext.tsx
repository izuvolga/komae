import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '@mui/material/styles';
import { komaeTheme, komaeDarkTheme } from './muiTheme';

// テーマモードの型定義
export type ThemeMode = 'light' | 'dark';

// テーマコンテキストの型定義
interface ThemeContextType {
  mode: ThemeMode;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

// コンテキストの作成
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ローカルストレージのキー
const THEME_STORAGE_KEY = 'komae-theme-mode';

// システムのダークモード設定を取得
const getSystemTheme = (): ThemeMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// 保存されたテーマまたはシステムテーマを取得
const getInitialTheme = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    if (savedTheme) {
      return savedTheme;
    }
  }
  return getSystemTheme();
};

interface ThemeContextProviderProps {
  children: ReactNode;
}

/**
 * テーマコンテキストプロバイダー
 * アプリケーション全体のテーマ状態を管理
 */
export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => getInitialTheme());

  // テーマモードに基づいてMUIテーマを選択
  const theme = mode === 'dark' ? komaeDarkTheme : komaeTheme;

  // テーマ切り替え関数
  const toggleTheme = () => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  // テーマ設定関数
  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  // テーマモードが変更されたときにローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  // システムテーマの変更を監視
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // 保存されたテーマがない場合のみシステムテーマに従う
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedTheme) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const contextValue: ThemeContextType = {
    mode,
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * テーマコンテキストを使用するカスタムフック
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeContextProvider');
  }
  return context;
};