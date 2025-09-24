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
  Chip,
  Collapse,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, Help as HelpIcon, AutoAwesome as AIIcon } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import { generateTextAssetYAML, parseTextAssetYAML } from '../../../utils/yamlConverter';
import { generateAIPrompt } from '../../../utils/aiPrompt';
import './BulkEditModal.css';
import { useTextFieldKeyboardShortcuts } from '../../hooks/useTextFieldKeyboardShortcuts';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { mode } = useTheme();
  const project = useProjectStore((state) => state.project);
  const getCurrentLanguage = useProjectStore((state) => state.getCurrentLanguage);
  const getSupportedLanguages = useProjectStore((state) => state.getSupportedLanguages);
  const updateAssetInstance = useProjectStore((state) => state.updateAssetInstance);
  const addNotification = useProjectStore((state) => state.addNotification);
  const { handleTextFieldKeyEvent } = useTextFieldKeyboardShortcuts();

  const [yamlContent, setYamlContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [showWhatIsThis, setShowWhatIsThis] = useState(false);

  // data-theme属性の設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  // YAMLコンテンツを生成
  useEffect(() => {
    if (isOpen && project) {
      const content = generateTextAssetYAML(project);
      setYamlContent(content);
      setOriginalContent(content);
      setIsModified(false);
    }
  }, [isOpen, project]);

  // コンテンツ変更検出
  useEffect(() => {
    setIsModified(yamlContent !== originalContent);
  }, [yamlContent, originalContent]);

  const handleImport = async () => {
    if (!project) return;

    try {
      const parsedData = parseTextAssetYAML(yamlContent, project);

      // 各ページの各インスタンスを更新
      for (const pageData of parsedData) {
        for (const [instanceId, instanceData] of Object.entries(pageData.instances)) {
          // 多言語テキストをmultilingual_textに変換
          const multilingual_text: Record<string, string> = {};
          for (const [langCode, text] of Object.entries(instanceData.texts)) {
            multilingual_text[langCode] = text;
          }

          updateAssetInstance(pageData.pageId, instanceId, { multilingual_text });
        }
      }

      setOriginalContent(yamlContent);
      setIsModified(false);

      addNotification({
        type: 'success',
        title: 'テキスト一括更新完了',
        message: 'YAML形式のテキストデータをプロジェクトに反映しました',
        autoClose: true,
        duration: 3000,
      });

      onClose();
    } catch (error) {
      console.error('YAML import error:', error);
      addNotification({
        type: 'error',
        title: 'インポートエラー',
        message: `YAML形式が無効です: ${error instanceof Error ? error.message : String(error)}`,
        autoClose: false,
      });
    }
  };

  const handleCopyAIPrompt = async () => {
    if (!project) return;

    try {
      const prompt = generateAIPrompt(yamlContent, getSupportedLanguages());
      await navigator.clipboard.writeText(prompt);

      addNotification({
        type: 'success',
        title: 'AIプロンプトをコピー',
        message: 'クリップボードにAI編集用プロンプトをコピーしました',
        autoClose: true,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy AI prompt:', error);
      addNotification({
        type: 'error',
        title: 'コピー失敗',
        message: 'プロンプトのコピーに失敗しました',
        autoClose: true,
        duration: 3000,
      });
    }
  };

  const handleCancel = () => {
    if (isModified) {
      const confirmed = window.confirm('変更が保存されていません。閉じますか？');
      if (!confirmed) return;
    }
    setYamlContent(originalContent);
    setIsModified(false);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleCancel}
      maxWidth="lg"
      fullWidth
      sx={{
        zIndex: 1300,
        '& .MuiDialog-paper': {
          width: '90vw',
          maxWidth: '1200px',
          height: '80vh',
          maxHeight: '900px',
          display: 'flex',
          flexDirection: 'column',
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pr: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        テキスト一括編集
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            size="small"
            onClick={() => setShowWhatIsThis(!showWhatIsThis)}
            sx={{
              fontSize: '12px',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <HelpIcon />
          </Button>
          <Button
            size="small"
            startIcon={<AIIcon />}
            onClick={handleCopyAIPrompt}
            sx={{
              fontSize: '12px',
              background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 500,
              '&:hover': {
                background: 'linear-gradient(45deg, #5a6fd8 0%, #6a4190 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }
            }}
          >
            Copy AI Prompt
          </Button>
          <IconButton onClick={handleCancel} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Collapse in={showWhatIsThis}>
        <Box sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          p: 3
        }}>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            プロジェクト内のすべてのテキストを<a href="https://ja.wikipedia.org/wiki/YAML" target="_blank" rel="noopener noreferrer">YAML形式</a>で一括編集するためのツールです。
            以下のテキストデータを編集して「Import」ボタンを押すと、変更内容がプロジェクトに反映されます。
            存在しないページは無視されます。
            特に翻訳作業や大量のテキスト編集において、スプレッドシート形式よりも効率的な編集が可能です。
            生成AIを利用したテキスト編集を行う場合は、「Copy AI Prompt」ボタンでプロンプトをクリップボードにコピーし、AIサービスに貼り付けてご利用ください。
          </Typography>
        </Box>
      </Collapse>

      <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box className="yaml-editor-container" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <textarea
            className="yaml-editor"
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            onKeyDown={handleTextFieldKeyEvent}
            placeholder="YAML形式のテキストデータが表示されます..."
            spellCheck={false}
            style={{ flex: 1 }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{
        p: 3,
        pt: 2,
        justifyContent: 'space-between',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isModified && (
            <Chip
              size="small"
              label="変更あり"
              sx={{
                bgcolor: 'warning.light',
                color: 'warning.contrastText',
                fontWeight: 500,
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!isModified}
          >
            Import
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
