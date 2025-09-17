import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Slider,
  Box,
  Alert
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import type { ExportFormat, ExportOptions } from '../../../types/entities';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, onExport }) => {
  const { mode } = useTheme();
  const project = useProjectStore((state) => state.project);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  
  // エクスポート設定の状態
  const [format, setFormat] = useState<ExportFormat>('html');
  const [outputPath, setOutputPath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [quality, setQuality] = useState(90);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [expectedOutput, setExpectedOutput] = useState('');

  // ExportDirectoryManagerはMainプロセスで実行するため、こちらでは直接使用しない

  // data-theme属性の設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  // プロジェクトが変更されたときの初期化
  useEffect(() => {
    if (project && isOpen) {
      setProjectName(project.metadata.title || 'untitled-project');
      if (currentProjectPath) {
        // プロジェクトと同じディレクトリをデフォルトの出力先とする
        const defaultOutput = currentProjectPath;
        setOutputPath(defaultOutput);
      }
    }
  }, [project, currentProjectPath, isOpen]);

  // 出力パスの検証とプレビュー更新
  useEffect(() => {
    if (outputPath && projectName && isOpen) {
      validateAndPreview();
    }
  }, [outputPath, projectName, format, overwriteExisting]);

  const validateAndPreview = async () => {
    if (!outputPath || !projectName) return;

    setIsValidating(true);
    setValidationErrors([]);

    try {
      // ファイル名のサニタイズと生成をここで簡易実装
      const sanitizedName = projectName
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .replace(/^\.+/, '')
        .trim() || 'untitled';

      let expectedPath: string;

      if (format === 'html') {
        expectedPath = `${outputPath}/${sanitizedName}.html`;
      } else if (format === 'png') {
        expectedPath = `${outputPath}/${sanitizedName}/`;
        if (project) {
          expectedPath += `1.png, 2.png, ... ${project.pages.length}.png`;
        }
      } else {
        expectedPath = `${outputPath}/${sanitizedName}/`;
      }

      setExpectedOutput(expectedPath);

      // 基本的なパス検証のみ実行（詳細検証はMainプロセスで行う）
      if (!outputPath || outputPath.trim() === '') {
        setValidationErrors(['出力パスが指定されていません']);
      }

    } catch (error) {
      setValidationErrors([`検証エラー: ${error}`]);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBrowseOutputPath = async () => {
    try {
      const result = await window.electronAPI?.fileSystem?.showOpenDialog({
        properties: ['openDirectory'],
        title: 'エクスポート先ディレクトリを選択'
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        setOutputPath(result.filePaths[0]);
      }
    } catch (error) {
      console.error('ディレクトリ選択エラー:', error);
    }
  };

  const handleExport = () => {
    if (!project || validationErrors.length > 0) return;

    const exportOptions: ExportOptions = {
      format,
      title: projectName,
      outputPath,
      width: project.canvas.width,
      height: project.canvas.height,
      quality,
      embedAssets: true, // HTMLの場合は常にtrue
      htmlOptions: format === 'html' ? {
        singleFile: true,
        includeNavigation: true,
        autoPlay: false
      } : undefined
    };

    onExport(exportOptions);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        zIndex: 1300,
        '& .MuiDialog-paper': {
          width: '90vw',
          maxWidth: '700px',
          maxHeight: '90vh',
        }
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
        プロジェクトのエクスポート
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* エクスポート形式選択 */}
        <div className="form-group">
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>エクスポート形式</Typography>
          <RadioGroup
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
          >
            <FormControlLabel
              value="html"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2">HTML（単一ファイル）</Typography>
                  <Typography variant="caption" color="text.secondary">ウェブブラウザで表示可能な単一HTMLファイル</Typography>
                </Box>
              }
              sx={{ mb: 1 }}
            />
            <FormControlLabel
              value="png"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2">PNG（画像ファイル）</Typography>
                  <Typography variant="caption" color="text.secondary">各ページが個別のPNG画像として出力</Typography>
                </Box>
              }
            />
          </RadioGroup>
        </div>

        {/* ファイル名 */}
        <div className="form-group">
          <TextField
            label="ファイル名"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="ファイル名を入力"
            fullWidth
            size="small"
          />
        </div>

        {/* 出力先パス */}
        <div className="form-group">
          <label htmlFor="output-path">出力先ディレクトリ</label>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="出力先パスを入力"
              size="small"
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={handleBrowseOutputPath}
              sx={{ minWidth: 60 }}
            >
              参照
            </Button>
          </Box>
        </div>

        {/* 品質設定（PNG形式の場合） */}
        {format === 'png' && (
          <div className="form-group">
            <Typography variant="body2" sx={{ mb: 1 }}>画質（{quality}%）</Typography>
            <Slider
              value={quality}
              onChange={(_, value) => setQuality(value as number)}
              min={1}
              max={100}
              valueLabelDisplay="auto"
              sx={{ ml: 1, mr: 1 }}
            />
          </div>
        )}

        {/* 上書き設定 */}
        <div className="form-group">
          <FormControlLabel
            control={
              <Checkbox
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                size="small"
              />
            }
            label="既存のファイルを上書きする"
          />
        </div>

        {/* 出力プレビュー */}
        <div className="form-group">
          <label>出力先プレビュー</label>
          <Box sx={{
            p: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.300',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '14px',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {isValidating ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>検証中...</Typography>
            ) : (
              <Typography component="code" variant="body2" sx={{ fontFamily: 'monospace' }}>{expectedOutput}</Typography>
            )}
          </Box>
        </div>

        {/* バリデーションエラー */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">エラー</Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </Box>
          </Alert>
        )}

        {/* プロジェクト情報 */}
        {project && (
          <Box sx={{
            p: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.300',
            borderRadius: 1,
            mt: 2
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: '16px' }}>プロジェクト情報</Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 1,
              alignItems: 'center'
            }}>
              <Typography variant="body2">ページ数:</Typography>
              <Typography variant="body2">{project.pages.length}</Typography>
              <Typography variant="body2">アセット数:</Typography>
              <Typography variant="body2">{Object.keys(project.assets).length}</Typography>
              <Typography variant="body2">キャンバスサイズ:</Typography>
              <Typography variant="body2">{project.canvas.width} × {project.canvas.height}px</Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          variant="outlined"
          onClick={onClose}
        >
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={!project || validationErrors.length > 0 || isValidating}
        >
          エクスポート
        </Button>
      </DialogActions>
    </Dialog>
  );
};
