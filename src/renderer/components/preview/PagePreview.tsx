import React, { useState, useEffect } from 'react';
import { generateSvgStructure } from '../../utils/svgGenerator';
import { useProjectStore } from '../../stores/projectStore';
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
    
    const generatePreviewSvg = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        // アセットインスタンスをz_index順でソート
        const instances = Object.values(page.asset_instances).sort((a, b) => a.z_index - b.z_index);
        
        // ドキュメント仕様に従ったSVG構造を生成
        const { assetDefinitions, useElements } = generateSvgStructure(project, instances, currentProjectPath);
        
        // SVGを組み立て（svg-structure.md仕様に準拠）
        const svgContent = [
          `<svg`,
          `  id="komae-preview"`,
          `  width="400"`,
          `  viewBox="0 0 ${project.canvas.width} ${project.canvas.height}"`,
          `  xmlns="http://www.w3.org/2000/svg"`,
          `  xmlns:xlink="http://www.w3.org/1999/xlink"`,
          `  visibility="visible"`,
          `>`,
          `  <defs>`,
          `    <!-- 存在するImageAssetにあるマスク情報をすべて宣言する -->`,
          `    <!-- 将来的にマスク機能実装時に追加 -->`,
          `  </defs>`,
          ``,
          `  <!-- 存在するImageAssetをすべて宣言する -->`,
          `  <g id="assets">`,
          `    <g visibility="hidden">`,
          ...assetDefinitions.map(def => `      ${def}`),
          `    </g>`,
          `  </g>`,
          ``,
          `  <!-- JavaScriptで各pageの内容をid="draw"の中に描画する -->`,
          `  <g id="draw">`,
          ...useElements.map(use => `    ${use}`),
          `  </g>`,
          `</svg>`,
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

