import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { getRendererLogger, UIPerformanceTracker } from '../../utils/logger';
import { PanelCollapseLeftIcon } from '../icons/PanelIcons';
import { AssetThumbnail } from './AssetThumbnail';
import { ImageEditModal } from './ImageEditModal';
import { TextEditModal } from './TextEditModal';
import { VectorEditModal } from './VectorEditModal';
import type { Asset, ImageAsset, TextAsset, VectorAsset } from '../../../types/entities';
import './AssetLibrary.css';

// ElectronのFile拡張インターフェース
interface ElectronFile extends File {
  path?: string;
}

export const AssetLibrary: React.FC = () => {
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
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    asset: Asset;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
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
        setShowCreateMenu(false);
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

  const handleImageAssetSave = (updatedAsset: ImageAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    logger.logUserInteraction('asset_save', 'AssetLibrary', {
      assetId: updatedAsset.id,
      assetName: updatedAsset.name,
      assetType: 'ImageAsset',
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

  const handleVectorAssetSave = (updatedAsset: VectorAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    logger.logUserInteraction('asset_save', 'AssetLibrary', {
      assetId: updatedAsset.id,
      assetName: updatedAsset.name,
      assetType: 'VectorAsset',
    });
  };

  const handleCreateMenuClick = () => {
    setShowCreateMenu(!showCreateMenu);
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

  const handleImportImageAsset = async () => {
    setShowCreateMenu(false); // メニューを閉じる
    const tracker = new UIPerformanceTracker('asset_import_dialog');
    
    try {
      await logger.logUserInteraction('asset_import_dialog_open', 'AssetLibrary', {
        currentAssetCount: assetList.length,
      });

      const result = await window.electronAPI?.fileSystem?.showOpenDialog({
        title: '画像アセットをインポート',
        filters: [
          { name: '画像ファイル', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
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

  const handleImportVectorAsset = async () => {
    setShowCreateMenu(false); // メニューを閉じる
    const tracker = new UIPerformanceTracker('asset_import_dialog');
    
    try {
      await logger.logUserInteraction('asset_import_dialog_open', 'AssetLibrary', {
        currentAssetCount: assetList.length,
        assetType: 'vector',
      });

      const result = await window.electronAPI?.fileSystem?.showOpenDialog({
        title: 'SVGアセットをインポート',
        filters: [
          { name: 'SVGファイル', extensions: ['svg'] },
        ],
        properties: ['openFile', 'multiSelections'],
      });

      await tracker.end({ dialogResult: result.canceled ? 'canceled' : 'confirmed' });

      if (!result.canceled && result.filePaths.length > 0) {
        await logger.logUserInteraction('asset_import_start', 'AssetLibrary', {
          fileCount: result.filePaths.length,
          filePaths: result.filePaths.map((p: string) => p.split('/').pop() || p), // ファイル名のみをログ
          assetType: 'vector',
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
              assetType: 'vector',
            });
            alert(`ファイル "${filePath}" のインポートに失敗しました:\n${message}`);
          }
        }

        await logger.logUserInteraction('asset_import_complete', 'AssetLibrary', {
          totalFiles: result.filePaths.length,
          successCount,
          errorCount,
          newAssetCount: assetList.length,
          assetType: 'vector',
        });
      }
    } catch (error) {
      await logger.logError('asset_import_dialog', error as Error, {
        component: 'AssetLibrary',
        assetType: 'vector',
      });
      console.error('Failed to import SVG assets:', error);
      alert('SVGアセットのインポートに失敗しました');
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
    <div 
      className={`asset-library ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
    >
      <div className="asset-library-header">
        <div className="header-left">
          <button 
            className="panel-toggle-btn asset-close-btn"
            onClick={toggleAssetLibrary}
            title="アセットライブラリを閉じる"
          >
            <PanelCollapseLeftIcon />
          </button>
          <h3>アセット</h3>
        </div>
        <div className="asset-actions">
          <div className="create-asset-dropdown" ref={createMenuRef}>
            <button className="btn-icon" onClick={handleCreateMenuClick} title="アセットを作成">
              +
            </button>
            {showCreateMenu && (
              <div className="create-menu">
                <button className="create-menu-item" onClick={handleImportImageAsset}>
                  🖼️ 画像
                </button>
                <button className="create-menu-item" onClick={handleImportVectorAsset}>
                  📐 SVG
                </button>
                <button className="create-menu-item" onClick={handleCreateTextAsset}>
                  🔤 テキスト
                </button>
              </div>
            )}
          </div>
          <button 
            className="btn-icon" 
            onClick={handleDeleteClick}
            disabled={selectedAssets.length === 0}
            title="選択したアセットを削除"
          >
            ×
          </button>
        </div>
      </div>

      <div className="asset-list scrollbar-large">
        {assetList.length === 0 ? (
          <div className="empty-state">
            <p>アセットがありません</p>
            <button className="btn-small" onClick={handleImportImageAsset}>
              画像アセットをインポート
            </button>
            <p style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
              または画像ファイルをここにドラッグ&ドロップ
            </p>
          </div>
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
      </div>

      {/* コンテキストメニュー */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000,
          }}
        >
          {(contextMenu.asset.type === 'ImageAsset' || contextMenu.asset.type === 'TextAsset' || contextMenu.asset.type === 'VectorAsset') && (
            <button
              className="context-menu-item"
              onClick={handleContextMenuEdit}
            >
              編集
            </button>
          )}
          <button
            className="context-menu-item context-menu-delete"
            onClick={handleContextMenuDelete}
          >
            削除
          </button>
        </div>
      )}

      {/* ImageAsset編集モーダル */}
      {editingImageAsset && (
        <ImageEditModal
          mode="asset"
          asset={editingImageAsset}
          isOpen={!!editingImageAsset}
          onClose={handleImageModalClose}
          onSaveAsset={handleImageAssetSave}
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
        <VectorEditModal
          mode="asset"
          asset={editingVectorAsset}
          isOpen={!!editingVectorAsset}
          onClose={handleVectorModalClose}
          onSaveAsset={handleVectorAssetSave}
        />
      )}
    </div>
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
  return (
    <div
      className={`asset-item ${isSelected ? 'selected' : ''} ${isDragged ? 'dragged' : ''}`}
      draggable
      onClick={(e) => onClick(asset.id, e.ctrlKey || e.metaKey)}
      onDoubleClick={() => onDoubleClick(asset)}
      onContextMenu={(e) => onRightClick(e, asset)}
      onDragStart={() => onDragStart(asset.id)}
      onDragEnd={onDragEnd}
    >
      <div className="asset-thumbnail">
        {asset.type === 'ImageAsset' ? (
          <AssetThumbnail asset={asset as ImageAsset} />
        ) : (
          <div className="text-placeholder">T</div>
        )}
      </div>
      <div className="asset-info">
        <div className="asset-name" title={asset.name}>
          {asset.name}
        </div>
        <div className="asset-type">
          {asset.type === 'ImageAsset' ? '画像' : 'テキスト'}
        </div>
        {asset.type === 'ImageAsset' && (
          <div className="asset-path" title={asset.original_file_path}>
            {asset.original_file_path}
          </div>
        )}
      </div>
    </div>
  );
};
