import React, { useState, useCallback } from 'react';
import { AssetLibrary } from '../asset/AssetLibrary';
import { PreviewArea } from '../preview/PreviewArea';
import { EnhancedSpreadsheet } from '../spreadsheet/EnhancedSpreadsheet';
import { ExportDialog } from '../export/ExportDialog';
import { ProjectCreateDialog } from '../project/ProjectCreateDialog';
import { FontManagementModal } from '../font/FontManagementModal';
import CustomAssetManagementModal from '../customasset/CustomAssetManagementModal';
import { BulkEditModal } from '../text/BulkEditModal';
import { PanelExpandLeftIcon, PanelExpandRightIcon } from '../icons/PanelIcons';
import { useProjectStore } from '../../stores/projectStore';
import { getRendererLogger, UIPerformanceTracker } from '../../utils/logger';
import { getLanguageDisplayName } from '../../../constants/languages';
import type { ExportOptions } from '../../../types/entities';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  const showAssetLibrary = useProjectStore((state) => state.ui.showAssetLibrary);
  const showPreview = useProjectStore((state) => state.ui.showPreview);
  const showFontManagement = useProjectStore((state) => state.ui.showFontManagement);
  const showCustomAssetManagement = useProjectStore((state) => state.ui.showCustomAssetManagement);
  const assetLibraryWidth = useProjectStore((state) => state.ui.assetLibraryWidth);
  const previewWidth = useProjectStore((state) => state.ui.previewWidth);
  const setProject = useProjectStore((state) => state.setProject);
  const setCurrentProjectPath = useProjectStore((state) => state.setCurrentProjectPath);
  const toggleAssetLibrary = useProjectStore((state) => state.toggleAssetLibrary);
  const togglePreview = useProjectStore((state) => state.togglePreview);
  const toggleFontManagement = useProjectStore((state) => state.toggleFontManagement);
  const toggleCustomAssetManagement = useProjectStore((state) => state.toggleCustomAssetManagement);
  const setAssetLibraryWidth = useProjectStore((state) => state.setAssetLibraryWidth);
  const setPreviewWidth = useProjectStore((state) => state.setPreviewWidth);
  const saveProject = useProjectStore((state) => state.saveProject);
  const loadProject = useProjectStore((state) => state.loadProject);
  const addNotification = useProjectStore((state) => state.addNotification);
  
  // 多言語機能
  const getCurrentLanguage = useProjectStore((state) => state.getCurrentLanguage);
  const getSupportedLanguages = useProjectStore((state) => state.getSupportedLanguages);
  const setCurrentLanguage = useProjectStore((state) => state.setCurrentLanguage);

  // ドラッグリサイズの状態
  const [isDragging, setIsDragging] = useState<'asset' | 'preview' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartWidth, setDragStartWidth] = useState(0);

  // ダイアログの状態
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showProjectCreateDialog, setShowProjectCreateDialog] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

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

  // 保存処理（ストアのsaveProject機能を使用）
  const handleSaveProject = useCallback(async () => {
    try {
      await saveProject();
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  }, [saveProject]);

  // テスト用通知ボタン（開発中のみ）
  // エクスポート処理
  const handleExport = useCallback(async (options: ExportOptions) => {
    const logger = getRendererLogger();
    const tracker = new UIPerformanceTracker('export_project');

    try {
      await logger.logUserInteraction('export_start', 'MainLayout', {
        format: options.format,
        projectName: options.title,
        pageCount: project?.pages.length || 0
      });

      // ExportServiceを使用して実際のエクスポートを実行
      if (!project) {
        throw new Error('プロジェクトが読み込まれていません');
      }

      const outputPath = await window.electronAPI.project.export(project, options.format, options);
      
      addNotification({
        type: 'success',
        title: 'エクスポート完了',
        message: `${options.format.toUpperCase()}形式でのエクスポートが完了しました。\n出力先: ${outputPath}`,
        duration: 5000
      });

      await tracker.end({ success: true, format: options.format });

    } catch (error) {
      console.error('エクスポートエラー:', error);

      addNotification({
        type: 'error',
        title: 'エクスポート失敗',
        message: `エクスポート中にエラーが発生しました: ${error}`,
        duration: 8000
      });

      await logger.logError('export_failed', error as Error, {
        format: options.format,
        projectName: options.title
      });

      await tracker.end({ success: false, error: String(error) });
    }
  }, [project, addNotification]);

  const handleTestNotification = useCallback(() => {
    addNotification({
      type: 'success',
      title: 'テスト通知',
      message: '通知システムが正常に動作しています',
      autoClose: true,
      duration: 3000,
    });
  }, [addNotification]);

  // メニューイベントの設定
  React.useEffect(() => {
    const unsubscribeSave = window.electronAPI.menu.onSaveProject(() => {
      handleSaveProject();
    });

    const unsubscribeOpen = window.electronAPI.menu.onOpenProject((filePath) => {
      // メニューからの場合は既にパスが渡されるので直接読み込む
      // UIボタンからの場合はファイルダイアログを表示
      if (filePath) {
        loadProjectFromPath(filePath);
      } else {
        handleOpenProjectDialog();
      }
    });

    const unsubscribeNew = window.electronAPI.menu.onNewProject(() => {
      setShowProjectCreateDialog(true);
    });

    const unsubscribeExportProject = window.electronAPI.menu.onExportProject(() => {
      setShowExportDialog(true);
    });

    const unsubscribeCustomFonts = window.electronAPI.menu.onCustomFonts(() => {
      toggleFontManagement();
    });

    const unsubscribeCustomAssets = window.electronAPI.menu.onCustomAssets(() => {
      toggleCustomAssetManagement();
    });

    return () => {
      unsubscribeSave();
      unsubscribeOpen();
      unsubscribeNew();
      unsubscribeExportProject();
      unsubscribeCustomFonts();
      unsubscribeCustomAssets();
    };
  }, [handleSaveProject]);

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

  // 言語ドロップダウンの外側クリック処理
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.language-selector-container')) {
        setShowLanguageDropdown(false);
      }
    };

    if (showLanguageDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showLanguageDropdown]);

  // 旧式のプロジェクト作成（ウェルカム画面のボタン用）
  const handleCreateProjectLegacy = async () => {
    try {
      // プロジェクトの保存先を選択
      const result = await window.electronAPI.fileSystem.showSaveDialog({
        title: '新しいプロジェクトを作成',
        defaultPath: '新しいプロジェクト',
      });

      if (!result.canceled && result.filePath) {
        // プロジェクトディレクトリを作成
        await window.electronAPI.project.createDirectory(result.filePath);
        
        // プロジェクトデータを作成（デフォルトサイズ）
        const projectData = await window.electronAPI.project.create({
          title: 'プロジェクト',
          description: '',
          canvas: { width: 800, height: 600 },
          supportedLanguages: ['ja'],
          currentLanguage: 'ja',
        });
        
        // プロジェクトを保存
        await window.electronAPI.project.save(projectData, result.filePath);
        
        setProject(projectData);
        setCurrentProjectPath(result.filePath);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  // ファイルダイアログ経由でプロジェクトを開く
  const handleOpenProjectDialog = async () => {
    try {
      const result = await window.electronAPI.fileSystem.showOpenDialog({
        title: 'プロジェクトを開く',
        filters: [{ name: 'Komae Project', extensions: ['komae'] }],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        await loadProjectFromPath(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  // 指定されたパスからプロジェクトを読み込む
  const loadProjectFromPath = async (filePath: string) => {
    try {
      await loadProject(filePath);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const handleCreateSampleProject = () => {
    // アセット20個生成
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
          // default_maskは未定義（テストデータなのでコメントアウト）
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
          stroke_color: '#000000',
          fill_color: textIndex % 2 === 0 ? '#FFFFFF' : '#FFE4E1',
          default_pos_x: 400 + (textIndex * 25),
          default_pos_y: 80 + (textIndex * 15),
          opacity: 1.0,
          leading: 0,
          vertical: textIndex % 3 === 0,
        };
      }
    }

    // ページ20個生成
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
        supportedLanguages: ['ja'],
        currentLanguage: 'ja',
      },
      canvas: { width: 800, height: 600 },
      assets,
      pages,
      fonts: {},
    };

    setProject(sampleProject);
  };

  if (!project) {
    return (
      <>
        <div className="main-layout">
          <div className="welcome-screen">
            <div className="welcome-content">
              <h1>Komae</h1>
              <p>Create illustration collections</p>
              <div className="welcome-actions">
                <button 
                  className="btn-primary" 
                  onClick={() => setShowProjectCreateDialog(true)}
                >
                  新規プロジェクト
                </button>
                <button className="btn-secondary" onClick={handleOpenProjectDialog}>プロジェクトを開く</button>
                <button className="btn-secondary" onClick={handleCreateSampleProject}>サンプルプロジェクト</button>
              </div>
            </div>
          </div>
        </div>
        
        {/* ウェルカム画面でもダイアログを表示 */}
        <ProjectCreateDialog
          isOpen={showProjectCreateDialog}
          onClose={() => setShowProjectCreateDialog(false)}
        />
      </>
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
              
              {/* プロジェクト編集ボタン */}
              <button 
                className="project-edit-btn"
                onClick={() => {
                  addNotification({
                    type: 'info',
                    title: 'プロジェクト設定',
                    message: 'プロジェクト設定機能は現在開発中です',
                    autoClose: true,
                    duration: 3000,
                  });
                }}
                title="プロジェクト設定を編集"
              >
                Project
              </button>
              
              {/* 言語切り替えドロップダウン */}
              <div className="language-selector-container">
                <div className="language-selector">
                  <span className="language-display">
                    {getLanguageDisplayName(getCurrentLanguage())}
                  </span>
                  <button
                    className="language-dropdown-btn"
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    title="表示言語を切り替え"
                  >
                    <span className="dropdown-arrow">▼</span>
                  </button>
                </div>
                
                {showLanguageDropdown && (
                  <div className="language-dropdown">
                    {getSupportedLanguages().map(langCode => (
                      <div
                        key={langCode}
                        className={`language-dropdown-item ${
                          langCode === getCurrentLanguage() ? 'active' : ''
                        }`}
                        onClick={() => {
                          setCurrentLanguage(langCode);
                          setShowLanguageDropdown(false);
                          addNotification({
                            type: 'info',
                            title: '言語切り替え',
                            message: `表示言語を${getLanguageDisplayName(langCode)}に変更しました`,
                            autoClose: true,
                            duration: 2000,
                          });
                        }}
                      >
                        {getLanguageDisplayName(langCode)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* TextAsset Bulk Edit ボタン */}
              <button 
                className="bulk-edit-btn"
                onClick={() => setShowBulkEditModal(true)}
                title="テキストアセット一括編集"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 2h12v2H9v10H7V4H2V2z"/>
                </svg>
              </button>
              
            </div>
            
            <div className="toolbar-section right-section">
              {/* テスト用通知ボタン（開発中のみ） */}
              <button 
                className="btn-secondary"
                onClick={handleTestNotification}
                title="テスト通知を表示"
                style={{ marginRight: '8px', fontSize: '12px', padding: '4px 8px', display: 'none' }} // 開発中のみ表示
              >
                📢 通知テスト
              </button>
              
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

        {/* ダイアログ群 */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          onExport={handleExport}
        />
      </div>
      
      {/* プロジェクト作成ダイアログ */}
      <ProjectCreateDialog
        isOpen={showProjectCreateDialog}
        onClose={() => setShowProjectCreateDialog(false)}
      />

      {/* フォント管理ダイアログ */}
      <FontManagementModal
        isOpen={showFontManagement}
        onClose={() => toggleFontManagement()}
      />
      
      {/* CustomAsset 管理ダイアログ */}
      <CustomAssetManagementModal
        isOpen={showCustomAssetManagement}
        onClose={() => toggleCustomAssetManagement()}
      />
      
      {/* TextAsset Bulk Edit ダイアログ */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
      />
    </div>
  );
};
