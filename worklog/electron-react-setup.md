# Electron + React + TypeScript セットアップ記録

## 概要
komaeプロジェクトにおけるElectron + React + TypeScriptの開発環境構築とトラブルシューティング記録

## 最終的な動作構成

### アーキテクチャ設計
```
Main Process          Preload Script       Renderer Process
(electron-main)   ←→  (electron-preload)  ←→  (target: web)
Node.js全機能         contextBridge         React UI (ブラウザ環境)
```

### webpack.config.js 設定
```javascript
// 3つの独立したビルド設定
rendererConfig: { target: 'web' }           // React UI
mainConfig: { target: 'electron-main' }     // Electronメインプロセス  
preloadConfig: { target: 'electron-preload' } // API橋渡し
```

### TypeScript設定
- `tsconfig.json` - 一般用
- `tsconfig.renderer.json` - React用 (noEmit: false, jsx: react-jsx)
- `tsconfig.electron.json` - main/preload用 (CommonJS)

## 重要なトラブルシューティング

### 1. global is not defined エラー
**原因**: webpackのchunk loadingがブラウザ環境でNode.jsの`global`変数を要求

**解決策**: HTMLレベルでの即座polyfill
```html
<script>
  // Global polyfill for Electron renderer - must be before webpack bundle
  if (typeof global === 'undefined') {
    window.global = globalThis;
  }
</script>
```

### 2. require is not defined エラー  
**原因**: Electron rendererでNode.jsモジュールの外部参照時に発生

**解決策**: target: 'web' を使用し、必要な機能はpreload経由で提供

### 3. JSXコンパイルエラー
**原因**: Electron用TypeScript設定がReact用に適していない

**解決策**: rendererConfig専用のtsconfig.renderer.json作成

## 設計方針・ベストプラクティス

### ✅ 推奨アプローチ
1. **Renderer Process**: `target: 'web'` でReact開発
2. **Node.js機能**: preloadスクリプト経由でcontextBridge使用
3. **セキュリティ**: contextIsolation: true, nodeIntegration: false
4. **TypeScript設定**: プロセス別に分離

### ❌ 避けるべきこと
- `target: 'electron-renderer'` (React 19との互換性問題)
- rendererから直接Node.js APIアクセス
- contextIsolationの無効化

### 🔄 開発ワークフロー
```bash
npm run dev  # 並行実行:
# 1. webpack dev server (React)
# 2. main/preloadビルド
# 3. Electron起動
```

## 今後の機能拡張

### preload経由でのAPI提供例
```typescript
// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data: string) => ipcRenderer.invoke('fs:saveFile', data),
  loadImage: (path: string) => ipcRenderer.invoke('image:load', path),
  parseYaml: (content: string) => ipcRenderer.invoke('yaml:parse', content)
});
```

### React側での使用
```typescript
// App.tsx
declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string>;
      saveFile: (data: string) => Promise<void>;
      // ...
    }
  }
}

// 使用例
const handleOpenFile = async () => {
  const filePath = await window.electronAPI.openFile();
};
```

## 技術的背景

### Electron v12以降の変更
- Context Isolationがデフォルト有効
- レンダラープロセスからNode.js直接アクセス不可
- contextBridge.exposeInMainWorldが推奨方式

### webpack targetの意味
- `web`: ブラウザ環境 (DOM有り、Node.js無し)
- `electron-main`: Electronメインプロセス (Node.js全機能)  
- `electron-preload`: セキュア橋渡し環境
- `electron-renderer`: レンダラー環境 (互換性問題あり)

## まとめ
現在の構成は現代的なElectron開発のベストプラクティスに準拠。セキュリティと開発効率を両立した理想的な設計。