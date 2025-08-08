/**
 * HTMLビューワーテンプレートをTypeScriptファイルに変換するビルドスクリプト
 */

const fs = require('fs');
const path = require('path');

/**
 * 文字列をTypeScript文字列リテラル用にエスケープ
 * @param {string} str - エスケープする文字列
 * @returns {string} エスケープされた文字列
 */
function escapeForTypeScript(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

/**
 * テンプレート内の置換変数を抽出
 * @param {string} content - テンプレート内容
 * @returns {string[]} 置換変数の配列
 */
function extractTemplateVariables(content) {
  const matches = content.match(/\{\{[^}]+\}\}/g) || [];
  return [...new Set(matches)];
}

/**
 * テンプレートファイルを読み込んでTypeScriptコードを生成
 */
function buildTemplates() {
  try {
    console.log('🔨 Building HTML viewer templates...');
    
    const templateDir = path.join(__dirname, '../src/templates/viewer');
    const outputDir = path.join(__dirname, '../src/generated');
    const outputFile = path.join(outputDir, 'viewer-templates.ts');

    // 出力ディレクトリを作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // テンプレートファイルを読み込み
    const htmlPath = path.join(templateDir, 'viewer.html');
    const cssPath = path.join(templateDir, 'viewer.css');
    const jsPath = path.join(templateDir, 'viewer.js');

    if (!fs.existsSync(htmlPath)) {
      throw new Error(`HTML template not found: ${htmlPath}`);
    }
    if (!fs.existsSync(cssPath)) {
      throw new Error(`CSS template not found: ${cssPath}`);
    }
    if (!fs.existsSync(jsPath)) {
      throw new Error(`JavaScript template not found: ${jsPath}`);
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    // 置換変数を抽出
    const htmlVariables = extractTemplateVariables(htmlContent);
    const cssVariables = extractTemplateVariables(cssContent);
    const allVariables = [...new Set([...htmlVariables, ...cssVariables])];

    console.log(`📋 Found template variables: ${allVariables.join(', ')}`);

    // TypeScriptコードを生成
    const tsContent = `/**
 * 自動生成ファイル - 編集禁止
 * Generated from src/templates/viewer/ at ${new Date().toISOString()}
 * 
 * To modify templates, edit files in src/templates/viewer/ and run:
 * npm run build:templates
 */

export interface ViewerTemplateVariables {
${allVariables.map(variable => {
  const varName = variable.replace(/[{}]/g, '');
  return `  /** Template variable: ${variable} */
  ${varName}: string;`;
}).join('\n')}
}

export const VIEWER_TEMPLATES = {
  html: \`${escapeForTypeScript(htmlContent)}\`,
  
  css: \`${escapeForTypeScript(cssContent)}\`,
  
  js: \`${escapeForTypeScript(jsContent)}\`,
  
  /**
   * HTMLテンプレートに変数を置換して完成したHTMLを生成
   * @param variables - 置換する変数のマップ
   * @returns 完成したHTMLコンテンツ
   */
  render(variables: Partial<ViewerTemplateVariables>): string {
    let html = this.html;
    let css = this.css;
    
    // 変数を置換
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = \`{{\${key}}}\`;
      const stringValue = String(value ?? '');
      
      html = html.replace(new RegExp(placeholder.replace(/[{}]/g, '\\\\$&'), 'g'), stringValue);
      css = css.replace(new RegExp(placeholder.replace(/[{}]/g, '\\\\$&'), 'g'), stringValue);
    });
    
    // CSSをHTMLに埋め込み
    html = html.replace('<link rel="stylesheet" href="viewer.css">', \`<style>\${css}</style>\`);
    
    // JSをHTMLに埋め込み（sample-data.js参照を除去）
    html = html.replace('<script src="sample-data.js"></script>', '');
    html = html.replace('<script src="viewer.js"></script>', \`<script>\${this.js}</script>\`);
    
    return html;
  }
} as const;

/**
 * テンプレート変数の型定義
 */
export type TemplateVariable = keyof ViewerTemplateVariables;

/**
 * 利用可能なテンプレート変数のリスト
 */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
${allVariables.map(variable => {
  const varName = variable.replace(/[{}]/g, '');
  return `  '${varName}',`;
}).join('\n')}
];`;

    // ファイルに書き込み
    fs.writeFileSync(outputFile, tsContent, 'utf8');
    
    console.log(`✅ Templates built successfully: ${outputFile}`);
    console.log(`📦 Generated ${tsContent.split('\\n').length} lines of TypeScript code`);
    
    // 統計情報を表示
    const stats = {
      htmlSize: htmlContent.length,
      cssSize: cssContent.length,
      jsSize: jsContent.length,
      totalSize: htmlContent.length + cssContent.length + jsContent.length
    };
    
    console.log(`📊 Template sizes:`);
    console.log(`   HTML: ${stats.htmlSize} chars`);
    console.log(`   CSS:  ${stats.cssSize} chars`);
    console.log(`   JS:   ${stats.jsSize} chars`);
    console.log(`   Total: ${stats.totalSize} chars`);
    
  } catch (error) {
    console.error('❌ Failed to build templates:', error.message);
    process.exit(1);
  }
}

/**
 * ファイル変更を監視してリアルタイムでビルド（開発用）
 */
function watchTemplates() {
  console.log('👀 Watching template files for changes...');
  
  const templateDir = path.join(__dirname, '../src/templates/viewer');
  
  // 初回ビルド
  buildTemplates();
  
  // ファイル変更監視
  fs.watch(templateDir, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.js'))) {
      console.log(`📝 Template file changed: ${filename}`);
      setTimeout(buildTemplates, 100); // デバウンス
    }
  });
  
  console.log('Press Ctrl+C to stop watching');
  
  // プロセス終了時の処理
  process.on('SIGINT', () => {
    console.log('\\n👋 Stopped watching templates');
    process.exit(0);
  });
}

// スクリプトが直接実行された場合
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--watch')) {
    watchTemplates();
  } else {
    buildTemplates();
  }
}

module.exports = { buildTemplates, watchTemplates };