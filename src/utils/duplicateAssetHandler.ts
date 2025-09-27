/**
 * 重複アセット名ハンドリング機能
 * 
 * Duplicate Asset Name Handling Functions
 */

import { ProjectData, Asset } from '../types/entities';

export enum DuplicateResolutionStrategy {
  RENAME = 'rename',        // 新しいアセットの名前を変更
  REPLACE = 'replace',      // 既存のアセットを置き換え
  CANCEL = 'cancel',        // インポートをキャンセル
  AUTO_RENAME = 'auto_rename'  // 自動で名前を変更（UIなし）
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  existingAsset?: Asset;
}

export interface ConflictResolutionResult {
  resolvedName: string;
  originalName: string;
  strategy: DuplicateResolutionStrategy;
  shouldReplaceExisting?: boolean;
  shouldCancel?: boolean;
  wasAutoRenamed?: boolean;
}

export interface NewAssetInfo {
  name: string;
  filePath: string;
  type: 'raster' | 'vector' | 'font';
}

/**
 * プロジェクト内で重複するアセット名を検出
 */
export function detectDuplicateAssetName(
  assetName: string,
  project: ProjectData
): DuplicateDetectionResult {
  const existingAsset = Object.values(project.assets).find(
    asset => asset.name === assetName
  );

  return {
    isDuplicate: existingAsset !== undefined,
    existingAsset,
  };
}

/**
 * 重複しない一意のアセット名を生成
 */
export function generateUniqueAssetName(
  baseName: string,
  project: ProjectData
): string {
  // 元の名前が重複していない場合はそのまま返す
  if (!detectDuplicateAssetName(baseName, project).isDuplicate) {
    return baseName;
  }

  // 既存の番号付きアセット名を取得
  const existingNames = Object.values(project.assets)
    .map(asset => asset.name)
    .filter(name => name.startsWith(baseName + '_'));

  // 最小の使用可能な番号を見つける
  let counter = 1;
  while (true) {
    const candidateName = `${baseName}_${counter}`;
    if (!detectDuplicateAssetName(candidateName, project).isDuplicate) {
      return candidateName;
    }
    counter++;
  }
}

/**
 * 重複アセット名の競合解決
 */
export async function resolveDuplicateAssetConflict(
  newAssetInfo: NewAssetInfo,
  project: ProjectData,
  strategy: DuplicateResolutionStrategy
): Promise<ConflictResolutionResult> {
  const duplicateResult = detectDuplicateAssetName(newAssetInfo.name, project);

  switch (strategy) {
    case DuplicateResolutionStrategy.RENAME:
    case DuplicateResolutionStrategy.AUTO_RENAME:
      const uniqueName = generateUniqueAssetName(newAssetInfo.name, project);
      return {
        resolvedName: uniqueName,
        originalName: newAssetInfo.name,
        strategy,
        wasAutoRenamed: strategy === DuplicateResolutionStrategy.AUTO_RENAME || duplicateResult.isDuplicate,
      };

    case DuplicateResolutionStrategy.REPLACE:
      return {
        resolvedName: newAssetInfo.name,
        originalName: newAssetInfo.name,
        strategy,
        shouldReplaceExisting: duplicateResult.isDuplicate,
      };

    case DuplicateResolutionStrategy.CANCEL:
      return {
        resolvedName: newAssetInfo.name,
        originalName: newAssetInfo.name,
        strategy,
        shouldCancel: true,
      };

    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}
