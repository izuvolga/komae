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
  ExportOptions,
  AppNotification 
} from '../../types/entities';
import { getDefaultExportSettings } from '../../utils/exportSettings';

// ページ配列操作のヘルパー関数
const findPageById = (pages: Page[], pageId: string): Page | undefined => {
  return pages.find(page => page.id === pageId);
};

const findPageIndexById = (pages: Page[], pageId: string): number => {
  return pages.findIndex(page => page.id === pageId);
};

interface ProjectStore {
  // State
  project: ProjectData | null;
  currentProjectPath: string | null;
  ui: UIState;
  app: AppState;
  // 非表示にされたインスタンスの編集内容を一時保存
  hiddenInstanceData: Record<string, Record<string, AssetInstance>>;

  // Project Actions
  setProject: (project: ProjectData) => void;
  setCurrentProjectPath: (path: string | null) => void;
  clearProject: () => void;
  
  // Asset Actions
  addAsset: (asset: Asset) => void;
  updateAsset: (assetId: string, updates: Partial<Asset>) => void;
  deleteAsset: (assetId: string) => void;
  
  // Page Actions
  addPage: (page: Page) => void;
  insertPageAt: (index: number, page: Page) => void;
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
  setZoomLevel: (level: number) => void;
  setCanvasFit: (canvasFit: boolean) => void;
  toggleAssetLibrary: () => void;
  togglePreview: () => void;
  toggleFontManagement: () => void;
  setAssetLibraryWidth: (width: number) => void;
  setPreviewWidth: (width: number) => void;
  setPreviewScroll: (x: number, y: number) => void;
  
  // Language Actions
  getCurrentLanguage: () => string;
  getSupportedLanguages: () => string[];
  setCurrentLanguage: (languageCode: string) => void;
  addSupportedLanguage: (languageCode: string) => void;
  removeSupportedLanguage: (languageCode: string) => void;
  
  // App Actions
  setLoading: (loading: boolean) => void;
  setDirty: (dirty: boolean) => void;
  addError: (error: AppState['errors'][0]) => void;
  clearErrors: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  
  // Async Actions
  saveProject: () => Promise<void>;
  loadProject: (filePath: string) => Promise<void>;
  exportProject: (format: ExportFormat, options?: Partial<ExportOptions>) => Promise<void>;
  importAsset: (filePath: string) => Promise<Asset>;
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        project: null,
        currentProjectPath: null,
        hiddenInstanceData: {},
        ui: {
          selectedAssets: [],
          selectedPages: [],
          currentPage: null,
          activeWindow: 'asset',
          zoomLevel: 1.0,
          canvasFit: true, // デフォルトでON状態
          showAssetLibrary: true,
          showPreview: true,
          showFontManagement: false,
          assetLibraryWidth: 280,
          previewWidth: 320,
          previewScrollX: 0,
          previewScrollY: 0,
        },
        app: {
          isLoading: false,
          isDirty: false,
          lastSaved: null,
          errors: [],
          notifications: [],
          clipboard: null,
        },

        // Project Actions
        setProject: (project) => set((state) => {
          state.project = project;
          state.app.isDirty = false;
          state.app.lastSaved = new Date();
          
          // 最初のページを現在のページに設定（常に新しいプロジェクトの最初のページに設定）
          if (project.pages.length > 0) {
            state.ui.currentPage = project.pages[0].id;
          } else {
            state.ui.currentPage = null;
          }
          
          // ウィンドウタイトルをプロジェクト名に設定
          window.electronAPI?.system?.setTitle(project.metadata.title);
        }),

        setCurrentProjectPath: (path) => set((state) => {
          state.currentProjectPath = path;
        }),

        clearProject: () => set((state) => {
          state.project = null;
          state.currentProjectPath = null;
          state.ui.currentPage = null;
          state.ui.selectedAssets = [];
          state.ui.selectedPages = [];
          state.app.isDirty = false;
          state.app.lastSaved = null;
          state.app.notifications = [];
          
          // ウィンドウタイトルをデフォルトに戻す
          window.electronAPI?.system?.setTitle('Sequential Panel Illustration Creator');
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

        deleteAsset: async (assetId) => {
          const state = get();
          if (!state.project) return;

          try {
            // 物理ファイルを削除（ElectronAPI経由）
            await window.electronAPI?.asset?.delete(assetId, state.project);
          } catch (error) {
            console.error('Failed to delete asset file:', error);
            // ファイル削除に失敗してもプロジェクトデータからは削除する
          }

          set((state) => {
            if (!state.project) return;
            delete state.project.assets[assetId];
            
            // 関連するAssetInstanceも削除
            state.project.pages.forEach(page => {
              Object.entries(page.asset_instances).forEach(([instanceId, instance]) => {
                if (instance.asset_id === assetId) {
                  delete page.asset_instances[instanceId];
                }
              });
            });
            
            state.app.isDirty = true;
          });
        },

        // Page Actions
        addPage: (page) => set((state) => {
          if (!state.project) return;
          state.project.pages.push(page);
          state.app.isDirty = true;
        }),

        insertPageAt: (index, page) => set((state) => {
          if (!state.project) return;
          state.project.pages.splice(index, 0, page);
          state.app.isDirty = true;
        }),

        updatePage: (pageId, updates) => set((state) => {
          if (!state.project) return;
          const pageIndex = findPageIndexById(state.project.pages, pageId);
          if (pageIndex >= 0) {
            Object.assign(state.project.pages[pageIndex], updates);
            state.app.isDirty = true;
          }
        }),

        deletePage: (pageId) => set((state) => {
          if (!state.project) return;
          const pageIndex = findPageIndexById(state.project.pages, pageId);
          if (pageIndex >= 0) {
            state.project.pages.splice(pageIndex, 1);
            
            // 現在のページが削除された場合は別のページを選択
            if (state.ui.currentPage === pageId) {
              state.ui.currentPage = state.project.pages.length > 0 ? state.project.pages[0].id : null;
            }
            
            state.app.isDirty = true;
          }
        }),

        reorderPages: (pageIds) => set((state) => {
          if (!state.project) return;
          
          // 新しい順序でページを並び替え
          const reorderedPages = pageIds.map(id => 
            findPageById(state.project!.pages, id)
          ).filter((page): page is Page => page !== undefined);
          
          state.project.pages = reorderedPages;
          state.app.isDirty = true;
        }),

        addAssetInstance: (pageId, instance) => set((state) => {
          if (!state.project) return;
          const page = findPageById(state.project.pages, pageId);
          if (page) {
            page.asset_instances[instance.id] = instance;
            state.app.isDirty = true;
          }
        }),

        deleteAssetInstance: (pageId, instanceId) => set((state) => {
          if (!state.project) return;
          const page = findPageById(state.project.pages, pageId);
          if (page?.asset_instances[instanceId]) {
            delete page.asset_instances[instanceId];
            state.app.isDirty = true;
          }
        }),

        selectPages: (pageIds) => set((state) => {
          state.ui.selectedPages = pageIds;
        }),

        setZoomLevel: (level) => set((state) => {
          state.ui.zoomLevel = level;
        }),

        setCanvasFit: (canvasFit) => set((state) => {
          state.ui.canvasFit = canvasFit;
        }),

        toggleAssetLibrary: () => set((state) => {
          state.ui.showAssetLibrary = !state.ui.showAssetLibrary;
        }),

        togglePreview: () => set((state) => {
          state.ui.showPreview = !state.ui.showPreview;
        }),
        toggleFontManagement: () => set((state) => {
          state.ui.showFontManagement = !state.ui.showFontManagement;
        }),

        setAssetLibraryWidth: (width) => set((state) => {
          state.ui.assetLibraryWidth = Math.max(200, Math.min(600, width));
        }),

        setPreviewWidth: (width) => set((state) => {
          state.ui.previewWidth = Math.max(200, Math.min(600, width));
        }),

        setPreviewScroll: (x, y) => set((state) => {
          state.ui.previewScrollX = x;
          state.ui.previewScrollY = y;
        }),

        clearErrors: () => set((state) => {
          state.app.errors = [];
        }),

        // AssetInstance Actions
        updateAssetInstance: (pageId, instanceId, updates) => set((state) => {
          if (!state.project) return;
          const page = findPageById(state.project.pages, pageId);
          if (page?.asset_instances[instanceId]) {
            Object.assign(page.asset_instances[instanceId], updates);
            state.app.isDirty = true;
          }
        }),

        toggleAssetInstance: (pageId, assetId) => set((state) => {
          if (!state.project) return;
          const page = findPageById(state.project.pages, pageId);
          if (!page) return;
          
          const existingInstance = Object.values(page.asset_instances).find(
            instance => instance.asset_id === assetId
          );

          if (existingInstance) {
            // 既存のインスタンスを非表示にする前に、編集内容を保存
            const storageKey = `${pageId}-${assetId}`;
            if (!state.hiddenInstanceData[pageId]) {
              state.hiddenInstanceData[pageId] = {};
            }
            // 編集済みの内容がある場合のみ保存
            state.hiddenInstanceData[pageId][assetId] = { ...existingInstance };
            delete page.asset_instances[existingInstance.id];
          } else {
            // 新しいインスタンスを作成、以前の編集内容があれば復元
            const instanceId = `instance-${Date.now()}`;
            let newInstance: AssetInstance = {
              id: instanceId,
              asset_id: assetId,
            };
            
            // 以前に保存された編集内容があるかチェック
            if (state.hiddenInstanceData[pageId]?.[assetId]) {
              const savedInstance = state.hiddenInstanceData[pageId][assetId];
              newInstance = {
                ...savedInstance,
                id: instanceId, // 新しいIDを使用
              };
              // 復元済みなので保存データは削除
              delete state.hiddenInstanceData[pageId][assetId];
            }
            
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

        addNotification: (notification) => set((state) => {
          const newNotification: AppNotification = {
            ...notification,
            id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date(),
          };
          state.app.notifications.push(newNotification);
        }),

        removeNotification: (notificationId) => set((state) => {
          state.app.notifications = state.app.notifications.filter(
            notification => notification.id !== notificationId
          );
        }),

        clearNotifications: () => set((state) => {
          state.app.notifications = [];
        }),

        // Language Management
        getCurrentLanguage: () => {
          const { project } = get();
          return project?.metadata.currentLanguage || 'ja';
        },

        getSupportedLanguages: () => {
          const { project } = get();
          return project?.metadata.supportedLanguages || ['ja'];
        },

        setCurrentLanguage: (languageCode: string) => {
          set((state) => {
            if (state.project) {
              const supportedLanguages = state.project.metadata.supportedLanguages || ['ja'];
              if (supportedLanguages.includes(languageCode)) {
                state.project.metadata.currentLanguage = languageCode;
                state.app.isDirty = true;
              }
            }
          });
        },

        addSupportedLanguage: (languageCode: string) => {
          set((state) => {
            if (state.project) {
              const currentSupported = state.project.metadata.supportedLanguages || ['ja'];
              if (!currentSupported.includes(languageCode)) {
                state.project.metadata.supportedLanguages = [...currentSupported, languageCode];
                state.app.isDirty = true;
              }
            }
          });
        },

        removeSupportedLanguage: (languageCode: string) => {
          set((state) => {
            if (state.project) {
              const currentSupported = state.project.metadata.supportedLanguages || ['ja'];
              if (currentSupported.length > 1 && currentSupported.includes(languageCode)) {
                const newSupported = currentSupported.filter(lang => lang !== languageCode);
                state.project.metadata.supportedLanguages = newSupported;
                
                // 削除した言語がcurrentLanguageの場合、最初の言語に変更
                if (state.project.metadata.currentLanguage === languageCode) {
                  state.project.metadata.currentLanguage = newSupported[0];
                }
                
                state.app.isDirty = true;
              }
            }
          });
        },

        // Async Actions
        saveProject: async () => {
          const { project, addNotification } = get();
          if (!project) return;

          set((state) => { state.app.isLoading = true; });
          
          try {
            const filePath = await window.electronAPI.project.save(project);
            
            // プロジェクトパスを取得して設定
            const projectPath = await window.electronAPI.project.getCurrentPath();
            get().setCurrentProjectPath(projectPath);
            
            set((state) => {
              state.app.isDirty = false;
              state.app.lastSaved = new Date();
              state.app.isLoading = false;
            });
            // 保存成功の通知を表示
            addNotification({
              type: 'success',
              title: 'プロジェクトが保存されました',
              message: 'プロジェクトファイルの保存が完了しました',
              autoClose: true,
              duration: 3000,
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

            // 保存失敗の通知を表示
            addNotification({
              type: 'error',
              title: 'プロジェクトの保存に失敗しました',
              message: `エラー: ${message}`,
              autoClose: false,
            });
            
            throw error;
          }
        },

        loadProject: async (filePath) => {
          const { addNotification } = get();
          set((state) => { state.app.isLoading = true; });
          
          try {
            const projectData = await window.electronAPI.project.load(filePath);
            get().setProject(projectData);
            
            // プロジェクトパスを取得して設定
            const projectPath = await window.electronAPI.project.getCurrentPath();
            get().setCurrentProjectPath(projectPath);
            
            // ローディング状態を解除
            set((state) => { state.app.isLoading = false; });
            
            // プロジェクト読み込み成功の通知を表示
            addNotification({
              type: 'success',
              title: 'プロジェクトが読み込まれました',
              message: `${projectData.metadata.title} を開きました`,
              autoClose: true,
              duration: 3000,
            });
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

            // プロジェクト読み込み失敗の通知を表示
            addNotification({
              type: 'error',
              title: 'プロジェクトの読み込みに失敗しました',
              message: `エラー: ${message}`,
              autoClose: false,
            });
            
            throw error;
          }
        },

        importAsset: async (filePath) => {
          const { addNotification } = get();
          set((state) => { state.app.isLoading = true; });
          
          try {
            const asset = await window.electronAPI.asset.import(filePath);
            get().addAsset(asset);
            set((state) => { state.app.isLoading = false; });
            
            // アセットインポート成功の通知を表示
            addNotification({
              type: 'success',
              title: 'アセットがインポートされました',
              message: `${asset.name} をプロジェクトに追加しました`,
              autoClose: true,
              duration: 3000,
            });
            
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

            // アセットインポート失敗の通知を表示
            addNotification({
              type: 'error',
              title: 'アセットのインポートに失敗しました',
              message: `エラー: ${message}`,
              autoClose: false,
            });
            
            throw error;
          }
        },

        exportProject: async (format, options = {} as Partial<ExportOptions>) => {
          const { project } = get();
          if (!project) return;

          set((state) => { state.app.isLoading = true; });
          
          try {
            // デフォルト設定を生成し、オプションをマージ
            const defaultSettings = getDefaultExportSettings(project);
            const mergedOptions: ExportOptions = {
              ...defaultSettings,
              ...options,
              format // formatは引数から設定
            };
            
            await window.electronAPI.project.export(project, format, mergedOptions);
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
