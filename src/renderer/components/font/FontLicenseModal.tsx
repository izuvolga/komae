import React from 'react';
import type { FontInfo } from '../../../types/entities';
import './FontLicenseModal.css';

interface FontLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  font: FontInfo | null;
}

export const FontLicenseModal: React.FC<FontLicenseModalProps> = ({
  isOpen,
  onClose,
  font,
}) => {
  if (!isOpen || !font) {
    return null;
  }

  const handleExternalLink = async (url: string) => {
    try {
      await window.electronAPI.system.openExternal(url);
    } catch (error) {
      console.error('Failed to open external link:', error);
    }
  };

  return (
    <div className="font-license-modal-overlay" onClick={onClose}>
      <div className="font-license-modal" onClick={(e) => e.stopPropagation()}>
        <div className="font-license-modal-header">
          <h3>License Information</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="font-license-modal-content">
          <div className="font-info">
            <h4>{font.name}</h4>
            <p className="font-type">
              {font.isGoogleFont ? 'Google Fonts' : 
               font.type === 'builtin' ? 'Built-in Font' : 'Custom Font'}
            </p>
            {font.isGoogleFont && font.googleFontUrl && (
              <p className="font-url">URL: <a href="#" onClick={(e) => { e.preventDefault(); handleExternalLink(font.googleFontUrl!); }}>{font.googleFontUrl}</a></p>
            )}
            {!font.isGoogleFont && font.filename && (
              <p className="font-filename">File: {font.filename}</p>
            )}
          </div>

          <div className="license-content">
            {font.license ? (
              <pre className="license-text">{font.license}</pre>
            ) : (
              <div className="no-license">
                <p>No license information available for this font.</p>
                {font.isGoogleFont && (
                  <div className="google-fonts-license">
                    <p>This is a Google Fonts font. Google Fonts are generally licensed under open source licenses (such as OFL, Apache, etc.).</p>
                    <p>For specific license information, please visit: <a href="#" onClick={(e) => { e.preventDefault(); handleExternalLink('https://fonts.google.com/'); }}>Google Fonts</a></p>
                  </div>
                )}
                {font.type === 'builtin' && !font.isGoogleFont && (
                  <p>This is a built-in font. Please check the font's original license if you plan to use it commercially.</p>
                )}
                {font.type === 'custom' && !font.isGoogleFont && (
                  <p>Consider adding license information when using this font in your projects.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="font-license-modal-footer">
          <button onClick={onClose} className="close-modal-button">Close</button>
        </div>
      </div>
    </div>
  );
};