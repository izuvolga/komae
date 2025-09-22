import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getLogger } from '../../utils/logger';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface AppSettings {
  skipWelcomeScreen: boolean;
  themePreference: ThemePreference;
  version: string;
  lastModified: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  skipWelcomeScreen: false,
  themePreference: 'system',
  version: '1.0',
  lastModified: new Date().toISOString(),
};

export class AppSettingsManager {
  private settingsPath: string;
  private logger = getLogger();

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
  }

  /**
   * 設定ファイルを読み込む
   */
  async loadSettings(): Promise<AppSettings> {
    try {
      await this.logger.logDevelopment('settings_load_start', 'Loading app settings', {
        settingsPath: this.settingsPath
      });

      const data = await fs.readFile(this.settingsPath, 'utf8');
      const settings = JSON.parse(data) as AppSettings;

      // バージョンチェックやマイグレーション処理を将来追加する場合はここで
      const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };

      await this.logger.logDevelopment('settings_load_success', 'App settings loaded successfully', {
        settings: mergedSettings
      });

      return mergedSettings;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // ファイルが存在しない場合はデフォルト設定を返す
        await this.logger.logDevelopment('settings_load_default', 'Settings file not found, using defaults', {
          defaultSettings: DEFAULT_SETTINGS
        });
        return DEFAULT_SETTINGS;
      }

      await this.logger.logError('settings_load_error', error as Error, {
        settingsPath: this.settingsPath
      });

      // エラーの場合もデフォルト設定を返す
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 設定ファイルに保存する
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await this.logger.logDevelopment('settings_save_start', 'Saving app settings', {
        settingsPath: this.settingsPath,
        settings
      });

      // 最終更新日時を更新
      const updatedSettings = {
        ...settings,
        lastModified: new Date().toISOString(),
      };

      // ディレクトリが存在しない場合は作成
      const settingsDir = path.dirname(this.settingsPath);
      await fs.mkdir(settingsDir, { recursive: true });

      // 設定ファイルを保存
      const jsonData = JSON.stringify(updatedSettings, null, 2);
      await fs.writeFile(this.settingsPath, jsonData, 'utf8');

      await this.logger.logDevelopment('settings_save_success', 'App settings saved successfully', {
        settingsPath: this.settingsPath
      });

    } catch (error) {
      await this.logger.logError('settings_save_error', error as Error, {
        settingsPath: this.settingsPath,
        settings
      });

      throw new Error(`Failed to save app settings: ${error}`);
    }
  }

  /**
   * 特定の設定項目を更新する
   */
  async updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    const currentSettings = await this.loadSettings();
    const updatedSettings = { ...currentSettings, [key]: value };
    await this.saveSettings(updatedSettings);
  }

  /**
   * 設定ファイルのパスを取得する（デバッグ用）
   */
  getSettingsPath(): string {
    return this.settingsPath;
  }

  /**
   * 設定をリセットする（デフォルトに戻す）
   */
  async resetSettings(): Promise<void> {
    await this.saveSettings(DEFAULT_SETTINGS);
  }
}