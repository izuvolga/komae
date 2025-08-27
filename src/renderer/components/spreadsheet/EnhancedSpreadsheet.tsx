import React, { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { PageThumbnail } from './PageThumbnail';
import { ImageEditModal } from '../asset/ImageEditModal';
import { TextEditModal } from '../asset/TextEditModal';
import { VectorEditModal } from '../asset/VectorEditModal';
import { ValueEditModal } from '../asset/ValueEditModal';
import { DynamicVectorEditModal } from '../asset/DynamicVectorEditModal';
import type { Asset, ImageAsset, ImageAssetInstance, TextAsset, TextAssetInstance, VectorAsset, VectorAssetInstance, ValueAsset, ValueAssetInstance, DynamicVectorAsset, DynamicVectorAssetInstance, Page, AssetInstance } from '../../../types/entities';
import { hasAssetInstanceOverrides, resetAssetInstanceOverrides, getEffectiveTextValue } from '../../../types/entities';
import { getEffectiveValueAssetValue, getRawValueAssetValue } from '../../../utils/valueEvaluation';
import { ColumnContextMenu } from './ColumnContextMenu';
import { RowContextMenu } from './RowContextMenu';
import { CellContextMenu } from './CellContextMenu';
import { CursorOverlay } from './CursorOverlay';
import { ColumnDragOverlay } from './ColumnDragOverlay';
import { getCustomProtocolUrl } from '../../utils/imageUtils';
import { scrollCursorIntoView } from '../../utils/scrollUtils';
import './EnhancedSpreadsheet.css';
import './PageThumbnail.css';
import './ColumnContextMenu.css';
import './RowContextMenu.css';
import './CellContextMenu.css';

export const EnhancedSpreadsheet: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const cursor = useProjectStore((state) => state.ui.cursor);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  const addPage = useProjectStore((state) => state.addPage);
  const insertPageAt = useProjectStore((state) => state.insertPageAt);
  const deletePage = useProjectStore((state) => state.deletePage);
  const updatePage = useProjectStore((state) => state.updatePage);
  const setCurrentPage = useProjectStore((state) => state.setCurrentPage);
  const toggleAssetInstance = useProjectStore((state) => state.toggleAssetInstance);
  const updateAssetInstance = useProjectStore((state) => state.updateAssetInstance);
  const showAssetLibrary = useProjectStore((state) => state.ui.showAssetLibrary);
  const showPreview = useProjectStore((state) => state.ui.showPreview);
  const assetLibraryWidth = useProjectStore((state) => state.ui.assetLibraryWidth);
  const previewWidth = useProjectStore((state) => state.ui.previewWidth);
  const hiddenColumns = useProjectStore((state) => state.ui.hiddenColumns);
  const hiddenRows = useProjectStore((state) => state.ui.hiddenRows);
  const hideColumn = useProjectStore((state) => state.hideColumn);
  const showColumn = useProjectStore((state) => state.showColumn);
  const hideRow = useProjectStore((state) => state.hideRow);
  const showRow = useProjectStore((state) => state.showRow);
  const reorderAssets = useProjectStore((state) => state.reorderAssets);


  // 多言語機能
  const getCurrentLanguage = useProjectStore((state) => state.getCurrentLanguage);
  const currentLanguage = getCurrentLanguage(); // 言語変更時の再レンダリング用

  // カーソル機能
  const setCursor = useProjectStore((state) => state.setCursor);
  const moveCursor = useProjectStore((state) => state.moveCursor);
  const copyCell = useProjectStore((state) => state.copyCell);
  const pasteCell = useProjectStore((state) => state.pasteCell);

  const [draggedAsset, setDraggedAsset] = useState<string | null>(null);
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined);

  // ドラッグ&ドロップの状態管理
  const [columnDragState, setColumnDragState] = useState({
    isDragging: false,
    draggedAssetId: null as string | null,
    draggedAssetIndex: -1,
    currentMouseX: 0,
    originalRect: null as DOMRect | null,
    insertIndex: -1,
  });
  const [editingImageInstance, setEditingImageInstance] = useState<{
    instance: ImageAssetInstance;
    asset: ImageAsset;
    page: Page;
  } | null>(null);

  const [editingTextInstance, setEditingTextInstance] = useState<{
    instance: TextAssetInstance;
    asset: TextAsset;
    page: Page;
  } | null>(null);

  const [editingVectorInstance, setEditingVectorInstance] = useState<{
    instance: VectorAssetInstance;
    asset: VectorAsset;
    page: Page;
  } | null>(null);

  const [editingValueInstance, setEditingValueInstance] = useState<{
    instance: ValueAssetInstance;
    asset: ValueAsset;
    page: Page;
  } | null>(null);

  const [editingDynamicVectorInstance, setEditingDynamicVectorInstance] = useState<{
    instance: DynamicVectorAssetInstance;
    asset: DynamicVectorAsset;
    page: Page;
  } | null>(null);

  // 右クリックメニュー用のstate
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
    asset: any;
  }>({
    isVisible: false,
    position: { x: 0, y: 0 },
    asset: null,
  });

  // 行の右クリックメニュー用のstate
  const [rowContextMenu, setRowContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
    page: Page | null;
    pageIndex: number;
  }>({
    isVisible: false,
    position: { x: 0, y: 0 },
    page: null,
    pageIndex: -1,
  });

  // セルの右クリックメニュー用のstate
  const [cellContextMenu, setCellContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
    assetInstance: AssetInstance | null;
    asset: any;
    page: Page | null;
  }>({
    isVisible: false,
    position: { x: 0, y: 0 },
    assetInstance: null,
    asset: null,
    page: null,
  });

  // インライン編集用のstate
  const [inlineEditState, setInlineEditState] = useState<{
    isEditing: boolean;
    assetInstanceId: string | null;
    pageId: string | null;
    text: string;
  }>({
    isEditing: false,
    assetInstanceId: null,
    pageId: null,
    text: '',
  });

  // ValueAsset用インライン編集用のstate
  const [valueInlineEditState, setValueInlineEditState] = useState<{
    isEditing: boolean;
    assetInstanceId: string | null;
    pageId: string | null;
    value: any;
  }>({
    isEditing: false,
    assetInstanceId: null,
    pageId: null,
    value: '',
  });

  // ページタイトル編集用のstate
  const [titleEditState, setTitleEditState] = useState<{
    isEditing: boolean;
    pageId: string | null;
    title: string;
  }>({
    isEditing: false,
    pageId: null,
    title: '',
  });

  // パン機能用のstate
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });
  const [panStartScroll, setPanStartScroll] = useState({ x: 0, y: 0 });
  const spreadsheetRef = React.useRef<HTMLDivElement>(null);

  if (!project) return null;

  const pages = Object.values(project.pages);
  const assets = Object.values(project.assets);

  // 非表示でないアセット・ページのフィルタリング
  const visibleAssets = assets.filter(asset => !hiddenColumns.includes(asset.id));
  const visiblePages = pages.filter(page => !hiddenRows.includes(page.id));

  // 中央パネルの最大幅を計算
  useEffect(() => {
    const calculateMaxWidth = () => {
      const windowWidth = window.innerWidth;
      let availableWidth = windowWidth;

      // アセットライブラリが表示されている場合はその幅を引く
      if (showAssetLibrary) {
        availableWidth -= assetLibraryWidth;
      }

      // プレビューが表示されている場合はその幅を引く
      if (showPreview) {
        availableWidth -= previewWidth;
      }

      // 最小幅を保証
      const finalWidth = Math.max(availableWidth, 300);
      setMaxWidth(finalWidth);
    };

    // 初期計算
    calculateMaxWidth();

    // ウィンドウリサイズ監視
    window.addEventListener('resize', calculateMaxWidth);

    // レンダリング後の再計算（タイミング問題対応）
    const timeoutId = setTimeout(calculateMaxWidth, 0);

    return () => {
      window.removeEventListener('resize', calculateMaxWidth);
      clearTimeout(timeoutId);
    };
  }, [showAssetLibrary, showPreview, assetLibraryWidth, previewWidth]);

  // パン機能のイベントハンドラー
  useEffect(() => {
    const container = spreadsheetRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      // 中ボタン（ホイールボタン）の場合のみパン開始
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        setPanStartPos({ x: e.clientX, y: e.clientY });
        setPanStartScroll({ x: container.scrollLeft, y: container.scrollTop });
        document.body.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;

      e.preventDefault();
      const deltaX = e.clientX - panStartPos.x;
      const deltaY = e.clientY - panStartPos.y;

      // パン方向を逆にする（ドラッグ方向と逆方向にスクロール）
      const newScrollX = panStartScroll.x - deltaX;
      const newScrollY = panStartScroll.y - deltaY;

      container.scrollLeft = newScrollX;
      container.scrollTop = newScrollY;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && isPanning) {
        e.preventDefault();
        setIsPanning(false);
        document.body.style.cursor = '';
      }
    };

    // コンテキストメニューを無効化（中ボタンクリック時）
    const handleContextMenu = (e: MouseEvent) => {
      if (isPanning) {
        e.preventDefault();
      }
    };

    console.log('Adding mouse event listeners for panning');

    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isPanning, panStartPos, panStartScroll]);

  const handleAddPage = () => {
    const pageNumber = pages.length + 1;
    const newPage = {
      id: `page-${Date.now()}`,
      title: '',
      asset_instances: {},
    };
    addPage(newPage);
  };

  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) {
      alert('最後のページは削除できません');
      return;
    }

    const confirmed = confirm('このページを削除しますか？');
    if (confirmed) {
      deletePage(pageId);
    }
  };

  const handleCellClick = (pageId: string, assetId: string) => {
    setCursor(pageId, assetId);
  };

  const handleToggleClick = (pageId: string, assetId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // セルのクリックイベントと衝突を防ぐ
    setCursor(pageId, assetId);
    toggleAssetInstance(pageId, assetId);
  };

  // キーボード操作用のセルリセット関数
  const handleResetCellByKeyboard = (pageId: string, assetId: string) => {
    const page = project.pages.find(p => p.id === pageId);
    const asset = project.assets[assetId];

    if (!page || !asset) return;

    // そのページでアセットインスタンスを検索
    const instance = Object.values(page.asset_instances).find(
      (inst: AssetInstance) => inst.asset_id === assetId
    );

    if (instance) {
      const resetUpdates = resetAssetInstanceOverrides(instance, asset.type);
      const updatedInstance = { ...instance, ...resetUpdates };
      updateAssetInstance(pageId, instance.id, updatedInstance);
    }
  };

  const handleEditClick = (pageId: string, assetId: string) => {
    const page = project.pages.find(p => p.id === pageId);
    const asset = project.assets[assetId];

    if (!page || !asset) return;

    // そのページでアセットインスタンスを検索
    const instance = Object.values(page.asset_instances).find(
      (inst: AssetInstance) => inst.asset_id === assetId
    );

    if (instance) {
      if (asset.type === 'ImageAsset') {
        setEditingImageInstance({
          instance: instance as ImageAssetInstance,
          asset: asset as ImageAsset,
          page,
        });
      } else if (asset.type === 'TextAsset') {
        // TextAssetの場合は、インライン編集を開始
        handleStartInlineEdit(instance as TextAssetInstance, page);
      } else if (asset.type === 'VectorAsset') {
        setEditingVectorInstance({
          instance: instance as VectorAssetInstance,
          asset: asset as VectorAsset,
          page,
        });
      } else if (asset.type === 'ValueAsset') {
        setEditingValueInstance({
          instance: instance as ValueAssetInstance,
          asset: asset as ValueAsset,
          page,
        });
      } else if (asset.type === 'DynamicVectorAsset') {
        setEditingDynamicVectorInstance({
          instance: instance as DynamicVectorAssetInstance,
          asset: asset as DynamicVectorAsset,
          page,
        });
      }
    }
  };

  // キーボードナビゲーション用のuseEffect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('Key down event:', e.key);
      // フォーカスがある場合やインライン編集中の場合はキーボードナビゲーションを無効化
      if (document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement ||
          inlineEditState.isEditing ||
          valueInlineEditState.isEditing ||
          titleEditState.isEditing) {
        return;
      }

      // 現在のカーソル位置を取得
      const currentCursor = cursor;
      console.log('Current cursor state:', currentCursor);
      if (!currentCursor) return;

      const currentPageIndex = visiblePages.findIndex(page => page.id === currentCursor.pageId);

      // プレビューセルの場合の処理
      if (currentCursor.assetId === 'preview') {
        if (currentPageIndex === -1) return;

        let newPageIndex = currentPageIndex;

        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            newPageIndex = Math.max(0, currentPageIndex - 1);
            break;

          case 'ArrowDown':
            e.preventDefault();
            newPageIndex = Math.min(visiblePages.length - 1, currentPageIndex + 1);
            break;

          case 'ArrowLeft':
            e.preventDefault();
            // プレビューセルからは左に移動できない
            return;

          case 'ArrowRight':
            e.preventDefault();
            // プレビューセルから最初のアセットセルに移動
            if (visibleAssets.length > 0 && currentCursor.pageId) {
              const firstAsset = visibleAssets[0];
              setCursor(currentCursor.pageId, firstAsset.id);

              setTimeout(() => {
                if (spreadsheetRef.current && currentCursor.pageId) {
                  scrollCursorIntoView(spreadsheetRef.current, currentCursor.pageId, firstAsset.id);
                }
              }, 50);
            }
            return;

          case 'Enter':
            e.preventDefault();
            // プレビューセルでEnterキーが押された場合は何もしない（既にプレビューは表示されている）
            return;

          default:
            return;
        }

        // 上下移動の場合は同じくプレビューセルに移動
        if (newPageIndex !== currentPageIndex) {
          const newPage = visiblePages[newPageIndex];
          if (newPage) {
            console.log(`Moving cursor to preview cell in page ${newPageIndex}`);
            setCursor(newPage.id, 'preview');
            // プレビューセルに移動した時にプレビューを更新
            setCurrentPage(newPage.id);

            setTimeout(() => {
              if (spreadsheetRef.current) {
                scrollCursorIntoView(spreadsheetRef.current, newPage.id, 'preview');
              }
            }, 50);
          }
        }
        return;
      }

      // 通常のアセットセルの場合の処理
      const currentAssetIndex = visibleAssets.findIndex(asset => asset.id === currentCursor.assetId);
      if (currentPageIndex === -1 || currentAssetIndex === -1) return;

      let newPageIndex = currentPageIndex;
      let newAssetIndex = currentAssetIndex;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newPageIndex = Math.max(0, currentPageIndex - 1);
          break;

        case 'ArrowDown':
          e.preventDefault();
          newPageIndex = Math.min(visiblePages.length - 1, currentPageIndex + 1);
          break;

        case 'ArrowLeft':
          e.preventDefault();
          // 最初のアセットから左に移動する場合はプレビューセルに移動
          if (currentAssetIndex === 0 && currentCursor.pageId) {
            setCursor(currentCursor.pageId, 'preview');
            // プレビューセルに移動した時にプレビューを更新
            setCurrentPage(currentCursor.pageId);

            setTimeout(() => {
              if (spreadsheetRef.current && currentCursor.pageId) {
                scrollCursorIntoView(spreadsheetRef.current, currentCursor.pageId, 'preview');
              }
            }, 50);
            return;
          } else {
            newAssetIndex = Math.max(0, currentAssetIndex - 1);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          newAssetIndex = Math.min(visibleAssets.length - 1, currentAssetIndex + 1);
          break;

        case 'Enter':
          e.preventDefault();
          // Enterキーでセルの編集を開始
          if (currentCursor.pageId && currentCursor.assetId) {
            handleEditClick(currentCursor.pageId, currentCursor.assetId);
          }
          return;

        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          // Delete/Backspaceキーでセルをリセット
          if (currentCursor.pageId && currentCursor.assetId) {
            handleResetCellByKeyboard(currentCursor.pageId, currentCursor.assetId);
          }
          return;

        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Ctrl+C でコピー
            if (currentCursor.pageId && currentCursor.assetId) {
              copyCell(currentCursor.pageId, currentCursor.assetId);
            }
            return;
          }
          break;

        case 'v':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Ctrl+V でペースト
            if (currentCursor.pageId && currentCursor.assetId) {
              pasteCell(currentCursor.pageId, currentCursor.assetId);
            }
            return;
          }
          break;

        default:
          return;
      }

      console.log(`Current cursor: page ${currentPageIndex}, asset ${currentAssetIndex}`);
      // 新しいカーソル位置を設定
      if (newPageIndex !== currentPageIndex || newAssetIndex !== currentAssetIndex) {
        const newPage = visiblePages[newPageIndex];
        const newAsset = visibleAssets[newAssetIndex];
        if (newPage && newAsset) {
          console.log(`Moving cursor to page ${newPageIndex}, asset ${newAssetIndex}`);
          setCursor(newPage.id, newAsset.id);

          // カーソル移動後に自動スクロールを実行（少し遅延を入れてDOM更新を待つ）
          setTimeout(() => {
            if (spreadsheetRef.current) {
              scrollCursorIntoView(spreadsheetRef.current, newPage.id, newAsset.id);
            }
          }, 50);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    cursor,
    visiblePages,
    visibleAssets,
    inlineEditState.isEditing,
    valueInlineEditState.isEditing,
    titleEditState.isEditing,
    setCursor,
    copyCell,
    pasteCell,
    handleEditClick,
    handleResetCellByKeyboard
  ]);

  const handleImageInstanceSave = (updatedInstance: ImageAssetInstance) => {
    if (editingImageInstance) {
      updateAssetInstance(editingImageInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingImageInstance(null);
  };

  const handleTextInstanceSave = (updatedInstance: TextAssetInstance) => {
    if (editingTextInstance) {
      updateAssetInstance(editingTextInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingTextInstance(null);
  };

  const handleImageModalClose = () => {
    setEditingImageInstance(null);
  };

  const handleTextModalClose = () => {
    setEditingTextInstance(null);
  };

  const handleVectorInstanceSave = (updatedInstance: VectorAssetInstance) => {
    if (editingVectorInstance) {
      updateAssetInstance(editingVectorInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingVectorInstance(null);
  };

  const handleVectorModalClose = () => {
    setEditingVectorInstance(null);
  };

  const handleValueInstanceSave = (updatedInstance: ValueAssetInstance) => {
    if (editingValueInstance) {
      updateAssetInstance(editingValueInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingValueInstance(null);
  };

  const handleValueModalClose = () => {
    setEditingValueInstance(null);
  };

  const handleDynamicVectorInstanceSave = (updatedInstance: DynamicVectorAssetInstance) => {
    if (editingDynamicVectorInstance) {
      updateAssetInstance(editingDynamicVectorInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingDynamicVectorInstance(null);
  };

  const handleDynamicVectorModalClose = () => {
    setEditingDynamicVectorInstance(null);
  };

  // 右クリックメニュー関連のハンドラー
  const handleColumnContextMenu = (e: React.MouseEvent, asset: any) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      isVisible: true,
      position: { x: e.clientX, y: e.clientY },
      asset: asset,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu({
      isVisible: false,
      position: { x: 0, y: 0 },
      asset: null,
    });
    setRowContextMenu({
      isVisible: false,
      position: { x: 0, y: 0 },
      page: null,
      pageIndex: -1,
    });
    setCellContextMenu({
      isVisible: false,
      position: { x: 0, y: 0 },
      assetInstance: null,
      asset: null,
      page: null,
    });
  };

  // セル右クリックのハンドラー
  const handleCellRightClick = (e: React.MouseEvent, assetInstance: AssetInstance, asset: any, page: Page) => {
    e.preventDefault();
    e.stopPropagation();

    // 他のコンテキストメニューを閉じる
    setContextMenu({ isVisible: false, position: { x: 0, y: 0 }, asset: null });
    setRowContextMenu({ isVisible: false, position: { x: 0, y: 0 }, page: null, pageIndex: -1 });

    setCellContextMenu({
      isVisible: true,
      position: { x: e.clientX, y: e.clientY },
      assetInstance: assetInstance,
      asset: asset,
      page: page,
    });
  };

  // セルのリセット機能
  const handleResetCell = () => {
    if (!cellContextMenu.assetInstance || !cellContextMenu.asset || !cellContextMenu.page) return;

    const resetUpdates = resetAssetInstanceOverrides(cellContextMenu.assetInstance, cellContextMenu.asset.type);
    const updatedInstance = { ...cellContextMenu.assetInstance, ...resetUpdates };
    updateAssetInstance(cellContextMenu.page.id, cellContextMenu.assetInstance.id, updatedInstance);
    handleContextMenuClose();
  };

  // インライン編集のハンドラー
  const handleStartInlineEdit = (assetInstance: TextAssetInstance, page: Page) => {
    const currentLang = getCurrentLanguage();
    const currentText = getEffectiveTextValue(
      project.assets[assetInstance.asset_id] as TextAsset,
      assetInstance,
      currentLang
    );

    setInlineEditState({
      isEditing: true,
      assetInstanceId: assetInstance.id,
      pageId: page.id,
      text: currentText,
    });
  };

  const handleSaveInlineEdit = () => {
    if (!inlineEditState.assetInstanceId || !inlineEditState.pageId) return;

    const assetInstance = Object.values(project.pages).find(p => p.id === inlineEditState.pageId)
      ?.asset_instances[inlineEditState.assetInstanceId] as TextAssetInstance;

    if (!assetInstance) return;

    const currentLang = getCurrentLanguage();

    // 新バージョン: multilingual_text を更新
    const updatedInstance = {
      ...assetInstance,
      multilingual_text: {
        ...assetInstance.multilingual_text,
        [currentLang]: inlineEditState.text
      }
    };

    updateAssetInstance(inlineEditState.pageId, inlineEditState.assetInstanceId, updatedInstance);

    setInlineEditState({
      isEditing: false,
      assetInstanceId: null,
      pageId: null,
      text: '',
    });
  };

  const handleCancelInlineEdit = () => {
    setInlineEditState({
      isEditing: false,
      assetInstanceId: null,
      pageId: null,
      text: '',
    });
  };

  // ValueAssetインライン編集のハンドラー
  const handleStartValueInlineEdit = (assetInstance: ValueAssetInstance, asset: ValueAsset, page: Page) => {
    // 数式型の場合は生の値を取得、それ以外は評価後の値を取得
    const currentValue = asset.value_type === 'formula'
      ? getRawValueAssetValue(asset, page)
      : getEffectiveValueAssetValue(asset, project, page, pages.findIndex(p => p.id === page.id));

    setValueInlineEditState({
      isEditing: true,
      assetInstanceId: assetInstance.id,
      pageId: page.id,
      value: currentValue,
    });
  };;

  const handleSaveValueInlineEdit = () => {
    if (!valueInlineEditState.assetInstanceId || !valueInlineEditState.pageId) return;

    const assetInstance = Object.values(project.pages).find(p => p.id === valueInlineEditState.pageId)
      ?.asset_instances[valueInlineEditState.assetInstanceId] as ValueAssetInstance;

    if (!assetInstance) return;

    // ValueAssetInstanceのoverride_valueを更新
    const updatedInstance = {
      ...assetInstance,
      override_value: valueInlineEditState.value
    };

    updateAssetInstance(valueInlineEditState.pageId, valueInlineEditState.assetInstanceId, updatedInstance);

    setValueInlineEditState({
      isEditing: false,
      assetInstanceId: null,
      pageId: null,
      value: '',
    });
  };

  const handleCancelValueInlineEdit = () => {
    setValueInlineEditState({
      isEditing: false,
      assetInstanceId: null,
      pageId: null,
      value: '',
    });
  };

  // ページタイトル編集のハンドラー
  const handleStartTitleEdit = (page: Page) => {
    setTitleEditState({
      isEditing: true,
      pageId: page.id,
      title: page.title || '',
    });
  };

  const handleSaveTitleEdit = () => {
    if (!titleEditState.pageId) return;

    updatePage(titleEditState.pageId, { title: titleEditState.title });

    setTitleEditState({
      isEditing: false,
      pageId: null,
      title: '',
    });
  };

  const handleCancelTitleEdit = () => {
    setTitleEditState({
      isEditing: false,
      pageId: null,
      title: '',
    });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitleEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelTitleEdit();
    }
  };

  // 列全体の操作ハンドラー
  const handleShowAllInColumn = () => {
    if (!contextMenu.asset) return;

    pages.forEach(page => {
      const existingInstance = Object.values(page.asset_instances).find(
        (inst: any) => inst.asset_id === contextMenu.asset.id
      );

      if (!existingInstance) {
        // インスタンスが存在しない場合は作成
        toggleAssetInstance(page.id, contextMenu.asset.id);
      }
    });
  };

  const handleHideAllInColumn = () => {
    if (!contextMenu.asset) return;

    pages.forEach(page => {
      const existingInstance = Object.values(page.asset_instances).find(
        (inst: any) => inst.asset_id === contextMenu.asset.id
      );

      if (existingInstance) {
        // インスタンスが存在する場合は削除
        toggleAssetInstance(page.id, contextMenu.asset.id);
      }
    });
  };

  const handleResetAllInColumn = () => {
    if (!contextMenu.asset) return;

    pages.forEach(page => {
      const existingInstance = Object.values(page.asset_instances).find(
        (inst: any) => inst.asset_id === contextMenu.asset.id
      );

      if (existingInstance) {
        // entities.tsのヘルパー関数を使用してoverride値をリセット
        const resetUpdates = resetAssetInstanceOverrides(
          existingInstance as AssetInstance,
          contextMenu.asset.type
        );

        updateAssetInstance(page.id, existingInstance.id, resetUpdates);
      }
    });
  };

  const handleHideColumn = () => {
    if (!contextMenu.asset) return;
    hideColumn(contextMenu.asset.id);
  };

  // 行の右クリックメニュー関連のハンドラー
  const handleRowContextMenu = (e: React.MouseEvent, page: Page, pageIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    // 既存の列メニューを閉じる
    setContextMenu({
      isVisible: false,
      position: { x: 0, y: 0 },
      asset: null,
    });

    setRowContextMenu({
      isVisible: true,
      position: { x: e.clientX, y: e.clientY },
      page: page,
      pageIndex: pageIndex,
    });
  };

  // 行の操作ハンドラー
  const handleShowAllInRow = () => {
    if (!rowContextMenu.page) return;

    assets.forEach(asset => {
      const existingInstance = Object.values(rowContextMenu.page!.asset_instances).find(
        (inst: any) => inst.asset_id === asset.id
      );

      if (!existingInstance) {
        // インスタンスが存在しない場合は作成
        toggleAssetInstance(rowContextMenu.page!.id, asset.id);
      }
    });
  };

  const handleHideAllInRow = () => {
    if (!rowContextMenu.page) return;

    assets.forEach(asset => {
      const existingInstance = Object.values(rowContextMenu.page!.asset_instances).find(
        (inst: any) => inst.asset_id === asset.id
      );

      if (existingInstance) {
        // インスタンスが存在する場合は削除
        toggleAssetInstance(rowContextMenu.page!.id, asset.id);
      }
    });
  };

  const handleResetAllInRow = () => {
    if (!rowContextMenu.page) return;

    assets.forEach(asset => {
      const existingInstance = Object.values(rowContextMenu.page!.asset_instances).find(
        (inst: any) => inst.asset_id === asset.id
      );

      if (existingInstance) {
        // entities.tsのヘルパー関数を使用してoverride値をリセット
        const resetUpdates = resetAssetInstanceOverrides(
          existingInstance as AssetInstance,
          asset.type
        );

        updateAssetInstance(rowContextMenu.page!.id, existingInstance.id, resetUpdates);
      }
    });
  };

  const handleInsertPageAbove = () => {
    if (rowContextMenu.pageIndex < 0) return;

    const newPage = {
      id: `page-${Date.now()}`,
      title: '',
      asset_instances: {},
    };

    insertPageAt(rowContextMenu.pageIndex, newPage);
  };

  const handleInsertPageBelow = () => {
    if (rowContextMenu.pageIndex < 0) return;

    const newPage = {
      id: `page-${Date.now()}`,
      title: '',
      asset_instances: {},
    };

    insertPageAt(rowContextMenu.pageIndex + 1, newPage);
  };

  const handleDeletePageFromMenu = () => {
    if (!rowContextMenu.page) return;

    if (pages.length <= 1) {
      alert('最後のページは削除できません');
      return;
    }

    const confirmed = confirm('このページを削除しますか？');
    if (confirmed) {
      deletePage(rowContextMenu.page.id);
    }
  };

  const handleHideRow = () => {
    if (!rowContextMenu.page) return;
    hideRow(rowContextMenu.page.id);
  };

  const handlePreviewClick = (pageId: string) => {
    // プレビューをセット
    setCurrentPage(pageId);

    // プレビューセルにカーソルを移動（assetIdを'preview'として扱う）
    setCursor(pageId, 'preview');
  };

  // ドラッグ&ドロップ関連のヘルパー関数（引数で状態を受け取る）
  const calculateInsertIndex = useCallback((mouseX: number, originalRect: DOMRect | null): number => {
    console.log('Calculating insert index for mouseX:', mouseX, 'with originalRect:', originalRect);
    if (!originalRect) {
      console.warn('Original rect is null');
      return 0;
    }

    // AssetLibraryのオフセットを計算（開いている場合のみ）
    const assetLibraryOffset = showAssetLibrary ? assetLibraryWidth : 0;
    const COLUMN_WIDTH = originalRect.width; // アセットセルの1列の幅
    const FIRST_COLUMN_WIDTH = 70;      // TODO: ページ番号列の幅をDOMから取得するようにする
    const SECOND_COLUMN_WIDTH = 120;    // TODO: プレビュー列の幅をDOMから取得するようにする
    const baseX = FIRST_COLUMN_WIDTH + SECOND_COLUMN_WIDTH + assetLibraryOffset;

    const relativeX = mouseX - baseX;
    const insertIndex = Math.round(relativeX / COLUMN_WIDTH);
    let resultIndex = Math.max(0, Math.min(visibleAssets.length - 1, insertIndex));
    console.log('Calculating insert index:', insertIndex, ', resultIndex:', resultIndex);
    return resultIndex;
  }, [showAssetLibrary, assetLibraryWidth, visibleAssets.length]);

  // ドラッグ&ドロップ関連のuseCallbackで最適化された関数
  const handleColumnDragMove = useCallback((e: MouseEvent) => {
    console.log('Column drag move', e.clientX);

    const mouseX = e.clientX;

    setColumnDragState(prev => {
      if (!prev.isDragging) return prev;
      
      // 現在の状態のoriginalRectを使って挿入位置を計算
      const newInsertIndex = calculateInsertIndex(mouseX, prev.originalRect);
      
      return {
        ...prev,
        currentMouseX: mouseX,
        insertIndex: newInsertIndex,
      };
    });
  }, [calculateInsertIndex]);

  const handleColumnDragEnd = useCallback((e: MouseEvent) => {
    console.log('Column drag end');
    
    setColumnDragState(prev => {
      if (!prev.isDragging) return prev;

      const { draggedAssetIndex, insertIndex } = prev;

      // 順序変更を実行
      if (draggedAssetIndex !== insertIndex) {
        const newAssetOrder = [...visibleAssets];
        const [draggedAsset] = newAssetOrder.splice(draggedAssetIndex, 1);
        newAssetOrder.splice(insertIndex, 0, draggedAsset);

        const newAssetIds = newAssetOrder.map(asset => asset.id);
        reorderAssets(newAssetIds);
      }

      // グローバルマウスイベントを削除
      document.removeEventListener('mousemove', handleColumnDragMove);
      document.removeEventListener('mouseup', handleColumnDragEnd);
      document.body.style.cursor = '';

      // ドラッグ状態をリセット
      return {
        isDragging: false,
        draggedAssetId: null,
        draggedAssetIndex: -1,
        currentMouseX: 0,
        originalRect: null,
        insertIndex: -1,
      };
    });
  }, [visibleAssets, reorderAssets, handleColumnDragMove]);

  const handleColumnDragStart = useCallback((e: React.MouseEvent, assetId: string, assetIndex: number) => {
    // 左クリックのみ
    if (e.button !== 0) {
      return;
    }
    console.log('Column drag start', assetId, assetIndex);

    e.preventDefault();

    const headerElement = (e.currentTarget as HTMLElement).closest('.asset-header') as HTMLElement;
    if (!headerElement) return;

    const rect = headerElement.getBoundingClientRect();

    setColumnDragState({
      isDragging: true,
      draggedAssetId: assetId,
      draggedAssetIndex: assetIndex,
      currentMouseX: e.clientX,
      originalRect: rect,
      insertIndex: assetIndex,
    });

    // グローバルマウスイベントを追加
    document.addEventListener('mousemove', handleColumnDragMove);
    document.addEventListener('mouseup', handleColumnDragEnd);
    document.body.style.cursor = 'grabbing';
  }, [handleColumnDragMove, handleColumnDragEnd]);

  const isAssetUsedInPage = (pageId: string, assetId: string): boolean => {
    const page = project.pages.find(p => p.id === pageId);
    if (!page) return false;

    return Object.values(page.asset_instances).some(
      (instance: any) => instance.asset_id === assetId
    );
  };

  // ページタイトルまたはページ番号を表示するヘルパー関数
  const getPageDisplayText = (page: Page, pageIndex: number): string => {
    if (page.title && page.title.trim() !== '') {
      return page.title;
    }
    return `${pageIndex + 1}`;
  };

  // 隣接する非表示列をチェックするヘルパー関数
  const getHiddenColumnsBetween = (leftAsset: Asset | null, rightAsset: Asset | null): Asset[] => {
    if (!leftAsset && !rightAsset) return [];

    const leftIndex = leftAsset ? assets.findIndex(a => a.id === leftAsset.id) : -1;
    const rightIndex = rightAsset ? assets.findIndex(a => a.id === rightAsset.id) : assets.length;

    const hiddenBetween: Asset[] = [];
    for (let i = leftIndex + 1; i < rightIndex; i++) {
      const asset = assets[i];
      if (hiddenColumns.includes(asset.id)) {
        hiddenBetween.push(asset);
      }
    }

    return hiddenBetween;
  };

  // 隣接する非表示行をチェックするヘルパー関数
  const getHiddenRowsBetween = (upperPage: Page | null, lowerPage: Page | null): Page[] => {
    if (!upperPage && !lowerPage) return [];

    const upperIndex = upperPage ? pages.findIndex(p => p.id === upperPage.id) : -1;
    const lowerIndex = lowerPage ? pages.findIndex(p => p.id === lowerPage.id) : pages.length;

    const hiddenBetween: Page[] = [];
    for (let i = upperIndex + 1; i < lowerIndex; i++) {
      const page = pages[i];
      if (hiddenRows.includes(page.id)) {
        hiddenBetween.push(page);
      }
    }

    return hiddenBetween;
  };

  return (
    <div
      className="enhanced-spreadsheet scrollbar-large"
      style={{
        maxWidth,
        width: maxWidth ? `${maxWidth}px` : 'auto'
      }}
      ref={spreadsheetRef}
    >
      <div
        className="spreadsheet-table"
      >
        {/* ヘッダー行 */}
        <div className="spreadsheet-header">
          <div className="cell header-cell page-number-delete-header">#</div>
          <div className="cell header-cell preview-column-header">Preview</div>
          {visibleAssets.map((asset, index) => {
            const leftAsset = index === 0 ? null : visibleAssets[index - 1];
            const hiddenBetween = getHiddenColumnsBetween(leftAsset, asset);

            return (
              <div
                key={asset.id}
                className={`cell header-cell asset-header ${contextMenu.isVisible && contextMenu.asset?.id === asset.id ? 'highlighted' : ''} ${columnDragState.isDragging && columnDragState.draggedAssetId === asset.id ? 'dragging' : ''}`}
                onContextMenu={(e) => handleColumnContextMenu(e, asset)}
                onMouseDown={(e) => handleColumnDragStart(e, asset.id, index)}
              >
                <div className="asset-header-content">
                  {/* 隠された列の復元ボタン（左側） */}
                  {hiddenBetween.length > 0 && (
                    <button
                      className="inline-restore-column-btn left"
                      onClick={() => hiddenBetween.forEach(hiddenAsset => showColumn(hiddenAsset.id))}
                      title={`非表示の列を表示: ${hiddenBetween.map(a => a.name).join(', ')}`}
                    >
                      ◀{hiddenBetween.length}
                    </button>
                  )}

                  <span className="asset-name" title={asset.name}>
                    {asset.name}
                  </span>
                  <span className="asset-type">
                    {asset.type === 'ImageAsset' ? '画像' :
                     asset.type === 'VectorAsset' ? 'SVG' :
                     asset.type === 'DynamicVectorAsset' ? 'Dynamic SVG' :
                     asset.type === 'ValueAsset' ? '値' : 'テキスト'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* 最後の列の後の復元ボタン */}
          {visibleAssets.length > 0 && (() => {
            const lastAsset = visibleAssets[visibleAssets.length - 1];
            const hiddenAfter = getHiddenColumnsBetween(lastAsset, null);

            return hiddenAfter.length > 0 ? (
              <div className="cell header-cell end-columns-restore">
                <button
                  className="restore-column-btn"
                  onClick={() => hiddenAfter.forEach(hiddenAsset => showColumn(hiddenAsset.id))}
                  title={`非表示の列を表示: ${hiddenAfter.map(a => a.name).join(', ')}`}
                >
                  ▶ {hiddenAfter.length}列
                </button>
              </div>
            ) : null;
          })()}
        </div>

        {/* データ行 */}
        <div className="spreadsheet-body">
          {visiblePages.map((page, visiblePageIndex) => {
            // 元のpageIndexを取得
            const originalPageIndex = pages.findIndex(p => p.id === page.id);
            const upperPage = visiblePageIndex === 0 ? null : visiblePages[visiblePageIndex - 1];
            const hiddenRowsBetween = getHiddenRowsBetween(upperPage, page);

            return (
            <div key={page.id} className={`spreadsheet-row ${rowContextMenu.isVisible && rowContextMenu.page?.id === page.id ? 'highlighted' : ''}`}>
              {/* ページ番号＋削除ボタンセル */}
              <div
                className={`cell page-number-delete-cell ${rowContextMenu.isVisible && rowContextMenu.page?.id === page.id ? 'highlighted' : ''}`}
                onContextMenu={(e) => handleRowContextMenu(e, page, originalPageIndex)}
              >
                <div className="page-number-delete-content">
                  {/* 隠された行の復元ボタン（上側） */}
                  {hiddenRowsBetween.length > 0 && (
                    <button
                      className="inline-restore-row-btn up"
                      onClick={() => hiddenRowsBetween.forEach(hiddenPage => showRow(hiddenPage.id))}
                      title={`非表示の行を表示: ${hiddenRowsBetween.map(p => getPageDisplayText(p, pages.findIndex(pg => pg.id === p.id))).join(', ')}`}
                    >
                      ▲{hiddenRowsBetween.length}
                    </button>
                  )}

                  <button
                    className="delete-page-btn"
                    onClick={() => handleDeletePage(page.id)}
                    disabled={pages.length <= 1}
                    title="ページを削除"
                  >
                    ×
                  </button>
                  {titleEditState.isEditing && titleEditState.pageId === page.id ? (
                    <input
                      type="text"
                      className="page-title-edit-input"
                      value={titleEditState.title}
                      onChange={(e) => setTitleEditState(prev => ({...prev, title: e.target.value}))}
                      onKeyDown={handleTitleKeyDown}
                      onBlur={handleSaveTitleEdit}
                      autoFocus
                      placeholder={`${originalPageIndex + 1}`}
                    />
                  ) : (
                    <span
                      className="page-number clickable"
                      onClick={() => handleStartTitleEdit(page)}
                      title="クリックしてページタイトルを編集"
                    >
                      {getPageDisplayText(page, originalPageIndex)}
                    </span>
                  )}
                </div>
              </div>

              {/* プレビューセル */}
              <div
                className={`cell preview-cell ${rowContextMenu.isVisible && rowContextMenu.page?.id === page.id ? 'highlighted' : ''}`}
                data-page-id={page.id}
                data-asset-id="preview"
                onClick={() => handlePreviewClick(page.id)}
              >
                <div className="page-preview">
                  <PageThumbnail
                    project={project}
                    page={page}
                    width={80}
                    height={60}
                    className="small"
                    onClick={() => handlePreviewClick(page.id)}
                  />
                </div>
              </div>

              {/* アセットセル */}
              {visibleAssets.map((asset) => {
                const isUsed = isAssetUsedInPage(page.id, asset.id);
                const instance = isUsed ? Object.values(page.asset_instances).find(
                  (inst: any) => inst.asset_id === asset.id
                ) : null;

                return (
                  <div
                    key={`${page.id}-${asset.id}`}
                    className={`cell asset-cell ${isUsed ? 'used' : 'unused'} ${isUsed && hasAssetInstanceOverrides(instance as AssetInstance, asset.type) ? 'has-overrides' : ''} ${contextMenu.isVisible && contextMenu.asset?.id === asset.id ? 'highlighted' : ''} ${rowContextMenu.isVisible && rowContextMenu.page?.id === page.id ? 'highlighted' : ''} ${cellContextMenu.isVisible && cellContextMenu.assetInstance?.id === instance?.id && cellContextMenu.page?.id === page.id ? 'highlighted' : ''}`}
                    data-page-id={page.id}
                    data-asset-id={asset.id}
                    onClick={() => handleCellClick(page.id, asset.id)}
                    onContextMenu={(e) => {
                      if (isUsed && instance) {
                        handleCellRightClick(e, instance as AssetInstance, asset, page);
                      }
                    }}
                  >
                    {/* 左側：cell-manage（チェックボックス＋編集ボタン縦並び） */}
                    <div className="cell-manage">
                      <button
                        className={`toggle-button ${isUsed ? 'active' : 'inactive'}`}
                        onClick={(e) => {
                          handleToggleClick(page.id, asset.id, e);
                        }}
                        title={`${asset.name}の表示を${isUsed ? 'OFF' : 'ON'}にする`}
                      >
                        {isUsed ? '✓' : '×'}
                      </button>
                      {(asset.type === 'ImageAsset' || asset.type === 'TextAsset' || asset.type === 'VectorAsset' || asset.type === 'DynamicVectorAsset' || asset.type === 'ValueAsset') && (
                        <button
                          className="edit-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(page.id, asset.id);
                          }}
                          title={`${asset.name}のインスタンスを編集`}
                        >
                          ✏️
                        </button>
                      )}
                    </div>

                    {/* セル分割線 */}
                    <div className="cell-divider"></div>

                    {/* Override表示の三角形 */}
                    {isUsed && hasAssetInstanceOverrides(instance as AssetInstance, asset.type) && (
                      <div className="override-indicator"></div>
                    )}

                    {/* 右側：cell-content（コンテンツ表示） */}
                    <div className="cell-content">
                      {isUsed && asset.type === 'TextAsset' && instance && (
                        <div
                          className="text-content"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!inlineEditState.isEditing) {
                              handleStartInlineEdit(instance as TextAssetInstance, page);
                            }
                          }}
                          style={{ cursor: inlineEditState.isEditing ? 'default' : 'pointer' }}
                        >
                          {inlineEditState.isEditing &&
                           inlineEditState.assetInstanceId === instance.id &&
                           inlineEditState.pageId === page.id ? (
                            <div className="inline-edit-container">
                              <textarea
                                className="inline-edit-textarea"
                                value={inlineEditState.text}
                                onChange={(e) => setInlineEditState(prev => ({ ...prev, text: e.target.value }))}
                                onBlur={() => {
                                  handleSaveInlineEdit();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    e.preventDefault();
                                    handleSaveInlineEdit();
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelInlineEdit();
                                  }
                                }}
                                autoFocus
                                rows={3}
                              />
                            </div>
                          ) : (
                            getEffectiveTextValue(
                              asset as TextAsset,
                              instance as TextAssetInstance,
                              getCurrentLanguage()
                            )
                          )}
                        </div>
                      )}
                      {isUsed && asset.type === 'ImageAsset' && (
                        <div className="image-content">
                          <img
                            className="image-preview-small"
                            src={getCustomProtocolUrl(asset.original_file_path, currentProjectPath)}
                            alt={asset.name}
                            onError={(e) => {
                              // 画像読み込みエラー時のフォールバック
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      {isUsed && asset.type === 'VectorAsset' && (
                        <div className="vector-content">
                          <div
                            className="vector-preview-small"
                            dangerouslySetInnerHTML={{
                              __html: (asset as VectorAsset).svg_content || '<div>SVG Error</div>'
                            }}
                            style={{
                              maxWidth: '60px',
                              maxHeight: '40px',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          />
                        </div>
                      )}
                      {isUsed && asset.type === 'DynamicVectorAsset' && (
                        <div className="dynamic-vector-content">
                          <div className="dynamic-vector-preview-small">
                            Dynamic SVG
                          </div>
                        </div>
                      )}
                      {isUsed && asset.type === 'ValueAsset' && instance && (
                        <div
                          className="value-content"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!valueInlineEditState.isEditing) {
                              handleStartValueInlineEdit(instance as ValueAssetInstance, asset as ValueAsset, page);
                            }
                          }}
                          style={{ cursor: valueInlineEditState.isEditing ? 'default' : 'pointer' }}
                          title="クリックして値を編集"
                        >
                          {valueInlineEditState.isEditing &&
                           valueInlineEditState.assetInstanceId === instance.id &&
                           valueInlineEditState.pageId === page.id ? (
                            <div className="inline-edit-container">
                              <input
                                className="inline-edit-input"
                                type={(asset as ValueAsset).value_type === 'number' ? 'number' : 'text'}
                                value={valueInlineEditState.value}
                                onChange={(e) => setValueInlineEditState(prev => ({
                                  ...prev,
                                  value: (asset as ValueAsset).value_type === 'number' ?
                                    parseFloat(e.target.value) || 0 : e.target.value
                                }))}
                                onBlur={() => {
                                  handleSaveValueInlineEdit();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveValueInlineEdit();
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelValueInlineEdit();
                                  }
                                }}
                                autoFocus
                                placeholder={(asset as ValueAsset).value_type === 'formula' ? '数式を入力 (例: %{変数} + 10)' : '値を入力'}
                              />
                            </div>
                          ) : (
                            <span
                              className="value-display"
                              title={`値: ${getEffectiveValueAssetValue(asset as ValueAsset, project, page, originalPageIndex)}`}
                            >
                              {String(getEffectiveValueAssetValue(asset as ValueAsset, project, page, originalPageIndex))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            );
          })}

          {/* 最後の行の後の復元ボタン */}
          {visiblePages.length > 0 && (() => {
            const lastPage = visiblePages[visiblePages.length - 1];
            const hiddenAfter = getHiddenRowsBetween(lastPage, null);

            return hiddenAfter.length > 0 ? (
              <div className="spreadsheet-row end-rows-restore">
                <div className="cell restore-row-cell">
                  <button
                    className="restore-row-btn"
                    onClick={() => hiddenAfter.forEach(hiddenPage => showRow(hiddenPage.id))}
                    title={`非表示の行を表示: ${hiddenAfter.map(p => getPageDisplayText(p, pages.findIndex(pg => pg.id === p.id))).join(', ')}`}
                  >
                    ▼ {hiddenAfter.length}行
                  </button>
                </div>
              </div>
            ) : null;
          })()}

          {/* 新規ページ追加行 */}
          <div className="spreadsheet-row add-page-row">
            <div className="cell add-page-cell">
              <button className="add-page-btn" onClick={handleAddPage}>
                + 新しいページを追加
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* カーソルオーバーレイ */}
      <CursorOverlay containerRef={spreadsheetRef} />
      <ColumnDragOverlay
        isDragging={columnDragState.isDragging}
        draggedAssetId={columnDragState.draggedAssetId}
        draggedAssetIndex={columnDragState.draggedAssetIndex}
        currentMouseX={columnDragState.currentMouseX}
        originalRect={columnDragState.originalRect}
        insertIndex={columnDragState.insertIndex}
        visibleAssetsCount={visibleAssets.length}
      />

      {/* ImageAssetInstance編集モーダル */}
      {editingImageInstance && (
        <ImageEditModal
          mode="instance"
          asset={editingImageInstance.asset}
          assetInstance={editingImageInstance.instance}
          page={editingImageInstance.page}
          isOpen={!!editingImageInstance}
          onClose={handleImageModalClose}
          onSaveInstance={handleImageInstanceSave}
        />
      )}

      {/* TextAssetInstance編集モーダル */}
      {editingTextInstance && (
        <TextEditModal
          mode="instance"
          asset={editingTextInstance.asset}
          assetInstance={editingTextInstance.instance}
          page={editingTextInstance.page}
          isOpen={!!editingTextInstance}
          onClose={handleTextModalClose}
          onSaveInstance={handleTextInstanceSave}
        />
      )}

      {/* VectorAssetInstance編集モーダル */}
      {editingVectorInstance && (
        <VectorEditModal
          mode="instance"
          asset={editingVectorInstance.asset}
          assetInstance={editingVectorInstance.instance}
          page={editingVectorInstance.page}
          isOpen={!!editingVectorInstance}
          onClose={handleVectorModalClose}
          onSaveInstance={handleVectorInstanceSave}
        />
      )}

      {/* ValueAssetInstance編集モーダル */}
      {editingValueInstance && (
        <ValueEditModal
          mode="instance"
          asset={editingValueInstance.asset}
          assetInstance={editingValueInstance.instance}
          page={editingValueInstance.page}
          isOpen={!!editingValueInstance}
          onClose={handleValueModalClose}
          onSaveInstance={handleValueInstanceSave}
        />
      )}

      {/* DynamicVectorAssetInstance編集モーダル */}
      {editingDynamicVectorInstance && (
        <DynamicVectorEditModal
          mode="instance"
          asset={editingDynamicVectorInstance.asset}
          assetInstance={editingDynamicVectorInstance.instance}
          page={editingDynamicVectorInstance.page}
          isOpen={!!editingDynamicVectorInstance}
          onClose={handleDynamicVectorModalClose}
          onSaveInstance={handleDynamicVectorInstanceSave}
        />
      )}

      {/* コンテキストメニュー */}
      {contextMenu.isVisible && (
        <ColumnContextMenu
          isVisible={contextMenu.isVisible}
          asset={contextMenu.asset}
          position={contextMenu.position}
          visibleColumnsCount={visibleAssets.length}
          onClose={handleContextMenuClose}
          onHideColumn={handleHideColumn}
          onShowAll={handleShowAllInColumn}
          onHideAll={handleHideAllInColumn}
          onResetAll={handleResetAllInColumn}
        />
      )}

      {/* 行の右クリックメニュー */}
      {rowContextMenu.isVisible && rowContextMenu.page && (
        <RowContextMenu
          isVisible={rowContextMenu.isVisible}
          page={rowContextMenu.page}
          pageIndex={rowContextMenu.pageIndex}
          totalPages={pages.length}
          visibleRowsCount={visiblePages.length}
          position={rowContextMenu.position}
          onClose={handleContextMenuClose}
          onHideRow={handleHideRow}
          onShowAll={handleShowAllInRow}
          onHideAll={handleHideAllInRow}
          onResetAll={handleResetAllInRow}
          onInsertAbove={handleInsertPageAbove}
          onInsertBelow={handleInsertPageBelow}
          onDelete={handleDeletePageFromMenu}
        />
      )}

      {/* セルの右クリックメニュー */}
      {cellContextMenu.isVisible && (
        <CellContextMenu
          isVisible={cellContextMenu.isVisible}
          assetInstance={cellContextMenu.assetInstance}
          page={cellContextMenu.page}
          position={cellContextMenu.position}
          onClose={handleContextMenuClose}
          onReset={handleResetCell}
        />
      )}
    </div>
  );
};
