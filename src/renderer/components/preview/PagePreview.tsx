import React, { useState, useEffect } from 'react';
import { loadImageAsDataUrl } from '../../utils/imageUtils';
import { useProjectStore } from '../../stores/projectStore';
import type { ProjectData, Page, ImageAsset, AssetInstance } from '../../../types/entities';

interface PagePreviewProps {
  project: ProjectData;
  page: Page;
  zoomLevel: number;
}

export const PagePreview: React.FC<PagePreviewProps> = ({ project, page, zoomLevel }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);

  useEffect(() => {
    let isMounted = true;
    
    const generatePreviewSvg = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        // アセットインスタンスをz_index順でソート
        const instances = Object.values(page.asset_instances).sort((a, b) => a.z_index - b.z_index);
        
        // 各ImageAssetのBase64データを取得
        const imageElements = [];
        for (const instance of instances) {
          const asset = project.assets[instance.asset_id];
          if (!asset || asset.type !== 'ImageAsset') {
            continue;
          }
          
          try {
            const imageAsset = asset as ImageAsset;
            const dataUrl = await loadImageAsDataUrl(imageAsset.original_file_path, currentProjectPath);
            const imageElement = generateImageElement(imageAsset, instance, dataUrl);
            imageElements.push(imageElement);
          } catch (error) {
            console.warn(`Failed to load image for asset ${asset.name}:`, error);
            // エラーが発生した画像はスキップ
          }
        }
        
        // SVGを組み立て
        const svgContent = [
          `<svg viewBox="0 0 ${project.canvas.width} ${project.canvas.height}" xmlns="http://www.w3.org/2000/svg">`,
          ...imageElements,
          '</svg>'
        ].join('\n');
        
        if (isMounted) {
          setSvgContent(svgContent);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to generate SVG preview:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    generatePreviewSvg();
    
    return () => {
      isMounted = false;
    };
  }, [project, page, currentProjectPath]);

  if (isLoading) {
    return (
      <div 
        className="page-preview loading"
        style={{
          width: project.canvas.width * zoomLevel,
          height: project.canvas.height * zoomLevel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
        }}
      >
        <div>プレビューを生成中...</div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div 
        className="page-preview error"
        style={{
          width: project.canvas.width * zoomLevel,
          height: project.canvas.height * zoomLevel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          color: '#c62828',
        }}
      >
        <div>プレビューの生成に失敗しました</div>
      </div>
    );
  }

  return (
    <div 
      className="page-preview"
      style={{
        width: project.canvas.width * zoomLevel,
        height: project.canvas.height * zoomLevel,
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

/**
 * ImageAssetからSVG image要素を生成する（Base64データ使用）
 */
function generateImageElement(asset: ImageAsset, instance: AssetInstance, dataUrl: string): string {
  const x = asset.default_pos_x;
  const y = asset.default_pos_y;
  const width = asset.original_width;
  const height = asset.original_height;
  const opacity = instance.opacity ?? asset.default_opacity ?? 1.0;
  
  // Transform文字列を構築
  const transforms = [];
  if (instance.transform) {
    const { scale_x, scale_y, rotation } = instance.transform;
    if (scale_x !== 1.0 || scale_y !== 1.0) {
      transforms.push(`scale(${scale_x ?? 1.0}, ${scale_y ?? 1.0})`);
    }
    if (rotation !== 0) {
      transforms.push(`rotate(${rotation ?? 0})`);
    }
  }
  
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  
  return `<image href="${dataUrl}" x="${x}" y="${y}" width="${width}" height="${height}" opacity="${opacity}"${transformAttr} />`;
}