import React, { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { generateTextPreviewSVG } from '../../../utils/svgGeneratorCommon';
import { NumericInput } from '../common/NumericInput';
import type { TextAsset, TextAssetInstance, Page, FontInfo, LanguageOverrides } from '../../../types/entities';
import { getEffectiveZIndex, validateTextAssetData, validateTextAssetInstanceData } from '../../../types/entities';
import './TextEditModal.css';
import {current} from 'immer';

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
    }
  }, [isOpen, asset, assetInstance]);

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

  // 現在の位置を取得（Asset vs Instance）
  const getCurrentPosition = () => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      const langOverride = editingInstance.multilingual_overrides?.[currentLang];
      return {
        x: langOverride?.override_pos_x ?? editingAsset.default_pos_x,
        y: langOverride?.override_pos_y ?? editingAsset.default_pos_y,
      };
    }
    return {
      x: editingAsset.default_pos_x,
      y: editingAsset.default_pos_y,
    };
  };

  const currentPos = getCurrentPosition();

  // 位置更新関数
  const updatePosition = (x: number, y: number) => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      const currentOverrides = editingInstance.multilingual_overrides || {};
      const langOverride = currentOverrides[currentLang] || {};
      
      setEditingInstance({
        ...editingInstance,
        multilingual_overrides: {
          ...currentOverrides,
          [currentLang]: {
            ...langOverride,
            override_pos_x: x,
            override_pos_y: y,
          },
        },
      });
    } else {
      setEditingAsset({
        ...editingAsset,
        default_pos_x: x,
        default_pos_y: y,
      });
    }
  };

  // 現在の値を取得する（instanceモードでは多言語overrideを確認）
  const getCurrentValue = (assetField: keyof TextAsset, langOverrideKey?: keyof LanguageOverrides): any => {
    if (mode === 'instance' && editingInstance && langOverrideKey) {
      const currentLang = getCurrentLanguage();
      const langOverride = editingInstance.multilingual_overrides?.[currentLang];
      if (langOverride && langOverride[langOverrideKey] !== undefined) {
        return langOverride[langOverrideKey];
      }
    }
    return editingAsset[assetField];
  };

  const getTextFrameSize = () => {
    const pos = currentPos;
    const scale = previewDimensions.scale;
    const fontSize = getCurrentValue('font_size', 'override_font_size')
    const charWidth = fontSize * previewDimensions.scale
    const lines = getCurrentValue('default_text', 'override_text').split('\n');
    const vertical = getCurrentValue('vertical', 'override_vertical');
    const leading = getCurrentValue('leading', 'override_leading') || 1.2; // デフォルトの行間
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

  const handleInputChange = (field: keyof TextAsset, value: any) => {
    if (mode === 'asset') {
      setEditingAsset({
        ...editingAsset,
        [field]: value,
      });
    }
  };

  const handleInstanceChange = (langOverrideKey: keyof LanguageOverrides, value: any) => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      const currentOverrides = editingInstance.multilingual_overrides || {};
      const langOverride = currentOverrides[currentLang] || {};
      
      setEditingInstance({
        ...editingInstance,
        multilingual_overrides: {
          ...currentOverrides,
          [currentLang]: {
            ...langOverride,
            [langOverrideKey]: value,
          },
        },
      });
    }
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

  // z_index関連のヘルパー関数
  const getCurrentZIndex = () => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      const langOverride = editingInstance.multilingual_overrides?.[currentLang];
      return langOverride?.override_z_index ?? editingAsset.default_z_index;
    }
    return editingAsset.default_z_index;
  };

  const updateZIndex = (value: number) => {
    if (mode === 'asset') {
      handleInputChange('default_z_index', value);
    } else {
      handleInstanceChange('override_z_index', value);
    }
  };

  // 縦書き関連のヘルパー関数
  const getCurrentVertical = () => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      const langOverride = editingInstance.multilingual_overrides?.[currentLang];
      return langOverride?.override_vertical ?? editingAsset.vertical;
    }
    return editingAsset.vertical;
  };

  const updateVertical = (value: boolean) => {
    if (mode === 'asset') {
      handleInputChange('vertical', value);
    } else {
      handleInstanceChange('override_vertical', value);
    }
  };

  // フォント関連のヘルパー関数
  const getCurrentFont = () => {
    if (mode === 'instance' && editingInstance) {
      const currentLang = getCurrentLanguage();
      const langOverride = editingInstance.multilingual_overrides?.[currentLang];
      return langOverride?.override_font ?? editingAsset.font;
    }
    return editingAsset.font;
  };

  const updateFont = (value: string) => {
    if (mode === 'asset') {
      handleInputChange('font', value);
    } else {
      handleInstanceChange('override_font', value);
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
      return generateTextPreviewSVG(
        editingAsset,
        mode === 'instance' ? editingInstance : undefined,
        getCurrentLanguage(),
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
  }, [editingAsset, editingInstance, mode, canvasConfig, getCurrentLanguage()]);

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
                    value={getCurrentValue('default_text', 'override_text')}
                    onChange={(e) => {
                      if (mode === 'asset') {
                        handleInputChange('default_text', e.target.value);
                      } else {
                        handleInstanceChange('override_text', e.target.value);
                      }
                    }}
                    rows={3}
                  />
                </label>
              </div>
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
                      {editingInstance?.multilingual_overrides?.[getCurrentLanguage()]?.override_font !== undefined ? ' (オーバーライド中)' : ''}
                    </span>
                  )}
                </label>
              </div>
              <div className="form-row">
                <label>
                  フォントサイズ:
                  <NumericInput
                    value={getCurrentValue('font_size', 'override_font_size')}
                    onChange={(value) => {
                      if (mode === 'asset') {
                        handleInputChange('font_size', value);
                      } else {
                        handleInstanceChange('override_font_size', value);
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
                      value={tempInputValues.leading ?? formatNumberForDisplay(editingAsset.leading)}
                      onChange={(e) => {
                        const sanitized = validateNumericInput(e.target.value, true);
                        setTempInputValues(prev => ({ ...prev, leading: sanitized }));
                      }}
                      onBlur={(e) => {
                        const validated = validateAndSetValue(e.target.value, -9999, editingAsset.leading);
                        handleInputChange('leading', validated);
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
                      {editingInstance?.multilingual_overrides?.[getCurrentLanguage()]?.override_vertical !== undefined ? ' (オーバーライド中)' : ''}
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
                      value={editingAsset.fill_color}
                      onChange={(e) => handleInputChange('fill_color', e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    縁取りの色:
                    <input
                      type="color"
                      value={editingAsset.stroke_color}
                      onChange={(e) => handleInputChange('stroke_color', e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    縁取り幅:
                    <NumericInput
                      value={editingAsset.stroke_width}
                      onChange={(value) => handleNumberInputChange('stroke_width', value.toString())}
                      min={0}
                      max={1}
                      decimals={2}
                      className="small"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 位置・透明度設定 */}
            <div className="form-section">
              <h4>位置・透明度設定</h4>
              <div className="form-row form-row-double">
                <label>
                  X座標:
                  <NumericInput
                    value={getCurrentValue('default_pos_x', 'override_pos_x')}
                    onChange={(value) => {
                      if (mode === 'asset') {
                        handleInputChange('default_pos_x', value);
                      } else {
                        handleInstanceChange('override_pos_x', value);
                      }
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
                    value={getCurrentValue('default_pos_y', 'override_pos_y')}
                    onChange={(value) => {
                      if (mode === 'asset') {
                        handleInputChange('default_pos_y', value);
                      } else {
                        handleInstanceChange('override_pos_y', value);
                      }
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
                      value={getCurrentValue('opacity', 'override_opacity')}
                      onChange={(e) => {
                        const numValue = parseFloat(e.target.value);
                        if (mode === 'asset') {
                          handleInputChange('opacity', numValue);
                        } else {
                          handleInstanceChange('override_opacity', numValue);
                        }
                      }}
                      className="opacity-slider"
                    />
                    <span className="opacity-value">
                      {getCurrentValue('opacity', 'override_opacity').toFixed(2)}
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
                      value={tempInputValues.z_index ?? getCurrentZIndex().toString()}
                      onChange={(e) => {
                        const sanitized = sanitizeZIndexInput(e.target.value);
                        setTempInputValues(prev => ({ ...prev, z_index: sanitized }));
                        
                        // バリデーション実行
                        const validation = validateZIndexValue(sanitized);
                        setZIndexValidation(validation);
                      }}
                      onBlur={(e) => {
                        const validated = validateAndSetValue(e.target.value, -9999, getCurrentZIndex());
                        updateZIndex(validated);
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
                        mode === 'instance' 
                          ? (() => {
                            const currentLang = getCurrentLanguage();
                            const langOverride = editingInstance?.multilingual_overrides?.[currentLang];
                            return langOverride?.override_z_index !== undefined
                              ? `オーバーライド中 (デフォルト: ${editingAsset.default_z_index})`
                              : `デフォルト値を使用中`;
                          })()
                          : '(レイヤー順序: 数値が小さいほど背面)'
                      }
                    </span>
                  </div>
                </label>
              </div>
            </div>
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
