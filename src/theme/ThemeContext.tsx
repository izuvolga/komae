import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '@mui/material/styles';
import { komaeTheme, komaeDarkTheme } from './muiTheme';
import { useAppSettingsStore } from '../renderer/stores/appSettingsStore';
import type { ThemePreference } from '../main/services/AppSettingsManager';

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

// システムのダークモード設定を取得
const getSystemTheme = (): ThemeMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// テーマ設定から実際のテーマモードを決定
const getEffectiveTheme = (preference: ThemePreference): ThemeMode => {
  switch (preference) {
    case 'light':
      return 'light';
    case 'dark':
      return 'dark';
    case 'system':
      return getSystemTheme();
    default:
      return 'light';
  }
};

interface ThemeContextProviderProps {
  children: ReactNode;
}

/**
 * テーマコンテキストプロバイダー
 * アプリケーション全体のテーマ状態を管理
 */
export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({ children }) => {
  const { settings, updateSetting } = useAppSettingsStore();
  const [mode, setMode] = useState<ThemeMode>('light');

  // 設定からテーマモードを更新
  useEffect(() => {
    if (settings) {
      const effectiveMode = getEffectiveTheme(settings.themePreference);
      setMode(effectiveMode);
    }
  }, [settings]);

  // システムテーマの変更を監視（systemモードの場合のみ）
  useEffect(() => {
    if (!settings || settings.themePreference !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setMode(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [settings]);

  // テーマモードに基づいてMUIテーマを選択
  const theme = mode === 'dark' ? komaeDarkTheme : komaeTheme;

  // テーマ切り替え関数（light → dark → system のサイクル）
  const toggleTheme = async () => {
    if (!settings) return;

    const currentPreference = settings.themePreference;
    let nextPreference: ThemePreference;

    switch (currentPreference) {
      case 'light':
        nextPreference = 'dark';
        break;
      case 'dark':
        nextPreference = 'system';
        break;
      case 'system':
        nextPreference = 'light';
        break;
      default:
        nextPreference = 'light';
        break;
    }

    try {
      await updateSetting('themePreference', nextPreference);
    } catch (error) {
      console.error('Failed to update theme preference:', error);
    }
  };

  // テーマ設定関数（直接的なモード設定）
  const setTheme = async (newMode: ThemeMode) => {
    try {
      await updateSetting('themePreference', newMode === 'dark' ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to update theme preference:', error);
    }
  };

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