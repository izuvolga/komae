import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  RestartAlt as ResetIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useAppSettingsStore } from '../../stores/appSettingsStore';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    loadSettings,
  } = useAppSettingsStore();

  // ローカル状態でフォームを管理
  const [localSkipWelcomeScreen, setLocalSkipWelcomeScreen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 設定が読み込まれたらローカル状態を更新
  useEffect(() => {
    if (settings) {
      setLocalSkipWelcomeScreen(settings.skipWelcomeScreen);
      setHasChanges(false);
    }
  }, [settings]);

  // モーダルが開かれた時に設定を読み込み
  useEffect(() => {
    if (isOpen && !settings) {
      loadSettings();
    }
  }, [isOpen, settings, loadSettings]);

  // 変更を検知
  useEffect(() => {
    if (settings) {
      const changed = localSkipWelcomeScreen !== settings.skipWelcomeScreen;
      setHasChanges(changed);
    }
  }, [localSkipWelcomeScreen, settings]);

  const handleSkipWelcomeScreenChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLocalSkipWelcomeScreen(event.target.checked);
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await updateSettings({
        skipWelcomeScreen: localSkipWelcomeScreen,
      });
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('設定をデフォルトに戻しますか？この操作は元に戻せません。')) {
      setIsSaving(true);
      try {
        await resetSettings();
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to reset settings:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    if (hasChanges && !window.confirm('変更を破棄して閉じますか？')) {
      return;
    }

    // 変更を破棄してローカル状態をリセット
    if (settings) {
      setLocalSkipWelcomeScreen(settings.skipWelcomeScreen);
      setHasChanges(false);
    }
    onClose();
  };

  if (isLoading && !settings) {
    return (
      <Dialog open={isOpen} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              設定を読み込み中...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SettingsIcon />
          <Typography variant="h6">アプリケーション設定</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            設定の読み込みに失敗しました: {error}
          </Alert>
        )}

        <Stack spacing={3}>
          {/* 起動設定 */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              起動設定
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={localSkipWelcomeScreen}
                  onChange={handleSkipWelcomeScreenChange}
                  disabled={isSaving}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    初期画面をスキップ
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    アプリ起動時にウェルカム画面を表示せず、自動的に空のプロジェクトを作成します
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Divider />

          {/* 設定情報 */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              設定情報
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                バージョン: {settings?.version || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                最終更新: {settings?.lastModified
                  ? new Date(settings.lastModified).toLocaleString('ja-JP')
                  : 'N/A'
                }
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleReset}
          startIcon={<ResetIcon />}
          disabled={isSaving}
          color="error"
          variant="outlined"
        >
          デフォルトに戻す
        </Button>

        <Box sx={{ flex: 1 }} />

        <Button
          onClick={handleCancel}
          disabled={isSaving}
        >
          キャンセル
        </Button>
        <Button
          onClick={handleSave}
          startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={!hasChanges || isSaving}
          variant="contained"
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};