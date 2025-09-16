import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Link,
  Box,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import './FontAddHelpModal.css';

interface FontAddHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FontAddHelpModal: React.FC<FontAddHelpModalProps> = ({
  isOpen,
  onClose,
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
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        zIndex: 1400, // FontAddModal(1300)より高く設定
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
        <Typography variant="h6" component="h2">
          Google Fonts の利用方法
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
          
        <Typography variant="body1" sx={{ mb: 2 }}>
          フォントのファイルを指定せず、
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleExternalLink('https://fonts.google.com/');
            }}
          >
            Google Fonts
          </Link>
          の提供するフォントを利用できます。
          HTML ファイルでのエクスポート時には、Google Fonts のフォントを利用するための CSS の記述が自動的に追加されます。
        </Typography>
          
        <Box
          sx={{
            p: 2,
            bgcolor: 'warning.light',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            注意: フォントの配布元がフォントの提供を停止した場合、フォントが表示されなくなる可能性がある点は注意してください。
          </Typography>
        </Box>
          
        <Typography variant="h6" sx={{ mb: 1 }}>
          利用手順
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="1. Google Fontsサイトでお好みのフォントを選択"
              secondary={
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleExternalLink('https://fonts.google.com/');
                  }}
                >
                  https://fonts.google.com/
                </Link>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="2. 「Web」タブの <link> セクションを開く" />
          </ListItem>
          <ListItem>
            <ListItemText primary="3. 以下のような記述から URL 部分をコピー" />
          </ListItem>
          <ListItem>
            <ListItemText primary="4. 上記のテキストボックスに貼り付け" />
          </ListItem>
        </List>
          
        <Typography variant="h6" sx={{ mb: 1, mt: 2 }}>
          コピー例
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          以下の記述の場合、<code>https://fonts.googleapis.com/css?family=Example+Font</code> の部分をコピーしてください。
        </Typography>

        <Box
          sx={{
            bgcolor: 'grey.100',
            p: 2,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            overflow: 'auto',
          }}
        >
          <Typography component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
{`<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="`}<Box component="span" sx={{ bgcolor: 'yellow', px: 0.5 }}>https://fonts.googleapis.com/css?family=Example+Font</Box>{`" rel="stylesheet">`}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};