import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
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
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);

  useEffect(() => {
    let isMounted = true;
    
    const generateThumbnail = async () => {
      setIsLoading(true);
      setHasError(false);
      setSvgContent(null);
      setCustomProtocolUrl(null);
      
      try {
        if (asset.type === 'ImageAsset') {
          // ImageAssetの場合は既存のロジック
          const protocolUrl = getCustomProtocolUrl((asset as ImageAsset).original_file_path, currentProjectPath);
          if (isMounted) {
            setCustomProtocolUrl(protocolUrl);
            setIsLoading(false);
          }
        } else if (asset.type === 'VectorAsset') {
          // VectorAssetの場合はsvg_contentを直接使用
          const vectorAsset = asset as VectorAsset;
          if (vectorAsset.svg_content) {
            if (isMounted) {
              setSvgContent(vectorAsset.svg_content);
              setIsLoading(false);
            }
          } else {
            throw new Error('SVG content not found');
          }
        } else if (asset.type === 'DynamicVectorAsset') {
          // DynamicVectorAssetの場合は初期値でSVGを生成
          const dynamicAsset = asset as DynamicVectorAsset;
          
          // 初期パラメータを構築（DynamicVectorAsset.parametersをそのまま使用）
          const initialParameters: Record<string, any> = { ...dynamicAsset.parameters };
          
          // IPCでSVG生成
          const generatedSVG = await window.electronAPI.customAsset.generateSVG(
            dynamicAsset.custom_asset_id,
            initialParameters
          );
          
          if (generatedSVG && isMounted) {
            setSvgContent(generatedSVG);
            setIsLoading(false);
          } else {
            throw new Error('Failed to generate SVG');
          }
        } else {
          // 他のアセットタイプは従来通り
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
        
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    generateThumbnail();
    
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

  // ValueAssetの場合も専用の表示
  if (asset.type === 'ValueAsset') {
    return (
      <Box
        className="asset-thumbnail"
        sx={{
          width: maxWidth,
          height: maxHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.100',
          border: '1px solid',
          borderColor: 'grey.300',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <Box sx={{
          textAlign: 'center',
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5
        }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.primary' }}>VAL</Typography>
          <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary' }}>{asset.name}</Typography>
        </Box>
      </Box>
    );
  }

  // SVGコンテンツがある場合（VectorAssetまたはDynamicVectorAsset）
  if (svgContent) {
    // SVGを適切なサイズに収めるためのラッパーSVG
    // g要素でグループ化して0.8倍にスケールダウンし、中央配置
    const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <g transform="translate(50, 50) scale(0.8) translate(-50, -50)">
        ${svgContent}
      </g>
    </svg>`;
    
    return (
      <div 
        className={`asset-thumbnail ${asset.type === 'VectorAsset' ? 'vector-asset' : 'dynamic-vector-asset'}`}
        style={{ width: maxWidth, height: maxHeight }}
      >
        <div 
          style={{
            width: thumbnailSize.width,
            height: thumbnailSize.height,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            boxSizing: 'border-box',
          }}
          dangerouslySetInnerHTML={{ __html: wrappedSvg }}
        />
      </div>
    );
  }

  // ImageAssetでエラーまたはURLなしの場合、またはその他のエラー
  if (hasError || (!customProtocolUrl && asset.type === 'ImageAsset')) {
    let placeholderText = 'IMG';
    const assetType = (asset as any).type;
    if (assetType === 'VectorAsset') {
      placeholderText = 'SVG';
    } else if (assetType === 'DynamicVectorAsset') {
      placeholderText = '⚡SVG';
    } else if (assetType === 'ValueAsset') {
      placeholderText = 'VAL';
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

  // ImageAssetの表示
  if (customProtocolUrl && asset.type === 'ImageAsset') {
    return (
      <Box
        className="asset-thumbnail"
        sx={{
          width: maxWidth,
          height: maxHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.300',
          borderRadius: 1,
          overflow: 'hidden'
        }}
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
      </Box>
    );
  }

  // フォールバック
  return (
    <div 
      className="asset-thumbnail error"
      style={{ width: maxWidth, height: maxHeight }}
    >
      <div className="error-placeholder">
        <span>?</span>
        <small>未対応</small>
      </div>
    </div>
  );
};
