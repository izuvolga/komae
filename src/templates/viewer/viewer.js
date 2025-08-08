/**
 * Komae HTML Export Viewer Script
 * 統合SVG構造でのページナビゲーション機能を提供
 */

let currentPage = 1;
let totalPages = 1;
let autoPlayInterval = null;

/**
 * ページ切り替え機能を初期化
 */
function initializeViewer() {
  // SVG内のページ数を取得
  const svg = document.querySelector('svg');
  if (!svg) {
    console.warn('SVG element not found');
    return;
  }

  const pageGroups = svg.querySelectorAll('[id^="page-"]');
  totalPages = pageGroups.length;
  
  // ページ数表示を更新
  const totalPagesSpan = document.getElementById('total-pages');
  if (totalPagesSpan) {
    totalPagesSpan.textContent = totalPages;
  }

  // 初期ページを表示
  showPage(1);
  
  // キーボードイベントリスナーを追加
  setupKeyboardNavigation();
  
  console.log(`Komae Viewer initialized: ${totalPages} pages`);
}

/**
 * 指定されたページを表示
 * @param {number} pageNum - 表示するページ番号（1-indexed）
 */
function showPage(pageNum) {
  if (pageNum < 1 || pageNum > totalPages) {
    console.warn(`Invalid page number: ${pageNum}`);
    return;
  }

  const svg = document.querySelector('svg');
  if (!svg) return;

  // すべてのページグループを非表示
  const allPageGroups = svg.querySelectorAll('[id^="page-"]');
  allPageGroups.forEach(pageGroup => {
    pageGroup.style.display = 'none';
  });

  // 指定されたページグループを表示
  const targetPageGroup = svg.querySelector(`#page-${pageNum}`);
  if (targetPageGroup) {
    targetPageGroup.style.display = 'block';
    currentPage = pageNum;

    // ページ情報を更新
    updatePageInfo();
    
    // ボタンの状態を更新
    updateNavigationButtons();
    
    console.log(`Switched to page ${pageNum}`);
  } else {
    console.error(`Page group #page-${pageNum} not found`);
  }
}

/**
 * ページ情報表示を更新
 */
function updatePageInfo() {
  const currentPageSpan = document.getElementById('current-page');
  if (currentPageSpan) {
    currentPageSpan.textContent = currentPage;
  }
}

/**
 * ナビゲーションボタンの状態を更新
 */
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentPage === totalPages;
  }
}

/**
 * 次のページに移動
 */
function nextPage() {
  if (currentPage < totalPages) {
    showPage(currentPage + 1);
  }
}

/**
 * 前のページに移動
 */
function previousPage() {
  if (currentPage > 1) {
    showPage(currentPage - 1);
  }
}

/**
 * 特定のページに直接ジャンプ
 * @param {number} pageNum - ジャンプ先のページ番号
 */
function jumpToPage(pageNum) {
  showPage(pageNum);
}

/**
 * キーボードナビゲーションを設定
 */
function setupKeyboardNavigation() {
  document.addEventListener('keydown', function(e) {
    // フォーカスが入力フィールドにある場合はスキップ
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      return;
    }

    switch(e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        previousPage();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault();
        nextPage();
        break;
      case 'Home':
        e.preventDefault();
        showPage(1);
        break;
      case 'End':
        e.preventDefault();
        showPage(totalPages);
        break;
      case ' ': // スペースキー
        e.preventDefault();
        nextPage();
        break;
    }
  });
}

/**
 * オートプレイ機能を開始
 * @param {number} interval - ページ切り替え間隔（ミリ秒）
 */
function startAutoPlay(interval = 3000) {
  stopAutoPlay(); // 既存のオートプレイを停止
  
  autoPlayInterval = setInterval(() => {
    if (currentPage < totalPages) {
      nextPage();
    } else {
      showPage(1); // 最初のページに戻る
    }
  }, interval);
  
  console.log(`Auto-play started with ${interval}ms interval`);
}

/**
 * オートプレイ機能を停止
 */
function stopAutoPlay() {
  if (autoPlayInterval) {
    clearInterval(autoPlayInterval);
    autoPlayInterval = null;
    console.log('Auto-play stopped');
  }
}

/**
 * フルスクリーンモードを切り替え（将来拡張用）
 */
function toggleFullscreen() {
  const container = document.querySelector('.svg-container');
  if (!container) return;

  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => {
      console.warn('Failed to enter fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// ページ読み込み完了時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeViewer);
} else {
  initializeViewer();
}