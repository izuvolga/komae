```
⏺ 優れた観点です。MUIテーマと独自CSSのスプレッドシートを共存させる戦略をご提案します
  。

  推奨アプローチ: CSS Variablesによる統一

  1. テーマブリッジシステム

  // src/renderer/theme/cssVariables.ts
  import { Theme } from '@mui/material/styles';

  export const injectCSSVariables = (theme: Theme) => {
    const root = document.documentElement;

    // MUIテーマからCSS Variablesに変換
    root.style.setProperty('--color-primary', theme.palette.primary.main);
    root.style.setProperty('--color-primary-light', theme.palette.primary.light);
    root.style.setProperty('--color-primary-dark', theme.palette.primary.dark);
    root.style.setProperty('--color-secondary', theme.palette.secondary.main);
    root.style.setProperty('--color-background', theme.palette.background.default);
    root.style.setProperty('--color-surface', theme.palette.background.paper);
    root.style.setProperty('--color-text-primary', theme.palette.text.primary);
    root.style.setProperty('--color-text-secondary', theme.palette.text.secondary);
    root.style.setProperty('--color-border', theme.palette.divider);
    root.style.setProperty('--color-hover', theme.palette.action.hover);
  };

  2. スプレッドシートCSSの改修

  /* src/renderer/components/spreadsheet/EnhancedSpreadsheet.css */

  /* 旧: ハードコード */
  .enhanced-spreadsheet {
    background-color: white; /* ❌ */
  }

  .spreadsheet-header {
    background-color: #f8f9fa; /* ❌ */
    border-bottom: 2px solid #dee2e6; /* ❌ */
  }

  /* 新: CSS Variables使用 */
  .enhanced-spreadsheet {
    background-color: var(--color-background); /* ✅ */
  }

  .spreadsheet-header {
    background-color: var(--color-surface); /* ✅ */
    border-bottom: 2px solid var(--color-border); /* ✅ */
  }

  .header-cell {
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    border-right: 1px solid var(--color-border);
  }

  .spreadsheet-row:hover {
    background-color: var(--color-hover);
  }

  3. テーマプロバイダーでの自動適用

  // src/renderer/components/ThemeWrapper.tsx
  import React, { useEffect } from 'react';
  import { ThemeProvider, useTheme } from '@mui/material/styles';
  import { theme } from '../theme';
  import { injectCSSVariables } from '../theme/cssVariables';

  const CSSVariableInjector: React.FC<{ children: React.ReactNode }> = ({ children
  }) => {
    const muiTheme = useTheme();

    useEffect(() => {
      injectCSSVariables(muiTheme);
    }, [muiTheme]);

    return <>{children}</>;
  };

  export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children }) => {
    return (
      <ThemeProvider theme={theme}>
        <CSSVariableInjector>
          {children}
        </CSSVariableInjector>
      </ThemeProvider>
    );
  };

  4. テーマ変数の定義

  // src/renderer/theme/variables.ts
  export const themeVariables = {
    // スプレッドシート専用色
    spreadsheet: {
      headerBackground: 'var(--color-surface)',
      cellBorder: 'var(--color-border)',
      rowHover: 'var(--color-hover)',
      selectedCell: 'var(--color-primary-light)',
      cursorBorder: 'var(--color-primary)',
    },
    // モーダル用色（MUI使用）
    modal: {
      background: 'var(--color-background)',
      surface: 'var(--color-surface)',
    }
  } as const;

  ダークモード対応例

  // src/renderer/theme/palette.ts
  export const darkPalette: PaletteOptions = {
    mode: 'dark',
    primary: {
      main: '#339af0',
    },
    background: {
      default: '#1a1a1a',
      paper: '#2d2d2d',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  };

  // テーマ切り替え
  const theme = createTheme({
    palette: isDarkMode ? darkPalette : lightPalette,
  });

  段階的移行戦略

  Phase 1: 基盤構築

  // 1. CSS Variables システム構築
  // 2. 現在の色をテーマに定義
  // 3. ThemeProvider 適用

  Phase 2: スプレッドシート統合

  /* 重要な色から順次CSS Variables化 */
  .header-cell {
    background-color: var(--color-surface);
  }
  .spreadsheet-row:hover {
    background-color: var(--color-hover);
  }

  Phase 3: 完全統合

  // 全色をテーマ管理に移行
  // ダークモード切り替え機能追加

  利点

  1. 統一された色管理: palette.ts で全色を制御
  2. 独立性維持: スプレッドシートの独自実装を保持
  3. 段階的移行: 既存コードを徐々に更新可能
  4. ダークモード対応: 自動的にスプレッドシートにも適用

  結論: CSS Variables
  を橋渡しとして、MUIテーマとスプレッドシートCSSを統一的に管理する方法が最適です。
```
