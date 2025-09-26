// Zodスキーマによるプロジェクトデータバリデーション

import { z } from 'zod';
import { ProjectData, Asset, Page, LanguageSettings, UIState } from '../types/entities';
import { AssetFileData, FileType, AssetFile } from '../types/AssetFile';

// 基本的なスキーマ定義

// FileType スキーマ
const FileTypeSchema = z.enum(['raster', 'vector']);

// AssetFileData スキーマ
const AssetFileDataSchema = z.object({
  path: z.string().min(1),
  type: FileTypeSchema,
  hash: z.string().min(1),
  originalWidth: z.number().min(0.01),
  originalHeight: z.number().min(0.01),
});

// LanguageSettings スキーマ
const LanguageSettingsSchema = z.object({
  pos_x: z.number().optional(),
  pos_y: z.number().optional(),
  font: z.string().optional(),
  font_size: z.number().min(1).optional(),
  stroke_width: z.number().min(0).optional(),
  leading: z.number().optional(),
  vertical: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
  z_index: z.number().optional(),
  fill_color: z.string().optional(),
  stroke_color: z.string().optional(),
});

// AssetInstance 基本スキーマ
const BaseAssetInstanceSchema = z.object({
  id: z.string().min(1),
  asset_id: z.string().min(1),
});

// ImageAssetInstance スキーマ
const ImageAssetInstanceSchema = BaseAssetInstanceSchema.extend({
  override_pos_x: z.number().optional(),
  override_pos_y: z.number().optional(),
  override_width: z.number().min(0).optional(),
  override_height: z.number().min(0).optional(),
  override_opacity: z.number().min(0).max(1).optional(),
  override_z_index: z.number().optional(),
  override_mask: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]).optional(),
});

// TextAssetInstance スキーマ
const TextAssetInstanceSchema = BaseAssetInstanceSchema.extend({
  multilingual_text: z.record(z.string(), z.string()),
  override_language_settings: z.record(z.string(), LanguageSettingsSchema).optional(),
  override_context: z.string().optional(),
  override_opacity: z.number().min(0).max(1).optional(),
  override_z_index: z.number().optional(),
});

// VectorAssetInstance スキーマ
const VectorAssetInstanceSchema = BaseAssetInstanceSchema.extend({
  override_pos_x: z.number().optional(),
  override_pos_y: z.number().optional(),
  override_width: z.number().min(0).optional(),
  override_height: z.number().min(0).optional(),
  override_opacity: z.number().min(0).max(1).optional(),
  override_z_index: z.number().optional(),
});
// DynamicVectorAssetInstance スキーマ
const DynamicVectorAssetInstanceSchema = BaseAssetInstanceSchema.extend({
  override_pos_x: z.number().optional(),
  override_pos_y: z.number().optional(),
  override_width: z.number().min(0).optional(),
  override_height: z.number().min(0).optional(),
  override_opacity: z.number().min(0).max(1).optional(),
  override_z_index: z.number().optional(),
});

// AssetInstance Union スキーマ（判別子なし、全フィールドを許可）
const AssetInstanceSchema = BaseAssetInstanceSchema.extend({
  // ImageAssetInstanceの追加フィールド
  override_pos_x: z.number().optional(),
  override_pos_y: z.number().optional(),
  override_width: z.number().min(0).optional(),
  override_height: z.number().min(0).optional(),
  override_opacity: z.number().min(0).max(1).optional(),
  override_z_index: z.number().optional(),
  override_mask: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]).optional(),
  // 多言語対応フィールド
  multilingual_text: z.record(z.string(), z.string()).optional(),
  override_language_settings: z.record(z.string(), LanguageSettingsSchema).optional(),
  override_context: z.string().optional(),
  // ValueAssetInstanceの追加フィールド
  override_value: z.any().optional(),
});

// ImageAsset スキーマ
const ImageAssetSchema = z.object({
  id: z.string().min(1),
  type: z.literal('ImageAsset'),
  name: z.string().min(1),
  original_file: AssetFileDataSchema,
  original_width: z.number().min(0.01),
  original_height: z.number().min(0.01),
  default_pos_x: z.number(),
  default_pos_y: z.number(),
  default_width: z.number().min(0.01),
  default_height: z.number().min(0.01),
  default_opacity: z.number().min(0).max(1),
  default_z_index: z.number(),
  default_mask: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]).optional(),
});

// TextAsset スキーマ（新仕様）
const TextAssetSchema = z.object({
  id: z.string().min(1),
  type: z.literal('TextAsset'),
  name: z.string().min(1),
  default_text: z.string(),
  default_context: z.string().optional(),
  default_text_override: z.record(z.string(), z.string()).optional(),
  default_settings: LanguageSettingsSchema,
  default_language_override: z.record(z.string(), LanguageSettingsSchema).optional(),
});

// VectorAsset スキーマ
const VectorAssetSchema = z.object({
  id: z.string().min(1),
  type: z.literal('VectorAsset'),
  name: z.string().min(1),
  original_file: AssetFileDataSchema,
  original_width: z.number().min(0.01),
  original_height: z.number().min(0.01),
  default_pos_x: z.number(),
  default_pos_y: z.number(),
  default_width: z.number().min(0.01),
  default_height: z.number().min(0.01),
  default_opacity: z.number().min(0).max(1),
  default_z_index: z.number(),
});
// DynamicVectorAsset スキーマ
const DynamicVectorAssetSchema = z.object({
  id: z.string().min(1),
  type: z.literal('DynamicVectorAsset'),
  name: z.string().min(1),
  use_page_variables: z.boolean(),
  use_value_variables: z.boolean(),
  default_pos_x: z.number(),
  default_pos_y: z.number(),
  original_width: z.number().min(0.01),
  original_height: z.number().min(0.01),
  default_width: z.number().min(0.01),
  default_height: z.number().min(0.01),
  default_opacity: z.number().min(0).max(1),
  default_z_index: z.number(),
  
  // CustomAsset関連フィールド（DynamicVectorAssetは常にCustomAsset）
  custom_asset_id: z.string().min(1), // 必須フィールドに変更
  custom_asset_version: z.string().min(1), // バージョン情報
  parameters: z.record(z.string(), z.union([z.string(), z.number()])),
  parameter_variable_bindings: z.record(z.string(), z.string()).optional(),
});

// ValueAsset スキーマ
const ValueAssetSchema = z.object({
  id: z.string().min(1),
  type: z.literal('ValueAsset'),
  name: z.string().min(1),
  value_type: z.enum(['string', 'number', 'formula']),
  initial_value: z.any(),
  new_page_behavior: z.enum(['reset', 'inherit']),
});

  // initial_value: z.union([z.string(), z.number()]),

// Asset Union スキーマ
const AssetSchema = z.union([ImageAssetSchema, TextAssetSchema, VectorAssetSchema, DynamicVectorAssetSchema, ValueAssetSchema]);

// Page スキーマ
const PageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(0),
  asset_instances: z.record(z.string(), AssetInstanceSchema),
});

// AssetAttrスキーマは削除（ImageAssetInstanceに直接overrideフィールドを使用）

// ProjectMetadata スキーマ
const ProjectMetadataSchema = z.object({
  komae_version: z.string().min(1),
  project_version: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  supportedLanguages: z.array(z.string().min(1)), // ISO 639-1言語コード
  currentLanguage: z.string().min(1), // 現在の表示言語
});

// CanvasConfig スキーマ
const CanvasConfigSchema = z.object({
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  backgroundColor: z.string().optional().default('#ffffff'),
});;


// UIState スキーマ
const UIStateSchema = z.object({
  selectedAssets: z.array(z.string()).optional().default([]),
  hiddenColumns: z.array(z.string()).optional().default([]),
  hiddenRows: z.array(z.string()).optional().default([]),
  selectedPages: z.array(z.string()).optional().default([]),
  currentPage: z.string().nullable().optional().default(null),
  activeWindow: z.enum(['asset', 'spreadsheet', 'preview']).optional().default('spreadsheet'),
  zoomLevel: z.number().optional().default(1.0),
  canvasFit: z.boolean().optional().default(true),
  showAssetLibrary: z.boolean().optional().default(true),
  showPreview: z.boolean().optional().default(true),
  showFontManagement: z.boolean().optional().default(false),
  showCustomAssetManagement: z.boolean().optional().default(false),
  assetLibraryWidth: z.number().optional().default(280),
  previewWidth: z.number().optional().default(320),
  previewScrollX: z.number().optional().default(0),
  previewScrollY: z.number().optional().default(0),
  cursor: z.object({
    visible: z.boolean().optional().default(false),
    pageId: z.string().nullable().optional().default(null),
    assetId: z.string().nullable().optional().default(null),
  }).optional().default({
    visible: false,
    pageId: null,
    assetId: null,
  }),
  clipboard: z.object({
    assetInstance: z.any().nullable().optional().default(null),
    sourcePageId: z.string().nullable().optional().default(null),
  }).optional().default({
    assetInstance: null,
    sourcePageId: null,
  }),
});

// ProjectData スキーマ
const ProjectDataSchema = z.object({
  metadata: ProjectMetadataSchema,
  canvas: CanvasConfigSchema,
  assets: z.record(z.string(), AssetSchema),
  pages: z.array(PageSchema),
});

/**
 * バリデーションエラー
 */
export class ValidationError extends Error {
  constructor(message: string, public readonly issues?: z.ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * プロジェクトデータのバリデーション
 * @param data バリデーション対象のデータ
 * @returns バリデーション済みのプロジェクトデータ
 */
export function validateProjectData(data: unknown): ProjectData {
  try {
    const parsed = ProjectDataSchema.parse(data);

    // AssetFileデータをAssetFileインスタンスに変換
    const convertedAssets: Record<string, Asset> = {};
    for (const [id, asset] of Object.entries(parsed.assets)) {
      if (asset.type === 'ImageAsset' || asset.type === 'VectorAsset') {
        // AssetFileインスタンスを作成
        const assetFile = new AssetFile({
          path: asset.original_file.path,
          type: asset.original_file.type,
          hash: asset.original_file.hash,
          originalWidth: asset.original_file.originalWidth,
          originalHeight: asset.original_file.originalHeight
        });

        // AssetFileを置き換え
        convertedAssets[id] = {
          ...asset,
          original_file: assetFile
        };
      } else {
        convertedAssets[id] = asset;
      }
    }

    return {
      ...parsed,
      assets: convertedAssets
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `Project data validation failed: ${error.issues.map(issue => issue.message).join(', ')}`,
        error.issues
      );
    }
    throw new ValidationError(`Unexpected validation error: ${String(error)}`);
  }
}

/**
 * アセットデータのバリデーション
 * @param data バリデーション対象のデータ
 * @returns バリデーション済みのアセットデータ
 */
export function validateAsset(data: unknown): Asset {
  try {
    const parsed = AssetSchema.parse(data);

    // AssetFileデータをAssetFileインスタンスに変換
    if (parsed.type === 'ImageAsset' || parsed.type === 'VectorAsset') {
      const assetFile = new AssetFile({
        path: parsed.original_file.path,
        type: parsed.original_file.type,
        hash: parsed.original_file.hash,
        originalWidth: parsed.original_file.originalWidth,
        originalHeight: parsed.original_file.originalHeight
      });

      return {
        ...parsed,
        original_file: assetFile
      };
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `Asset validation failed: ${error.issues.map(issue => issue.message).join(', ')}`,
        error.issues
      );
    }
    throw new ValidationError(`Unexpected validation error: ${String(error)}`);
  }
}

/**
 * ページデータのバリデーション
 * @param data バリデーション対象のデータ
 * @returns バリデーション済みのページデータ
 */
export function validatePage(data: unknown): Page {
  try {
    return PageSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `Page validation failed: ${error.issues.map(issue => issue.message).join(', ')}`,
        error.issues
      );
    }
    throw new ValidationError(`Unexpected validation error: ${String(error)}`);
  }
}

/**
 * UIStateデータのバリデーション
 * @param data バリデーション対象のデータ
 * @returns バリデーション済みのUIStateデータ
 */
export function validateUIState(data: unknown): UIState {
  try {
    return UIStateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `UIState validation failed: ${error.issues.map(issue => issue.message).join(', ')}`,
        error.issues
      );
    }
    throw new ValidationError(`Unexpected validation error: ${String(error)}`);
  }
}

/**
 * LanguageSettingsデータのバリデーション
 * @param data バリデーション対象のデータ
 * @returns バリデーション済みのLanguageSettingsデータ
 */
export function validateLanguageSettings(data: unknown): LanguageSettings {
  try {
    return LanguageSettingsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `LanguageSettings validation failed: ${error.issues.map(issue => issue.message).join(', ')}`,
        error.issues
      );
    }
    throw new ValidationError(`Unexpected validation error: ${String(error)}`);
  }
}

/**
 * ISO 639-1言語コードのバリデーション
 * @param langCode バリデーション対象の言語コード
 * @returns 有効な言語コードか
 */
export function validateLanguageCode(langCode: string): boolean {
  // 基本的なISO 639-1フォーマットチェック（2文字小文字）
  return /^[a-z]{2}$/.test(langCode);
}

/**
 * サポート言語リストのバリデーション
 * @param languages バリデーション対象の言語リスト
 * @returns バリデーション結果
 */
export function validateSupportedLanguages(languages: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(languages)) {
    errors.push('Supported languages must be an array');
    return { valid: false, errors };
  }
  
  if (languages.length === 0) {
    errors.push('At least one language must be supported');
    return { valid: false, errors };
  }
  
  languages.forEach((lang, index) => {
    if (typeof lang !== 'string') {
      errors.push(`Language at index ${index} must be a string`);
    } else if (!validateLanguageCode(lang)) {
      errors.push(`Invalid language code at index ${index}: ${lang}`);
    }
  });
  
  const uniqueLanguages = new Set(languages);
  if (uniqueLanguages.size !== languages.length) {
    errors.push('Duplicate language codes are not allowed');
  }
  
  return { valid: errors.length === 0, errors };
}
