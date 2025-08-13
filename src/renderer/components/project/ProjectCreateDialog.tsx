import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { ProjectCreateParams, CanvasConfig } from '../../../types/entities';
import { AVAILABLE_LANGUAGES, DEFAULT_SUPPORTED_LANGUAGES, DEFAULT_CURRENT_LANGUAGE, getLanguageDisplayName } from '../../../constants/languages';
import './ProjectCreateDialog.css';

interface ProjectCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// プリセットのキャンバスサイズ
const CANVAS_PRESETS = [
  { name: '縦長（3:4）', width: 768, height: 1024 },
  { name: '縦長（9:16）', width: 720, height: 1280 },
  { name: '横長（4:3）', width: 1024, height: 768 },
  { name: '横長（16:9）', width: 1280, height: 720 },
  { name: 'スクエア', width: 1024, height: 1024 },
  { name: 'カスタム', width: 800, height: 600 }, // カスタム用のデフォルト値
];

export const ProjectCreateDialog: React.FC<ProjectCreateDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { setProject, addNotification } = useProjectStore();
  
  // フォーム状態
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('0'); // Standard preset
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(600);
  const [isCreating, setIsCreating] = useState(false);
  
  // 多言語対応状態
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(DEFAULT_SUPPORTED_LANGUAGES);
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_CURRENT_LANGUAGE);
  const [selectedLanguageForAdd, setSelectedLanguageForAdd] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // 現在のキャンバス設定を取得
  const getCurrentCanvas = (): CanvasConfig => {
    const presetIndex = parseInt(selectedPreset);
    if (presetIndex < CANVAS_PRESETS.length - 1) {
      // プリセット選択
      const preset = CANVAS_PRESETS[presetIndex];
      return { width: preset.width, height: preset.height };
    } else {
      // カスタム選択
      return { width: customWidth, height: customHeight };
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      addNotification({
        type: 'warning',
        title: '入力エラー',
        message: 'プロジェクト名を入力してください',
        autoClose: true,
        duration: 3000,
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const canvas = getCurrentCanvas();
      const params: ProjectCreateParams = {
        title: title.trim(),
        description: description.trim() || undefined,
        canvas,
        supportedLanguages,
        currentLanguage,
      };

      // プロジェクト保存先ディレクトリを選択するダイアログを表示
      const saveResult = await window.electronAPI.fileSystem.showDirectorySelectDialog({
        title: `「${title.trim()}」フォルダを作成する親ディレクトリを選択`
      });

      if (saveResult.canceled || !saveResult.filePaths || saveResult.filePaths.length === 0) {
        // キャンセルされた場合はプロジェクト作成をキャンセル
        addNotification({
          type: 'info',
          title: 'プロジェクト作成がキャンセルされました',
          message: '保存先ディレクトリが選択されませんでした',
          autoClose: true,
          duration: 3000,
        });
        setIsCreating(false);
        return;
      }

      const parentDir = saveResult.filePaths[0];
      const projectName = title.trim();
      const projectDir = `${parentDir}/${projectName}`;
      const projectFilePath = `${projectDir}/${projectName}.komae`;

      // ElectronAPIを通じてプロジェクトデータを作成
      const projectData = await window.electronAPI.project.create(params);

      // プロジェクトディレクトリを作成
      await window.electronAPI.project.createDirectory(projectDir);

      // プロジェクトファイルを保存
      await window.electronAPI.project.save(projectData, projectFilePath);
      
      // プロジェクトをストアに設定
      setProject(projectData);

      // プロジェクトパスを取得して設定
      const currentProjectPath = await window.electronAPI.project.getCurrentPath();
      const { setCurrentProjectPath } = useProjectStore.getState();
      setCurrentProjectPath(currentProjectPath);

      addNotification({
        type: 'success',
        title: 'プロジェクトが作成されました',
        message: `「${projectName}」が ${projectDir} に保存されました`,
        autoClose: true,
        duration: 5000,
      });

      // フォームをリセット
      setTitle('');
      setDescription('');
      setSelectedPreset('0');
      setCustomWidth(800);
      setCustomHeight(600);
      setSupportedLanguages(DEFAULT_SUPPORTED_LANGUAGES);
      setCurrentLanguage(DEFAULT_CURRENT_LANGUAGE);
      setSelectedLanguageForAdd('');
      setShowLanguageDropdown(false);
      
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addNotification({
        type: 'error',
        title: 'プロジェクトの作成に失敗しました',
        message: `エラー: ${message}`,
        autoClose: false,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    // フォームをリセット
    setTitle('');
    setDescription('');
    setSelectedPreset('0');
    setCustomWidth(800);
    setCustomHeight(600);
    setSupportedLanguages(DEFAULT_SUPPORTED_LANGUAGES);
    setCurrentLanguage(DEFAULT_CURRENT_LANGUAGE);
    setSelectedLanguageForAdd('');
    setShowLanguageDropdown(false);
    onClose();
  };
  
  // 言語追加処理
  const handleAddLanguage = () => {
    if (selectedLanguageForAdd && !supportedLanguages.includes(selectedLanguageForAdd)) {
      const newSupportedLanguages = [...supportedLanguages, selectedLanguageForAdd];
      setSupportedLanguages(newSupportedLanguages);
      
      // 最初の言語を追加した場合、それをcurrentLanguageに設定
      if (supportedLanguages.length === 0) {
        setCurrentLanguage(selectedLanguageForAdd);
      }
      
      setSelectedLanguageForAdd('');
      setShowLanguageDropdown(false);
    }
  };
  
  // 言語削除処理
  const handleRemoveLanguage = (langCode: string) => {
    if (supportedLanguages.length <= 1) {
      addNotification({
        type: 'warning',
        title: '言語削除エラー',
        message: '最低1つの言語が必要です',
        autoClose: true,
        duration: 3000,
      });
      return;
    }
    
    const newSupportedLanguages = supportedLanguages.filter(lang => lang !== langCode);
    setSupportedLanguages(newSupportedLanguages);
    
    // 削除した言語がcurrentLanguageの場合、最初の言語に変更
    if (currentLanguage === langCode) {
      setCurrentLanguage(newSupportedLanguages[0]);
    }
  };
  
  // 利用可能な追加言語を取得
  const getAvailableLanguagesForAdd = () => {
    return AVAILABLE_LANGUAGES.filter(lang => !supportedLanguages.includes(lang.code));
  };

  const isCustomSelected = parseInt(selectedPreset) === CANVAS_PRESETS.length - 1;
  const currentCanvas = getCurrentCanvas();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content project-create-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>新規プロジェクト作成</h2>
          <button 
            className="modal-close-btn" 
            onClick={handleCancel}
            disabled={isCreating}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-section">
            {/* プロジェクト基本情報 */}
            <div className="form-field">
              <label className="form-label required">プロジェクト名</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="私の物語"
                disabled={isCreating}
              />
            </div>

            <div className="form-field">
              <label className="form-label">説明 (オプション)</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="キャラクターの日常を描いた作品..."
                rows={3}
                disabled={isCreating}
              />
            </div>

            <div className="form-divider"></div>

            {/* 多言語設定 */}
            <div className="form-field">
              <label className="form-label">対応言語</label>
              
              <div className="language-selector-area">
                <div className="language-dropdown-container">
                  <div 
                    className="language-dropdown-trigger"
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  >
                    <span>{selectedLanguageForAdd || '言語を追加'}</span>
                    <span className="dropdown-arrow">▼</span>
                    <button 
                      type="button"
                      className="language-help-btn"
                      title="多言語対応機能について"
                      onClick={(e) => {
                        e.stopPropagation();
                        addNotification({
                          type: 'info',
                          title: '多言語対応機能',
                          message: 'プロジェクトで使用する言語を設定できます。TextAssetで言語ごとに異なるテキスト、フォント、サイズなどを設定可能になります。',
                          autoClose: true,
                          duration: 5000,
                        });
                      }}
                    >
                      ?
                    </button>
                  </div>
                  
                  {showLanguageDropdown && (
                    <div className="language-dropdown-menu">
                      {getAvailableLanguagesForAdd().map(lang => (
                        <div
                          key={lang.code}
                          className="language-dropdown-item"
                          onClick={() => {
                            setSelectedLanguageForAdd(lang.code);
                            handleAddLanguage();
                          }}
                        >
                          {getLanguageDisplayName(lang.code)}
                        </div>
                      ))}
                      {getAvailableLanguagesForAdd().length === 0 && (
                        <div className="language-dropdown-item disabled">
                          追加可能な言語がありません
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Lang Code Box */}
              <div className="lang-code-box">
                {supportedLanguages.map(langCode => (
                  <div 
                    key={langCode} 
                    className={`lang-code-tag ${currentLanguage === langCode ? 'active' : ''}`}
                    title={getLanguageDisplayName(langCode)}
                  >
                    <span 
                      className="lang-code-text"
                      onClick={() => setCurrentLanguage(langCode)}
                    >
                      {langCode.toUpperCase()}
                    </span>
                    {supportedLanguages.length > 1 && (
                      <button
                        type="button"
                        className="lang-code-remove"
                        onClick={() => handleRemoveLanguage(langCode)}
                        title={`${langCode.toUpperCase()}を削除`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="language-info">
                <small>現在の言語: <strong>{getLanguageDisplayName(currentLanguage)}</strong></small>
              </div>
            </div>

            <div className="form-divider"></div>

            {/* キャンバス設定 */}
            <div className="form-field">
              <label className="form-label">キャンバスサイズ</label>
              <div className="canvas-presets">
                {CANVAS_PRESETS.map((preset, index) => (
                  <label key={index} className="preset-option">
                    <input
                      type="radio"
                      name="canvasPreset"
                      value={index.toString()}
                      checked={selectedPreset === index.toString()}
                      onChange={(e) => setSelectedPreset(e.target.value)}
                      disabled={isCreating}
                    />
                    <span className="preset-label">
                      <span className="preset-name">{preset.name}</span>
                      {index < CANVAS_PRESETS.length - 1 && (
                        <span className="preset-size">
                          {preset.width} × {preset.height}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* カスタムサイズ設定 */}
            {isCustomSelected && (
              <div className="form-field">
                <div className="custom-size-fields">
                  <div className="size-field">
                    <label className="form-label">幅 (px)</label>
                    <input
                      type="number"
                      className="form-input size-input"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value) || 800)}
                      min={100}
                      max={4000}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="size-field">
                    <label className="form-label">高さ (px)</label>
                    <input
                      type="number"
                      className="form-input size-input"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value) || 600)}
                      min={100}
                      max={4000}
                      disabled={isCreating}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 現在の設定確認 */}
            <div className="settings-preview">
              <strong>設定確認</strong>
              <div className="settings-info">
                キャンバスサイズ: {currentCanvas.width} × {currentCanvas.height} ピクセル
              </div>
              {title.trim() && (
                <div className="settings-info" style={{ marginTop: '8px' }}>
                  作成される構造:<br />
                  選択ディレクトリ/{title.trim()}/<br />
                  　└ {title.trim()}.komae
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={handleCancel}
            disabled={isCreating}
          >
            キャンセル
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? '作成中...' : '作成'}
          </button>
        </div>
      </div>
    </div>
  );
};
