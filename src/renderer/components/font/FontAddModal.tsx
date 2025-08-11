import React, { useState } from 'react';
import './FontAddModal.css';

interface FontAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (fontPath: string, licensePath?: string) => Promise<void>;
}

export const FontAddModal: React.FC<FontAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [fontFile, setFontFile] = useState<string>('');
  const [licenseFile, setLicenseFile] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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
    if (!fontFile) {
      alert('Please select a font file');
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
      alert('Failed to add font: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFontFile('');
    setLicenseFile('');
    onClose();
  };

  const showLicenseHelp = () => {
    const helpMessage = `ライセンス情報について:

• フォントはHTMLファイルのエクスポート時にファイルに埋め込まれます
• HTMLファイルのビューワーに著作権表示がされるページも追加されます
• フォントを利用する際には、ライセンス情報を確認することが推奨されます
• 特に以下の点をよく確認してください:
  - 商用利用が可能かどうか
  - 組み込み利用が可能かどうか
  - 再配布が可能かどうか`;

    alert(helpMessage);
  };

  return (
    <div className="font-add-modal-overlay" onClick={handleCancel}>
      <div className="font-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="font-add-modal-header">
          <h3>Add Font</h3>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        <div className="font-add-modal-content">
          <div className="form-section">
            <label>
              Font File
              <div className="file-input-row">
                <input
                  type="text"
                  value={fontFile ? fontFile.split('/').pop() || fontFile : ''}
                  placeholder="Select font file..."
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
                  placeholder="Select license file (optional)..."
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
        </div>

        <div className="font-add-modal-footer">
          <button 
            onClick={handleCancel} 
            className="cancel-button"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleAdd} 
            className="add-button"
            disabled={!fontFile || isLoading}
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};