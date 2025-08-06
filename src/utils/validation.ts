// Zodスキーマによるプロジェクトデータバリデーション

import { z } from 'zod';
import { ProjectData, Asset, Page } from '../types/entities';

// 基本的なスキーマ定義

// AssetInstance 基本スキーマ
const BaseAssetInstanceSchema = z.object({
  id: z.string().min(1),
  asset_id: z.string().min(1),
  z_index: z.number().int().min(0),
});

// ImageAssetInstance スキーマ
const ImageAssetInstanceSchema = BaseAssetInstanceSchema.extend({
  override_pos_x: z.number().optional(),
  override_pos_y: z.number().optional(),
  override_width: z.number().min(0).optional(),
  override_height: z.number().min(0).optional(),
  override_opacity: z.number().min(0).max(1).optional(),
  override_mask: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]).optional(),
});

// TextAssetInstance スキーマ
const TextAssetInstanceSchema = BaseAssetInstanceSchema.extend({
  override_text: z.string().optional(),
  override_pos_x: z.number().optional(),
  override_pos_y: z.number().optional(),
  font_override: z.object({
    size: z.number().min(1).optional(),
    color_ex: z.string().optional(),
    color_in: z.string().optional(),
  }).optional(),
});

// AssetInstance Union スキーマ
const AssetInstanceSchema = z.union([ImageAssetInstanceSchema, TextAssetInstanceSchema]);

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
  default_mask: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
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
  color_ex: z.string().min(1),
  color_in: z.string().min(1),
  default_pos_x: z.number(),
  default_pos_y: z.number(),
  vertical: z.boolean(),
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
});

// CanvasConfig スキーマ
const CanvasConfigSchema = z.object({
  width: z.number().int().min(1),
  height: z.number().int().min(1),
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