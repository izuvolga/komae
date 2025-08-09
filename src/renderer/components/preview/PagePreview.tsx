import React, { useState, useEffect } from 'react';
import { generateCompleteSvg } from '../../../utils/svgGeneratorCommon';
import { getCustomProtocolUrl } from '../../utils/imageUtils';
import { useProjectStore } from '../../stores/projectStore';
import { getEffectiveZIndex } from '../../../types/entities';
import type { ProjectData, Page } from '../../../types/entities';

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
    
    const generateSvgPreview = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        // アセットインスタンスをz_index順でソート（新しいAsset-levelシステムを使用）
        const instances = Object.values(page.asset_instances).sort((a, b) => {
          const assetA = project.assets[a.asset_id];
          const assetB = project.assets[b.asset_id];
          if (!assetA || !assetB) return 0;
          const zIndexA = getEffectiveZIndex(assetA, a);
          const zIndexB = getEffectiveZIndex(assetB, b);
          return zIndexA - zIndexB;
        });
        
        // 完全なSVG文字列を生成
        const svgContent = generateCompleteSvg(project, instances, (filePath: string) => {
          return getCustomProtocolUrl(filePath, currentProjectPath);
        });
        
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

    generateSvgPreview();
    
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

