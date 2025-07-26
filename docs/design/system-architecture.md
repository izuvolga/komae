# Technical Architecture

Komaeは**Electron + React + TypeScript**をベースとした、セキュアで拡張性の高いデスクトップアプリケーションとして設計されています。

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                        Main Process                         │
│  ┌─────────────────┐    ┌──────────────────────────────────┐ │
│  │   App Lifecycle │    │       Native Integration         │ │
│  │   - Window Mgmt │    │   - File System Access          │ │
│  │   - Menu Setup  │    │   - Native Dialogs              │ │
│  │   - Auto Update │    │   - System Integration          │ │
│  └─────────────────┘    └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                   │
                            ┌──────┴──────┐
                            │   IPC API   │
                            └──────┬──────┘
                                   │
┌─────────────────────────────────────────────────────────────┐
│                      Preload Script                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Context Bridge API                      │ │
│  │  - Project Management  - Asset Operations              │ │
│  │  - File I/O            - Export Functions              │ │
│  │  - System Integration  - Secure API Exposure           │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                   │
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                        │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ Asset Window  │  │ SpreadSheet   │  │ Preview Window  │  │
│  │ (React)       │  │ (React)       │  │ (React)         │  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              State Management (Zustand)                │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                UI Component Layer                      │ │
│  │  - Material-UI / Chakra UI                             │ │
│  │  - Custom Components                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## プロセス構成

### Main Process（Node.js環境）

**責務**: アプリケーションのライフサイクル管理とシステム統合

```typescript
// src/main/main.ts
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { ProjectManager } from './services/ProjectManager';
import { FileSystemService } from './services/FileSystemService';

class KomaeApp {
  private mainWindow: BrowserWindow | null = null;
  private projectManager: ProjectManager;

  constructor() {
    this.projectManager = new ProjectManager();
    this.setupIPC();
    this.createWindow();
  }

  private setupIPC() {
    ipcMain.handle('project:create', async (event, params) => {
      return await this.projectManager.createProject(params);
    });
    
    ipcMain.handle('project:save', async (event, projectData) => {
      return await this.projectManager.saveProject(projectData);
    });
    
    ipcMain.handle('asset:import', async (event, filePath) => {
      return await this.projectManager.importAsset(filePath);
    });
  }
}
```

**主要機能**:
- **ウィンドウ管理**: BrowserWindowの作成・制御
- **メニューシステム**: ネイティブメニューバーの実装
- **ファイルシステム**: プロジェクト・アセットファイルの読み書き
- **システム統合**: OS固有機能の提供
- **自動更新**: アプリケーション更新機能

### Preload Script（セキュリティブリッジ）

**責務**: Main ProcessとRenderer Process間の安全な通信

```typescript
// src/preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Project Operations
  project: {
    create: (params: ProjectCreateParams) => 
      ipcRenderer.invoke('project:create', params),
    save: (projectData: ProjectData) => 
      ipcRenderer.invoke('project:save', projectData),
    load: (filePath: string) => 
      ipcRenderer.invoke('project:load', filePath),
    export: (format: ExportFormat, options: ExportOptions) => 
      ipcRenderer.invoke('project:export', format, options),
  },

  // Asset Operations
  assets: {
    import: (filePath: string) => 
      ipcRenderer.invoke('asset:import', filePath),
    delete: (assetId: string) => 
      ipcRenderer.invoke('asset:delete', assetId),
    optimize: (assetId: string) => 
      ipcRenderer.invoke('asset:optimize', assetId),
  },

  // File System
  fileSystem: {
    showOpenDialog: (options: OpenDialogOptions) => 
      ipcRenderer.invoke('dialog:showOpen', options),
    showSaveDialog: (options: SaveDialogOptions) => 
      ipcRenderer.invoke('dialog:showSave', options),
  },

  // System Integration
  system: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    setTitle: (title: string) => ipcRenderer.invoke('window:setTitle', title),
    showItemInFolder: (filePath: string) => 
      ipcRenderer.invoke('shell:showItemInFolder', filePath),
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for renderer
export type ElectronAPI = typeof electronAPI;
```

**セキュリティ原則**:
- **Context Isolation有効**: rendererからNode.js APIへの直接アクセスを防止
- **最小権限の原則**: 必要最小限のAPIのみを公開
- **型安全**: TypeScriptによる厳密な型定義

### Renderer Process（Web環境）

**責務**: ユーザーインターフェースとアプリケーションロジック

```typescript
// src/renderer/App.tsx
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { Layout } from './components/Layout';
import { useProjectStore } from './stores/projectStore';

export const App: React.FC = () => {
  return (
    <ChakraProvider>
      <Layout>
        <AssetWindow />
        <SpreadSheetWindow />
        <PreviewWindow />
      </Layout>
    </ChakraProvider>
  );
};
```

## 状態管理戦略

### Zustand（軽量状態管理）

```typescript
// src/renderer/stores/projectStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface ProjectState {
  // Project Data
  project: ProjectData | null;
  assets: Record<string, Asset>;
  pages: Record<string, Page>;
  assetAttrs: {
    positionAttrs: Record<string, PositionAssetAttr>;
    sizeAttrs: Record<string, SizeAssetAttr>;
  };

  // UI State
  selectedAssets: string[];
  currentPage: string | null;
  isPreviewMode: boolean;

  // Actions
  setProject: (project: ProjectData) => void;
  addAsset: (asset: Asset) => void;
  updateAssetInstance: (pageId: string, instanceId: string, updates: Partial<AssetInstance>) => void;
  createPage: (page: Page) => void;
  
  // Async Actions
  saveProject: () => Promise<void>;
  exportProject: (format: ExportFormat) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    project: null,
    assets: {},
    pages: {},
    assetAttrs: { positionAttrs: {}, sizeAttrs: {} },
    selectedAssets: [],
    currentPage: null,
    isPreviewMode: false,

    // Mutations
    setProject: (project) => set({ project }),
    
    addAsset: (asset) => set((state) => ({
      assets: { ...state.assets, [asset.id]: asset }
    })),

    updateAssetInstance: (pageId, instanceId, updates) => set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: {
          ...state.pages[pageId],
          asset_instances: {
            ...state.pages[pageId].asset_instances,
            [instanceId]: {
              ...state.pages[pageId].asset_instances[instanceId],
              ...updates
            }
          }
        }
      }
    })),

    // Async Actions
    saveProject: async () => {
      const { project, assets, pages, assetAttrs } = get();
      const projectData = { project, assets, pages, assetAttrs };
      await window.electronAPI.project.save(projectData);
    },

    exportProject: async (format) => {
      const { project, assets, pages } = get();
      await window.electronAPI.project.export(format, { project, assets, pages });
    }
  }))
);
```

### リアルタイム同期

```typescript
// src/renderer/hooks/useProjectSync.ts
export const useProjectSync = () => {
  const store = useProjectStore();

  useEffect(() => {
    // Auto-save every 30 seconds
    const autoSaveInterval = setInterval(() => {
      if (store.project) {
        store.saveProject();
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [store.project]);

  // Preview sync when project data changes
  useEffect(() => {
    const unsubscribe = useProjectStore.subscribe(
      (state) => ({ assets: state.assets, pages: state.pages }),
      (current, previous) => {
        if (current !== previous) {
          // Trigger preview update
          updatePreview(current);
        }
      },
      { equalityFn: shallow }
    );

    return unsubscribe;
  }, []);
};
```

## コンポーネント設計

### レイヤー構造

```
src/renderer/
├── components/           # UI Components
│   ├── common/          # 共通コンポーネント
│   ├── asset/           # Asset Window関連
│   ├── spreadsheet/     # SpreadSheet関連
│   └── preview/         # Preview Window関連
├── hooks/               # Custom Hooks
├── stores/              # State Management
├── services/            # Business Logic
├── types/               # Type Definitions
└── utils/               # Utility Functions
```

### コンポーネント例

```typescript
// src/renderer/components/asset/AssetCard.tsx
interface AssetCardProps {
  asset: Asset;
  isSelected: boolean;
  onSelect: (assetId: string) => void;
  onEdit: (asset: Asset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  isSelected,
  onSelect,
  onEdit
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'asset',
      assetId: asset.id
    }));
  };

  return (
    <Box
      border={isSelected ? '2px solid blue' : '1px solid gray'}
      borderRadius="md"
      p={3}
      cursor="pointer"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect(asset.id)}
      onDoubleClick={() => onEdit(asset)}
    >
      {asset.type === 'ImageAsset' ? (
        <Image src={asset.original_file_path} alt={asset.name} />
      ) : (
        <Text fontSize="2xl">T</Text>
      )}
      <Text mt={2} fontWeight="bold" noOfLines={1}>
        {asset.name}
      </Text>
    </Box>
  );
};
```

## ビルド・デプロイ戦略

### Development

```json
// package.json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite --config vite.renderer.config.ts",
    "dev:main": "tsc -p tsconfig.main.json && electron .",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build --config vite.renderer.config.ts",
    "build:main": "tsc -p tsconfig.main.json"
  }
}
```

### Production Build

```typescript
// electron-builder.config.ts
export default {
  appId: 'com.komae.app',
  productName: 'Komae',
  directories: {
    output: 'dist'
  },
  files: [
    'build/**/*',
    'node_modules/**/*',
    '!**/node_modules/*/{CHANGELOG.md,README.md}',
  ],
  mac: {
    category: 'public.app-category.graphics-design',
    target: {
      target: 'dmg',
      arch: ['x64', 'arm64']
    }
  },
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] }
    ]
  },
  linux: {
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb', arch: ['x64'] }
    ]
  }
};
```

## セキュリティ考慮事項

### Context Isolation

```typescript
// src/main/main.ts
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,        // Node.js統合を無効化
      contextIsolation: true,        // コンテキスト分離を有効化
      enableRemoteModule: false,     // Remoteモジュールを無効化
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,                // サンドボックスは必要に応じて有効化
    }
  });
};
```

### CSP（Content Security Policy）

```html
<!-- src/renderer/index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: file:;">
```

## 拡張性設計

### プラグインアーキテクチャ（将来拡張）

```typescript
// src/main/services/PluginManager.ts
interface KomaePlugin {
  id: string;
  name: string;
  version: string;
  activate: (context: PluginContext) => void;
  deactivate: () => void;
}

export class PluginManager {
  private plugins: Map<string, KomaePlugin> = new Map();

  async loadPlugin(pluginPath: string): Promise<void> {
    const plugin = await import(pluginPath);
    this.plugins.set(plugin.id, plugin);
    plugin.activate(this.createContext());
  }
}
```

## パフォーマンス最適化

### レンダリング最適化

- **React.memo**による不要な再レンダリング防止
- **Virtualization**による大量データの効率的表示
- **Debounce/Throttle**によるイベント処理最適化

### メモリ管理

- **画像の遅延読み込み**
- **キャッシュ戦略**の実装
- **メモリリーク**の防止

この技術アーキテクチャにより、**スケーラブル**で**保守性の高い**アプリケーションを構築できます。
