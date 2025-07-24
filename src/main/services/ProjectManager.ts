import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ProjectData, 
  ProjectCreateParams, 
  ExportFormat, 
  ExportOptions 
} from '../../types/entities';

export class ProjectManager {
  private currentProjectPath: string | null = null;

  async createProject(params: ProjectCreateParams): Promise<ProjectData> {
    const projectId = uuidv4();
    
    const projectData: ProjectData = {
      metadata: {
        komae_version: '1.0',
        project_version: '1.0',
        title: params.title,
        description: params.description,
      },
      canvas: params.canvas,
      asset_attrs: {
        position_attrs: {},
        size_attrs: {},
      },
      assets: {},
      pages: {},
    };

    // デフォルトページを作成
    const defaultPageId = `page-${uuidv4()}`;
    projectData.pages[defaultPageId] = {
      id: defaultPageId,
      title: 'Page 1',
      asset_instances: {},
    };

    return projectData;
  }

  async saveProject(projectData: ProjectData, filePath?: string): Promise<string> {
    let targetPath = filePath || this.currentProjectPath;

    if (!targetPath) {
      // 新規保存の場合はダイアログを表示（実際にはrendererから呼ばれる）
      throw new Error('No file path specified for new project');
    }

    try {
      // YAMLとして保存
      const yamlContent = yaml.dump(projectData, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });

      await fs.writeFile(targetPath, yamlContent, 'utf8');
      this.currentProjectPath = targetPath;

      return targetPath;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save project: ${message}`);
    }
  }

  async loadProject(filePath: string): Promise<ProjectData> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const projectData = yaml.load(content) as ProjectData;

      // 基本的な検証
      if (!projectData.metadata || !projectData.canvas) {
        throw new Error('Invalid project file format');
      }

      this.currentProjectPath = filePath;
      return projectData;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load project: ${message}`);
    }
  }

  async exportProject(format: ExportFormat, options: ExportOptions): Promise<string> {
    // TODO: 実装は後のイテレーションで
    throw new Error('Export functionality not implemented yet');
  }

  getCurrentProjectPath(): string | null {
    return this.currentProjectPath;
  }

  setCurrentProjectPath(filePath: string | null): void {
    this.currentProjectPath = filePath;
  }
}