# Data Flow Specification

Komaeアプリケーション内でのデータの流れ、状態管理、同期機構について詳細に定義します。

## データフロー概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Action   │───▶│  State Manager  │───▶│   UI Update     │
│                 │    │    (Zustand)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │  Side Effects   │              │
         │              │ - Auto Save     │              │
         │              │ - Preview Sync  │              │
         │              │ - Validation    │              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ File System     │    │   IPC Bridge    │    │  Component      │
│ (Main Process)  │    │  (Preload)      │    │  Re-render      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 状態管理アーキテクチャ

### Core State Structure

```typescript
// src/renderer/stores/types.ts
interface AppState {
  // Project Data
  project: {
    metadata: ProjectMetadata;
    canvas: CanvasConfig;
    assets: Record<string, Asset>;
    assetAttrs: {
      positionAttrs: Record<string, PositionAssetAttr>;
      sizeAttrs: Record<string, SizeAssetAttr>;
    };
    pages: Record<string, Page>;
  };

  // UI State
  ui: {
    selectedAssets: string[];
    selectedPages: string[];
    currentPage: string | null;
    activeWindow: 'asset' | 'spreadsheet' | 'preview';
    previewMode: 'fit' | 'actual' | 'custom';
    zoomLevel: number;
  };

  // Application State
  app: {
    isLoading: boolean;
    isDirty: boolean;
    lastSaved: Date | null;
    errors: AppError[];
    clipboard: ClipboardData | null;
  };
}
```

### State Store Implementation

```typescript
// src/renderer/stores/projectStore.ts
import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface ProjectStore extends AppState {
  // Synchronous Actions
  setProject: (project: ProjectData) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (assetId: string, updates: Partial<Asset>) => void;
  deleteAsset: (assetId: string) => void;
  
  updateAssetInstance: (
    pageId: string, 
    instanceId: string, 
    updates: Partial<AssetInstance>
  ) => void;
  
  addPage: (page: Page) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;
  
  // UI Actions
  selectAssets: (assetIds: string[]) => void;
  setCurrentPage: (pageId: string) => void;
  setActiveWindow: (window: WindowType) => void;
  
  // Async Actions
  saveProject: () => Promise<void>;
  loadProject: (filePath: string) => Promise<void>;
  exportProject: (format: ExportFormat, options: ExportOptions) => Promise<void>;
  importAsset: (filePath: string) => Promise<Asset>;
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        project: null,
        ui: {
          selectedAssets: [],
          selectedPages: [],
          currentPage: null,
          activeWindow: 'asset',
          previewMode: 'fit',
          zoomLevel: 1.0,
        },
        app: {
          isLoading: false,
          isDirty: false,
          lastSaved: null,
          errors: [],
          clipboard: null,
        },

        // Synchronous Actions
        setProject: (project) => set((state) => {
          state.project = project;
          state.app.isDirty = false;
          state.app.lastSaved = new Date();
        }),

        addAsset: (asset) => set((state) => {
          if (!state.project) return;
          state.project.assets[asset.id] = asset;
          state.app.isDirty = true;
        }),

        updateAsset: (assetId, updates) => set((state) => {
          if (!state.project?.assets[assetId]) return;
          Object.assign(state.project.assets[assetId], updates);
          state.app.isDirty = true;
        }),

        updateAssetInstance: (pageId, instanceId, updates) => set((state) => {
          if (!state.project?.pages[pageId]?.asset_instances[instanceId]) return;
          Object.assign(
            state.project.pages[pageId].asset_instances[instanceId], 
            updates
          );
          state.app.isDirty = true;
        }),

        // Async Actions
        saveProject: async () => {
          const { project } = get();
          if (!project) return;

          set((state) => { state.app.isLoading = true; });
          
          try {
            await window.electronAPI.project.save(project);
            set((state) => {
              state.app.isDirty = false;
              state.app.lastSaved = new Date();
              state.app.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.app.errors.push({
                type: 'save_error',
                message: error.message,
                timestamp: new Date(),
              });
              state.app.isLoading = false;
            });
          }
        },

        importAsset: async (filePath) => {
          set((state) => { state.app.isLoading = true; });
          
          try {
            const asset = await window.electronAPI.assets.import(filePath);
            set((state) => {
              if (state.project) {
                state.project.assets[asset.id] = asset;
                state.app.isDirty = true;
              }
              state.app.isLoading = false;
            });
            return asset;
          } catch (error) {
            set((state) => {
              state.app.errors.push({
                type: 'import_error',
                message: `Failed to import asset: ${error.message}`,
                timestamp: new Date(),
              });
              state.app.isLoading = false;
            });
            throw error;
          }
        },
      }))
    ),
    { name: 'komae-store' }
  )
);
```

## UI操作からYAML更新までの流れ

### Asset追加フロー

```
┌─────────────────┐
│ User drops file │
│ to Asset Window │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ AssetWindow     │
│ .onDrop()       │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ importAsset()   │
│ (async action)  │
└─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ IPC Call        │───▶│ Main Process    │
│ assets.import() │    │ FileSystem I/O  │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ Store Update    │    │ Image Analysis  │
│ addAsset()      │    │ - Dimensions    │
└─────────────────┘    │ - File Format   │
         │              │ - Optimization  │
         ▼              └─────────────────┘
┌─────────────────┐
│ UI Re-render    │
│ - Asset Card    │
│ - Update Count  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Side Effects    │
│ - Auto Save     │
│ - Dirty Flag    │
└─────────────────┘
```

### SpreadSheet編集フロー

```
┌─────────────────┐
│ User clicks     │
│ checkbox in     │
│ SpreadSheet     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ SpreadSheetCell │
│ .onToggle()     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Store Action    │
│ toggleAssetInstance() │
└─────────────────┘
         │
    ┌────┴─────┐
    ▼          ▼
┌─────────┐ ┌─────────┐
│ Create  │ │ Delete  │
│ Instance│ │ Instance│
└─────────┘ └─────────┘
    │          │
    └────┬─────┘
         ▼
┌─────────────────┐
│ Update Store    │
│ pages[id]       │
│ .asset_instances│
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Reactive        │
│ UI Updates      │
│ - SpreadSheet   │
│ - Preview       │
└─────────────────┘
```

## リアルタイム同期機構

### Preview同期システム

```typescript
// src/renderer/hooks/usePreviewSync.ts
export const usePreviewSync = () => {
  const store = useProjectStore();

  // Preview更新が必要なデータの変更を監視
  useEffect(() => {
    const unsubscribe = useProjectStore.subscribe(
      (state) => ({
        pages: state.project?.pages,
        assets: state.project?.assets,
        currentPage: state.ui.currentPage,
      }),
      (current, previous) => {
        if (!current.currentPage) return;

        // 現在のページに関連する変更のみを検出
        const currentPageData = current.pages?.[current.currentPage];
        const previousPageData = previous.pages?.[current.currentPage];

        if (currentPageData !== previousPageData) {
          // ページデータが変更された場合
          updatePreview(currentPageData, current.assets);
        } else if (hasRelevantAssetChanges(current, previous, currentPageData)) {
          // 関連するAssetが変更された場合
          updatePreview(currentPageData, current.assets);
        }
      },
      {
        equalityFn: shallow,
        fireImmediately: false,
      }
    );

    return unsubscribe;
  }, []);
};

const hasRelevantAssetChanges = (
  current: ProjectData,
  previous: ProjectData,
  pageData: Page
): boolean => {
  if (!pageData?.asset_instances) return false;

  // ページで使用されているAssetのIDを取得
  const usedAssetIds = Object.values(pageData.asset_instances)
    .map(instance => instance.asset_id);

  // 使用されているAssetに変更があったかチェック
  return usedAssetIds.some(assetId => 
    current.assets?.[assetId] !== previous.assets?.[assetId]
  );
};
```

### Auto-Save機構

```typescript
// src/renderer/hooks/useAutoSave.ts
export const useAutoSave = () => {
  const store = useProjectStore();

  useEffect(() => {
    let saveTimeout: NodeJS.Timeout;

    const unsubscribe = useProjectStore.subscribe(
      (state) => state.app.isDirty,
      (isDirty) => {
        if (isDirty) {
          // Debounce: 3秒間変更がなかった場合に保存
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            store.saveProject();
          }, 3000);
        }
      }
    );

    // 定期的な強制保存（5分間隔）
    const periodicSave = setInterval(() => {
      if (store.app.isDirty) {
        store.saveProject();
      }
    }, 5 * 60 * 1000);

    return () => {
      unsubscribe();
      clearTimeout(saveTimeout);
      clearInterval(periodicSave);
    };
  }, [store]);
};
```

## Undo/Redo機能

### Command Pattern実装

```typescript
// src/renderer/stores/historyStore.ts
interface Command {
  id: string;
  type: string;
  timestamp: Date;
  execute: () => void;
  undo: () => void;
  redo?: () => void;
}

interface HistoryState {
  history: Command[];
  currentIndex: number;
  maxHistorySize: number;
}

export const useHistoryStore = create<HistoryState & {
  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}>((set, get) => ({
  history: [],
  currentIndex: -1,
  maxHistorySize: 100,

  execute: (command) => {
    const { history, currentIndex, maxHistorySize } = get();
    
    // コマンドを実行
    command.execute();
    
    // 履歴を更新
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(command);
    
    // 最大サイズを超えた場合は古いものを削除
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      currentIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, currentIndex } = get();
    
    if (currentIndex >= 0) {
      history[currentIndex].undo();
      set({ currentIndex: currentIndex - 1 });
    }
  },

  redo: () => {
    const { history, currentIndex } = get();
    
    if (currentIndex < history.length - 1) {
      const nextIndex = currentIndex + 1;
      const command = history[nextIndex];
      
      if (command.redo) {
        command.redo();
      } else {
        command.execute();
      }
      
      set({ currentIndex: nextIndex });
    }
  },
}));
```

### コマンド定義例

```typescript
// src/renderer/commands/AssetCommands.ts
export const createAddAssetCommand = (asset: Asset): Command => ({
  id: `add-asset-${asset.id}`,
  type: 'ADD_ASSET',
  timestamp: new Date(),
  
  execute: () => {
    useProjectStore.getState().addAsset(asset);
  },
  
  undo: () => {
    useProjectStore.getState().deleteAsset(asset.id);
  },
});

export const createUpdateAssetInstanceCommand = (
  pageId: string,
  instanceId: string,
  oldData: AssetInstance,
  newData: Partial<AssetInstance>
): Command => ({
  id: `update-instance-${instanceId}`,
  type: 'UPDATE_ASSET_INSTANCE',
  timestamp: new Date(),
  
  execute: () => {
    useProjectStore.getState().updateAssetInstance(pageId, instanceId, newData);
  },
  
  undo: () => {
    useProjectStore.getState().updateAssetInstance(pageId, instanceId, oldData);
  },
});
```

## パフォーマンス最適化

### 状態更新の最適化

```typescript
// src/renderer/hooks/useOptimizedUpdates.ts
export const useOptimizedUpdates = () => {
  // Batch Updates: 複数の状態変更を一度に処理
  const batchUpdate = useBatch();
  
  const updateMultipleInstances = useCallback((updates: AssetInstanceUpdate[]) => {
    batchUpdate(() => {
      updates.forEach(({ pageId, instanceId, data }) => {
        useProjectStore.getState().updateAssetInstance(pageId, instanceId, data);
      });
    });
  }, [batchUpdate]);

  return { updateMultipleInstances };
};

// React.memo with custom comparison
export const SpreadSheetCell = React.memo<SpreadSheetCellProps>(
  ({ pageId, assetId, instance, onUpdate }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // カスタム比較関数で不要な再レンダリングを防止
    return (
      prevProps.pageId === nextProps.pageId &&
      prevProps.assetId === nextProps.assetId &&
      shallow(prevProps.instance, nextProps.instance)
    );
  }
);
```

### メモリ管理

```typescript
// src/renderer/utils/memoryManager.ts
export class MemoryManager {
  private imageCache = new Map<string, HTMLImageElement>();
  private maxCacheSize = 50;

  async loadImage(assetId: string, imagePath: string): Promise<HTMLImageElement> {
    // キャッシュから取得
    if (this.imageCache.has(assetId)) {
      return this.imageCache.get(assetId)!;
    }

    // 新しい画像を読み込み
    const img = new Image();
    img.src = imagePath;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // キャッシュに追加（サイズ制限あり）
    if (this.imageCache.size >= this.maxCacheSize) {
      const firstKey = this.imageCache.keys().next().value;
      this.imageCache.delete(firstKey);
    }
    
    this.imageCache.set(assetId, img);
    return img;
  }

  clearCache(): void {
    this.imageCache.clear();
  }
}
```

## エラーハンドリング

### エラー境界とリカバリ

```typescript
// src/renderer/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // エラーログを送信
    console.error('Component Error:', error, errorInfo);
    
    // Store にエラーを記録
    useProjectStore.getState().addError({
      type: 'component_error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>何かが間違いました</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            再試行
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## データ整合性の保証

### Validation Schema

```typescript
// src/renderer/validation/projectSchema.ts
import { z } from 'zod';

const AssetSchema = z.object({
  id: z.string(),
  type: z.enum(['ImageAsset', 'TextAsset']),
  name: z.string(),
  // ... other fields
});

const ProjectSchema = z.object({
  metadata: z.object({
    komae_version: z.string(),
    project_version: z.string(),
    title: z.string(),
    description: z.string().optional(),
  }),
  canvas: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  assets: z.record(z.string(), AssetSchema),
  pages: z.record(z.string(), PageSchema),
});

export const validateProject = (data: unknown): ProjectData => {
  try {
    return ProjectSchema.parse(data);
  } catch (error) {
    throw new ValidationError('Invalid project data', error);
  }
};
```

この包括的なデータフロー仕様により、**一貫性のある状態管理**と**高いパフォーマンス**を両立できます。
