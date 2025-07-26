import React, { useState, useCallback } from 'react';
import { AssetLibrary } from '../asset/AssetLibrary';
import { PreviewArea } from '../preview/PreviewArea';
import { EnhancedSpreadsheet } from '../spreadsheet/EnhancedSpreadsheet';
import { PanelExpandLeftIcon, PanelExpandRightIcon } from '../icons/PanelIcons';
import { useProjectStore } from '../../stores/projectStore';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const showAssetLibrary = useProjectStore((state) => state.ui.showAssetLibrary);
  const showPreview = useProjectStore((state) => state.ui.showPreview);
  const assetLibraryWidth = useProjectStore((state) => state.ui.assetLibraryWidth);
  const previewWidth = useProjectStore((state) => state.ui.previewWidth);
  const setProject = useProjectStore((state) => state.setProject);
  const toggleAssetLibrary = useProjectStore((state) => state.toggleAssetLibrary);
  const togglePreview = useProjectStore((state) => state.togglePreview);
  const setAssetLibraryWidth = useProjectStore((state) => state.setAssetLibraryWidth);
  const setPreviewWidth = useProjectStore((state) => state.setPreviewWidth);

  // ドラッグリサイズの状態
  const [isDragging, setIsDragging] = useState<'asset' | 'preview' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);

  // アセットライブラリのリサイズ開始
  const handleAssetResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging('asset');
    setDragStartX(e.clientX);
    setDragStartWidth(assetLibraryWidth);
  }, [assetLibraryWidth]);

  // プレビューのリサイズ開始
  const handlePreviewResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging('preview');
    setDragStartX(e.clientX);
    setDragStartWidth(previewWidth);
  }, [previewWidth]);

  // マウス移動処理
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    
    if (isDragging === 'asset') {
      const newWidth = dragStartWidth + deltaX;
      setAssetLibraryWidth(newWidth);
    } else if (isDragging === 'preview') {
      const newWidth = dragStartWidth - deltaX; // プレビューは右側なので反転
      setPreviewWidth(newWidth);
    }
  }, [isDragging, dragStartX, dragStartWidth, setAssetLibraryWidth, setPreviewWidth]);

  // マウスアップ処理
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // グローバルマウスイベントの設定
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCreateProject = async () => {
    try {
      const projectData = await window.electronAPI.project.create({
        title: '新しいプロジェクト',
        description: '',
        canvas: { width: 800, height: 600 }
      });
      setProject(projectData);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleOpenProject = async () => {
    try {
      const result = await window.electronAPI.fileSystem.showOpenDialog({
        title: 'プロジェクトを開く',
        filters: [{ name: 'Komae Project', extensions: ['komae'] }],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const projectData = await window.electronAPI.project.load(result.filePaths[0]);
        setProject(projectData);
      }
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  const handleCreateSampleProject = () => {
    // アセットを20個生成
    const assets: any = {};
    const imageTypes = ['キャラクター', '背景', 'アイテム', 'エフェクト'];
    const textTypes = ['セリフ', 'ナレーション', 'モノローグ', 'タイトル'];
    
    for (let i = 1; i <= 20; i++) {
      if (i <= 10) {
        // 画像アセット10個
        const imageType = imageTypes[(i - 1) % imageTypes.length];
        assets[`sample-img-${i}`] = {
          id: `sample-img-${i}`,
          type: 'ImageAsset' as const,
          name: `${imageType}${Math.ceil(i / imageTypes.length)}`,
          original_file_path: `/sample/${imageType.toLowerCase()}${i}.png`,
          original_width: 300 + (i * 20),
          original_height: 400 + (i * 30),
          default_pos_x: 50 + (i * 30),
          default_pos_y: 50 + (i * 20),
          default_opacity: 1.0,
          default_mask: [0, 0, 300 + (i * 20), 400 + (i * 30)] as [number, number, number, number],
        };
      } else {
        // テキストアセット10個
        const textIndex = i - 10;
        const textType = textTypes[(textIndex - 1) % textTypes.length];
        const sampleTexts = ['こんにちは！', 'いい天気ですね', 'ありがとう', 'さようなら', 'おはよう', 'こんばんは', 'お疲れ様', 'がんばって', 'いらっしゃいませ', 'また明日'];
        
        assets[`sample-text-${textIndex}`] = {
          id: `sample-text-${textIndex}`,
          type: 'TextAsset' as const,
          name: `${textType}${textIndex}`,
          default_text: sampleTexts[(textIndex - 1) % sampleTexts.length],
          font: 'system-ui',
          stroke_width: 2.0,
          font_size: 20 + textIndex * 2,
          color_ex: '#000000',
          color_in: textIndex % 2 === 0 ? '#FFFFFF' : '#FFE4E1',
          default_pos_x: 400 + (textIndex * 25),
          default_pos_y: 80 + (textIndex * 15),
          vertical: textIndex % 3 === 0,
        };
      }
    }

    // ページを20個生成
    const pages: any[] = [];
    for (let i = 1; i <= 20; i++) {
      const asset_instances: any = {};
      
      // 各ページに2-4個のランダムなアセットインスタンスを配置
      const instanceCount = 2 + (i % 3); // 2-4個
      const usedAssets = new Set<string>();
      
      for (let j = 0; j < instanceCount; j++) {
        let assetKey: string;
        do {
          const assetIndex = Math.floor(Math.random() * 20) + 1;
          assetKey = assetIndex <= 10 ? `sample-img-${assetIndex}` : `sample-text-${assetIndex - 10}`;
        } while (usedAssets.has(assetKey));
        
        usedAssets.add(assetKey);
        
        asset_instances[`instance-${i}-${j}`] = {
          id: `instance-${i}-${j}`,
          asset_id: assetKey,
          z_index: j,
          transform: { 
            scale_x: 0.8 + (Math.random() * 0.4), // 0.8-1.2
            scale_y: 0.8 + (Math.random() * 0.4), // 0.8-1.2
            rotation: (Math.random() - 0.5) * 10  // -5度から5度
          },
          opacity: 0.7 + (Math.random() * 0.3), // 0.7-1.0
        };
      }
      
      pages.push({
        id: `sample-page-${i}`,
        title: `ページ${i}`,
        asset_instances,
      });
    }

    // サンプルプロジェクトデータ
    const sampleProject = {
      metadata: {
        komae_version: '1.0',
        project_version: '1.0',
        title: '大規模サンプルプロジェクト',
        description: 'アセット20個・ページ20個の大規模サンプルプロジェクト',
      },
      canvas: { width: 800, height: 600 },
      asset_attrs: {
        position_attrs: {},
        size_attrs: {},
      },
      assets,
      pages,
    };

    setProject(sampleProject);
  };

  if (!project) {
    return (
      <div className="main-layout">
        <div className="welcome-screen">
          <div className="welcome-content">
            <h1>Komae</h1>
            <p>Create illustration collections</p>
            <div className="welcome-actions">
              <button className="btn-primary" onClick={handleCreateProject}>新規プロジェクト</button>
              <button className="btn-secondary" onClick={handleOpenProject}>プロジェクトを開く</button>
              <button className="btn-secondary" onClick={handleCreateSampleProject}>サンプルプロジェクト</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 動的なグリッドカラムの計算
  const getGridTemplateColumns = () => {
    const parts = [];
    if (showAssetLibrary) {
      parts.push(`${assetLibraryWidth}px`);
    }
    parts.push('1fr');
    if (showPreview) {
      parts.push(`${previewWidth}px`);
    }
    return parts.join(' ');
  };

  // 動的なグリッドテンプレートエリアの計算
  const getGridTemplateAreas = () => {
    if (showAssetLibrary && showPreview) {
      return '"left center right"';
    } else if (showAssetLibrary && !showPreview) {
      return '"left center"';
    } else if (!showAssetLibrary && showPreview) {
      return '"center right"';
    } else {
      return '"center"';
    }
  };

  return (
    <div className="main-layout">
      <div 
        className="layout-grid"
        style={{
          gridTemplateColumns: getGridTemplateColumns(),
          gridTemplateAreas: getGridTemplateAreas(),
        }}
      >
        {/* Left Panel - Asset Library */}
        {showAssetLibrary && (
          <div className="left-panel">
            <AssetLibrary />
            {/* Asset Library Resizer */}
            <div 
              className="panel-resizer asset-resizer"
              onMouseDown={handleAssetResizeStart}
            />
          </div>
        )}

        {/* Center Panel - Spreadsheet */}
        <div className="center-panel">
          <div className="toolbar">
            <div className="toolbar-section left-section">
              {/* Asset非表示時：プロジェクト名の左にボタン */}
              {!showAssetLibrary && (
                <button 
                  className="panel-toggle-btn asset-open-btn"
                  onClick={toggleAssetLibrary}
                  title="アセットライブラリを開く"
                >
                  <PanelExpandLeftIcon />
                </button>
              )}
              
              <span className="project-title">{project.metadata.title}</span>
            </div>
            
            <div className="toolbar-section right-section">
              {/* Preview非表示時：プロジェクト名の右にボタン */}
              {!showPreview && (
                <button 
                  className="panel-toggle-btn preview-open-btn"
                  onClick={togglePreview}
                  title="プレビューウィンドウを開く"
                >
                  <PanelExpandRightIcon />
                </button>
              )}
            </div>
          </div>
          <div className="main-content">
            <EnhancedSpreadsheet />
          </div>
        </div>

        {/* Right Panel - Preview */}
        {showPreview && (
          <div className="right-panel">
            {/* Preview Resizer */}
            <div 
              className="panel-resizer preview-resizer"
              onMouseDown={handlePreviewResizeStart}
            />
            <PreviewArea />
          </div>
        )}
      </div>
    </div>
  );
};
