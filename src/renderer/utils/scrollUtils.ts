/**
 * Excel風の自動スクロール機能を提供するユーティリティ関数
 */

export interface ScrollToElementOptions {
  container: HTMLElement;
  targetElement: HTMLElement;
  offsetTop?: number;
  offsetBottom?: number;
  offsetLeft?: number;
  offsetRight?: number;
  smooth?: boolean;
}

/**
 * 指定した要素が表示領域内に入るように自動スクロールする
 * Excel風の動作を再現：セルが見えない場合のみスクロール
 */
export function scrollElementIntoView(options: ScrollToElementOptions): void {
  const {
    container,
    targetElement,
    offsetTop = 0,
    offsetBottom = 0,
    offsetLeft = 0,
    offsetRight = 0,
    smooth = true
  } = options;

  const containerRect = container.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();

  // スプレッドシートヘッダーの高さを取得
  const headerElement = container.querySelector('.spreadsheet-header') as HTMLElement;
  const headerHeight = headerElement ? headerElement.getBoundingClientRect().height : 0;

  // 現在のスクロール位置
  const currentScrollLeft = container.scrollLeft;
  const currentScrollTop = container.scrollTop;

  // 表示可能エリアの計算（ヘッダーを除く）
  const visibleTop = containerRect.top + headerHeight + offsetTop;
  const visibleBottom = containerRect.bottom - offsetBottom;
  const visibleLeft = containerRect.left + offsetLeft;
  const visibleRight = containerRect.right - offsetRight;

  // ターゲット要素の位置
  const targetTop = targetRect.top;
  const targetBottom = targetRect.bottom;
  const targetLeft = targetRect.left;
  const targetRight = targetRect.right;

  let newScrollLeft = currentScrollLeft;
  let newScrollTop = currentScrollTop;

  // 水平方向のスクロール調整
  if (targetLeft < visibleLeft) {
    // 左端からはみ出している場合：左にスクロール
    newScrollLeft = currentScrollLeft - (visibleLeft - targetLeft);
  } else if (targetRight > visibleRight) {
    // 右端からはみ出している場合：右にスクロール
    newScrollLeft = currentScrollLeft + (targetRight - visibleRight);
  }

  // 垂直方向のスクロール調整
  if (targetTop < visibleTop) {
    // 上端からはみ出している場合：上にスクロール
    newScrollTop = currentScrollTop - (visibleTop - targetTop);
  } else if (targetBottom > visibleBottom) {
    // 下端からはみ出している場合：下にスクロール
    newScrollTop = currentScrollTop + (targetBottom - visibleBottom);
  }

  // スクロールが必要な場合のみ実行
  if (newScrollLeft !== currentScrollLeft || newScrollTop !== currentScrollTop) {
    container.scrollTo({
      left: Math.max(0, newScrollLeft),
      top: Math.max(0, newScrollTop),
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
}

/**
 * カーソル位置のセルが表示領域内に入るように自動スクロールする
 */
export function scrollCursorIntoView(
  container: HTMLElement,
  pageId: string,
  assetId: string,
  smooth: boolean = true
): boolean {
  const cellElement = container.querySelector(
    `[data-page-id="${pageId}"][data-asset-id="${assetId}"]`
  ) as HTMLElement;

  if (!cellElement) {
    return false;
  }

  scrollElementIntoView({
    container,
    targetElement: cellElement,
    offsetTop: 10,    // 少しマージンを持たせる
    offsetBottom: 10,
    offsetLeft: 10,
    offsetRight: 10,
    smooth
  });

  return true;
}