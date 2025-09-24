import * as yaml from 'js-yaml';
import type { ProjectData, TextAsset, TextAssetInstance } from '../types/entities';
import { getEffectiveTextValue } from '../types/entities';

const TODO_PLACEHOLDER = "<TODO>";

export interface TextAssetYAMLData {
  pages: Array<{
    id: string;
    title: string;
    [instanceId: string]: any;
  }>;
}

export interface ParsedInstanceData {
  name: string;
  texts: Record<string, string>;
}

export interface ParsedPageData {
  pageId: string;
  instances: Record<string, ParsedInstanceData>;
}

/**
 * プロジェクトデータからYAML形式のテキストデータを生成
 * @param project プロジェクトデータ
 * @returns YAML文字列
 */
export function generateTextAssetYAML(project: ProjectData): string {
  const supportedLanguages = project.metadata.supportedLanguages || ['ja'];

  // ページデータを生成
  const pages: any[] = [];

  for (const page of project.pages) {
    const pageData: any = {
      id: page.id,
      title: page.title,
    };

    // ページ内のTextAssetInstancesを処理
    for (const [instanceId, instance] of Object.entries(page.asset_instances)) {
      const asset = project.assets[instance.asset_id];
      if (!asset || asset.type !== 'TextAsset') continue;

      const textAsset = asset as TextAsset;
      const textInstance = instance as TextAssetInstance;

      const instanceData: any = {
        name: textAsset.name,
      };

      // 各言語のテキストを取得
      supportedLanguages.forEach(langCode => {
        const effectiveText = getEffectiveTextValue(textAsset, textInstance, langCode);
        instanceData[langCode] = effectiveText || TODO_PLACEHOLDER;
      });

      pageData[instanceId] = instanceData;
    }

    // TextAssetInstanceが存在するページのみ追加
    const hasTextInstances = Object.keys(pageData).length > 2; // id, title以外のキーがある
    if (hasTextInstances) {
      pages.push(pageData);
    }
  }

  const yamlData: TextAssetYAMLData = {
    pages,
  };

  return yaml.dump(yamlData, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * YAML形式のテキストデータをパースしてプロジェクトデータに適用可能な形式に変換
 * @param yamlString YAML文字列
 * @param project 現在のプロジェクトデータ（バリデーション用）
 * @returns パース済みデータ
 */
export function parseTextAssetYAML(yamlString: string, project: ProjectData): ParsedPageData[] {
  let parsedYaml: any;

  try {
    parsedYaml = yaml.load(yamlString);
  } catch (error) {
    throw new Error(`YAML構文エラー: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsedYaml || typeof parsedYaml !== 'object') {
    throw new Error('有効なYAMLオブジェクトではありません');
  }

  if (!Array.isArray(parsedYaml.pages)) {
    throw new Error('pages配列が見つかりません');
  }

  const results: ParsedPageData[] = [];
  const supportedLanguages = project.metadata.supportedLanguages || ['ja'];

  for (const pageData of parsedYaml.pages) {
    if (!pageData.id || typeof pageData.id !== 'string') {
      throw new Error('ページIDが無効です');
    }

    // プロジェクト内にページが存在するかチェック
    const existingPage = project.pages.find(p => p.id === pageData.id);
    if (!existingPage) {
      console.warn(`ページ ${pageData.id} がプロジェクト内に見つかりません。スキップします。`);
      continue;
    }

    const instances: Record<string, ParsedInstanceData> = {};

    // インスタンスデータを処理
    for (const [key, value] of Object.entries(pageData)) {
      if (key === 'id' || key === 'title') continue;
      if (!key.startsWith('ins-')) continue;

      const instanceData = value as any;
      if (!instanceData || typeof instanceData !== 'object') continue;

      // インスタンスがプロジェクト内に存在するかチェック
      const existingInstance = existingPage.asset_instances[key];
      if (!existingInstance) {
        console.warn(`インスタンス ${key} がページ ${pageData.id} 内に見つかりません。スキップします。`);
        continue;
      }

      // 対応するアセットがTextAssetかチェック
      const asset = project.assets[existingInstance.asset_id];
      if (!asset || asset.type !== 'TextAsset') {
        console.warn(`インスタンス ${key} のアセットがTextAssetではありません。スキップします。`);
        continue;
      }

      const texts: Record<string, string> = {};

      // 各言語のテキストを取得
      supportedLanguages.forEach(langCode => {
        if (typeof instanceData[langCode] === 'string') {
          if (instanceData[langCode] === TODO_PLACEHOLDER) {
            texts[langCode] = '';
          } else {
            texts[langCode] = instanceData[langCode];
          }
        }
      });

      instances[key] = {
        name: instanceData.name || asset.name,
        texts,
      };
    }

    if (Object.keys(instances).length > 0) {
      results.push({
        pageId: pageData.id,
        instances,
      });
    }
  }

  return results;
}

/**
 * YAML形式データの妥当性をチェック
 * @param yamlData パース済みYAMLデータ
 * @param project 現在のプロジェクトデータ
 * @returns バリデーション結果
 */
export function validateTextAssetYAML(yamlData: any, project: ProjectData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!yamlData || typeof yamlData !== 'object') {
    errors.push('有効なYAMLオブジェクトではありません');
    return { valid: false, errors };
  }

  if (!Array.isArray(yamlData.pages)) {
    errors.push('pages配列が見つかりません');
    return { valid: false, errors };
  }

  const supportedLanguages = project.metadata.supportedLanguages || ['ja'];

  yamlData.pages.forEach((pageData: any, pageIndex: number) => {
    if (!pageData.id || typeof pageData.id !== 'string') {
      errors.push(`ページ ${pageIndex}: 無効なページID`);
      return;
    }

    const existingPage = project.pages.find(p => p.id === pageData.id);
    if (!existingPage) {
      errors.push(`ページ ${pageData.id}: プロジェクト内に存在しません`);
      return;
    }

    for (const [key, value] of Object.entries(pageData)) {
      if (key === 'id' || key === 'title') continue;
      if (!key.startsWith('instance-')) continue;

      const instanceData = value as any;
      if (!instanceData || typeof instanceData !== 'object') {
        errors.push(`ページ ${pageData.id}, インスタンス ${key}: 無効なインスタンスデータ`);
        continue;
      }

      const existingInstance = existingPage.asset_instances[key];
      if (!existingInstance) {
        errors.push(`ページ ${pageData.id}, インスタンス ${key}: プロジェクト内に存在しません`);
        continue;
      }

      // 各言語のテキストをチェック
      supportedLanguages.forEach(langCode => {
        if (instanceData[langCode] !== undefined && typeof instanceData[langCode] !== 'string') {
          errors.push(`ページ ${pageData.id}, インスタンス ${key}, 言語 ${langCode}: テキストが文字列ではありません`);
        }
      });
    }
  });

  return { valid: errors.length === 0, errors };
}
