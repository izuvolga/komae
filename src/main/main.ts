import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import * as path from 'path';
import { ProjectManager } from './services/ProjectManager';
import { FileSystemService } from './services/FileSystemService';
import { AssetManager } from './services/AssetManager';
import type { ProjectCreateParams, ExportFormat, ExportOptions } from '../types/entities';

class KomaeApp {
  private mainWindow: BrowserWindow | null = null;
  private projectManager: ProjectManager;
  private fileSystemService: FileSystemService;
  private assetManager: AssetManager;

  constructor() {
    this.projectManager = new ProjectManager();
    this.fileSystemService = new FileSystemService();
    this.assetManager = new AssetManager();
    
    this.setupEventHandlers();
    this.setupIPC();
  }

  private setupEventHandlers(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.createMenu();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false,
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
    }

    // Window event handlers
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private createMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Project',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send('menu:new-project');
            },
          },
          {
            label: 'Open Project',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              const result = await dialog.showOpenDialog(this.mainWindow!, {
                title: 'Open Project',
                filters: [
                  { name: 'Komae Project', extensions: ['komae'] },
                ],
                properties: ['openFile'],
              });

              if (!result.canceled && result.filePaths.length > 0) {
                this.mainWindow?.webContents.send('menu:open-project', result.filePaths[0]);
              }
            },
          },
          {
            label: 'Save Project',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              this.mainWindow?.webContents.send('menu:save-project');
            },
          },
          { type: 'separator' },
          {
            label: 'Export Project',
            submenu: [
              {
                label: 'Export to HTML',
                click: () => {
                  this.mainWindow?.webContents.send('menu:export-html');
                },
              },
              {
                label: 'Export to PNG',
                click: () => {
                  this.mainWindow?.webContents.send('menu:export-png');
                },
              },
            ],
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          {
            label: 'Undo',
            accelerator: 'CmdOrCtrl+Z',
            click: () => {
              this.mainWindow?.webContents.send('menu:undo');
            },
          },
          {
            label: 'Redo',
            accelerator: 'CmdOrCtrl+Shift+Z',
            click: () => {
              this.mainWindow?.webContents.send('menu:redo');
            },
          },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Komae',
            click: () => {
              this.mainWindow?.webContents.send('menu:about');
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC(): void {
    // Project Operations
    ipcMain.handle('project:create', async (event, params: ProjectCreateParams) => {
      try {
        return await this.projectManager.createProject(params);
      } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
      }
    });

    ipcMain.handle('project:save', async (event, projectData, filePath?: string) => {
      try {
        return await this.projectManager.saveProject(projectData, filePath);
      } catch (error) {
        console.error('Failed to save project:', error);
        throw error;
      }
    });

    ipcMain.handle('project:load', async (event, filePath: string) => {
      try {
        return await this.projectManager.loadProject(filePath);
      } catch (error) {
        console.error('Failed to load project:', error);
        throw error;
      }
    });

    ipcMain.handle('project:export', async (event, format: ExportFormat, options: ExportOptions) => {
      try {
        return await this.projectManager.exportProject(format, options);
      } catch (error) {
        console.error('Failed to export project:', error);
        throw error;
      }
    });

    // Asset Operations
    ipcMain.handle('asset:import', async (event, filePath: string) => {
      try {
        return await this.assetManager.importAsset(filePath);
      } catch (error) {
        console.error('Failed to import asset:', error);
        throw error;
      }
    });

    ipcMain.handle('asset:delete', async (event, assetId: string) => {
      try {
        return await this.assetManager.deleteAsset(assetId);
      } catch (error) {
        console.error('Failed to delete asset:', error);
        throw error;
      }
    });

    ipcMain.handle('asset:optimize', async (event, assetId: string) => {
      try {
        return await this.assetManager.optimizeAsset(assetId);
      } catch (error) {
        console.error('Failed to optimize asset:', error);
        throw error;
      }
    });

    // File System Operations
    ipcMain.handle('dialog:showOpen', async (event, options) => {
      try {
        return await dialog.showOpenDialog(this.mainWindow!, options);
      } catch (error) {
        console.error('Failed to show open dialog:', error);
        throw error;
      }
    });

    ipcMain.handle('dialog:showSave', async (event, options) => {
      try {
        return await dialog.showSaveDialog(this.mainWindow!, options);
      } catch (error) {
        console.error('Failed to show save dialog:', error);
        throw error;
      }
    });

    // Application Operations
    ipcMain.handle('app:getVersion', async () => {
      return app.getVersion();
    });

    ipcMain.handle('window:setTitle', async (event, title: string) => {
      this.mainWindow?.setTitle(`Komae - ${title}`);
    });

    ipcMain.handle('shell:showItemInFolder', async (event, filePath: string) => {
      const { shell } = await import('electron');
      shell.showItemInFolder(filePath);
    });
  }
}

// Initialize the application
new KomaeApp();