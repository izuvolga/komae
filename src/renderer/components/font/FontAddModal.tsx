import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  FormControl,
  FormLabel,
} from '@mui/material';
import { Cached as CachedIcon, Close as CloseIcon, Help as HelpIcon, FolderOpen as FolderOpenIcon, Add as AddIcon,  } from '@mui/icons-material';
import { useTheme } from '../../../theme/ThemeContext';
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
  const { mode } = useTheme();
  const [fontType, setFontType] = useState<'embed' | 'google' | 'builtin'>('embed');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [fontFile, setFontFile] = useState<string>('');
  const [licenseFile, setLicenseFile] = useState<string>('');
  const [googleFontUrl, setGoogleFontUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLicenseHelpModal, setShowLicenseHelpModal] = useState(false);

  // data-theme属性の設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

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
    <>
      <Dialog
        open={isOpen}
        onClose={isLoading ? undefined : handleCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '500px',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pr: 1,
          }}
        >
          Add Font
          <IconButton
            onClick={handleCancel}
            disabled={isLoading}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 1 }}>
          {/* フォントタイプ選択 */}
          <FormControl component="fieldset" sx={{ mb: 3 }} disabled={isLoading}>
            <RadioGroup
              value={fontType}
              onChange={(e) => setFontType(e.target.value as 'embed' | 'google' | 'builtin')}
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value="embed"
                control={<Radio />}
                label="埋め込み（ファイル）"
              />
              <FormControlLabel
                value="google"
                control={<Radio />}
                label="Google Fonts"
              />
              {isAdminMode && (
                <FormControlLabel
                  value="builtin"
                  control={<Radio />}
                  label="ビルトイン（管理者）"
                />
              )}
            </RadioGroup>
          </FormControl>

          {/* 埋め込みフォント用フィールド */}
          {fontType === 'embed' && (
            <>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={fontFile ? fontFile.split('/').pop() || fontFile : ''}
                    placeholder="フォントファイルを選択..."
                    InputProps={{
                      readOnly: true,
                    }}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleFontFileSelect}
                    disabled={isLoading}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    <FolderOpenIcon />
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">
                    License File
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={showLicenseHelp}
                    title="ライセンス情報について"
                    sx={{ ml: 1 }}
                  >
                    <HelpIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={licenseFile ? licenseFile.split('/').pop() || licenseFile : ''}
                    placeholder="ライセンスファイルを選択（オプション）..."
                    InputProps={{
                      readOnly: true,
                    }}
                    size="small"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleLicenseFileSelect}
                    disabled={isLoading}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    <FolderOpenIcon />
                  </Button>
                </Box>
              </Box>
            </>
          )}

          {/* Google Fonts用フィールド */}
          {fontType === 'google' && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">
                  Google Fonts URL
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setShowHelpModal(true)}
                  title="Google Fonts URLの取得方法"
                  sx={{ ml: 1 }}
                >
                  <HelpIcon fontSize="small" />
                </IconButton>
              </Box>
              <TextField
                fullWidth
                value={googleFontUrl}
                onChange={(e) => setGoogleFontUrl(e.target.value)}
                placeholder="https://fonts.googleapis.com/css?family=..."
                disabled={isLoading}
                size="small"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Google Fonts のリンクタグから href の URL をコピーして貼り付けてください
              </Typography>
            </Box>
          )}

          {/* ビルトインフォント用フィールド */}
          {fontType === 'builtin' && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Font File
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    value={fontFile ? fontFile.split('/').pop() || fontFile : ''}
                    placeholder="フォントファイルを選択..."
                    InputProps={{ readOnly: true }}
                    size="small"
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    onClick={handleFontFileSelect}
                    disabled={isLoading}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    <FolderOpenIcon />
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">
                    License File
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={showLicenseHelp}
                    title="ライセンス情報について"
                    sx={{ ml: 1 }}
                  >
                    <HelpIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    value={licenseFile ? licenseFile.split('/').pop() || licenseFile : ''}
                    placeholder="ライセンスファイルを選択（オプション）..."
                    InputProps={{ readOnly: true }}
                    size="small"
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    onClick={handleLicenseFileSelect}
                    disabled={isLoading}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    <FolderOpenIcon />
                  </Button>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                ビルトインフォントとして public/fonts/ ディレクトリに追加されます（管理者モード）
              </Typography>
            </>
          )}

        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleAdd}
            variant="contained"
            disabled={(fontType === 'embed' && !fontFile) || (fontType === 'google' && !googleFontUrl.trim()) || (fontType === 'builtin' && !fontFile) || isLoading}
          >
            {isLoading ? <CachedIcon /> : <AddIcon />}
          </Button>
        </DialogActions>
      </Dialog>

      <FontAddHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      <FontLicenseHelpModal
        isOpen={showLicenseHelpModal}
        onClose={() => setShowLicenseHelpModal(false)}
      />
    </>
  );
};
