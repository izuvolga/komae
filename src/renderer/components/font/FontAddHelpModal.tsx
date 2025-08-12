import React from 'react';
import './FontAddHelpModal.css';

interface FontAddHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FontAddHelpModal: React.FC<FontAddHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleExternalLink = async (url: string) => {
    try {
      await window.electronAPI.system.openExternal(url);
    } catch (error) {
      console.error('Failed to open external link:', error);
    }
  };

  return (
    <div className="font-add-help-modal-overlay" onClick={onClose}>
      <div className="font-add-help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-content">
          <h3>Google Fonts の利用方法</h3>
          
          <p>
            フォントのファイルを指定せず、<a href="#" onClick={(e) => { e.preventDefault(); handleExternalLink('https://fonts.google.com/'); }}>Google Fonts</a> の提供するフォントを利用できます。
            HTML ファイルでのエクスポート時には、Google Fonts のフォントを利用するための CSS の記述が自動的に追加されます。
          </p>
          
          <div className="warning-box">
            <strong>注意:</strong> フォントの配布元がフォントの提供を停止した場合、フォントが表示されなくなる可能性がある点は注意してください。
          </div>
          
          <h4>利用手順</h4>
          <ol>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); handleExternalLink('https://fonts.google.com/'); }}>Google Fonts</a> サイトでお好みのフォントを選択
            </li>
            <li>「Web」タブの <code>&lt;link&gt;</code> セクションを開く</li>
            <li>以下のような記述から URL 部分をコピー</li>
            <li>上記のテキストボックスに貼り付け</li>
          </ol>
          
          <h4>コピー例</h4>
          <p>以下の記述の場合、<code>https://fonts.googleapis.com/css?family=Example+Font</code> の部分をコピーしてください。</p>
          
          <div className="code-block">
            <pre>{`<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="`}<span className="highlight-url">https://fonts.googleapis.com/css?family=Example+Font</span>{`" rel="stylesheet">`}</pre>
          </div>
        </div>
        
        <div className="help-actions">
          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};