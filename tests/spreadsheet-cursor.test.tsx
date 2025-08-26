/**
 * スプレッドシートカーソル機能のテスト
 * 
 * - セルクリックでカーソル設定
 * - 矢印キーでカーソル移動
 * - Enterキーでセル編集
 * - Backspaceキーでセルリセット
 * - Ctrl/Cmd+C でセルコピー
 * - Ctrl/Cmd+V でセルペースト
 * - Escキーでカーソルクリア
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EnhancedSpreadsheet } from '../src/renderer/components/spreadsheet/EnhancedSpreadsheet';
import { useProjectStore } from '../src/renderer/stores/projectStore';
import type { ProjectData, Asset, Page } from '../src/types/entities';

// プロジェクトストアをモック
jest.mock('../src/renderer/stores/projectStore');
const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>;

// モックデータ
const mockImageAsset: Asset = {
  id: 'test-asset-image',
  name: 'テスト画像',
  type: 'ImageAsset',
  filePath: '/test/image.png',
  customFields: {},
};

const mockTextAsset: Asset = {
  id: 'test-asset-text',
  name: 'テストテキスト',
  type: 'TextAsset',
  default_text: 'デフォルトテキスト',
  customFields: {},
};

const mockPage1: Page = {
  id: 'test-page-1',
  title: 'テストページ1',
  asset_instances: {},
};

const mockPage2: Page = {
  id: 'test-page-2',
  title: 'テストページ2',
  asset_instances: {},
};

const mockProject: ProjectData = {
  metadata: {
    title: 'テストプロジェクト',
    version: '1.0.0',
    supportedLanguages: ['ja'],
    currentLanguage: 'ja',
  },
  canvas: {
    width: 800,
    height: 600,
  },
  assets: {
    [mockImageAsset.id]: mockImageAsset,
    [mockTextAsset.id]: mockTextAsset,
  },
  pages: [mockPage1, mockPage2],
};

// カーソル関連の状態とアクション
const mockCursor = {
  visible: false,
  pageId: null,
  assetId: null,
};

const mockSetCursor = jest.fn();
const mockMoveCursor = jest.fn();
const mockClearCursor = jest.fn();
const mockCopyCell = jest.fn();
const mockPasteCell = jest.fn();

// UI状態
const mockUIState = {
  selectedAssets: [],
  selectedPages: [],
  currentPage: null,
  activeWindow: 'spreadsheet' as const,
  zoomLevel: 1.0,
  canvasFit: true,
  showAssetLibrary: true,
  showPreview: true,
  showFontManagement: false,
  showCustomAssetManagement: false,
  assetLibraryWidth: 280,
  previewWidth: 320,
  previewScrollX: 0,
  previewScrollY: 0,
  hiddenColumns: [],
  hiddenRows: [],
  cursor: mockCursor,
  clipboard: {
    assetInstance: null,
    sourcePageId: null,
  },
};

describe('スプレッドシートカーソル機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのストア状態を設定
    mockUseProjectStore.mockImplementation((selector) => {
      const state = {
        project: mockProject,
        currentProjectPath: '/test/project.komae',
        ui: mockUIState,
        addPage: jest.fn(),
        insertPageAt: jest.fn(),
        deletePage: jest.fn(),
        updatePage: jest.fn(),
        setCurrentPage: jest.fn(),
        toggleAssetInstance: jest.fn(),
        updateAssetInstance: jest.fn(),
        hideColumn: jest.fn(),
        showColumn: jest.fn(),
        hideRow: jest.fn(),
        showRow: jest.fn(),
        setCursor: mockSetCursor,
        moveCursor: mockMoveCursor,
        clearCursor: mockClearCursor,
        copyCell: mockCopyCell,
        pasteCell: mockPasteCell,
        getCurrentLanguage: () => 'ja',
      };
      
      return selector(state);
    });
  });

  test('セルをクリックするとカーソルが設定される', () => {
    render(<EnhancedSpreadsheet />);
    
    // アセットセルを見つけてクリック
    const cell = screen.getByTestId(`cell-${mockPage1.id}-${mockImageAsset.id}`) 
      || document.querySelector(`[data-page-id="${mockPage1.id}"][data-asset-id="${mockImageAsset.id}"]`);
    
    if (cell) {
      fireEvent.click(cell);
      expect(mockSetCursor).toHaveBeenCalledWith(mockPage1.id, mockImageAsset.id);
    }
  });

  test('矢印キーでカーソルが移動する', () => {
    // カーソルが表示されている状態に設定
    const visibleCursor = { ...mockCursor, visible: true, pageId: mockPage1.id, assetId: mockImageAsset.id };
    
    mockUseProjectStore.mockImplementation((selector) => {
      const state = {
        project: mockProject,
        ui: { ...mockUIState, cursor: visibleCursor },
        setCursor: mockSetCursor,
        moveCursor: mockMoveCursor,
        clearCursor: mockClearCursor,
        copyCell: mockCopyCell,
        pasteCell: mockPasteCell,
        getCurrentLanguage: () => 'ja',
      };
      
      return selector(state);
    });

    render(<EnhancedSpreadsheet />);
    
    // 矢印キーを押下
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(mockMoveCursor).toHaveBeenCalledWith('up');
    
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(mockMoveCursor).toHaveBeenCalledWith('down');
    
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(mockMoveCursor).toHaveBeenCalledWith('left');
    
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(mockMoveCursor).toHaveBeenCalledWith('right');
  });

  test('Escキーでカーソルがクリアされる', () => {
    const visibleCursor = { ...mockCursor, visible: true, pageId: mockPage1.id, assetId: mockImageAsset.id };
    
    mockUseProjectStore.mockImplementation((selector) => {
      const state = {
        project: mockProject,
        ui: { ...mockUIState, cursor: visibleCursor },
        setCursor: mockSetCursor,
        moveCursor: mockMoveCursor,
        clearCursor: mockClearCursor,
        copyCell: mockCopyCell,
        pasteCell: mockPasteCell,
        getCurrentLanguage: () => 'ja',
      };
      
      return selector(state);
    });

    render(<EnhancedSpreadsheet />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockClearCursor).toHaveBeenCalled();
  });

  test('Ctrl+Cでセルをコピーできる', () => {
    const visibleCursor = { ...mockCursor, visible: true, pageId: mockPage1.id, assetId: mockImageAsset.id };
    
    mockUseProjectStore.mockImplementation((selector) => {
      const state = {
        project: mockProject,
        ui: { ...mockUIState, cursor: visibleCursor },
        setCursor: mockSetCursor,
        moveCursor: mockMoveCursor,
        clearCursor: mockClearCursor,
        copyCell: mockCopyCell,
        pasteCell: mockPasteCell,
        getCurrentLanguage: () => 'ja',
      };
      
      return selector(state);
    });

    render(<EnhancedSpreadsheet />);
    
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    expect(mockCopyCell).toHaveBeenCalledWith(mockPage1.id, mockImageAsset.id);
  });

  test('Ctrl+Vでセルをペーストできる', () => {
    const visibleCursor = { ...mockCursor, visible: true, pageId: mockPage1.id, assetId: mockImageAsset.id };
    mockPasteCell.mockReturnValue(true); // ペースト成功を返す
    
    mockUseProjectStore.mockImplementation((selector) => {
      const state = {
        project: mockProject,
        ui: { ...mockUIState, cursor: visibleCursor },
        setCursor: mockSetCursor,
        moveCursor: mockMoveCursor,
        clearCursor: mockClearCursor,
        copyCell: mockCopyCell,
        pasteCell: mockPasteCell,
        getCurrentLanguage: () => 'ja',
      };
      
      return selector(state);
    });

    render(<EnhancedSpreadsheet />);
    
    fireEvent.keyDown(document, { key: 'v', ctrlKey: true });
    expect(mockPasteCell).toHaveBeenCalledWith(mockPage1.id, mockImageAsset.id);
  });

  test('Cmd+C (Mac)でセルをコピーできる', () => {
    const visibleCursor = { ...mockCursor, visible: true, pageId: mockPage1.id, assetId: mockImageAsset.id };
    
    mockUseProjectStore.mockImplementation((selector) => {
      const state = {
        project: mockProject,
        ui: { ...mockUIState, cursor: visibleCursor },
        setCursor: mockSetCursor,
        moveCursor: mockMoveCursor,
        clearCursor: mockClearCursor,
        copyCell: mockCopyCell,
        pasteCell: mockPasteCell,
        getCurrentLanguage: () => 'ja',
      };
      
      return selector(state);
    });

    render(<EnhancedSpreadsheet />);
    
    fireEvent.keyDown(document, { key: 'c', metaKey: true });
    expect(mockCopyCell).toHaveBeenCalledWith(mockPage1.id, mockImageAsset.id);
  });

  test('異なるタイプのアセットをペーストしようとすると失敗する', () => {
    const visibleCursor = { ...mockCursor, visible: true, pageId: mockPage1.id, assetId: mockTextAsset.id };
    mockPasteCell.mockReturnValue(false); // ペースト失敗を返す
    
    // alert をモック
    window.alert = jest.fn();
    
    mockUseProjectStore.mockImplementation((selector) => {
      const state = {
        project: mockProject,
        ui: { ...mockUIState, cursor: visibleCursor },
        setCursor: mockSetCursor,
        moveCursor: mockMoveCursor,
        clearCursor: mockClearCursor,
        copyCell: mockCopyCell,
        pasteCell: mockPasteCell,
        getCurrentLanguage: () => 'ja',
      };
      
      return selector(state);
    });

    render(<EnhancedSpreadsheet />);
    
    fireEvent.keyDown(document, { key: 'v', ctrlKey: true });
    expect(mockPasteCell).toHaveBeenCalledWith(mockPage1.id, mockTextAsset.id);
    expect(window.alert).toHaveBeenCalledWith('異なるタイプのアセットはペーストできません');
  });

  test('インライン編集中はキーボードショートカットが無効になる', () => {
    const visibleCursor = { ...mockCursor, visible: true, pageId: mockPage1.id, assetId: mockImageAsset.id };
    
    mockUseProjectStore.mockImplementation((selector) => {
      const state = {
        project: mockProject,
        ui: { ...mockUIState, cursor: visibleCursor },
        // インライン編集状態を返すテスト用のセレクタ
        inlineEditState: { isEditing: true },
        setCursor: mockSetCursor,
        moveCursor: mockMoveCursor,
        clearCursor: mockClearCursor,
        copyCell: mockCopyCell,
        pasteCell: mockPasteCell,
        getCurrentLanguage: () => 'ja',
      };
      
      return selector(state);
    });

    render(<EnhancedSpreadsheet />);
    
    // インライン編集中は矢印キーが無効
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(mockMoveCursor).not.toHaveBeenCalled();
  });
});