import type { ProjectData, ExportOptions } from '../types/entities';

/**
 * エクスポート設定のプリセット定義
 */
const EXPORT_PRESETS: Record<string, PresetInfo> = {
  'web-optimized': {
    name: 'web-optimized',
    description: 'ウェブ表示に最適化された設定（軽量・高速読み込み）',
    settings: {
      format: 'html',
      quality: 80,
      embedAssets: true,
      htmlOptions: {
        singleFile: true,
        includeNavigation: true,
        autoPlay: false
      }
    }
  },
  'high-quality': {
    name: 'high-quality',
    description: '高品質設定（印刷・保存用）',
    settings: {
      format: 'svg',
      quality: 95,
      embedAssets: true,
      svgOptions: {
        separateFiles: false,
        embedImages: true,
        optimizeSize: false
      }
    }
  },
  'small-size': {
    name: 'small-size',
    description: 'ファイルサイズ最小化設定（共有・配布用）',
    settings: {
      format: 'html',
      quality: 60,
      embedAssets: false,
      htmlOptions: {
        singleFile: false,
        includeNavigation: false,
        autoPlay: false
      }
    }
  },
  'print-ready': {
    name: 'print-ready',
    description: '印刷用高品質設定',
    settings: {
      format: 'svg',
      quality: 100,
      embedAssets: true,
      svgOptions: {
        separateFiles: true,
        embedImages: true,
        optimizeSize: false
      }
    }
  }
};

/**
 * エクスポート設定の検証結果
 */
export interface ExportSettingsValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * プリセット情報
 */
export interface PresetInfo {
  name: string;
  description: string;
  settings: Partial<ExportOptions>;
}

/**
 * エクスポート設定管理クラス
 */
export class ExportSettingsManager {
  private currentSettings: ExportOptions | null = null;

  /**
   * 設定を設定する
   */
  setSettings(settings: ExportOptions): void {
    const validation = validateExportSettings(settings);
    if (!validation.isValid) {
      throw new Error(`設定が無効です: ${validation.errors.join(', ')}`);
    }
    this.currentSettings = { ...settings };
  }

  /**
   * 現在の設定を取得する
   */
  getSettings(): ExportOptions {
    if (!this.currentSettings) {
      throw new Error('設定が初期化されていません');
    }
    return { ...this.currentSettings };
  }

  /**
   * 設定を部分的に更新する
   */
  updateSettings(partialSettings: Partial<ExportOptions>): void {
    if (!this.currentSettings) {
      throw new Error('設定が初期化されていません');
    }

    const updatedSettings = { ...this.currentSettings, ...partialSettings };
    const validation = validateExportSettings(updatedSettings);
    
    if (!validation.isValid) {
      throw new Error(`更新設定が無効です: ${validation.errors.join(', ')}`);
    }

    this.currentSettings = updatedSettings;
  }

  /**
   * プリセット設定を適用する
   */
  applyPreset(presetName: string): void {
    const preset = EXPORT_PRESETS[presetName];
    if (!preset) {
      throw new Error(`プリセット '${presetName}' が見つかりません`);
    }

    // デフォルト設定を基にプリセット設定をマージ
    const baseSettings: ExportOptions = {
      format: 'html',
      title: 'エクスポート',
      outputPath: './export',
      width: 800,
      height: 600,
      quality: 90,
      embedAssets: true
    };

    const mergedSettings = { ...baseSettings, ...preset.settings };
    this.currentSettings = mergedSettings;
  }

  /**
   * プロジェクトがエクスポート可能かチェックする
   */
  canExport(project: ProjectData): boolean {
    if (!this.currentSettings) {
      return false;
    }

    // プロジェクトにページが存在するかチェック
    if (!project.pages || project.pages.length === 0) {
      return false;
    }

    // 設定が有効かチェック
    const validation = validateExportSettings(this.currentSettings);
    return validation.isValid;
  }

  /**
   * 利用可能なプリセット一覧を取得する
   */
  getAvailablePresets(): string[] {
    return Object.keys(EXPORT_PRESETS);
  }

  /**
   * プリセット情報を取得する
   */
  getPresetInfo(presetName: string): PresetInfo {
    const preset = EXPORT_PRESETS[presetName];
    if (!preset) {
      throw new Error(`プリセット '${presetName}' が見つかりません`);
    }
    return { ...preset };
  }

  /**
   * 設定をJSONとして出力する
   */
  exportSettingsAsJson(): string {
    if (!this.currentSettings) {
      throw new Error('設定が初期化されていません');
    }
    return JSON.stringify(this.currentSettings, null, 2);
  }

  /**
   * JSONから設定を復元する
   */
  importSettingsFromJson(jsonString: string): void {
    try {
      const settings = JSON.parse(jsonString) as ExportOptions;
      
      // パースした設定を検証
      const validation = validateExportSettings(settings);
      if (!validation.isValid) {
        throw new Error(`インポートした設定が無効です: ${validation.errors.join(', ')}`);
      }

      this.currentSettings = settings;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('無効なJSONフォーマットです');
      }
      throw error;
    }
  }
}

/**
 * エクスポート設定を検証する
 */
export function validateExportSettings(settings: ExportOptions): ExportSettingsValidationResult {
  const errors: string[] = [];

  // 必須フィールドの検証
  if (!settings.title || settings.title.trim() === '') {
    errors.push('タイトルを入力してください');
  }
  
  if (!settings.outputPath || settings.outputPath.trim() === '') {
    errors.push('出力パスを指定してください');
  }

  // 数値範囲の検証
  if (settings.quality < 0 || settings.quality > 100) {
    errors.push('画質は0から100の間で設定してください');
  }

  if (settings.width <= 0) {
    errors.push('幅は1以上で設定してください');
  }

  if (settings.height <= 0) {
    errors.push('高さは1以上で設定してください');
  }

  // フォーマット固有の検証
  if (!['html', 'svg', 'png'].includes(settings.format)) {
    errors.push('サポートされていないフォーマットです');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * プロジェクトに基づくデフォルトエクスポート設定を生成する
 */
export function getDefaultExportSettings(project: ProjectData): ExportOptions {
  return {
    format: 'html',
    title: project.metadata.title,
    outputPath: './export',
    width: project.canvas.width,
    height: project.canvas.height,
    quality: 90,
    embedAssets: true,
    htmlOptions: {
      singleFile: true,
      includeNavigation: true,
      autoPlay: false
    },
    svgOptions: {
      separateFiles: true,
      embedImages: true,
      optimizeSize: false
    }
  };
}