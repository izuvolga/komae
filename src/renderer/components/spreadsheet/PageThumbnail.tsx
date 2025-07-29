import React, { useState, useEffect } from 'react';
import { getCustomProtocolUrl } from '../../utils/imageUtils';
import { useProjectStore } from '../../stores/projectStore';
import type { ProjectData, Page, ImageAsset, AssetInstance, ImageAssetInstance } from '../../../types/entities';

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

        // PagePreviewと同じロジックでSVGを生成
        const instances = Object.values(page.asset_instances).sort((a, b) => a.z_index - b.z_index);
        const { assetDefinitions, useElements } = generateSvgStructure(project, instances, currentProjectPath);

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

/**
 * ドキュメント仕様に従ったSVG構造を生成する
 * svg-structure.mdの仕様に準拠して、アセット定義と使用要素を分離
 */
function generateSvgStructure(
  project: ProjectData, 
  instances: AssetInstance[], 
  projectPath: string | null
): { assetDefinitions: string[]; useElements: string[] } {
  const assetDefinitions: string[] = [];
  const useElements: string[] = [];
  const processedAssets = new Set<string>();

  for (const instance of instances) {
    const asset = project.assets[instance.asset_id];
    if (!asset || asset.type !== 'ImageAsset') {
      continue;
    }

    const imageAsset = asset as ImageAsset;
    
    // アセット定義を追加（初回のみ）
    if (!processedAssets.has(asset.id)) {
      const protocolUrl = getCustomProtocolUrl(imageAsset.original_file_path, projectPath);
      const assetDef = generateAssetDefinition(imageAsset, protocolUrl);
      assetDefinitions.push(assetDef);
      processedAssets.add(asset.id);
    }

    // 使用要素を追加（インスタンスごと）
    const useElement = generateUseElement(imageAsset, instance);
    useElements.push(useElement);
  }

  return { assetDefinitions, useElements };
}

/**
 * アセット定義を生成する（<defs>内で使用）
 */
function generateAssetDefinition(asset: ImageAsset, protocolUrl: string): string {
  const x = asset.default_pos_x;
  const y = asset.default_pos_y;
  const width = asset.original_width;
  const height = asset.original_height;
  const opacity = asset.default_opacity ?? 1.0;
  
  return [
    `<g id="${asset.id}" opacity="${opacity}">`,
    `  <image id="image-${asset.id}" xlink:href="${protocolUrl}" width="${width}" height="${height}" x="${x}" y="${y}" />`,
    `</g>`
  ].join('\n      ');
}

/**
 * use要素を生成する（描画時に使用）
 */
function generateUseElement(asset: ImageAsset, instance: AssetInstance): string {
  // Transform文字列を構築
  const transforms = [];
  
  // 位置調整（ImageAssetInstanceのみ対応）
  if (instance.asset_id && 'override_pos_x' in instance) {
    const imageInstance = instance as any; // ImageAssetInstance type
    const posX = imageInstance.override_pos_x ?? asset.default_pos_x;
    const posY = imageInstance.override_pos_y ?? asset.default_pos_y;
    if (posX !== asset.default_pos_x || posY !== asset.default_pos_y) {
      const translateX = posX - asset.default_pos_x;
      const translateY = posY - asset.default_pos_y;
      transforms.push(`translate(${translateX},${translateY})`);
    }
  }
  
  // スケール調整
  if (instance.transform) {
    const { scale_x, scale_y, rotation } = instance.transform;
    if (scale_x !== 1.0 || scale_y !== 1.0) {
      transforms.push(`scale(${scale_x ?? 1.0},${scale_y ?? 1.0})`);
    }
    if (rotation !== 0) {
      transforms.push(`rotate(${rotation ?? 0})`);
    }
  }
  
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  const opacityAttr = instance.opacity !== undefined ? ` opacity="${instance.opacity}"` : '';
  
  return `<use href="#${asset.id}"${transformAttr}${opacityAttr} />`;
}