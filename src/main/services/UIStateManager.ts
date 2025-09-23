import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getLogger } from '../../utils/logger';
import type { UIState } from '../../types/entities';

const DEFAULT_UI_STATE: UIState = {
  selectedAssets: [],
  hiddenColumns: [],
  hiddenRows: [],
  selectedPages: [],
  currentPage: null,
  activeWindow: 'spreadsheet',
  zoomLevel: 1.0,
  canvasFit: true,
  showAssetLibrary: true,
  showPreview: true,
  showFontManagement: false,
  showCustomAssetManagement: false,
  assetLibraryWidth: 280,
  previewWidth: 320,
  previewScrollX: 0,
  previewScrollY: 0,
  cursor: {
    visible: false,
    pageId: null,
    assetId: null,
  },
  clipboard: {
    assetInstance: null,
    sourcePageId: null,
  },
};

export class UIStateManager {
  private logger = getLogger();

  /**
   * UI状態ファイルのパスを生成
   */
  private getUIStateFilePath(projectPath: string): string {
    return path.join(projectPath, 'ui-state.yaml');
  }

  /**
   * UI状態を読み込む
   */
  async loadUIState(projectPath: string): Promise<UIState> {
    try {
      const uiStateFilePath = this.getUIStateFilePath(projectPath);

      await this.logger.logDevelopment('ui_state_load_start', 'Loading UI state', {
        projectPath,
        uiStateFilePath
      });

      const data = await fs.readFile(uiStateFilePath, 'utf8');
      const uiState = yaml.load(data) as UIState;

      // デフォルト値でマージ
      const mergedUIState = { ...DEFAULT_UI_STATE, ...uiState };

      await this.logger.logDevelopment('ui_state_load_success', 'UI state loaded successfully', {
        projectPath,
        uiState: mergedUIState
      });

      return mergedUIState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // ファイルが存在しない場合はデフォルト設定を返す
        await this.logger.logDevelopment('ui_state_load_default', 'UI state file not found, using defaults', {
          projectPath,
          defaultUIState: DEFAULT_UI_STATE
        });
        return DEFAULT_UI_STATE;
      }

      await this.logger.logError('ui_state_load_error', error as Error, {
        projectPath
      });

      // エラーの場合もデフォルト設定を返す
      return DEFAULT_UI_STATE;
    }
  }

  /**
   * UI状態を保存する
   */
  async saveUIState(projectPath: string, uiState: UIState): Promise<void> {
    try {
      const uiStateFilePath = this.getUIStateFilePath(projectPath);

      await this.logger.logDevelopment('ui_state_save_start', 'Saving UI state', {
        projectPath,
        uiStateFilePath,
        uiState
      });

      // ディレクトリが存在しない場合は作成
      const stateDir = path.dirname(uiStateFilePath);
      await fs.mkdir(stateDir, { recursive: true });

      // UI状態をYAMLファイルに保存
      const yamlData = yaml.dump(uiState, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });
      await fs.writeFile(uiStateFilePath, yamlData, 'utf8');

      await this.logger.logDevelopment('ui_state_save_success', 'UI state saved successfully', {
        projectPath,
        uiStateFilePath
      });

    } catch (error) {
      await this.logger.logError('ui_state_save_error', error as Error, {
        projectPath,
        uiState
      });

      throw new Error(`Failed to save UI state: ${error}`);
    }
  }

  /**
   * 特定のUI状態項目を更新する
   */
  async updateUIState<K extends keyof UIState>(
    projectPath: string,
    key: K,
    value: UIState[K]
  ): Promise<void> {
    const currentUIState = await this.loadUIState(projectPath);
    const updatedUIState = { ...currentUIState, [key]: value };
    await this.saveUIState(projectPath, updatedUIState);
  }

  /**
   * UI状態をリセットする（デフォルトに戻す）
   */
  async resetUIState(projectPath: string): Promise<void> {
    await this.saveUIState(projectPath, DEFAULT_UI_STATE);
  }

  /**
   * UI状態ファイルが存在するかチェック
   */
  async exists(projectPath: string): Promise<boolean> {
    try {
      const uiStateFilePath = this.getUIStateFilePath(projectPath);
      await fs.access(uiStateFilePath);
      return true;
    } catch {
      return false;
    }
  }
}