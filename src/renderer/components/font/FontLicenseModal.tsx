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
  const handleExternalLink = async (url: string) => {
    try {
      await window.electronAPI.system.openExternal(url);
    } catch (error) {
      console.error('Failed to open external link:', error);
    }
  };

  return (
    <Dialog
      open={isOpen && !!font}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 1400 }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pr: 1,
        }}
      >
        License Information
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {font && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" component="h4" sx={{ mb: 1 }}>
              {font.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {font.isGoogleFont ? 'Google Fonts' :
               font.type === 'builtin' ? 'Built-in Font' : 'Custom Font'}
            </Typography>
            {font.isGoogleFont && font.googleFontUrl && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                URL: <Link href="#" onClick={(e) => { e.preventDefault(); handleExternalLink(font.googleFontUrl!); }}>{font.googleFontUrl}</Link>
              </Typography>
            )}
            {!font.isGoogleFont && font.filename && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                File: {font.filename}
              </Typography>
            )}
          </Box>
        )}

        {font && (
          <Box>
            {font.license ? (
              <Box
                sx={{
                  bgcolor: 'grey.10',
                  p: 2,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  overflow: 'auto',
                  maxHeight: '400px',
                }}
              >
                {font.license}
              </Box>
            ) : font.isGoogleFont ? (
              <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  This is a Google Fonts font. Google Fonts are generally licensed under open source licenses (such as OFL, Apache, etc.).
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  For detailed license information, please visit:
                </Typography>
                <Box component="ul" sx={{ pl: 2 }}>
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
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  No license information available for this font.
                </Typography>
                {font.type === 'builtin' && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    This is a built-in font. Please check the font's original license if you plan to use it commercially.
                  </Typography>
                )}
                {font.type === 'custom' && (
                  <Typography variant="body2">
                    Consider adding license information when using this font in your projects.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
