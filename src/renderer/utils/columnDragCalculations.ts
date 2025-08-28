/**
 * 列ドラッグ&ドロップの座標計算を統一するユーティリティクラス
 * EnhancedSpreadsheet と ColumnDragOverlay で共有する計算ロジック
 */

export interface ColumnDragCalculationConfig {
  originalRect: DOMRect;
  assetLibraryOffset: number;
  visibleAssetsCount: number;
}

export class ColumnDragCalculator {
  private readonly columnWidth: number;
  private readonly baseX: number;
  private readonly maxIndex: number;

  // 定数（将来的にはDOMから動的取得したい）
  private readonly FIRST_COLUMN_WIDTH = 70;   // ページ番号列
  private readonly SECOND_COLUMN_WIDTH = 120; // プレビュー列

  constructor(config: ColumnDragCalculationConfig) {
    this.columnWidth = config.originalRect.width;
    this.baseX = this.FIRST_COLUMN_WIDTH + this.SECOND_COLUMN_WIDTH + config.assetLibraryOffset;
    this.maxIndex = Math.max(0, config.visibleAssetsCount - 1);

    console.log('[ColumnDragCalculator] Initialized:', {
      columnWidth: this.columnWidth,
      baseX: this.baseX,
      maxIndex: this.maxIndex,
      config
    });
  }

  /**
   * マウスX座標から挿入インデックスを計算
   */
  mouseXToInsertIndex(mouseX: number): number {
    const relativeX = mouseX - this.baseX;
    const rawIndex = Math.round(relativeX / this.columnWidth);
    const clampedIndex = Math.max(0, Math.min(this.maxIndex, rawIndex));

    console.log('[ColumnDragCalculator] mouseXToInsertIndex:', {
      mouseX,
      relativeX,
      rawIndex,
      clampedIndex,
      baseX: this.baseX,
      columnWidth: this.columnWidth
    });

    return clampedIndex;
  }

  /**
   * 挿入インデックスからピクセル位置を計算
   */
  insertIndexToPixelLeft(insertIndex: number): number {
    let pixelLeft: number;

    if (insertIndex === 0) {
      // 最初のアセット列の前
      pixelLeft = this.baseX;
    } else if (insertIndex >= this.maxIndex + 1) {
      // 最後のアセット列の後
      pixelLeft = this.baseX + (this.maxIndex + 1) * this.columnWidth;
    } else {
      // 中間の位置
      pixelLeft = this.baseX + insertIndex * this.columnWidth;
    }

    console.log('[ColumnDragCalculator] insertIndexToPixelLeft:', {
      insertIndex,
      pixelLeft,
      baseX: this.baseX,
      columnWidth: this.columnWidth,
      maxIndex: this.maxIndex
    });

    return pixelLeft;
  }

  /**
   * デバッグ用の情報取得
   */
  getDebugInfo() {
    return {
      columnWidth: this.columnWidth,
      baseX: this.baseX,
      maxIndex: this.maxIndex,
      firstColumnWidth: this.FIRST_COLUMN_WIDTH,
      secondColumnWidth: this.SECOND_COLUMN_WIDTH
    };
  }
}

/**
 * ColumnDragCalculatorインスタンスを作成するヘルパー関数
 */
export function createColumnDragCalculator(
  originalRect: DOMRect | null,
  assetLibraryOffset: number,
  visibleAssetsCount: number
): ColumnDragCalculator | null {
  if (!originalRect) {
    console.warn('[createColumnDragCalculator] originalRect is null');
    return null;
  }

  return new ColumnDragCalculator({
    originalRect,
    assetLibraryOffset,
    visibleAssetsCount
  });
}
