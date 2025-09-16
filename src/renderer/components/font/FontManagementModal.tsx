import React, { useState, useEffect } from 'react';
import type { FontInfo } from '../../../types/entities';
import { FontAddModal } from './FontAddModal';
import { FontLicenseModal } from './FontLicenseModal';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseFont, setLicenseFont] = useState<FontInfo | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // フォント一覧を読み込みと管理者モード確認
  useEffect(() => {
    if (isOpen) {
      loadFonts();
      checkAdminMode();
    }
  }, [isOpen]);

  const checkAdminMode = async () => {
    try {
      const adminMode = await window.electronAPI.font.isAdminMode();
      setIsAdminMode(adminMode);
    } catch (error) {
      console.error('Failed to check admin mode:', error);
      setIsAdminMode(false);
    }
  };

  // フォントはApp.tsx で既に初期化済みのため、ここでは登録しない
  // カスタムフォント追加時は別途処理が必要

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

  const handleAddFont = async (fontPath: string, licensePath?: string) => {
    setIsLoading(true);
    try {
      const newFont = await window.electronAPI.font.addCustomFont(fontPath, licensePath);
      
      // CSS @font-faceルールを更新してフォント一覧も再読み込み
      const refreshedFonts = await (window as any).komaeApp?.refreshFonts?.();
      if (refreshedFonts) {
        setFonts(refreshedFonts);
      } else {
        // フォールバック：通常の再読み込み
        await loadFonts();
      }
      
      console.log('Font added successfully:', newFont.name);
    } catch (error) {
      console.error('Failed to add font:', error);
      throw error; // FontAddModalでエラーハンドリングされる
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGoogleFont = async (googleFontUrl: string) => {
    setIsLoading(true);
    try {
      const newFont = await window.electronAPI.font.addGoogleFont(googleFontUrl);
      
      // CSS @font-faceルールを更新してフォント一覧も再読み込み
      const refreshedFonts = await (window as any).komaeApp?.refreshFonts?.();
      if (refreshedFonts) {
        setFonts(refreshedFonts);
      } else {
        // フォールバック：通常の再読み込み
        await loadFonts();
      }
      
      console.log('Google Font added successfully:', newFont.name);
    } catch (error) {
      console.error('Failed to add Google font:', error);
      throw error; // FontAddModalでエラーハンドリングされる
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBuiltinFont = async (fontPath: string, licensePath?: string) => {
    setIsLoading(true);
    try {
      const newFont = await window.electronAPI.font.addBuiltinFont(fontPath, licensePath);
      
      // CSS @font-faceルールを更新してフォント一覧も再読み込み
      const refreshedFonts = await (window as any).komaeApp?.refreshFonts?.();
      if (refreshedFonts) {
        setFonts(refreshedFonts);
      } else {
        // フォールバック：通常の再読み込み
        await loadFonts();
      }
      
      console.log('Builtin Font added successfully:', newFont.name);
    } catch (error) {
      console.error('Failed to add builtin font:', error);
      throw error; // FontAddModalでエラーハンドリングされる
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

    // ビルトインフォントは管理者モードでのみ削除可能
    if (fontToDelete.type === 'builtin' && !isAdminMode) {
      alert('Built-in fonts cannot be deleted (Admin mode required)');
      return;
    }

    // システムフォント（system-ui）は削除不可
    if (fontToDelete.id === 'system-ui') {
      alert('System default font cannot be deleted');
      return;
    }

    const fontTypeText = fontToDelete.type === 'builtin' ? 'builtin font (Admin mode)' : 'font';
    const confirmed = confirm(`Are you sure you want to delete the ${fontTypeText} "${fontToDelete.name}"?`);
    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      
      // フォントタイプに応じて適切な削除関数を呼び出し
      if (fontToDelete.type === 'builtin') {
        await window.electronAPI.font.removeBuiltinFont(selectedFont);
      } else {
        await window.electronAPI.font.removeCustomFont(selectedFont);
      }
      
      // CSS @font-faceルールを更新してフォント一覧も再読み込み
      const refreshedFonts = await (window as any).komaeApp?.refreshFonts?.();
      if (refreshedFonts) {
        setFonts(refreshedFonts);
      } else {
        // フォールバック：通常の再読み込み
        await loadFonts();
      }
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
    
    // Google Fontsの場合はフォント名を使用
    if (font.isGoogleFont) {
      return `"${font.name}", system-ui, sans-serif`;
    }
    
    // ビルトインフォント・カスタムフォントの場合はIDを使用（CSS @font-faceで登録された名前と一致させる）
    return `"${font.id}", system-ui, sans-serif`;
  };

  const handleShowLicense = (font: FontInfo) => {
    setLicenseFont(font);
    setShowLicenseModal(true);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container font-management-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Font Management</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
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
                    className={`font-card ${selectedFont === font.id ? 'selected' : ''}`}
                    onClick={() => setSelectedFont(font.id)}
                  >
                    <div className="font-header">
                      <div className="font-info">
                        <span className="font-name">{font.name}</span>
                        {font.type === 'builtin' && (
                          <span className="builtin-badge">
                            Built-in{isAdminMode && font.id !== 'system-ui' ? ' (Editable)' : ''}
                          </span>
                        )}
                        {font.isGoogleFont && (
                          <span className="google-fonts-badge">Google Fonts</span>
                        )}
                      </div>
                      <button
                        className="license-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowLicense(font);
                        }}
                        title="View license information"
                      >
                        LICENSE
                      </button>
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
              className="btn btn-danger"
              onClick={handleDeleteFont}
              disabled={!selectedFont || isLoading || (
                // システムフォントは削除不可
                fonts.find(f => f.id === selectedFont)?.id === 'system-ui' ||
                // ビルトインフォントは管理者モードでのみ削除可能
                (fonts.find(f => f.id === selectedFont)?.type === 'builtin' && !isAdminMode)
              )}
              title={
                fonts.find(f => f.id === selectedFont)?.id === 'system-ui'
                  ? 'System default font cannot be deleted'
                  : fonts.find(f => f.id === selectedFont)?.type === 'builtin' && !isAdminMode
                    ? 'Built-in fonts cannot be deleted (Admin mode required)'
                    : 'Delete selected font'
              }
            >
              Delete Font
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
              disabled={isLoading}
            >
              Add Font
            </button>
          </div>
        </div>

        {/* サブモーダル */}
        <FontAddModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddFont}
          onAddGoogleFont={handleAddGoogleFont}
          onAddBuiltinFont={handleAddBuiltinFont}
        />
        
        <FontLicenseModal
          isOpen={showLicenseModal}
          onClose={() => setShowLicenseModal(false)}
          font={licenseFont}
        />
      </div>
    </div>
  );
};