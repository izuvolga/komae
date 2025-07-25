import React, { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import type { Page } from '../../../types/entities';
import './PageList.css';

export const PageList: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const currentPage = useProjectStore((state) => state.ui.currentPage);
  const selectedPages = useProjectStore((state) => state.ui.selectedPages);
  const setCurrentPage = useProjectStore((state) => state.setCurrentPage);
  const selectPages = useProjectStore((state) => state.selectPages);
  const addPage = useProjectStore((state) => state.addPage);
  const updatePage = useProjectStore((state) => state.updatePage);
  const deletePage = useProjectStore((state) => state.deletePage);
  
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  if (!project) return null;

  const pages = Object.values(project.pages);

  const handlePageClick = (pageId: string, ctrlKey: boolean) => {
    if (ctrlKey) {
      // 複数選択
      const isSelected = selectedPages.includes(pageId);
      if (isSelected) {
        selectPages(selectedPages.filter(id => id !== pageId));
      } else {
        selectPages([...selectedPages, pageId]);
      }
    } else {
      // 単一選択
      setCurrentPage(pageId);
      selectPages([pageId]);
    }
  };

  const handleAddPage = () => {
    const pageNumber = pages.length + 1;
    const newPage: Page = {
      id: `page-${Date.now()}`,
      title: `Page ${pageNumber}`,
      asset_instances: {},
    };
    addPage(newPage);
    setCurrentPage(newPage.id);
  };

  const handleDeletePage = () => {
    if (selectedPages.length === 0) return;
    
    const confirmed = confirm(`選択した${selectedPages.length}個のページを削除しますか？`);
    if (confirmed) {
      selectedPages.forEach(pageId => deletePage(pageId));
      selectPages([]);
    }
  };

  const handleEditStart = (page: Page) => {
    setEditingPageId(page.id);
    setEditingTitle(page.title);
  };

  const handleEditSave = () => {
    if (editingPageId && editingTitle.trim()) {
      updatePage(editingPageId, { title: editingTitle.trim() });
    }
    setEditingPageId(null);
    setEditingTitle('');
  };

  const handleEditCancel = () => {
    setEditingPageId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  return (
    <div className="page-list">
      <div className="page-list-header">
        <h3>ページ一覧</h3>
        <div className="page-actions">
          <button className="btn-icon" onClick={handleAddPage} title="新しいページを追加">
            +
          </button>
          <button 
            className="btn-icon" 
            onClick={handleDeletePage}
            disabled={selectedPages.length === 0}
            title="選択したページを削除"
          >
            ×
          </button>
        </div>
      </div>

      <div className="page-tabs">
        {pages.length === 0 ? (
          <div className="empty-state">
            <p>ページがありません</p>
            <button className="btn-small" onClick={handleAddPage}>
              最初のページを作成
            </button>
          </div>
        ) : (
          pages.map((page, index) => (
            <div
              key={page.id}
              className={`page-tab ${
                currentPage === page.id ? 'active' : ''
              } ${
                selectedPages.includes(page.id) ? 'selected' : ''
              }`}
              onClick={(e) => handlePageClick(page.id, e.ctrlKey || e.metaKey)}
              onDoubleClick={() => handleEditStart(page)}
            >
              <div className="page-tab-content">
                <div className="page-number">{index + 1}</div>
                {editingPageId === page.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleEditSave}
                    onKeyDown={handleKeyDown}
                    className="page-title-input"
                    autoFocus
                  />
                ) : (
                  <div className="page-title" title={page.title}>
                    {page.title}
                  </div>
                )}
                <div className="page-asset-count">
                  {Object.keys(page.asset_instances).length}個
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
