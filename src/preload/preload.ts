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

  // File System Operations
  fileSystem: {
    showOpenDialog: (options: OpenDialogOptions) => 
      ipcRenderer.invoke('dialog:showOpen', options),
    
    showSaveDialog: (options: SaveDialogOptions) => 
      ipcRenderer.invoke('dialog:showSave', options),
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
    
    onExportHtml: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:export-html', handler);
      return () => ipcRenderer.removeListener('menu:export-html', handler);
    },
    
    onExportPng: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:export-png', handler);
      return () => ipcRenderer.removeListener('menu:export-png', handler);
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