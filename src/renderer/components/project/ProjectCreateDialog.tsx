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
  Divider,
  Autocomplete,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  Tooltip
} from '@mui/material';
import {
  Crop32,
  Crop169,
  CropSquare,
  SettingsApplications,
} from '@mui/icons-material';

import { Close as CloseIcon, Help as HelpIcon, CheckBoxOutlineBlank, CheckBox } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import type { ProjectCreateParams, CanvasConfig, ProjectData } from '../../../types/entities';
import { AVAILABLE_LANGUAGES, DEFAULT_SUPPORTED_LANGUAGES, DEFAULT_CURRENT_LANGUAGE, getLanguageDisplayName } from '../../../constants/languages';
import './ProjectCreateDialog.css';

interface ProjectCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit' | 'save';
  existingProject?: ProjectData;
  onSaveFromTemp?: (params: ProjectCreateParams) => Promise<void>;
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
  { name: '横向き（4:3）', icon: <Crop32 />, width: 1024, height: 768 },
  { name: '横向き（16:9）', icon: <Crop169 />, width: 1280, height: 720 },
  { name: '縦向き（3:4）', icon: <Crop23 />, width: 768, height: 1024 },
  { name: '縦向き（9:16）', icon: <Crop916 />, width: 720, height: 1280 },
  { name: 'スクエア', icon: <CropSquare />, width: 1024, height: 1024 },
  { name: 'カスタム', icon: <SettingsApplications />, width: 800, height: 600 }, // カスタム用のデフォルト値
];

export const ProjectCreateDialog: React.FC<ProjectCreateDialogProps> = ({
  isOpen,
  onClose,
  mode = 'create',
  existingProject,
  onSaveFromTemp,
}) => {
  const { setProject, addNotification } = useProjectStore();
  const { mode: themeMode } = useTheme();
  
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

  // テーマ変更時にCSS変数を設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // 編集モード時の初期値設定
  useEffect(() => {
    if (mode === 'edit' && existingProject) {
      setTitle(existingProject.metadata.title);
      setDescription(existingProject.metadata.description || '');
      setSupportedLanguages(existingProject.metadata.supportedLanguages);
      setCurrentLanguage(existingProject.metadata.currentLanguage);

      // キャンバスサイズに応じてプリセットを設定
      const canvas = existingProject.canvas;
      const presetIndex = CANVAS_PRESETS.findIndex(preset =>
        preset.width === canvas.width && preset.height === canvas.height
      );

      if (presetIndex !== -1 && presetIndex < CANVAS_PRESETS.length - 1) {
        setSelectedPreset(presetIndex.toString());
      } else {
        setSelectedPreset((CANVAS_PRESETS.length - 1).toString()); // カスタム
        setCustomWidth(canvas.width);
        setCustomHeight(canvas.height);
      }
    }
  }, [mode, existingProject]);

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

      if (mode === 'edit') {
        // 編集モード: 既存プロジェクトを更新
        await handleUpdateProject(projectTitle, canvas);
      } else if (mode === 'save') {
        // 一時プロジェクト保存モード: 一時プロジェクトを永続化
        await handleSaveFromTemp(projectTitle, canvas);
      } else {
        // 新規作成モード: 新しいプロジェクトを作成
        await handleCreateProject(projectTitle, canvas);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addNotification({
        type: 'error',
        title: mode === 'edit' ? 'プロジェクトの更新に失敗しました' : (mode === 'save' ? 'プロジェクトの保存に失敗しました' : 'プロジェクトの作成に失敗しました'),
        message: `エラー: ${message}`,
        autoClose: false,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateProject = async (projectTitle: string, canvas: CanvasConfig) => {
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

    resetForm();
    onClose();
  };

  const handleUpdateProject = async (projectTitle: string, canvas: CanvasConfig) => {
    const { updateProjectMetadata } = useProjectStore.getState();

    const metadata = {
      title: projectTitle,
      description: description.trim() || undefined,
      supportedLanguages,
      currentLanguage,
    };

    await updateProjectMetadata(metadata, canvas);
    onClose();
  };

  const handleSaveFromTemp = async (projectTitle: string, canvas: CanvasConfig) => {
    if (!onSaveFromTemp) {
      throw new Error('一時プロジェクト保存用のコールバックが設定されていません');
    }

    const params: ProjectCreateParams = {
      title: projectTitle,
      description: description.trim() || undefined,
      supportedLanguages,
      currentLanguage,
      canvas,
    };

    await onSaveFromTemp(params);
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedPreset('0');
    setCustomWidth(800);
    setCustomHeight(600);
    setSupportedLanguages(DEFAULT_SUPPORTED_LANGUAGES);
    setCurrentLanguage(DEFAULT_CURRENT_LANGUAGE);
  };

  const handleCancel = () => {
    // 新規作成モードまたは保存モードの場合にフォームをリセット
    if (mode === 'create' || mode === 'save') {
      resetForm();
    }
    onClose();
  };
  
  // 言語選択処理
  const handleLanguageChange = (selectedLanguages: string[]) => {
    // 最低1つの言語は必須
    if (selectedLanguages.length === 0) {
      addNotification({
        type: 'warning',
        title: '言語選択エラー',
        message: '最低1つの言語が必要です',
        autoClose: true,
        duration: 3000,
      });
      return;
    }

    setSupportedLanguages(selectedLanguages);

    // 現在のメイン言語が削除された場合、最初の言語をメイン言語に設定
    if (!selectedLanguages.includes(currentLanguage)) {
      setCurrentLanguage(selectedLanguages[0]);
    }
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
{mode === 'edit' ? 'プロジェクト編集' : (mode === 'save' ? 'プロジェクト保存' : '新規プロジェクト作成')}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                プロジェクト名
              </Typography>
              <Tooltip title="プロジェクトを保存するために、最初にこの名前のフォルダとファイルが作成されます。作品の内容には影響しません。後から変更可能です。">
                <IconButton size="small">
                  <HelpIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <TextField
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="未入力の場合は「Untitled」になります"
              disabled={isCreating}
              fullWidth
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                備考欄
              </Typography>
              <Tooltip title="作品の管理用のメモとしてお使いください。作品内容には影響しません。">
                <IconButton size="small">
                  <HelpIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <TextField
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="備考"
              multiline
              rows={3}
              disabled={isCreating}
              fullWidth
              size="small"
            />
          </Box>

          {/* <Divider sx={{ my: 1.5 }} /> */}

          {/* 多言語設定 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                サポート言語
              </Typography>
              <Tooltip title="作品が対応する言語を設定できます。作中で利用するテキストにおいて、言語ごとに異なる文章、フォント、サイズなどを切り替え可能になります。">
                <IconButton size="small">
                  <HelpIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* 言語選択 Autocomplete */}
            <Autocomplete
              multiple
              options={AVAILABLE_LANGUAGES.map(lang => lang.code)}
              getOptionLabel={(code) => getLanguageDisplayName(code)}
              value={supportedLanguages}
              onChange={(event, newValue) => handleLanguageChange(newValue)}
              disabled={isCreating}
              disableCloseOnSelect
              renderOption={(props, option, { selected }) => (
                <Box component="li" {...props} sx={{ color: 'text.primary' }}>
                  <Checkbox
                    icon={<CheckBoxOutlineBlank fontSize="small" />}
                    checkedIcon={<CheckBox fontSize="small" />}
                    style={{ marginRight: 8 }}
                    checked={selected}
                  />
                  {getLanguageDisplayName(option)}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="対応言語を選択"
                  size="small"
                />
              )}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option.toUpperCase()}
                    size="small"
                    color={option === currentLanguage ? 'primary' : 'default'}
                    variant={option === currentLanguage ? 'filled' : 'outlined'}
                  />
                ))
              }
            />

            {/* メイン言語選択 */}
            {supportedLanguages.length > 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', fontSize: '14px' }}>
                    メイン言語
                  </Typography>
                  <Tooltip title="作業中にメインで利用される言語。作品の出力結果には影響はありません。あなたの母国語を選ぶことをおすすめします。">
                    <IconButton size="small">
                      <HelpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <FormControl size="small">
                  <Select
                    value={currentLanguage}
                    onChange={(e) => setCurrentLanguage(e.target.value)}
                    disabled={isCreating}
                  >
                    {supportedLanguages.map(langCode => (
                      <MenuItem key={langCode} value={langCode}>
                        {getLanguageDisplayName(langCode)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {supportedLanguages.length === 1 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                メイン言語: <strong>{getLanguageDisplayName(currentLanguage)}</strong>
              </Typography>
            )}
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
            bgcolor: themeMode === 'dark' ? 'grey.900' : 'grey.50',
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
{(mode === 'create' || mode === 'save') && title.trim() && (
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
{isCreating
            ? (mode === 'edit' ? '更新中...' : (mode === 'save' ? '保存中...' : '作成中...'))
            : (mode === 'edit' ? '更新' : (mode === 'save' ? '保存' : '作成'))
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};
