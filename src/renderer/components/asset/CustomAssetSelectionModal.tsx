import React, { useState, useEffect } from 'react';
import './CustomAssetSelectionModal.css';

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

interface CustomAssetSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customAsset: CustomAssetInfo) => void;
}

const CustomAssetSelectionModal: React.FC<CustomAssetSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [customAssets, setCustomAssets] = useState<CustomAssetInfo[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
  };

  const handleConfirm = () => {
    if (selectedAssetId) {
      const selectedAsset = customAssets.find(a => a.id === selectedAssetId);
      if (selectedAsset) {
        onSelect(selectedAsset);
      }
    }
  };

  const handleCancel = () => {
    setSelectedAssetId(null);
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) {
    return null;
  }

  const selectedAsset = customAssets.find(a => a.id === selectedAssetId);

  return (
    <div className="custom-asset-selection-modal-overlay" onClick={handleCancel}>
      <div className="custom-asset-selection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="custom-asset-selection-header">
          <h2>CustomAssetを選択</h2>
          <button
            className="custom-asset-selection-close"
            onClick={handleCancel}
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="custom-asset-selection-content">
          <div className="custom-asset-selection-main">
            <div className="custom-asset-selection-list-section">
              <h3>利用可能なCustomAssets ({customAssets.length})</h3>
              {isLoading ? (
                <div className="custom-asset-selection-loading">読み込み中...</div>
              ) : customAssets.length === 0 ? (
                <div className="custom-asset-selection-empty">
                  CustomAssetが見つかりません。
                  <br />
                  先にCustomAsset Management画面でCustomAssetをインポートしてください。
                </div>
              ) : (
                <div className="custom-asset-selection-list">
                  {customAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`custom-asset-selection-item ${selectedAssetId === asset.id ? 'selected' : ''}`}
                      onClick={() => handleAssetSelect(asset.id)}
                    >
                      <div className="custom-asset-selection-item-header">
                        <span className="custom-asset-selection-name">{asset.name}</span>
                        <span className="custom-asset-selection-version">v{asset.version}</span>
                      </div>
                      <div className="custom-asset-selection-author">by {asset.author}</div>
                      <div className="custom-asset-selection-description">{asset.description}</div>
                      <div className="custom-asset-selection-parameters">
                        {asset.parameters.length > 0 ? (
                          <span>{asset.parameters.length}個のパラメータ</span>
                        ) : (
                          <span>パラメータなし</span>
                        )}
                      </div>
                      <div className="custom-asset-selection-added-at">追加日: {formatDate(asset.addedAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="custom-asset-selection-detail-section">
              {selectedAsset ? (
                <>
                  <h3>選択中のCustomAsset</h3>
                  <div className="custom-asset-selection-detail">
                    <div className="custom-asset-selection-detail-field">
                      <label>名前:</label>
                      <span>{selectedAsset.name}</span>
                    </div>
                    <div className="custom-asset-selection-detail-field">
                      <label>タイプ:</label>
                      <span>{selectedAsset.type}</span>
                    </div>
                    <div className="custom-asset-selection-detail-field">
                      <label>バージョン:</label>
                      <span>{selectedAsset.version}</span>
                    </div>
                    <div className="custom-asset-selection-detail-field">
                      <label>作者:</label>
                      <span>{selectedAsset.author}</span>
                    </div>
                    <div className="custom-asset-selection-detail-field">
                      <label>説明:</label>
                      <span>{selectedAsset.description}</span>
                    </div>

                    {selectedAsset.parameters.length > 0 && (
                      <div className="custom-asset-selection-detail-field">
                        <label>パラメータ:</label>
                        <div className="custom-asset-selection-parameters-list">
                          {selectedAsset.parameters.map((param, index) => (
                            <div key={index} className="custom-asset-selection-parameter">
                              <span className="parameter-name">{param.name}</span>
                              <span className="parameter-type">({param.type})</span>
                              <span className="parameter-default">= {String(param.defaultValue)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="custom-asset-selection-detail-empty">
                  CustomAssetを選択してください
                </div>
              )}
            </div>
          </div>

          <div className="custom-asset-selection-footer">
            <button
              className="custom-asset-selection-cancel"
              onClick={handleCancel}
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              className="custom-asset-selection-confirm"
              onClick={handleConfirm}
              disabled={isLoading || !selectedAssetId}
            >
              このCustomAssetでDynamic SVGを作成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomAssetSelectionModal;
