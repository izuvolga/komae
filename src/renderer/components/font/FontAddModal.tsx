import React, { useState, useEffect } from 'react';
import './FontAddModal.css';
import { FontAddHelpModal } from './FontAddHelpModal';
import { FontLicenseHelpModal } from './FontLicenseHelpModal';

interface FontAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (fontPath: string, licensePath?: string) => Promise<void>;
  onAddGoogleFont?: (googleFontUrl: string) => Promise<void>;
  onAddBuiltinFont?: (fontPath: string, licensePath?: string) => Promise<void>;
}

export const FontAddModal: React.FC<FontAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onAddGoogleFont,
  onAddBuiltinFont,
}) => {
  const [fontType, setFontType] = useState<'embed' | 'google' | 'builtin'>('embed');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [fontFile, setFontFile] = useState<string>('');
  const [licenseFile, setLicenseFile] = useState<string>('');
  const [googleFontUrl, setGoogleFontUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLicenseHelpModal, setShowLicenseHelpModal] = useState(false);

  // 管理者モードかどうかを確認
  useEffect(() => {
    const checkAdminMode = async () => {
      try {
        const adminMode = await window.electronAPI.font.isAdminMode();
        setIsAdminMode(adminMode);
      } catch (error) {
        console.error('Failed to check admin mode:', error);
        setIsAdminMode(false);
      }
    };

    if (isOpen) {
      checkAdminMode();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleFontFileSelect = async () => {
    try {
      const result = await window.electronAPI.fileSystem.showOpenDialog({
        title: 'Select Font File',
        filters: [
          { 
            name: 'Font Files', 
            extensions: ['ttf', 'otf', 'woff', 'woff2'] 
          }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setFontFile(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to select font file:', error);
      alert('Failed to select font file: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleLicenseFileSelect = async () => {
    try {
      const result = await window.electronAPI.fileSystem.showOpenDialog({
        title: 'Select License File',
        filters: [
          { 
            name: 'Text Files', 
            extensions: ['txt', 'md', 'license'] 
          },
          { 
            name: 'All Files', 
            extensions: ['*'] 
          }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setLicenseFile(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to select license file:', error);
      alert('Failed to select license file: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleAdd = async () => {
    if (fontType === 'embed') {
      if (!fontFile) {
        alert('フォントファイルを選択してください');
        return;
      }
      
      setIsLoading(true);
      try {
        await onAdd(fontFile, licenseFile || undefined);
        // 成功したらフォームをリセットして閉じる
        setFontFile('');
        setLicenseFile('');
        onClose();
      } catch (error) {
        console.error('Failed to add font:', error);
        alert('フォントの追加に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setIsLoading(false);
      }
    } else if (fontType === 'builtin') {
      if (!fontFile) {
        alert('フォントファイルを選択してください');
        return;
      }
      
      if (!onAddBuiltinFont) {
        alert('ビルトインフォント機能が利用できません');
        return;
      }
      
      setIsLoading(true);
      try {
        await onAddBuiltinFont(fontFile, licenseFile || undefined);
        // 成功したらフォームをリセットして閉じる
        setFontFile('');
        setLicenseFile('');
        onClose();
      } catch (error) {
        console.error('Failed to add builtin font:', error);
        alert('ビルトインフォントの追加に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setIsLoading(false);
      }
    } else if (fontType === 'google') {
      if (!googleFontUrl.trim()) {
        alert('Google Fonts URLを入力してください');
        return;
      }
      
      if (!onAddGoogleFont) {
        alert('Google Fonts機能が利用できません');
        return;
      }
      
      setIsLoading(true);
      try {
        await onAddGoogleFont(googleFontUrl.trim());
        // 成功したらフォームをリセットして閉じる
        setGoogleFontUrl('');
        onClose();
      } catch (error) {
        console.error('Failed to add Google font:', error);
        alert('Google Fontの追加に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setFontFile('');
    setLicenseFile('');
    setGoogleFontUrl('');
    setShowHelpModal(false);
    setShowLicenseHelpModal(false);
    onClose();
  };

  const showLicenseHelp = () => {
    setShowLicenseHelpModal(true);
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-container font-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Font</h2>
          <button className="modal-close-btn" onClick={handleCancel}>×</button>
        </div>
        
        <div className="modal-content">
          {/* フォントタイプ選択 */}
          <div className="form-section">
            <label>フォントタイプ</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="fontType"
                  value="embed"
                  checked={fontType === 'embed'}
                  onChange={(e) => setFontType(e.target.value as 'embed' | 'google' | 'builtin')}
                  disabled={isLoading}
                />
                埋め込み（ファイル）
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="fontType"
                  value="google"
                  checked={fontType === 'google'}
                  onChange={(e) => setFontType(e.target.value as 'embed' | 'google' | 'builtin')}
                  disabled={isLoading}
                />
                Google Fonts
              </label>
              {isAdminMode && (
                <label className="radio-option">
                  <input
                    type="radio"
                    name="fontType"
                    value="builtin"
                    checked={fontType === 'builtin'}
                    onChange={(e) => setFontType(e.target.value as 'embed' | 'google' | 'builtin')}
                    disabled={isLoading}
                  />
                  ビルトイン（管理者）
                </label>
              )}
            </div>
          </div>

          {/* 埋め込みフォント用フィールド */}
          {fontType === 'embed' && (
            <>
              <div className="form-section">
                <label>
                  Font File
                  <div className="file-input-row">
                    <input
                      type="text"
                      value={fontFile ? fontFile.split('/').pop() || fontFile : ''}
                      placeholder="フォントファイルを選択..."
                      readOnly
                      className="file-path-input"
                    />
                    <button 
                      type="button" 
                      onClick={handleFontFileSelect}
                      className="file-select-button"
                      disabled={isLoading}
                    >
                      📁
                    </button>
                  </div>
                </label>
              </div>

              <div className="form-section">
                <label>
                  License File 
                  <button 
                    type="button" 
                    onClick={showLicenseHelp}
                    className="help-button"
                    title="ライセンス情報について"
                  >
                    ?
                  </button>
                  <div className="file-input-row">
                    <input
                      type="text"
                      value={licenseFile ? licenseFile.split('/').pop() || licenseFile : ''}
                      placeholder="ライセンスファイルを選択（オプション）..."
                      readOnly
                      className="file-path-input"
                    />
                    <button 
                      type="button" 
                      onClick={handleLicenseFileSelect}
                      className="file-select-button"
                      disabled={isLoading}
                    >
                      📁
                    </button>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Google Fonts用フィールド */}
          {fontType === 'google' && (
            <div className="form-section">
              <label>
                Google Fonts URL
                <button 
                  type="button" 
                  onClick={() => setShowHelpModal(true)}
                  className="help-button"
                  title="Google Fonts URLの取得方法"
                >
                  ?
                </button>
                <input
                  type="text"
                  value={googleFontUrl}
                  onChange={(e) => setGoogleFontUrl(e.target.value)}
                  placeholder="https://fonts.googleapis.com/css?family=..."
                  className="text-input"
                  disabled={isLoading}
                />
              </label>
              <div className="form-help">
                Google Fonts のリンクタグから href の URL をコピーして貼り付けてください
              </div>
            </div>
          )}

          {/* ビルトインフォント用フィールド */}
          {fontType === 'builtin' && (
            <>
              <div className="form-section">
                <label>
                  Font File
                  <div className="file-input-row">
                    <input
                      type="text"
                      value={fontFile ? fontFile.split('/').pop() || fontFile : ''}
                      placeholder="フォントファイルを選択..."
                      readOnly
                      className="file-path-input"
                    />
                    <button 
                      type="button" 
                      onClick={handleFontFileSelect}
                      className="file-select-button"
                      disabled={isLoading}
                    >
                      📁
                    </button>
                  </div>
                </label>
              </div>

              <div className="form-section">
                <label>
                  License File 
                  <button 
                    type="button" 
                    onClick={showLicenseHelp}
                    className="help-button"
                    title="ライセンス情報について"
                  >
                    ?
                  </button>
                  <div className="file-input-row">
                    <input
                      type="text"
                      value={licenseFile ? licenseFile.split('/').pop() || licenseFile : ''}
                      placeholder="ライセンスファイルを選択（オプション）..."
                      readOnly
                      className="file-path-input"
                    />
                    <button 
                      type="button" 
                      onClick={handleLicenseFileSelect}
                      className="file-select-button"
                      disabled={isLoading}
                    >
                      📁
                    </button>
                  </div>
                </label>
              </div>
              <div className="form-help">
                ビルトインフォントとして public/fonts/ ディレクトリに追加されます（管理者モード）
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="btn btn-primary"
            disabled={(fontType === 'embed' && !fontFile) || (fontType === 'google' && !googleFontUrl.trim()) || (fontType === 'builtin' && !fontFile) || isLoading}
          >
            {isLoading ? '追加中...' : '追加'}
          </button>
        </div>
      </div>
      
      <FontAddHelpModal 
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
      
      <FontLicenseHelpModal 
        isOpen={showLicenseHelpModal}
        onClose={() => setShowLicenseHelpModal(false)}
      />
    </div>
  );
};