import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { generateTextAssetYAML, parseTextAssetYAML } from '../../../utils/yamlConverter';
import { generateAIPrompt } from '../../../utils/aiPrompt';
import './BulkEditModal.css';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
}) => {
  const project = useProjectStore((state) => state.project);
  const getCurrentLanguage = useProjectStore((state) => state.getCurrentLanguage);
  const getSupportedLanguages = useProjectStore((state) => state.getSupportedLanguages);
  const updateAssetInstance = useProjectStore((state) => state.updateAssetInstance);
  const addNotification = useProjectStore((state) => state.addNotification);
  
  const [yamlContent, setYamlContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [showWhatIsThis, setShowWhatIsThis] = useState(false);

  // YAMLコンテンツを生成
  useEffect(() => {
    if (isOpen && project) {
      const content = generateTextAssetYAML(project);
      setYamlContent(content);
      setOriginalContent(content);
      setIsModified(false);
    }
  }, [isOpen, project]);

  // コンテンツ変更検出
  useEffect(() => {
    setIsModified(yamlContent !== originalContent);
  }, [yamlContent, originalContent]);

  const handleImport = async () => {
    if (!project) return;

    try {
      const parsedData = parseTextAssetYAML(yamlContent, project);
      
      // 各ページの各インスタンスを更新
      for (const pageData of parsedData) {
        for (const [instanceId, instanceData] of Object.entries(pageData.instances)) {
          // 多言語テキストをmultilingual_overridesに変換
          const multilingual_overrides: Record<string, { override_text?: string }> = {};
          for (const [langCode, text] of Object.entries(instanceData.texts)) {
            if (text && text.trim()) {
              multilingual_overrides[langCode] = { override_text: text };
            }
          }
          
          updateAssetInstance(pageData.pageId, instanceId, { multilingual_overrides });
        }
      }

      setOriginalContent(yamlContent);
      setIsModified(false);
      
      addNotification({
        type: 'success',
        title: 'テキスト一括更新完了',
        message: 'YAML形式のテキストデータをプロジェクトに反映しました',
        autoClose: true,
        duration: 3000,
      });

      onClose();
    } catch (error) {
      console.error('YAML import error:', error);
      addNotification({
        type: 'error',
        title: 'インポートエラー',
        message: `YAML形式が無効です: ${error instanceof Error ? error.message : String(error)}`,
        autoClose: false,
      });
    }
  };

  const handleCopyAIPrompt = async () => {
    if (!project) return;

    try {
      const prompt = generateAIPrompt(yamlContent, getSupportedLanguages());
      await navigator.clipboard.writeText(prompt);
      
      addNotification({
        type: 'success',
        title: 'AIプロンプトをコピー',
        message: 'クリップボードにAI編集用プロンプトをコピーしました',
        autoClose: true,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy AI prompt:', error);
      addNotification({
        type: 'error',
        title: 'コピー失敗',
        message: 'プロンプトのコピーに失敗しました',
        autoClose: true,
        duration: 3000,
      });
    }
  };

  const handleCancel = () => {
    if (isModified) {
      const confirmed = window.confirm('変更が保存されていません。閉じますか？');
      if (!confirmed) return;
    }
    setYamlContent(originalContent);
    setIsModified(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content bulk-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>TextAsset Bulk Edit</h2>
          <div className="header-actions">
            <button 
              className="help-btn"
              onClick={() => setShowWhatIsThis(!showWhatIsThis)}
              title="この機能について"
            >
              What is this [?]
            </button>
            <button 
              className="ai-prompt-btn"
              onClick={handleCopyAIPrompt}
              title="AI編集用プロンプトをクリップボードにコピー"
            >
              Copy AI Prompt ✨
            </button>
          </div>
          <button 
            className="modal-close-btn" 
            onClick={handleCancel}
          >
            ×
          </button>
        </div>

        {showWhatIsThis && (
          <div className="help-section">
            <div className="help-content">
              <h3>TextAsset Bulk Edit とは？</h3>
              <p>
                この機能は、プロジェクト内のすべてのテキストアセットインスタンスを
                YAML形式で一括編集するためのツールです。
              </p>
              <ul>
                <li><strong>YAML編集</strong>: すべてのテキストを構造化されたYAML形式で編集</li>
                <li><strong>多言語対応</strong>: 複数言語のテキストを同時に管理</li>
                <li><strong>AI支援</strong>: 生成AIを使った一括翻訳・編集をサポート</li>
                <li><strong>ページ構造</strong>: ページごとにテキストが整理されて表示</li>
              </ul>
              <p>
                特に翻訳作業や大量のテキスト編集において、スプレッドシート形式よりも
                効率的な編集が可能です。
              </p>
            </div>
          </div>
        )}

        <div className="modal-body">
          <div className="yaml-editor-container">
            <textarea
              className="yaml-editor"
              value={yamlContent}
              onChange={(e) => setYamlContent(e.target.value)}
              placeholder="YAML形式のテキストデータが表示されます..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-info">
            {isModified && (
              <span className="modified-indicator">● 変更あり</span>
            )}
          </div>
          <div className="footer-actions">
            <button 
              className="btn btn-secondary" 
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleImport}
              disabled={!isModified}
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};