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
              {font.type === 'builtin' ? 'Built-in Font' : 'Custom Font'}
            </p>
            {font.filename && (
              <p className="font-filename">File: {font.filename}</p>
            )}
          </div>

          <div className="license-content">
            {font.license ? (
              <pre className="license-text">{font.license}</pre>
            ) : (
              <div className="no-license">
                <p>No license information available for this font.</p>
                {font.type === 'builtin' && (
                  <p>This is a built-in font. Please check the font's original license if you plan to use it commercially.</p>
                )}
                {font.type === 'custom' && (
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