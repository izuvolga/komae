/**
 * アセットインスタンスリセット用カスタムフック
 */

import { useCallback } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { resetAssetInstanceOverrides } from '../../types/entities';
import type { Asset, AssetInstance, Page } from '../../types/entities';

/**
 * アセットインスタンスのリセット操作を提供するフック
 */
export const useAssetInstanceReset = () => {
  const updateAssetInstance = useProjectStore((state) => state.updateAssetInstance);

  /**
   * 指定した列のすべてのアセットインスタンスをリセット
   * @param asset - リセット対象のアセット
   */
  const resetAllInColumn = useCallback((asset: Asset) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const pages = project.pages || [];
    pages.forEach(page => {
      const existingInstance = Object.values(page.asset_instances).find(
        (inst: any) => inst.asset_id === asset.id
      );

      if (existingInstance) {
        // entities.tsのヘルパー関数を使用してoverride値をリセット
        const resetUpdates = resetAssetInstanceOverrides(
          existingInstance as AssetInstance,
          asset.type
        );

        updateAssetInstance(page.id, existingInstance.id, resetUpdates);
      }
    });
  }, [updateAssetInstance]);

  /**
   * 指定した行のすべてのアセットインスタンスをリセット
   * @param page - リセット対象のページ
   */
  const resetAllInRow = useCallback((page: Page) => {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const assets = Object.values(project.assets || {});
    assets.forEach(asset => {
      const existingInstance = Object.values(page.asset_instances).find(
        (inst: any) => inst.asset_id === asset.id
      );

      if (existingInstance) {
        // entities.tsのヘルパー関数を使用してoverride値をリセット
        const resetUpdates = resetAssetInstanceOverrides(
          existingInstance as AssetInstance,
          asset.type
        );

        updateAssetInstance(page.id, existingInstance.id, resetUpdates);
      }
    });
  }, [updateAssetInstance]);

  /**
   * スコープ（列または行）に応じてリセット処理を実行
   * @param scope - リセットのスコープ
   * @param target - リセット対象（Asset または Page）
   */
  const resetAllInScope = useCallback((scope: 'column' | 'row', target: Asset | Page) => {
    if (scope === 'column') {
      resetAllInColumn(target as Asset);
    } else {
      resetAllInRow(target as Page);
    }
  }, [resetAllInColumn, resetAllInRow]);

  return {
    resetAllInColumn,
    resetAllInRow,
    resetAllInScope
  };
};