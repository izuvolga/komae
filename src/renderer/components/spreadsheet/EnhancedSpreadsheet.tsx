import React, { useState, useEffect, useCallback } from 'react';
import { Visibility, VisibilityOff, ModeEdit } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import { useAssetInstanceReset } from '../../hooks/useAssetInstanceReset';
import { PageThumbnail } from './PageThumbnail';
import { GraphicEditModal } from '../asset/GraphicEditModal';
import { TextEditModal } from '../asset/TextEditModal';
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
import { generatePageId, generateAssetInstanceId } from '../../../utils/idGenerator';
import { AssetThumbnail } from '../asset/AssetThumbnail';
import { scrollCursorIntoView } from '../../utils/scrollUtils';
import { createColumnDragCalculator } from '../../utils/columnDragCalculations';
import { useTextFieldKeyboardShortcuts } from '../../hooks/useTextFieldKeyboardShortcuts';
import './EnhancedSpreadsheet.css';
import './PageThumbnail.css';
import './ColumnContextMenu.css';
import './RowContextMenu.css';
import './CellContextMenu.css';
import { NoteAdd } from '@mui/icons-material';

export const EnhancedSpreadsheet: React.FC = () => {
  const { mode } = useTheme();
  const project = useProjectStore((state) => state.project);
  const { handleTextFieldKeyEvent } = useTextFieldKeyboardShortcuts();
  const cursor = useProjectStore((state) => state.ui.cursor);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  const addPage = useProjectStore((state) => state.addPage);
  const insertPageAt = useProjectStore((state) => state.insertPageAt);
  const deletePage = useProjectStore((state) => state.deletePage);
  const updatePage = useProjectStore((state) => state.updatePage);
  const setCurrentPage = useProjectStore((state) => state.setCurrentPage);
  const toggleAssetInstance = useProjectStore((state) => state.toggleAssetInstance);
  const showAllAssetsInPage = useProjectStore((state) => state.showAllAssetsInPage);
  const updateAssetInstance = useProjectStore((state) => state.updateAssetInstance);
  const showAssetLibrary = useProjectStore((state) => state.ui.showAssetLibrary);
  const showPreview = useProjectStore((state) => state.ui.showPreview);
  const assetLibraryWidth = useProjectStore((state) => state.ui.assetLibraryWidth);
  const previewWidth = useProjectStore((state) => state.ui.previewWidth);
  const hiddenColumns = useProjectStore((state) => state.ui.hiddenColumns || []);
  const hiddenRows = useProjectStore((state) => state.ui.hiddenRows || []);
  const hideColumn = useProjectStore((state) => state.hideColumn);
  const showColumn = useProjectStore((state) => state.showColumn);
  const hideRow = useProjectStore((state) => state.hideRow);
  const showRow = useProjectStore((state) => state.showRow);
  const reorderAssets = useProjectStore((state) => state.reorderAssets);
  const deleteAsset = useProjectStore((state) => state.deleteAsset);
  const updateAsset = useProjectStore((state) => state.updateAsset);

  // カスタムフック
  const { resetAllInColumn, resetAllInRow } = useAssetInstanceReset();

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
  const [editingGraphicInstance, setEditingGraphicInstance] = useState<{
    instance: ImageAssetInstance | VectorAssetInstance | null;
    asset: ImageAsset | VectorAsset;
    page: Page | null;
  } | null>(null);

  const [editingTextInstance, setEditingTextInstance] = useState<{
    instance: TextAssetInstance | null;
    asset: TextAsset;
    page: Page | null;
  } | null>(null);

  const [editingValueInstance, setEditingValueInstance] = useState<{
    instance: ValueAssetInstance | null;
    asset: ValueAsset;
    page: Page | null;
  } | null>(null);

  const [editingDynamicVectorInstance, setEditingDynamicVectorInstance] = useState<{
    instance: DynamicVectorAssetInstance | null;
    asset: DynamicVectorAsset;
    page: Page | null;
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

  // IME変換状態管理
  const [isComposing, setIsComposing] = useState(false);

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

  // data-theme属性の設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

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
    const pageId = generatePageId();

    // 全アセットのデフォルトインスタンスを作成
    const asset_instances: Record<string, AssetInstance> = {};

    Object.values(project.assets).forEach(asset => {
      const instanceId = generateAssetInstanceId();
      let newInstance: AssetInstance = {
        id: instanceId,
        asset_id: asset.id,
      };

      // TextAssetInstanceの場合はmultilingual_textを初期化
      // TODO: ここに初期化処理あるの少し気持ち悪い & 途中で project の対応言語変わったら大丈夫？
      if (asset.type === 'TextAsset') {
        const supportedLanguages = project.metadata.supportedLanguages || ['ja'];
        const multilingual_text: Record<string, string> = {};
        // 各対応言語に対して空文字列で初期化
        supportedLanguages.forEach(langCode => {
          multilingual_text[langCode] = '';
        });

        (newInstance as TextAssetInstance).multilingual_text = multilingual_text;
      }

      asset_instances[instanceId] = newInstance;
    });

    const newPage = {
      id: pageId,
      title: '',
      asset_instances,
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
    let instance = Object.values(page.asset_instances).find(
      (inst: AssetInstance) => inst.asset_id === assetId
    );

    let currentPage = page;

    // インスタンスが存在しない場合（非表示セル）、toggleAssetInstanceで作成してから編集処理を実行
    if (!instance) {
      toggleAssetInstance(pageId, assetId);
      
      // toggleAssetInstance後、最新の状態を取得して再度インスタンスを検索
      // useProjectStoreのgetState()を使って最新の状態を取得
      const currentState = useProjectStore.getState();
      const updatedPage = currentState.project?.pages.find(p => p.id === pageId);
      if (updatedPage) {
        currentPage = updatedPage;
        instance = Object.values(updatedPage.asset_instances).find(
          (inst: AssetInstance) => inst.asset_id === assetId
        );
      }
    }

    // インスタンスが確実に存在する場合のみ編集モーダルを開く
    if (instance) {
      if (asset.type === 'ImageAsset' || asset.type === 'VectorAsset') {
        setEditingGraphicInstance({
          instance: instance as ImageAssetInstance | VectorAssetInstance,
          asset: asset as ImageAsset | VectorAsset,
          page: currentPage,
        });
      } else if (asset.type === 'TextAsset') {
        setEditingTextInstance({
          instance: instance as TextAssetInstance,
          asset: asset as TextAsset,
          page: currentPage,
        });
      } else if (asset.type === 'ValueAsset') {
        setEditingValueInstance({
          instance: instance as ValueAssetInstance,
          asset: asset as ValueAsset,
          page: currentPage,
        });
      } else if (asset.type === 'DynamicVectorAsset') {
        setEditingDynamicVectorInstance({
          instance: instance as DynamicVectorAssetInstance,
          asset: asset as DynamicVectorAsset,
          page: currentPage,
        });
      }
    }
  };

  // キーボードナビゲーション用のuseEffect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
            const page = project.pages.find(p => p.id === currentCursor.pageId);
            const asset = project.assets[currentCursor.assetId];
            
            if (!page || !asset) return;
            
            const instance = Object.values(page.asset_instances).find(
              (inst: AssetInstance) => inst.asset_id === currentCursor.assetId
            );
            
            if (instance) {
              if (asset.type === 'TextAsset') {
                // TextAssetの場合はEnterキーでインライン編集を開始
                handleStartInlineEdit(instance as TextAssetInstance, page);
              } else {
                // その他のアセットタイプは従来通りモーダルを開く
                handleEditClick(currentCursor.pageId, currentCursor.assetId);
              }
            }
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

      // 新しいカーソル位置を設定
      if (newPageIndex !== currentPageIndex || newAssetIndex !== currentAssetIndex) {
        const newPage = visiblePages[newPageIndex];
        const newAsset = visibleAssets[newAssetIndex];
        if (newPage && newAsset) {
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

  const handleGraphicInstanceSave = (updatedInstance: ImageAssetInstance | VectorAssetInstance) => {
    if (editingGraphicInstance && editingGraphicInstance.page) {
      updateAssetInstance(editingGraphicInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingGraphicInstance(null);
  };

  const handleGraphicAssetSave = (updatedAsset: ImageAsset | VectorAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    setEditingGraphicInstance(null);
  };

  const handleTextInstanceSave = (updatedInstance: TextAssetInstance) => {
    if (editingTextInstance && editingTextInstance.page) {
      updateAssetInstance(editingTextInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingTextInstance(null);
  };

  const handleTextAssetSave = (updatedAsset: TextAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    setEditingTextInstance(null);
  };

  const handleGraphicModalClose = () => {
    setEditingGraphicInstance(null);
  };

  const handleTextModalClose = () => {
    setEditingTextInstance(null);
  };

  const handleValueInstanceSave = (updatedInstance: ValueAssetInstance) => {
    if (editingValueInstance && editingValueInstance.page) {
      updateAssetInstance(editingValueInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingValueInstance(null);
  };

  const handleValueAssetSave = (updatedAsset: ValueAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
    setEditingValueInstance(null);
  };

  const handleValueModalClose = () => {
    setEditingValueInstance(null);
  };

  const handleDynamicVectorInstanceSave = (updatedInstance: DynamicVectorAssetInstance) => {
    if (editingDynamicVectorInstance && editingDynamicVectorInstance.page) {
      updateAssetInstance(editingDynamicVectorInstance.page.id, updatedInstance.id, updatedInstance);
    }
    setEditingDynamicVectorInstance(null);
  };

  const handleDynamicVectorAssetSave = (updatedAsset: DynamicVectorAsset) => {
    updateAsset(updatedAsset.id, updatedAsset);
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

    // 編集状態を即座にリセット
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
    resetAllInColumn(contextMenu.asset);
  };

  const handleHideColumn = () => {
    if (!contextMenu.asset) return;
    hideColumn(contextMenu.asset.id);
  };

  // アセットの編集ハンドラー
  const handleEditAsset = () => {
    if (!contextMenu.asset) return;

    // アセットタイプに応じて適切なモーダルを開く（アセット編集モード）
    const asset = contextMenu.asset;

    // アセット編集用の状態を設定（インスタンスではなくアセット自体の編集）
    if (asset.type === 'ImageAsset' || asset.type === 'VectorAsset') {
      setEditingGraphicInstance({
        instance: null, // アセット編集モードなのでnull
        asset: asset as ImageAsset | VectorAsset,
        page: null, // アセット編集モードなのでnull
      });
    } else if (asset.type === 'TextAsset') {
      setEditingTextInstance({
        instance: null, // アセット編集モードなのでnull
        asset: asset as TextAsset,
        page: null, // アセット編集モードなのでnull
      });
    } else if (asset.type === 'ValueAsset') {
      setEditingValueInstance({
        instance: null, // アセット編集モードなのでnull
        asset: asset as ValueAsset,
        page: null, // アセット編集モードなのでnull
      });
    } else if (asset.type === 'DynamicVectorAsset') {
      setEditingDynamicVectorInstance({
        instance: null, // アセット編集モードなのでnull
        asset: asset as DynamicVectorAsset,
        page: null, // アセット編集モードなのでnull
      });
    }
  };

  // アセットの削除ハンドラー
  const handleDeleteAsset = async () => {
    if (!contextMenu.asset) return;

    const confirmed = confirm(`アセット「${contextMenu.asset.name}」を削除しますか？`);
    if (confirmed) {
      try {
        await deleteAsset(contextMenu.asset.id);
      } catch (error) {
        console.error('アセットの削除に失敗しました:', error);
        alert('アセットの削除に失敗しました。');
      }
    }
  };

  // TextAsset専用: すべて確認用テキストにするハンドラー
  const handleSetAllToConfirmationText = () => {
    if (!contextMenu.asset || contextMenu.asset.type !== 'TextAsset') return;

    const confirmed = confirm(`「${contextMenu.asset.name}」列のすべてのインスタンスを確認用テキストにしますか？`);
    if (confirmed) {
      const currentLang = getCurrentLanguage();

      // 全ページのこのアセットのインスタンスを更新
      Object.values(project.pages).forEach(page => {
        Object.values(page.asset_instances).forEach(instance => {
          // アセットIDが一致し、かつアセットがTextAssetの場合のみ処理
          if (instance.asset_id === contextMenu.asset.id) {
            const textInstance = instance as TextAssetInstance;

            // TextAssetInstanceには必ずmultilingual_textが存在するので、それで判定
            if ('multilingual_text' in textInstance) {
              // 現在の言語のキーを削除（undefinedの代わり）
              const updatedMultilingualText = { ...textInstance.multilingual_text };
              delete updatedMultilingualText[currentLang];

              const updatedInstance = {
                ...textInstance,
                multilingual_text: updatedMultilingualText
              };

              updateAssetInstance(page.id, instance.id, updatedInstance);
            }
          }
        });
      });
    }
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
    
    showAllAssetsInPage(rowContextMenu.page.id);
  };;

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
    resetAllInRow(rowContextMenu.page);
  };

  const handleInsertPageAbove = () => {
    if (rowContextMenu.pageIndex < 0) return;

    const newPage = {
      id: generatePageId(),
      title: '',
      asset_instances: {},
    };

    insertPageAt(rowContextMenu.pageIndex, newPage);
  };

  const handleInsertPageBelow = () => {
    if (rowContextMenu.pageIndex < 0) return;

    const newPage = {
      id: generatePageId(),
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

  // ドラッグ&ドロップ関連のuseCallbackで最適化された関数
  const handleColumnDragMove = useCallback((e: MouseEvent) => {

    const mouseX = e.clientX;
    const assetLibraryOffset = showAssetLibrary ? assetLibraryWidth : 0;
    const assetsCount = visibleAssets.length;

    setColumnDragState(prev => {
      if (!prev.isDragging) return prev;

      const calculator = createColumnDragCalculator(
        prev.originalRect,
        assetLibraryOffset,
        assetsCount,
        prev.draggedAssetIndex // 最新の状態を使用
      );

      const newInsertIndex = calculator ? calculator.mouseXToInsertIndex(mouseX) : prev.insertIndex;

      return {
        ...prev,
        currentMouseX: mouseX,
        insertIndex: newInsertIndex,
      };
    });
  }, [showAssetLibrary, assetLibraryWidth, visibleAssets.length]);

  const handleColumnDragEnd = useCallback((e: MouseEvent) => {
    setColumnDragState(prev => {
      if (!prev.isDragging) return prev;

      const { draggedAssetIndex, insertIndex } = prev;

      // 順序変更を実行
      if (draggedAssetIndex !== insertIndex) {
        // 全アセット（非表示含む）での順序変更を実行
        const draggedAsset = visibleAssets[draggedAssetIndex];
        
        // visibleAssetsでのインデックスを全アセットでのインデックスに変換
        const allAssetIds = assets.map(asset => asset.id);
        const draggedAssetIdInAll = draggedAsset.id;
        const draggedIndexInAll = allAssetIds.indexOf(draggedAssetIdInAll);
        
        // 挿入位置をvisibleAssetsから全アセットのインデックスに変換
        let targetAssetIdInAll: string;
        let insertIndexInAll: number;
        
        if (insertIndex >= visibleAssets.length) {
          // 末尾への挿入
          insertIndexInAll = allAssetIds.length;
        } else {
          // 中間への挿入：insertIndex位置のvisibleAssetの前に挿入
          const targetAsset = visibleAssets[insertIndex];
          targetAssetIdInAll = targetAsset.id;
          insertIndexInAll = allAssetIds.indexOf(targetAssetIdInAll);
        }
        
        // 全アセット配列での順序変更
        const newAllAssetIds = [...allAssetIds];
        newAllAssetIds.splice(draggedIndexInAll, 1);
        
        // 削除による位置調整
        let actualInsertIndexInAll = insertIndexInAll;
        if (insertIndexInAll > draggedIndexInAll) {
          actualInsertIndexInAll = insertIndexInAll - 1;
        }
        
        newAllAssetIds.splice(actualInsertIndexInAll, 0, draggedAssetIdInAll);
        
        reorderAssets(newAllAssetIds);
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
  }, [visibleAssets, assets, reorderAssets, handleColumnDragMove]);

  const handleColumnDragStart = useCallback((e: React.MouseEvent, assetId: string, assetIndex: number) => {
    // 左クリックのみ
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();

    const headerElement = (e.currentTarget as HTMLElement).closest('.asset-header') as HTMLElement;
    if (!headerElement) return;

    const rect = headerElement.getBoundingClientRect();

    setColumnDragState({
      isDragging: true,
      draggedAssetId: assetId,
      draggedAssetIndex: assetIndex,
      currentMouseX: rect.left + rect.width / 2, // 列の中央位置に初期化
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

  // 指定行より上の非表示行をチェックするヘルパー関数
  const getHiddenRowsAbove = (currentPage: Page): Page[] => {
    const currentIndex = pages.findIndex(p => p.id === currentPage.id);
    if (currentIndex <= 0) return [];

    const hiddenAbove: Page[] = [];
    for (let i = currentIndex - 1; i >= 0; i--) {
      const page = pages[i];
      if (hiddenRows.includes(page.id)) {
        hiddenAbove.unshift(page); // 順序を保つため先頭に追加
      } else {
        // 表示されている行に到達したら停止
        break;
      }
    }

    return hiddenAbove;
  };

  // 指定行より下の非表示行をチェックするヘルパー関数
  const getHiddenRowsBelow = (currentPage: Page): Page[] => {
    const currentIndex = pages.findIndex(p => p.id === currentPage.id);
    if (currentIndex === -1 || currentIndex >= pages.length - 1) return [];

    const hiddenBelow: Page[] = [];
    for (let i = currentIndex + 1; i < pages.length; i++) {
      const page = pages[i];
      if (hiddenRows.includes(page.id)) {
        hiddenBelow.push(page);
      } else {
        // 表示されている行に到達したら停止
        break;
      }
    }

    return hiddenBelow;
  };

  // 隣接する非表示行をチェックするヘルパー関数（後方互換性のため残す）
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
            const rightAsset = index === visibleAssets.length - 1 ? null : visibleAssets[index + 1];
            const hiddenBetween = getHiddenColumnsBetween(leftAsset, asset);
            const hiddenAfterThis = getHiddenColumnsBetween(asset, rightAsset);

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
                      onMouseDown={(e) => e.stopPropagation()}
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

                  {/* 隠された列の復元ボタン（右側） */}
                  {hiddenAfterThis.length > 0 && (
                    <button
                      className="inline-restore-column-btn right"
                      onClick={() => hiddenAfterThis.forEach(hiddenAsset => showColumn(hiddenAsset.id))}
                      onMouseDown={(e) => e.stopPropagation()}
                      title={`非表示の列を表示: ${hiddenAfterThis.map(a => a.name).join(', ')}`}
                    >
                      {hiddenAfterThis.length}▶
                    </button>
                  )}
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
                  onMouseDown={(e) => e.stopPropagation()}
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
            const hiddenRowsAbove = getHiddenRowsAbove(page);
            const hiddenRowsBelow = getHiddenRowsBelow(page);

            return (
            <div key={page.id} className={`spreadsheet-row ${rowContextMenu.isVisible && rowContextMenu.page?.id === page.id ? 'highlighted' : ''}`}>
              {/* ページ番号＋削除ボタンセル */}
              <div
                className={`cell page-number-delete-cell ${rowContextMenu.isVisible && rowContextMenu.page?.id === page.id ? 'highlighted' : ''}`}
                onContextMenu={(e) => handleRowContextMenu(e, page, originalPageIndex)}
              >
                <div className="page-number-delete-content">
                  {/* 上に非表示行がある場合：ページタイトルの上にアイコンを表示 */}
                  {hiddenRowsAbove.length > 0 && (
                    <button
                      className="inline-restore-row-btn up"
                      onClick={() => hiddenRowsAbove.forEach(hiddenPage => showRow(hiddenPage.id))}
                      title={`非表示の行を表示: ${hiddenRowsAbove.map(p => getPageDisplayText(p, pages.findIndex(pg => pg.id === p.id))).join(', ')}`}
                    >
                      ▲{hiddenRowsAbove.length}
                    </button>
                  )}

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

                  {/* 下に非表示行がある場合：ページタイトルの下にアイコンを表示 */}
                  {hiddenRowsBelow.length > 0 && (
                    <button
                      className="inline-restore-row-btn down"
                      onClick={() => hiddenRowsBelow.forEach(hiddenPage => showRow(hiddenPage.id))}
                      title={`非表示の行を表示: ${hiddenRowsBelow.map(p => getPageDisplayText(p, pages.findIndex(pg => pg.id === p.id))).join(', ')}`}
                    >
                      ▼{hiddenRowsBelow.length}
                    </button>
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
                    className={`cell asset-cell ${isUsed ? 'used' : 'unused'} ${isUsed && hasAssetInstanceOverrides(instance as AssetInstance, asset.type, asset) ? 'has-overrides' : ''} ${contextMenu.isVisible && contextMenu.asset?.id === asset.id ? 'highlighted' : ''} ${rowContextMenu.isVisible && rowContextMenu.page?.id === page.id ? 'highlighted' : ''} ${cellContextMenu.isVisible && cellContextMenu.assetInstance?.id === instance?.id && cellContextMenu.page?.id === page.id ? 'highlighted' : ''}`}
                    data-page-id={page.id}
                    data-asset-id={asset.id}
                    onClick={() => handleCellClick(page.id, asset.id)}
                    onContextMenu={(e) => {
                      if (isUsed && instance) {
                        handleCellRightClick(e, instance as AssetInstance, asset, page);
                      }
                    }}
                  >
                    {/* 左側：cell-manage */}
                    {asset.type === 'ValueAsset' ? (
                      /* ValueAsset：左側全体がEdit領域 */
                      <div className="cell-manage value-asset">
                        <div
                          className="icon-area value-edit-area"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(page.id, asset.id);
                          }}
                          title={`${asset.name}のインスタンスを編集`}
                        >
                          <ModeEdit fontSize="inherit" />
                        </div>
                      </div>
                    ) : (
                      /* その他のアセット：上下分割領域 */
                      <div className="cell-manage">
                        {/* 上半分：Visibility領域 */}
                        <div
                          className={`icon-area visibility-area ${isUsed ? 'active' : 'inactive'}`}
                          onClick={(e) => {
                            handleToggleClick(page.id, asset.id, e);
                          }}
                          title={`${asset.name}の表示を${isUsed ? 'OFF' : 'ON'}にする`}
                        >
                          {isUsed ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
                        </div>

                        {/* 下半分：Edit領域 */}
                        {(asset.type === 'ImageAsset' || asset.type === 'TextAsset' || asset.type === 'VectorAsset' || asset.type === 'DynamicVectorAsset') && (
                          <div
                            className="icon-area edit-area"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(page.id, asset.id);
                            }}
                            title={`${asset.name}のインスタンスを編集`}
                          >
                            <ModeEdit fontSize="inherit" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* セル分割線 */}
                    <div className="cell-divider"></div>

                    {/* Override表示の三角形 */}
                    {isUsed && hasAssetInstanceOverrides(instance as AssetInstance, asset.type, asset) && (
                      <div className="override-indicator"></div>
                    )}

                    {/* 右側：cell-content（コンテンツ表示） */}
                    {isUsed && asset.type === 'TextAsset' && instance && (
                      inlineEditState.isEditing &&
                      inlineEditState.assetInstanceId === instance.id &&
                      inlineEditState.pageId === page.id ? (
                        /* インライン編集時：cell-content全体がテキストエリア */
                        <textarea
                          className="cell-content-textarea"
                          value={inlineEditState.text}
                          onChange={(e) => setInlineEditState(prev => ({ ...prev, text: e.target.value }))}
                          onBlur={() => {
                            handleSaveInlineEdit();
                          }}
                          onCompositionStart={() => setIsComposing(true)}
                          onCompositionEnd={() => setIsComposing(false)}
                          onKeyDown={(e) => {
                            // キーボードショートカット処理を先に実行
                            handleTextFieldKeyEvent(e);

                            if (e.key === 'Enter') {
                              // IME変換中の場合は無視（変換確定のEnterを許可）
                              if (isComposing || (e as any).isComposing) {
                                return;
                              }

                              if (e.shiftKey || e.metaKey || e.altKey || e.ctrlKey) {
                                // Shift/CMD/Option/Alt + Enter: 改行を挿入（デフォルト動作を許可）
                                return;
                              } else {
                                // Enter単体: 保存してインライン編集終了
                                e.preventDefault();
                                e.stopPropagation();
                                // 即座に編集状態を終了してから保存
                                const currentText = (e.target as HTMLTextAreaElement).value;
                                setInlineEditState({
                                  isEditing: false,
                                  assetInstanceId: null,
                                  pageId: null,
                                  text: '',
                                });
                                // 保存処理を非同期で実行（保存時のEnterキーイベントが、更に onChange イベントをトリガーするのを防ぐため）
                                setTimeout(() => {
                                  if (inlineEditState.assetInstanceId && inlineEditState.pageId) {
                                    const assetInstance = Object.values(project.pages).find(p => p.id === inlineEditState.pageId)
                                      ?.asset_instances[inlineEditState.assetInstanceId] as TextAssetInstance;
                                    if (assetInstance) {
                                      const currentLang = getCurrentLanguage();
                                      const updatedInstance = {
                                        ...assetInstance,
                                        multilingual_text: {
                                          ...assetInstance.multilingual_text,
                                          [currentLang]: currentText
                                        }
                                      };
                                      updateAssetInstance(inlineEditState.pageId, inlineEditState.assetInstanceId, updatedInstance);
                                    }
                                  }
                                }, 0);
                              }
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelInlineEdit(); // エスケープキーで変更を破棄
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        /* 通常時：テキスト表示 */
                        <div
                          className="cell-content text-display"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!inlineEditState.isEditing) {
                              handleStartInlineEdit(instance as TextAssetInstance, page);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {getEffectiveTextValue(
                            asset as TextAsset,
                            instance as TextAssetInstance,
                            getCurrentLanguage()
                          )}
                        </div>
                      )
                    ) || (
                      /* TextAsset以外 */
                      <div className="cell-content">
                      {isUsed && (asset.type === 'ImageAsset' || asset.type === 'VectorAsset') && (
                        <div className="image-content">
                          <img
                            className="image-preview-small"
                            src={getCustomProtocolUrl(
                              (asset as ImageAsset | VectorAsset).original_file.path,
                              currentProjectPath
                            )}
                            alt={asset.name}
                            onError={(e) => {
                              // 画像読み込みエラー時のフォールバック
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      {/*isUsed && asset.type === 'VectorAsset' && (
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
                      )*/}
                      {isUsed && asset.type === 'DynamicVectorAsset' && (
                        <div className="dynamic-vector-content">
                          <AssetThumbnail
                            asset={asset}
                            instance={instance || undefined}
                            maxWidth={80}
                            maxHeight={50}
                          />
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
                                  // キーボードショートカット処理を先に実行
                                  handleTextFieldKeyEvent(e);

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
                    )}
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
                    ▲{hiddenAfter.length}行
                  </button>
                </div>
              </div>
            ) : null;
          })()}

          {/* 新規ページ追加行 */}
          <div className="spreadsheet-row add-page-row">
            <div className="cell add-page-cell">
              <button className="add-page-btn" onClick={handleAddPage}>
                <NoteAdd sx={{ fontSize: '1.5rem', color: 'primary.main' }} />
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

      {/* GraphicAsset/GraphicAssetInstance編集モーダル */}
      {editingGraphicInstance && (
        <GraphicEditModal
          mode={editingGraphicInstance.instance ? "instance" : "asset"}
          asset={editingGraphicInstance.asset}
          assetInstance={editingGraphicInstance.instance || undefined}
          page={editingGraphicInstance.page || undefined}
          isOpen={!!editingGraphicInstance}
          onClose={handleGraphicModalClose}
          onSaveAsset={editingGraphicInstance.instance ? undefined : handleGraphicAssetSave}
          onSaveInstance={editingGraphicInstance.instance ? handleGraphicInstanceSave : undefined}
        />
      )}

      {/* TextAsset/TextAssetInstance編集モーダル */}
      {editingTextInstance && (
        <TextEditModal
          mode={editingTextInstance.instance ? "instance" : "asset"}
          asset={editingTextInstance.asset}
          assetInstance={editingTextInstance.instance || undefined}
          page={editingTextInstance.page || undefined}
          isOpen={!!editingTextInstance}
          onClose={handleTextModalClose}
          onSaveAsset={editingTextInstance.instance ? undefined : handleTextAssetSave}
          onSaveInstance={editingTextInstance.instance ? handleTextInstanceSave : undefined}
        />
      )}

      {/* ValueAsset/ValueAssetInstance編集モーダル */}
      {editingValueInstance && (
        <ValueEditModal
          mode={editingValueInstance.instance ? "instance" : "asset"}
          asset={editingValueInstance.asset}
          assetInstance={editingValueInstance.instance || undefined}
          page={editingValueInstance.page || undefined}
          isOpen={!!editingValueInstance}
          onClose={handleValueModalClose}
          onSaveAsset={editingValueInstance.instance ? undefined : handleValueAssetSave}
          onSaveInstance={editingValueInstance.instance ? handleValueInstanceSave : undefined}
        />
      )}

      {/* DynamicVectorAsset/DynamicVectorAssetInstance編集モーダル */}
      {editingDynamicVectorInstance && (
        <DynamicVectorEditModal
          mode={editingDynamicVectorInstance.instance ? "instance" : "asset"}
          asset={editingDynamicVectorInstance.asset}
          assetInstance={editingDynamicVectorInstance.instance || undefined}
          page={editingDynamicVectorInstance.page || undefined}
          isOpen={!!editingDynamicVectorInstance}
          onClose={handleDynamicVectorModalClose}
          onSaveAsset={editingDynamicVectorInstance.instance ? undefined : handleDynamicVectorAssetSave}
          onSaveInstance={editingDynamicVectorInstance.instance ? handleDynamicVectorInstanceSave : undefined}
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
          onEditAsset={handleEditAsset}
          onDeleteAsset={handleDeleteAsset}
          onSetAllToConfirmationText={handleSetAllToConfirmationText}
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
