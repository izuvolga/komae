/**
 * コンテキストメニューの安全機能テスト
 * 
 * - 列を非表示ボタンは表示中の列が1つしかない場合は無効化される
 * - 行を非表示ボタンは表示中の行が1つしかない場合は無効化される
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ColumnContextMenu } from '../src/renderer/components/spreadsheet/ColumnContextMenu';
import { RowContextMenu } from '../src/renderer/components/spreadsheet/RowContextMenu';
import type { Asset, Page } from '../src/types/entities';

// モックデータ
const mockImageAsset: Asset = {
  id: 'test-asset-1',
  name: 'テスト画像',
  type: 'ImageAsset',
  filePath: '/test/image.png',
  customFields: {},
};

const mockPage: Page = {
  id: 'test-page-1',
  title: 'テストページ',
  assetInstances: [],
};

const mockProps = {
  position: { x: 100, y: 100 },
  onClose: jest.fn(),
  onHideColumn: jest.fn(),
  onHideRow: jest.fn(),
  onShowAll: jest.fn(),
  onHideAll: jest.fn(),
  onResetAll: jest.fn(),
};

describe('ColumnContextMenu安全機能', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('表示中の列が2つ以上ある場合、列を非表示ボタンが有効', () => {
    render(
      <ColumnContextMenu
        isVisible={true}
        asset={mockImageAsset}
        visibleColumnsCount={2}
        {...mockProps}
      />
    );

    const hideButton = screen.getByText('列を非表示');
    expect(hideButton).toBeEnabled();
  });

  test('表示中の列が1つしかない場合、列を非表示ボタンが無効', () => {
    render(
      <ColumnContextMenu
        isVisible={true}
        asset={mockImageAsset}
        visibleColumnsCount={1}
        {...mockProps}
      />
    );

    const hideButton = screen.getByText('列を非表示');
    expect(hideButton).toBeDisabled();
  });

  test('表示中の列が0の場合（理論上起こりえないが）、列を非表示ボタンが無効', () => {
    render(
      <ColumnContextMenu
        isVisible={true}
        asset={mockImageAsset}
        visibleColumnsCount={0}
        {...mockProps}
      />
    );

    const hideButton = screen.getByText('列を非表示');
    expect(hideButton).toBeDisabled();
  });
});

describe('RowContextMenu安全機能', () => {
  const rowMockProps = {
    ...mockProps,
    page: mockPage,
    pageIndex: 0,
    totalPages: 3,
    onInsertAbove: jest.fn(),
    onInsertBelow: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('表示中の行が2つ以上ある場合、行を非表示ボタンが有効', () => {
    render(
      <RowContextMenu
        isVisible={true}
        visibleRowsCount={2}
        {...rowMockProps}
      />
    );

    const hideButton = screen.getByText('行を非表示');
    expect(hideButton).toBeEnabled();
  });

  test('表示中の行が1つしかない場合、行を非表示ボタンが無効', () => {
    render(
      <RowContextMenu
        isVisible={true}
        visibleRowsCount={1}
        {...rowMockProps}
      />
    );

    const hideButton = screen.getByText('行を非表示');
    expect(hideButton).toBeDisabled();
  });

  test('表示中の行が0の場合（理論上起こりえないが）、行を非表示ボタンが無効', () => {
    render(
      <RowContextMenu
        isVisible={true}
        visibleRowsCount={0}
        {...rowMockProps}
      />
    );

    const hideButton = screen.getByText('行を非表示');
    expect(hideButton).toBeDisabled();
  });

  test('既存の削除ボタンの安全機能も引き続き動作する', () => {
    const propsWithTotalPages = {
      ...rowMockProps,
      totalPages: 1,
    };
    
    render(
      <RowContextMenu
        isVisible={true}
        visibleRowsCount={2}
        {...propsWithTotalPages}
      />
    );

    const deleteButton = screen.getByText('削除');
    expect(deleteButton).toBeDisabled();
  });
});