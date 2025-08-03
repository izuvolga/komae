import React, { useState, useEffect } from 'react';
import { generateSvgStructureCommon } from '../../../utils/svgGeneratorCommon';
import { getCustomProtocolUrl } from '../../utils/imageUtils';
import { useProjectStore } from '../../stores/projectStore';
import type { ProjectData, Page } from '../../../types/entities';

interface PageThumbnailProps {
  project: ProjectData;
  page: Page;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  project,
  page,
  width = 120,
  height = 90,
  className = '',
  onClick
}) => {
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const generateThumbnail = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 共通のSVG生成ユーティリティを使用
        const instances = Object.values(page.asset_instances).sort((a, b) => a.z_index - b.z_index);
        const { assetDefinitions, useElements } = generateSvgStructureCommon(project, instances, (filePath: string) => {
          return getCustomProtocolUrl(filePath, currentProjectPath);
        });

        // サムネイル用のSVGを組み立て
        const svgContent = [
          `<svg`,
          `  width="${width}"`,
          `  height="${height}"`,
          `  viewBox="0 0 ${project.canvas.width} ${project.canvas.height}"`,
          `  xmlns="http://www.w3.org/2000/svg"`,
          `  xmlns:xlink="http://www.w3.org/1999/xlink"`,
          `  style="background: white; border: 1px solid #eee;"`,
          `>`,
          `  <defs></defs>`,
          `  <g id="assets">`,
          `    <g visibility="hidden">`,
          ...assetDefinitions.map(def => `      ${def}`),
          `    </g>`,
          `  </g>`,
          `  <g id="draw">`,
          ...useElements.map(use => `    ${use}`),
          `  </g>`,
          `</svg>`
        ].join('\n');

        if (isMounted) {
          setSvgContent(svgContent);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to generate thumbnail:', error);
          setError(error instanceof Error ? error.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    generateThumbnail();

    return () => {
      isMounted = false;
    };
  }, [project, page, width, height, currentProjectPath]);

  if (isLoading) {
    return (
      <div 
        className={`page-thumbnail loading ${className}`}
        style={{ width, height }}
        onClick={onClick}
      >
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`page-thumbnail error ${className}`}
        style={{ width, height }}
        onClick={onClick}
        title={`エラー: ${error}`}
      >
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <div className="error-text">エラー</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`page-thumbnail ${className}`}
      style={{ width, height }}
      onClick={onClick}
      title={`${page.title} - クリックして選択`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

