import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Close as CloseIcon, HelpOutline as HelpOutlineIcon, WarningAmber as WarningAmberIcon } from '@mui/icons-material';
import { useTheme } from '../../../theme/ThemeContext';
import type { BaseModalProps } from '../../../types/common';
import './FontLicenseHelpModal.css';

interface FontLicenseHelpModalProps extends BaseModalProps {}

export const FontLicenseHelpModal: React.FC<FontLicenseHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { mode } = useTheme();

  // data-theme属性の設定
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        zIndex: 1400, // FontAddModalより高く設定
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
        ライセンス情報について
        <IconButton
          onClick={onClose}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>

          <div className="info-box">
            <h4><HelpOutlineIcon /> ライセンスファイルについて</h4>
            <p>
              ライセンスファイルは <strong>テキスト形式</strong> (.txt, .md, .license など) で提供されることが一般的です。
              フォント配布サイトやダウンロードパッケージに含まれている場合が多いので、必ず確認してください。
            </p>
            <p>
              <strong>ライセンスファイルの追加はオプション</strong>ですが、商用プロジェクトや配布を予定している場合は
              必ず追加することをお勧めします。
            </p>
          </div>
          <h4>ライセンスファイルの重要性</h4>

          <Typography variant="body1" sx={{ mb: 2 }}>
            フォントを使用する際には、ライセンス情報を正しく確認し、適切に管理することが重要です。
            本ソフトウェアでは以下の方法でライセンス情報を管理します。
          </Typography>

          <h4>本ソフトウェアでの管理方法</h4>
          <ol>
            <li><strong>プロジェクトでの管理:</strong> フォント選択時にライセンス情報を確認可能</li>
            <li><strong>HTMLエクスポート時の埋め込み:</strong> フォントファイルと共にライセンス情報もHTMLに埋め込まれます</li>
            <li><strong>ビューワーでの表示:</strong> エクスポートされたHTMLには著作権表示ページが自動追加されます</li>
          </ol>

          <div className="warning-box">
            <h4><WarningAmberIcon /> 確認すべきライセンス条件</h4>
            <ul>
              <li><strong>商用利用:</strong> ビジネス目的での使用が許可されているか</li>
              <li><strong>組み込み利用:</strong> 商品となるファイルへの埋め込みが許可されているか</li>
              <li><strong>再配布:</strong> 第三者への配布が許可されているか</li>
              <li><strong>改変:</strong> フォントファイルの加工や変更が許可されているか</li>
              <li><strong>クレジット表記:</strong> 著作権表示が必要かどうか</li>
            </ul>
          </div>

      </DialogContent>

    </Dialog>
  );
};
