import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  ProjectData, 
  UIState, 
  AppState, 
  Asset, 
  AssetInstance, 
  Page,
  ExportFormat,
  ExportOptions 
} from '../../types/entities';

interface ProjectStore {
  // State
  project: ProjectData | null;
  ui: UIState;
  app: AppState;

  // Project Actions
  setProject: (project: ProjectData) => void;
  clearProject: () => void;
  
  // Asset Actions
  addAsset: (asset: Asset) => void;
  updateAsset: (assetId: string, updates: Partial<Asset>) => void;
  deleteAsset: (assetId: string) => void;
  
  // Page Actions
  addPage: (page: Page) => void;
  updatePage: (pageId: string, updates: Partial<Page>) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (pageIds: string[]) => void;
  
  // AssetInstance Actions
  addAssetInstance: (pageId: string, instance: AssetInstance) => void;
  updateAssetInstance: (pageId: string, instanceId: string, updates: Partial<AssetInstance>) => void;
  deleteAssetInstance: (pageId: string, instanceId: string) => void;
  toggleAssetInstance: (pageId: string, assetId: string) => void;
  
  // UI Actions
  selectAssets: (assetIds: string[]) => void;
  selectPages: (pageIds: string[]) => void;
  setCurrentPage: (pageId: string | null) => void;
  setActiveWindow: (window: UIState['activeWindow']) => void;
  setPreviewMode: (mode: UIState['previewMode']) => void;
  setZoomLevel: (level: number) => void;
  toggleAssetLibrary: () => void;
  togglePreview: () => void;
  
  // App Actions
  setLoading: (loading: boolean) => void;
  setDirty: (dirty: boolean) => void;
  addError: (error: AppState['errors'][0]) => void;
  clearErrors: () => void;
  
  // Async Actions
  saveProject: () => Promise<void>;
  loadProject: (filePath: string) => Promise<void>;
  exportProject: (format: ExportFormat, options?: ExportOptions) => Promise<void>;
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
          showAssetLibrary: true,
          showPreview: true,
        },
        app: {
          isLoading: false,
          isDirty: false,
          lastSaved: null,
          errors: [],
          clipboard: null,
        },

        // Project Actions
        setProject: (project) => set((state) => {
          state.project = project;
          state.app.isDirty = false;
          state.app.lastSaved = new Date();
          
          // 最初のページを現在のページに設定
          const pageIds = Object.keys(project.pages);
          if (pageIds.length > 0 && !state.ui.currentPage) {
            state.ui.currentPage = pageIds[0];
          }
        }),

        clearProject: () => set((state) => {
          state.project = null;
          state.ui.currentPage = null;
          state.ui.selectedAssets = [];
          state.ui.selectedPages = [];
          state.app.isDirty = false;
          state.app.lastSaved = null;
        }),

        // Asset Actions
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

        deleteAsset: (assetId) => set((state) => {
          if (!state.project) return;
          delete state.project.assets[assetId];
          
          // 関連するAssetInstanceも削除
          Object.values(state.project.pages).forEach(page => {
            Object.entries(page.asset_instances).forEach(([instanceId, instance]) => {
              if (instance.asset_id === assetId) {
                delete page.asset_instances[instanceId];
              }
            });
          });
          
          state.app.isDirty = true;
        }),

        // Page Actions
        addPage: (page) => set((state) => {
          if (!state.project) return;
          state.project.pages[page.id] = page;
          state.app.isDirty = true;
        }),

        updatePage: (pageId, updates) => set((state) => {
          if (!state.project?.pages[pageId]) return;
          Object.assign(state.project.pages[pageId], updates);
          state.app.isDirty = true;
        }),

        deletePage: (pageId) => set((state) => {
          if (!state.project) return;
          delete state.project.pages[pageId];
          
          // 現在のページが削除された場合は別のページを選択
          if (state.ui.currentPage === pageId) {
            const remainingPages = Object.keys(state.project.pages);
            state.ui.currentPage = remainingPages.length > 0 ? remainingPages[0] : null;
          }
          
          state.app.isDirty = true;
        }),

        reorderPages: (pageIds) => set((state) => {
          if (!state.project) return;
          
          // ページ順序を更新（実装は後で詳細化）
          console.log('Reordering pages:', pageIds);
          state.app.isDirty = true;
        }),

        addAssetInstance: (pageId, instance) => set((state) => {
          if (!state.project?.pages[pageId]) return;
          state.project.pages[pageId].asset_instances[instance.id] = instance;
          state.app.isDirty = true;
        }),

        deleteAssetInstance: (pageId, instanceId) => set((state) => {
          if (!state.project?.pages[pageId]?.asset_instances[instanceId]) return;
          delete state.project.pages[pageId].asset_instances[instanceId];
          state.app.isDirty = true;
        }),

        selectPages: (pageIds) => set((state) => {
          state.ui.selectedPages = pageIds;
        }),

        setPreviewMode: (mode) => set((state) => {
          state.ui.previewMode = mode;
        }),

        setZoomLevel: (level) => set((state) => {
          state.ui.zoomLevel = level;
        }),

        toggleAssetLibrary: () => set((state) => {
          state.ui.showAssetLibrary = !state.ui.showAssetLibrary;
        }),

        togglePreview: () => set((state) => {
          state.ui.showPreview = !state.ui.showPreview;
        }),

        clearErrors: () => set((state) => {
          state.app.errors = [];
        }),

        // AssetInstance Actions
        updateAssetInstance: (pageId, instanceId, updates) => set((state) => {
          if (!state.project?.pages[pageId]?.asset_instances[instanceId]) return;
          Object.assign(state.project.pages[pageId].asset_instances[instanceId], updates);
          state.app.isDirty = true;
        }),

        toggleAssetInstance: (pageId, assetId) => set((state) => {
          if (!state.project?.pages[pageId]) return;
          
          const page = state.project.pages[pageId];
          const existingInstance = Object.values(page.asset_instances).find(
            instance => instance.asset_id === assetId
          );

          if (existingInstance) {
            // 既存のインスタンスを削除
            delete page.asset_instances[existingInstance.id];
          } else {
            // 新しいインスタンスを作成
            const instanceId = `instance-${Date.now()}`;
            const newInstance: AssetInstance = {
              id: instanceId,
              asset_id: assetId,
              z_index: Object.keys(page.asset_instances).length,
              transform: {
                scale_x: 1.0,
                scale_y: 1.0,
                rotation: 0,
              },
              opacity: 1.0,
            };
            page.asset_instances[instanceId] = newInstance;
          }
          
          state.app.isDirty = true;
        }),

        // UI Actions
        selectAssets: (assetIds) => set((state) => {
          state.ui.selectedAssets = assetIds;
        }),

        setCurrentPage: (pageId) => set((state) => {
          state.ui.currentPage = pageId;
        }),

        setActiveWindow: (window) => set((state) => {
          state.ui.activeWindow = window;
        }),

        setLoading: (loading) => set((state) => {
          state.app.isLoading = loading;
        }),

        setDirty: (dirty) => set((state) => {
          state.app.isDirty = dirty;
        }),

        addError: (error) => set((state) => {
          state.app.errors.push(error);
        }),

        // Async Actions
        saveProject: async () => {
          const { project } = get();
          if (!project) return;

          set((state) => { state.app.isLoading = true; });
          
          try {
            const filePath = await window.electronAPI.project.save(project);
            set((state) => {
              state.app.isDirty = false;
              state.app.lastSaved = new Date();
              state.app.isLoading = false;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            set((state) => {
              state.app.errors.push({
                type: 'save_error',
                message,
                timestamp: new Date(),
              });
              state.app.isLoading = false;
            });
            throw error;
          }
        },

        loadProject: async (filePath) => {
          set((state) => { state.app.isLoading = true; });
          
          try {
            const projectData = await window.electronAPI.project.load(filePath);
            get().setProject(projectData);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            set((state) => {
              state.app.errors.push({
                type: 'load_error',
                message: `Failed to load project: ${message}`,
                timestamp: new Date(),
              });
              state.app.isLoading = false;
            });
            throw error;
          }
        },

        importAsset: async (filePath) => {
          set((state) => { state.app.isLoading = true; });
          
          try {
            const asset = await window.electronAPI.assets.import(filePath);
            get().addAsset(asset);
            set((state) => { state.app.isLoading = false; });
            return asset;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            set((state) => {
              state.app.errors.push({
                type: 'import_error',
                message: `Failed to import asset: ${message}`,
                timestamp: new Date(),
              });
              state.app.isLoading = false;
            });
            throw error;
          }
        },

        exportProject: async (format, options = {}) => {
          const { project } = get();
          if (!project) return;

          set((state) => { state.app.isLoading = true; });
          
          try {
            await window.electronAPI.project.export(format, options);
            set((state) => { state.app.isLoading = false; });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            set((state) => {
              state.app.errors.push({
                type: 'export_error',
                message: `Failed to export project: ${message}`,
                timestamp: new Date(),
              });
              state.app.isLoading = false;
            });
            throw error;
          }
        },
      }))
    ),
    {
      name: 'komae-project-store',
    }
  )
);