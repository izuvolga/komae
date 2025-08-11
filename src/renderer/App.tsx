import React, { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { NotificationDisplay } from './components/notification/NotificationDisplay';
import { useProjectStore } from './stores/projectStore';
import type { FontInfo } from '../types/entities';
import './App.css';

const App: React.FC = () => {
  const isLoading = useProjectStore((state) => state.app.isLoading);
  const errors = useProjectStore((state) => state.app.errors);
  const clearErrors = useProjectStore((state) => state.clearErrors);

  // アプリ起動時に全フォントを初期化
  useEffect(() => {
    const initializeFonts = async () => {
      try {
        console.log('[App] Initializing all fonts...');
        const fonts: FontInfo[] = await window.electronAPI.font.getAvailableFonts();
        console.log(`[App] Loaded ${fonts.length} fonts (builtin + global custom)`);
        
        // フォントをCSSに登録
        registerFontsInCSS(fonts);
      } catch (error) {
        console.error('Failed to initialize fonts:', error);
      }
    };

    initializeFonts();
  }, []);

  // フォントをCSSに動的登録
  const registerFontsInCSS = (fonts: FontInfo[]) => {
    // 既存のフォントスタイルタグを削除
    const existingStyle = document.getElementById('komae-font-faces');
    if (existingStyle) {
      existingStyle.remove();
    }

    // 新しいスタイルタグを作成
    const style = document.createElement('style');
    style.id = 'komae-font-faces';
    
    const fontFaceRules: string[] = [];
    
    fonts.forEach(font => {
      if (font.path !== 'system-ui') {
        // ビルトインフォントとグローバルカスタムフォントをkomae-assetプロトコルで登録
        const fontUrl = `komae-asset://${font.path}`;
        const fontFamily = font.id; // IDを使用してSVGと一致させる
        
        // ファイル拡張子からフォーマットを決定
        const extension = font.filename?.split('.').pop()?.toLowerCase() || 'ttf';
        let format = 'truetype';
        if (extension === 'otf') format = 'opentype';
        else if (extension === 'woff') format = 'woff';
        else if (extension === 'woff2') format = 'woff2';
        
        fontFaceRules.push(`
          @font-face {
            font-family: "${fontFamily}";
            src: url("${fontUrl}") format("${format}");
            font-display: swap;
          }
        `);
      }
    });
    
    style.textContent = fontFaceRules.join('\n');
    document.head.appendChild(style);
    
    console.log(`[App] Registered ${fontFaceRules.length} font faces in CSS`);
  };

  return (
    <div className="app">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      )}
      
      {errors.length > 0 && (
        <div className="error-banner">
          {errors.map((error, index) => (
            <div key={index} className="error-message">
              <span>{error.message}</span>
              <button 
                className="error-close"
                onClick={clearErrors}
                title="エラーを閉じる"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <MainLayout />
      <NotificationDisplay />
    </div>
  );
};

export default App;