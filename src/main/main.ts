import { app, BrowserWindow, ipcMain, Menu, dialog, protocol } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { ProjectManager } from './services/ProjectManager';
import { FileSystemService } from './services/FileSystemService';
import { AssetManager } from './services/AssetManager';
import { ExportService } from './services/ExportService';
import { getLogger } from '../utils/logger';
import type { ProjectCreateParams, ExportFormat, ExportOptions } from '../types/entities';

class KomaeApp {
  private mainWindow: BrowserWindow | null = null;
  private projectManager: ProjectManager;
  private fileSystemService: FileSystemService;
  private assetManager: AssetManager;
  private exportService: ExportService;
  private logger = getLogger();

  constructor() {
    this.projectManager = new ProjectManager();
    this.fileSystemService = new FileSystemService();
    this.assetManager = new AssetManager();
    this.exportService = new ExportService();
    
    this.setupEventHandlers();
    this.setupIPC();
    this.setupCustomProtocol();
  }

  /**
   * プラットフォーム固有のファイルダイアログ設定を取得
   */
  private getOpenDialogOptions(): Electron.OpenDialogOptions {
    return {
      title: 'Open Project',
      filters: [
        { name: 'Komae Project', extensions: ['komae'] },
      ],
      properties: ['openFile'],
    };
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
      titleBarStyle: 'default',
      title: 'Komae - Sequential Panel Illustration Creator',
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
              const options = this.getOpenDialogOptions();
              const result = await dialog.showOpenDialog(this.mainWindow!, options);

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
            accelerator: 'CmdOrCtrl+E',
            click: () => {
              this.mainWindow?.webContents.send('menu:export-project');
            },
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
        const savedPath = await this.projectManager.saveProject(projectData, filePath);
        // 保存したプロジェクトパスをAssetManagerに設定
        const projectDir = this.projectManager.getCurrentProjectPath();
        this.assetManager.setCurrentProjectPath(projectDir);
        return savedPath;
      } catch (error) {
        console.error('Failed to save project:', error);
        throw error;
      }
    });

    ipcMain.handle('project:load', async (event, filePath: string) => {
      try {
        const projectData = await this.projectManager.loadProject(filePath);
        // 読み込んだプロジェクトパスをAssetManagerに設定
        const projectDir = this.projectManager.getCurrentProjectPath();
        this.assetManager.setCurrentProjectPath(projectDir);
        return projectData;
      } catch (error) {
        console.error('Failed to load project:', error);
        throw error;
      }
    });

    ipcMain.handle('project:export', async (event, projectData: any, format: ExportFormat, options: ExportOptions) => {
      try {
        if (!projectData) {
          throw new Error('No project data provided for export');
        }

        // ExportServiceを使用してエクスポートを実行
        const result = await this.exportService.exportProject(projectData, options);
        
        if (result.success) {
          await this.logger.logDevelopment('export_success', 'Project export completed successfully', {
            format: options.format,
            outputPath: result.outputPath
          });
          return result.outputPath;
        } else {
          throw new Error(result.error || 'Export failed');
        }
      } catch (error) {
        await this.logger.logError('export_failed', error as Error, {
          format: options.format,
          title: options.title
        });
        console.error('Failed to export project:', error);
        throw error;
      }
    });

    ipcMain.handle('project:getCurrentPath', async () => {
      try {
        return this.projectManager.getCurrentProjectPath();
      } catch (error) {
        console.error('Failed to get current project path:', error);
        throw error;
      }
    });

    ipcMain.handle('project:createDirectory', async (event, projectPath: string) => {
      try {
        await this.projectManager.createProjectDirectory(projectPath);
        // 作成したプロジェクトパスをAssetManagerに設定
        this.assetManager.setCurrentProjectPath(projectPath);
        return;
      } catch (error) {
        console.error('Failed to create project directory:', error);
        throw error;
      }
    });

    ipcMain.handle('project:validateDirectory', async (event, projectPath: string) => {
      try {
        return await this.projectManager.validateProjectDirectory(projectPath);
      } catch (error) {
        console.error('Failed to validate project directory:', error);
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

    ipcMain.handle('asset:delete', async (event, assetId: string, project?: any) => {
      try {
        return await this.assetManager.deleteAsset(assetId, project);
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
        // プラットフォーム固有の設定をマージ
        const platformOptions = this.getOpenDialogOptions();
        const mergedOptions = {
          ...platformOptions,
          ...options,
          // プラットフォーム固有のpropertiesを優先
          properties: platformOptions.properties,
        };
        return await dialog.showOpenDialog(this.mainWindow!, mergedOptions);
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

    // File System Operations
    ipcMain.handle('fileSystem:readImageAsDataUrl', async (event, filePath: string) => {
      try {
        console.debug('[Main IPC] fileSystem:readImageAsDataUrl called with:', filePath);
        return await this.fileSystemService.readImageAsDataUrl(filePath);
      } catch (error) {
        console.error('Failed to read image as data URL:', error);
        console.error('[Main IPC] Error for file path:', filePath);
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

    // Logger Operations
    ipcMain.handle('logger:userInteraction', async (event, action: string, component: string, context: any) => {
      try {
        await this.logger.logUserInteraction(action, component, context);
      } catch (error) {
        console.error('Failed to log user interaction:', error);
      }
    });

    ipcMain.handle('logger:error', async (event, operation: string, error: Error | string, context: any) => {
      try {
        await this.logger.logError(operation, error, context);
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    });

    ipcMain.handle('logger:development', async (event, operation: string, description: string, context: any) => {
      try {
        await this.logger.logDevelopment(operation, description, context);
      } catch (error) {
        console.error('Failed to log development info:', error);
      }
    });

    ipcMain.handle('logger:performance', async (event, operation: string, duration: number, context: any) => {
      try {
        await this.logger.logPerformance(operation, duration, context);
      } catch (error) {
        console.error('Failed to log performance:', error);
      }
    });
  }

  /**
   * カスタムプロトコルを登録してプレビュー用ローカルファイルアクセスを有効化
   */
  private setupCustomProtocol(): void {
    // アプリ準備完了後にプロトコルを登録
    app.whenReady().then(() => {
      protocol.registerFileProtocol('komae-asset', (request, callback) => {
        try {
          // URLをデコードして正しいパスを取得
          let filePath = decodeURIComponent(request.url.substr(13)); // 'komae-asset://' を除去
          
          // 余分なスラッシュを除去
          if (filePath.startsWith('//')) {
            filePath = filePath.substr(1);
          }
          console.debug('[Custom Protocol] Requested file path:', filePath);
          // セキュリティ: プロジェクトディレクトリ内のファイルのみアクセス許可
          const currentProjectPath = this.projectManager.getCurrentProjectPath();
          console.debug('[Custom Protocol] Current project path:', currentProjectPath);
          
          if (currentProjectPath && filePath.startsWith(currentProjectPath)) {
            console.debug('[Custom Protocol] Allowing access to:', filePath);
            callback({ path: filePath });
          } else {
            console.warn('[Custom Protocol] Access denied to:', filePath);
            console.warn('[Custom Protocol] Project path:', currentProjectPath);
            callback({ error: -3 }); // ERROR_ABORTED
          }
        } catch (error) {
          console.error('[Custom Protocol] Error processing request:', error);
          callback({ error: -2 }); // ERROR_FAILED
        }
      });
      console.log('[Custom Protocol] komae-asset:// protocol registered successfully');
    });
  }
}

// Initialize the application
new KomaeApp();
