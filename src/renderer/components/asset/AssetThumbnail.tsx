import React, { useState, useEffect } from 'react';
import { getCustomProtocolUrl, calculateThumbnailSize } from '../../utils/imageUtils';
import { useProjectStore } from '../../stores/projectStore';
import type { Asset, ImageAsset, VectorAsset, DynamicVectorAsset } from '../../../types/entities';
import './AssetThumbnail.css';

interface AssetThumbnailProps {
  asset: Asset;
  maxWidth?: number;
  maxHeight?: number;
}

export const AssetThumbnail: React.FC<AssetThumbnailProps> = ({
  asset,
  maxWidth = 120,
  maxHeight = 80,
}) => {
  const [customProtocolUrl, setCustomProtocolUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);

  useEffect(() => {
    let isMounted = true;
    
    const generateProtocolUrl = () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        console.log('Generating custom protocol URL for asset:', currentProjectPath, (asset as any).original_file_path);
        // カスタムプロトコルURLを生成（非同期処理不要）
        const protocolUrl = getCustomProtocolUrl((asset as any).original_file_path, currentProjectPath);
        
        if (isMounted) {
          setCustomProtocolUrl(protocolUrl);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to generate protocol URL:', error);
        
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    generateProtocolUrl();
    
    return () => {
      isMounted = false;
    };
  }, [asset, currentProjectPath]);

  // サムネイルサイズを計算
  let thumbnailSize = { width: maxWidth, height: maxHeight };
  if (asset.type === 'ImageAsset' || asset.type === 'VectorAsset') {
    thumbnailSize = calculateThumbnailSize(
      (asset as ImageAsset | VectorAsset).original_width,
      (asset as ImageAsset | VectorAsset).original_height,
      maxWidth,
      maxHeight
    );
  } else if (asset.type === 'DynamicVectorAsset') {
    thumbnailSize = calculateThumbnailSize(
      (asset as DynamicVectorAsset).default_width,
      (asset as DynamicVectorAsset).default_height,
      maxWidth,
      maxHeight
    );
  }

  if (isLoading) {
    return (
      <div 
        className="asset-thumbnail loading"
        style={{ width: maxWidth, height: maxHeight }}
      >
        <div className="loading-spinner">読み込み中...</div>
      </div>
    );
  }

  // TextAssetの場合は専用の表示
  if (asset.type === 'TextAsset') {
    return (
      <div 
        className="asset-thumbnail text-asset"
        style={{ width: maxWidth, height: maxHeight }}
      >
        <div className="text-asset-placeholder">
          <span>TXT</span>
          <small>{asset.name}</small>
        </div>
      </div>
    );
  }

  // DynamicVectorAssetの場合は専用の表示
  if (asset.type === 'DynamicVectorAsset') {
    return (
      <div 
        className="asset-thumbnail dynamic-vector-asset"
        style={{ width: maxWidth, height: maxHeight }}
      >
        <div className="dynamic-vector-placeholder">
          <span>⚡</span>
          <small>Dynamic SVG</small>
        </div>
      </div>
    );
  }

  // ImageAssetまたはVectorAssetでエラーまたはURLなしの場合
  if (hasError || !customProtocolUrl) {
    let placeholderText = 'IMG';
    const assetType = (asset as any).type;
    if (assetType === 'VectorAsset') {
      placeholderText = 'SVG';
    } else if (assetType === 'DynamicVectorAsset') {
      placeholderText = '⚡SVG';
    }
    
    return (
      <div 
        className="asset-thumbnail error"
        style={{ width: maxWidth, height: maxHeight }}
      >
        <div className="error-placeholder">
          <span>{placeholderText}</span>
          <small>読み込み失敗</small>
        </div>
      </div>
    );
  }

  let thumbnailClass = 'image-asset';
  const assetType = (asset as any).type;
  if (assetType === 'VectorAsset') {
    thumbnailClass = 'vector-asset';
  } else if (assetType === 'DynamicVectorAsset') {
    thumbnailClass = 'dynamic-vector-asset';
  }

  return (
    <div 
      className={`asset-thumbnail ${thumbnailClass}`}
      style={{ width: maxWidth, height: maxHeight }}
    >
      <img
        src={customProtocolUrl}
        alt={asset.name}
        style={{
          width: thumbnailSize.width,
          height: thumbnailSize.height,
        }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};