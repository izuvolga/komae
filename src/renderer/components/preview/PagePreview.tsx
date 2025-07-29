import React, { useState, useEffect } from 'react';
import { getCustomProtocolUrl } from '../../utils/imageUtils';
import { useProjectStore } from '../../stores/projectStore';
import type { ProjectData, Page, ImageAsset, AssetInstance, ImageAssetInstance } from '../../../types/entities';

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
    const imageInstance = instance as ImageAssetInstance;
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