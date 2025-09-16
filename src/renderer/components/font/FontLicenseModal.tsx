import React from 'react';
import type { FontInfo } from '../../../types/entities';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Link,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container font-license-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>License Information</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="font-info">
            <Typography variant="h6" component="h4">{font.name}</Typography>
            <Typography variant="body2" className="font-type">
              {font.isGoogleFont ? 'Google Fonts' :
               font.type === 'builtin' ? 'Built-in Font' : 'Custom Font'}
            </Typography>
            {font.isGoogleFont && font.googleFontUrl && (
              <p className="font-url">URL: <Link href="#" onClick={(e) => { e.preventDefault(); handleExternalLink(font.googleFontUrl!); }}>{font.googleFontUrl}</Link></p>
            )}
            {!font.isGoogleFont && font.filename && (
              <p className="font-filename">File: {font.filename}</p>
            )}
          </div>

          <div className="license-content">
            {font.license ? (
              <pre className="license-text">{font.license}</pre>
            ) : font.isGoogleFont ? (
              <div className="google-fonts-license">
                <p>This is a Google Fonts font. Google Fonts are generally licensed under open source licenses (such as OFL, Apache, etc.).</p>
                <p>For detailed license information, please visit:</p>
                <ul>
                  <li>
                    <Link href="#" onClick={(e) => {
                      e.preventDefault();
                      const encodedFontName = encodeURIComponent(font.name);
                      handleExternalLink(`https://fonts.google.com/specimen/${encodedFontName}/license`);
                    }}>
                      {font.name} License Page
                    </Link>
                  </li>
                  <li>
                    <Link href="#" onClick={(e) => { e.preventDefault(); handleExternalLink('https://fonts.google.com/'); }}>
                      Google Fonts General Information
                    </Link>
                  </li>
                </ul>
              </div>
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

        <div className="modal-footer">
          <Button onClick={onClose} variant="outlined">Close</Button>
        </div>
      </div>
    </div>
  );
};