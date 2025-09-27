import React, { useState, useCallback, useEffect } from 'react';
import {
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
} from '@mui/material';
import {
  Translate,
  Notifications,
  KeyboardArrowDown,
  Tune,
} from '@mui/icons-material';
import { PanelExpandLeftIcon, PanelExpandRightIcon } from '../icons/PanelIcons';
import { generateAssetInstanceId } from '../../../utils/idGenerator';
import { AssetLibrary } from '../asset/AssetLibrary';
import { PreviewArea } from '../preview/PreviewArea';
import { EnhancedSpreadsheet } from '../spreadsheet/EnhancedSpreadsheet';
import { ExportDialog } from '../export/ExportDialog';
import { ProjectCreateDialog } from '../project/ProjectCreateDialog';
import { FontManagementModal } from '../font/FontManagementModal';
import CustomAssetManagementModal from '../customasset/CustomAssetManagementModal';
import { BulkEditModal } from '../text/BulkEditModal';
import { AppSettingsModal } from '../common/AppSettingsModal';
import { useProjectStore } from '../../stores/projectStore';
import { useAppSettingsStore } from '../../stores/appSettingsStore';
import { getRendererLogger, UIPerformanceTracker } from '../../utils/logger';
import { useTheme } from '../../../theme/ThemeContext';
import { getLanguageDisplayName } from '../../../constants/languages';
import type { ImageAsset, TextAsset, ExportOptions, ProjectCreateParams } from '../../../types/entities';

import './MainLayout.css';

export const MainLayout: React.FC = () => {
  const { mode } = useTheme();
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
  const createDefaultProject = useProjectStore((state) => state.createDefaultProject);
  const addNotification = useProjectStore((state) => state.addNotification);

  // App Settings
  const appSettings = useAppSettingsStore((state) => state.settings);
  const loadAppSettings = useAppSettingsStore((state) => state.loadSettings);
  
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
  const [showProjectEditDialog, setShowProjectEditDialog] = useState(false);
  const [showProjectSaveDialog, setShowProjectSaveDialog] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showAppSettingsModal, setShowAppSettingsModal] = useState(false);

  // テーマ変更時にCSS変数を設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  // アプリ起動時の設定読み込みとデフォルトプロジェクト作成
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // アプリ設定を読み込み
        await loadAppSettings();
      } catch (error) {
        console.error('Failed to load app settings:', error);
      }
    };

    initializeApp();
  }, [loadAppSettings]);

  // 設定が読み込まれた後、skipWelcomeScreenの確認とデフォルトプロジェクト作成
  useEffect(() => {
    if (appSettings && !project) {
      if (appSettings.skipWelcomeScreen) {
        console.log('[MainLayout] Skip welcome screen enabled, creating default project');
        createDefaultProject().catch(console.error);
      }
    }
  }, [appSettings, project, createDefaultProject]);

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
      const newWidth = Math.max(200, Math.min(800, dragStartWidth + deltaX)); // 最小200px、最大800px
      setAssetLibraryWidth(newWidth);
    } else if (isDragging === 'preview') {
      const newWidth = Math.max(200, Math.min(800, dragStartWidth - deltaX)); // プレビューは右側なので反転
      setPreviewWidth(newWidth);
    }
  }, [isDragging, dragStartX, dragStartWidth, setAssetLibraryWidth, setPreviewWidth, assetLibraryWidth, previewWidth]);

  // マウスアップ処理
  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // 保存処理（ストアのsaveProject機能を使用）
  const handleSaveProject = useCallback(async () => {
    try {
      // 一時プロジェクトかどうかを確認
      const isTemp = currentProjectPath ?
        await window.electronAPI.tempProject.isTemp(currentProjectPath) : false;

      if (isTemp) {
        // 一時プロジェクトの場合はダイアログを表示
        setShowProjectSaveDialog(true);
      } else {
        // 通常の保存処理
        await saveProject();
      }
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  }, [saveProject, currentProjectPath]);

  // 一時プロジェクト保存処理
  const handleSaveFromTemp = useCallback(async (params: ProjectCreateParams) => {
    try {
      // 親ディレクトリ選択ダイアログを表示
      const saveResult = await window.electronAPI.fileSystem.showDirectorySelectDialog({
        title: `「${params.title}」フォルダを作成する親ディレクトリを選択`
      });

      if (saveResult.canceled || !saveResult.filePaths || saveResult.filePaths.length === 0) {
        // キャンセルされた場合
        addNotification({
          type: 'info',
          title: 'プロジェクト保存がキャンセルされました',
          message: '保存先ディレクトリが選択されませんでした',
          autoClose: true,
          duration: 3000,
        });
        return;
      }

      const parentDir = saveResult.filePaths[0];
      const projectName = params.title;
      const projectDir = `${parentDir}/${projectName}`;

      // 現在のプロジェクトデータを取得
      if (!project) {
        throw new Error('プロジェクトデータが見つかりません');
      }

      // プロジェクトメタデータを更新
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          title: params.title,
          description: params.description,
          supportedLanguages: params.supportedLanguages || project.metadata.supportedLanguages,
          currentLanguage: params.currentLanguage || project.metadata.currentLanguage,
        },
        canvas: params.canvas,
      };

      // 一時プロジェクトを永続プロジェクトに移行
      if (currentProjectPath) {
        await window.electronAPI.tempProject.migrate(currentProjectPath, projectDir);
      } else {
        await window.electronAPI.project.createDirectory(projectDir);
      }

      // 更新されたプロジェクトデータを保存
      const projectFilePath = `${projectDir}/${projectName}.komae`;
      await window.electronAPI.project.save(updatedProject, projectFilePath);

      // プロジェクトパスを更新
      const newProjectPath = await window.electronAPI.project.getCurrentPath();
      setCurrentProjectPath(newProjectPath);

      // ストアのプロジェクトデータを更新
      setProject(updatedProject);

      // 成功通知
      addNotification({
        type: 'success',
        title: 'プロジェクトが保存されました',
        message: `「${projectName}」が ${projectDir} に保存されました`,
        autoClose: true,
        duration: 5000,
      });

    } catch (error) {
      console.error('Failed to save temp project:', error);
      const message = error instanceof Error ? error.message : String(error);
      addNotification({
        type: 'error',
        title: 'プロジェクトの保存に失敗しました',
        message: `エラー: ${message}`,
        autoClose: false,
      });
    }
  }, [project, currentProjectPath, setProject, setCurrentProjectPath, addNotification]);

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

    const unsubscribeAppSettings = window.electronAPI.menu.onAppSettings(() => {
      setShowAppSettingsModal(true);
    });

    return () => {
      unsubscribeSave();
      unsubscribeOpen();
      unsubscribeNew();
      unsubscribeExportProject();
      unsubscribeCustomFonts();
      unsubscribeCustomAssets();
      unsubscribeAppSettings();
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

  // 仕様が落ち着くまでサンプルプロジェクトは廃止
  // const handleCreateSampleProject = () => {
  //   // アセット20個生成
  //   const assets: Record<string, ImageAsset | TextAsset > = {};
  //   const imageTypes: string[] = ['キャラクター', '背景', 'アイテム', 'エフェクト'];
  //   const textTypes: string[] = ['セリフ', 'ナレーション', 'モノローグ', 'タイトル'];

  //   for (let i = 1; i <= 20; i++) {
  //     if (i <= 10) {
  //       // 画像アセット10個
  //       const imageType = imageTypes[(i - 1) % imageTypes.length];
  //       assets[`sample-img-${i}`] = {
  //         id: `sample-img-${i}`,
  //         type: 'ImageAsset' as const,
  //         name: `${imageType}${Math.ceil(i / imageTypes.length)}`,
  //         original_file: {
  //           path: `/sample/${imageType.toLowerCase()}${i}.png`,
  //           originalHeight: 300 + (i * 20),
  //           originalWidth: 400 + (i * 30),
  //           hash: '',
  //           type: 'raster'
  //         },
  //         original_height: 300 + (i * 20),
  //         original_width: 400 + (i * 30),
  //         default_pos_x: 50 + (i * 30),
  //         default_pos_y: 50 + (i * 20),
  //         default_opacity: 1.0,
  //         original_file_path: '', // 旧式のフィールドは未定義
  //         default_width: 400 + (i * 30),
  //         default_height: 300 + (i * 20),
  //         default_z_index: 0,
  //         // default_maskは未定義（テストデータなのでコメントアウト）
  //       };
  //     }
  //   }

  //   // ページ20個生成
  //   const pages: any[] = [];
  //   for (let i = 1; i <= 20; i++) {
  //     const asset_instances: any = {};
      
  //     // 各ページに2-4個のランダムなアセットインスタンスを配置
  //     const instanceCount = 2 + (i % 3); // 2-4個
  //     const usedAssets = new Set<string>();
      
  //     for (let j = 0; j < instanceCount; j++) {
  //       let assetKey: string;
  //       do {
  //         const assetIndex = Math.floor(Math.random() * 20) + 1;
  //         assetKey = assetIndex <= 10 ? `sample-img-${assetIndex}` : `sample-text-${assetIndex - 10}`;
  //       } while (usedAssets.has(assetKey));
        
  //       usedAssets.add(assetKey);
        
  //       const instanceId = generateAssetInstanceId();
  //       asset_instances[instanceId] = {
  //         id: instanceId,
  //         asset_id: assetKey,
  //         z_index: j,
  //         transform: { 
  //           scale_x: 0.8 + (Math.random() * 0.4), // 0.8-1.2
  //           scale_y: 0.8 + (Math.random() * 0.4), // 0.8-1.2
  //           rotation: (Math.random() - 0.5) * 10  // -5度から5度
  //         },
  //         opacity: 0.7 + (Math.random() * 0.3), // 0.7-1.0
  //       };
  //     }
      
  //     pages.push({
  //       id: `sample-page-${i}`,
  //       title: `ページ${i}`,
  //       asset_instances,
  //     });
  //   }

  //   // サンプルプロジェクトデータ
  //   const sampleProject = {
  //     metadata: {
  //       komae_version: '1.0',
  //       project_version: '1.0',
  //       title: '大規模サンプルプロジェクト',
  //       description: 'アセット20個・ページ20個の大規模サンプルプロジェクト',
  //       supportedLanguages: ['ja'],
  //       currentLanguage: 'ja',
  //     },
  //     canvas: { width: 800, height: 600 },
  //     assets,
  //     pages,
  //     fonts: {},
  //     hiddenColumns: [],
  //     hiddenRows: [],
  //   };

  //   setProject(sampleProject);
  // };

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
                  className="btn btn-primary" 
                  onClick={() => setShowProjectCreateDialog(true)}
                >
                  新規プロジェクト
                </button>
                <button className="btn btn-secondary" onClick={handleOpenProjectDialog}>プロジェクトを開く</button>
                {/* <button className="btn btn-secondary" onClick={handleCreateSampleProject}>サンプルプロジェクト</button> */}
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
    const result = parts.join(' ');
    return result;
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
          <div
            className="left-panel"
          >
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
                <IconButton
                  sx={{
                    color: 'text.secondary',
                    height: 28
                  }}
                  onClick={toggleAssetLibrary}
                  title="アセットライブラリを開く"
                >
                  <PanelExpandLeftIcon />
                </IconButton>
              )}
              
              {/* プロジェクト編集ボタン */}
              <Tooltip title="プロジェクト設定を編集">
                <Button
                  color='primary'
                  variant="outlined"
                  size="small"
                  onClick={async () => {
                    try {
                      // 一時プロジェクトかどうかを確認
                      const isTemp = currentProjectPath ?
                        await window.electronAPI.tempProject.isTemp(currentProjectPath) : false;

                      if (isTemp) {
                        // 一時プロジェクトの場合は保存ダイアログを開く
                        addNotification({
                          type: 'info',
                          title: 'プロジェクト編集について',
                          message: '一時プロジェクトの設定を変更するには、まずプロジェクトを保存してください。',
                          autoClose: true,
                          duration: 5000,
                        });
                        setShowProjectSaveDialog(true);
                      } else {
                        // 永続プロジェクトの場合は編集ダイアログを開く
                        setShowProjectEditDialog(true);
                      }
                    } catch (error) {
                      console.error('Failed to check project type:', error);
                      // エラーの場合はデフォルトで編集ダイアログを開く
                      setShowProjectEditDialog(true);
                    }
                  }}
                  sx={{
                    fontSize: '0.5rem',
                    height: 28,
                    p: 1
                  }}
                >
                  <Tune />
                </Button>
              </Tooltip>
              
              {/* TextAsset Bulk Edit ボタン */}
              <Tooltip title="テキストアセット一括編集">
                <Button
                  color='primary'
                  onClick={() => setShowBulkEditModal(true)}
                  size="small"
                  variant="outlined"
                  sx={{
                    transition: 'all 0.1s ease',
                    height: 28,
                    '&:hover': {
                      transition: 'all 0.1s ease'
                    },
                    '& .MuiTouchRipple-root': {
                      '& .MuiTouchRipple-child': {
                        animationDuration: '10ms'
                      }
                    }
                  }}
                >
                  <Translate />
                </Button>
              </Tooltip>

              {/* 言語切り替えドロップダウン */}
              <FormControl size="small" sx={{ minWidth: 120 }} color='primary'>
                <Select
                  value={getCurrentLanguage()}
                  onChange={(event) => {
                    const newLanguage = event.target.value as string;
                    setCurrentLanguage(newLanguage);
                    addNotification({
                      type: 'info',
                      title: '言語切り替え',
                      message: `表示言語を${getLanguageDisplayName(newLanguage)}に変更しました`,
                      autoClose: true,
                      duration: 2000,
                    });
                  }}
                  IconComponent={KeyboardArrowDown}
                  sx={{
                    fontSize: '0.75rem',
                    height: 28,
                    '& .MuiSelect-select': {
                      py: 0.5,
                      px: 1
                    }
                  }}
                >
                  {getSupportedLanguages().map(langCode => (
                    <MenuItem key={langCode} value={langCode} sx={{ fontSize: '0.813rem' }}>
                      {getLanguageDisplayName(langCode)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="toolbar-section right-section">
              {/* テスト用通知ボタン（開発中のみ） */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<Notifications />}
                onClick={handleTestNotification}
                sx={{ display: 'none', fontSize: '0.75rem' }} // Hidden in production
              >
                通知テスト
              </Button>

              {/* Preview非表示時：プロジェクト名の右にボタン */}
              {!showPreview && (
                <IconButton
                  sx={{
                    color: 'text.secondary',
                    height: 28
                  }}
                  className="panel-toggle-btn preview-open-btn"
                  onClick={togglePreview}
                  title="プレビューウィンドウを開く"
                >
                  <PanelExpandRightIcon />
                </IconButton>
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

      {/* プロジェクト編集ダイアログ */}
      <ProjectCreateDialog
        isOpen={showProjectEditDialog}
        onClose={() => setShowProjectEditDialog(false)}
        mode="edit"
        existingProject={project}
      />

      {/* 一時プロジェクト保存ダイアログ */}
      <ProjectCreateDialog
        isOpen={showProjectSaveDialog}
        onClose={() => setShowProjectSaveDialog(false)}
        mode="save"
        existingProject={project}
        onSaveFromTemp={handleSaveFromTemp}
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

      {/* アプリケーション設定ダイアログ */}
      <AppSettingsModal
        isOpen={showAppSettingsModal}
        onClose={() => setShowAppSettingsModal(false)}
      />
    </div>
  );
};
