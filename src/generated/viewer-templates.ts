/**
 * 自動生成ファイル - 編集禁止
 * Generated from src/templates/viewer/ at 2025-08-08T18:50:52.613Z
 * 
 * To modify templates, edit files in src/templates/viewer/ and run:
 * npm run build:templates
 */

export interface ViewerTemplateVariables {
  /** Template variable: {{TITLE}} */
  TITLE: string;
  /** Template variable: {{NAVIGATION_DISPLAY}} */
  NAVIGATION_DISPLAY: string;
  /** Template variable: {{TOTAL_PAGES}} */
  TOTAL_PAGES: string;
  /** Template variable: {{SVG_CONTENT}} */
  SVG_CONTENT: string;
  /** Template variable: {{CANVAS_WIDTH}} */
  CANVAS_WIDTH: string;
}

export const VIEWER_TEMPLATES = {
  html: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{TITLE}}</title>
  <link rel="stylesheet" href="viewer.css">
</head>
<body>
  <div class="container">
    <div class="navigation" style="display: {{NAVIGATION_DISPLAY}};">
      <button class="nav-button" id="prev-btn" onclick="previousPage()">◀ 前</button>
      <div class="page-info">
        <span id="current-page">1</span> / <span id="total-pages">{{TOTAL_PAGES}}</span>
      </div>
      <button class="nav-button" id="next-btn" onclick="nextPage()">次 ▶</button>
    </div>
    <div class="svg-container">
      {{SVG_CONTENT}}
    </div>
  </div>
  
  <!-- 開発時にダミーデータとスクリプトを読み込み -->
  <script src="sample-data.js"></script>
  <script src="viewer.js"></script>
</body>
</html>` as string,
  
  css: `/* Komae HTML Export Viewer Styles */

body {
  margin: 0;
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.container {
  max-width: calc({{CANVAS_WIDTH}}px + 40px);
  width: 100%;
}

.navigation {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 10px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.nav-button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.nav-button:hover {
  background: #0056b3;
}

.nav-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.nav-button:disabled:hover {
  background: #ccc;
}

.page-info {
  text-align: center;
  margin: 0 20px;
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
}

.svg-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  overflow: hidden;
  display: flex;
  justify-content: center;
}

svg {
  width: 100%;
  height: auto;
  display: block;
  max-width: 100%;
}

/* Responsive design */
@media (max-width: 768px) {
  body {
    padding: 10px;
  }
  
  .container {
    max-width: 100%;
  }
  
  .navigation {
    padding: 8px;
    gap: 8px;
  }
  
  .nav-button {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .page-info {
    margin: 0 10px;
    font-size: 13px;
  }
}

/* キーボード操作時のフォーカス表示 */
.nav-button:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

/* ローディング表示（将来拡張用） */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #666;
  font-size: 16px;
}

/* エラー表示（将来拡張用） */
.error {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
  margin: 20px 0;
  text-align: center;
}` as string,
  
  js: `/**
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
  
  console.log(\`Komae Viewer initialized: \${totalPages} pages\`);
}

/**
 * 指定されたページを表示
 * @param {number} pageNum - 表示するページ番号（1-indexed）
 */
function showPage(pageNum) {
  if (pageNum < 1 || pageNum > totalPages) {
    console.warn(\`Invalid page number: \${pageNum}\`);
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
  const targetPageGroup = svg.querySelector(\`#page-\${pageNum}\`);
  if (targetPageGroup) {
    targetPageGroup.style.display = 'block';
    currentPage = pageNum;

    // ページ情報を更新
    updatePageInfo();
    
    // ボタンの状態を更新
    updateNavigationButtons();
    
    console.log(\`Switched to page \${pageNum}\`);
  } else {
    console.error(\`Page group #page-\${pageNum} not found\`);
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
  
  console.log(\`Auto-play started with \${interval}ms interval\`);
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
}` as string,
  
  /**
   * HTMLテンプレートに変数を置換して完成したHTMLを生成
   * @param variables - 置換する変数のマップ
   * @returns 完成したHTMLコンテンツ
   */
  render(variables: Partial<ViewerTemplateVariables>): string {
    let html = this.html as string;
    let css = this.css as string;
    
    // 変数を置換
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const stringValue = String(value ?? '');
      
      html = html.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), stringValue);
      css = css.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), stringValue);
    });
    
    // CSSをHTMLに埋め込み
    html = html.replace('<link rel="stylesheet" href="viewer.css">', `<style>${css}</style>`);
    
    // JSをHTMLに埋め込み（sample-data.js参照を除去）
    html = html.replace('<script src="sample-data.js"></script>', '');
    html = html.replace('<script src="viewer.js"></script>', `<script>${this.js}</script>`);
    
    return html;
  }
};

/**
 * テンプレート変数の型定義
 */
export type TemplateVariable = keyof ViewerTemplateVariables;

/**
 * 利用可能なテンプレート変数のリスト
 */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  'TITLE',
  'NAVIGATION_DISPLAY',
  'TOTAL_PAGES',
  'SVG_CONTENT',
  'CANVAS_WIDTH',
];