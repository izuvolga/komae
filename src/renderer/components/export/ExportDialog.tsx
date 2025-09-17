import React, { useState, useEffect } from 'react';
import { TextField } from '@mui/material';
import { useProjectStore } from '../../stores/projectStore';
import type { ExportFormat, ExportOptions } from '../../../types/entities';
import './ExportDialog.css';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, onExport }) => {
  const project = useProjectStore((state) => state.project);
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  
  // エクスポート設定の状態
  const [format, setFormat] = useState<ExportFormat>('html');
  const [outputPath, setOutputPath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [quality, setQuality] = useState(90);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [expectedOutput, setExpectedOutput] = useState('');

  // ExportDirectoryManagerはMainプロセスで実行するため、こちらでは直接使用しない

  // プロジェクトが変更されたときの初期化
  useEffect(() => {
    if (project && isOpen) {
      setProjectName(project.metadata.title || 'untitled-project');
      if (currentProjectPath) {
        // プロジェクトと同じディレクトリをデフォルトの出力先とする
        const defaultOutput = currentProjectPath;
        setOutputPath(defaultOutput);
      }
    }
  }, [project, currentProjectPath, isOpen]);

  // 出力パスの検証とプレビュー更新
  useEffect(() => {
    if (outputPath && projectName && isOpen) {
      validateAndPreview();
    }
  }, [outputPath, projectName, format, overwriteExisting]);

  const validateAndPreview = async () => {
    if (!outputPath || !projectName) return;

    setIsValidating(true);
    setValidationErrors([]);

    try {
      // ファイル名のサニタイズと生成をここで簡易実装
      const sanitizedName = projectName
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .replace(/^\.+/, '')
        .trim() || 'untitled';

      let expectedPath: string;

      if (format === 'html') {
        expectedPath = `${outputPath}/${sanitizedName}.html`;
      } else if (format === 'png') {
        expectedPath = `${outputPath}/${sanitizedName}/`;
        if (project) {
          expectedPath += `1.png, 2.png, ... ${project.pages.length}.png`;
        }
      } else {
        expectedPath = `${outputPath}/${sanitizedName}/`;
      }

      setExpectedOutput(expectedPath);

      // 基本的なパス検証のみ実行（詳細検証はMainプロセスで行う）
      if (!outputPath || outputPath.trim() === '') {
        setValidationErrors(['出力パスが指定されていません']);
      }

    } catch (error) {
      setValidationErrors([`検証エラー: ${error}`]);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBrowseOutputPath = async () => {
    try {
      const result = await window.electronAPI?.fileSystem?.showOpenDialog({
        properties: ['openDirectory'],
        title: 'エクスポート先ディレクトリを選択'
      });

      if (result && !result.canceled && result.filePaths.length > 0) {
        setOutputPath(result.filePaths[0]);
      }
    } catch (error) {
      console.error('ディレクトリ選択エラー:', error);
    }
  };

  const handleExport = () => {
    if (!project || validationErrors.length > 0) return;

    const exportOptions: ExportOptions = {
      format,
      title: projectName,
      outputPath,
      width: project.canvas.width,
      height: project.canvas.height,
      quality,
      embedAssets: true, // HTMLの場合は常にtrue
      htmlOptions: format === 'html' ? {
        singleFile: true,
        includeNavigation: true,
        autoPlay: false
      } : undefined
    };

    onExport(exportOptions);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container export-dialog">
        <div className="modal-header">
          <h2>プロジェクトのエクスポート</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* エクスポート形式選択 */}
          <div className="form-group">
            <label>エクスポート形式</label>
            <div className="format-options">
              <label className="radio-option">
                <input
                  type="radio"
                  value="html"
                  checked={format === 'html'}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                />
                <span>HTML（単一ファイル）</span>
                <small>ウェブブラウザで表示可能な単一HTMLファイル</small>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="png"
                  checked={format === 'png'}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                />
                <span>PNG（画像ファイル）</span>
                <small>各ページが個別のPNG画像として出力</small>
              </label>
            </div>
          </div>

          {/* ファイル名 */}
          <div className="form-group">
            <TextField
              label="ファイル名"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="ファイル名を入力"
              fullWidth
              size="small"
            />
          </div>

          {/* 出力先パス */}
          <div className="form-group">
            <label htmlFor="output-path">出力先ディレクトリ</label>
            <div className="path-input-group">
              <TextField
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="出力先パスを入力"
                size="small"
                fullWidth
              />
              <button type="button" onClick={handleBrowseOutputPath}>
                参照
              </button>
            </div>
          </div>

          {/* 品質設定（PNG形式の場合） */}
          {format === 'png' && (
            <div className="form-group">
              <label htmlFor="quality">画質（{quality}%）</label>
              <input
                id="quality"
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
              />
            </div>
          )}

          {/* 上書き設定 */}
          <div className="form-group">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
              />
              <span>既存のファイルを上書きする</span>
            </label>
          </div>

          {/* 出力プレビュー */}
          <div className="form-group">
            <label>出力先プレビュー</label>
            <div className="output-preview">
              {isValidating ? (
                <span className="validating">検証中...</span>
              ) : (
                <code>{expectedOutput}</code>
              )}
            </div>
          </div>

          {/* バリデーションエラー */}
          {validationErrors.length > 0 && (
            <div className="validation-errors">
              <h4>エラー</h4>
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* プロジェクト情報 */}
          {project && (
            <div className="project-info">
              <h4>プロジェクト情報</h4>
              <div className="info-grid">
                <span>ページ数:</span>
                <span>{project.pages.length}</span>
                <span>アセット数:</span>
                <span>{Object.keys(project.assets).length}</span>
                <span>キャンバスサイズ:</span>
                <span>{project.canvas.width} × {project.canvas.height}px</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!project || validationErrors.length > 0 || isValidating}
            className="btn btn-primary"
          >
            エクスポート
          </button>
        </div>
      </div>
    </div>
  );
};
