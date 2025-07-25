import React from 'react';
import { AssetLibrary } from '../asset/AssetLibrary';
import { PreviewArea } from '../preview/PreviewArea';
import { EnhancedSpreadsheet } from '../spreadsheet/EnhancedSpreadsheet';
import { useProjectStore } from '../../stores/projectStore';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const activeWindow = useProjectStore((state) => state.ui.activeWindow);
  const setProject = useProjectStore((state) => state.setProject);
  const addAsset = useProjectStore((state) => state.addAsset);

  const handleCreateProject = async () => {
    try {
      const projectData = await window.electronAPI.project.create({
        title: '新しいプロジェクト',
        description: '',
        canvas: { width: 800, height: 600 }
      });
      setProject(projectData);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleOpenProject = async () => {
    try {
      const result = await window.electronAPI.fileSystem.showOpenDialog({
        title: 'プロジェクトを開く',
        filters: [{ name: 'Komae Project', extensions: ['komae'] }],
        properties: ['openFile'],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const projectData = await window.electronAPI.project.load(result.filePaths[0]);
        setProject(projectData);
      }
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  const handleCreateSampleProject = () => {
    // サンプルプロジェクトデータ
    const sampleProject = {
      metadata: {
        komae_version: '1.0',
        project_version: '1.0',
        title: 'サンプルプロジェクト',
        description: 'Komaeの機能を試すためのサンプルプロジェクト',
      },
      canvas: { width: 800, height: 600 },
      asset_attrs: {
        position_attrs: {},
        size_attrs: {},
      },
      assets: {
        'sample-img-1': {
          id: 'sample-img-1',
          type: 'ImageAsset' as const,
          name: 'キャラクター1',
          original_file_path: '/sample/character1.png',
          original_width: 400,
          original_height: 600,
          default_pos_x: 100,
          default_pos_y: 50,
          default_opacity: 1.0,
          default_mask: [0, 0, 400, 600] as [number, number, number, number],
        },
        'sample-text-1': {
          id: 'sample-text-1',
          type: 'TextAsset' as const,
          name: 'セリフ1',
          default_text: 'こんにちは！',
          font: 'system-ui',
          stroke_width: 2.0,
          font_size: 24,
          color_ex: '#000000',
          color_in: '#FFFFFF',
          default_pos_x: 500,
          default_pos_y: 100,
          vertical: false,
        },
      },
      pages: {
        'sample-page-1': {
          id: 'sample-page-1',
          title: 'ページ1',
          asset_instances: {
            'instance-1': {
              id: 'instance-1',
              asset_id: 'sample-img-1',
              z_index: 0,
              transform: { scale_x: 1.0, scale_y: 1.0, rotation: 0 },
              opacity: 1.0,
            },
            'instance-2': {
              id: 'instance-2',
              asset_id: 'sample-text-1',
              z_index: 1,
              transform: { scale_x: 1.0, scale_y: 1.0, rotation: 0 },
              opacity: 1.0,
            },
          },
        },
        'sample-page-2': {
          id: 'sample-page-2',
          title: 'ページ2',
          asset_instances: {
            'instance-3': {
              id: 'instance-3',
              asset_id: 'sample-img-1',
              z_index: 0,
              transform: { scale_x: 1.2, scale_y: 1.2, rotation: 5 },
              opacity: 0.8,
            },
          },
        },
      },
    };

    setProject(sampleProject);
  };

  if (!project) {
    return (
      <div className="main-layout">
        <div className="welcome-screen">
          <div className="welcome-content">
            <h1>Komae</h1>
            <p>イラスト集作成ツール</p>
            <div className="welcome-actions">
              <button className="btn-primary" onClick={handleCreateProject}>新規プロジェクト</button>
              <button className="btn-secondary" onClick={handleOpenProject}>プロジェクトを開く</button>
              <button className="btn-secondary" onClick={handleCreateSampleProject}>サンプルプロジェクト</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-layout">
      <div className="layout-grid">
        {/* Left Panel - Asset Library */}
        <div className="left-panel">
          <AssetLibrary />
        </div>

        {/* Center Panel - Spreadsheet */}
        <div className="center-panel">
          <div className="toolbar">
            <div className="toolbar-section">
              <span className="project-title">{project.metadata.title}</span>
            </div>
            <div className="toolbar-section">
              <button className="btn-small" title="新しいページを追加">
                ページ追加
              </button>
              <button className="btn-small" title="アセットをインポート">
                アセット追加
              </button>
            </div>
          </div>
          <div className="main-content">
            <EnhancedSpreadsheet />
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="right-panel">
          <PreviewArea />
        </div>
      </div>
    </div>
  );
};
