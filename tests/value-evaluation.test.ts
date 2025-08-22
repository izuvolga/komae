import {
  evaluateFormula,
  parseFormulaReferences,
  getEffectiveValueAssetValue,
  isValidArithmetic,
  EvaluationResult,
} from '../src/utils/valueEvaluation';
import { mockProject } from './fixtures/sampleProject';
import { ProjectData, Page, ValueAsset, ValueAssetInstance } from '../src/types/entities';

describe('Value Evaluation Engine', () => {
  // テスト用のプロジェクトデータを作成
  const createTestProject = (): ProjectData => {
    let project = mockProject
    project.assets['string-asset'] = {
      id: 'string-asset',
      name: 'String Asset',
      type: 'ValueAsset',
      value_type: 'string',
      initial_value: 'Hello',
      new_page_behavior: 'reset'
    } as ValueAsset
    project.assets['number-asset'] = {
      id: 'number-asset',
      name: 'Number Asset',
      type: 'ValueAsset',
      value_type: 'number',
      initial_value: 42,
      new_page_behavior: 'reset'
    } as ValueAsset
    project.assets['formula-asset'] = {
      id: 'formula-asset',
      name: 'Formula Asset',
      type: 'ValueAsset',
      value_type: 'formula',
      initial_value: '%{number-asset} + 10',
      new_page_behavior: 'reset'
    } as ValueAsset
    project.assets['circular-a'] = {
      id: 'circular-a',
      name: 'Circular A',
      type: 'ValueAsset',
      value_type: 'formula',
      initial_value: '%{circular-b} + 1',
      new_page_behavior: 'reset'
    } as ValueAsset
    project.assets['circular-b'] = {
      id: 'circular-b',
      name: 'Circular B',
      type: 'ValueAsset',
      value_type: 'formula',
      initial_value: '%{circular-a} + 1',
      new_page_behavior: 'reset'
    } as ValueAsset
    project.pages = [
      {
        id: 'page-1',
        title: 'Page 1',
        asset_instances: {
          'string-asset': {
            id: 'string-instance-1',
            asset_id: 'string-asset',
            override_value: 'Override Hello'
          },
          'number-asset': {
            id: 'number-instance-1',
            asset_id: 'number-asset',
            override_value: 100
          }
        }
      },
      {
        id: 'page-2',
        title: 'Page 2',
        asset_instances: {}
      },
      {
        id: 'page-3',
        title: 'Page 3',
        asset_instances: {}
      }
    ] as Page[]
    return project
  };

  describe('parseFormulaReferences', () => {
    test('単一の変数参照を正しく解析する', () => {
      const references = parseFormulaReferences('%{variable1}');
      expect(references).toEqual(['variable1']);
    });

    test('複数の変数参照を正しく解析する', () => {
      const references = parseFormulaReferences('%{var1} + %{var2} * %{var3}');
      expect(references).toEqual(['var1', 'var2', 'var3']);
    });

    test('重複する変数参照を除去する', () => {
      const references = parseFormulaReferences('%{var1} + %{var1} + %{var2}');
      expect(references).toEqual(['var1', 'var2']);
    });

    test('ページ番号参照は変数参照に含まれない', () => {
      const references = parseFormulaReferences('%p + %P + %{var1}');
      expect(references).toEqual(['var1']);
    });

    test('変数参照がない場合は空配列を返す', () => {
      const references = parseFormulaReferences('123 + 456');
      expect(references).toEqual([]);
    });
  });

  describe('evaluateFormula', () => {
    const project = createTestProject();

    test('数値の計算を正しく評価する', () => {
      const result = evaluateFormula('10 + 20', project, project.pages[0], 0);
      expect(result.isError).toBe(false);
      expect(result.value).toBe(30);
    });

    test('変数参照を正しく評価する', () => {
      const result = evaluateFormula('%{number-asset}', project, project.pages[0], 0);
      expect(result.isError).toBe(false);
      expect(result.value).toBe(100); // オーバーライド値
    });

    test('変数参照を含む数式を正しく評価する', () => {
      const result = evaluateFormula('%{number-asset} + 50', project, project.pages[0], 0);
      expect(result.isError).toBe(false);
      expect(result.value).toBe(150); // 100 + 50
    });

    test('ページ番号参照を正しく評価する', () => {
      const result = evaluateFormula('%p', project, project.pages[1], 1);
      expect(result.isError).toBe(false);
      expect(result.value).toBe(2); // ページ番号は1から開始
    });

    test('総ページ数参照を正しく評価する', () => {
      const result = evaluateFormula('%P', project, project.pages[0], 0);
      expect(result.isError).toBe(false);
      expect(result.value).toBe(3); // 総ページ数
    });

    test('文字列の演算はエラーにする', () => {
      const result = evaluateFormula('"Hello" + " " + "World"', project, project.pages[0], 0);
      expect(result.isError).toBe(true);
      expect(result.errorMessage).toContain('数式');
    });

    test('存在しない変数参照はエラーを返す', () => {
      const result = evaluateFormula('%{nonexistent}', project, project.pages[0], 0);
      expect(result.isError).toBe(true);
      expect(result.errorMessage).toContain('nonexistent');
    });

    test('循環参照はエラーを返す', () => {
      const result = evaluateFormula('%{circular-a}', project, project.pages[0], 0);
      expect(result.isError).toBe(true);
      expect(result.errorMessage).toContain('循環参照');
    });

    test('構文エラーのある数式はエラーを返す', () => {
      const result = evaluateFormula('10 +', project, project.pages[0], 0);
      expect(result.isError).toBe(true);
      expect(result.errorMessage).toBeTruthy();
    });

    test('複雑な数式を正しく評価する', () => {
      const result = evaluateFormula('(%{number-asset} * 2) + %p + %P', project, project.pages[1], 1);
      expect(result.isError).toBe(false);
      expect(result.value).toBe(89); // (42 * 2) + 2 + 3 = 205
    });
  });

  describe('getEffectiveValueAssetValue', () => {
    const project = createTestProject();

    test('オーバーライド値がある場合はそれを返す', () => {
      const asset = project.assets['string-asset'] as ValueAsset;
      const value = getEffectiveValueAssetValue(asset, project, project.pages[0], 0);
      expect(value).toBe('Override Hello');
    });

    test('オーバーライド値がない場合は初期値を返す', () => {
      const asset = project.assets['string-asset'] as ValueAsset;
      const value = getEffectiveValueAssetValue(asset, project, project.pages[1], 1);
      expect(value).toBe('Hello');
    });

    test('数値型のアセットを正しく処理する', () => {
      const asset = project.assets['number-asset'] as ValueAsset;
      const value = getEffectiveValueAssetValue(asset, project, project.pages[0], 0);
      expect(value).toBe(100);
    });

    test('数式型のアセットを正しく評価する', () => {
      const asset = project.assets['formula-asset'] as ValueAsset;
      const value = getEffectiveValueAssetValue(asset, project, project.pages[0], 0);
      expect(value).toBe(110); // 100 + 10
    });

    test('数式型のアセットでエラーが発生した場合は#ERRORを返す', () => {
      const asset: ValueAsset = {
        id: 'error-asset',
        name: 'Error Asset',
        type: 'ValueAsset',
        value_type: 'formula',
        initial_value: '%{nonexistent}',
        new_page_behavior: 'reset'
      };
      const value = getEffectiveValueAssetValue(asset, project, project.pages[0], 0);
      expect(value).toBe('#ERROR');
    });
  });

  describe('new_page_behavior', () => {
    test('reset behavior: 新しいページでは初期値を使用する', () => {
      const asset: ValueAsset = {
        id: 'reset-asset',
        name: 'Reset Asset',
        type: 'ValueAsset',
        value_type: 'string',
        initial_value: 'Initial',
        new_page_behavior: 'reset'
      };

      // 最初のページでオーバーライド値を設定
      const projectWithReset: ProjectData = {
        ...createTestProject(),
        assets: { 'reset-asset': asset },
        pages: [
          {
            id: 'page-1',
            title: 'Page 1',
            asset_instances: {
              'reset-asset': {
                id: 'reset-instance-1',
                asset_id: 'reset-asset',
                override_value: 'Override'
              }
            }
          },
          {
            id: 'page-2',
            title: 'Page 2',
            asset_instances: {} // オーバーライドなし
          }
        ] as Page[]
      };

      // 最初のページではオーバーライド値
      const value1 = getEffectiveValueAssetValue(asset, projectWithReset, projectWithReset.pages[0], 0);
      expect(value1).toBe('Override');

      // 2番目のページでは初期値（reset behavior）
      const value2 = getEffectiveValueAssetValue(asset, projectWithReset, projectWithReset.pages[1], 1);
      expect(value2).toBe('Initial');
    });

    test('inherit behavior: 前のページの値を継承する', () => {
      const asset: ValueAsset = {
        id: 'inherit-asset',
        name: 'Inherit Asset',
        type: 'ValueAsset',
        value_type: 'string',
        initial_value: 'Initial',
        new_page_behavior: 'inherit'
      };
      const assetInstance1: ValueAssetInstance = {
        id: 'inherit-instance-1',
        asset_id: 'inherit-asset',
        override_value: 'Override'
      }

      const projectWithInherit: ProjectData = {
        ...createTestProject(),
        assets: { 'inherit-asset': asset },
        pages: [
          {
            id: 'page-1',
            title: 'Page 1',
            asset_instances: {
              'inherit-instance-1': assetInstance1
            }
          },
          {
            id: 'page-2',
            title: 'Page 2',
            asset_instances: {} // オーバーライドなし
          },
          {
            id: 'page-3',
            title: 'Page 3',
            asset_instances: {} // オーバーライドなし
          }
        ] as Page[]
      };

      // 最初のページではオーバーライド値
      const value1 = getEffectiveValueAssetValue(asset, projectWithInherit, projectWithInherit.pages[0], 0);
      expect(value1).toBe('Override');

      // 2番目のページでは前のページの値を継承
      const value2 = getEffectiveValueAssetValue(asset, projectWithInherit, projectWithInherit.pages[1], 1);
      expect(value2).toBe('Override');

      // 3番目のページでは前のページの値を継承
      const value3 = getEffectiveValueAssetValue(asset, projectWithInherit, projectWithInherit.pages[2], 2);
      expect(value3).toBe('Override');

    });
  });

  describe('エラーハンドリング', () => {
    const project = createTestProject();

    test('空の数式はエラーを返す', () => {
      const result = evaluateFormula('', project, project.pages[0], 0);
      expect(result.isError).toBe(true);
    });

    test('無効な構文の数式はエラーを返す', () => {
      const result = evaluateFormula('10 + + 20 -', project, project.pages[0], 0);
      expect(result.isError).toBe(true);
    });

    test('ゼロ除算はエラーを返す', () => {
      const result = evaluateFormula('10 / 0', project, project.pages[0], 0);
      expect(result.isError).toBe(true);
    });

    test('深い循環参照を検出する', () => {
      const projectWithDeepCircular: ProjectData = {
        ...project,
        assets: {
          ...project.assets,
          'deep-a': {
            id: 'deep-a',
            name: 'Deep A',
            type: 'ValueAsset',
            value_type: 'formula',
            initial_value: '%{deep-b}',
            new_page_behavior: 'reset'
          } as ValueAsset,
          'deep-b': {
            id: 'deep-b',
            name: 'Deep B',
            type: 'ValueAsset',
            value_type: 'formula',
            initial_value: '%{deep-c}',
            new_page_behavior: 'reset'
          } as ValueAsset,
          'deep-c': {
            id: 'deep-c',
            name: 'Deep C',
            type: 'ValueAsset',
            value_type: 'formula',
            initial_value: '%{deep-a}',
            new_page_behavior: 'reset'
          } as ValueAsset
        }
      };

      const result = evaluateFormula('%{deep-a}', projectWithDeepCircular, project.pages[0], 0);
      expect(result.isError).toBe(true);
      expect(result.errorMessage).toContain('循環参照');
    });
  });

  describe('isValidArithmetic', () => {
    test('正しい算術式を検証する', () => {
      expect(isValidArithmetic('1 + 1')).toBe(true);
      expect(isValidArithmetic('2 * (3 + 4)')).toBe(true);
      expect(isValidArithmetic('-5 / 2')).toBe(true);
      expect(isValidArithmetic('10 - 3 * 2')).toBe(true);
      expect(isValidArithmetic('5 / 0')).toBe(true);    // ゼロ除算は書式的には有効
      expect(isValidArithmetic('1--2')).toBe(true);     // 1 - -2 は有効
      expect(isValidArithmetic('1 + + 1')).toBe(true); // 1 + + 1 は有効
      expect(isValidArithmetic('((((1))))')).toBe(true);
    });

    test('無効な算術式を検証する', () => {
      expect(isValidArithmetic('2 * (3 + )')).toBe(false);
      expect(isValidArithmetic('10 - 3 * ')).toBe(false);
      expect(isValidArithmetic('((((1)))')).toBe(false);
      expect(isValidArithmetic(')(((1)))')).toBe(false);
    });

    test('空の文字列は無効とする', () => {
      expect(isValidArithmetic('')).toBe(false);
    });

    test('不正な文字が含まれる場合は無効とする', () => {
      expect(isValidArithmetic('1 + a')).toBe(false);
      expect(isValidArithmetic('2 * @')).toBe(false);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量の変数参照を含む数式を処理できる', () => {
      const project = createTestProject();
      
      // 100個の変数を含む数式を作成
      const formula = Array.from({ length: 100 }, (_, i) => `%{number-asset}`).join(' + ');
      
      const start = performance.now();
      const result = evaluateFormula(formula, project, project.pages[0], 0);
      const end = performance.now();
      
      expect(result.isError).toBe(false);
      expect(result.value).toBe(10000); // 100 * 100
      expect(end - start).toBeLessThan(1000); // 1秒以内に完了
    });

    test('複雑な入れ子数式を処理できる', () => {
      const project = createTestProject();
      const complexFormula = '(((%{number-asset} + 5) * 2) - 10) / 3';
      
      const result = evaluateFormula(complexFormula, project, project.pages[1], 1);
      expect(result.isError).toBe(false);
      expect(result.value).toBe(28); // (((42 + 5) * 2) - 10) / 3 = 28
    });
  });
});
