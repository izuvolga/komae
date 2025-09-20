/**
 * スナップ機能ユーティリティ
 * Figmaライクなスナップ操作を実現するための計算機能
 */

export interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
}

export interface SnapResult {
  snappedX: number;
  snappedY: number;
  snappedToX: boolean;
  snappedToY: boolean;
  snapGuides: SnapGuide[];
}

/**
 * アセット位置のスナップを計算
 * @param x - 提案されたX座標
 * @param y - 提案されたY座標
 * @param width - アセットの幅
 * @param height - アセットの高さ
 * @param canvasWidth - キャンバスの幅
 * @param canvasHeight - キャンバスの高さ
 * @param threshold - スナップが発動する距離閾値
 * @returns スナップ結果
 */
export function calculateSnap(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number,
  threshold: number = 10
): SnapResult {
  const guides: SnapGuide[] = [];
  let snappedX = x;
  let snappedY = y;
  let snappedToX = false;
  let snappedToY = false;

  // X軸方向のスナップ判定

  // 左端スナップ (アセット左端 → キャンバス左端)
  if (Math.abs(x) < threshold) {
    snappedX = 0;
    snappedToX = true;
    guides.push({
      type: 'vertical',
      position: 0,
      start: 0,
      end: canvasHeight
    });
  }
  // 右端スナップ (アセット右端 → キャンバス右端)
  else if (Math.abs(x + width - canvasWidth) < threshold) {
    snappedX = canvasWidth - width;
    snappedToX = true;
    guides.push({
      type: 'vertical',
      position: canvasWidth,
      start: 0,
      end: canvasHeight
    });
  }
  // 中央スナップ (アセット中心 → キャンバス中心)
  else if (Math.abs(x + width / 2 - canvasWidth / 2) < threshold) {
    snappedX = canvasWidth / 2 - width / 2;
    snappedToX = true;
    guides.push({
      type: 'vertical',
      position: canvasWidth / 2,
      start: 0,
      end: canvasHeight
    });
  }

  // Y軸方向のスナップ判定

  // 上端スナップ (アセット上端 → キャンバス上端)
  if (Math.abs(y) < threshold) {
    snappedY = 0;
    snappedToY = true;
    guides.push({
      type: 'horizontal',
      position: 0,
      start: 0,
      end: canvasWidth
    });
  }
  // 下端スナップ (アセット下端 → キャンバス下端)
  else if (Math.abs(y + height - canvasHeight) < threshold) {
    snappedY = canvasHeight - height;
    snappedToY = true;
    guides.push({
      type: 'horizontal',
      position: canvasHeight,
      start: 0,
      end: canvasWidth
    });
  }
  // 中央スナップ (アセット中心 → キャンバス中心)
  else if (Math.abs(y + height / 2 - canvasHeight / 2) < threshold) {
    snappedY = canvasHeight / 2 - height / 2;
    snappedToY = true;
    guides.push({
      type: 'horizontal',
      position: canvasHeight / 2,
      start: 0,
      end: canvasWidth
    });
  }

  return {
    snappedX,
    snappedY,
    snappedToX,
    snappedToY,
    snapGuides: guides
  };
}