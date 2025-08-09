// Zodスキーマによるプロジェクトデータバリデーション

import { z } from 'zod';
import { ProjectData, Asset, Page, FontType, LanguageOverrides } from '../types/entities';

// 基本的なスキーマ定義

// LanguageOverrides スキーマ
const LanguageOverridesSchema = z.object({
  override_text: z.string().optional(),
  override_font_size: z.number().min(1).optional(),
  override_pos_x: z.number().optional(),
  override_pos_y: z.number().optional(),
  override_font: z.string().optional(), // 言語別フォント選択
  override_opacity: z.number().min(0).max(1).optional(),
  override_z_index: z.number().optional(),
  override_leading: z.number().optional(), // 言語別行間
  override_vertical: z.boolean().optional(), // 言語別縦書き設定
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
  // 既存override値（後方互換性）
  override_text: z.string().optional(),
  override_pos_x: z.number().optional(),
  override_pos_y: z.number().optional(),
  override_font_size: z.number().min(1).optional(),
  override_opacity: z.number().min(0).max(1).optional(),
  override_z_index: z.number().optional(),
  // 新機能：言語別完全オーバーライド
  multilingual_overrides: z.record(z.string(), LanguageOverridesSchema).optional(),
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
  // TextAssetInstanceの追加フィールド
  override_text: z.string().optional(),
  override_font_size: z.number().min(1).optional(),
  // 多言語対応フィールド
  multilingual_overrides: z.record(z.string(), LanguageOverridesSchema).optional(),
});

// ImageAsset スキーマ
const ImageAssetSchema = z.object({
  id: z.string().min(1),
  type: z.literal('ImageAsset'),
  name: z.string().min(1),
  original_file_path: z.string().min(1),
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

// TextAsset スキーマ
const TextAssetSchema = z.object({
  id: z.string().min(1),
  type: z.literal('TextAsset'),
  name: z.string().min(1),
  default_text: z.string(),
  font: z.string().min(1),
  stroke_width: z.number().min(0),
  font_size: z.number().min(1),
  stroke_color: z.string().min(1),
  fill_color: z.string().min(1),
  default_pos_x: z.number(),
  default_pos_y: z.number(),
  opacity: z.number().min(0).max(1),
  leading: z.number(),
  vertical: z.boolean(),
  default_z_index: z.number(),
  // 新機能：言語別デフォルト設定
  multilingual_defaults: z.record(z.string(), LanguageOverridesSchema).optional(),
});

// Asset Union スキーマ
const AssetSchema = z.union([ImageAssetSchema, TextAssetSchema]);

// Page スキーマ
const PageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
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
});

// FontInfo スキーマ
const FontInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.nativeEnum(FontType),
  path: z.string().min(1),
  filename: z.string().optional(),
});

// ProjectData スキーマ
const ProjectDataSchema = z.object({
  metadata: ProjectMetadataSchema,
  canvas: CanvasConfigSchema,
  assets: z.record(z.string(), AssetSchema),
  pages: z.array(PageSchema),
  fonts: z.record(z.string(), FontInfoSchema),
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
    return ProjectDataSchema.parse(data);
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
    return AssetSchema.parse(data);
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
 * LanguageOverridesデータのバリデーション
 * @param data バリデーション対象のデータ
 * @returns バリデーション済みのLanguageOverridesデータ
 */
export function validateLanguageOverrides(data: unknown): LanguageOverrides {
  try {
    return LanguageOverridesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        `LanguageOverrides validation failed: ${error.issues.map(issue => issue.message).join(', ')}`,
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