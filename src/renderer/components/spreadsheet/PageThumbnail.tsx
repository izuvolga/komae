import React, { useState, useEffect } from 'react';
import { generateSvgStructureCommon } from '../../../utils/svgGeneratorCommon';
import { getCustomProtocolUrl } from '../../utils/imageUtils';
import { useProjectStore } from '../../stores/projectStore';
import { getEffectiveZIndex } from '../../../types/entities';
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
  const getCurrentLanguage = useProjectStore((state) => state.getCurrentLanguage);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // キャンバスのアスペクト比を保持した最適なサイズを計算
  const calculateOptimalSize = (maxWidth: number, maxHeight: number) => {
    const canvasAspectRatio = project.canvas.width / project.canvas.height;
    const containerAspectRatio = maxWidth / maxHeight;
    
    let optimalWidth: number;
    let optimalHeight: number;
    
    if (canvasAspectRatio > containerAspectRatio) {
      // キャンバスの方が横長 → 幅を最大に
      optimalWidth = maxWidth;
      optimalHeight = maxWidth / canvasAspectRatio;
    } else {
      // キャンバスの方が縦長 → 高さを最大に
      optimalHeight = maxHeight;
      optimalWidth = maxHeight * canvasAspectRatio;
    }
    
    return {
      width: Math.round(optimalWidth),
      height: Math.round(optimalHeight)
    };
  };

  const optimalSize = calculateOptimalSize(width, height);

  useEffect(() => {
    let isMounted = true;

    const generateThumbnail = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 共通のSVG生成ユーティリティを使用（新しいAsset-levelシステムを使用）
        const instances = Object.values(page.asset_instances).sort((a, b) => {
          const assetA = project.assets[a.asset_id];
          const assetB = project.assets[b.asset_id];
          if (!assetA || !assetB) return 0;
          const zIndexA = getEffectiveZIndex(assetA, a);
          const zIndexB = getEffectiveZIndex(assetB, b);
          return zIndexA - zIndexB;
        });

        // DynamicVectorAssetのcustom_asset_idを収集（ログ用のみ、実際のIPCは関数内で実行）
        const customAssetIds = new Set<string>();
        instances.forEach(instance => {
          const asset = project.assets[instance.asset_id];
          if (asset?.type === 'DynamicVectorAsset') {
            customAssetIds.add(asset.custom_asset_id);
          }
        });

        const availableLanguages = project.metadata?.supportedLanguages || ['ja'];
        const currentLanguage = getCurrentLanguage();
        
        // generateSvgStructureCommon は非同期になったため await を使用
        const { assetDefinitions, useElements } = await generateSvgStructureCommon(
          project, 
          instances, 
          (filePath: string) => {
            return getCustomProtocolUrl(filePath, currentProjectPath);
          }, 
          availableLanguages, 
          currentLanguage,
          0, // pageIndex
          {} // customAssets は使用しない（IPCで直接取得）
        );

        // サムネイル用のSVGを組み立て（最適なサイズを使用）
        const svgContent = [
          `<svg`,
          `  width="${optimalSize.width}"`,
          `  height="${optimalSize.height}"`,
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
  }, [project, page, width, height, currentProjectPath, optimalSize.width, optimalSize.height, getCurrentLanguage()]);

  if (isLoading) {
    return (
      <div 
        className={`page-thumbnail loading ${className}`}
        style={{ width: optimalSize.width, height: optimalSize.height }}
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
        style={{ width: optimalSize.width, height: optimalSize.height }}
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
      style={{ width: optimalSize.width, height: optimalSize.height }}
      onClick={onClick}
      title={`${page.title} - クリックして選択`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

