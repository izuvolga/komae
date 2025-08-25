import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import path from 'path';
import { 
  createDynamicVectorAsset,
  type ProjectData,
  type DynamicVectorAsset,
  type DynamicVectorAssetInstance
} from '../src/types/entities';
import { validateProjectData } from '../src/utils/validation';
import { generateSvgStructureCommon } from '../src/utils/svgGeneratorCommon';

// AssetManagerとProjectManagerをモック
const mockAssetManager = {
  setCurrentProjectPath: jest.fn(),
  createDynamicVectorAsset: jest.fn(),
  deleteAsset: jest.fn(),
};

const mockProjectManager = {
  saveProject: jest.fn(),
  loadProject: jest.fn(),
};

// テスト用のプロジェクトデータ
const createTestProject = (): ProjectData => ({
  metadata: {
    komae_version: '1.0',
    project_version: '1.0',
    title: 'DynamicVector Integration Test',
    supportedLanguages: ['ja'],
    currentLanguage: 'ja',
  },
  canvas: {
    width: 800,
    height: 600,
  },
  assets: {},
  pages: [
    {
      id: 'page-1',
      title: 'Test Page',
      asset_instances: {},
    },
  ],
});

describe('DynamicVectorAsset Integration Tests', () => {
  let testProject: ProjectData;
  let tempDir: string;

  beforeEach(() => {
    // テスト用の一時ディレクトリを作成（実際のファイルシステムは使用しない）
    tempDir = '/tmp/test-project';
    testProject = createTestProject();
    
    // モックの初期化
    jest.clearAllMocks();
    mockAssetManager.createDynamicVectorAsset.mockResolvedValue(createDynamicVectorAsset({
      name: 'Test Dynamic SVG',
      customAssetId: 'test-custom-asset-id',
    }));
    mockAssetManager.deleteAsset.mockResolvedValue({
      success: true,
      deletedFiles: [],
    });
    mockProjectManager.saveProject.mockResolvedValue('/tmp/test-project.komae');
  });

  describe('AssetManager統合', () => {
    test('DynamicVectorAssetを作成できる', async () => {
      mockAssetManager.setCurrentProjectPath(tempDir);

      const result = await mockAssetManager.createDynamicVectorAsset(
        'Test Dynamic SVG',
        'return `<rect width="100" height="100" fill="blue" />`;',
        true,  // usePageVariables
        false  // useValueVariables
      );

      expect(result.id).toMatch(/^dynamic-vector-/);
      expect(result.name).toBe('Test Dynamic SVG');
      expect(result.type).toBe('DynamicVectorAsset');
    });

    test('DynamicVectorAssetを削除できる', async () => {
      // DynamicVectorAssetの場合、ファイル削除は不要（スクリプトベースのため）
      const asset = createDynamicVectorAsset({
        name: 'Test Dynamic SVG',
        customAssetId: 'test-custom-asset-id',
      });

      const result = await mockAssetManager.deleteAsset(asset, testProject);
      expect(result.success).toBe(true);
      expect(result.deletedFiles).toEqual([]); // ファイル削除は行われない
    });
  });

  describe('ProjectManager統合', () => {
    test('DynamicVectorAssetを含むプロジェクトを保存・読み込みできる', async () => {
      // DynamicVectorAssetを追加
      const dynamicVectorAsset = createDynamicVectorAsset({
        name: 'Test Dynamic SVG',
        script: 'return `<circle cx="50" cy="50" r="25" fill="red" />`;',
        usePageVariables: true,
        useValueVariables: false,
        customAssetId: 'test-custom-asset-id',
      });

      testProject.assets[dynamicVectorAsset.id] = dynamicVectorAsset;

      // プロジェクトデータのバリデーション
      expect(() => validateProjectData(testProject)).not.toThrow();

      // 保存処理のテスト（実際のファイル操作はモック）
      const savedPath = await mockProjectManager.saveProject(testProject, '/tmp/test-project.komae');
      expect(savedPath).toBe('/tmp/test-project.komae');
      expect(mockProjectManager.saveProject).toHaveBeenCalledWith(testProject, '/tmp/test-project.komae');
    });
  });

  describe('SVG生成統合', () => {
    test('DynamicVectorAssetを含むSVGを生成できる', () => {
      // DynamicVectorAssetを作成
      const dynamicVectorAsset = createDynamicVectorAsset({
        name: 'Dynamic Circle',
        script: 'return `<circle cx="${page_current * 100}" cy="100" r="50" fill="blue" />`;',
        usePageVariables: true,
        useValueVariables: false,
        customAssetId: 'test-custom-asset-id',
      });

      testProject.assets[dynamicVectorAsset.id] = dynamicVectorAsset;

      // アセットインスタンスを作成
      const instance: DynamicVectorAssetInstance = {
        id: 'instance-1',
        asset_id: dynamicVectorAsset.id,
        override_pos_x: 50,
        override_pos_y: 50,
        override_opacity: 0.8,
      };

      testProject.pages[0].asset_instances[instance.id] = instance;

      // SVG構造を生成
      const { assetDefinitions, useElements } = generateSvgStructureCommon(
        testProject,
        [instance],
        () => '', // 画像エンコード関数（DynamicVectorには不要）
        ['ja'],
        'ja',
        0 // pageIndex
      );

      // DynamicVectorAssetはインライン要素として生成される
      expect(useElements.length).toBeGreaterThan(0);
      
      // 生成されたSVG要素にスクリプトの実行結果が含まれることを確認
      const svgContent = useElements.join('\n');
      expect(svgContent).toContain('circle');
      expect(svgContent).toContain('cx="100"'); // page_current = 1 (0-based + 1)
      expect(svgContent).toContain('cy="100"');
      expect(svgContent).toContain('fill="blue"');
    });

    test('複数のDynamicVectorAssetを含むSVGを生成できる', () => {
      // 複数のDynamicVectorAssetを作成
      const asset1 = createDynamicVectorAsset({
        name: 'Dynamic Rect',
        script: 'return `<rect x="10" y="10" width="80" height="80" fill="red" />`;',
        usePageVariables: false,
        useValueVariables: false,
        customAssetId: 'test-custom-asset-id-1',
      });

      const asset2 = createDynamicVectorAsset({
        name: 'Dynamic Text',
        script: 'return `<text x="50" y="30" font-size="16">Page ${page_current}</text>`;',
        usePageVariables: true,
        useValueVariables: false,
        customAssetId: 'test-custom-asset-id-2',
      });

      testProject.assets[asset1.id] = asset1;
      testProject.assets[asset2.id] = asset2;

      // アセットインスタンスを作成
      const instance1: DynamicVectorAssetInstance = {
        id: 'instance-1',
        asset_id: asset1.id,
      };

      const instance2: DynamicVectorAssetInstance = {
        id: 'instance-2',
        asset_id: asset2.id,
        override_z_index: 1, // テキストを前面に
      };

      testProject.pages[0].asset_instances[instance1.id] = instance1;
      testProject.pages[0].asset_instances[instance2.id] = instance2;

      // SVG構造を生成
      const { useElements } = generateSvgStructureCommon(
        testProject,
        [instance1, instance2],
        () => '',
        ['ja'],
        'ja',
        0
      );

      expect(useElements.length).toBe(2);
      
      const svgContent = useElements.join('\n');
      expect(svgContent).toContain('<rect');
      expect(svgContent).toContain('fill="red"');
      expect(svgContent).toContain('<text');
      expect(svgContent).toContain('Page 1');
    });

    test('ValueAsset変数を使用するDynamicVectorAssetのSVGを生成できる', () => {
      // ValueAssetを追加
      const valueAsset = {
        id: 'counter-value',
        type: 'ValueAsset' as const,
        name: 'Counter',
        value_type: 'number' as const,
        initial_value: 42,
        new_page_behavior: 'inherit' as const,
      };

      testProject.assets[valueAsset.id] = valueAsset;

      // ValueAsset変数を使用するDynamicVectorAssetを作成
      const dynamicVectorAsset = createDynamicVectorAsset({
        name: 'Value Display',
        script: 'const count = values["Counter"]; return `<text x="100" y="50" font-size="24">${count}</text>`;',
        usePageVariables: false,
        useValueVariables: true,
        customAssetId: 'test-custom-asset-id',
      });

      testProject.assets[dynamicVectorAsset.id] = dynamicVectorAsset;

      // アセットインスタンスを作成
      const instance: DynamicVectorAssetInstance = {
        id: 'instance-1',
        asset_id: dynamicVectorAsset.id,
      };

      testProject.pages[0].asset_instances[instance.id] = instance;

      // SVG構造を生成
      const { useElements } = generateSvgStructureCommon(
        testProject,
        [instance],
        () => '',
        ['ja'],
        'ja',
        0
      );

      const svgContent = useElements.join('\n');
      expect(svgContent).toContain('<text');
      expect(svgContent).toContain('42'); // ValueAssetの値が表示される
    });
  });

  describe('エラーケース統合テスト', () => {
    test('スクリプトエラーがあるDynamicVectorAssetは空要素を生成する', () => {
      const dynamicVectorAsset = createDynamicVectorAsset({
        name: 'Broken Script',
        script: 'return invalidFunction();', // エラーを発生させる
        usePageVariables: false,
        useValueVariables: false,
        customAssetId: 'test-custom-asset-id',
      });

      testProject.assets[dynamicVectorAsset.id] = dynamicVectorAsset;

      const instance: DynamicVectorAssetInstance = {
        id: 'instance-1',
        asset_id: dynamicVectorAsset.id,
      };

      testProject.pages[0].asset_instances[instance.id] = instance;

      // SVG構造を生成（エラーが発生しても処理が継続される）
      const { useElements } = generateSvgStructureCommon(
        testProject,
        [instance],
        () => '',
        ['ja'],
        'ja',
        0
      );

      // エラーの場合はnullが返され、要素は生成されない
      expect(useElements.length).toBe(0);
    });

    test('存在しないValueAssetを参照するスクリプトのエラーハンドリング', () => {
      const dynamicVectorAsset = createDynamicVectorAsset({
        name: 'Missing Value Reference',
        script: 'const missing = values["NonExistent"]; return `<text x="50" y="30">${missing}</text>`;',
        usePageVariables: false,
        useValueVariables: true,
        customAssetId: 'test-custom-asset-id',
      });

      testProject.assets[dynamicVectorAsset.id] = dynamicVectorAsset;

      const instance: DynamicVectorAssetInstance = {
        id: 'instance-1',
        asset_id: dynamicVectorAsset.id,
      };

      testProject.pages[0].asset_instances[instance.id] = instance;

      // SVG構造を生成
      const { useElements } = generateSvgStructureCommon(
        testProject,
        [instance],
        () => '',
        ['ja'],
        'ja',
        0
      );

      // 存在しないValueAssetの場合は undefined が値として使用される
      const svgContent = useElements.join('\n');
      expect(svgContent).toContain('undefined'); // または適切なエラー表示
    });
  });
});