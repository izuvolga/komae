import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Crop32,
  Crop169,
  CropSquare,
  SettingsApplications,
} from '@mui/icons-material';

import { Close as CloseIcon, Help as HelpIcon } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import type { ProjectCreateParams, CanvasConfig } from '../../../types/entities';
import { AVAILABLE_LANGUAGES, DEFAULT_SUPPORTED_LANGUAGES, DEFAULT_CURRENT_LANGUAGE, getLanguageDisplayName } from '../../../constants/languages';
import './ProjectCreateDialog.css';

interface ProjectCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}
// Define Crop23 icon (Translate 90 degree rotation of <Crop32 />)
const Crop23 = () => {
  return (
    <Crop32 style={{ transform: 'rotate(90deg)' }} />
  );
};
const Crop916 = () => {
  return (
    <Crop169 style={{ transform: 'rotate(90deg)' }} />
  );
}


// プリセットのキャンバスサイズ
{/* 横長の場合には、アイコンを90度回転させる */}
const CANVAS_PRESETS = [
  { name: '縦向き（4:3）', icon: <Crop23 />, width: 1024, height: 768 },
  { name: '縦向き（16:9）', icon: <Crop916 />, width: 1280, height: 720 },
  { name: '横向き（3:4）', icon: <Crop32 />, width: 768, height: 1024 },
  { name: '横向き（9:16）', icon: <Crop169 />, width: 720, height: 1280 },
  { name: 'スクエア', icon: <CropSquare />, width: 1024, height: 1024 },
  { name: 'カスタム', icon: <SettingsApplications />, width: 800, height: 600 }, // カスタム用のデフォルト値
];

export const ProjectCreateDialog: React.FC<ProjectCreateDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { setProject, addNotification } = useProjectStore();
  const { mode } = useTheme();
  
  // フォーム状態
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('0'); // Standard preset
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(600);
  const [isCreating, setIsCreating] = useState(false);
  
  // 多言語対応状態
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(DEFAULT_SUPPORTED_LANGUAGES);
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_CURRENT_LANGUAGE);
  const [selectedLanguageForAdd, setSelectedLanguageForAdd] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // テーマ変更時にCSS変数を設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  // 現在のキャンバス設定を取得
  const getCurrentCanvas = (): CanvasConfig => {
    const presetIndex = parseInt(selectedPreset);
    if (presetIndex < CANVAS_PRESETS.length - 1) {
      // プリセット選択
      const preset = CANVAS_PRESETS[presetIndex];
      return { width: preset.width, height: preset.height };
    } else {
      // カスタム選択
      return { width: customWidth, height: customHeight };
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const canvas = getCurrentCanvas();
      // プロジェクト名が未入力の場合は "Untitled" をデフォルトとする
      const projectTitle = title.trim() || 'Untitled';

      const params: ProjectCreateParams = {
        title: projectTitle,
        description: description.trim() || undefined,
        canvas,
        supportedLanguages,
        currentLanguage,
      };

      // プロジェクト保存先ディレクトリを選択するダイアログを表示
      const saveResult = await window.electronAPI.fileSystem.showDirectorySelectDialog({
        title: `「${projectTitle}」フォルダを作成する親ディレクトリを選択`
      });

      if (saveResult.canceled || !saveResult.filePaths || saveResult.filePaths.length === 0) {
        // キャンセルされた場合はプロジェクト作成をキャンセル
        addNotification({
          type: 'info',
          title: 'プロジェクト作成がキャンセルされました',
          message: '保存先ディレクトリが選択されませんでした',
          autoClose: true,
          duration: 3000,
        });
        setIsCreating(false);
        return;
      }

      const parentDir = saveResult.filePaths[0];
      const projectName = projectTitle;
      const projectDir = `${parentDir}/${projectName}`;
      const projectFilePath = `${projectDir}/${projectName}.komae`;

      // ElectronAPIを通じてプロジェクトデータを作成
      const projectData = await window.electronAPI.project.create(params);

      // プロジェクトディレクトリを作成
      await window.electronAPI.project.createDirectory(projectDir);

      // プロジェクトファイルを保存
      await window.electronAPI.project.save(projectData, projectFilePath);
      
      // プロジェクトをストアに設定
      setProject(projectData);

      // プロジェクトパスを取得して設定
      const currentProjectPath = await window.electronAPI.project.getCurrentPath();
      const { setCurrentProjectPath } = useProjectStore.getState();
      setCurrentProjectPath(currentProjectPath);

      addNotification({
        type: 'success',
        title: 'プロジェクトが作成されました',
        message: `「${projectName}」が ${projectDir} に保存されました`,
        autoClose: true,
        duration: 5000,
      });

      // フォームをリセット
      setTitle('');
      setDescription('');
      setSelectedPreset('0');
      setCustomWidth(800);
      setCustomHeight(600);
      setSupportedLanguages(DEFAULT_SUPPORTED_LANGUAGES);
      setCurrentLanguage(DEFAULT_CURRENT_LANGUAGE);
      setSelectedLanguageForAdd('');
      setShowLanguageDropdown(false);
      
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addNotification({
        type: 'error',
        title: 'プロジェクトの作成に失敗しました',
        message: `エラー: ${message}`,
        autoClose: false,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    // フォームをリセット
    setTitle('');
    setDescription('');
    setSelectedPreset('0');
    setCustomWidth(800);
    setCustomHeight(600);
    setSupportedLanguages(DEFAULT_SUPPORTED_LANGUAGES);
    setCurrentLanguage(DEFAULT_CURRENT_LANGUAGE);
    setSelectedLanguageForAdd('');
    setShowLanguageDropdown(false);
    onClose();
  };
  
  // 言語追加処理
  const handleAddLanguage = () => {
    if (selectedLanguageForAdd && !supportedLanguages.includes(selectedLanguageForAdd)) {
      const newSupportedLanguages = [...supportedLanguages, selectedLanguageForAdd];
      setSupportedLanguages(newSupportedLanguages);
      
      // 最初の言語を追加した場合、それをcurrentLanguageに設定
      if (supportedLanguages.length === 0) {
        setCurrentLanguage(selectedLanguageForAdd);
      }
      
      setSelectedLanguageForAdd('');
      setShowLanguageDropdown(false);
    }
  };
  
  // 言語削除処理
  const handleRemoveLanguage = (langCode: string) => {
    if (supportedLanguages.length <= 1) {
      addNotification({
        type: 'warning',
        title: '言語削除エラー',
        message: '最低1つの言語が必要です',
        autoClose: true,
        duration: 3000,
      });
      return;
    }
    
    const newSupportedLanguages = supportedLanguages.filter(lang => lang !== langCode);
    setSupportedLanguages(newSupportedLanguages);
    
    // 削除した言語がcurrentLanguageの場合、最初の言語に変更
    if (currentLanguage === langCode) {
      setCurrentLanguage(newSupportedLanguages[0]);
    }
  };
  
  // 利用可能な追加言語を取得
  const getAvailableLanguagesForAdd = () => {
    return AVAILABLE_LANGUAGES.filter(lang => !supportedLanguages.includes(lang.code));
  };

  const isCustomSelected = parseInt(selectedPreset) === CANVAS_PRESETS.length - 1;
  const currentCanvas = getCurrentCanvas();

  return (
    <Dialog
      open={isOpen}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      sx={{
        zIndex: 1300,
        '& .MuiDialog-paper': {
          width: '90vw',
          maxWidth: '600px',
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
        新規プロジェクト作成
        <IconButton
          onClick={handleCancel}
          disabled={isCreating}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 5 }}>
          {/* プロジェクト基本情報 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              label="プロジェクト名"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="未入力の場合は「Untitled」になります"
              disabled={isCreating}
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              label="説明 (オプション)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="キャラクターの日常を描いた作品..."
              multiline
              rows={3}
              disabled={isCreating}
              fullWidth
              size="small"
            />
          </Box>

          {/* <Divider sx={{ my: 1.5 }} /> */}

          {/* 多言語設定 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>対応言語</Typography>

            <div className="language-selector-area">
              <div className="language-dropdown-container">
                <div
                  className="language-dropdown-trigger"
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                >
                  <span>{selectedLanguageForAdd || '言語を追加'}</span>
                  <span className="dropdown-arrow">▼</span>
                  <IconButton
                    size="small"
                    title="多言語対応機能について"
                    onClick={(e) => {
                      e.stopPropagation();
                      addNotification({
                        type: 'info',
                        title: '多言語対応機能',
                        message: 'プロジェクトで使用する言語を設定できます。TextAssetで言語ごとに異なるテキスト、フォント、サイズなどを設定可能になります。',
                        autoClose: true,
                        duration: 5000,
                      });
                    }}
                  >
                    <HelpIcon fontSize="small" />
                  </IconButton>
                </div>

                {showLanguageDropdown && (
                  <div className="language-dropdown-menu">
                    {getAvailableLanguagesForAdd().map(lang => (
                      <div
                        key={lang.code}
                        className="language-dropdown-item"
                        onClick={() => {
                          setSelectedLanguageForAdd(lang.code);
                          handleAddLanguage();
                        }}
                      >
                        {getLanguageDisplayName(lang.code)}
                      </div>
                    ))}
                    {getAvailableLanguagesForAdd().length === 0 && (
                      <div className="language-dropdown-item disabled">
                        追加可能な言語がありません
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lang Code Box */}
            <div className="lang-code-box">
              {supportedLanguages.map(langCode => (
                <div
                  key={langCode}
                  className={`lang-code-tag ${currentLanguage === langCode ? 'active' : ''}`}
                  title={getLanguageDisplayName(langCode)}
                >
                  <span
                    className="lang-code-text"
                    onClick={() => setCurrentLanguage(langCode)}
                  >
                    {langCode.toUpperCase()}
                  </span>
                  {supportedLanguages.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveLanguage(langCode)}
                      title={`${langCode.toUpperCase()}を削除`}
                      sx={{ ml: 0.5, p: 0.25 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </div>
              ))}
            </div>

            <div className="language-info">
              <small>現在の言語: <strong>{getLanguageDisplayName(currentLanguage)}</strong></small>
            </div>
          </Box>

          {/* <Divider sx={{ my: 1.5 }} /> */}

          {/* キャンバス設定 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>キャンバスサイズ</Typography>
            <RadioGroup
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
            >
              {CANVAS_PRESETS.map((preset, index) => (
                <FormControlLabel
                  key={index}
                  value={index.toString()}
                  control={<Radio size="small" disabled={isCreating} />}
                  label={
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      width: '100%',
                      minHeight: '48px',
                      bgcolor: 'background.paper',
                      borderColor: 'var(--dialog-active-border)',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderRadius: '6px',
                      px: 2,
                      py: 1.5,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}>
                      {/* アイコン領域 */}
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        color: 'text.secondary'
                      }}>
                        {preset.icon}
                      </Box>

                      {/* テキスト領域 */}
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Typography variant="body2" component="span" sx={{
                          fontWeight: 500,
                          fontSize: '14px',
                          color: 'text.primary'
                        }}>
                          {preset.name}
                        </Typography>
                        {index < CANVAS_PRESETS.length - 1 && (
                          <Typography variant="caption" component="span" sx={{
                            fontSize: '12px',
                            color: 'text.secondary'
                          }}>
                            {preset.width} × {preset.height} px
                          </Typography>
                        )}
                        {index === CANVAS_PRESETS.length - 1 && (
                          <Typography variant="caption" component="span" sx={{
                            fontSize: '12px',
                            color: 'text.secondary'
                          }}>
                            任意のサイズを設定
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  }
                  sx={{
                    mb: 1,
                    ml: 0,
                    mr: 0,
                    width: '100%',
                    '& .MuiFormControlLabel-label': {
                      width: '100%'
                    }
                  }}
                  disabled={isCreating}
                />
              ))}
            </RadioGroup>
          </Box>

          {/* カスタムサイズ設定 */}
          {isCustomSelected && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    label="幅 (px)"
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value) || 800)}
                    inputProps={{ min: 100, max: 4000 }}
                    disabled={isCreating}
                    size="small"
                    fullWidth
                  />
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    label="高さ (px)"
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value) || 600)}
                    inputProps={{ min: 100, max: 4000 }}
                    disabled={isCreating}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Box>
            </Box>
          )}

          {/* 現在の設定確認 */}
          <Box sx={{
            bgcolor: mode === 'dark' ? 'grey.900' : 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '6px',
            padding: 2
          }}>
            <Typography variant="body2" sx={{
              display: 'block',
              mb: 1,
              fontSize: '14px',
              fontWeight: 600,
              color: 'text.primary'
            }}>
              設定確認
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '14px', color: 'text.secondary' }}>
              キャンバスサイズ: {currentCanvas.width} × {currentCanvas.height} ピクセル
            </Typography>
            {title.trim() && (
              <Typography variant="body2" sx={{ fontSize: '14px', color: 'text.secondary', mt: 1 }}>
                作成される構造:<br />
                選択ディレクトリ/{title.trim()}/<br />
                　└ {title.trim()}.komae
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          variant="outlined"
          onClick={handleCancel}
          disabled={isCreating}
        >
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? '作成中...' : '作成'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
