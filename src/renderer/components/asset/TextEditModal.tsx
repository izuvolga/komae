import React, { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { generateTextPreviewSVG } from '../../../utils/svgGeneratorCommon';
import { NumericInput } from '../common/NumericInput';
import type { TextAsset, TextAssetInstance, Page, FontInfo, LanguageSettings} from '../../../types/entities';
import { getTextAssetDefaultSettings, TextAssetInstancePhase  } from '../../../types/entities';
import {
  getEffectiveZIndex,
  validateTextAssetData,
  validateTextAssetInstanceData,
  getEffectiveTextValue,
  getEffectivePosition,
  getEffectiveFontSize,
  getEffectiveFont,
  getEffectiveVertical,
  getEffectiveColors,
  getEffectiveStrokeWidth,
  getEffectiveLeading,
  getEffectiveOpacity,
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
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({});
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

  // 現在の位置を取得（Asset vs Instance）
  const getCurrentPosition = () => {
    console.log(`getCurrentPosition called: mode=${mode}, activePreviewTab=${activePreviewTab}`);
    if (mode === 'instance' && editingInstance) {
      // インスタンス編集モードでは言語別設定を使用
      const currentLang = getCurrentLanguage();
      return getEffectivePosition(editingAsset, editingInstance, currentLang);
    } else {
      // アセット編集モード: タブに応じて位置を取得
      if (activePreviewTab === 'common') {
        // 共通設定タブ: default_settings から位置を取得
        const x = editingAsset.default_settings?.override_pos_x ?? 100;
        const y = editingAsset.default_settings?.override_pos_y ?? 100;
        console.log(`getCurrentPosition: using common settings for position: x=${x}, y=${y}`);
        console.log('getCurrentPosition: editingAsset:', editingAsset);
        return { x, y };
      } else if (activePreviewTab && project?.metadata.supportedLanguages?.includes(activePreviewTab)) {
        // 言語タブ: その言語のオーバーライド設定から位置を取得
        const x = editingAsset.default_language_override?.[activePreviewTab]?.override_pos_x ?? 
                 editingAsset.default_settings?.override_pos_x ?? 100;
        const y = editingAsset.default_language_override?.[activePreviewTab]?.override_pos_y ?? 
                 editingAsset.default_settings?.override_pos_y ?? 100;
        return { x, y };
      } else {
        // フォールバック: 現在の言語設定を使用
        const currentLang = getCurrentLanguage();
        return getEffectivePosition(editingAsset, editingInstance, currentLang);
      }
    }
  };

  const currentPos = getCurrentPosition();

  // 位置更新関数
  const updatePosition = (x: number, y: number) => {
    console.log(`updatePosition called: mode=${mode}, activePreviewTab=${activePreviewTab}, x=${x}, y=${y}`);
    if (mode === 'instance' && editingInstance) {
      // インスタンス編集では常に現在の言語設定を同時に更新
      handleInstanceLanguageSettingChanges(getCurrentLanguage(), {
        override_pos_x: x,
        override_pos_y: y
      });
    } else {
      // アセット編集モード: タブに応じて更新先を決定
      if (activePreviewTab === 'common') {
        // 共通設定タブ: default_settings を同時に更新
        console.log(`updatePosition: updating common settings for position: x=${x}, y=${y}`);
        handleCommonSettingsChange({
          override_pos_x: x,
          override_pos_y: y
        });
      } else if (activePreviewTab && project?.metadata.supportedLanguages?.includes(activePreviewTab)) {
        // 言語タブ: その言語の default_language_override を同時に更新
        handleLanguageOverrideChanges(activePreviewTab, {
          override_pos_x: x,
          override_pos_y: y
        });
      } else {
        // フォールバック: 現在の言語設定を更新（旧方式との互換性）
        const currentLang = getCurrentLanguage();
        handleLanguageSettingChange(currentLang, 'override_pos_x', x);
        handleLanguageSettingChange(currentLang, 'override_pos_y', y);
      }
    }
  };

  // 現在の値を取得する（新仕様のentitiesヘルパー関数を使用）
  const getCurrentValue = (assetField: string): any => {
    const currentLang = getCurrentLanguage();
    let phase: TextAssetInstancePhase;
    if (activePreviewTab === 'common') {
      phase = TextAssetInstancePhase.COMMON;
    } else if (activePreviewTab && project?.metadata.supportedLanguages?.includes(activePreviewTab)) {
      phase = TextAssetInstancePhase.LANG;
    } else {
      phase = TextAssetInstancePhase.INSTANCE_LANG;
    }

    // フィールド名に応じて適切なヘルパー関数を使用
    switch (assetField) {
      case 'font_size':
        return getEffectiveFontSize(editingAsset, editingInstance, currentLang, phase);
      case 'font':
        return getEffectiveFont(editingAsset, editingInstance, currentLang, phase);
      case 'vertical':
        return getEffectiveVertical(editingAsset, editingInstance, currentLang, phase);
      case 'leading':
        return getEffectiveLeading(editingAsset, editingInstance, currentLang, phase);
      case 'opacity':
        return getEffectiveOpacity(editingAsset, editingInstance, currentLang, phase);
      case 'stroke_width':
        return getEffectiveStrokeWidth(editingAsset, editingInstance, currentLang, phase);
      case 'fill_color':
        return getEffectiveColors(editingAsset, editingInstance, currentLang, phase).fill;
      case 'stroke_color':
        return getEffectiveColors(editingAsset, editingInstance, currentLang, phase).stroke;
      default:
        // フォールバック: 直接アセットの値を返す（デフォルト値で代替）
        return editingAsset[assetField as keyof TextAsset] || '';
    }
  };

  // テキスト内容を取得する（新しいmultilingual_textシステム対応）
  const getCurrentTextValue = (): string => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      return getEffectiveTextValue(editingAsset, editingInstance, currentLang);
    }
    return editingAsset.default_text || '';
  };

  // テキスト内容を更新する（新しいmultilingual_textシステム対応）
  const updateTextValue = (newText: string) => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      setEditingInstance({
        ...editingInstance,
        multilingual_text: {
          ...editingInstance.multilingual_text,
          [currentLang]: newText
        }
      });
    } else {
      handleInputChange('default_text', newText);
    }
  };

  const getTextFrameSize = () => {
    const pos = currentPos;
    const scale = previewDimensions.scale;
    const fontSize = getCurrentValue('font_size')
    const charWidth = fontSize * previewDimensions.scale
    const lines = getCurrentTextValue().split('\n');
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
  };

  const handleInputChange = (field: keyof TextAsset | keyof LanguageSettings, value: any) => {
    if (mode === 'asset') {
      const textAssetFields: (keyof TextAsset)[] = ['name', 'default_text', 'default_context'];
      
      if (textAssetFields.includes(field as keyof TextAsset)) {
        // TextAssetの直接フィールド
        setEditingAsset({
          ...editingAsset,
          [field]: value
        });
      } else {
        // LanguageSettingsのフィールド - タブに応じて処理
        const languageField = field as keyof LanguageSettings;
        if (activePreviewTab === 'common') {
          handleCommonSettingChange(languageField, value);
        } else if (activePreviewTab && project?.metadata.supportedLanguages?.includes(activePreviewTab)) {
          handleLanguageOverrideChange(activePreviewTab, languageField, value);
        }
      }
    }
  };


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
      console.log(`handleCommonSettingChange: settingKey=${settingKey}, value=${value}`);
      updatedSettings[settingKey] = value;
    }
    // 更新されたアセットデータを作成
    const updatedAsset = {
      ...editingAsset,
      default_settings: updatedSettings
    };
    console.log(`handleCommonSettingChange: updated asset data:`, updatedAsset);
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
        console.log(`handleCommonSettingsChange: ${key}=${value}`);
        (updatedSettings as any)[settingKey] = value;
      }
    });
    
    // 更新されたアセットデータを作成
    const updatedAsset = {
      ...editingAsset,
      default_settings: updatedSettings
    };
    
    console.log(`handleCommonSettingsChange: updated asset data:`, updatedAsset);
    setEditingAsset(updatedAsset);
  };;
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
        console.log(`handleLanguageOverrideChanges: ${language}.${key}=${value}`);
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
    
    console.log(`handleLanguageOverrideChanges: updated asset data:`, updatedAsset);
    setEditingAsset(updatedAsset);
  };;

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
        console.log(`handleInstanceLanguageSettingChanges: ${language}.${key}=${value}`);
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
    
    console.log(`handleInstanceLanguageSettingChanges: updated instance data:`, updatedInstance);
    setEditingInstance(updatedInstance);
  };;

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

  // 数値入力バリデーション関数（ImageEditModalから流用）
  const validateNumericInput = (value: string, allowNegative: boolean = true): string => {
    // 数字、-、.のみを許可
    let sanitized = value.replace(/[^0-9\-\.]/g, '');
    
    // 負数を許可しない場合は-を除去
    if (!allowNegative) {
      sanitized = sanitized.replace(/-/g, '');
    }
    
    // 最初の文字以外の-を除去
    if (sanitized.indexOf('-') > 0) {
      sanitized = sanitized.replace(/-/g, '');
      if (allowNegative && value.startsWith('-')) {
        sanitized = '-' + sanitized;
      }
    }
    
    // 複数の.を除去（最初の.のみ残す）
    const dotIndex = sanitized.indexOf('.');
    if (dotIndex !== -1) {
      const beforeDot = sanitized.substring(0, dotIndex);
      const afterDot = sanitized.substring(dotIndex + 1).replace(/\./g, '');
      sanitized = beforeDot + '.' + afterDot;
    }
    
    return sanitized;
  };

  // 数値バリデーション（フォーカスアウト時）
  const validateAndSetValue = (value: string, minValue: number = -9999, fallbackValue: number): number => {
    if (value === '' || value === '-' || value === '.') {
      return fallbackValue;
    }
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < minValue) {
      return fallbackValue;
    }
    
    // 小数点以下2位まで丸める
    return Math.round(numValue * 100) / 100;
  };

  const formatNumberForDisplay = (value: number): string => {
    return value.toFixed(2).replace(/\.?0+$/, '');
  };

  const handleNumberInputChange = (field: keyof TextAsset, value: string) => {
    // 空文字列や無効な値の場合のみ0にする（マイナス値は許可）
    const numValue = value === '' ? 0 : (parseFloat(value) || 0);
    handleInputChange(field, numValue);
  };

  // 縦書き関連のヘルパー関数
  const getCurrentVertical = () => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      const langSettings = editingInstance.override_language_settings?.[currentLang];
      return getEffectiveVertical(editingAsset, editingInstance, currentLang);
    }
    return getEffectiveVertical(editingAsset, null, getCurrentLanguage());
  };

  const updateVertical = (value: boolean) => {
    if (mode === 'asset') {
      // Vertical is now handled through language settings
      const currentLang = getCurrentLanguage();
      handleLanguageSettingChange(currentLang, 'override_vertical', value);
    } else {
      handleInstanceLanguageSettingChange(getCurrentLanguage(), 'override_vertical', value);
    }
  };

  // フォント関連のヘルパー関数
  const getCurrentFont = () => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      const langSettings = editingInstance.override_language_settings?.[currentLang];
      return getEffectiveFont(editingAsset, editingInstance, currentLang);
    }
    return getEffectiveFont(editingAsset, null, getCurrentLanguage());
  };

  const updateFont = (value: string) => {
    if (mode === 'asset') {
      // Font is now handled through language settings
      const currentLang = getCurrentLanguage();
      handleLanguageSettingChange(currentLang, 'override_font', value);
    } else {
      handleInstanceLanguageSettingChange(getCurrentLanguage(), 'override_font', value);
    }
  };

  // z_index専用のサニタイズ関数（整数のみ）
  const sanitizeZIndexInput = (value: string): string => {
    // 数字と-のみを許可（小数点は除外）
    let sanitized = value.replace(/[^0-9\-]/g, '');
    
    // 最初の文字以外の-を除去
    if (sanitized.indexOf('-') > 0) {
      sanitized = sanitized.replace(/-/g, '');
      if (value.startsWith('-')) {
        sanitized = '-' + sanitized;
      }
    }
    
    return sanitized;
  };

  // z_indexバリデーション関数
  const validateZIndexValue = (value: string): {
    isValid: boolean;
    error?: string;
    warning?: string;
  } => {
    const numValue = parseInt(value.trim());
    
    // 空文字列または無効な数値
    if (isNaN(numValue)) {
      return {
        isValid: false,
        error: 'z-indexは数値である必要があります'
      };
    }
    
    // 範囲チェック（-9999 〜 9999）
    if (numValue < -9999 || numValue > 9999) {
      return {
        isValid: false,
        error: 'z-indexは-9999から9999の範囲で入力してください'
      };
    }
    
    // 競合チェック（同じページ内での重複）
    let warning: string | undefined;
    if (page) {
      const project = useProjectStore.getState().project;
      if (project) {
        const conflicts: string[] = [];
        
        Object.values(page.asset_instances).forEach((instance) => {
          // 自分自身は除外
          if (instance.id === assetInstance?.id) return;
          
          const instanceAsset = project.assets[instance.asset_id];
          if (!instanceAsset) return;
          
          const effectiveZIndex = getEffectiveZIndex(instanceAsset, instance, getCurrentLanguage());
          
          if (effectiveZIndex === numValue) {
            const assetName = instanceAsset.name || instanceAsset.id;
            conflicts.push(assetName);
          }
        });
        
        if (conflicts.length > 0) {
          warning = `同じz-indexを持つアセット: ${conflicts.join(', ')}`;
        }
      }
    }
    
    return {
      isValid: true,
      warning
    };
  };

  // ドラッグ操作のハンドラー
  const handleTextMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({ x: currentPos.x, y: currentPos.y });
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
        
        updatePosition(newX, newY);
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
            {mode === 'instance' && (
              <div className="current-language-indicator">
                編集中の言語: {getCurrentLanguage() === 'ja' ? '日本語' : 
                              getCurrentLanguage() === 'en' ? 'English' : 
                              getCurrentLanguage() === 'zh' ? '中文' : 
                              getCurrentLanguage() === 'ko' ? '한국어' : 
                              getCurrentLanguage().toUpperCase()}
              </div>
            )}
            
            <div className="preview-container" style={{
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

                {/* ドラッグ可能領域（テキスト位置に配置） */}
                <div
                  className="text-drag-area"
                  style={{
                    position: 'absolute',
                    left: `${getTextFrameSize().left}px`,
                    top: `${getTextFrameSize().top}px`,
                    width: `${getTextFrameSize().width}px`,
                    height: `${getTextFrameSize().height}px`,
                    // TODO: ドラッグ中にこの要素がアニメーションがひどく遅れるのが気になるので一旦透明にしておく
                    backgroundColor: isDragging ? 'rgba(0, 123, 255, 0.2)' : 'transparent',
                    border: isDragging ? '2px dashed #007bff' : '1px dashed rgba(0, 123, 255, 0.3)',
                    cursor: 'move',
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
            <div className="form-section">
              <h4>基本設定</h4>
              {mode === 'asset' && (
                <div className="form-row">
                  <label>
                    名前:
                    <input
                      type="text"
                      value={editingAsset.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </label>
                </div>
              )}
              <div className="form-row">
                <label>
                  {mode === 'asset' ? 'デフォルトテキスト:' : 'テキスト内容:'}
                  <textarea
                    value={getCurrentTextValue()}
                    onChange={(e) => updateTextValue(e.target.value)}
                    rows={3}
                  />
                  {mode === 'instance' && (
                    <div className="language-info">
                      現在の言語: {getCurrentLanguage()}
                    </div>
                  )}
                </label>
              </div>
              {mode === 'asset' && (
                <div className="form-row">
                  <label>
                    文脈・用途:
                    <input
                      type="text"
                      value={editingAsset.default_context || ''}
                      onChange={(e) => handleInputChange('default_context', e.target.value)}
                      placeholder="例: キャラクターAの叫び声、ナレーション等"
                    />
                    <div className="form-help">
                      このテキストの用途や文脈を記録しておけます
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* フォント設定 */}
            <div className="form-section">
              <h4>フォント設定</h4>
              <div className="form-row">
                <label>
                  フォント:
                  {fontsLoading ? (
                    <select disabled>
                      <option>フォント読み込み中...</option>
                    </select>
                  ) : (
                    <select
                      value={getCurrentFont()}
                      onChange={(e) => updateFont(e.target.value)}
                    >
                      {availableFonts.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.name} {font.type === 'custom' ? '(カスタム)' : ''}
                        </option>
                      ))}
                      {/* 現在のフォントが一覧にない場合の対応 */}
                      {getCurrentFont() && !availableFonts.find(f => f.id === getCurrentFont()) && (
                        <option value={getCurrentFont()}>
                          {getCurrentFont()} (未定義)
                        </option>
                      )}
                    </select>
                  )}
                  {mode === 'instance' && (
                    <span className="override-indicator">
                      {editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_font !== undefined ? ' (オーバーライド中)' : ''}
                    </span>
                  )}
                </label>
              </div>
              <div className="form-row">
                <label>
                  フォントサイズ:
                  <NumericInput
                    value={getCurrentValue('font_size')}
                    onChange={(value) => {
                      if (mode === 'asset') {
                        // Font size is now handled through language settings
                        const currentLang = getCurrentLanguage();
                        handleLanguageSettingChange(currentLang, 'override_font_size', value);
                      } else {
                        handleInstanceLanguageSettingChange(getCurrentLanguage(), 'override_font_size', value);
                      }
                    }}
                    min={0.01}
                    decimals={2}
                    className="small"
                  />
                </label>
              </div>
              {mode === 'asset' && (
                <div className="form-row">
                  <label>
                    行間:
                    <input
                      type="text"
                      value={tempInputValues.leading ?? formatNumberForDisplay(getEffectiveLeading(editingAsset, null, getCurrentLanguage()))}
                      onChange={(e) => {
                        const sanitized = validateNumericInput(e.target.value, true);
                        setTempInputValues(prev => ({ ...prev, leading: sanitized }));
                      }}
                      onBlur={(e) => {
                        const validated = validateAndSetValue(e.target.value, -9999, getEffectiveLeading(editingAsset, null, getCurrentLanguage()));
                        // Leading is now handled through language settings
                        const currentLang = getCurrentLanguage();
                        handleLanguageSettingChange(currentLang, 'override_leading', validated);
                        setTempInputValues(prev => {
                          const newTemp = { ...prev };
                          delete newTemp.leading;
                          return newTemp;
                        });
                      }}
                    />
                  </label>
                </div>
              )}
              <div className="form-row">
                <label>
                  <input
                    type="checkbox"
                    checked={getCurrentVertical()}
                    onChange={(e) => updateVertical(e.target.checked)}
                  />
                  縦書き
                  {mode === 'instance' && (
                    <span className="override-indicator">
                      {editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_vertical !== undefined ? ' (オーバーライド中)' : ''}
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* 色設定 - AssetInstanceモードでは表示しない */}
            {mode === 'asset' && (
              <div className="form-section">
                <h4>色設定</h4>
                <div className="form-row">
                  <label>
                    塗りの色:
                    <input
                      type="color"
                      value={getTextAssetDefaultSettings(editingAsset, 'override_fill_color')}
                      onChange={(e) => handleInputChange('override_fill_color', e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    縁取りの色:
                    <input
                      type="color"
                      value={getTextAssetDefaultSettings(editingAsset, 'override_stroke_color')}
                      onChange={(e) => handleInputChange('override_stroke_color', e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    縁取り幅:
                    <NumericInput
                      value={getEffectiveStrokeWidth(editingAsset, null, getCurrentLanguage())}
                      onChange={(value) => {
                        // For new spec, stroke width is managed through language settings
                        const currentLang = getCurrentLanguage();
                        handleLanguageSettingChange(currentLang, 'override_stroke_width', value);
                      }}
                      min={0}
                      max={1}
                      decimals={2}
                      className="small"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 現在言語の設定（インスタンス編集時のみ） */}
            {mode === 'instance' && (
              <div className="form-section">
                <h4>現在言語の設定オーバーライド</h4>
                <div className="form-help">
                  現在の言語（{getCurrentLanguage() === 'ja' ? '日本語' : 
                              getCurrentLanguage() === 'en' ? 'English' : 
                              getCurrentLanguage() === 'zh' ? '中文' : 
                              getCurrentLanguage() === 'ko' ? '한국어' : 
                              getCurrentLanguage().toUpperCase()}）の設定をページ固有にオーバーライドします
                </div>
                
                {/* 文脈設定 */}
                <div className="form-row">
                  <label>
                    文脈・用途:
                    <input
                      type="text"
                      value={editingInstance?.override_context || ''}
                      onChange={(e) => setEditingInstance(prev => prev ? {
                        ...prev,
                        override_context: e.target.value || undefined
                      } : null)}
                      placeholder="例: キャラクターAの叫び声、ナレーション等"
                    />
                    <div className="form-help">
                      このインスタンスでの用途や文脈を記録しておけます
                    </div>
                  </label>
                </div>

                {/* フォント設定 */}
                <div className="form-row">
                  <label>
                    フォント:
                    <select
                      value={editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_font || ''}
                      onChange={(e) => handleInstanceLanguageSettingChange(
                        getCurrentLanguage(), 
                        'override_font', 
                        e.target.value || undefined
                      )}
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
                <div className="form-row">
                  <label>
                    フォントサイズ:
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_font_size || ''}
                      onChange={(e) => handleInstanceLanguageSettingChange(
                        getCurrentLanguage(), 
                        'override_font_size', 
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )}
                      placeholder="アセット設定使用"
                    />
                  </label>
                </div>

                {/* 位置設定 */}
                <div className="form-row form-row-double">
                  <label>
                    X座標:
                    <input
                      type="number"
                      step="0.1"
                      value={editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_pos_x || ''}
                      onChange={(e) => handleInstanceLanguageSettingChange(
                        getCurrentLanguage(), 
                        'override_pos_x', 
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )}
                      placeholder="アセット設定使用"
                    />
                  </label>
                  <label>
                    Y座標:
                    <input
                      type="number"
                      step="0.1"
                      value={editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_pos_y || ''}
                      onChange={(e) => handleInstanceLanguageSettingChange(
                        getCurrentLanguage(), 
                        'override_pos_y', 
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )}
                      placeholder="アセット設定使用"
                    />
                  </label>
                </div>

                {/* 縦書き設定 */}
                <div className="form-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_vertical !== undefined ? 
                               editingInstance.override_language_settings[getCurrentLanguage()].override_vertical : false}
                      onChange={(e) => handleInstanceLanguageSettingChange(
                        getCurrentLanguage(), 
                        'override_vertical', 
                        e.target.checked ? true : undefined
                      )}
                    />
                    縦書き設定をオーバーライド
                  </label>
                </div>

                {/* 不透明度設定 */}
                <div className="form-row">
                  <label>
                    不透明度:
                    <div className="opacity-controls">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_opacity || 1}
                        onChange={(e) => handleInstanceLanguageSettingChange(
                          getCurrentLanguage(), 
                          'override_opacity', 
                          parseFloat(e.target.value)
                        )}
                        className="opacity-slider"
                      />
                      <span className="opacity-value">
                        {(editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_opacity || 1).toFixed(2)}
                      </span>
                    </div>
                  </label>
                </div>

                {/* z-index設定 */}
                <div className="form-row">
                  <label>
                    レイヤー順序 (z-index):
                    <input
                      type="number"
                      value={editingInstance?.override_language_settings?.[getCurrentLanguage()]?.override_z_index || ''}
                      onChange={(e) => handleInstanceLanguageSettingChange(
                        getCurrentLanguage(), 
                        'override_z_index', 
                        e.target.value ? parseInt(e.target.value) : undefined
                      )}
                      placeholder="アセット設定使用"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 位置・透明度設定（アセット編集時のみ） */}
            {mode === 'asset' && (
              <div className="form-section">
                <h4>位置・透明度設定</h4>
                <div className="form-row form-row-double">
                  <label>
                    X座標:
                    <NumericInput
                      value={getEffectivePosition(
                        editingAsset,
                        null,
                        getCurrentLanguage(),
                        TextAssetInstancePhase.COMMON).x}
                      onChange={(value) => {
                        handleCommonSettingChange('override_pos_x', value);
                      }}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                  </label>
                  <label>
                    Y座標:
                    <NumericInput
                      value={getEffectivePosition(
                        editingAsset,
                        null,
                        getCurrentLanguage(),
                        TextAssetInstancePhase.COMMON).y}
                      onChange={(value) => {
                        handleCommonSettingChange('override_pos_y', value);
                      }}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    不透明度:
                    <div className="opacity-controls">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={getTextAssetDefaultSettings(editingAsset, 'override_opacity') || 1.0}
                        onChange={(e) => {
                          const numValue = parseFloat(e.target.value);
                          handleInputChange('override_opacity', numValue);
                        }}
                        className="opacity-slider"
                      />
                      <span className="opacity-value">
                        {(getTextAssetDefaultSettings(editingAsset, 'override_opacity') || 1.0).toFixed(2)}
                      </span>
                    </div>
                  </label>
                </div>

                {/* z_index設定 */}
                <div className="form-row">
                  <label>
                    レイヤー順序 (z-index):
                    <div className="z-index-controls">
                      <input
                        type="text"
                        value={tempInputValues.z_index ?? (getTextAssetDefaultSettings(editingAsset, 'override_z_index') || 0).toString()}
                        onChange={(e) => {
                          const sanitized = sanitizeZIndexInput(e.target.value);
                          setTempInputValues(prev => ({ ...prev, z_index: sanitized }));
                          // バリデーション実行
                          const validation = validateZIndexValue(sanitized);
                          setZIndexValidation(validation);
                        }}
                        onBlur={(e) => {
                          const validated = validateAndSetValue(e.target.value, -9999, getTextAssetDefaultSettings(editingAsset, 'override_z_index') || 0);
                          handleInputChange('override_z_index', validated);
                          setTempInputValues(prev => {
                            const newTemp = { ...prev };
                            delete newTemp.z_index;
                            return newTemp;
                          });
                        }}
                        className={`z-index-input ${
                          !zIndexValidation.isValid ? 'error' : 
                          zIndexValidation.warning ? 'warning' : ''
                        }`}
                        placeholder="0"
                      />
                      <span className={`z-index-info ${
                        !zIndexValidation.isValid ? 'error' : 
                        zIndexValidation.warning ? 'warning' : ''
                      }`}>
                        {!zIndexValidation.isValid && zIndexValidation.error ? 
                          zIndexValidation.error :
                          zIndexValidation.warning ? 
                          zIndexValidation.warning :
                          '(レイヤー順序: 数値が小さいほど背面)'
                        }
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* 言語別設定（アセット編集時のみ） */}
            {mode === 'asset' && project && project.metadata.supportedLanguages && project.metadata.supportedLanguages.length > 1 && (
              <div className="form-section">
                <h4>言語別デフォルト設定</h4>
                <div className="form-help">
                  特定の言語でのみ異なる設定にしたい場合に使用します
                </div>
                {project.metadata.supportedLanguages.map((lang) => (
                  <div key={lang} className="language-settings-group">
                    <h5>{lang === 'ja' ? '日本語' : lang === 'en' ? 'English' : lang}</h5>
                    <div className="language-settings">
                      <div className="form-row form-row-compact">
                        <label>
                          フォント:
                          <select
                            value={mode === 'asset' 
                              ? (editingAsset.default_language_override?.[lang]?.override_font || '')
                              : (editingInstance?.override_language_settings?.[lang]?.override_font || '')
                            }
                            onChange={(e) => {
                              if (mode === 'asset') {
                                handleLanguageSettingChange(lang, 'override_font', e.target.value || undefined);
                              } else {
                                handleInstanceLanguageSettingChange(lang, 'override_font', e.target.value || undefined);
                              }
                            }}
                          >
                            <option value="">{mode === 'asset' ? 'デフォルトフォントを使用' : 'アセット設定を使用'}</option>
                            {availableFonts.map((font) => (
                              <option key={font.id} value={font.id}>
                                {font.name} {font.type === 'custom' ? '(カスタム)' : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="form-row form-row-compact">
                        <label>
                          フォントサイズ:
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={mode === 'asset'
                              ? (editingAsset.default_language_override?.[lang]?.override_font_size || '')
                              : (editingInstance?.override_language_settings?.[lang]?.override_font_size || '')
                            }
                            onChange={(e) => {
                              if (mode === 'asset') {
                                handleLanguageSettingChange(lang, 'override_font_size', e.target.value ? parseFloat(e.target.value) : undefined);
                              } else {
                                handleInstanceLanguageSettingChange(lang, 'override_font_size', e.target.value ? parseFloat(e.target.value) : undefined);
                              }
                            }}
                            placeholder={mode === 'asset' ? 'デフォルト使用' : 'アセット設定使用'}
                          />
                        </label>
                      </div>
                      <div className="form-row form-row-compact">
                        <label>
                          位置調整:
                          <div className="position-inputs">
                            <input
                              type="number"
                              step="0.1"
                              value={mode === 'asset'
                                ? (editingAsset.default_language_override?.[lang]?.override_pos_x || '')
                                : (editingInstance?.override_language_settings?.[lang]?.override_pos_x || '')
                              }
                              onChange={(e) => {
                                if (mode === 'asset') {
                                  handleLanguageSettingChange(lang, 'override_pos_x', e.target.value ? parseFloat(e.target.value) : undefined);
                                } else {
                                  handleInstanceLanguageSettingChange(lang, 'override_pos_x', e.target.value ? parseFloat(e.target.value) : undefined);
                                }
                              }}
                              placeholder="X座標"
                            />
                            <input
                              type="number"
                              step="0.1"
                              value={mode === 'asset'
                                ? (editingAsset.default_language_override?.[lang]?.override_pos_y || '')
                                : (editingInstance?.override_language_settings?.[lang]?.override_pos_y || '')
                              }
                              onChange={(e) => {
                                if (mode === 'asset') {
                                  handleLanguageSettingChange(lang, 'override_pos_y', e.target.value ? parseFloat(e.target.value) : undefined);
                                } else {
                                  handleInstanceLanguageSettingChange(lang, 'override_pos_y', e.target.value ? parseFloat(e.target.value) : undefined);
                                }
                              }}
                              placeholder="Y座標"
                            />
                          </div>
                        </label>
                      </div>
                      <div className="form-row form-row-compact">
                        <label>
                          <input
                            type="checkbox"
                            checked={mode === 'asset'
                              ? (editingAsset.default_language_override?.[lang]?.override_vertical !== undefined ? editingAsset.default_language_override[lang].override_vertical : false)
                              : (editingInstance?.override_language_settings?.[lang]?.override_vertical !== undefined ? editingInstance.override_language_settings[lang].override_vertical : false)
                            }
                            onChange={(e) => {
                              if (mode === 'asset') {
                                handleLanguageSettingChange(lang, 'override_vertical', e.target.checked ? true : undefined);
                              } else {
                                handleInstanceLanguageSettingChange(lang, 'override_vertical', e.target.checked ? true : undefined);
                              }
                            }}
                          />
                          縦書き設定をオーバーライド
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
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
