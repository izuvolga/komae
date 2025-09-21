import { describe, test, expect } from '@jest/globals';
import { 
  createDynamicVectorAsset,
  validateDynamicVectorAssetData,
  validateDynamicVectorAssetInstanceData,
  type DynamicVectorAsset,
  type DynamicVectorAssetInstance,
  type CustomAsset
} from '../src/types/entities';
import { 
  createExecutionContext,
  executeScript,
  type ScriptExecutionResult 
} from '../src/utils/dynamicVectorEngine';
import type { ProjectData } from '../src/types/entities';

// テスト用のCustomAssetヘルパー
const createTestCustomAsset = (overrides: Partial<CustomAsset> = {}): CustomAsset => ({
  id: 'test-custom-asset',
  name: 'Test Custom Asset',
  type: 'DynamicVector',
  version: '1.0.0',
  author: 'Test Author',
  description: 'Test custom asset',
  width: 100,
  height: 100,
  parameters: [
    { name: 'width', type: 'number', defaultValue: 100 },
    { name: 'height', type: 'number', defaultValue: 100 }
  ],
  script: 'return `<rect width="${width}" height="${height}" fill="blue" />`;',
  filePath: '/test/path.js',
  addedAt: '2023-01-01T00:00:00.000Z',
  ...overrides
});

// テスト用のプロジェクトデータ
const mockProject: ProjectData = {
  metadata: {
    komae_version: '1.0',
    project_version: '1.0',
    title: 'Test Project',
    supportedLanguages: ['ja'],
    currentLanguage: 'ja',
  },
  canvas: {
    width: 800,
    height: 600,
  },
  assets: {
    'test-value-asset': {
      id: 'test-value-asset',
      type: 'ValueAsset',
      name: 'Test Counter',
      value_type: 'number',
      initial_value: 5,
      new_page_behavior: 'inherit',
    },
  },
  pages: [
    {
      id: 'page-1',
      title: 'Test Page 1',
      asset_instances: {},
    },
    {
      id: 'page-2', 
      title: 'Test Page 2',
      asset_instances: {},
    },
  ],
};

describe('DynamicVectorAsset', () => {
  describe('createDynamicVectorAsset', () => {
    test('デフォルト値で作成される', () => {
      const asset = createDynamicVectorAsset({
        customAsset: createTestCustomAsset(),
        name: 'Test Dynamic SVG',
      });

      expect(asset.id).toMatch(/^dvg-/);
      expect(asset.type).toBe('DynamicVectorAsset');
      expect(asset.name).toBe('Test Dynamic SVG');
      expect(asset.use_page_variables).toBe(false);
      expect(asset.use_value_variables).toBe(false);
      expect(asset.default_width).toBe(100);
      expect(asset.default_height).toBe(100);
      expect(asset.default_opacity).toBe(1);
      expect(asset.default_z_index).toBe(0);
    });

    test('カスタムパラメータで作成される', () => {
      const asset = createDynamicVectorAsset({
        customAsset: createTestCustomAsset({
          width: 200,
          height: 150,
          script: 'return `<circle cx="100" cy="75" r="50" fill="green" />`;',
        }),
        name: 'Custom Dynamic SVG',
        usePageVariables: true,
        useValueVariables: true,
      });

      expect(asset.name).toBe('Custom Dynamic SVG');
      expect(asset.default_width).toBe(200);
      expect(asset.default_height).toBe(150);
      expect(asset.use_page_variables).toBe(true);
      expect(asset.use_value_variables).toBe(true);
    });
  });

  describe('validateDynamicVectorAssetData', () => {
    test('有効なDynamicVectorAssetデータをバリデーションできる', () => {
      const validAsset: DynamicVectorAsset = {
        id: 'test-dynamic-vector',
        type: 'DynamicVectorAsset',
        name: 'Test Dynamic SVG',
        use_page_variables: false,
        use_value_variables: false,
        default_pos_x: 0,
        default_pos_y: 0,
        default_width: 100,
        default_height: 100,
        default_opacity: 1,
        default_z_index: 0,
        custom_asset_id: 'test-custom-asset-id',
        custom_asset_version: '1.0.0',
        parameters: {},
      };

      const result = validateDynamicVectorAssetData(validAsset);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('無効なDynamicVectorAssetデータはエラーを返す', () => {
      const invalidAsset = {
        id: 'test-dynamic-vector',
        type: 'DynamicVectorAsset',
        name: '', // 空の名前は無効
        script: 'return `<rect width="100" height="100" fill="red" />`;',
        use_page_variables: false,
        use_value_variables: false,
        default_pos_x: 0,
        default_pos_y: 0,
        default_width: 100,
        default_height: 100,
        default_opacity: 1,
        default_z_index: 0,
        customAssetId: 'test-custom-asset-id',
        customAssetParameters: {},
        customParameters: {},
      } as DynamicVectorAsset;

      const result = validateDynamicVectorAssetData(invalidAsset);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('アセット名は必須です');
    });
  });

  describe('validateDynamicVectorAssetInstanceData', () => {
    test('有効なDynamicVectorAssetInstanceデータをバリデーションできる', () => {
      const validInstance: DynamicVectorAssetInstance = {
        id: 'test-instance',
        asset_id: 'test-dynamic-vector',
        override_pos_x: 50,
        override_pos_y: 50,
        override_width: 150,
        override_height: 150,
        override_opacity: 0.8,
        override_z_index: 5,
      };

      const result = validateDynamicVectorAssetInstanceData(validInstance);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('無効なDynamicVectorAssetInstanceデータはエラーを返す', () => {
      const invalidInstance = {
        id: 'test-instance', 
        asset_id: 'test-dynamic-vector',
        override_width: -50, // 負の値は無効
      } as DynamicVectorAssetInstance;

      const result = validateDynamicVectorAssetInstanceData(invalidInstance);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('オーバーライド幅は0より大きい値');
    });
  });
});

describe('DynamicVectorEngine', () => {
  describe('createExecutionContext', () => {
    test('基本的なコンテキストを作成できる', () => {
      const asset = createDynamicVectorAsset({
        customAsset: createTestCustomAsset(),
        name: 'Test Asset',
        usePageVariables: false,
        useValueVariables: false,
      });

      const context = createExecutionContext(asset, mockProject, 0);

      // 常にページ変数が注入される（新仕様）
      expect(context.page_current).toBe(1);
      expect(context.page_total).toBe(2);
      // 常にvaluesオブジェクトが注入される（新仕様）
      expect(context.values).toBeDefined();
    });

    test('ページ変数を含むコンテキストを作成できる', () => {
      const asset = createDynamicVectorAsset({
        customAsset: createTestCustomAsset(),
        name: 'Test Asset',
        usePageVariables: true,
        useValueVariables: false,
      });

      const context = createExecutionContext(asset, mockProject, 1);

      expect(context.page_current).toBe(2); // 1-based
      expect(context.page_total).toBe(2);
      // 常にvaluesオブジェクトが注入される（新仕様）
      expect(context.values).toBeDefined();
    });

    test('ValueAsset変数を含むコンテキストを作成できる', () => {
      const asset = createDynamicVectorAsset({
        customAsset: createTestCustomAsset(),
        name: 'Test Asset',
        usePageVariables: false,
        useValueVariables: true,
      });

      const context = createExecutionContext(asset, mockProject, 0);

      // 常にページ変数が注入される（新仕様）
      expect(context.page_current).toBe(1);
      expect(context.page_total).toBe(2);
      expect(context.values).toBeDefined();
      expect(Object.keys(context.values || {}).length).toBe(0); // "Test Counter"は無効な変数名で除外される
    });

    test('すべての変数を含むコンテキストを作成できる', () => {
      const asset = createDynamicVectorAsset({
        customAsset: createTestCustomAsset(),
        name: 'Test Asset',
        usePageVariables: true,
        useValueVariables: true,
      });

      const context = createExecutionContext(asset, mockProject, 1);

      expect(context.page_current).toBe(2);
      expect(context.page_total).toBe(2);
      expect(context.values).toBeDefined();
      expect(Object.keys(context.values || {}).length).toBe(0); // "Test Counter"は無効な変数名で除外される
    });
  });

  describe('executeScript', () => {
    test('簡単なSVG要素を生成できる', () => {
      const script = 'return `<rect x="10" y="10" width="80" height="80" fill="red" />`;';
      const context = {};

      const result = executeScript(script, context);

      expect(result.success).toBe(true);
      expect(result.svgContent).toBe('<rect x="10" y="10" width="80" height="80" fill="red" />');
      expect(result.error).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });

    test('変数を使用してSVG要素を生成できる', () => {
      const script = 'return `<circle cx="${page_current * 50}" cy="50" r="25" fill="blue" />`;';
      const context = { page_current: 3 };

      const result = executeScript(script, context);

      expect(result.success).toBe(true);
      expect(result.svgContent).toBe('<circle cx="150" cy="50" r="25" fill="blue" />');
      expect(result.error).toBeUndefined();
    });

    test('ValueAsset変数を使用してSVG要素を生成できる', () => {
      const script = 'const counter = values["Test Counter"]; return `<text x="50" y="30" font-size="24">${counter}</text>`;';
      const context = { values: { 'Test Counter': 10 } };

      const result = executeScript(script, context);

      expect(result.success).toBe(true);
      expect(result.svgContent).toBe('<text x="50" y="30" font-size="24">10</text>');
    });

    test('スクリプトエラーを適切に処理する', () => {
      const script = 'return invalidVariable;'; // 未定義変数
      const context = {};

      const result = executeScript(script, context);

      expect(result.success).toBe(false);
      expect(result.svgContent).toBeUndefined();
      expect(result.error).toContain('invalidVariable is not defined');
    });

    test('無効なSVGを検出する', () => {
      const script = 'return `<script>alert("xss")</script>`;'; // 危険なスクリプトタグ
      const context = {};

      const result = executeScript(script, context);

      expect(result.success).toBe(false);
      // SVG要素が含まれていないことを検出するメッセージまたはセキュリティエラー
      expect(result.error).toMatch(/スクリプトの戻り値にSVG要素が含まれていません|セキュリティ上の理由により/);
    });

    test('console.logの警告を収集する', () => {
      const script = 'console.log("Warning message"); return `<rect width="100" height="100" />`;';
      const context = {};

      const result = executeScript(script, context);

      expect(result.success).toBe(true);
      expect(result.debugInfo?.consoleOutput).toEqual(['LOG: Warning message']);
    });

    test('複数のSVG要素を生成できる', () => {
      const script = `
        const elements = [];
        for (let i = 0; i < 3; i++) {
          elements.push(\`<circle cx="\${i * 30 + 15}" cy="15" r="10" fill="green" />\`);
        }
        return elements.join('');
      `;
      const context = {};

      const result = executeScript(script, context);

      expect(result.success).toBe(true);
      expect(result.svgContent).toBe('<circle cx="15" cy="15" r="10" fill="green" /><circle cx="45" cy="15" r="10" fill="green" /><circle cx="75" cy="15" r="10" fill="green" />');
    });

    test('数学関数を使用できる', () => {
      const script = `
        const angle = Math.PI / 4;
        const x = 50 + 30 * Math.cos(angle);
        const y = 50 + 30 * Math.sin(angle);
        return \`<circle cx="\${x.toFixed(2)}" cy="\${y.toFixed(2)}" r="5" fill="orange" />\`;
      `;
      const context = {};

      const result = executeScript(script, context);

      expect(result.success).toBe(true);
      expect(result.svgContent).toContain('cx="71.21"');
      expect(result.svgContent).toContain('cy="71.21"');
    });

    test('パラメータ変数バインディングを使用できる', () => {
      const asset = createDynamicVectorAsset({
        customAsset: createTestCustomAsset({
          script: 'return `<rect width="${params.width}" height="${params.height}" fill="${params.color}" />`;',
        }),
        name: 'Parameter Asset',
        usePageVariables: true,
        useValueVariables: true,
        parameters: {
          width: 100,
          height: 50,
          color: 'red',
        },
        parameterVariableBindings: {
          width: 'page_current',
          height: 'page_total',
        },
      });

      const context = createExecutionContext(asset, mockProject, 0);
      const customAsset = createTestCustomAsset({
        script: 'return `<rect width="${params.width}" height="${params.height}" fill="${params.color}" />`;',
      });
      const result = executeScript(customAsset.script, context);

      expect(result.success).toBe(true);
      expect(result.svgContent).toContain('width="1"'); // page_current = 1
      expect(result.svgContent).toContain('height="2"'); // page_total = 2
      expect(result.svgContent).toContain('fill="red"'); // 固定値
    });

    test('存在しない変数バインディングは固定値にフォールバックする', () => {
      const asset = createDynamicVectorAsset({
        customAsset: createTestCustomAsset({
          script: 'return `<circle r="${params.radius}" fill="${params.color}" />`;',
        }),
        name: 'Fallback Asset',
        usePageVariables: true,
        useValueVariables: true,
        parameters: {
          radius: 25,
          color: 'blue',
        },
        parameterVariableBindings: {
          radius: 'nonexistent_variable',
        },
      });

      const context = createExecutionContext(asset, mockProject, 0);
      const customAsset = createTestCustomAsset({
        script: 'return `<circle r="${params.radius}" fill="${params.color}" />`;',
      });
      const result = executeScript(customAsset.script, context);

      expect(result.success).toBe(true);
      expect(result.svgContent).toContain('r="25"'); // 固定値にフォールバック
      expect(result.svgContent).toContain('fill="blue"'); // 固定値
    });
  });
});
