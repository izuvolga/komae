/**
 * Komae HTML Export Viewer Script
 * 統合SVG構造でのページナビゲーション機能を提供
 */

let currentPage = 1;
let totalPages = 1;
let autoPlayInterval = null;
let currentLanguage = (window.komaeProject && window.komaeProject.currentLanguage) || 'ja';
let availableLanguages = (window.komaeProject && window.komaeProject.availableLanguages) || ['ja'];

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
  
  // 言語機能を初期化
  initializeLanguageSelector();
  
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

/**
 * 言語選択機能を初期化
 */
function initializeLanguageSelector() {
  const svg = document.querySelector('svg');
  if (!svg) return;
  
  // SVG内の利用可能言語を検出
  const languageElements = svg.querySelectorAll('[class^="lang-"]');
  const detectedLanguages = new Set();
  
  languageElements.forEach(element => {
    const classNames = element.className.baseVal || element.className;
    if (typeof classNames === 'string') {
      const langMatch = classNames.match(/lang-([a-z]{2})/);
      if (langMatch) {
        detectedLanguages.add(langMatch[1]);
      }
    }
  });
  
  availableLanguages = Array.from(detectedLanguages).sort();
  
  // 利用可能言語が1つの場合は言語選択UIを非表示
  const languageSelector = document.querySelector('.language-selector');
  if (availableLanguages.length <= 1) {
    if (languageSelector) {
      languageSelector.style.display = 'none';
    }
    return;
  }
  
  // 言語選択UIを表示して選択肢を生成
  if (languageSelector) {
    languageSelector.style.display = 'flex';
  }
  
  const select = document.getElementById('language-select');
  if (select) {
    // 既存のオプションをクリア
    select.innerHTML = '';
    
    // 言語オプションを生成
    availableLanguages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = getLanguageDisplayName(lang);
      if (lang === currentLanguage) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }
  
  // 現在の言語に基づいて表示を更新
  switchLanguage(currentLanguage);
  
  console.log(`Language selector initialized: ${availableLanguages.join(', ')}`);
}

/**
 * 言語表示名を取得
 * @param {string} langCode - 言語コード
 * @returns {string} 表示名
 */
function getLanguageDisplayName(langCode) {
  const languageNames = {
    'ja': '日本語',
    'en': 'English',
    'zh': '中文',
    'ko': '한국어',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'pt': 'Português',
    'ru': 'Русский',
    'ar': 'العربية'
  };
  
  return languageNames[langCode] || langCode.toUpperCase();
}

/**
 * 言語を切り替え
 * @param {string} newLanguage - 切り替え先の言語コード
 */
function switchLanguage(newLanguage) {
  if (!availableLanguages.includes(newLanguage)) {
    console.warn(`Language ${newLanguage} is not available`);
    return;
  }
  
  const svg = document.querySelector('svg');
  if (!svg) return;
  
  // すべての言語要素を非表示
  const allLanguageElements = svg.querySelectorAll('[class^="lang-"]');
  allLanguageElements.forEach(element => {
    element.style.display = 'none';
  });
  
  // 指定された言語の要素のみを表示
  const targetLanguageElements = svg.querySelectorAll(`.lang-${newLanguage}`);
  targetLanguageElements.forEach(element => {
    element.style.display = 'block';
  });
  
  currentLanguage = newLanguage;
  
  // 選択状態を更新
  const select = document.getElementById('language-select');
  if (select) {
    select.value = newLanguage;
  }
  
  console.log(`Language switched to: ${newLanguage}`);
}

// ページ読み込み完了時に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeViewer);
} else {
  initializeViewer();
}