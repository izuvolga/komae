import { app, BrowserWindow, ipcMain, Menu, dialog, protocol } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { ProjectManager } from './services/ProjectManager';
import { FileSystemService } from './services/FileSystemService';
import { AssetManager } from './services/AssetManager';
import { FontManager } from './services/FontManager';
import { CustomAssetManager } from './services/CustomAssetManager';
import { ExportService } from './services/ExportService';
import { getLogger } from '../utils/logger';
import type { ProjectCreateParams, ExportFormat, ExportOptions } from '../types/entities';

class KomaeApp {
  private mainWindow: BrowserWindow | null = null;
  private projectManager: ProjectManager;
  private fileSystemService: FileSystemService;
  private assetManager: AssetManager;
  private fontManager: FontManager;
  private customAssetManager: CustomAssetManager;
  private exportService: ExportService;
  private logger = getLogger();

  constructor() {
    this.projectManager = new ProjectManager();
    this.fileSystemService = new FileSystemService();
    this.assetManager = new AssetManager();
    this.fontManager = new FontManager();
    this.customAssetManager = new CustomAssetManager();
    this.exportService = new ExportService(this.fontManager);
    
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
          {
            label: 'Toggle Dark Mode',
            accelerator: 'CmdOrCtrl+Shift+D',
            click: () => {
              console.log('[Main] Toggle Dark Mode menu clicked, sending IPC event');
              this.mainWindow?.webContents.send('menu:toggle-dark-mode');
            },
          },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Extension',
        submenu: [
          {
            label: 'Custom Fonts',
            click: () => {
              this.mainWindow?.webContents.send('menu:custom-fonts');
            },
          },
          {
            label: 'Custom Assets',
            click: () => {
              this.mainWindow?.webContents.send('menu:custom-assets');
            },
          },
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
        // 保存したプロジェクトパスをAssetManagerとFontManagerに設定
        const projectDir = this.projectManager.getCurrentProjectPath();
        this.assetManager.setCurrentProjectPath(projectDir);
        this.fontManager.setCurrentProjectPath(projectDir);
        return savedPath;
      } catch (error) {
        console.error('Failed to save project:', error);
        throw error;
      }
    });

    ipcMain.handle('project:load', async (event, filePath: string) => {
      try {
        const projectData = await this.projectManager.loadProject(filePath);
        // 読み込んだプロジェクトパスをAssetManagerとFontManagerに設定
        const projectDir = this.projectManager.getCurrentProjectPath();
        this.assetManager.setCurrentProjectPath(projectDir);
        this.fontManager.setCurrentProjectPath(projectDir);
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

        // 現在のプロジェクトパスを取得してExportServiceに渡す
        const currentProjectPath = this.projectManager.getCurrentProjectPath();
        const result = await this.exportService.exportProject(projectData, options, currentProjectPath);
        
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
        // 作成したプロジェクトパスをAssetManagerとFontManagerに設定
        this.assetManager.setCurrentProjectPath(projectPath);
        this.fontManager.setCurrentProjectPath(projectPath);
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

    ipcMain.handle('asset:createTextAsset', async (event, name: string, defaultText: string) => {
      try {
        const asset = await this.assetManager.createTextAsset(name, defaultText);
        return { success: true, asset };
      } catch (error) {
        console.error('Failed to create text asset:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Font Operations
    ipcMain.handle('font:loadBuiltinFonts', async () => {
      try {
        return await this.fontManager.loadBuiltinFonts();
      } catch (error) {
        console.error('Failed to load builtin fonts:', error);
        throw error;
      }
    });

    ipcMain.handle('font:addCustomFont', async (event, fontFilePath: string, licenseFilePath?: string) => {
      try {
        return await this.fontManager.addCustomFont(fontFilePath, licenseFilePath);
      } catch (error) {
        console.error('Failed to add custom font:', error);
        throw error;
      }
    });

    ipcMain.handle('font:addGoogleFont', async (event, googleFontUrl: string) => {
      try {
        return await this.fontManager.addGoogleFont(googleFontUrl);
      } catch (error) {
        console.error('Failed to add Google font:', error);
        throw error;
      }
    });

    ipcMain.handle('font:removeCustomFont', async (event, fontId: string) => {
      try {
        await this.fontManager.removeCustomFont(fontId);
        return { success: true };
      } catch (error) {
        console.error('Failed to remove custom font:', error);
        throw error;
      }
    });

    // ビルトインフォント管理（管理者モードのみ）
    ipcMain.handle('font:addBuiltinFont', async (event, fontFilePath: string, licenseFilePath?: string) => {
      try {
        return await this.fontManager.addBuiltinFont(fontFilePath, licenseFilePath);
      } catch (error) {
        console.error('Failed to add builtin font:', error);
        throw error;
      }
    });

    ipcMain.handle('font:removeBuiltinFont', async (event, fontId: string) => {
      try {
        await this.fontManager.removeBuiltinFont(fontId);
        return { success: true };
      } catch (error) {
        console.error('Failed to remove builtin font:', error);
        throw error;
      }
    });

    ipcMain.handle('font:isAdminMode', async () => {
      return process.env.KOMAE_ADMIN === 'true' || process.env.KOMAE_ADMIN === '1';
    });

    ipcMain.handle('font:getAvailableFonts', async (event, project?: any) => {
      try {
        return await this.fontManager.getAvailableFonts(project);
      } catch (error) {
        console.error('Failed to get available fonts:', error);
        throw error;
      }
    });

    ipcMain.handle('font:getFontInfo', async (event, fontId: string) => {
      try {
        const fontInfo = this.fontManager.getFontInfo(fontId);
        return fontInfo;
      } catch (error) {
        console.error('Failed to get font info:', error);
        throw error;
      }
    });

    // CustomAsset Operations
    ipcMain.handle('customAsset:getAvailableAssets', async (event, type: string = 'DynamicVector') => {
      try {
        return await this.customAssetManager.getAvailableCustomAssets(type);
      } catch (error) {
        console.error('Failed to get available custom assets:', error);
        throw error;
      }
    });

    ipcMain.handle('customAsset:addAsset', async (event, filePath: string) => {
      try {
        return await this.customAssetManager.addCustomAsset(filePath);
      } catch (error) {
        console.error('Failed to add custom asset:', error);
        throw error;
      }
    });

    ipcMain.handle('customAsset:removeAsset', async (event, assetId: string) => {
      try {
        await this.customAssetManager.removeCustomAsset(assetId);
        return { success: true };
      } catch (error) {
        console.error('Failed to remove custom asset:', error);
        throw error;
      }
    });

    ipcMain.handle('customAsset:getAssetInfo', async (event, assetId: string) => {
      try {
        return await this.customAssetManager.getCustomAssetInfo(assetId);
      } catch (error) {
        console.error('Failed to get custom asset info:', error);
        throw error;
      }
    });

    ipcMain.handle('customAsset:getAsset', async (event, assetId: string) => {
      try {
        return await this.customAssetManager.getCustomAsset(assetId);
      } catch (error) {
        console.error('Failed to get custom asset:', error);
        throw error;
      }
    });

    ipcMain.handle('customAsset:getAssetCode', async (event, assetId: string) => {
      try {
        return await this.customAssetManager.getCustomAssetCode(assetId);
      } catch (error) {
        console.error('Failed to get custom asset code:', error);
        throw error;
      }
    });

    ipcMain.handle('customAsset:generateSVG', async (event, assetId: string, parameters: Record<string, any>) => {
      try {
        return await this.customAssetManager.generateCustomAssetSVG(assetId, parameters);
      } catch (error) {
        console.error('Failed to generate custom asset SVG:', error);
        throw error;
      }
    });

    ipcMain.handle('dynamicVector:generateSVG', async (event, asset: any, instance: any, project: any, pageIndex: number) => {
      try {
        return await this.customAssetManager.generateDynamicVectorSVG(asset, instance, project, pageIndex);
      } catch (error) {
        console.error('Failed to generate dynamic vector SVG:', error);
        throw error;
      }
    });

    // File System Operations
    ipcMain.handle('dialog:showOpen', async (event, options: Electron.OpenDialogOptions) => {
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

    ipcMain.handle('dialog:showDirectorySelect', async (event, options) => {
      try {
        const directoryOptions = {
          title: options.title || 'ディレクトリを選択',
          properties: ['openDirectory', 'createDirectory'] as const,
          ...options
        };
        return await dialog.showOpenDialog(this.mainWindow!, directoryOptions);
      } catch (error) {
        console.error('Failed to show directory select dialog:', error);
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

    ipcMain.handle('fileSystem:createTempFile', async (event, fileName: string, data: Uint8Array) => {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');
        
        // 一時ディレクトリにファイルを作成
        const tempDir = os.tmpdir();
        const tempFileName = `komae_${Date.now()}_${fileName}`;
        const tempFilePath = path.join(tempDir, tempFileName);
        
        // Uint8ArrayをBufferに変換してファイルに書き込み
        const buffer = Buffer.from(data);
        fs.writeFileSync(tempFilePath, buffer);
        
        console.debug('[Main IPC] Created temp file:', tempFilePath);
        return tempFilePath;
      } catch (error) {
        console.error('Failed to create temp file:', error);
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

    ipcMain.handle('shell:openExternal', async (event, url: string) => {
      const { shell } = await import('electron');
      await shell.openExternal(url);
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
          // komae-asset://の後の部分を取得（プロトコル長13文字）
          let filePath = request.url.substring(13);
          
          // URLデコードを実行して空白文字などを正しく復元
          filePath = decodeURIComponent(filePath);
          
          // URLデコード後に余分なスラッシュを除去
          if (filePath.startsWith('//')) {
            filePath = filePath.substr(1);
          }
          
          let resolvedPath: string;
          
          // ビルトインアセット（builtin/fonts/で始まる）の処理
          if (filePath.startsWith('/builtin/fonts/')) {
            // builtin/fonts/部分を除去
            const fontFileName = filePath.substring('/builtin/fonts/'.length);
            const isDev = process.env.NODE_ENV === 'development';
            
            if (isDev) {
              // 開発環境: public/fonts ディレクトリ
              resolvedPath = path.join(process.cwd(), 'public', 'fonts', fontFileName);
            } else {
              // プロダクション環境: アプリリソース内の public/fonts ディレクトリ
              resolvedPath = path.join(app.getAppPath(), 'public', 'fonts', fontFileName);
            }
            
            callback({ path: resolvedPath });
            return;
          }

          // グローバルカスタムフォント（global/fonts/で始まる）の処理
          if (filePath.startsWith('/global/fonts/')) {
            // global/fonts/部分を除去
            const fontFileName = filePath.substring('/global/fonts/'.length);
            const globalFontsDir = path.join(app.getPath('userData'), 'fonts');
            resolvedPath = path.join(globalFontsDir, fontFileName);
            
            callback({ path: resolvedPath });
            return;
          }

          // 下位互換性: 従来の /fonts/ パターン（ビルトインフォントとして処理）
          if (filePath.startsWith('/fonts/')) {
            // 先頭のスラッシュを除去して正規化
            const normalizedPath = filePath.substring(1);
            const isDev = process.env.NODE_ENV === 'development';
            
            if (isDev) {
              // 開発環境: public/fonts ディレクトリ
              resolvedPath = path.join(process.cwd(), 'public', normalizedPath);
            } else {
              // プロダクション環境: アプリリソース内の public/fonts ディレクトリ
              resolvedPath = path.join(app.getAppPath(), 'public', normalizedPath);
            }
            
            callback({ path: resolvedPath });
            return;
          }
          
          // プロジェクト内ファイルの処理（従来の動作）
          const currentProjectPath = this.projectManager.getCurrentProjectPath();
          
          if (currentProjectPath && filePath.startsWith(currentProjectPath)) {
            callback({ path: filePath });
          } else {
            callback({ error: -3 }); // ERROR_ABORTED
          }
        } catch (error) {
          console.error('[Custom Protocol] Error processing request:', error);
          callback({ error: -2 }); // ERROR_FAILED
        }
      });
    });
  }
}

// Initialize the application
new KomaeApp();
