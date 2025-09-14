import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { generateTextPreviewSVG } from '../../../utils/svgGeneratorCommon';
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
import './TextEditModal.css';

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
  type SupportedField = keyof TextAssetEditableField | keyof LanguageSettings | 'override_language_settings' | 'default_language_override';

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
          return getEffectiveTextValue(editingAsset, editingInstance, selectedLang, phase);
        } else if (assetField === 'context') {
          return getEffectiveContextValue(editingAsset, editingInstance, selectedLang, phase);
        } else if (assetField === 'name') {
          return editingAsset.name;
        } else if (assetField === 'use_default_text_for_pages') {
          return editingAsset.use_default_text_for_pages;
        }
      }
      if (isLanguageSettingsField(assetField as string)) {
        const ret = getEffectiveLanguageSetting(editingAsset, editingInstance, selectedLang, assetField as keyof LanguageSettings, phase);
        return ret
      }
      if (assetField === 'override_language_settings') {
        return editingInstance?.override_language_settings;
      }
      if (assetField === 'default_language_override') {
        return editingAsset?.default_language_override;
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
    // console.log('debug: setCurrentValue phase:', phase, 'lang:', selectedLang, 'values:', values);

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
        } else if (field === 'use_default_text_for_pages') {
          textAssetFields.use_default_text_for_pages = val;
        }
      } else if (isLanguageSettingsField(field)) {
        (languageSettingsFields as any)[field] = val;
      } else if (field === 'override_language_settings') {
        instanceFields.override_language_settings = val;
      } else if (field === 'default_language_override') {
        textAssetFields.default_language_override = val;
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
    return overrideSettings && overrideSettings[currentLang] !== undefined;
  };

  // 言語別デフォルト設定が有効かどうかを判定
  const isLanguageDefaultOverrideEnabled = (): boolean => {
    const overrideSettings = getCurrentValue('default_language_override');
    const currentLang = activePreviewTab;
    return overrideSettings && overrideSettings[currentLang] !== undefined;
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
    const lines = getCurrentValue('text').split('\n');
    const vertical = getCurrentValue('vertical');
    const leading = getCurrentValue('leading') || 1.2; // デフォルトの行間
    // console.log('debug: getTextFrameSize (x,y):', pos.x, pos.y,);
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

  // 言語別設定変更ハンドラー（Asset編集用）
  const handleLanguageSettingChange = (language: string, settingKey: keyof LanguageSettings, value: any) => {
    if (mode !== 'asset') return;
    // 新設計では、これは language override として扱われる
    handleLanguageOverrideChange(language, settingKey, value);
  };

  // インスタンス用言語別設定変更ハンドラー
  const handleInstanceLanguageSettingChange = (language: string, settingKey: keyof LanguageSettings, value: any) => {
    if (mode !== 'instance' || !editingInstance) return;

    const currentSettings = editingInstance.override_language_settings || {};
    const languageSettings = currentSettings[language] || {};

    // 値がundefinedまたは空の場合は設定を削除
    const updatedLanguageSettings = { ...languageSettings };
    if (value === undefined || value === '' || value === null) {
      delete updatedLanguageSettings[settingKey];
    } else {
      updatedLanguageSettings[settingKey] = value;
    }

    // 言語設定全体が空になった場合は言語エントリを削除
    const hasAnySettings = Object.keys(updatedLanguageSettings).length > 0;
    const updatedOverrideLanguageSettings = { ...currentSettings };

    if (hasAnySettings) {
      updatedOverrideLanguageSettings[language] = updatedLanguageSettings;
    } else {
      delete updatedOverrideLanguageSettings[language];
    }

    setEditingInstance({
      ...editingInstance,
      override_language_settings: Object.keys(updatedOverrideLanguageSettings).length > 0 ?
        updatedOverrideLanguageSettings : undefined
    });
  };

  // 共通設定変更ハンドラー（Asset編集用）
  const handleCommonSettingChange = (settingKey: keyof LanguageSettings, value: any) => {
    if (mode !== 'asset') return;
    const currentSettings = editingAsset.default_settings;
    const updatedSettings = { ...currentSettings };
    if (value === undefined || value === '' || value === null) {
      delete updatedSettings[settingKey];
    } else {
      updatedSettings[settingKey] = value;
    }
    // 更新されたアセットデータを作成
    const updatedAsset = {
      ...editingAsset,
      default_settings: updatedSettings
    };
    setEditingAsset(updatedAsset);
  };

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
    const currentOverrides = editingAsset.default_language_override || {};
    const languageSettings = currentOverrides[language] || {};
    const updatedLanguageSettings = { ...languageSettings };

    // 複数の設定を同時に更新
    Object.entries(settings).forEach(([key, value]) => {
      const settingKey = key as keyof LanguageSettings;
      if (value === undefined || value === '' || value === null) {
        delete updatedLanguageSettings[settingKey];
      } else {
        (updatedLanguageSettings as any)[settingKey] = value;
      }
    });

    // 更新されたアセットデータを作成
    const updatedOverrides = { ...currentOverrides };

    if (Object.keys(updatedLanguageSettings).length > 0) {
      updatedOverrides[language] = updatedLanguageSettings;
    } else {
      delete updatedOverrides[language];
    }

    const updatedAsset = {
      ...editingAsset,
      default_language_override: Object.keys(updatedOverrides).length > 0 ? updatedOverrides : undefined
    };

    setEditingAsset(updatedAsset);
  };

  // 複数のインスタンス言語設定を同時に更新する関数
  const handleInstanceLanguageSettingChanges = (language: string, settings: Partial<LanguageSettings>) => {
    if (mode !== 'instance' || !editingInstance) return;
    const currentOverrides = editingInstance.override_language_settings || {};
    const languageSettings = currentOverrides[language] || {};
    const updatedLanguageSettings = { ...languageSettings };

    // 複数の設定を同時に更新
    Object.entries(settings).forEach(([key, value]) => {
      const settingKey = key as keyof LanguageSettings;
      if (value === undefined || value === '' || value === null) {
        delete updatedLanguageSettings[settingKey];
      } else {
        (updatedLanguageSettings as any)[settingKey] = value;
      }
    });

    // 更新されたインスタンスデータを作成
    const updatedOverrides = { ...currentOverrides };

    if (Object.keys(updatedLanguageSettings).length > 0) {
      updatedOverrides[language] = updatedLanguageSettings;
    } else {
      delete updatedOverrides[language];
    }

    const updatedInstance = {
      ...editingInstance,
      override_language_settings: Object.keys(updatedOverrides).length > 0 ? updatedOverrides : undefined
    };

    setEditingInstance(updatedInstance);
  };

  // 言語別オーバーライド変更ハンドラー（Asset編集用）
  const handleLanguageOverrideChange = (language: string, settingKey: keyof LanguageSettings, value: any) => {
    if (mode !== 'asset') return;
    const currentOverrides = editingAsset.default_language_override || {};
    const languageOverrides = currentOverrides[language] || {};
    // 値がundefinedまたは空の場合は設定を削除
    const updatedLanguageOverrides = { ...languageOverrides };
    if (value === undefined || value === '' || value === null) {
      delete updatedLanguageOverrides[settingKey];
    } else {
      updatedLanguageOverrides[settingKey] = value;
    }
    // 言語オーバーライド全体が空になった場合は言語エントリを削除
    const hasAnyOverrides = Object.keys(updatedLanguageOverrides).length > 0;
    const updatedDefaultLanguageOverride = { ...currentOverrides };
    if (hasAnyOverrides) {
      updatedDefaultLanguageOverride[language] = updatedLanguageOverrides;
    } else {
      delete updatedDefaultLanguageOverride[language];
    }
    setEditingAsset({
      ...editingAsset,
      default_language_override: Object.keys(updatedDefaultLanguageOverride).length > 0 ?
        updatedDefaultLanguageOverride : undefined
    });
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
      // console.log('debug: previewSVG (x,y):', currentPos.x, currentPos.y);

      return generateTextPreviewSVG(
        previewAsset,
        mode === 'instance' ? editingInstance : undefined,
        previewLanguage,
        {
          width: canvasConfig?.width || 800,
          height: canvasConfig?.height || 600,
          backgroundColor: 'transparent',
        }
      );
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

  return (
    <div className="text-edit-modal-overlay">
      <div className="text-edit-modal">
        <div className="text-edit-modal-header">
          <h3>{mode === 'asset' ? 'テキストアセット編集' : 'テキストアセットインスタンス編集'}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="text-edit-modal-content">
          <div className="text-edit-preview">
            <h4>プレビュー</h4>

            {/* プレビュータブ（アセット編集時のみ表示） */}
            {mode === 'asset' && project && project.metadata.supportedLanguages && project.metadata.supportedLanguages.length > 1 && (
              <div className="preview-tabs">
                {getPreviewTabs().map(tab => (
                  <button
                    key={tab.id}
                    className={`preview-tab ${activePreviewTab === tab.id ? 'active' : ''}`}
                    onClick={() => handlePreviewTabClick(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* インスタンス編集時の言語表示 */}
            {getCurrentPhase() === TextAssetInstancePhase.INSTANCE_LANG && (
              <div className="current-language-indicator">
                編集中の言語: {getCurrentLanguage() === 'ja' ? '日本語' :
                              getCurrentLanguage() === 'en' ? 'English' :
                              getCurrentLanguage() === 'zh' ? '中文' :
                              getCurrentLanguage() === 'ko' ? '한국어' :
                              getCurrentLanguage().toUpperCase()}
              </div>
            )}

            <div className="text-preview-container" style={{
              width: previewDimensions.width,
              height: previewDimensions.height,
            }}>
              <div className={`canvas-frame ${isDragging ? 'dragging' : ''}`} style={{
                position: 'relative',
                width: previewDimensions.width,
                height: previewDimensions.height,
                border: '2px solid #007bff',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                backgroundColor: '#f8f9fa'
              }}>
                {/* SVGプレビュー */}
                <div
                  className="svg-preview"
                  dangerouslySetInnerHTML={{ __html: previewSVG }}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    pointerEvents: 'none', // SVG自体はクリック無効
                  }}
                />

                {/* SVG形式のドラッグ可能領域 */}
                <div
                  className="svg-drag-area"
                  dangerouslySetInnerHTML={{ __html: textDragAreaSVG }}
                  style={{
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
              </div>
            </div>
          </div>

          <div className="text-edit-form">
            {/* 基本情報 */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_COMMON && (
              <div className="form-section">
                <h4>基本設定</h4>
                <div className="form-group">
                  <label>名前</label>
                  <input
                    type="text"
                    value={getCurrentValue('name')}
                    onChange={(e) => setCurrentValue({name: e.target.value})}
                  />
                </div>
              <div className="form-group">
                <label>テキスト</label>
                <textarea
                  value={getCurrentValue('text')}
                  onChange={(e) => setCurrentValue({text: e.target.value})}
                  rows={3}
                />
                <div className="form-help">
                  テキストの内容は各ページで個別に設定できます。ここで設定した内容は新規ページ作成時の初期値として使用されます。
                </div>
              </div>
              {mode === 'asset' && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingAsset.use_default_text_for_pages || false}
                      onChange={(e) => setCurrentValue({use_default_text_for_pages: e.target.checked})}
                    />
                    各ページの初期値に上記テキストを使う
                  </label>
                  <div className="form-help">
                    チェックを入れると、新しいページ作成時に上記のデフォルトテキストが自動的に設定されます。
                  </div>
                </div>
              )}
                <div className="form-group">
                  <label>文脈・用途</label>
                  <input
                    type="text"
                    value={getCurrentValue('context')}
                    onChange={(e) => setCurrentValue({context: e.target.value})}
                    placeholder="例: キャラクターAの叫び声、ナレーション等"
                  />
                  <div className="form-help">
                    このテキストの用途や文脈をメモし、生成AIでの翻訳に役立てます。
                  </div>
                </div>
              </div>
            )}

            {/* フォント設定 */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_COMMON && (
              <div className="form-section">
                <h4>フォント設定</h4>
                <div className="form-group">
                  <label>フォント</label>
                  {fontsLoading ? (
                    <select disabled>
                      <option>フォント読み込み中...</option>
                    </select>
                  ) : (
                    <select
                      value={getCurrentValue('font')}
                      onChange={(e) => setCurrentValue({ font: e.target.value })}
                    >
                      {availableFonts.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.name} {font.type === 'custom' ? '(カスタム)' : ''}
                        </option>
                      ))}
                      {/* 現在のフォントが一覧にない場合の対応 */}
                      {getCurrentValue('font') && !availableFonts.find(f => f.id === getCurrentValue('font')) && (
                        <option value={getCurrentValue('font')}>
                          {getCurrentValue('font')} (未定義)
                        </option>
                      )}
                    </select>
                  )}
                </div>
                <div className="form-group">
                  <label>フォントサイズ</label>
                  <NumericInput
                    value={getCurrentValue('font_size')}
                    onChange={(value) => setCurrentValue({ font_size: value })}
                    min={0.01}
                    decimals={2}
                    className="small"
                  />
                </div>
                <div className="form-group">
                  <label>行間</label>
                  <NumericInput
                    value={getCurrentValue('leading')}
                    onChange={(value) => setCurrentValue({ leading: value })}
                    decimals={2}
                    className="small"
                  />
                </div>
                <div className="form-group">
                  <label>縦書き
                    <input
                      type="checkbox"
                      checked={getCurrentValue('vertical')}
                      onChange={(e) => setCurrentValue({ vertical: e.target.checked })}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 色設定 */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_COMMON && (
              <div className="form-section">
                <h4>色設定</h4>
                <div className="form-group">
                  <ColorPicker
                    label="塗りの色"
                    value={getCurrentValue('fill_color')}
                    onChange={(color) => setCurrentValue({fill_color: color})}
                  />
                </div>
                <div className="form-group">
                  <ColorPicker
                    label="縁取りの色"
                    value={getCurrentValue('stroke_color')}
                    onChange={(color) => setCurrentValue({stroke_color: color})}
                  />
                </div>
                <div className="form-group">
                  <label>縁取り幅</label>
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
                </div>
              </div>
            )}

            {/* 位置・透明度設定（アセット編集時のみ） */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_COMMON && (
              <div className="form-section">
                <h4>位置・透明度設定</h4>
                <div className="form-row form-row-double">
                  <label>
                    X座標
                    <NumericInput
                      value={getCurrentPosition().x}
                      onChange={(value) => setCurrentValue({pos_x: value})}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                  </label>
                  <label>
                    Y座標
                    <NumericInput
                      value={getCurrentPosition().y}
                      onChange={(value) => setCurrentValue({pos_y: value})}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                  </label>
                </div>
                <div className="form-row">
                  <OpacityInput
                    value={getCurrentValue('opacity')}
                    onChange={(value) => setCurrentValue({opacity: value})}
                    label="透明度"
                  />
                </div>

                {/* z_index設定 */}
                <div className="form-group">
                  <label>Z-Index</label>
                  <ZIndexInput
                    value={getCurrentValue('z_index')}
                    onChange={(value) => setCurrentValue({z_index: value})}
                    validation={zIndexValidation}
                  />
                </div>
              </div>
            )}

            {/* 現在言語の設定（インスタンス編集時のみ） */}
            {getCurrentPhase() === TextAssetInstancePhase.INSTANCE_LANG && (
              <div className="form-section">
                <h4>ページの内容</h4>
                {/* テキスト設定 */}
                <div className="form-group">
                  <label>テキスト</label>
                  <textarea
                    value={getCurrentValue('text')}
                    onChange={(e) => setCurrentValue({text: e.target.value})}
                    rows={3}
                  />
                </div>
                {/* 文脈設定 */}
                <div className="form-group">
                  <label>
                    文脈・用途
                    <input
                      type="text"
                      value={getCurrentValue('context')}
                      onChange={(value) => setCurrentValue({context: value})}
                      placeholder="例: キャラクターAの叫び声、ナレーション等"
                    />
                    <div className="form-help">
                      このインスタンスでの用途や文脈を記録しておけます
                    </div>
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0 }}>現在言語の設定オーバーライド</h4>
                  <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={isLanguageOverrideEnabled()}
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
                    有効
                  </label>
                </div>
                <div className="form-help">
                  現在の言語（{getCurrentLanguage() === 'ja' ? '日本語' :
                              getCurrentLanguage() === 'en' ? 'English' :
                              getCurrentLanguage() === 'zh' ? '中文' :
                              getCurrentLanguage() === 'ko' ? '한국어' :
                              getCurrentLanguage().toUpperCase()}）の設定をページ固有にオーバーライドします
                </div>

                {/* 言語設定項目のラッパー */}
                <div className={`language-settings-container ${isLanguageOverrideEnabled() ? 'enabled' : 'disabled'}`}>
                  {/* フォント設定 */}
                  <div className="form-group">
                  <label>
                    フォント:
                    <select
                      value={getCurrentValue('font')}
                      onChange={(value) => setCurrentValue({font: value})}
                      disabled={!isLanguageOverrideEnabled()}
                    >
                      <option value="">アセット設定を使用</option>
                      {availableFonts.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.name} {font.type === 'custom' ? '(カスタム)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* フォントサイズ */}
                <div className="form-group">
                  <label>フォントサイズ</label>
                  <NumericInput
                    value={getCurrentValue('font_size')}
                    onChange={(value) => setCurrentValue({font_size: value})}
                    min={0.01}
                    decimals={2}
                    className="small"
                    placeholder="アセット設定使用"
                    disabled={!isLanguageOverrideEnabled()}
                  />
                </div>

                {/* 位置設定 */}
                <div className="form-row form-row-double">
                  <label>
                    X座標
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
                  </label>
                  <label>
                    Y座標
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
                  </label>
                </div>

                {/* 縦書き設定 */}
                <div className="form-row">
                  <label>
                    縦書き
                    <input
                      type="checkbox"
                      checked={getCurrentValue('vertical')}
                      onChange={(e) => setCurrentValue({vertical: e.target.checked})}
                      disabled={!isLanguageOverrideEnabled()}
                    />
                  </label>
                </div>

                {/* 不透明度設定 */}
                <div className="form-row">
                  <OpacityInput
                    value={getCurrentValue('opacity')}
                    onChange={(value) => setCurrentValue({opacity: value})}
                    label="Opacity"
                    disabled={!isLanguageOverrideEnabled()}
                  />
                </div>

                {/* z-index設定 */}
                <div className="form-group">
                  <label>Z-Index</label>
                  <ZIndexInput
                    value={getCurrentValue('z_index')}
                    onChange={(value) => setCurrentValue({z_index: value})}
                    disabled={!isLanguageOverrideEnabled()}
                  />
                </div>
                </div>
              </div>
            )}

            {/* 言語別設定（アセット編集時のみ） */}
            {getCurrentPhase() === TextAssetInstancePhase.ASSET_LANG && (
              <div className="form-section">
                <div className="form-help">
                  特定の言語でのみ異なる設定にしたい場合に使用します
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0 }}>言語別デフォルト設定（{activePreviewTab === 'ja' ? '日本語' : activePreviewTab === 'en' ? 'English' : activePreviewTab}）</h4>
                  <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={isLanguageDefaultOverrideEnabled()}
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
                    有効
                  </label>
                </div>
                {activePreviewTab && activePreviewTab !== 'common' && (
                  <div className={`language-default-settings-container ${isLanguageDefaultOverrideEnabled() ? 'enabled' : 'disabled'}`}>
                    <div className="language-settings">
                    <div className="form-row form-row-compact">
                      <label>
                        フォント
                        <select
                          value={getCurrentValue('font')}
                          onChange={(e) => setCurrentValue({font: e.target.value})}
                          disabled={!isLanguageDefaultOverrideEnabled()}
                        >
                          <option value="">{mode === 'asset' ? '共通設定のフォントを使用' : 'アセット設定を使用'}</option>
                          {availableFonts.map((font) => (
                            <option key={font.id} value={font.id}>
                              {font.name} {font.type === 'custom' ? '(カスタム)' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-group">
                      <label>フォントサイズ</label>
                      <NumericInput
                        value={getCurrentValue('font_size')}
                        onChange={(value) => setCurrentValue({font_size: value})}
                        min={0.01}
                        decimals={2}
                        className="small"
                        placeholder={mode === 'asset' ? 'デフォルト使用' : 'アセット設定使用'}
                        disabled={!isLanguageDefaultOverrideEnabled()}
                      />
                    </div>
                    <div className="form-row form-row-double">
                      <label>
                        X座標
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
                      </label>
                      <label>
                        Y座標
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
                      </label>
                    </div>
                    <div className="form-row form-row-compact">
                      <label>縦書き
                        <input
                          type="checkbox"
                          checked={getCurrentValue('vertical')}
                          onChange={(e) => setCurrentValue({ vertical: e.target.checked })}
                          disabled={!isLanguageDefaultOverrideEnabled()}
                        />
                      </label>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-edit-modal-footer">
          <button onClick={onClose} className="cancel-button">キャンセル</button>
          <button onClick={handleSave} className="save-button">保存</button>
        </div>
      </div>
    </div>
  );
};
