/**
 * EditModal共通ユーティリティ
 * 複数のEditModalで共有される機能を提供
 */

import React from 'react';
import type { 
  VectorAsset, 
  VectorAssetInstance, 
  ImageAsset, 
  ImageAssetInstance, 
  DynamicVectorAsset, 
  DynamicVectorAssetInstance,
  ProjectData,
  Page
} from '../../types/entities';
import { getEffectiveZIndex } from '../../types/entities';

/**
 * SVGリサイズハンドルのプロパティ
 */
export interface ResizeHandleProps {
  /** ハンドル識別子 */
  handle: string;
  /** X座標 */
  x: number;
  /** Y座標 */
  y: number;
  /** カーソルスタイル */
  cursor: string;
  /** マウスダウンハンドラー */
  onMouseDown: (e: React.MouseEvent, handle: string) => void;
}

/**
 * リサイズハンドルの設定
 */
export const RESIZE_HANDLES = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type ResizeHandleType = typeof RESIZE_HANDLES[number];

/**
 * EditModalで使用される標準スケールファクター
 */
export const EDIT_MODAL_SCALE = 0.35;

/**
 * リサイズハンドルのサイズ（px）
 */
export const RESIZE_HANDLE_SIZE = 16;

/**
 * SVGリサイズハンドル要素を生成する
 * @param position - 要素の現在位置 {x, y}
 * @param size - 要素の現在サイズ {width, height}
 * @param onResizeMouseDown - リサイズ開始ハンドラー
 * @returns ReactElementの配列
 */
export const generateResizeHandles = (
  position: { x: number; y: number },
  size: { width: number; height: number },
  onResizeMouseDown: (e: React.MouseEvent, handle: string) => void
): React.ReactElement[] => {
  return RESIZE_HANDLES.map(handle => {
    const handleSize = RESIZE_HANDLE_SIZE;
    let x = 0;
    let y = 0;
    let cursor = 'nw-resize';
    
    switch (handle) {
      case 'top-left':
        x = position.x * EDIT_MODAL_SCALE;
        y = position.y * EDIT_MODAL_SCALE;
        cursor = 'nw-resize';
        break;
      case 'top-right':
        x = (position.x + size.width) * EDIT_MODAL_SCALE - handleSize;
        y = position.y * EDIT_MODAL_SCALE;
        cursor = 'ne-resize';
        break;
      case 'bottom-left':
        x = position.x * EDIT_MODAL_SCALE;
        y = (position.y + size.height) * EDIT_MODAL_SCALE - handleSize;
        cursor = 'sw-resize';
        break;
      case 'bottom-right':
        x = (position.x + size.width) * EDIT_MODAL_SCALE - handleSize;
        y = (position.y + size.height) * EDIT_MODAL_SCALE - handleSize;
        cursor = 'se-resize';
        break;
    }
    
    return (
      <g key={handle}>
        {/* 外側の白い枠 */}
        <rect
          x={x}
          y={y}
          width={handleSize}
          height={handleSize}
          fill="white"
          stroke="#007acc"
          strokeWidth="2"
          style={{ cursor, pointerEvents: 'all' }}
          onMouseDown={(e) => onResizeMouseDown(e, handle)}
        />
        {/* 内側の青い四角 */}
        <rect
          x={x + 3}
          y={y + 3}
          width={handleSize - 6}
          height={handleSize - 6}
          fill="#007acc"
          stroke="none"
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  });
};

/**
 * マウス座標をキャンバス座標に変換
 * @param clientX - マウスのクライアントX座標
 * @param clientY - マウスのクライアントY座標
 * @param startX - ドラッグ開始時のクライアントX座標
 * @param startY - ドラッグ開始時のクライアントY座標
 * @returns 変換されたデルタ座標 {deltaX, deltaY}
 */
export const convertMouseDelta = (
  clientX: number,
  clientY: number,
  startX: number,
  startY: number
): { deltaX: number; deltaY: number } => {
  return {
    deltaX: (clientX - startX) / EDIT_MODAL_SCALE,
    deltaY: (clientY - startY) / EDIT_MODAL_SCALE,
  };
};

/**
 * キャンバス境界内に座標を制限
 * @param x - X座標
 * @param y - Y座標
 * @param width - 幅
 * @param height - 高さ
 * @param canvasWidth - キャンバス幅
 * @param canvasHeight - キャンバス高さ
 * @returns 制限された座標とサイズ
 */
export const constrainToCanvas = (
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } => {
  const constrainedX = Math.max(0, Math.min(canvasWidth - width, x));
  const constrainedY = Math.max(0, Math.min(canvasHeight - height, y));
  const constrainedWidth = Math.min(width, canvasWidth - constrainedX);
  const constrainedHeight = Math.min(height, canvasHeight - constrainedY);
  
  return {
    x: constrainedX,
    y: constrainedY,
    width: constrainedWidth,
    height: constrainedHeight,
  };
};

// Asset types that support common current value operations
type SupportedAsset = VectorAsset | ImageAsset | DynamicVectorAsset;
type SupportedAssetInstance = VectorAssetInstance | ImageAssetInstance | DynamicVectorAssetInstance;

/**
 * Asset/Instanceモードに応じた現在位置を取得
 * @param mode - 編集モード ('asset' | 'instance')
 * @param asset - アセットデータ
 * @param assetInstance - アセットインスタンスデータ (instanceモード時のみ)
 * @returns 現在の位置 {x, y}
 */
export const getCurrentPosition = (
  mode: 'asset' | 'instance',
  asset: SupportedAsset,
  assetInstance?: SupportedAssetInstance | null
): { x: number; y: number } => {
  if (mode === 'instance' && assetInstance) {
    return {
      x: assetInstance.override_pos_x ?? asset.default_pos_x,
      y: assetInstance.override_pos_y ?? asset.default_pos_y,
    };
  }
  return {
    x: asset.default_pos_x,
    y: asset.default_pos_y,
  };
};

/**
 * Asset/Instanceモードに応じた現在サイズを取得
 * @param mode - 編集モード ('asset' | 'instance')
 * @param asset - アセットデータ
 * @param assetInstance - アセットインスタンスデータ (instanceモード時のみ)
 * @returns 現在のサイズ {width, height}
 */
export const getCurrentSize = (
  mode: 'asset' | 'instance',
  asset: SupportedAsset,
  assetInstance?: SupportedAssetInstance | null
): { width: number; height: number } => {
  if (mode === 'instance' && assetInstance) {
    return {
      width: assetInstance.override_width ?? asset.default_width,
      height: assetInstance.override_height ?? asset.default_height,
    };
  }
  return {
    width: asset.default_width,
    height: asset.default_height,
  };
};

/**
 * Asset/Instanceモードに応じた現在透明度を取得
 * @param mode - 編集モード ('asset' | 'instance')
 * @param asset - アセットデータ
 * @param assetInstance - アセットインスタンスデータ (instanceモード時のみ)
 * @returns 現在の透明度
 */
export const getCurrentOpacity = (
  mode: 'asset' | 'instance',
  asset: SupportedAsset,
  assetInstance?: SupportedAssetInstance | null
): number => {
  if (mode === 'instance' && assetInstance) {
    return assetInstance.override_opacity ?? asset.default_opacity;
  }
  return asset.default_opacity;
};

/**
 * Asset/Instanceモードに応じた現在Z-Indexを取得
 * @param mode - 編集モード ('asset' | 'instance')
 * @param asset - アセットデータ
 * @param assetInstance - アセットインスタンスデータ (instanceモード時のみ)
 * @returns 現在のZ-Index
 */
export const getCurrentZIndex = (
  mode: 'asset' | 'instance',
  asset: SupportedAsset,
  assetInstance?: SupportedAssetInstance | null
): number => {
  if (mode === 'instance' && assetInstance) {
    return assetInstance.override_z_index ?? asset.default_z_index;
  }
  return asset.default_z_index;
};

/**
 * SVGコンテンツを親SVG要素でラップして位置・サイズ・不透明度を制御
 * @param svgContent - ラップするSVGコンテンツ
 * @param x - X座標
 * @param y - Y座標  
 * @param width - 幅
 * @param height - 高さ
 * @param opacity - 不透明度
 * @param originalWidth - 元の幅
 * @param originalHeight - 元の高さ
 * @returns ラップされたSVG文字列
 */
export const wrapSVGWithParentContainer = (
  svgContent: string, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  opacity: number,
  originalWidth: number,
  originalHeight: number
): string => {
  const scaleX = width / originalWidth;
  const scaleY = height / originalHeight;
  // SVG 内部での X, Y 座標は scale 処理を考慮して調整
  const adjustedX = x * (1 / scaleX);
  const adjustedY = y * (1 / scaleY);

  return `<svg version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      x="${adjustedX}px"
      y="${adjustedY}px"
      width="${originalWidth}px"
      height="${originalHeight}px"
      transform="scale(${width / originalWidth}, ${height / originalHeight})"
      style="opacity: ${opacity};">
        ${svgContent}
    </svg>`;
};

/**
 * Z-Indexバリデーション結果の型
 */
export interface ZIndexValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Z-Index値を文字列からバリデーションする
 * @param value - 検証するZ-Index文字列
 * @param project - プロジェクトデータ
 * @param page - ページデータ
 * @param currentInstanceId - 現在編集中のインスタンスID
 * @returns バリデーション結果
 */
export const validateZIndexValue = (
  value: string,
  project?: ProjectData,
  page?: Page,
  currentInstanceId?: string
): ZIndexValidationResult => {
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
  if (page && project) {
    const conflicts: string[] = [];
    
    Object.values(page.asset_instances).forEach((instance) => {
      // 自分自身は除外
      if (instance.id === currentInstanceId) return;
      
      const instanceAsset = project.assets[instance.asset_id];
      if (!instanceAsset) return;
      
      const effectiveZIndex = getEffectiveZIndex(instanceAsset, instance);
      
      if (effectiveZIndex === numValue) {
        const assetName = instanceAsset.name || instanceAsset.id;
        conflicts.push(assetName);
      }
    });
    
    if (conflicts.length > 0) {
      warning = `同じz-indexを持つアセット: ${conflicts.join(', ')}`;
    }
  }
  
  return {
    isValid: true,
    warning
  };
};

/**
 * Z-Index値を数値から競合チェックしてバリデーションする
 * @param zIndex - 検証するZ-Index数値
 * @param project - プロジェクトデータ
 * @param page - ページデータ
 * @param currentInstanceId - 現在編集中のインスタンスID
 * @returns バリデーション結果
 */
export const validateZIndexNumber = (
  zIndex: number,
  project?: ProjectData,
  page?: Page,
  currentInstanceId?: string
): ZIndexValidationResult => {
  if (!page || !project) {
    return { isValid: true };
  }

  // 同じページの他のアセットインスタンスとの重複チェック
  const otherInstances = Object.values(page.asset_instances)
    .filter(inst => inst.id !== currentInstanceId);

  const conflicts = otherInstances.filter(inst => {
    const otherAsset = project.assets[inst.asset_id];
    if (!otherAsset) return false;

    const effectiveZIndex = getEffectiveZIndex(otherAsset, inst);
    return effectiveZIndex === zIndex;
  });

  if (conflicts.length > 0) {
    const conflictNames = conflicts.map(inst => project.assets[inst.asset_id]?.name).join(', ');
    return {
      isValid: true,
      warning: `Z-Index ${zIndex} は他のアセット (${conflictNames}) と重複しています`
    };
  }

  return { isValid: true };
};

/**
 * Z-Index入力を数値のみにサニタイズ
 * @param value - 入力文字列
 * @returns サニタイズされた文字列
 */
export const sanitizeZIndexInput = (value: string): string => {
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