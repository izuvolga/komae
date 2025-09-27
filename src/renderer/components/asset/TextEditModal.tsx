import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Close as CloseIcon, Help as HelpIcon, TextRotateVertical, TextRotationNone } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import { generateTextPreviewSVG, generateMultilingualTextElement} from '../../../utils/svgGeneratorCommon';
import { updateLanguageSettings } from '../../../utils/languageUtils';
import { NumericInput } from '../common/NumericInput';
import { ZIndexInput } from '../common/ZIndexInput';
import { OpacityInput } from '../common/OpacityInput';
import { RotateInput } from '../common/RotateInput';
import { ColorPicker } from '../common/ColorPicker';
import { useTextFieldKeyboardShortcuts } from '../../hooks/useTextFieldKeyboardShortcuts';
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
import { convertMouseDelta } from '../../utils/editModalUtils';
import { calculateSnap, SnapGuide } from '../../utils/snapUtils';
import { EditModalSvgCanvas } from '../common/EditModalSvgCanvas';

// 編集モードの種類
type EditMode = 'asset' | 'instance';
const PREVIEW_DOM_ID = 'text-preview-area';

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
  const [dragStartValues, setDragStartValues] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 }); // ドラッグ開始時のoffset値
  const [resizeStartScales, setResizeStartScales] = useState({ scaleX: 1, scaleY: 1 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [currentSize, setCurrentSize] = useState({width: 600, height: 600 });
  const [actualPos, setActualPos] = useState({x: 0, y: 0 }); // 実際のDOM要素上での位置から逆算した座標
  const [offset, setOffset] = useState({x: 0, y: 0}); // rotate時の位置補正用オフセット
  const canvasConfig = useProjectStore((state) => state.project?.canvas);
  const project = useProjectStore((state) => state.project);
  const getCurrentLanguage = useProjectStore((state) => state.getCurrentLanguage);
  const { handleTextFieldKeyEvent } = useTextFieldKeyboardShortcuts();

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

  if (!isOpen || !project || !editingAsset) return null;

  // 動的スケール計算用のref
  const previewSvgRef = useRef<SVGSVGElement>(null);
  const [dynamicScale, setDynamicScale] = useState(1);
  const [scaleCalculated, setScaleCalculated] = useState(false);

  // スナップ機能関連の状態
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const SNAP_THRESHOLD = 10; // 10px以内でスナップ

  // 動的余白計算（キャンバス長辺の10%）
  const margin = Math.max(project.canvas.width, project.canvas.height) * 0.1;

  // ドラッグ開始時にスケールを計算する関数
  const calculateDynamicScale = () => {

    if (scaleCalculated || !previewSvgRef.current || !project) return;

    const svgElement = previewSvgRef.current;
    const svgRect = svgElement.getBoundingClientRect();
    const canvasWidth = project.canvas.width;

    // SVGの実際の描画エリア幅を取得
    const svgDisplayWidth = svgRect.width;

    // viewBoxで設定されている総幅は canvasWidth + margin*2 なので、
    // キャンバス部分の幅は (canvasWidth / (canvasWidth + margin*2)) * svgDisplayWidth
    const canvasDisplayWidth = (canvasWidth / (canvasWidth + margin * 2)) * svgDisplayWidth;

    // スケール計算: 表示されているキャンバス幅 / 実際のキャンバス幅
    const calculatedScale = canvasDisplayWidth / canvasWidth;

    console.log(`TextEditModal scale calculation:
      - Canvas width: ${canvasWidth}px
      - SVG display width: ${svgDisplayWidth}px
      - Canvas display width: ${canvasDisplayWidth}px
      - Calculated scale: ${calculatedScale}`);

    setDynamicScale(calculatedScale);
    setScaleCalculated(true);
  };


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

  // rotate値に基づいてoffsetを再計算する関数
  const recalculateOffset = (): void => {
    const currentRotate = getCurrentValue('rotate') || 0;
    const vertical = getCurrentValue('vertical') || 0;

    // rotate値が1-359度の場合のみoffsetを適用
    if (currentRotate >= 1 && currentRotate <= 359) {
      if (vertical) {
        const offsetX = actualPos.x - currentPos.x + currentSize.width / 2;
        const offsetY = actualPos.y - currentPos.y;
        setOffset({ x: offsetX, y: offsetY });
      } else {
        const offsetX = actualPos.x - currentPos.x;
        const offsetY = actualPos.y - currentPos.y;
        setOffset({ x: offsetX, y: offsetY });
      }
    } else {
      // rotate値が0度または360度の場合はoffsetなし
      setOffset({ x: 0, y: 0 });
    }
  };

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

  // currentSizeを更新するuseEffect
  useEffect(() => {
    // リサイズ中は無限ループを防ぐためスキップ
    if (isResizing) {
      return;
    }

    // 実際に描画されたDOM要素からサイズを取得を試行
    try {
      const textElement = document.getElementById(PREVIEW_DOM_ID);
      if (textElement) {
        // HTMLElementとして画面上のサイズを取得
        const rect = textElement.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          // DOM 要素から取得したサイズなので、SVG上の座標系のサイズに変換する
          const width = rect.width / dynamicScale;
          const height = rect.height / dynamicScale;
          const virtualX = rect.left;
          const virtualY = rect.top;
          let virtualCanvasX = 0;
          let virtualCanvasY = 0;
          if (previewSvgRef.current) {
            const svgElement = previewSvgRef.current;
            const virtualCanvas = svgElement.getBoundingClientRect();
            virtualCanvasX = virtualCanvas.left;
            virtualCanvasY = virtualCanvas.top;
          }
          const x = (virtualX - virtualCanvasX) / dynamicScale;
          const y = (virtualY - virtualCanvasY) / dynamicScale;
          // UI上のサイズも更新
          setCurrentSize({ width, height });
          setActualPos({ x, y });
        }
      }
    } catch (error) {
      // DOM取得に失敗した場合は警告を出力
      console.warn('Failed to get text element bounding box:', error);
    }
  }, [isResizing, dynamicScale, getCurrentValue('scale_x'), getCurrentValue('scale_y'), activePreviewTab]);

  // currentSizeを更新するuseEffect (高頻度に変化する可能性のある値に対応)
  useEffect(() => {
    // setTimeout で囲むことで、nextTick相当でDOM更新後に実行し、UIのカクつきを防ぐ
    setTimeout(() => {
      try {
        const textElement = document.getElementById(PREVIEW_DOM_ID);
        if (textElement) {
          // HTMLElementとして画面上のサイズを取得
          const rect = textElement.getBoundingClientRect();
          if (rect && rect.width > 0 && rect.height > 0) {
            // DOM 要素から取得したサイズなので、SVG上の座標系のサイズに変換する
            const width = rect.width / dynamicScale;
            const height = rect.height / dynamicScale;
            const virtualX = rect.left;
            const virtualY = rect.top;
            let virtualCanvasX = 0;
            let virtualCanvasY = 0;
            if (previewSvgRef.current) {
              const svgElement = previewSvgRef.current;
              const virtualCanvas = svgElement.getBoundingClientRect();
              virtualCanvasX = virtualCanvas.left;
              virtualCanvasY = virtualCanvas.top;
            }
            const x = (virtualX - virtualCanvasX) / dynamicScale;
            const y = (virtualY - virtualCanvasY) / dynamicScale;
            // UI上のサイズも更新
            setCurrentSize({ width, height });
            setActualPos({ x, y });
          }
        }
      } catch (error) {
        console.warn('Failed to recalculate size after rotate:', error);
      }
    }, 0);
  }, [getCurrentValue('text'), getCurrentValue('vertical'), getCurrentValue('leading'), getCurrentValue('font_size'), getCurrentValue('rotate'), getCurrentValue('char_rotate')]);

  // dynamicScale更新専用のuseEffect
  useEffect(() => {
    if (previewSvgRef.current) {
      calculateDynamicScale();
    }
  }, [previewSvgRef.current, project]);

  // rotate値変更時に手動でoffsetを再計算（useEffectの無限ループを防ぐため）
  const handleRotateChange = (value: number): void => {
    setCurrentValue({rotate: value});
    recalculateOffset();
  };

  const handleCharRotateChange = (value: number): void => {
    setCurrentValue({char_rotate: value});
    // char_rotate変更時は通常offset再計算は不要だが、必要に応じて実装
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

  // リサイズハンドラー
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    calculateDynamicScale(); // リサイズ開始時にスケール計算

    // DOM要素の実サイズを取得
    const textElement = document.getElementById(PREVIEW_DOM_ID);
    let realSize = { width: currentSize.width, height: currentSize.height };
    if (textElement) {
      const rect = textElement.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0 && !isNaN(rect.width) && !isNaN(rect.height)) {
        // DOM要素から取得したサイズをSVG座標系に変換
        const convertedWidth = rect.width / dynamicScale;
        const convertedHeight = rect.height / dynamicScale;
        if (!isNaN(convertedWidth) && !isNaN(convertedHeight) && convertedWidth > 0 && convertedHeight > 0) {
          realSize = {
            width: convertedWidth,
            height: convertedHeight
          };
        }
      }
    }

    // サイズが無効な場合のフォールバック：最小有効サイズを使用
    if (isNaN(realSize.width) || realSize.width <= 0) {
      realSize.width = 100; // 最小幅
    }
    if (isNaN(realSize.height) || realSize.height <= 0) {
      realSize.height = 50; // 最小高さ
    }

    // 現在のスケール値を保存
    const currentScaleX = getCurrentValue('scale_x') || 1.0;
    const currentScaleY = getCurrentValue('scale_y') || 1.0;

    setIsResizing(true);
    setResizeHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({
      x: currentPos.x,
      y: currentPos.y,
      width: currentSize.width,
      height: currentSize.height
    });
    // 新しい状態を保存
    setResizeStartScales({
      scaleX: currentScaleX,
      scaleY: currentScaleY
    });
    setResizeStartSize(realSize);
  };

  // グローバルマウスイベントの処理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y, dynamicScale);

        // // ドラッグ中のoffset調整：デルタ値を減算して相殺
        // const adjustedOffset = {
        //   x: dragStartOffset.x - deltaX,
        //   y: dragStartOffset.y - deltaY
        // };
        // setOffset(adjustedOffset);

        // 提案された新しい位置を計算
        const proposedX = dragStartValues.x + deltaX;
        const proposedY = dragStartValues.y + deltaY;

        // 縦書きテキストの場合は座標系を調整してスナップ計算
        const isVerticalText = getCurrentValue('vertical');
        const snapX = isVerticalText ? proposedX - currentSize.width : proposedX;

        // スナップ計算を実行
        const snapResult = calculateSnap(
          snapX,
          proposedY,
          currentSize.width,
          currentSize.height,
          project.canvas.width,
          project.canvas.height,
          SNAP_THRESHOLD,
        );

        // 縦書きテキストの場合は結果を元の座標系に戻す
        const finalX = isVerticalText ? snapResult.snappedX + currentSize.width : snapResult.snappedX;

        // スナップした位置を適用
        setCurrentPosition(finalX, snapResult.snappedY);

        // ガイドラインを更新
        setSnapGuides(snapResult.snapGuides);
      } else if (isResizing && resizeHandle) {
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y, dynamicScale);

        // ハンドル種類に応じて新しいサイズを計算
        let newWidth = resizeStartSize.width;
        let newHeight = resizeStartSize.height;

        switch (resizeHandle) {
          case 'top-left':
          case 'nw': // 左上
            newWidth = resizeStartSize.width - deltaX;
            newHeight = resizeStartSize.height - deltaY;
            break;
          case 'top':
          case 'n': // 上
            newHeight = resizeStartSize.height - deltaY;
            break;
          case 'top-right':
          case 'ne': // 右上
            newWidth = resizeStartSize.width + deltaX;
            newHeight = resizeStartSize.height - deltaY;
            break;
          case 'right':
          case 'e': // 右
            newWidth = resizeStartSize.width + deltaX;
            break;
          case 'bottom-right':
          case 'se': // 右下
            newWidth = resizeStartSize.width + deltaX;
            newHeight = resizeStartSize.height + deltaY;
            break;
          case 'bottom':
          case 's': // 下
            newHeight = resizeStartSize.height + deltaY;
            break;
          case 'bottom-left':
          case 'sw': // 左下
            newWidth = resizeStartSize.width - deltaX;
            newHeight = resizeStartSize.height + deltaY;
            break;
          case 'left':
          case 'w': // 左
            newWidth = resizeStartSize.width - deltaX;
            break;
        }

        // 最小サイズの制限
        newWidth = Math.max(10, newWidth);
        newHeight = Math.max(10, newHeight);

        // 基準サイズとの比率を計算（NaN防止）
        const scaleRatioX = (resizeStartSize.width > 0 && !isNaN(resizeStartSize.width))
          ? newWidth / resizeStartSize.width
          : 1;
        const scaleRatioY = (resizeStartSize.height > 0 && !isNaN(resizeStartSize.height))
          ? newHeight / resizeStartSize.height
          : 1;

        // 新しいスケール値を計算（NaN防止）
        const newScaleX = (!isNaN(resizeStartScales.scaleX) && !isNaN(scaleRatioX))
          ? resizeStartScales.scaleX * scaleRatioX
          : resizeStartScales.scaleX || 1.0;
        const newScaleY = (!isNaN(resizeStartScales.scaleY) && !isNaN(scaleRatioY))
          ? resizeStartScales.scaleY * scaleRatioY
          : resizeStartScales.scaleY || 1.0;

        // 最小・最大スケール値の制限
        const clampedScaleX = Math.max(0.01, Math.min(10, newScaleX));
        const clampedScaleY = Math.max(0.01, Math.min(10, newScaleY));

        // 位置調整：ハンドルがマウスカーソルに追従するように
        const isVerticalText = getCurrentValue('vertical');
        const currentPosX = dragStartValues.x;
        const currentPosY = dragStartValues.y;

        let newPosX = currentPosX;
        let newPosY = currentPosY;

        if (!isVerticalText) {
          // 横書きテキスト（左上基準）
          switch (resizeHandle) {
            case 'top-left':
            case 'nw':
              // X方向：スケール増加で左に移動、Y方向：スケール増加で上に移動
              newPosX = currentPosX - (resizeStartSize.width * (scaleRatioX - 1));
              newPosY = currentPosY - (resizeStartSize.height * (scaleRatioY - 1));
              break;
            case 'top':
            case 'n':
              // Y方向のみ：スケール増加で上に移動
              newPosY = currentPosY - (resizeStartSize.height * (scaleRatioY - 1));
              break;
            case 'top-right':
            case 'ne':
              // Y方向のみ：スケール増加で上に移動
              newPosY = currentPosY - (resizeStartSize.height * (scaleRatioY - 1));
              break;
            case 'left':
            case 'w':
              // X方向のみ：スケール増加で左に移動
              newPosX = currentPosX - (resizeStartSize.width * (scaleRatioX - 1));
              break;
            case 'bottom-left':
            case 'sw':
              // X方向のみ：スケール増加で左に移動
              newPosX = currentPosX - (resizeStartSize.width * (scaleRatioX - 1));
              break;
            // bottom-right, right, bottom: 位置調整不要
          }
        } else {
          // 縦書きテキスト（右上基準）
          switch (resizeHandle) {
            case 'top-left':
            case 'nw':
              // Y方向のみ：スケール増加で上に移動
              newPosY = currentPosY - (resizeStartSize.height * (scaleRatioY - 1));
              break;
            case 'top':
            case 'n':
              // Y方向のみ：スケール増加で上に移動
              newPosY = currentPosY - (resizeStartSize.height * (scaleRatioY - 1));
              break;
            case 'top-right':
            case 'ne':
              // X方向：スケール増加で右に移動、Y方向：スケール増加で上に移動
              newPosX = currentPosX + (resizeStartSize.width * (scaleRatioX - 1));
              newPosY = currentPosY - (resizeStartSize.height * (scaleRatioY - 1));
              break;
            case 'right':
            case 'e':
              // X方向のみ：スケール増加で右に移動
              newPosX = currentPosX + (resizeStartSize.width * (scaleRatioX - 1));
              break;
            case 'bottom-right':
            case 'se':
              // X方向のみ：スケール増加で右に移動
              newPosX = currentPosX + (resizeStartSize.width * (scaleRatioX - 1));
              break;
            // bottom-left, left, bottom: 位置調整不要
          }
        }

        // 値を更新
        setCurrentValue({
          pos_x: newPosX,
          pos_y: newPosY,
          scale_x: clampedScaleX,
          scale_y: clampedScaleY,
        });

        // リサイズハンドル追従のため、currentSizeもリアルタイム更新
        const updatedSize = {
          width: newWidth,
          height: newHeight
        };
        setCurrentSize(updatedSize);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      setSnapGuides([]);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStartPos, dragStartValues, resizeHandle, resizeStartScales, resizeStartSize, canvasConfig]);

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

      // TextSVG要素を生成（プレビュー用は単一言語）
      const availableLanguages = [previewLanguage];
      const textElement = generateMultilingualTextElement(
        previewAsset,
        editingInstance || { id: 'temp-preview', asset_id: asset.id },
        availableLanguages,
        previewLanguage,
        phase,
        PREVIEW_DOM_ID,
        {x: 0, y: 0} // 座標移動は EditModalSvgCanvas 側で行うためここでは不要
      );
      return textElement;
    } catch (error) {
      console.error('Failed to generate preview SVG:', error);
      return '<svg><text>プレビューエラー</text></svg>';
    }
  }, [editingAsset, editingInstance, mode, canvasConfig, getCurrentLanguage, activePreviewTab, project]);

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
              <Box
              id="text-edit-preview-container"
              sx={{
                position: 'relative',
                width: 600,
                height: 600,
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                backgroundColor: '#f8f9fa'
              }}>
                {/* SVG描画領域（共通コンポーネント） */}
                <EditModalSvgCanvas
                  ref={previewSvgRef}
                  project={project}
                  currentPos={currentPos}
                  currentSize={currentSize}
                  currentOpacity={getCurrentValue('opacity')}
                  svgContent={previewSVG}
                  originalWidth={currentSize.width}
                  originalHeight={currentSize.height}
                  isVerticalText={getCurrentValue('vertical')}
                  onDragStart={(e) => {
                    console.log('Drag start:', e.clientX, e.clientY);
                    e.preventDefault();
                    calculateDynamicScale();
                    setIsDragging(true);
                    setDragStartPos({ x: e.clientX, y: e.clientY });
                    setDragStartValues({
                      x: currentPos.x,
                      y: currentPos.y,
                      width: currentSize.width,
                      height: currentSize.height
                    });
                    setDragStartOffset({ x: offset.x, y: offset.y }); // ドラッグ開始時のoffsetを保存
                  }}
                  onResizeStart={handleResizeMouseDown}
                  snapGuides={snapGuides}
                  offset={offset}
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
                    onKeyDown={handleTextFieldKeyEvent}
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
                    onKeyDown={handleTextFieldKeyEvent}
                    multiline
                    maxRows={30}
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
                    onKeyDown={handleTextFieldKeyEvent}
                    placeholder="例: キャラクターAの叫び声、ナレーション等"
                    fullWidth
                    multiline
                    minRows={1}
                    maxRows={3}
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
                      onKeyDown={handleTextFieldKeyEvent}
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
                      onKeyDown={handleTextFieldKeyEvent}
                      decimals={2}
                      className="small"
                    />
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>文字の向き</Typography>
                  <ToggleButtonGroup
                    value={getCurrentValue('vertical') ? 'vertical' : 'horizontal'}
                    exclusive
                    onChange={(e, newValue) => {
                      if (newValue !== null) {
                        setCurrentValue({ vertical: newValue === 'vertical' });
                      }
                    }}
                    size="small"
                  >
                    <ToggleButton value="horizontal" aria-label="横書き">
                      <TextRotationNone />
                    </ToggleButton>
                    <ToggleButton value="vertical" aria-label="縦書き">
                      <TextRotateVertical />
                    </ToggleButton>
                  </ToggleButtonGroup>
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
                    onKeyDown={handleTextFieldKeyEvent}
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
                      onKeyDown={handleTextFieldKeyEvent}
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
                      onKeyDown={handleTextFieldKeyEvent}
                      min={-9999}
                      max={9999}
                      decimals={2}
                      className="small"
                    />
                  </Box>
                </Box>

                {/* スケール設定 */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Xスケール</Typography>
                    <NumericInput
                      value={getCurrentValue('scale_x')}
                      onChange={(value) => setCurrentValue({scale_x: value})}
                      onKeyDown={handleTextFieldKeyEvent}
                      min={0.01}
                      max={10}
                      decimals={2}
                      className="small"
                      placeholder="1.0"
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Yスケール</Typography>
                    <NumericInput
                      value={getCurrentValue('scale_y')}
                      onChange={(value) => setCurrentValue({scale_y: value})}
                      onKeyDown={handleTextFieldKeyEvent}
                      min={0.01}
                      max={10}
                      decimals={2}
                      className="small"
                      placeholder="1.0"
                    />
                  </Box>
                </Box>

                {/* 回転設定 */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <RotateInput
                      value={getCurrentValue('rotate')}
                      onChange={handleRotateChange}
                      label="回転角度 (度)"
                      min={0}
                      max={360}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <RotateInput
                      value={getCurrentValue('char_rotate')}
                      onChange={handleCharRotateChange}
                      label="文字回転角度 (度)"
                      min={0}
                      max={360}
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
                              // チェックを入れたら該当言語の設定を削除（ダミーテキストを使用）
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
                      label="ダミーテキストを利用"
                      sx={{ margin: 0, fontSize: '14px', whiteSpace: 'nowrap' }}
                    />
                  </Box>
                  <TextField
                    value={getEffectiveTextValue(editingAsset, editingInstance, getCurrentLanguage(), TextAssetInstancePhase.AUTO)}
                    onChange={(e) => setCurrentValue({text: e.target.value})}
                    onKeyDown={handleTextFieldKeyEvent}
                    multiline
                    maxRows={30}
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
                      ? 'ダミーテキストが使用されます（チェックを外すとこのページ専用のテキストを設定できます）'
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
                    onKeyDown={handleTextFieldKeyEvent}
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
                      onKeyDown={handleTextFieldKeyEvent}
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
                        onKeyDown={handleTextFieldKeyEvent}
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
                        onKeyDown={handleTextFieldKeyEvent}
                        min={-9999}
                        max={9999}
                        decimals={2}
                        className="small"
                        placeholder="アセット設定使用"
                        disabled={!isLanguageOverrideEnabled()}
                      />
                    </Box>
                  </Box>

                  {/* スケール設定 */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Xスケール</Typography>
                      <NumericInput
                        value={getCurrentValue('scale_x')}
                        onChange={(value) => setCurrentValue({scale_x: value})}
                        onKeyDown={handleTextFieldKeyEvent}
                        min={0.01}
                        max={10}
                        decimals={2}
                        className="small"
                        placeholder="アセット設定使用"
                        disabled={!isLanguageOverrideEnabled()}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Yスケール</Typography>
                      <NumericInput
                        value={getCurrentValue('scale_y')}
                        onChange={(value) => setCurrentValue({scale_y: value})}
                        onKeyDown={handleTextFieldKeyEvent}
                        min={0.01}
                        max={10}
                        decimals={2}
                        className="small"
                        placeholder="アセット設定使用"
                        disabled={!isLanguageOverrideEnabled()}
                      />
                    </Box>
                  </Box>

                  {/* 回転設定 */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <RotateInput
                        value={getCurrentValue('rotate')}
                        onChange={handleRotateChange}
                        label="回転角度 (度)"
                        min={0}
                        max={360}
                        disabled={!isLanguageOverrideEnabled()}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <RotateInput
                        value={getCurrentValue('char_rotate')}
                        onChange={handleCharRotateChange}
                        label="文字回転角度 (度)"
                        min={0}
                        max={360}
                        disabled={!isLanguageOverrideEnabled()}
                      />
                    </Box>
                  </Box>

                  {/* 縦書き設定 */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>文字の向き</Typography>
                    <ToggleButtonGroup
                      value={getCurrentValue('vertical') ? 'vertical' : 'horizontal'}
                      exclusive
                      onChange={(e, newValue) => {
                        if (newValue !== null) {
                          setCurrentValue({ vertical: newValue === 'vertical' });
                        }
                      }}
                      disabled={!isLanguageOverrideEnabled()}
                      size="small"
                    >
                      <ToggleButton value="horizontal" aria-label="横書き">
                        <TextRotationNone />
                      </ToggleButton>
                      <ToggleButton value="vertical" aria-label="縦書き">
                        <TextRotateVertical />
                      </ToggleButton>
                    </ToggleButtonGroup>
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

                {/* 言語別のダミーテキスト */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, margin: 0 }}>
                    言語別テキスト（{activePreviewTab === 'ja' ? '日本語' : activePreviewTab === 'en' ? 'English' : activePreviewTab}）
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
                        label="ダミーテキスト"
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
                        onKeyDown={handleTextFieldKeyEvent}
                        disabled={!isTextOverrideEnabled}
                        multiline
                        maxRows={30}
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
                        onKeyDown={handleTextFieldKeyEvent}
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
                          onKeyDown={handleTextFieldKeyEvent}
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
                          onKeyDown={handleTextFieldKeyEvent}
                          min={-9999}
                          max={9999}
                          decimals={2}
                          className="small"
                          placeholder="アセット設定使用"
                          disabled={!isLanguageDefaultOverrideEnabled()}
                        />
                      </Box>
                    </Box>

                    {/* スケール設定 */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Xスケール</Typography>
                        <NumericInput
                          value={getCurrentValue('scale_x')}
                          onChange={(value) => setCurrentValue({scale_x: value})}
                          onKeyDown={handleTextFieldKeyEvent}
                          min={0.01}
                          max={10}
                          decimals={2}
                          className="small"
                          placeholder="アセット設定使用"
                          disabled={!isLanguageDefaultOverrideEnabled()}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Yスケール</Typography>
                        <NumericInput
                          value={getCurrentValue('scale_y')}
                          onChange={(value) => setCurrentValue({scale_y: value})}
                          onKeyDown={handleTextFieldKeyEvent}
                          min={0.01}
                          max={10}
                          decimals={2}
                          className="small"
                          placeholder="アセット設定使用"
                          disabled={!isLanguageDefaultOverrideEnabled()}
                        />
                      </Box>
                    </Box>

                    {/* 回転設定 */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <RotateInput
                          value={getCurrentValue('rotate')}
                          onChange={handleRotateChange}
                          label="回転角度 (度)"
                          min={0}
                          max={360}
                          disabled={!isLanguageDefaultOverrideEnabled()}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <RotateInput
                          value={getCurrentValue('char_rotate')}
                          onChange={handleCharRotateChange}
                          label="文字回転角度 (度)"
                          min={0}
                          max={360}
                          disabled={!isLanguageDefaultOverrideEnabled()}
                        />
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>文字の向き</Typography>
                      <ToggleButtonGroup
                        value={getCurrentValue('vertical') ? 'vertical' : 'horizontal'}
                        exclusive
                        onChange={(e, newValue) => {
                          if (newValue !== null) {
                            setCurrentValue({ vertical: newValue === 'vertical' });
                          }
                        }}
                        disabled={!isLanguageDefaultOverrideEnabled()}
                        size="small"
                      >
                        <ToggleButton value="horizontal" aria-label="横書き">
                          <TextRotationNone />
                        </ToggleButton>
                        <ToggleButton value="vertical" aria-label="縦書き">
                          <TextRotateVertical />
                        </ToggleButton>
                      </ToggleButtonGroup>
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
