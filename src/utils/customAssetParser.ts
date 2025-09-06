/**
 * CustomAsset メタデータパーサー
 * .komae.js ファイルから CustomAsset メタデータを解析する
 */

export interface CustomAssetParameter {
  name: string;
  type: 'number' | 'string';
  defaultValue: number | string;
}

export interface CustomAssetMetadata {
  name: string;
  type: string;
  version: string;
  author: string;
  description: string;
  width: number;
  height: number;
  parameters: CustomAssetParameter[];
}

export interface ParsedCustomAsset {
  metadata: CustomAssetMetadata;
  code: string;
}

/**
 * CustomAsset ファイルからメタデータを解析
 */
export function parseCustomAsset(fileContent: string): ParsedCustomAsset {
  const metadataRegex = /\/\/ ==CustomAsset==([\s\S]*?)\/\/ ==\/CustomAsset==/;
  const match = fileContent.match(metadataRegex);

  if (!match) {
    throw new Error('CustomAsset metadata not found. Expected "// ==CustomAsset==" block.');
  }

  const metadataBlock = match[1];
  const metadata = parseMetadataBlock(metadataBlock);

  // メタデータブロック以降をコードとして取得
  const codeStartIndex = fileContent.indexOf('// ==/CustomAsset==') + '// ==/CustomAsset=='.length;
  const code = fileContent.slice(codeStartIndex).trim();

  return { metadata, code };
}

/**
 * メタデータブロックを解析
 */
function parseMetadataBlock(metadataBlock: string): CustomAssetMetadata {
  const lines = metadataBlock.split('\n').map(line => line.trim());

  const metadata: Partial<CustomAssetMetadata> = {
    width: 100, // デフォルト幅
    height: 100, // デフォルト高さ
    parameters: []
  };

  for (const line of lines) {
    if (line.startsWith('// @name')) {
      metadata.name = extractValue(line);
    } else if (line.startsWith('// @type')) {
      metadata.type = extractValue(line);
    } else if (line.startsWith('// @version')) {
      metadata.version = extractValue(line);
    } else if (line.startsWith('// @author')) {
      metadata.author = extractValue(line);
    } else if (line.startsWith('// @description')) {
      metadata.description = extractValue(line);
    } else if (line.startsWith('// @width')) {
      metadata.width = extractNumberValue(line);
    } else if (line.startsWith('// @height')) {
      metadata.height = extractNumberValue(line);
    } else if (line.startsWith('// @parameters')) {
      metadata.parameters = parseParameters(extractValue(line));
    }
  }

  // 必須フィールドの検証
  const requiredFields = ['name', 'type', 'version', 'author', 'description'] as const;
  for (const field of requiredFields) {
    if (!metadata[field]) {
      throw new Error(`Missing required field: @${field}`);
    }
  }

  // 型検証
  if (metadata.type !== 'DynamicVector') {
    throw new Error(`Unsupported CustomAsset type: ${metadata.type}. Only "DynamicVector" is supported.`);
  }

  return metadata as CustomAssetMetadata;
}

/**
 * メタデータ行から値を抽出
 * // @name Beautiful Rectangle → "Beautiful Rectangle"
 */
function extractValue(line: string): string {
  const match = line.match(/\/\/ @\w+\s+(.+)$/);
  return match ? match[1].trim() : '';
}

function extractNumberValue(line: string): number {
  const valueStr = extractValue(line);
  const value = parseFloat(valueStr);
  if (isNaN(value)) {
    throw new Error(`Invalid number value: ${valueStr}`);
  }
  return value;
}

/**
 * パラメータ定義を解析
 * "width:number:100, height:number:60, label:string:Hello World"
 */
function parseParameters(parametersStr: string): CustomAssetParameter[] {
  if (!parametersStr.trim()) {
    return [];
  }

  const parameters: CustomAssetParameter[] = [];
  const paramDefinitions = parametersStr.split(',').map(p => p.trim());

  for (const paramDef of paramDefinitions) {
    const parts = paramDef.split(':');
    if (parts.length !== 3) {
      throw new Error(`Invalid parameter definition: ${paramDef}. Expected format: "name:type:defaultValue"`);
    }

    const [name, type, defaultValueStr] = parts.map(p => p.trim());

    // 型検証
    if (type !== 'number' && type !== 'string') {
      throw new Error(`Unsupported parameter type: ${type}. Only "number" and "string" are supported.`);
    }

    // デフォルト値の変換
    let defaultValue: number | string;
    if (type === 'number') {
      defaultValue = parseFloat(defaultValueStr);
      if (isNaN(defaultValue)) {
        throw new Error(`Invalid default value for number parameter "${name}": ${defaultValueStr}`);
      }
    } else {
      defaultValue = defaultValueStr;
    }

    parameters.push({
      name,
      type: type as 'number' | 'string',
      defaultValue
    });
  }

  return parameters;
}

/**
 * CustomAsset ID を生成（ファイル名ベース）
 */
export function generateCustomAssetId(filename: string): string {
  // .komae.js を除去してIDとして使用
  const id = filename.replace(/\.komae\.js$/, '');

  // 有効な識別子文字のみに制限
  return id.replace(/[^a-zA-Z0-9-_]/g, '-');
}

/**
 * CustomAsset ファイル名の検証
 */
export function isValidCustomAssetFilename(filename: string): boolean {
  return filename.endsWith('.komae.js');
}
