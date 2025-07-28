import React, { useState, useEffect } from 'react';
import { loadImageAsDataUrl, calculateThumbnailSize } from '../../utils/imageUtils';
import { useProjectStore } from '../../stores/projectStore';
import type { ImageAsset } from '../../../types/entities';
import './AssetThumbnail.css';

interface AssetThumbnailProps {
  asset: ImageAsset;
  maxWidth?: number;
  maxHeight?: number;
}

export const AssetThumbnail: React.FC<AssetThumbnailProps> = ({
  asset,
  maxWidth = 120,
  maxHeight = 80,
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        const dataUrl = await loadImageAsDataUrl(asset.original_file_path, currentProjectPath);
        
        if (isMounted) {
          setImageDataUrl(dataUrl);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load thumbnail:', error);
        
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [asset.original_file_path, currentProjectPath]);

  // サムネイルサイズを計算
  const thumbnailSize = calculateThumbnailSize(
    asset.original_width,
    asset.original_height,
    maxWidth,
    maxHeight
  );

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

  if (hasError || !imageDataUrl) {
    return (
      <div 
        className="asset-thumbnail error"
        style={{ width: maxWidth, height: maxHeight }}
      >
        <div className="error-placeholder">
          <span>IMG</span>
          <small>読み込み失敗</small>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="asset-thumbnail"
      style={{ width: maxWidth, height: maxHeight }}
    >
      <img
        src={imageDataUrl}
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