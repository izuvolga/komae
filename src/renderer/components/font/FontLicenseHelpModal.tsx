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
import { Close as CloseIcon } from '@mui/icons-material';
import './FontLicenseHelpModal.css';

interface FontLicenseHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FontLicenseHelpModal: React.FC<FontLicenseHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
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

      <DialogContent>
          
        <Typography variant="body1" sx={{ mb: 2 }}>
          フォントを使用する際には、ライセンス情報を正しく確認し、適切に管理することが重要です。
          Komae では以下の方法でライセンス情報を管理します。
        </Typography>
          
          <h4>ライセンスファイルの重要性</h4>
          <ul>
            <li><strong>著作権の明記:</strong> フォントの著作権情報を明確に記録</li>
            <li><strong>使用許諾の確認:</strong> 商用利用や再配布に関する条件を把握</li>
            <li><strong>コンプライアンス遵守:</strong> 法的な問題を回避するための証跡管理</li>
            <li><strong>クレジット表記:</strong> 必要に応じた著作権表示の実装</li>
          </ul>

          <h4>Komae での管理方法</h4>
          <ol>
            <li><strong>HTMLエクスポート時の埋め込み:</strong> フォントファイルと共にライセンス情報もHTMLに埋め込まれます</li>
            <li><strong>ビューワーでの表示:</strong> エクスポートされたHTMLには著作権表示ページが自動追加されます</li>
            <li><strong>プロジェクトでの管理:</strong> フォント選択時にライセンス情報を確認可能</li>
          </ol>

          <div className="warning-box">
            <h4>⚠️ 確認すべきライセンス条件</h4>
            <ul>
              <li><strong>商用利用:</strong> ビジネス目的での使用が許可されているか</li>
              <li><strong>組み込み利用:</strong> HTMLファイルへの埋め込みが許可されているか</li>
              <li><strong>再配布:</strong> 第三者への配布が許可されているか</li>
              <li><strong>改変:</strong> フォントファイルの加工や変更が許可されているか</li>
              <li><strong>クレジット表記:</strong> 著作権表示が必要かどうか</li>
            </ul>
          </div>

          <div className="info-box">
            <h4>📝 ライセンスファイルについて</h4>
            <p>
              ライセンスファイルは <strong>テキスト形式</strong> (.txt, .md, .license など) で提供されることが一般的です。
              フォント配布サイトやダウンロードパッケージに含まれている場合が多いので、必ず確認してください。
            </p>
            <p>
              <strong>ライセンスファイルの追加はオプション</strong>ですが、商用プロジェクトや配布を予定している場合は
              必ず追加することをお勧めします。
            </p>
          </div>

          <h4>よくあるフォントライセンス</h4>
          <ul>
            <li><strong>SIL Open Font License (OFL):</strong> オープンソースフォント、商用利用可、改変・再配布可</li>
            <li><strong>Apache License:</strong> 商用利用可、改変・再配布可、クレジット表記推奨</li>
            <li><strong>Creative Commons:</strong> 条件により異なる（CC0, CC BY, CC BY-SA など）</li>
            <li><strong>商用ライセンス:</strong> 購入したフォント、利用規約に従う</li>
          </ul>

      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};
