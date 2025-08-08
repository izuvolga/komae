/**
 * 開発・テスト用のサンプルデータ
 * 実際のエクスポート時には含まれません
 */

// ページ読み込み後にサンプルSVGを挿入
document.addEventListener('DOMContentLoaded', function() {
  // 実際のSVGコンテンツが存在しない場合のみサンプルを挿入
  const svgContainer = document.querySelector('.svg-container');
  if (!svgContainer || svgContainer.querySelector('svg')) {
    return; // 既にSVGが存在する場合は何もしない
  }

  // タイトルを設定
  if (document.title.includes('{{TITLE}}')) {
    document.title = 'Komae Viewer - サンプルデータ';
  }

  // サンプルSVGを生成
  const sampleSVG = `
    <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <!-- サンプルアセット定義 -->
      </defs>
      
      <!-- アセット定義セクション -->
      <g id="assets">
        <g visibility="hidden">
          <g id="sample-bg" opacity="1">
            <rect id="image-sample-bg" width="800" height="600" x="0" y="0" fill="#e3f2fd" stroke="#2196f3" stroke-width="2" />
          </g>
          <g id="sample-character" opacity="1">
            <circle id="image-sample-character" cx="100" cy="100" r="50" fill="#ff9800" stroke="#f57c00" stroke-width="3" />
          </g>
        </g>
      </g>

      <!-- ページ1の内容 -->
      <g id="page-1" style="display: block;">
        <use href="#sample-bg" opacity="0.8" />
        <use href="#sample-character" transform="translate(200,100)" opacity="1.0" />
        
        <!-- サンプルテキスト -->
        <g opacity="1.0">
          <text x="300" y="150" font-family="Arial" font-size="24" fill="#1976d2" stroke="#1976d2" stroke-width="1">
            <tspan x="300" y="150">サンプルページ 1</tspan>
            <tspan x="300" dy="30">こちらは開発用のサンプルデータです</tspan>
          </text>
        </g>
      </g>

      <!-- ページ2の内容 -->
      <g id="page-2" style="display: none;">
        <use href="#sample-bg" opacity="0.6" />
        <use href="#sample-character" transform="translate(400,200) scale(1.5,1.5)" opacity="0.8" />
        
        <!-- サンプルテキスト -->
        <g opacity="1.0">
          <text x="200" y="100" font-family="Arial" font-size="28" fill="#d32f2f" stroke="#d32f2f" stroke-width="1">
            <tspan x="200" y="100">サンプルページ 2</tspan>
            <tspan x="200" dy="35">キーボード操作可能:</tspan>
            <tspan x="200" dy="30">← → ↑ ↓ Home End Space</tspan>
          </text>
        </g>
      </g>

      <!-- ページ3の内容 -->
      <g id="page-3" style="display: none;">
        <use href="#sample-bg" opacity="1.0" />
        <use href="#sample-character" transform="translate(100,300)" opacity="0.7" />
        <use href="#sample-character" transform="translate(500,150) scale(0.8,0.8)" opacity="0.9" />
        
        <!-- サンプルテキスト -->
        <g opacity="1.0">
          <text x="250" y="250" font-family="Arial" font-size="20" fill="#388e3c" stroke="#388e3c" stroke-width="1">
            <tspan x="250" y="250">サンプルページ 3</tspan>
            <tspan x="250" dy="25">複数のアセットを配置した例</tspan>
            <tspan x="250" dy="25">統合SVG構造により効率的に管理</tspan>
          </text>
        </g>
      </g>
    </svg>
  `;

  // SVGを挿入
  svgContainer.innerHTML = sampleSVG;

  // ナビゲーションを表示
  const navigation = document.querySelector('.navigation');
  if (navigation && navigation.style.display.includes('{{NAVIGATION_DISPLAY}}')) {
    navigation.style.display = 'flex';
  }

  console.log('Sample data loaded for development');
});