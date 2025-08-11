import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ProjectData, 
  ProjectCreateParams, 
  ExportFormat, 
  ExportOptions 
} from '../../types/entities';
import { saveProjectFile, loadProjectFile } from '../../utils/projectFile';
import { createProjectDirectory, validateProjectDirectory } from '../../utils/projectDirectory';
import { getLogger, PerformanceTracker } from '../../utils/logger';

export class ProjectManager {
  private currentProjectPath: string | null = null;
  private logger = getLogger();

  /**
   * プラットフォームを検出する
   */
  private getPlatform(): 'darwin' | 'win32' | 'linux' {
    return os.platform() as 'darwin' | 'win32' | 'linux';
  }

  /**
   * macOS用のInfo.plistファイルを生成する
   */
  private async createInfoPlist(projectPath: string): Promise<void> {
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>Komae Project</string>
    <key>CFBundleDocumentTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeExtensions</key>
            <array>
                <string>komae</string>
            </array>
            <key>CFBundleTypeName</key>
            <string>Komae Project</string>
            <key>CFBundleTypeRole</key>
            <string>Editor</string>
            <key>LSTypeIsPackage</key>
            <true/>
        </dict>
    </array>
    <key>CFBundleIdentifier</key>
    <string>com.komae.project</string>
    <key>CFBundleName</key>
    <string>Komae Project</string>
    <key>CFBundlePackageType</key>
    <string>BNDL</string>
    <key>LSTypeIsPackage</key>
    <true/>
</dict>
</plist>`;

    const contentsDir = path.join(projectPath, 'Contents');
    await fs.mkdir(contentsDir, { recursive: true });
    await fs.writeFile(path.join(contentsDir, 'Info.plist'), plistContent, 'utf8');
  }

  /**
   * 新しいプロジェクトディレクトリを作成する
   */
  async createProjectDirectory(projectPath: string): Promise<void> {
    try {
      await createProjectDirectory(projectPath);
      
      // 開発段階では Info.plist 生成を無効化
      // 将来のリリース版では以下のコードを有効化:
      // if (this.getPlatform() === 'darwin') {
      //   await this.createInfoPlist(projectPath);
      // }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create project directory: ${message}`);
    }
  }

  /**
   * プロジェクトディレクトリを検証する
   */
  async validateProjectDirectory(projectPath: string): Promise<boolean> {
    try {
      return await validateProjectDirectory(projectPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to validate project directory: ${message}`);
    }
  }

  async createProject(params: ProjectCreateParams): Promise<ProjectData> {
    const projectId = uuidv4();
    
    const projectData: ProjectData = {
      metadata: {
        komae_version: '1.0',
        project_version: '1.0',
        title: params.title,
        description: params.description,
        supportedLanguages: params.supportedLanguages || ['ja'],
        currentLanguage: params.currentLanguage || 'ja',
      },
      canvas: params.canvas,
      assets: {},
      pages: [],
    };

    // デフォルトページを作成
    const defaultPageId = `page-${uuidv4()}`;
    projectData.pages.push({
      id: defaultPageId,
      title: 'Page 1',
      asset_instances: {},
    });

    return projectData;
  }

  async saveProject(projectData: ProjectData, filePath?: string): Promise<string> {
    const tracker = new PerformanceTracker('project_save');
    let targetPath = filePath || this.currentProjectPath;

    if (!targetPath) {
      const error = new Error('No file path specified for new project');
      await this.logger.logError('project_save', error);
      throw error;
    }

    try {
      await this.logger.logDevelopment('project_save_start', 'Project save process started', {
        targetPath,
        hasAssets: Object.keys(projectData.assets).length,
        pageCount: projectData.pages.length,
      });

      let stats: any = null;
      try {
        stats = await fs.stat(targetPath);
      } catch (statError) {
        // ファイルが存在しない場合は null のまま
      }
      
      let actualFilePath: string;
      if (stats && stats.isDirectory()) {
        // プロジェクトディレクトリの場合
        const dirName = path.basename(targetPath);
        const projectFilePath = path.join(targetPath, `${dirName}.komae`);
        await saveProjectFile(projectFilePath, projectData);
        this.currentProjectPath = targetPath;
        actualFilePath = projectFilePath;
      } else {
        // ファイルが指定された場合、または存在しないパスの場合
        if (targetPath.endsWith('.komae')) {
          // .komaeファイルの場合は直接保存
          await saveProjectFile(targetPath, projectData);
          // プロジェクトパスは常に.komaeファイルの親ディレクトリ
          this.currentProjectPath = path.dirname(targetPath);
          actualFilePath = targetPath;
        } else {
          // 従来通りのYAMLファイル保存
          const yamlContent = yaml.dump(projectData, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
          });

          await fs.writeFile(targetPath, yamlContent, 'utf8');
          this.currentProjectPath = path.dirname(targetPath);
          actualFilePath = targetPath;
        }
      }

      await this.logger.logProjectOperation('save', {
        path: actualFilePath,
        name: projectData.metadata.title,
        format: actualFilePath.endsWith('.komae') ? 'komae' : 'yaml',
      }, {
        assetCount: Object.keys(projectData.assets).length,
        pageCount: projectData.pages.length,
      }, true);

      await tracker.end({ success: true, filePath: actualFilePath });
      return actualFilePath;

    } catch (error) {
      await this.logger.logProjectOperation('save', {
        path: targetPath,
      }, {
        error: error instanceof Error ? error.message : String(error),
      }, false);

      await tracker.end({ success: false, error: error instanceof Error ? error.message : String(error) });
      
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save project: ${message}`);
    }
  }

  /**
   * プロジェクトファイルを自動検出する
   * @param inputPath ディレクトリまたはファイルパス
   * @returns 検出されたプロジェクトファイルのパス
   */
  private async detectProjectFile(inputPath: string): Promise<string> {
    const stats = await fs.stat(inputPath);
    
    if (stats.isFile()) {
      // ファイルが指定された場合はそのまま使用
      return inputPath;
    }
    
    if (stats.isDirectory()) {
      // ディレクトリが指定された場合は内部のプロジェクトファイルを検索
      const dirName = path.basename(inputPath);
      
      // 1. [ディレクトリ名].komae を検索
      const primaryCandidate = path.join(inputPath, `${dirName}.komae`);
      try {
        await fs.access(primaryCandidate);
        return primaryCandidate;
      } catch {
        // 見つからない場合は次の候補を試す
      }
      
      // 2. project.komae を検索（フォールバック）
      const fallbackCandidate = path.join(inputPath, 'project.komae');
      try {
        await fs.access(fallbackCandidate);
        return fallbackCandidate;
      } catch {
        throw new Error(`No valid project file found in directory: ${inputPath}`);
      }
    }
    
    throw new Error(`Invalid path type: ${inputPath}`);
  }

  async loadProject(inputPath: string): Promise<ProjectData> {
    try {
      // プロジェクトファイルを自動検出
      const projectFilePath = await this.detectProjectFile(inputPath);
      
      // YAMLファイルを読み込み
      const projectData = await loadProjectFile(projectFilePath);
      
      // プロジェクトパスを設定
      const stats = await fs.stat(inputPath);
      if (stats.isDirectory()) {
        // ディレクトリが指定された場合はそのディレクトリをプロジェクトパスとする
        this.currentProjectPath = inputPath;
      } else {
        // ファイルが指定された場合は親ディレクトリをプロジェクトパスとする
        this.currentProjectPath = path.dirname(inputPath);
      }
      
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
