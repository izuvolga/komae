import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import { useEditModalSubmit } from '../../hooks/useEditModalSubmit';
import { NumericInput } from '../common/NumericInput';
import { ZIndexInput } from '../common/ZIndexInput';
import { OpacityInput } from '../common/OpacityInput';
import { ReadOnlyInput } from '../common/ReadOnlyInput';
import type {
  DynamicVectorAsset,
  DynamicVectorAssetInstance,
  Page,
  ProjectData,
  ValueAssetInstance
} from '../../../types/entities';
import {
  getEffectiveZIndex,
  validateDynamicVectorAssetData,
  validateDynamicVectorAssetInstanceData
} from '../../../types/entities';
import {
  convertMouseDelta,
  constrainToCanvas,
  getCurrentPosition,
  getCurrentSize,
  getCurrentOpacity,
  getCurrentZIndex,
  wrapSVGWithParentContainer,
  validateZIndexNumber,
  ZIndexValidationResult,
  calculateResizeValues,
  ResizeCalculationParams
} from '../../utils/editModalUtils';
import { calculateSnap, SnapGuide } from '../../utils/snapUtils';
import { ResizeHandleOverlay } from '../common/ResizeHandleOverlay2';

export interface DynamicVectorEditModalProps {
  mode: 'asset' | 'instance';
  asset: DynamicVectorAsset;
  assetInstance?: DynamicVectorAssetInstance;
  page?: Page;
  isOpen: boolean;
  onClose: () => void;
  onSaveAsset?: (asset: DynamicVectorAsset) => void;
  onSaveInstance?: (instance: DynamicVectorAssetInstance) => void;
}

interface SVGExecutionResult {
  svg: string | null;
  error: string | null;
}

export const DynamicVectorEditModal: React.FC<DynamicVectorEditModalProps> = ({
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
  const project = useProjectStore((state) => state.project);

  // 編集中のデータ
  const [editedAsset, setEditedAsset] = useState<DynamicVectorAsset>(asset);
  const [editedInstance, setEditedInstance] = useState<DynamicVectorAssetInstance | null>(
    assetInstance || null
  );

  // SVG実行結果
  const [svgResult, setSvgResult] = useState<SVGExecutionResult>({ svg: null, error: null });
  const [isExecuting, setIsExecuting] = useState(false);

  // パラメータ値の状態管理
  const [parameterValues, setParameterValues] = useState<Record<string, number | string>>({});
  
  // ValueAsset参照の状態管理
  const [parameterBindings, setParameterBindings] = useState<Record<string, string>>({});

  // Submit処理フック（アセット準備処理付き）
  const { handleSubmit } = useEditModalSubmit({
    mode,
    editedAsset,
    editedInstance,
    onSaveAsset,
    onSaveInstance,
    onClose,
    validateAsset: validateDynamicVectorAssetData,
    validateInstance: validateDynamicVectorAssetInstanceData,
    prepareAssetForSave: (asset) => ({
      ...asset,
      parameters: { ...parameterValues },
      parameter_variable_bindings: Object.keys(parameterBindings).length > 0 ? parameterBindings : undefined,
    })
  });
  
  // CustomAssetの状態管理
  const [customAsset, setCustomAsset] = useState<any>(null);
  
  // ValueAssetの一覧
  const [availableValueAssets, setAvailableValueAssets] = useState<{
    string: Array<{ id: string; name: string; value: any }>;
    number: Array<{ id: string; name: string; value: any }>;
  }>({ string: [], number: [] });

  // バリデーション状態
  const [zIndexValidation, setZIndexValidation] = useState<ZIndexValidationResult>({ isValid: true });

  // マウス操作関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartValues, setDragStartValues] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  const [shiftAspectRatio, setShiftAspectRatio] = useState<number | null>(null);

  // 実行タイマー用のref
  const executionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 動的余白計算とスナップ機能（VectorEditModalと同様）
  const margin = project ? Math.max(project.canvas.width, project.canvas.height) * 0.1 : 100;
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [dynamicScale, setDynamicScale] = useState<number>(1);
  const previewSvgRef = useRef<SVGSVGElement>(null);

  // data-theme属性の設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // モーダルが開いた時にスケールを動的に計算（VectorEditModalと同様）
  useEffect(() => {
    console.log('DynamicVectorEditModal opened, calculating scale...', { isOpen, project , previewSvgRef: previewSvgRef.current});
    if (isOpen && project && previewSvgRef.current) {
      const calculateScale = () => {
        const svgElement = previewSvgRef.current;
        if (!svgElement) return;

        const svgRect = svgElement.getBoundingClientRect();
        const canvasWidth = project.canvas.width;

        // SVGの実際の描画エリア幅を取得
        const svgDisplayWidth = svgRect.width;

        // viewBoxで設定されている総幅は canvasWidth + margin*2 なので、
        // キャンバス部分の幅は (canvasWidth / (canvasWidth + margin*2)) * svgDisplayWidth
        const canvasDisplayWidth = (canvasWidth / (canvasWidth + margin * 2)) * svgDisplayWidth;

        // スケール計算: 表示されているキャンバス幅 / 実際のキャンバス幅
        const calculatedScale = canvasDisplayWidth / canvasWidth;

        console.log(`DynamicVectorEditModal scale calculation:
          - Canvas width: ${canvasWidth}px
          - SVG display width: ${svgDisplayWidth}px
          - Canvas display width: ${canvasDisplayWidth}px
          - Calculated scale: ${calculatedScale}`);

        setDynamicScale(calculatedScale);
      };

      // モーダルが完全に開いてから計算するため、少し遅延
      const timer = setTimeout(calculateScale, 100);

      // リサイズ時の再計算
      const resizeObserver = new ResizeObserver(calculateScale);
      resizeObserver.observe(previewSvgRef.current);

      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
      };
    }
  }, [isOpen, project, margin]);

  // CustomAssetを取得するuseEffect
  useEffect(() => {
    const fetchCustomAsset = async () => {
      if (asset.custom_asset_id) {
        try {
          const customAssetData = await window.electronAPI.customAsset.getAsset(asset.custom_asset_id);
          setCustomAsset(customAssetData);
        } catch (error) {
          console.error('Failed to fetch custom asset:', error);
        }
      }
    };

    fetchCustomAsset();
  }, [asset.custom_asset_id]);

  // ValueAsset一覧を取得・更新する関数
  const updateAvailableValueAssets = useCallback(() => {
    if (!project) {
      setAvailableValueAssets({ string: [], number: [] });
      return;
    }

    // Asset編集モードの場合、pageがなくても進行できるように修正
    const instanceMemo = new Map<string, ValueAssetInstance>();
    if (mode === 'instance') {
      if (page) {
        Object.values(page.asset_instances).forEach(instance => {
          if (instance.asset_id) {
            instanceMemo.set(instance.asset_id, instance);
          }
        });
      } else {
        setAvailableValueAssets({ string: [], number: [] });
        return;
      }
    }

    const stringAssets: Array<{ id: string; name: string; value: any }> = [];
    const numberAssets: Array<{ id: string; name: string; value: any }> = [];

    Object.values(project.assets).forEach(assetItem => {
      if (assetItem.type === 'ValueAsset') {
        let currentValue: any;
        
        if (mode === 'instance' && page) {
          // Instance編集モード: ページの値を優先
          // const valueInstance = Object.values(page.asset_instances).find(instance => instance.asset_id === assetItem.id);
          const valueInstance = instanceMemo.get(assetItem.id);
          if (valueInstance && 'override_value' in valueInstance) {
            currentValue = valueInstance.override_value ?? assetItem.initial_value;
          } else {
            currentValue = assetItem.initial_value;
          }
        } else {
          // Asset編集モード: initial_valueを使用
          currentValue = assetItem.initial_value;
        }

        const valueAssetInfo = {
          id: assetItem.id,
          name: assetItem.name,
          value: currentValue
        };

        if (assetItem.value_type === 'string') {
          stringAssets.push(valueAssetInfo);
        } else if (assetItem.value_type === 'number') {
          numberAssets.push(valueAssetInfo);
        }
      }
    });

    setAvailableValueAssets({ string: stringAssets, number: numberAssets });
  }, [project, page, mode]);

  useEffect(() => {
    setEditedAsset(asset);
    setEditedInstance(assetInstance || null);

    // CustomAssetのパラメータ値を初期化
    const initialParams: Record<string, number | string> = {};
    if (asset.parameters) {
      Object.entries(asset.parameters).forEach(([key, value]) => {
        initialParams[key] = value;
      });
    }
    setParameterValues(initialParams);

    // parameter_variable_bindingsを初期化
    setParameterBindings(asset.parameter_variable_bindings || {});

    // ValueAsset一覧を更新
    updateAvailableValueAssets();
  }, [asset, assetInstance, updateAvailableValueAssets]);


  // マウス移動とマウスアップのハンドラー（グローバルイベント）
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!project) return;
      
      if (isDragging) {
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y, dynamicScale);
        const currentSizeForDrag = getCurrentSize(mode, editedAsset, editedInstance);

        const newX = dragStartValues.x + deltaX;
        const newY = dragStartValues.y + deltaY;

        // スナップ計算を適用
        const snapResult = calculateSnap(
          newX,
          newY,
          currentSizeForDrag.width,
          currentSizeForDrag.height,
          project.canvas.width,
          project.canvas.height,
          10 // 10pxスナップ閾値
        );

        // スナップガイドを更新
        setSnapGuides(snapResult.snapGuides);

        // キャンバス制約とスナップ結果を適用
        const constrained = constrainToCanvas(
          snapResult.snappedX,
          snapResult.snappedY,
          currentSizeForDrag.width,
          currentSizeForDrag.height,
          project.canvas.width,
          project.canvas.height
        );

        updatePosition(constrained.x, constrained.y);
      } else if (isResizing && resizeHandle) {
        const { deltaX, deltaY } = convertMouseDelta(e.clientX, e.clientY, dragStartPos.x, dragStartPos.y, dynamicScale);
        
        // チェックボックスが有効な場合は元画像の縦横比を適用
        let finalResizeResult;
        if (aspectRatioLocked && asset.original_width && asset.original_height) {
          // 元画像の縦横比を維持
          const originalAspectRatio = asset.original_width / asset.original_height;

          // まず通常のリサイズを計算
          const baseResult = calculateResizeValues({
            deltaX,
            deltaY,
            dragStartValues,
            resizeHandle,
            aspectRatioLocked: false,
            canvasWidth: project.canvas.width,
            canvasHeight: project.canvas.height,
            minSize: 10
          });

          // 元画像の縦横比に基づいてサイズを調整
          let newWidth = baseResult.width;
          let newHeight = baseResult.height;
          let newX = baseResult.x;
          let newY = baseResult.y;

          if (resizeHandle.includes('right') || resizeHandle.includes('left')) {
            // 幅ベースで元画像の縦横比を維持
            newHeight = newWidth / originalAspectRatio;
            if (resizeHandle.includes('top')) {
              newY = dragStartValues.y + dragStartValues.height - newHeight;
            }
          } else {
            // 高さベースで元画像の縦横比を維持
            newWidth = newHeight * originalAspectRatio;
            if (resizeHandle.includes('left')) {
              newX = dragStartValues.x + dragStartValues.width - newWidth;
            }
          }

          finalResizeResult = { x: newX, y: newY, width: newWidth, height: newHeight };
        } else if (isShiftPressed && shiftAspectRatio !== null) {
          // Shiftキーが押されている場合は記録された縦横比を維持
          const baseResult = calculateResizeValues({
            deltaX,
            deltaY,
            dragStartValues,
            resizeHandle,
            aspectRatioLocked: false,
            canvasWidth: project.canvas.width,
            canvasHeight: project.canvas.height,
            minSize: 10
          });

          // 記録された縦横比に基づいてサイズを調整
          let newWidth = baseResult.width;
          let newHeight = baseResult.height;
          let newX = baseResult.x;
          let newY = baseResult.y;

          if (resizeHandle.includes('right') || resizeHandle.includes('left')) {
            // 幅ベースで記録された縦横比を維持
            newHeight = newWidth / shiftAspectRatio;
            if (resizeHandle.includes('top')) {
              newY = dragStartValues.y + dragStartValues.height - newHeight;
            }
          } else {
            // 高さベースで記録された縦横比を維持
            newWidth = newHeight * shiftAspectRatio;
            if (resizeHandle.includes('left')) {
              newX = dragStartValues.x + dragStartValues.width - newWidth;
            }
          }

          finalResizeResult = { x: newX, y: newY, width: newWidth, height: newHeight };
        } else {
          // 自由リサイズ
          finalResizeResult = calculateResizeValues({
            deltaX,
            deltaY,
            dragStartValues,
            resizeHandle,
            aspectRatioLocked: false,
            canvasWidth: project.canvas.width,
            canvasHeight: project.canvas.height,
            minSize: 10
          });
        }

        const resizeResult = finalResizeResult;

        updatePosition(resizeResult.x, resizeResult.y);
        updateSize(resizeResult.width, resizeResult.height);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      setSnapGuides([]); // スナップガイドをクリア
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStartPos, dragStartValues, resizeHandle, isShiftPressed, aspectRatioLocked, shiftAspectRatio, asset.original_width, asset.original_height, project?.canvas, dynamicScale]);

  // パラメータが変更されたときにSVGを再実行（デバウンス処理付き）
  const scheduleExecution = useCallback(() => {
    if (executionTimerRef.current) {
      clearTimeout(executionTimerRef.current);
    }

    executionTimerRef.current = setTimeout(async () => {
      await executeScript();
    }, 300);
  }, [customAsset, parameterValues]);;

  useEffect(() => {
    if (customAsset && customAsset.script) {
      scheduleExecution();
    }
    return () => {
      if (executionTimerRef.current) {
        clearTimeout(executionTimerRef.current);
      }
    };
  }, [parameterValues, customAsset, scheduleExecution]);

  if (!isOpen || !project) return null;

  // スクリプト実行関数
  const executeScript = async () => {
    if (!customAsset) {
      setSvgResult({ svg: null, error: null });
      return;
    }

    setIsExecuting(true);

    try {
      // パラメータを構築（ValueAsset参照を考慮した値解決）
      const scriptParameters: Record<string, number | string> = {};
      
      // 各パラメータの値を解決
      Object.keys(parameterValues).forEach(paramName => {
        scriptParameters[paramName] = resolveParameterValue(paramName);
      });

      // ページ変数を追加
      if (editedAsset.use_page_variables && page && project) {
        const pageIndex = project.pages.findIndex(p => p.id === page.id);
        scriptParameters['page_current'] = pageIndex + 1;
        scriptParameters['page_total'] = project.pages.length;
      }

      // ValueAsset変数を追加
      if (editedAsset.use_value_variables && page && project) {
        Object.values(project.assets).forEach(assetItem => {
          if (assetItem.type === 'ValueAsset') {
            const valueInstance = page.asset_instances[assetItem.id];
            let value = assetItem.initial_value;

            if (valueInstance && 'override_value' in valueInstance) {
              value = valueInstance.override_value ?? value;
            }

            scriptParameters[assetItem.name] = value;
          }
        });
      }

      // MainプロセスのCustomAssetManager.generateCustomAssetSVGを呼び出し
      const result = await window.electronAPI.customAsset.generateSVG(
        customAsset.id,
        scriptParameters
      );

      if (typeof result === 'string') {
        setSvgResult({ svg: result, error: null });
      } else {
        setSvgResult({ svg: null, error: 'スクリプトは文字列を返す必要があります' });
      }
    } catch (error) {
      setSvgResult({
        svg: null,
        error: error instanceof Error ? error.message : 'スクリプトの実行でエラーが発生しました'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 現在の値を取得 - 共通ユーティリティを使用

  const currentPos = getCurrentPosition(mode, editedAsset, editedInstance);
  const currentSize = getCurrentSize(mode, editedAsset, editedInstance);
  const currentOpacity = getCurrentOpacity(mode, editedAsset, editedInstance);
  const currentZIndex = getCurrentZIndex(mode, editedAsset, editedInstance);

  // Shiftキーの状態を監視（currentSizeの定義後に配置）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
        // Shiftキーが押された時点の縦横比を記録
        if (currentSize.width > 0 && currentSize.height > 0) {
          setShiftAspectRatio(currentSize.width / currentSize.height);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        setShiftAspectRatio(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentSize]);

  // SVGを親SVG要素でラップして位置・サイズ・不透明度を制御 - 共通ユーティリティを使用

  // 値の更新
  const updatePosition = (x: number, y: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_pos_x: x,
        override_pos_y: y,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_pos_x: x,
        default_pos_y: y,
      }));
    }
  };

  const updateSize = (width: number, height: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_width: width,
        override_height: height,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_width: width,
        default_height: height,
      }));
    }
  };

  const updateOpacity = (opacity: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_opacity: opacity,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_opacity: opacity,
      }));
    }
  };

  const updateZIndex = (zIndex: number) => {
    if (mode === 'instance' && editedInstance) {
      setEditedInstance(prev => prev ? {
        ...prev,
        override_z_index: zIndex,
      } : null);
    } else {
      setEditedAsset(prev => ({
        ...prev,
        default_z_index: zIndex,
      }));
    }
    
    // Z-Index バリデーション
    if (project && page) {
      const validation = validateZIndexNumber(zIndex, project, page, editedInstance?.id);
      setZIndexValidation(validation);
    }
  };

  // サイズ変更ハンドラー（縦横比チェックボックス対応）
  const handleSizeChange = (field: 'width' | 'height', value: number) => {
    let newWidth = field === 'width' ? value : currentSize.width;
    let newHeight = field === 'height' ? value : currentSize.height;

    // 縦横比チェックボックスが有効な場合、元画像の縦横比を維持
    if (aspectRatioLocked && asset.original_width && asset.original_height) {
      const originalAspectRatio = asset.original_width / asset.original_height;
      if (field === 'width') {
        newHeight = Math.round(newWidth / originalAspectRatio);
      } else {
        newWidth = Math.round(newHeight * originalAspectRatio);
      }
    }

    updateSize(newWidth, newHeight);
  };

  // マウス操作のハンドラー
  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const canvasRect = document.querySelector('[data-dve-canvas-frame]')?.getBoundingClientRect();
    if (!canvasRect) return;
    
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({
      x: currentPos.x,
      y: currentPos.y,
      width: currentSize.width,
      height: currentSize.height
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartValues({
      x: currentPos.x,
      y: currentPos.y,
      width: currentSize.width,
      height: currentSize.height
    });
  };

  // ValueAsset参照による値解決
  const resolveParameterValue = useCallback((paramName: string): number | string => {
    // ValueAsset参照がある場合
    if (parameterBindings[paramName] && project) {
      const valueAssetId = parameterBindings[paramName];
      const valueAsset = project.assets[valueAssetId];
      
      if (valueAsset && valueAsset.type === 'ValueAsset') {
        if (mode === 'instance' && page) {
          // Instance編集: 現在ページでの値: asset_instancesの中から、asset_idがvalueAssetIdと一致するものを探す
          const valueInstance = Object.values(page.asset_instances).find(instance => instance.asset_id === valueAssetId);
          if (valueInstance && 'override_value' in valueInstance) {
            return valueInstance.override_value ?? valueAsset.initial_value;
          }
        }
        // Asset編集 or Instance編集でもoverride値がない場合: initial_value
        return valueAsset.initial_value;
      }
    }
    
    // 直接入力値を使用
    return parameterValues[paramName] ?? '';
  }, [parameterBindings, parameterValues, project, page, mode]);

  // パラメータ変更ハンドラー
  const handleParameterChange = (paramName: string, value: number | string) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value,
    }));
  };

  // ValueAsset参照の変更ハンドラー
  const handleParameterBindingChange = (paramName: string, valueAssetId: string) => {
    if (valueAssetId === '') {
      // 「直接入力」を選択
      setParameterBindings(prev => {
        const newBindings = { ...prev };
        delete newBindings[paramName];
        return newBindings;
      });
    } else {
      // ValueAssetを選択
      setParameterBindings(prev => ({
        ...prev,
        [paramName]: valueAssetId,
      }));
    }
  };

  const modalTitle = mode === 'instance'
    ? `DynamicVectorAssetInstance 編集: ${asset.name}`
    : `DynamicVectorAsset 編集: ${asset.name}`;

  // CustomAssetのパラメータ情報を取得（配列として処理）
  const assetParameters = asset.parameters || {};
  const hasParameters = Object.keys(assetParameters).length > 0;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        zIndex: 1300,
        '& .MuiDialog-paper': {
          width: '90vw',
          maxWidth: '1200px',
          height: '80vh',
          maxHeight: '800px',
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
          {/* 左側: プレビューパネル - 固定幅 */}
          <Box sx={{
            width: 600,
            minWidth: 600,
            p: 2,
            backgroundColor: 'action.hover',
            borderRight: '1px solid',
            borderRightColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* SVGベースの統合描画領域（VectorEditModalと同様） */}
            <svg
              ref={previewSvgRef}
              data-dve-canvas-frame
              width={`100%`} // SVG要素は親要素にフィットさせる
              height={`100%`} // SVG要素は親要素にフィットさせる
              viewBox={`0 0 ${project.canvas.width + margin * 2} ${project.canvas.height + margin * 2}`} // 動的余白を追加
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet" // アスペクト比を維持して中央に配置
            >
              {/* キャンバス */}
              <rect
                x={margin}
                y={margin}
                width={project.canvas.width}
                height={project.canvas.height}
                fill="#f5f5f5"
                rx="2"
                style={{
                  filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.2))',
                  position: 'relative'
                }}
              />

              {/* SVG描画結果 */}
              {svgResult.svg && (
                <g
                  dangerouslySetInnerHTML={{
                    __html: wrapSVGWithParentContainer(
                      svgResult.svg,
                      currentPos.x + margin,
                      currentPos.y + margin,
                      currentSize.width,
                      currentSize.height,
                      currentOpacity,
                      editedAsset.original_width,
                      editedAsset.original_height
                    )
                  }}
                />
              )}

              {/* スナップガイドライン */}
              {snapGuides.map((guide, index) => (
                <line
                  key={index}
                  x1={guide.type === 'vertical' ? guide.position + margin : guide.start + margin}
                  y1={guide.type === 'vertical' ? guide.start + margin : guide.position + margin}
                  x2={guide.type === 'vertical' ? guide.position + margin : guide.end + margin}
                  y2={guide.type === 'vertical' ? guide.end + margin : guide.position + margin}
                  stroke="#ff4444"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.8"
                />
              ))}

              {/* インタラクション用透明エリア */}
              <rect
                x={currentPos.x + margin}
                y={currentPos.y + margin}
                width={currentSize.width}
                height={currentSize.height}
                fill="transparent"
                stroke="#007acc"
                strokeWidth="1"
                strokeDasharray="5,5"
                style={{ cursor: 'move' }}
                onMouseDown={handleImageMouseDown}
              />

              {/* リサイズハンドル */}
              <ResizeHandleOverlay
                canvasWidth={project.canvas.width}
                canvasHeight={project.canvas.height}
                currentPos={{x: currentPos.x + margin, y: currentPos.y + margin}}
                currentSize={currentSize}
                onResizeMouseDown={handleResizeMouseDown}
                visible={true}
              />
            </svg>

            {/* エラー・実行中表示 */}
            {svgResult.error && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'error.main',
                textAlign: 'center',
                p: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 1,
                boxShadow: 2
              }}>
                <Typography variant="h4" sx={{ mb: 1 }}>⚠️</Typography>
                <Typography variant="body2">{svgResult.error}</Typography>
              </Box>
            )}

            {!svgResult.svg && !svgResult.error && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                textAlign: 'center',
                p: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 1,
                boxShadow: 2
              }}>
                <Typography variant="h4" sx={{ mb: 1 }}>📝</Typography>
                <Typography variant="body2">スクリプトを入力してください</Typography>
              </Box>
            )}

            {isExecuting && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                p: 1,
                borderRadius: 1,
                boxShadow: 2
              }}>
                <Box sx={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} />
                <Typography variant="body2">実行中...</Typography>
              </Box>
            )}
          </Box>

          {/* 右側: 設定パネル - スクロール可能 */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {/* Asset Name（Asset編集時のみ） */}
            {mode === 'asset' && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
                <TextField
                  label="Name"
                  value={editedAsset.name}
                  onChange={(e) => setEditedAsset(prev => ({ ...prev, name: e.target.value }))}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
              </Box>
            )}

            {/* パラメータ編集（@parametersがある場合のみ） */}
            {hasParameters && (
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  @parameters
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.entries(assetParameters).map(([paramName, paramValue], index: number) => {
                    const isNumber = typeof paramValue === 'number';
                    const isBindingSet = parameterBindings[paramName];
                    const resolvedValue = resolveParameterValue(paramName);
                    const availableAssets = isNumber ? availableValueAssets.number : availableValueAssets.string;

                    return (
                      <Box key={paramName} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {paramName}
                          </Typography>
                          <Chip
                            label={isNumber ? 'number' : 'string'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <TextField
                            type={isNumber ? 'number' : 'text'}
                            value={isBindingSet ? resolvedValue : (parameterValues[paramName] || paramValue || (isNumber ? 0 : ''))}
                            onChange={(e) => {
                              if (isNumber) {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) {
                                  handleParameterChange(paramName, value);
                                  scheduleExecution();
                                }
                              } else {
                                handleParameterChange(paramName, e.target.value);
                                scheduleExecution();
                              }
                            }}
                            onBlur={() => scheduleExecution()}
                            disabled={!!isBindingSet}
                            fullWidth
                            size="small"
                            variant="outlined"
                            inputProps={isNumber ? { step: 'any' } : undefined}
                          />
                        </Box>
                        <FormControl fullWidth size="small" variant="outlined">
                          <InputLabel>ValueAsset参照</InputLabel>
                          <Select
                            value={parameterBindings[paramName] || ''}
                            onChange={(e) => {
                              handleParameterBindingChange(paramName, e.target.value);
                              scheduleExecution();
                            }}
                            label="ValueAsset参照"
                          >
                            <MenuItem value="">直接入力</MenuItem>
                            {availableAssets.map(valueAsset => (
                              <MenuItem key={valueAsset.id} value={valueAsset.id}>
                                {valueAsset.name} ({valueAsset.value})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* PosX / PosY */}
            <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                PosX / PosY
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption">X (px)</Typography>
                  <NumericInput
                    value={currentPos.x}
                    onChange={(value) => updatePosition(value, currentPos.y)}
                    step={1}
                    decimals={2}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption">Y (px)</Typography>
                  <NumericInput
                    value={currentPos.y}
                    onChange={(value) => updatePosition(currentPos.x, value)}
                    step={1}
                    decimals={2}
                  />
                </Box>
              </Box>
            </Box>

            {/* Original Width / Height (Default values, read-only) */}
            <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
              <ReadOnlyInput
                label="Original Width / Height"
                value={`${editedAsset.original_width} × ${editedAsset.original_height}`}
              />
            </Box>

            {/* Width / Height */}
            <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Width / Height
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption">幅 (px)</Typography>
                  <NumericInput
                    value={currentSize.width}
                    onChange={(value) => handleSizeChange('width', value)}
                    min={1}
                    step={1}
                    decimals={2}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption">高さ (px)</Typography>
                  <NumericInput
                    value={currentSize.height}
                    onChange={(value) => handleSizeChange('height', value)}
                    min={1}
                    step={1}
                    decimals={2}
                  />
                </Box>
              </Box>
              {/* 縦横比チェックボックス */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={aspectRatioLocked}
                    onChange={(e) => setAspectRatioLocked(e.target.checked)}
                    size="small"
                  />
                }
                label="縦横比を元画像にあわせる"
                sx={{ mt: 1 }}
              />
            </Box>

            {/* Opacity */}
            <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e9ecef' }}>
              <OpacityInput
                value={currentOpacity}
                onChange={updateOpacity}
                label="Opacity"
              />
            </Box>

            {/* Z-Index */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                Z-Index
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                (layer order: lower = background)
              </Typography>
              <ZIndexInput
                value={currentZIndex}
                onChange={updateZIndex}
                validation={zIndexValidation}
                  />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
