import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, Button, useTheme } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Image as ImageIcon, Pentagon as DvaOutIcon, Autorenew as DvaInIcon, Pentagon as PentagonIcon, TextFields as TextFieldsIcon, Functions as FunctionsIcon} from '@mui/icons-material';

import { useProjectStore } from '../../stores/projectStore';
import { getRendererLogger, UIPerformanceTracker } from '../../utils/logger';
import { PanelCollapseLeftIcon } from '../icons/PanelIcons';
import { AssetThumbnail } from './AssetThumbnail';
import { GraphicEditModal } from './GraphicEditModal';
import { TextEditModal } from './TextEditModal';
import { DynamicVectorEditModal } from './DynamicVectorEditModal';
import { ValueEditModal } from './ValueEditModal';
import CustomAssetManagementModal from '../customasset/CustomAssetManagementModal';
import type { Asset, ImageAsset, TextAsset, VectorAsset, DynamicVectorAsset, ValueAsset } from '../../../types/entities';
import { createValueAsset, createDynamicVectorAsset } from '../../../types/entities';
import { getSupportedExtensions } from '@/types/fileType';
import './AssetLibrary.css';

// ElectronのFile拡張インターフェース
interface ElectronFile extends File {
  path?: string;
}

export const AssetLibrary: React.FC = () => {
  const theme = useTheme();
  const assets = useProjectStore((state) => state.project?.assets || {});
  const selectedAssets = useProjectStore((state) => state.ui.selectedAssets);
  const selectAssets = useProjectStore((state) => state.selectAssets);
  const importAsset = useProjectStore((state) => state.importAsset);
  const addAsset = useProjectStore((state) => state.addAsset);
  const deleteAsset = useProjectStore((state) => state.deleteAsset);
  const updateAsset = useProjectStore((state) => state.updateAsset);
  const toggleAssetLibrary = useProjectStore((state) => state.toggleAssetLibrary);
  const [draggedAsset, setDraggedAsset] = useState<string | null>(null);
  const [editingImageAsset, setEditingImageAsset] = useState<ImageAsset | null>(null);
  const [editingTextAsset, setEditingTextAsset] = useState<TextAsset | null>(null);
  const [editingVectorAsset, setEditingVectorAsset] = useState<VectorAsset | null>(null);
  const [editingDynamicVectorAsset, setEditingDynamicVectorAsset] = useState<DynamicVectorAsset | null>(null);
  const [editingValueAsset, setEditingValueAsset] = useState<ValueAsset | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    asset: Asset;
  } | null>(null);
  const [contextMenuAnchor, setContextMenuAnchor] = useState<null | HTMLElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCustomAssetManagementModal, setShowCustomAssetManagementModal] = useState(false);
  const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const logger = getRendererLogger();

  const assetList = Object.values(assets);

  // コンテキストメニューと作成メニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        handleCreateMenuClose();
      }
    };

    if (contextMenu || showCreateMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu, showCreateMenu]);

  const handleAssetClick = (assetId: string, ctrlKey: boolean) => {
    // コンテキストメニューを閉じる
    setContextMenu(null);

    logger.logUserInteraction('asset_select', 'AssetLibrary', {
      assetId,
      ctrlKey,
      selectionType: ctrlKey ? 'multiple' : 'single',
      currentSelection: selectedAssets.length,
    });

    if (ctrlKey) {
      // 複数選択
      const isSelected = selectedAssets.includes(assetId);
      if (isSelected) {
        selectAssets(selectedAssets.filter(id => id !== assetId));
      } else {
        selectAssets([...selectedAssets, assetId]);
      }
    } else {
      // 単一選択
      selectAssets([assetId]);
    }
  };

  const handleAssetRightClick = (event: React.MouseEvent, asset: Asset) => {
    event.preventDefault();

    logger.logUserInteraction('asset_right_click', 'AssetLibrary', {
      assetId: asset.id,
      assetType: asset.type,
      assetName: asset.name,
      mouseX: event.clientX,
      mouseY: event.clientY,
    });

    setContextMenuAnchor(event.currentTarget as HTMLElement);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      asset: asset,
    });
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      logger.logUserInteraction('asset_edit_open_context', 'AssetLibrary', {
        assetId: contextMenu.asset.id,
        assetName: contextMenu.asset.name,
        assetType: contextMenu.asset.type,
      });

      if (contextMenu.asset.type === 'ImageAsset') {
        setEditingImageAsset(contextMenu.asset as ImageAsset);
      } else if (contextMenu.asset.type === 'TextAsset') {
        setEditingTextAsset(contextMenu.asset as TextAsset);
      } else if (contextMenu.asset.type === 'VectorAsset') {
        setEditingVectorAsset(contextMenu.asset as VectorAsset);
      } else if (contextMenu.asset.type === 'DynamicVectorAsset') {
        setEditingDynamicVectorAsset(contextMenu.asset as DynamicVectorAsset);
      } else if (contextMenu.asset.type === 'ValueAsset') {
        setEditingValueAsset(contextMenu.asset as ValueAsset);
      }
    }
    setContextMenu(null);
  };

  const handleContextMenuDelete = async () => {
    if (contextMenu) {
      const confirmed = confirm(`アセット "${contextMenu.asset.name}" を削除しますか？`);
      if (confirmed) {
        logger.logUserInteraction('asset_delete_context', 'AssetLibrary', {
          assetId: contextMenu.asset.id,
          assetName: contextMenu.asset.name,
        });
        await deleteAsset(contextMenu.asset.id);
        selectAssets(selectedAssets.filter(id => id !== contextMenu.asset.id));
      }
    }
    setContextMenu(null);
    setContextMenuAnchor(null);
    setContextMenuAnchor(null);
  };

  const handleAssetDoubleClick = (asset: Asset) => {
    logger.logUserInteraction('asset_double_click', 'AssetLibrary', {
      assetId: asset.id,
      assetType: asset.type,
      assetName: asset.name,
    });

    if (asset.type === 'ImageAsset') {
      logger.logUserInteraction('asset_edit_open', 'ImageAsset', {
        assetId: asset.id,
        assetName: asset.name,
      });
      setEditingImageAsset(asset as ImageAsset);
    } else if (asset.type === 'TextAsset') {
      logger.logUserInteraction('asset_edit_open', 'TextAsset', {
        assetId: asset.id,
        assetName: asset.name,
      });
      setEditingTextAsset(asset as TextAsset);
    } else if (asset.type === 'VectorAsset') {
      logger.logUserInteraction('asset_edit_open', 'VectorAsset', {
        assetId: asset.id,
        assetName: asset.name,
      });
      setEditingVectorAsset(asset as VectorAsset);
    } else if (asset.type === 'DynamicVectorAsset') {
      logger.logUserInteraction('asset_edit_open', 'DynamicVectorAsset', {
        assetId: asset.id,
        assetName: asset.name,
      });
      setEditingDynamicVectorAsset(asset as DynamicVectorAsset);
    } else if (asset.type === 'ValueAsset') {
      logger.logUserInteraction('asset_edit_open', 'ValueAsset', {
        assetId: asset.id,
        assetName: asset.name,
      });
      setEditingValueAsset(asset as ValueAsset);
    }
  };

  const handleImageModalClose = () => {
    setEditingImageAsset(null);
  };

  const handleTextModalClose = () => {
    setEditingTextAsset(null);
  };

  const handleVectorModalClose = () => {
    setEditingVectorAsset(null);
  };

  const handleGraphicAssetSave = (updatedAsset: ImageAsset | VectorAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    logger.logUserInteraction('asset_save', 'AssetLibrary', {
      assetId: updatedAsset.id,
      assetName: updatedAsset.name,
      assetType: updatedAsset.type,
    });
  };

  const handleTextAssetSave = (updatedAsset: TextAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    logger.logUserInteraction('asset_save', 'AssetLibrary', {
      assetId: updatedAsset.id,
      assetName: updatedAsset.name,
      assetType: 'TextAsset',
    });
  };


  const handleDynamicVectorAssetSave = (updatedAsset: DynamicVectorAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    logger.logUserInteraction('asset_save', 'AssetLibrary', {
      assetId: updatedAsset.id,
      assetName: updatedAsset.name,
      assetType: 'DynamicVectorAsset',
    });
  };

  const handleValueAssetSave = (updatedAsset: ValueAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    logger.logUserInteraction('asset_save', 'AssetLibrary', {
      assetId: updatedAsset.id,
      assetName: updatedAsset.name,
      assetType: 'ValueAsset',
    });
  };

  const handleDynamicVectorModalClose = () => {
    setEditingDynamicVectorAsset(null);
  };

  const handleValueModalClose = () => {
    setEditingValueAsset(null);
  };

  const handleCreateMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setCreateMenuAnchor(event.currentTarget);
    setShowCreateMenu(true);
  };

  const handleCreateMenuClose = () => {
    setCreateMenuAnchor(null);
    setShowCreateMenu(false);
  };

  const handleCreateTextAsset = async () => {
    try {
      await logger.logUserInteraction('text_asset_create', 'AssetLibrary', {
        currentAssetCount: assetList.length,
      });

      // TextAssetを作成
      const result = await window.electronAPI.asset.createTextAsset('New Text', 'テキスト');

      if (result.success && result.asset) {
        // TextAssetは直接プロジェクトに追加
        addAsset(result.asset);
        await logger.logUserInteraction('text_asset_create_success', 'AssetLibrary', {
          assetId: result.asset.id,
          assetName: result.asset.name,
        });
      } else {
        throw new Error(result.error || 'TextAssetの作成に失敗しました');
      }
    } catch (error) {
      await logger.logUserInteraction('text_asset_create_error', 'AssetLibrary', {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error('TextAsset作成エラー:', error);
    } finally {
      setShowCreateMenu(false);
    }
  };

  const handleCreateValueAsset = async () => {
      await logger.logUserInteraction('value_asset_create', 'AssetLibrary', {
        currentAssetCount: assetList.length,
      });
      // ValueAssetを作成
      const project = useProjectStore.getState().project;
      const result = createValueAsset({
          value_type: 'string',
          initial_value: 'Initial Value',
          new_page_behavior: 'reset',
          project: project,
        });
      addAsset(result);
      await logger.logUserInteraction('value_asset_create_success', 'AssetLibrary', {
        assetId: result.id,
        assetName: result.name,
      });
      setShowCreateMenu(false);
  };

  const handleCreateDynamicVectorAsset = async () => {
    await logger.logUserInteraction('dynamic_vector_asset_create', 'AssetLibrary', {
      currentAssetCount: assetList.length,
    });

    handleCreateMenuClose();
    setShowCustomAssetManagementModal(true);
  };

  const handleCustomAssetManagementModalClose = () => {
    setShowCustomAssetManagementModal(false);
  };

  const handleCustomAssetSelect = async (customAssetInfo: any) => {
    try {
      await logger.logUserInteraction('dynamic_vector_asset_create_from_custom', 'AssetLibrary', {
        customAssetId: customAssetInfo.id,
        customAssetName: customAssetInfo.name,
        currentAssetCount: assetList.length,
      });

      // CustomAssetの完全なオブジェクトを取得
      const customAsset = await window.electronAPI.customAsset.getAsset(customAssetInfo.id);

      if (!customAsset) {
        throw new Error(`CustomAsset with ID "${customAssetInfo.id}" not found`);
      }

      // CustomAssetベースのDynamicVectorAssetを作成
      const result = createDynamicVectorAsset({
        customAsset, // 完全なCustomAssetオブジェクトを渡す
        name: `${customAssetInfo.name} (カスタム図形)`,
      });

      addAsset(result);

      await logger.logUserInteraction('dynamic_vector_asset_create_from_custom_success', 'AssetLibrary', {
        assetId: result.id,
        assetName: result.name,
        customAssetId: customAssetInfo.id,
      });

      setShowCustomAssetManagementModal(false);

      // 作成後すぐに編集モードで開く
      setEditingDynamicVectorAsset(result);
    } catch (error) {
      await logger.logUserInteraction('dynamic_vector_asset_create_from_custom_error', 'AssetLibrary', {
        error: error instanceof Error ? error.message : String(error),
        customAssetId: customAssetInfo.id,
      });
      console.error('CustomAssetベースのDynamicVectorAsset作成エラー:', error);
    }
  };

  const handleImportImageAsset = async () => {
    handleCreateMenuClose(); // メニューを閉じる
    const tracker = new UIPerformanceTracker('asset_import_dialog');

    try {
      await logger.logUserInteraction('asset_import_dialog_open', 'AssetLibrary', {
        currentAssetCount: assetList.length,
      });

      const result = await window.electronAPI?.fileSystem?.showOpenDialog({
        title: '画像アセットをインポート',
        filters: [
          { name: '画像ファイル', extensions: getSupportedExtensions() },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      await tracker.end({ dialogResult: result.canceled ? 'canceled' : 'confirmed' });

      if (!result.canceled && result.filePaths.length > 0) {
        await logger.logUserInteraction('asset_import_start', 'AssetLibrary', {
          fileCount: result.filePaths.length,
          filePaths: result.filePaths.map((p: string) => p.split('/').pop() || p), // ファイル名のみをログ
        });

        let successCount = 0;
        let errorCount = 0;

        for (const filePath of result.filePaths) {
          try {
            await importAsset(filePath);
            successCount++;
          } catch (error) {
            errorCount++;
            const message = error instanceof Error ? error.message : String(error);
            await logger.logError('asset_import_file', error as Error, {
              filePath: filePath.split('/').pop() || filePath,
              component: 'AssetLibrary',
            });
            alert(`ファイル "${filePath}" のインポートに失敗しました:\n${message}`);
          }
        }

        await logger.logUserInteraction('asset_import_complete', 'AssetLibrary', {
          totalFiles: result.filePaths.length,
          successCount,
          errorCount,
          newAssetCount: assetList.length,
        });
      }
    } catch (error) {
      await logger.logError('asset_import_dialog', error as Error, {
        component: 'AssetLibrary',
      });
      console.error('Failed to import assets:', error);
      alert('アセットのインポートに失敗しました');
    }
  };

  const handleDeleteClick = async () => {
    if (selectedAssets.length === 0) return;

    logger.logUserInteraction('asset_delete_confirm', 'AssetLibrary', {
      selectedCount: selectedAssets.length,
      selectedAssets: selectedAssets,
    });

    const confirmed = confirm(`選択した${selectedAssets.length}個のアセットを削除しますか？`);
    if (confirmed) {
      logger.logUserInteraction('asset_delete_execute', 'AssetLibrary', {
        deletedCount: selectedAssets.length,
        deletedAssets: selectedAssets,
      });

      // 非同期処理として各アセットを削除
      try {
        for (const assetId of selectedAssets) {
          await deleteAsset(assetId);
        }
        selectAssets([]);
      } catch (error) {
        console.error('Failed to delete assets:', error);
        logger.logError('asset_delete_batch', error as Error, {
          selectedAssets,
          component: 'AssetLibrary',
        });
        alert('アセットの削除中にエラーが発生しました');
      }
    } else {
      logger.logUserInteraction('asset_delete_cancel', 'AssetLibrary', {
        selectedCount: selectedAssets.length,
      });
    }
  };

  const handleDragStart = (assetId: string) => {
    logger.logUserInteraction('asset_drag_start', 'AssetLibrary', {
      assetId,
      assetName: assets[assetId]?.name,
    });
    setDraggedAsset(assetId);
  };

  const handleDragEnd = () => {
    if (draggedAsset) {
      logger.logUserInteraction('asset_drag_end', 'AssetLibrary', {
        assetId: draggedAsset,
      });
    }
    setDraggedAsset(null);
  };

  // ファイルドラッグ&ドロップのハンドラー
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // ファイルがドラッグされている場合のみ処理
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // ドラッグがAssetLibrary要素から完全に離れた場合のみ処理
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files) as ElectronFile[];
    const supportedFiles = files.filter(file =>
      file.type.startsWith('image/') ||
      file.type === 'image/svg+xml' ||
      /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(file.name)
    );

    if (supportedFiles.length === 0) {
      alert('画像ファイルまたはSVGファイルをドロップしてください');
      return;
    }

    await logger.logUserInteraction('asset_drag_drop_start', 'AssetLibrary', {
      fileCount: supportedFiles.length,
      fileNames: supportedFiles.map(f => f.name),
    });

    let successCount = 0;
    let errorCount = 0;

    for (const file of supportedFiles) {
      try {
        console.log('Drag&Drop Debug:', {
          fileName: file.name,
          filePath: file.path,
          finalPath: file.path || file.name,
          fileSize: file.size,
          fileType: file.type
        });

        // ファイルパスが取得できない場合は、FileReaderでファイル内容を読み取り
        if (!file.path) {
          // FileReaderを使用してファイル内容をArrayBufferとして読み取り
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
          });

          // ファイル内容をUint8Arrayに変換
          const uint8Array = new Uint8Array(arrayBuffer);

          // メインプロセスに一時ファイル作成を依頼
          const tempFilePath = await window.electronAPI?.fileSystem?.createTempFile?.(file.name, uint8Array);
          if (tempFilePath) {
            await importAsset(tempFilePath);
          } else {
            throw new Error('一時ファイルの作成に失敗しました');
          }
        } else {
          // ファイルパスが取得できる場合は直接インポート
          await importAsset(file.path);
        }

        successCount++;
      } catch (error) {
        errorCount++;
        const message = error instanceof Error ? error.message : String(error);
        await logger.logError('asset_drag_drop_file', error as Error, {
          fileName: file.name,
          component: 'AssetLibrary',
        });
        alert(`ファイル "${file.name}" のインポートに失敗しました:\n${message}`);
      }
    }

    await logger.logUserInteraction('asset_drag_drop_complete', 'AssetLibrary', {
      totalFiles: supportedFiles.length,
      successCount,
      errorCount,
      newAssetCount: assetList.length,
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        ...(isDragOver && {
          bgcolor: 'action.hover',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: '2px dashed',
            borderColor: 'primary.main',
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            zIndex: 1,
          }
        })
      }}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1,
        borderBottom: '2px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={toggleAssetLibrary}
            size="small"
            title="アセットライブラリを閉じる"
            sx={{
              color: 'text.secondary',
              ml: 2,
              pr: 1,
              height: 28
            }}
          >
            <PanelCollapseLeftIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={handleCreateMenuClick}
            size="small"
            title="アセットを作成"
            sx={{
              height: 28,
              bgcolor: 'action.hover',
              '&:hover': {
                bgcolor: 'action.selected'
              }
            }}
          >
            <AddIcon />
          </IconButton>
          <Menu
            anchorEl={createMenuAnchor}
            open={showCreateMenu}
            onClose={handleCreateMenuClose}
            PaperProps={{
              sx: {
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider'
              }
            }}
          >
            <MenuItem onClick={handleImportImageAsset}>
              <ImageIcon sx={{ mr: 1 }} /> 画像/SVG
            </MenuItem>
            <MenuItem onClick={handleCreateDynamicVectorAsset}>
              {/** Pentagon と DataObject のアイコンを重ねる*/}
              <Box sx={{ position: 'relative', width: 24, height: 24, mr: 1 }}>
                <DvaOutIcon sx={{ position: 'absolute', top: 0, left: 0, fontSize: 24, color: 'text.primary' }} />
                <DvaInIcon sx={{ position: 'absolute', top: 4.5, left: 4, fontSize: 16, color: 'background.default' }} />
              </Box>
              カスタム図形
            </MenuItem>
            <MenuItem onClick={handleCreateTextAsset}>
              <TextFieldsIcon sx={{ mr: 1 }} /> テキスト
            </MenuItem>
            <MenuItem onClick={handleCreateValueAsset}>
              <FunctionsIcon sx={{ mr: 1 }} /> 値
            </MenuItem>
          </Menu>
          <IconButton
            onClick={handleDeleteClick}
            disabled={selectedAssets.length === 0}
            size="small"
            title="選択したアセットを削除"
            sx={{
              height: 28,
              color: selectedAssets.length === 0 ? 'text.disabled' : 'error.main',
              '&:hover': {
                bgcolor: selectedAssets.length === 0 ? 'transparent' : 'error.light'
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        p: 1,
        '&::-webkit-scrollbar': {
          width: '8px'
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'action.hover',
          borderRadius: '4px',
          '&:hover': {
            bgcolor: 'action.selected'
          }
        }
      }}>
        {assetList.length === 0 ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60%',
            textAlign: 'center',
            gap: 2
          }}>
            <Typography variant="body2" color="text.secondary">
              アセットがありません
            </Typography>
            <Button
              onClick={handleImportImageAsset}
              variant="contained"
              size="small"
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              ファイルをインポート
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              画像またはSVGファイルをここにドロップ
            </Typography>
          </Box>
        ) : (
          assetList.map((asset) => (
            <AssetItem
              key={asset.id}
              asset={asset}
              isSelected={selectedAssets.includes(asset.id)}
              isDragged={draggedAsset === asset.id}
              onClick={handleAssetClick}
              onDoubleClick={handleAssetDoubleClick}
              onRightClick={handleAssetRightClick}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </Box>

      {/* コンテキストメニュー */}
      <Menu
        anchorEl={contextMenuAnchor}
        open={!!contextMenu}
        onClose={() => {
          setContextMenu(null);
          setContextMenuAnchor(null);
        }}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        {contextMenu && (contextMenu.asset.type === 'ImageAsset' || contextMenu.asset.type === 'TextAsset' || contextMenu.asset.type === 'VectorAsset' || contextMenu.asset.type === 'DynamicVectorAsset' || contextMenu.asset.type === 'ValueAsset') && (
          <MenuItem onClick={handleContextMenuEdit}>
            編集
          </MenuItem>
        )}
        <MenuItem
          onClick={handleContextMenuDelete}
          sx={{ color: 'error.main' }}
        >
          削除
        </MenuItem>
      </Menu>

      {/* ImageAsset編集モーダル */}
      {editingImageAsset && (
        <GraphicEditModal
          mode="asset"
          asset={editingImageAsset}
          isOpen={!!editingImageAsset}
          onClose={handleImageModalClose}
          onSaveAsset={handleGraphicAssetSave}
        />
      )}

      {/* TextAsset編集モーダル */}
      {editingTextAsset && (
        <TextEditModal
          mode="asset"
          asset={editingTextAsset}
          isOpen={!!editingTextAsset}
          onClose={handleTextModalClose}
          onSaveAsset={handleTextAssetSave}
        />
      )}

      {/* VectorAsset編集モーダル */}
      {editingVectorAsset && (
        <GraphicEditModal
          mode="asset"
          asset={editingVectorAsset}
          isOpen={!!editingVectorAsset}
          onClose={handleVectorModalClose}
          onSaveAsset={handleGraphicAssetSave}
        />
      )}

      {/* DynamicVectorAsset編集モーダル */}
      {editingDynamicVectorAsset && (
        <DynamicVectorEditModal
          mode="asset"
          asset={editingDynamicVectorAsset}
          isOpen={!!editingDynamicVectorAsset}
          onClose={handleDynamicVectorModalClose}
          onSaveAsset={handleDynamicVectorAssetSave}
        />
      )}

      {/* ValueAsset編集モーダル */}
      {editingValueAsset && (
        <ValueEditModal
          mode="asset"
          asset={editingValueAsset}
          isOpen={!!editingValueAsset}
          onClose={handleValueModalClose}
          onSaveAsset={handleValueAssetSave}
        />
      )}

      {/* CustomAsset選択モーダル */}
      <CustomAssetManagementModal
        isOpen={showCustomAssetManagementModal}
        onClose={handleCustomAssetManagementModalClose}
        mode="selection"
        onCreateAsset={handleCustomAssetSelect}
      />
    </Box>
  );
};

interface AssetItemProps {
  asset: Asset;
  isSelected: boolean;
  isDragged: boolean;
  onClick: (assetId: string, ctrlKey: boolean) => void;
  onDoubleClick: (asset: Asset) => void;
  onRightClick: (event: React.MouseEvent, asset: Asset) => void;
  onDragStart: (assetId: string) => void;
  onDragEnd: () => void;
}

const AssetItem: React.FC<AssetItemProps> = ({
  asset,
  isSelected,
  isDragged,
  onClick,
  onDoubleClick,
  onRightClick,
  onDragStart,
  onDragEnd,
}) => {
  const theme = useTheme();

  const renderThumbnail = () => {
    switch (asset.type) {
      case 'ImageAsset':
      case 'VectorAsset':
      case 'DynamicVectorAsset':
        return <AssetThumbnail asset={asset} maxWidth={48} maxHeight={48} />;
      case 'TextAsset':
        return (
          <Box sx={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            color: 'text.primary',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: '4px'
          }}>
            <TextFieldsIcon fontSize="inherit" />
          </Box>
        );
      case 'ValueAsset':
        return (
          <Box sx={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            color: 'text.primary',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: '4px'
          }}>
            <FunctionsIcon fontSize="inherit" />
          </Box>
        );
      default:
        return (
          <Box sx={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            color: 'text.primary',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: '4px'
          }}>
            ?
          </Box>
        );
    }
  };

  const getAssetTypeLabel = (): string => {
    switch (asset.type) {
      case 'ImageAsset':
        return '画像';
      case 'TextAsset':
        return 'テキスト';
      case 'ValueAsset':
        return '値';
      case 'VectorAsset':
        return 'ベクター';
      case 'DynamicVectorAsset':
        return '動的ベクター';
      default:
        // TypeScript never到達の警告を回避
        return (asset as any).type || 'Unknown';
    }
  };

  return (
    <Box
      draggable
      onClick={(e: React.MouseEvent) => onClick(asset.id, e.ctrlKey || e.metaKey)}
      onDoubleClick={() => onDoubleClick(asset)}
      onContextMenu={(e) => onRightClick(e, asset)}
      onDragStart={() => onDragStart(asset.id)}
      onDragEnd={onDragEnd}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        borderRadius: '8px',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        border: '1px solid',
        borderColor: 'transparent',
        mb: 1,
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        opacity: isDragged ? 0.5 : 1,
        transform: isDragged ? 'scale(0.95)' : 'scale(1)',
        '&:hover': {
          bgcolor: isSelected ? 'action.selected' : 'action.hover',
          borderColor: 'primary.light'
        },
        ...(isSelected && {
          bgcolor: 'primary.light',
          borderColor: 'primary.main',
          '&:hover': {
            bgcolor: 'primary.light'
          }
        })
      }}
    >
      <Box sx={{ minWidth: 48, height: 48 }}>
        {renderThumbnail()}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={asset.name}
        >
          {asset.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block'
          }}
        >
          {getAssetTypeLabel()}
        </Typography>
        {asset.type === 'ImageAsset' && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.7rem'
            }}
            title={(asset as ImageAsset).original_file.path}
          >
            {(asset as ImageAsset).original_file.path}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
