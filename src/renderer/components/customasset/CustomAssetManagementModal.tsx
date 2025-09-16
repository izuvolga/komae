import React, { useState, useEffect } from 'react';
import * as crypto from 'crypto';
import '../../styles/common-modals.css';
import '../../styles/common-buttons.css';
import './CustomAssetManagementModal.css';

interface CustomAssetInfo {
  id: string;
  name: string;
  type: string;
  version: string;
  author: string;
  description: string;
  parameters: Array<{
    name: string;
    type: 'number' | 'string';
    defaultValue: number | string;
  }>;
  filePath: string;
  addedAt: string;
}

interface CustomAssetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CustomAssetManagementModal: React.FC<CustomAssetManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [customAssets, setCustomAssets] = useState<CustomAssetInfo[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState<string>('');

  // CustomAsset一覧を読み込み
  useEffect(() => {
    if (isOpen) {
      loadCustomAssets();
    }
  }, [isOpen]);

  const loadCustomAssets = async () => {
    try {
      setIsLoading(true);
      const availableAssets = await window.electronAPI.customAsset.getAvailableAssets('DynamicVector');
      setCustomAssets(availableAssets || []);
    } catch (error) {
      console.error('Failed to load custom assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsset = async () => {
    try {
      const result = await window.electronAPI.fileSystem.showOpenDialog({
        title: 'Select Custom Asset File',
        filters: [
          { name: 'Komae Custom Asset', extensions: ['komae.js'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];

        setIsLoading(true);
        try {
          const newAsset = await window.electronAPI.customAsset.addAsset(filePath);
          await loadCustomAssets();
          console.log('Custom asset added successfully:', newAsset.name);
        } catch (error) {
          console.error('Failed to add custom asset:', error);
          alert('Failed to add custom asset: ' + (error instanceof Error ? error.message : String(error)));
        }
      }
    } catch (error) {
      console.error('Failed to show file dialog:', error);
      alert('Failed to open file dialog: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAssetId) {
      alert('Please select a custom asset to delete');
      return;
    }

    const assetToDelete = customAssets.find(a => a.id === selectedAssetId);
    if (!assetToDelete) {
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete the custom asset "${assetToDelete.name}"?`);
    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      await window.electronAPI.customAsset.removeAsset(selectedAssetId);
      await loadCustomAssets();
      setSelectedAssetId(null);
      setPreviewCode('');
      console.log('Custom asset deleted successfully:', assetToDelete.name);
    } catch (error) {
      console.error('Failed to delete custom asset:', error);
      alert('Failed to delete custom asset: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewCode = async (assetId: string) => {
    try {
      const code = await window.electronAPI.customAsset.getAssetCode(assetId);
      setPreviewCode(code);
    } catch (error) {
      console.error('Failed to load asset code:', error);
      setPreviewCode('// Failed to load code');
    }
  };

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
    handlePreviewCode(assetId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) {
    return null;
  }

  const selectedAsset = customAssets.find(a => a.id === selectedAssetId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container custom-asset-management-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Custom Asset Management</h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="custom-asset-management-toolbar">
            <button
              className="btn btn-primary"
              onClick={handleAddAsset}
              disabled={isLoading}
            >
              Add Custom Asset
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDeleteAsset}
              disabled={isLoading || !selectedAssetId}
            >
              Delete Selected
            </button>
          </div>

          <div className="custom-asset-management-main">
            <div className="custom-asset-list-section">
              <h3>Custom Assets ({customAssets.length})</h3>
              {isLoading ? (
                <div className="custom-asset-loading">Loading...</div>
              ) : customAssets.length === 0 ? (
                <div className="custom-asset-empty">
                  No custom assets found. Click "Add Custom Asset" to import your first asset.
                </div>
              ) : (
                <div className="custom-asset-list">
                  {customAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`custom-asset-item ${selectedAssetId === asset.id ? 'selected' : ''}`}
                      onClick={() => handleAssetSelect(asset.id)}
                    >
                      <div className="custom-asset-item-header">
                        <span className="custom-asset-name">{asset.name}</span>
                        <span className="custom-asset-version">v{asset.version}</span>
                      </div>
                      <div className="custom-asset-author">by {asset.author}</div>
                      <div className="custom-asset-description">{asset.description}</div>
                      <div className="custom-asset-parameters">
                        {asset.parameters.length > 0 ? (
                          <span>{asset.parameters.length} parameters</span>
                        ) : (
                          <span>No parameters</span>
                        )}
                      </div>
                      <div className="custom-asset-added-at">Added: {formatDate(asset.addedAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="custom-asset-detail-section">
              {selectedAsset ? (
                <>
                  <h3>Asset Details</h3>
                  <div className="custom-asset-detail">
                    <div className="custom-asset-detail-field">
                      <label>Name:</label>
                      <span>{selectedAsset.name}</span>
                    </div>
                    <div className="custom-asset-detail-field">
                      <label>Type:</label>
                      <span>{selectedAsset.type}</span>
                    </div>
                    <div className="custom-asset-detail-field">
                      <label>Version:</label>
                      <span>{selectedAsset.version}</span>
                    </div>
                    <div className="custom-asset-detail-field">
                      <label>Author:</label>
                      <span>{selectedAsset.author}</span>
                    </div>
                    <div className="custom-asset-detail-field">
                      <label>Description:</label>
                      <span>{selectedAsset.description}</span>
                    </div>

                    {selectedAsset.parameters.length > 0 && (
                      <div className="custom-asset-detail-field">
                        <label>Parameters:</label>
                        <div className="custom-asset-parameters-list">
                          {selectedAsset.parameters.map((param, index) => (
                            <div key={index} className="custom-asset-parameter">
                              <span className="parameter-name">{param.name}</span>
                              <span className="parameter-type">({param.type})</span>
                              <span className="parameter-default">= {String(param.defaultValue)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="custom-asset-detail-field">
                      <label>Code Preview:</label>
                      <pre className="custom-asset-code-preview">
                        <code>{previewCode}</code>
                      </pre>
                    </div>
                  </div>
                </>
              ) : (
                <div className="custom-asset-detail-empty">
                  Select a custom asset to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomAssetManagementModal;
