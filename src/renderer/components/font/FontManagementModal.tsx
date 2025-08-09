import React, { useState, useEffect } from 'react';
import type { FontInfo } from '../../../types/entities';
import './FontManagementModal.css';

interface FontManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FontManagementModal: React.FC<FontManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [sampleText, setSampleText] = useState('HELLO WORLD');
  const [fonts, setFonts] = useState<FontInfo[]>([]);
  const [selectedFont, setSelectedFont] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // フォント一覧を読み込み
  useEffect(() => {
    if (isOpen) {
      loadFonts();
    }
  }, [isOpen]);

  // フォントをCSSに動的登録
  useEffect(() => {
    const registerFontsInCSS = () => {
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
        if (font.type === 'builtin' && font.path !== 'system-ui') {
          // ビルトインフォントをHTTP URLで登録（開発サーバー経由）
          const fontUrl = `http://localhost:3000/${font.path}`;
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
        // カスタムフォント処理は後で追加
      });
      
      style.textContent = fontFaceRules.join('\n');
      document.head.appendChild(style);
      
      console.log('[FontManager] Registered font faces:', fontFaceRules.length);
      console.log('[FontManager] CSS rules:', style.textContent);
    };

    if (fonts.length > 0) {
      registerFontsInCSS();
    }
  }, [fonts]);

  const loadFonts = async () => {
    try {
      setIsLoading(true);
      const availableFonts = await window.electronAPI.font.getAvailableFonts();
      setFonts(availableFonts || []);
    } catch (error) {
      console.error('Failed to load fonts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFont = async () => {
    try {
      const result = await window.electronAPI.fileSystem.showOpenDialog({
        title: 'Add Font',
        filters: [
          { 
            name: 'Font Files', 
            extensions: ['ttf', 'otf', 'woff', 'woff2'] 
          }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setIsLoading(true);
        const newFont = await window.electronAPI.font.addCustomFont(result.filePaths[0]);
        
        // フォント一覧を再読み込み
        await loadFonts();
        
        console.log('Font added successfully:', newFont.name);
      }
    } catch (error) {
      console.error('Failed to add font:', error);
      alert('Failed to add font: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFont = async () => {
    if (!selectedFont) {
      alert('Please select a font to delete');
      return;
    }

    const fontToDelete = fonts.find(f => f.id === selectedFont);
    if (!fontToDelete) {
      return;
    }

    // ビルトインフォントは削除不可
    if (fontToDelete.type === 'builtin') {
      alert('Built-in fonts cannot be deleted');
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete the font "${fontToDelete.name}"?`);
    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      await window.electronAPI.font.removeCustomFont(selectedFont);
      
      // フォント一覧を再読み込み
      await loadFonts();
      setSelectedFont(null);
      
      console.log('Font deleted successfully:', fontToDelete.name);
    } catch (error) {
      console.error('Failed to delete font:', error);
      alert('Failed to delete font: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const getFontFamily = (font: FontInfo): string => {
    // システムフォントの場合
    if (font.id === 'system-ui') {
      return 'system-ui, -apple-system, sans-serif';
    }
    
    // ビルトインフォント・カスタムフォントの場合はIDを使用（CSS @font-faceで登録された名前と一致させる）
    return `"${font.id}", system-ui, sans-serif`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="font-management-modal-overlay" onClick={onClose}>
      <div className="font-management-modal" onClick={(e) => e.stopPropagation()}>
        <div className="font-management-modal-header">
          <h2>Font Management</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="font-management-modal-content">
          {/* Sample Text入力 */}
          <div className="sample-text-section">
            <label htmlFor="sample-text">Sample Text</label>
            <input
              id="sample-text"
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Enter sample text..."
              className="sample-text-input"
            />
          </div>

          {/* フォント一覧 */}
          <div className="fonts-list-section">
            {isLoading ? (
              <div className="loading-message">Loading fonts...</div>
            ) : (
              <div className="fonts-list">
                {fonts.map((font) => (
                  <div
                    key={font.id}
                    className={`font-item ${selectedFont === font.id ? 'selected' : ''}`}
                    onClick={() => setSelectedFont(font.id)}
                  >
                    <div className="font-header">
                      <span className="font-name">
                        {font.name}
                        {font.type === 'builtin' && (
                          <span className="builtin-badge">Built-in</span>
                        )}
                      </span>
                    </div>
                    <div 
                      className="font-preview"
                      style={{ 
                        fontFamily: getFontFamily(font),
                        fontSize: '18px',
                        lineHeight: '1.4'
                      }}
                    >
                      {sampleText}
                    </div>
                  </div>
                ))}
                
                {fonts.length === 0 && !isLoading && (
                  <div className="no-fonts-message">
                    No fonts available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 操作ボタン */}
          <div className="font-management-actions">
            <button
              className="delete-font-button"
              onClick={handleDeleteFont}
              disabled={!selectedFont || isLoading}
            >
              Delete Font
            </button>
            <button
              className="add-font-button"
              onClick={handleAddFont}
              disabled={isLoading}
            >
              Add Font
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};