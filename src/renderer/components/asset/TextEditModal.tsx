import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';
import { Close as CloseIcon, Help as HelpIcon } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import { generateTextPreviewSVG } from '../../../utils/svgGeneratorCommon';
import { updateLanguageSettings } from '../../../utils/languageUtils';
import { NumericInput } from '../common/NumericInput';
import { ZIndexInput } from '../common/ZIndexInput';
import { OpacityInput } from '../common/OpacityInput';
import { ColorPicker } from '../common/ColorPicker';
import type { TextAsset, TextAssetInstance, TextAssetEditableField, Page, FontInfo, LanguageSettings} from '../../../types/entities';
import { TextAssetInstancePhase  } from '../../../types/entities';
import {
  validateTextAssetData,
  validateTextAssetInstanceData,
  getEffectiveTextValue,
  getEffectiveContextValue,
  getEffectiveLanguageSetting,
  isLanguageSettingsField,
  isTextAssetEditableField,
} from '../../../types/entities';

// 編集モードの種類
type EditMode = 'asset' | 'instance';

export interface TextEditModalProps {
  mode: EditMode;
  asset: TextAsset;
  assetInstance?: TextAssetInstance;
  page?: Page;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsset?: (updatedAsset: TextAsset) => void;
  onSaveInstance?: (updatedInstance: TextAssetInstance) => void;
}

export const TextEditModal: React.FC<TextEditModalProps> = ({
  mode,
  asset,
  assetInstance,
  page,
  isOpen,
  onClose,
  onSaveAsset,
  onSaveInstance,
}) => {
  const { mode: themeMode } = useTheme();
  const [editingAsset, setEditingAsset] = useState<TextAsset>(asset);
  const [editingInstance, setEditingInstance] = useState<TextAssetInstance | null>(
    assetInstance || null
  );
  const [zIndexValidation, setZIndexValidation] = useState<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>({ isValid: true });
  const [availableFonts, setAvailableFonts] = useState<FontInfo[]>([]);
  const [fontsLoading, setFontsLoading] = useState(false);

  // プレビュータブ関連の状態
  const [activePreviewTab, setActivePreviewTab] = useState<string>('');

  // ドラッグ操作関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartValues, setDragStartValues] = useState({ x: 0, y: 0 });
  const canvasConfig = useProjectStore((state) => state.project?.canvas);
  const project = useProjectStore((state) => state.project);
  const getCurrentLanguage = useProjectStore((state) => state.getCurrentLanguage);

  // data-theme属性の設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (isOpen) {
      setEditingAsset({ ...asset });
      setEditingInstance(assetInstance ? { ...assetInstance } : null);

      // プレビュータブの初期化
      if (project?.metadata.supportedLanguages) {
        if (mode === 'asset') {
          // TextAsset編集時は「共通設定」タブを選択
          setActivePreviewTab('common');
        } else {
          // TextAssetInstance編集時は現在の言語を選択
          setActivePreviewTab(getCurrentLanguage());
        }
      }
    }
  }, [isOpen, asset, assetInstance, project, getCurrentLanguage, mode]);

  // フォント一覧を読み込み
  useEffect(() => {
    const loadFonts = async () => {
      if (!isOpen) return;

      setFontsLoading(true);
      try {
        const fonts = await window.electronAPI.font.getAvailableFonts(project);
        setAvailableFonts(fonts || []);
      } catch (error) {
        console.error('Failed to load available fonts:', error);
        setAvailableFonts([]);
      } finally {
        setFontsLoading(false);
      }
    };

    loadFonts();
  }, [isOpen, project]);

  if (!isOpen || !editingAsset) return null;

  // プレビュータブのリストを生成
  const getPreviewTabs = () => {
    const tabs: Array<{id: string, label: string, type: 'common' | 'language'}> = [];

    // アセット編集時は「共通設定」タブを追加
    if (mode === 'asset') {
      tabs.push({ id: 'common', label: '共通設定', type: 'common' });
    }
    // 各対応言語のタブを追加
    if (project?.metadata.supportedLanguages) {
      project.metadata.supportedLanguages.forEach(lang => {
        const label = lang === 'ja' ? '日本語' :
                     lang === 'en' ? 'English' :
                     lang === 'zh' ? '中文' :
                     lang === 'ko' ? '한국어' :
                     lang.toUpperCase();
        tabs.push({ id: lang, label, type: 'language' });
      });
    }
    return tabs;
  };

  // プレビュータブのクリックハンドラー
  const handlePreviewTabClick = (tabId: string) => {
    setActivePreviewTab(tabId);
  };

  // 現在の位置を取得（getCurrentValueベースの実装）
  const getCurrentPosition = (): { x: number; y: number } => {
    const values = getCurrentValue(['pos_x', 'pos_y']) as { pos_x: number; pos_y: number };
    return { x: values.pos_x || 0, y: values.pos_y || 0 };
  };

  const currentPos = getCurrentPosition();

  // 現在のフェーズと言語を取得する
  function getCurrentPhase(): TextAssetInstancePhase {
    let phase: TextAssetInstancePhase;
    if (mode === 'asset' && activePreviewTab === 'common') {
      phase = TextAssetInstancePhase.ASSET_COMMON;
    } else if (mode === 'asset' && activePreviewTab) {
      // TODO: もしも言語タブの存在とプロジェクト設定が齟齬を起こしていた場合の処理を考える
      // project?.metadata.supportedLanguages?.includes(activePreviewTab || '') && project?.metadata.supportedLanguages?.length > 1;
      phase = TextAssetInstancePhase.ASSET_LANG;
    } else {
      phase = TextAssetInstancePhase.INSTANCE_LANG;
    }
    return phase;
  }

  // フィールドタイプの定義
  type SupportedField = keyof TextAssetEditableField | keyof LanguageSettings | 'override_language_settings';

  // 現在の値を取得する（オーバーロード対応）
  function getCurrentValue(field: SupportedField): any;
  function getCurrentValue(fields: SupportedField[]): Record<string, any>;
  function getCurrentValue(fieldOrFields: SupportedField | SupportedField[]): any {
    // 単一値処理のヘルパー関数
    const getSingleValue = (assetField: SupportedField): any => {
      const phase = getCurrentPhase();
      const selectedLang = phase === TextAssetInstancePhase.ASSET_LANG ? activePreviewTab : getCurrentLanguage();
      if (isTextAssetEditableField(assetField as string)) {
        if (assetField === 'text') {
          const ret = getEffectiveTextValue(editingAsset, editingInstance, selectedLang, phase);
          return ret;
        } else if (assetField === 'context') {
          return getEffectiveContextValue(editingAsset, editingInstance, selectedLang, phase);
        } else if (assetField === 'name') {
          return editingAsset.name;
        } else if (assetField === 'default_language_override') {
          return editingAsset?.default_language_override;
        } else if (assetField === 'default_text_override') {
        return editingAsset?.default_text_override;
        }
      }
      if (isLanguageSettingsField(assetField as string)) {
        const ret = getEffectiveLanguageSetting(editingAsset, editingInstance, selectedLang, assetField as keyof LanguageSettings, phase);
        return ret
      }
      if (assetField === 'override_language_settings') {
        return editingInstance?.override_language_settings;
      }

      return undefined;
    };

    // 複数値か単一値かを判定
    if (Array.isArray(fieldOrFields)) {
      // 複数値処理
      const result: Record<string, any> = {};
      fieldOrFields.forEach(field => {
        result[field as string] = getSingleValue(field);
      });
      return result;
    } else {
      // 単一値処理（既存の動作）
      return getSingleValue(fieldOrFields);
    }
  }

  // 現在の値を設定する（アトミック更新）
  const setCurrentValue = (values: Record<string, any>): void => {
    const phase = getCurrentPhase();
    const selectedLang = phase === TextAssetInstancePhase.ASSET_LANG ? activePreviewTab : getCurrentLanguage();

    // 値を分類
    const textAssetFields: Partial<TextAsset> = {};
    const languageSettingsFields: Partial<LanguageSettings> = {};
    const instanceFields: any = {};

    Object.entries(values).forEach(([field, val]) => {
      if (isTextAssetEditableField(field)) {
        if (field === 'name') {
          textAssetFields.name = val;
        } else if (field === 'text') {
          if (phase === TextAssetInstancePhase.ASSET_COMMON) {
            textAssetFields.default_text = val;
          } else if (phase === TextAssetInstancePhase.INSTANCE_LANG) {
            instanceFields.text = val;
          }
        } else if (field === 'context') {
          if (phase === TextAssetInstancePhase.ASSET_COMMON) {
            textAssetFields.default_context = val;
          } else if (phase === TextAssetInstancePhase.INSTANCE_LANG) {
            instanceFields.context = val;
          }
        } else if (field === 'default_text_override') {
          textAssetFields.default_text_override = val;
        } else if (field === 'default_language_override') {
          textAssetFields.default_language_override = val;
        }
      } else if (isLanguageSettingsField(field)) {
        (languageSettingsFields as any)[field] = val;
      } else if (field === 'override_language_settings') {
        instanceFields.override_language_settings = val;
      }
    });

    // アトミック更新実行
    // 1. TextAsset更新
    if (Object.keys(textAssetFields).length > 0) {
      setEditingAsset({
        ...editingAsset,
        ...textAssetFields
      });
    }

    // 2. LanguageSettings更新
    if (Object.keys(languageSettingsFields).length > 0) {
      if (phase === TextAssetInstancePhase.ASSET_COMMON) {
        handleCommonSettingsChange(languageSettingsFields);
      } else if (phase === TextAssetInstancePhase.ASSET_LANG) {
        handleLanguageOverrideChanges(selectedLang, languageSettingsFields);
      } else if (phase === TextAssetInstancePhase.INSTANCE_LANG) {
        handleInstanceLanguageSettingChanges(selectedLang, languageSettingsFields);
      }
    }

    // 3. Instance専用フィールド更新
    if (Object.keys(instanceFields).length > 0 && editingInstance) {
      const updatedInstance = { ...editingInstance };

      if (instanceFields.text !== undefined) {
        updatedInstance.multilingual_text = {
          ...updatedInstance.multilingual_text,
          [selectedLang]: instanceFields.text
        };
      }

      if (instanceFields.context !== undefined) {
        updatedInstance.override_context = instanceFields.context || undefined;
      }

      if ('override_language_settings' in instanceFields) {
        if (instanceFields.override_language_settings === undefined) {
          // undefinedの場合はプロパティを削除
          delete updatedInstance.override_language_settings;
        } else {
          updatedInstance.override_language_settings = instanceFields.override_language_settings;
        }
      }

      setEditingInstance(updatedInstance);
    }
  };

  // 位置設定の便利関数
  const setCurrentPosition = (x: number, y: number): void => {
    setCurrentValue({ pos_x: x, pos_y: y });
  };

  // 言語設定オーバーライドが有効かどうかを判定
  const isLanguageOverrideEnabled = (): boolean => {
    const overrideSettings = getCurrentValue('override_language_settings');
    const currentLang = getCurrentLanguage();
    return !!(overrideSettings && overrideSettings[currentLang] !== undefined);   // React controlled inputエラー防止のため、!!演算子でboolean型を保証
  };

  // 言語別デフォルト設定が有効かどうかを判定
  const isLanguageDefaultOverrideEnabled = (): boolean => {
    const overrideSettings = getCurrentValue('default_language_override');
    const currentLang = activePreviewTab;
    return !!(overrideSettings && overrideSettings[currentLang] !== undefined);  // React controlled inputエラー防止のため、!!演算子でboolean型を保証
  };

  // インスタンスの多言語テキストがオーバーライドされているかどうかを判定
  const isInstanceTextOverrideEnabled = (): boolean => {
    if (!editingInstance) return false;
    const currentLang = getCurrentLanguage();
    return !!(editingInstance.multilingual_text && currentLang in editingInstance.multilingual_text);  // React controlled inputエラー防止のため、!!演算子でboolean型を保証
  };

  // プレビューサイズを計算
  const previewDimensions = useMemo(() => {
    const canvasWidth = canvasConfig?.width || 800;
    const canvasHeight = canvasConfig?.height || 600;
    const maxPreviewWidth = 360;
    const maxPreviewHeight = 300;

    // 縦横比を保持しながら最大サイズ内に収める
    const widthRatio = maxPreviewWidth / canvasWidth;
    const heightRatio = maxPreviewHeight / canvasHeight;
    const scale = Math.min(widthRatio, heightRatio, 1); // 1以下にする（拡大しない）

    return {
      width: Math.round(canvasWidth * scale),
      height: Math.round(canvasHeight * scale),
      scale,
    };
  }, [canvasConfig]);

  const getTextFrameSize = useCallback(() => {
    const pos = currentPos;
    const scale = previewDimensions.scale;
    const fontSize = getCurrentValue('font_size')
    const charWidth = fontSize * previewDimensions.scale
    const lines = (getCurrentValue('text') || '').split('\n');
    const vertical = getCurrentValue('vertical');
    const leading = getCurrentValue('leading') || 1.2; // デフォルトの行間
    let maxWidth = 0;
    for (const line of lines) {
      const lineLength = line.length;
      if (lineLength > maxWidth) {
        maxWidth = lineLength;
      }
    }
    if (vertical) {
      return {
        top: pos.y * scale,
        left: (pos.x - lines.length * fontSize + fontSize / 2) * scale,
        height: (maxWidth * fontSize + (maxWidth * leading)) * scale * 1.2, // ヒューリスティックな調整:1.2くらいでちょうどよくなる。
        width: (lines.length * fontSize ) * scale,
      }
    } else {
      return {
        top: (pos.y - fontSize) * scale,
        left: pos.x * scale,
        height: lines.length * charWidth,
        width: maxWidth * charWidth,
      }
    }
  }, [currentPos, previewDimensions.scale, getCurrentValue]);

  // 複数の共通設定を同時に更新する関数
  const handleCommonSettingsChange = (settings: Partial<LanguageSettings>) => {
    if (mode !== 'asset') return;
    const currentSettings = editingAsset.default_settings || {};
    const updatedSettings = { ...currentSettings };

    // 複数の設定を同時に更新
    Object.entries(settings).forEach(([key, value]) => {
      const settingKey = key as keyof LanguageSettings;
      if (value === undefined || value === '' || value === null) {
        delete updatedSettings[settingKey];
      } else {
        (updatedSettings as any)[settingKey] = value;
      }
    });

    // 更新されたアセットデータを作成
    const updatedAsset = {
      ...editingAsset,
      default_settings: updatedSettings
    };

    setEditingAsset(updatedAsset);
  };

  // 複数の言語オーバーライド設定を同時に更新する関数
  const handleLanguageOverrideChanges = (language: string, settings: Partial<LanguageSettings>) => {
    if (mode !== 'asset') return;

    const updatedOverrides = updateLanguageSettings<LanguageSettings>(
      editingAsset.default_language_override,
      language,
      settings
    );

    const updatedAsset = {
      ...editingAsset,
      default_language_override: updatedOverrides
    };

    setEditingAsset(updatedAsset);
  };

  // 複数のインスタンス言語設定を同時に更新する関数
  const handleInstanceLanguageSettingChanges = (language: string, settings: Partial<LanguageSettings>) => {
    if (mode !== 'instance' || !editingInstance) return;

    const updatedOverrides = updateLanguageSettings<LanguageSettings>(
      editingInstance.override_language_settings,
      language,
      settings
    );

    const updatedInstance = {
      ...editingInstance,
      override_language_settings: updatedOverrides
    };

    setEditingInstance(updatedInstance);
  };

  // ドラッグ操作のハンドラー
  const handleTextMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({ x: currentPos.x, y: currentPos.y });
  };


  // グローバルマウスイベントの処理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = (e.clientX - dragStartPos.x) / previewDimensions.scale;
        const deltaY = (e.clientY - dragStartPos.y) / previewDimensions.scale;

        // キャンバス境界内に制限
        const canvasWidth = canvasConfig?.width || 800;
        const canvasHeight = canvasConfig?.height || 600;

        const newX = Math.max(0, Math.min(canvasWidth - 50, dragStartValues.x + deltaX)); // 50px余裕を持たせる
        const newY = Math.max(0, Math.min(canvasHeight - 50, dragStartValues.y + deltaY));

        setCurrentPosition(newX, newY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartPos, dragStartValues, canvasConfig, previewDimensions.scale]);

  const handleSave = () => {
    if (mode === 'asset') {
      // TextAssetの全体バリデーション
      const validation = validateTextAssetData(editingAsset);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      if (onSaveAsset) {
        onSaveAsset(editingAsset);
      }
    } else if (mode === 'instance' && editingInstance) {
      // TextAssetInstanceの全体バリデーション
      const validation = validateTextAssetInstanceData(editingInstance);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      if (onSaveInstance) {
        onSaveInstance(editingInstance);
      }
    }
    onClose();
  };

  // プレビュー用SVGを生成
  const previewSVG = useMemo(() => {
    try {
      // 選択されたタブに応じて言語を決定
      let previewLanguage: string;
      let previewAsset: TextAsset;
      if (activePreviewTab === 'common') {
        // 共通設定の場合は default_settings を使用するため、'common' という架空の言語を作成する
        previewLanguage = 'common';
        previewAsset = {
          id: `temp-preview-${editingAsset.id}`,
          type: editingAsset.type,
          name: editingAsset.name,
          default_text: editingAsset.default_text,
          default_context: editingAsset.default_context,
          default_settings: editingAsset.default_settings,
          default_language_override: {
            'common': editingAsset.default_settings,
          },
        };
      } else if (activePreviewTab && project?.metadata.supportedLanguages?.includes(activePreviewTab)) {
        // 言語タブの場合はそのタブの言語を使用
        previewLanguage = activePreviewTab;
        previewAsset = editingAsset;
      } else {
        // フォールバック: 現在の言語
        previewLanguage = getCurrentLanguage();
        previewAsset = editingAsset;
      }

      let phase = getCurrentPhase();
      // インスタンス編集モードかつ、 editingInstance に言語の text 設定が存在しない場合には、AUTO モードにする
      if (phase === TextAssetInstancePhase.INSTANCE_LANG && editingInstance && !(previewLanguage in editingInstance.multilingual_text)) {
        phase = TextAssetInstancePhase.AUTO;
      }
      // アセット編集モードかつ、言語 editingAsset.default_text_override に言語設定が存在しない場合には、AUTO モードにする
      if (phase === TextAssetInstancePhase.ASSET_LANG && !(editingAsset.default_text_override && previewLanguage in editingAsset.default_text_override)) {
        phase = TextAssetInstancePhase.AUTO;
      }

      const canvasWidth = canvasConfig?.width || 800;
      const canvasHeight = canvasConfig?.height || 600;
      const svg = generateTextPreviewSVG(
        previewAsset,
        mode === 'instance' ? editingInstance : undefined,
        previewLanguage,
        {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: 'transparent',
        },
        phase,
      );
      return `<svg
        width="100%"
        height="100%"
        viewBox="0 0 ${canvasWidth} ${canvasHeight}"
        xmlns="http://www.w3.org/2000/svg"
        style="position: absolute; top: 0; left: 0; pointer-events: none;"
      >
      ${svg}
      </svg>`;
    } catch (error) {
      console.error('Failed to generate preview SVG:', error);
      return '<svg><text>プレビューエラー</text></svg>';
    }
  }, [editingAsset, editingInstance, mode, canvasConfig, getCurrentLanguage, activePreviewTab, project]);

  // SVG形式のテキストドラッグエリアを生成
  const textDragAreaSVG = useMemo(() => {
    const frameSize = getTextFrameSize();
    const canvasWidth = canvasConfig?.width || 800;
    const canvasHeight = canvasConfig?.height || 600;

    return `<svg
      width="100%"
      height="100%"
      viewBox="0 0 ${canvasWidth} ${canvasHeight}"
      xmlns="http://www.w3.org/2000/svg"
      style="position: absolute; top: 0; left: 0; pointer-events: none;"
    >
      <rect
        x="${frameSize.left / previewDimensions.scale}"
        y="${frameSize.top / previewDimensions.scale}"
        width="${frameSize.width / previewDimensions.scale}"
        height="${frameSize.height / previewDimensions.scale}"
        fill="${isDragging ? 'rgba(0, 123, 255, 0.2)' : 'transparent'}"
        stroke="${isDragging ? '#007bff' : 'rgba(0, 123, 255, 0.3)'}"
        stroke-width="${isDragging ? '2' : '1'}"
        stroke-dasharray="${isDragging ? '5,5' : '3,3'}"
        style="pointer-events: all; cursor: move;"
        data-drag-area="true"
      />
    </svg>`;
  }, [getTextFrameSize, previewDimensions.scale, canvasConfig, isDragging]);

  // モーダル外側クリックでの閉じる処理を削除

  const modalTitle = mode === 'asset' ? 'テキストアセット編集' : 'テキストアセットインスタンス編集';

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      scroll="paper"
      sx={{
        zIndex: 1300,
        '& .MuiDialog-paper': {
          width: '95vw',
          maxWidth: '1400px',
          height: '90vh',
          maxHeight: '900px',
          overflow: 'hidden',
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
        {modalTitle}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '70vh', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* 左側: プレビューエリア - 固定幅 */}
          <Box sx={{
            width: 600,
            minWidth: 600,
            p: 2,
            backgroundColor: 'action.hover',
            borderRight: '1px solid',
            borderRightColor: 'divider',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              プレビュー
            </Typography>

            {/* プレビュータブ（アセット編集時のみ表示） */}
            {mode === 'asset' && project && project.metadata.supportedLanguages && project.metadata.supportedLanguages.length > 1 && (
              <Box sx={{ mb: 2 }}>
                <Tabs
                  value={activePreviewTab}
                  onChange={(e, newValue) => handlePreviewTabClick(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ minHeight: 'auto' }}
                >
                  {getPreviewTabs().map(tab => (
                    <Tab
                      key={tab.id}
                      label={tab.label}
                      value={tab.id}
                      sx={{ minHeight: 'auto', py: 1, fontSize: '0.875rem' }}
                    />
                  ))}
                </Tabs>
              </Box>
            )}

            {/* インスタンス編集時の言語表示 */}
            {getCurrentPhase() === TextAssetInstancePhase.INSTANCE_LANG && (
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={`編集中の言語: ${getCurrentLanguage() === 'ja' ? '日本語' :
                                      getCurrentLanguage() === 'en' ? 'English' :
                                      getCurrentLanguage() === 'zh' ? '中文' :
                                      getCurrentLanguage() === 'ko' ? '한국어' :
                                      getCurrentLanguage().toUpperCase()}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Box>
            )}

            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1
            }}>
              <Box sx={{
                position: 'relative',
                width: previewDimensions.width,
                height: previewDimensions.height,
                border: '2px solid #007bff',
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                backgroundColor: '#f8f9fa'
              }}>
                {/* SVGプレビュー */}
                <Box
                  dangerouslySetInnerHTML={{ __html: previewSVG }}
                  sx={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    pointerEvents: 'none', // SVG自体はクリック無効
                  }}
                />

                {/* SVG形式のドラッグ可能領域 */}
                <Box
                  dangerouslySetInnerHTML={{ __html: textDragAreaSVG }}
                  sx={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    pointerEvents: 'all',
                    zIndex: 2,
                  }}
                  onMouseDown={handleTextMouseDown}
                  title="ドラッグしてテキスト位置を変更"
                />
              </Box>
            </Box>
          </Box>

          {/* 右側: フォーム編集エリア - スクロール可能 */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {/* 基本情報 */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_COMMON && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  基本設定
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="名前"
                    value={getCurrentValue('name')}
                    onChange={(e) => setCurrentValue({name: e.target.value})}
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        ダミーテキスト
                        <Tooltip title="テキストの内容は、さらに各ページで個別に設定できます。このテキストは、編集画面での動作確認用や、初期値として使用されます。">
                          <HelpIcon sx={{ fontSize: 16, cursor: 'help' }} />
                        </Tooltip>
                      </Box>
                    }
                    value={getCurrentValue('text')}
                    onChange={(e) => setCurrentValue({text: e.target.value})}
                    multiline
                    rows={3}
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        文脈・用途
                        <Tooltip title="このテキストの用途や文脈をメモし、生成AIでの翻訳に役立てます。">
                          <HelpIcon sx={{ fontSize: 16, cursor: 'help' }} />
                        </Tooltip>
                      </Box>
                    }
                    value={getCurrentValue('context')}
                    onChange={(e) => setCurrentValue({context: e.target.value})}
                    placeholder="例: キャラクターAの叫び声、ナレーション等"
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Box>
            )}

            {/* フォント設定 */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_COMMON && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  フォント設定
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    select
                    label="フォント"
                    value={getCurrentValue('font') && availableFonts.find(f => f.id === getCurrentValue('font')) ? getCurrentValue('font') : ''}
                    onChange={(e) => setCurrentValue({ font: e.target.value })}
                    fullWidth
                    variant="outlined"
                    size="small"
                    disabled={fontsLoading}
                  >
                    {fontsLoading ? (
                      <MenuItem value="">フォント読み込み中...</MenuItem>
                    ) : (
                      [
                        ...availableFonts.map((font) => (
                          <MenuItem key={font.id} value={font.id}>
                            {font.name} {font.type === 'custom' ? '(カスタム)' : ''}
                          </MenuItem>
                        )),
                        /* 現在のフォントが一覧にない場合の対応（system-uiなど無効な値は除外） */
                        getCurrentValue('font') &&
                        getCurrentValue('font') !== 'system-ui' &&
                        !availableFonts.find(f => f.id === getCurrentValue('font')) && (
                          <MenuItem key={getCurrentValue('font')} value={getCurrentValue('font')}>
                            {getCurrentValue('font')} (未定義)
                          </MenuItem>
                        )
                      ].filter(Boolean)
                    )}
                  </TextField>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>フォントサイズ</Typography>
                    <NumericInput
                      value={getCurrentValue('font_size')}
                      onChange={(value) => setCurrentValue({ font_size: value })}
                      min={0.01}
                      decimals={2}
                      className="small"
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>行間</Typography>
                    <NumericInput
                      value={getCurrentValue('leading')}
                      onChange={(value) => setCurrentValue({ leading: value })}
                      decimals={2}
                      className="small"
                    />
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={getCurrentValue('vertical')}
                        onChange={(e) => setCurrentValue({ vertical: e.target.checked })}
                        size="small"
                      />
                    }
                    label="縦書き"
                  />
                </Box>
              </Box>
            )}

            {/* 色設定 */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_COMMON && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  色設定
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <ColorPicker
                    label="塗りの色"
                    value={getCurrentValue('fill_color')}
                    onChange={(color) => setCurrentValue({fill_color: color})}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <ColorPicker
                    label="縁取りの色"
                    value={getCurrentValue('stroke_color')}
                    onChange={(color) => setCurrentValue({stroke_color: color})}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>縁取り幅</Typography>
                  <NumericInput
                    value={getCurrentValue('stroke_width')}
                    onChange={(value) => {
                      setCurrentValue({stroke_width: value});
                    }}
                    min={0}
                    max={9999}
                    decimals={0}
                    className="small"
                  />
                </Box>
              </Box>
            )}

            {/* 位置・透明度設定（アセット編集時のみ） */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_COMMON && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  位置・透明度設定
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>X座標</Typography>
                    <NumericInput
                      value={getCurrentPosition().x}
                      onChange={(value) => setCurrentValue({pos_x: value})}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Y座標</Typography>
                    <NumericInput
                      value={getCurrentPosition().y}
                      onChange={(value) => setCurrentValue({pos_y: value})}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <OpacityInput
                    value={getCurrentValue('opacity')}
                    onChange={(value) => setCurrentValue({opacity: value})}
                    label="透明度"
                  />
                </Box>

                {/* z_index設定 */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Z-Index</Typography>
                  <ZIndexInput
                    value={getCurrentValue('z_index')}
                    onChange={(value) => setCurrentValue({z_index: value})}
                    validation={zIndexValidation}
                  />
                </Box>
              </Box>
            )}

            {/* 現在言語の設定（インスタンス編集時のみ） */}
            {getCurrentPhase() === TextAssetInstancePhase.INSTANCE_LANG && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  ページの内容
                </Typography>
                {/* テキスト設定 */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'nowrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      このページのテキスト
                    </Typography>
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!isInstanceTextOverrideEnabled()}
                          size="small"
                          onChange={(e) => {
                            if (e.target.checked) {
                              // チェックを入れたら該当言語の設定を削除（確認用テキストを使用）
                              if (editingInstance?.multilingual_text) {
                                const currentLang = getCurrentLanguage();
                                const newMultilingualText = { ...editingInstance.multilingual_text };
                                delete newMultilingualText[currentLang];
                                setEditingInstance({
                                  ...editingInstance,
                                  multilingual_text: newMultilingualText
                                });
                              }
                            } else {
                              // チェックを外したらこのページ専用のテキストを設定（初期値は空文字列）
                              setCurrentValue({
                                text: '' // 空文字列で初期化
                              });
                            }
                          }}
                        />
                      }
                      label="確認用テキストを利用"
                      sx={{ margin: 0, fontSize: '14px', whiteSpace: 'nowrap' }}
                    />
                  </Box>
                  <TextField
                    value={getEffectiveTextValue(editingAsset, editingInstance, getCurrentLanguage(), TextAssetInstancePhase.AUTO)}
                    onChange={(e) => setCurrentValue({text: e.target.value})}
                    multiline
                    rows={3}
                    disabled={!isInstanceTextOverrideEnabled()}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                      '& .MuiInputBase-input.Mui-disabled': {
                        backgroundColor: '#f5f5f5',
                        color: '#666',
                        cursor: 'not-allowed'
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                    {!isInstanceTextOverrideEnabled()
                      ? '確認用テキストが使用されます（チェックを外すとこのページ専用のテキストを設定できます）'
                      : 'このページ専用のテキストを設定します'
                    }
                  </Typography>
                </Box>
                {/* 文脈設定 */}
                <Box sx={{ mb: 3 }}>
                  <TextField
                    label="文脈・用途"
                    value={getCurrentValue('context')}
                    onChange={(e) => setCurrentValue({context: e.target.value})}
                    placeholder="例: キャラクターAの叫び声、ナレーション等"
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                    このページでの用途や文脈を記録しておけます（任意）
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, margin: 0 }}>
                    このページのスタイルを上書き
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isLanguageOverrideEnabled()}
                        size="small"
                        onChange={(e) => {
                          const currentLang = getCurrentLanguage();
                          const currentOverrides = getCurrentValue('override_language_settings') || {};

                          if (e.target.checked) {
                            // チェックを入れたら空の設定を作成
                            setCurrentValue({
                              override_language_settings: {
                                ...currentOverrides,
                                [currentLang]: {}
                              }
                            });
                          } else {
                            // チェックを外したら該当言語の設定を削除
                            const newOverrides = { ...currentOverrides };
                            delete newOverrides[currentLang];
                            setCurrentValue({
                              override_language_settings: Object.keys(newOverrides).length > 0 ? newOverrides : undefined
                            });
                          }
                        }}
                      />
                    }
                    label="有効"
                    sx={{ margin: 0, fontSize: '14px' }}
                  />
                </Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
                  現在の言語（{getCurrentLanguage() === 'ja' ? '日本語' :
                              getCurrentLanguage() === 'en' ? 'English' :
                              getCurrentLanguage() === 'zh' ? '中文' :
                              getCurrentLanguage() === 'ko' ? '한국어' :
                              getCurrentLanguage().toUpperCase()}）におけるこのページのスタイルを上書きします
                </Typography>

                {/* 言語設定項目のラッパー */}
                <Box
                  sx={{
                    opacity: isLanguageOverrideEnabled() ? 1 : 0.6,
                    pointerEvents: isLanguageOverrideEnabled() ? 'auto' : 'none',
                    '& .MuiTextField-root': {
                      '& .MuiInputBase-input.Mui-disabled': {
                        backgroundColor: '#f5f5f5',
                        color: '#666'
                      }
                    }
                  }}
                >
                  {/* フォント設定 */}
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      select
                      label="フォント"
                      value={getCurrentValue('font') && availableFonts.find(f => f.id === getCurrentValue('font')) ? getCurrentValue('font') : ''}
                      onChange={(e) => setCurrentValue({font: e.target.value})}
                      disabled={!isLanguageOverrideEnabled()}
                      fullWidth
                      variant="outlined"
                      size="small"
                    >
                      <MenuItem value="">アセット設定を使用</MenuItem>
                      {availableFonts.map((font) => (
                        <MenuItem key={font.id} value={font.id}>
                          {font.name} {font.type === 'custom' ? '(カスタム)' : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  {/* フォントサイズ */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>フォントサイズ</Typography>
                    <NumericInput
                      value={getCurrentValue('font_size')}
                      onChange={(value) => setCurrentValue({font_size: value})}
                      min={0.01}
                      decimals={2}
                      className="small"
                      placeholder="アセット設定使用"
                      disabled={!isLanguageOverrideEnabled()}
                    />
                  </Box>

                  {/* 位置設定 */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>X座標</Typography>
                      <NumericInput
                        value={getCurrentValue('pos_x')}
                        onChange={(value) => setCurrentValue({pos_x: value})}
                        min={-9999}
                        max={9999}
                        decimals={2}
                        className="small"
                        placeholder="アセット設定使用"
                        disabled={!isLanguageOverrideEnabled()}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Y座標</Typography>
                      <NumericInput
                        value={getCurrentValue('pos_y')}
                        onChange={(value) => setCurrentValue({pos_y: value})}
                        min={-9999}
                        max={9999}
                        decimals={2}
                        className="small"
                        placeholder="アセット設定使用"
                        disabled={!isLanguageOverrideEnabled()}
                      />
                    </Box>
                  </Box>

                  {/* 縦書き設定 */}
                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={getCurrentValue('vertical')}
                          onChange={(e) => setCurrentValue({vertical: e.target.checked})}
                          disabled={!isLanguageOverrideEnabled()}
                          size="small"
                        />
                      }
                      label="縦書き"
                    />
                  </Box>

                  {/* 不透明度設定 */}
                  <Box sx={{ mb: 2 }}>
                    <OpacityInput
                      value={getCurrentValue('opacity')}
                      onChange={(value) => setCurrentValue({opacity: value})}
                      label="Opacity"
                      disabled={!isLanguageOverrideEnabled()}
                    />
                  </Box>

                  {/* z-index設定 */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Z-Index</Typography>
                    <ZIndexInput
                      value={getCurrentValue('z_index')}
                      onChange={(value) => setCurrentValue({z_index: value})}
                      disabled={!isLanguageOverrideEnabled()}
                    />
                  </Box>
                </Box>
              </Box>
            )}

            {/* 言語別設定（アセット編集時のみ） */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_LANG && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary' }}>
                  特定の言語でのみ異なる設定にしたい場合に使用します
                </Typography>

                {/* 言語別の確認用テキスト */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, margin: 0 }}>
                    言語別の確認用テキスト（{activePreviewTab === 'ja' ? '日本語' : activePreviewTab === 'en' ? 'English' : activePreviewTab}）
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={(() => {
                          const overrideTexts = getCurrentValue('default_text_override') || {};
                          return !!(activePreviewTab in overrideTexts); // React controlled inputエラー防止のため、!!演算子でboolean型を保証
                        })()}
                        size="small"
                        onChange={(e) => {
                          const currentLang = activePreviewTab;
                          const currentOverrides = getCurrentValue('default_text_override') || {};

                          if (e.target.checked) {
                            // チェックを入れたら空文字列を設定
                            const newValue = {
                              default_text_override: {
                                ...currentOverrides,
                                [currentLang]: ''
                              }
                            };
                            setCurrentValue(newValue);
                          } else {
                            // チェックを外したら該当言語の設定を削除
                            const newOverrides = { ...currentOverrides };
                            delete newOverrides[currentLang];
                            const newValue = {
                              default_text_override: Object.keys(newOverrides).length > 0 ? newOverrides : undefined
                            };
                            setCurrentValue(newValue);
                          }
                        }}
                      />
                    }
                    label="有効"
                    sx={{ margin: 0, fontSize: '14px' }}
                  />
                </Box>

                {/* テキスト入力欄 */}
                {activePreviewTab && activePreviewTab !== 'common' && (() => {
                  const overrideTexts = getCurrentValue('default_text_override') || {};
                  const isTextOverrideEnabled = activePreviewTab in overrideTexts;
                  return (
                    <Box
                      sx={{
                        opacity: isTextOverrideEnabled ? 1 : 0.6,
                        mb: 3
                      }}
                    >
                      <TextField
                        label="確認用テキスト"
                        value={isTextOverrideEnabled ? (overrideTexts[activePreviewTab] || '') : ''}
                        onChange={(e) => {
                          if (isTextOverrideEnabled) {
                            const currentOverrides = getCurrentValue('default_text_override') || {};
                            setCurrentValue({
                              default_text_override: {
                                ...currentOverrides,
                                [activePreviewTab]: e.target.value
                              }
                            });
                          }
                        }}
                        disabled={!isTextOverrideEnabled}
                        multiline
                        rows={3}
                        placeholder={isTextOverrideEnabled ? '言語固有のデフォルトテキスト' : '全言語共通のデフォルトテキストを使用'}
                        fullWidth
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  );
                })()}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, margin: 0 }}>
                    言語別のスタイル設定（{activePreviewTab === 'ja' ? '日本語' : activePreviewTab === 'en' ? 'English' : activePreviewTab}）
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isLanguageDefaultOverrideEnabled()}
                        size="small"
                        onChange={(e) => {
                          const currentLang = activePreviewTab;
                          const currentOverrides = getCurrentValue('default_language_override') || {};

                          if (e.target.checked) {
                            // 空の設定を作成
                            setCurrentValue({
                              default_language_override: {
                                ...currentOverrides,
                                [currentLang]: {}
                              }
                            });
                          } else {
                            // 該当言語の設定を削除
                            const newOverrides = { ...currentOverrides };
                            delete newOverrides[currentLang];
                            setCurrentValue({
                              default_language_override: Object.keys(newOverrides).length > 0 ? newOverrides : undefined
                            });
                          }
                        }}
                      />
                    }
                    label="有効"
                    sx={{ margin: 0, fontSize: '14px' }}
                  />
                </Box>
                {activePreviewTab && activePreviewTab !== 'common' && (
                  <Box
                    sx={{
                      opacity: isLanguageDefaultOverrideEnabled() ? 1 : 0.6,
                      pointerEvents: isLanguageDefaultOverrideEnabled() ? 'auto' : 'none'
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        select
                        label="フォント"
                        value={getCurrentValue('font') && availableFonts.find(f => f.id === getCurrentValue('font')) ? getCurrentValue('font') : ''}
                        onChange={(e) => setCurrentValue({font: e.target.value})}
                        disabled={!isLanguageDefaultOverrideEnabled()}
                        fullWidth
                        variant="outlined"
                        size="small"
                      >
                        <MenuItem value="">{mode === 'asset' ? '共通設定のフォントを使用' : 'アセット設定を使用'}</MenuItem>
                        {availableFonts.map((font) => (
                          <MenuItem key={font.id} value={font.id}>
                            {font.name} {font.type === 'custom' ? '(カスタム)' : ''}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>フォントサイズ</Typography>
                      <NumericInput
                        value={getCurrentValue('font_size')}
                        onChange={(value) => setCurrentValue({font_size: value})}
                        min={0.01}
                        decimals={2}
                        className="small"
                        placeholder={mode === 'asset' ? 'デフォルト使用' : 'アセット設定使用'}
                        disabled={!isLanguageDefaultOverrideEnabled()}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>X座標</Typography>
                        <NumericInput
                          value={getCurrentValue('pos_x')}
                          onChange={(value) => setCurrentValue({pos_x: value})}
                          min={-9999}
                          max={9999}
                          decimals={2}
                          className="small"
                          placeholder="アセット設定使用"
                          disabled={!isLanguageDefaultOverrideEnabled()}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Y座標</Typography>
                        <NumericInput
                          value={getCurrentValue('pos_y')}
                          onChange={(value) => setCurrentValue({pos_y: value})}
                          min={-9999}
                          max={9999}
                          decimals={2}
                          className="small"
                          placeholder="アセット設定使用"
                          disabled={!isLanguageDefaultOverrideEnabled()}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={getCurrentValue('vertical')}
                            onChange={(e) => setCurrentValue({ vertical: e.target.checked })}
                            disabled={!isLanguageDefaultOverrideEnabled()}
                            size="small"
                          />
                        }
                        label="縦書き"
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          キャンセル
        </Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};
