/**
 * 列ドラッグ&ドロップの座標計算を統一するユーティリティクラス
 * EnhancedSpreadsheet と ColumnDragOverlay で共有する計算ロジック
 */

export interface ColumnDragCalculationConfig {
  originalRect: DOMRect;
  assetLibraryOffset: number;
  visibleAssetsCount: number;
  draggedAssetIndex?: number; // ドラッグ中の列のインデックス（オプショナル）
}

export class ColumnDragCalculator {
  private readonly columnWidth: number;
  private readonly baseX: number;
  private readonly maxIndex: number;
  private readonly draggedAssetIndex: number | null;

  // 定数（将来的にはDOMから動的取得したい）
  private readonly FIRST_COLUMN_WIDTH = 70;   // ページ番号列
  private readonly SECOND_COLUMN_WIDTH = 120; // プレビュー列

  constructor(config: ColumnDragCalculationConfig) {
    this.columnWidth = config.originalRect.width;
    this.baseX = this.FIRST_COLUMN_WIDTH + this.SECOND_COLUMN_WIDTH + config.assetLibraryOffset;
    this.maxIndex = Math.max(0, config.visibleAssetsCount); // 末尾の位置も許可
    this.draggedAssetIndex = config.draggedAssetIndex ?? null;
  }

  /**
   * マウスX座標から挿入インデックスを計算
   */
  mouseXToInsertIndex(mouseX: number): number {
    const relativeX = mouseX - this.baseX;
    const rawIndex = Math.round(relativeX / this.columnWidth);
    const clampedIndex = Math.max(0, Math.min(this.maxIndex, rawIndex));
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
    } else if (insertIndex >= this.maxIndex) {
      // 最後のアセット列の後（末尾の位置）
      pixelLeft = this.baseX + this.maxIndex * this.columnWidth;
    } else {
      // 中間の位置
      pixelLeft = this.baseX + insertIndex * this.columnWidth;
    }

    return pixelLeft;
  }

  /**
   * 実際に位置が変更されるかどうかを判定
   * 修正された挿入ロジックに対応
   */
  wouldPositionChange(insertIndex: number): boolean {
    if (this.draggedAssetIndex === null) {
      return true; // ドラッグ中のアセットが不明な場合は表示
    }

    // 実際の挿入位置を計算（削除による影響を考慮）
    let actualInsertIndex = insertIndex;
    if (insertIndex > this.draggedAssetIndex) {
      actualInsertIndex = insertIndex - 1;
    }

    // 同じ位置への挿入は変更なし
    if (actualInsertIndex === this.draggedAssetIndex) {
      return false;
    }

    return true;
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
  visibleAssetsCount: number,
  draggedAssetIndex?: number
): ColumnDragCalculator | null {
  if (!originalRect) {
    console.warn('[createColumnDragCalculator] originalRect is null');
    return null;
  }

  return new ColumnDragCalculator({
    originalRect,
    assetLibraryOffset,
    visibleAssetsCount,
    draggedAssetIndex
  });
}
