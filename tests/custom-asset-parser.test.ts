import { describe, test, expect } from '@jest/globals';
import {
  parseCustomAsset,
  generateCustomAssetId,
  isValidCustomAssetFilename,
  type CustomAssetMetadata,
  type CustomAssetParameter,
  type ParsedCustomAsset
} from '../src/utils/customAssetParser';

describe('CustomAssetParser', () => {
  describe('parseCustomAsset', () => {
    test('正常なCustomAssetファイルを解析できる', () => {
      const fileContent = `// ==CustomAsset==
// @name         Beautiful Rectangle
// @type         DynamicVector
// @version      1.0.0
// @author       Test Author
// @height       1024
// @width        2048
// @description  A beautiful rectangle generator
// @parameters   rect_width:number:100, rect_height:number:60, color:string:#ff0000
// ==/CustomAsset==

function generateSVG(params) {
  const { rect_width = 100, rect_height = 60, color = '#ff0000' } = params;
  return \`<rect width="\${rect_width}" height="\${rect_height}" fill="\${color}" rx="5"/>\`;
}`;

      const result = parseCustomAsset(fileContent);

      expect(result.metadata).toEqual({
        name: 'Beautiful Rectangle',
        type: 'DynamicVector',
        version: '1.0.0',
        author: 'Test Author',
        description: 'A beautiful rectangle generator',
        height: 1024,
        width: 2048,
        parameters: [
          { name: 'rect_width', type: 'number', defaultValue: 100 },
          { name: 'rect_height', type: 'number', defaultValue: 60 },
          { name: 'color', type: 'string', defaultValue: '#ff0000' }
        ]
      });

      expect(result.code.trim()).toBe(`function generateSVG(params) {
  const { rect_width = 100, rect_height = 60, color = '#ff0000' } = params;
  return \`<rect width="\${rect_width}" height="\${rect_height}" fill="\${color}" rx="5"/>\`;
}`);
    });

    test('パラメータなしのCustomAssetを解析できる', () => {
      const fileContent = `// ==CustomAsset==
// @name         Simple Circle
// @type         DynamicVector
// @version      1.0.0
// @author       Test Author
// @description  A simple circle
// @parameters   
// ==/CustomAsset==

function generateSVG(params) {
  return '<circle cx="50" cy="50" r="25" fill="blue"/>';
}`;

      const result = parseCustomAsset(fileContent);

      expect(result.metadata.parameters).toEqual([]);
      expect(result.metadata.name).toBe('Simple Circle');
    });

    test('文字列パラメータのデフォルト値にスペースを含む場合も正しく解析', () => {
      const fileContent = `// ==CustomAsset==
// @name         Text Generator
// @type         DynamicVector  
// @version      1.0.0
// @author       Test Author
// @description  Generates text
// @parameters   label:string:Hello World, fontSize:number:16
// ==/CustomAsset==

function generateSVG(params) {
  return '<text>test</text>';
}`;

      const result = parseCustomAsset(fileContent);

      expect(result.metadata.parameters).toEqual([
        { name: 'label', type: 'string', defaultValue: 'Hello World' },
        { name: 'fontSize', type: 'number', defaultValue: 16 }
      ]);
    });

    test('CustomAssetメタデータブロックが存在しない場合はエラー', () => {
      const fileContent = `function generateSVG(params) {
  return '<rect width="100" height="100" fill="red"/>';
}`;

      expect(() => parseCustomAsset(fileContent)).toThrow(
        'CustomAsset metadata not found. Expected "// ==CustomAsset==" block.'
      );
    });

    test('必須フィールドが不足している場合はエラー', () => {
      const fileContent = `// ==CustomAsset==
// @name         Test Asset
// @type         DynamicVector
// @version      1.0.0
// ==/CustomAsset==

function generateSVG() {}`;

      expect(() => parseCustomAsset(fileContent)).toThrow('Missing required field: @author');
    });

    test('サポートされていない型の場合はエラー', () => {
      const fileContent = `// ==CustomAsset==
// @name         Test Asset
// @type         UnsupportedType
// @version      1.0.0
// @author       Test Author
// @description  Test
// ==/CustomAsset==

function generateSVG() {}`;

      expect(() => parseCustomAsset(fileContent)).toThrow(
        'Unsupported CustomAsset type: UnsupportedType. Only "DynamicVector" is supported.'
      );
    });

    test('無効なパラメータ定義の場合はエラー', () => {
      const fileContent = `// ==CustomAsset==
// @name         Test Asset
// @type         DynamicVector
// @version      1.0.0
// @author       Test Author
// @description  Test
// @parameters   width:number
// ==/CustomAsset==

function generateSVG() {}`;

      expect(() => parseCustomAsset(fileContent)).toThrow(
        'Invalid parameter definition: width:number. Expected format: "name:type:defaultValue"'
      );
    });

    test('サポートされていないパラメータ型の場合はエラー', () => {
      const fileContent = `// ==CustomAsset==
// @name         Test Asset
// @type         DynamicVector
// @version      1.0.0
// @author       Test Author
// @description  Test
// @parameters   width:boolean:true
// ==/CustomAsset==

function generateSVG() {}`;

      expect(() => parseCustomAsset(fileContent)).toThrow(
        'Unsupported parameter type: boolean. Only "number" and "string" are supported.'
      );
    });

    test('数値パラメータの無効なデフォルト値の場合はエラー', () => {
      const fileContent = `// ==CustomAsset==
// @name         Test Asset
// @type         DynamicVector
// @version      1.0.0
// @author       Test Author
// @description  Test
// @parameters   width:number:invalid
// ==/CustomAsset==

function generateSVG() {}`;

      expect(() => parseCustomAsset(fileContent)).toThrow(
        'Invalid default value for number parameter "width": invalid'
      );
    });
  });

  describe('generateCustomAssetId', () => {
    test('.komae.js拡張子を除去してIDを生成', () => {
      expect(generateCustomAssetId('beautiful-rectangle.komae.js')).toBe('beautiful-rectangle');
      expect(generateCustomAssetId('simple_circle.komae.js')).toBe('simple_circle');
    });

    test('無効な文字を置換してIDを生成', () => {
      expect(generateCustomAssetId('test asset (v1.0).komae.js')).toBe('test-asset--v1-0-');
      expect(generateCustomAssetId('special@chars#file.komae.js')).toBe('special-chars-file');
    });
  });

  describe('isValidCustomAssetFilename', () => {
    test('有効な.komae.js拡張子を検証', () => {
      expect(isValidCustomAssetFilename('test.komae.js')).toBe(true);
      expect(isValidCustomAssetFilename('beautiful-rectangle.komae.js')).toBe(true);
    });

    test('無効な拡張子を検証', () => {
      expect(isValidCustomAssetFilename('test.js')).toBe(false);
      expect(isValidCustomAssetFilename('test.komae')).toBe(false);
      expect(isValidCustomAssetFilename('test.txt')).toBe(false);
      expect(isValidCustomAssetFilename('test')).toBe(false);
    });
  });

  describe('複雑なケース', () => {
    test('複数行の説明と複雑なパラメータを含むCustomAsset', () => {
      const fileContent = `// ==CustomAsset==
// @name         Advanced Shape Generator
// @type         DynamicVector
// @version      2.1.0
// @author       Advanced Developer
// @description  Generates advanced shapes with multiple parameters
// @parameters   x:number:50, y:number:50, radius:number:25, label:string:Advanced Shape, strokeWidth:number:2
// ==/CustomAsset==

function generateSVG(params) {
  const { x = 50, y = 50, radius = 25, label = 'Advanced Shape', strokeWidth = 2 } = params;
  return \`
    <g>
      <circle cx="\${x}" cy="\${y}" r="\${radius}" fill="none" stroke="black" stroke-width="\${strokeWidth}"/>
      <text x="\${x}" y="\${y + radius + 15}" text-anchor="middle" font-size="12">\${label}</text>
    </g>
  \`;
}`;

      const result = parseCustomAsset(fileContent);

      expect(result.metadata.name).toBe('Advanced Shape Generator');
      expect(result.metadata.version).toBe('2.1.0');
      expect(result.metadata.parameters).toHaveLength(5);
      expect(result.metadata.parameters).toEqual([
        { name: 'x', type: 'number', defaultValue: 50 },
        { name: 'y', type: 'number', defaultValue: 50 },
        { name: 'radius', type: 'number', defaultValue: 25 },
        { name: 'label', type: 'string', defaultValue: 'Advanced Shape' },
        { name: 'strokeWidth', type: 'number', defaultValue: 2 }
      ]);
    });

    test('小数点数パラメータを正しく解析', () => {
      const fileContent = `// ==CustomAsset==
// @name         Opacity Rectangle
// @type         DynamicVector
// @version      1.0.0
// @author       Test Author
// @description  Rectangle with opacity
// @parameters   width:number:100.5, opacity:number:0.8
// ==/CustomAsset==

function generateSVG() { return ''; }`;

      const result = parseCustomAsset(fileContent);

      expect(result.metadata.parameters).toEqual([
        { name: 'width', type: 'number', defaultValue: 100.5 },
        { name: 'opacity', type: 'number', defaultValue: 0.8 }
      ]);
    });
  });
});
