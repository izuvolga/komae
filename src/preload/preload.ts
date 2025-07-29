import { contextBridge, ipcRenderer } from 'electron';
import type { 
  ProjectCreateParams, 
  ProjectData, 
  ExportFormat, 
  ExportOptions,
  OpenDialogOptions,
  SaveDialogOptions 
} from '../types/entities';

// ElectronAPI定義
const electronAPI = {
  // Project Operations
  project: {
    create: (params: ProjectCreateParams): Promise<ProjectData> => 
      ipcRenderer.invoke('project:create', params),
    
    save: (projectData: ProjectData, filePath?: string): Promise<string> => 
      ipcRenderer.invoke('project:save', projectData, filePath),
    
    load: (filePath: string): Promise<ProjectData> => 
      ipcRenderer.invoke('project:load', filePath),
    
    export: (format: ExportFormat, options: ExportOptions): Promise<string> => 
      ipcRenderer.invoke('project:export', format, options),
    
    createDirectory: (projectPath: string): Promise<void> => 
      ipcRenderer.invoke('project:createDirectory', projectPath),
    
    validateDirectory: (projectPath: string): Promise<boolean> => 
      ipcRenderer.invoke('project:validateDirectory', projectPath),
      
    getCurrentPath: (): Promise<string | null> => 
      ipcRenderer.invoke('project:getCurrentPath'),
  },

  // Asset Operations
  assets: {
    import: (filePath: string) => 
      ipcRenderer.invoke('asset:import', filePath),
    
    delete: (assetId: string, project?: any) => 
      ipcRenderer.invoke('asset:delete', assetId, project),
    
    optimize: (assetId: string) => 
      ipcRenderer.invoke('asset:optimize', assetId),
  },

  // File System Operations
  fileSystem: {
    showOpenDialog: (options: OpenDialogOptions) => 
      ipcRenderer.invoke('dialog:showOpen', options),
    
    showSaveDialog: (options: SaveDialogOptions) => 
      ipcRenderer.invoke('dialog:showSave', options),
    
    readImageAsDataUrl: (filePath: string): Promise<string> => 
      ipcRenderer.invoke('fileSystem:readImageAsDataUrl', filePath),
  },

  // System Integration
  system: {
    getVersion: (): Promise<string> => 
      ipcRenderer.invoke('app:getVersion'),
    
    setTitle: (title: string): Promise<void> => 
      ipcRenderer.invoke('window:setTitle', title),
    
    showItemInFolder: (filePath: string): Promise<void> => 
      ipcRenderer.invoke('shell:showItemInFolder', filePath),
  },

  // Logger Integration
  logger: {
    logUserInteraction: (action: string, component: string, context: any): Promise<void> =>
      ipcRenderer.invoke('logger:userInteraction', action, component, context),
    
    logError: (operation: string, error: Error | string, context: any): Promise<void> =>
      ipcRenderer.invoke('logger:error', operation, error, context),
    
    logDevelopment: (operation: string, description: string, context: any): Promise<void> =>
      ipcRenderer.invoke('logger:development', operation, description, context),
    
    logPerformance: (operation: string, duration: number, context: any): Promise<void> =>
      ipcRenderer.invoke('logger:performance', operation, duration, context),
  },

  // Menu Event Listeners
  menu: {
    onNewProject: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:new-project', handler);
      return () => ipcRenderer.removeListener('menu:new-project', handler);
    },
    
    onOpenProject: (callback: (filePath: string) => void) => {
      const handler = (_event: any, filePath: string) => callback(filePath);
      ipcRenderer.on('menu:open-project', handler);
      return () => ipcRenderer.removeListener('menu:open-project', handler);
    },
    
    onSaveProject: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:save-project', handler);
      return () => ipcRenderer.removeListener('menu:save-project', handler);
    },
    
    onExportProject: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:export-project', handler);
      return () => ipcRenderer.removeListener('menu:export-project', handler);
    },
    
    onUndo: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:undo', handler);
      return () => ipcRenderer.removeListener('menu:undo', handler);
    },
    
    onRedo: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:redo', handler);
      return () => ipcRenderer.removeListener('menu:redo', handler);
    },
    
    onAbout: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:about', handler);
      return () => ipcRenderer.removeListener('menu:about', handler);
    },
  },
};

// Context Bridge経由でAPIを公開
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript用の型定義をエクスポート
export type ElectronAPI = typeof electronAPI;