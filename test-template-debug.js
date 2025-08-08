/**
 * テンプレートシステムのデバッグ用スクリプト
 */

const { VIEWER_TEMPLATES } = require('./src/generated/viewer-templates.ts');

// テンプレート変数を設定
const templateVariables = {
  TITLE: 'Debug Test',
  SVG_CONTENT: '<svg><g id="page-1">Debug SVG Content with Page 1 and Page 2 text</g></svg>',
  NAVIGATION_DISPLAY: 'flex',
  TOTAL_PAGES: '2',
  CANVAS_WIDTH: '800'
};

try {
  // テンプレートをレンダリング
  const html = VIEWER_TEMPLATES.render(templateVariables);
  
  console.log('=== TEMPLATE RENDERING TEST ===');
  console.log('Variables:', templateVariables);
  console.log('\n=== OUTPUT (first 500 chars) ===');
  console.log(html.substring(0, 500));
  console.log('\n=== CONTAINS CHECK ===');
  console.log('Contains "Page 1":', html.includes('Page 1'));
  console.log('Contains "Page 2":', html.includes('Page 2'));
  console.log('Contains "Debug SVG Content":', html.includes('Debug SVG Content'));
  
} catch (error) {
  console.error('Template rendering error:', error);
}