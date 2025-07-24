import React from 'react';
import { useProjectStore } from '../../stores/projectStore';
import './PreviewArea.css';

export const PreviewArea: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const currentPage = useProjectStore((state) => state.ui.currentPage);
  const previewMode = useProjectStore((state) => state.ui.previewMode);
  const zoomLevel = useProjectStore((state) => state.ui.zoomLevel);
  const setPreviewMode = useProjectStore((state) => state.setPreviewMode);
  const setZoomLevel = useProjectStore((state) => state.setZoomLevel);

  if (!project) return null;

  const pages = Object.values(project.pages);
  const currentPageData = currentPage ? project.pages[currentPage] : pages[0];

  if (!currentPageData) {
    return (
      <div className="preview-area">
        <div className="preview-header">
          <h3>プレビュー</h3>
        </div>
        <div className="preview-empty">
          <p>プレビューするページがありません</p>
        </div>
      </div>
    );
  }

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoomLevel(parseFloat(e.target.value));
  };

  const handleModeChange = (mode: typeof previewMode) => {
    setPreviewMode(mode);
  };

  const canvasWidth = project.canvas.width;
  const canvasHeight = project.canvas.height;

  return (
    <div className="preview-area">
      <div className="preview-header">
        <h3>プレビュー</h3>
        <div className="preview-controls">
          <div className="zoom-control">
            <label>倍率:</label>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={zoomLevel}
              onChange={handleZoomChange}
              className="zoom-slider"
            />
            <span className="zoom-value">{Math.round(zoomLevel * 100)}%</span>
          </div>
          <div className="mode-control">
            <button
              className={`mode-btn ${previewMode === 'fit' ? 'active' : ''}`}
              onClick={() => handleModeChange('fit')}
              title="フィット表示"
            >
              フィット
            </button>
            <button
              className={`mode-btn ${previewMode === 'actual' ? 'active' : ''}`}
              onClick={() => handleModeChange('actual')}
              title="実際のサイズ"
            >
              実寸
            </button>
          </div>
        </div>
      </div>

      <div className="preview-content">
        <div className="preview-canvas-container">
          <div 
            className="preview-canvas"
            style={{
              width: canvasWidth * zoomLevel,
              height: canvasHeight * zoomLevel,
            }}
          >
            {/* キャンバス背景 */}
            <div className="canvas-background" />
            
            {/* アセットインスタンスのレンダリング */}
            {Object.values(currentPageData.asset_instances)
              .sort((a, b) => a.z_index - b.z_index)
              .map((instance) => {
                const asset = project.assets[instance.asset_id];
                if (!asset) return null;

                return (
                  <PreviewAssetInstance
                    key={instance.id}
                    instance={instance}
                    asset={asset}
                    zoomLevel={zoomLevel}
                  />
                );
              })}
          </div>
        </div>

        {/* ページ情報 */}
        <div className="preview-info">
          <div className="info-item">
            <label>ページ:</label>
            <span>{currentPageData.title}</span>
          </div>
          <div className="info-item">
            <label>キャンバス:</label>
            <span>{canvasWidth} × {canvasHeight}px</span>
          </div>
          <div className="info-item">
            <label>アセット数:</label>
            <span>{Object.keys(currentPageData.asset_instances).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PreviewAssetInstanceProps {
  instance: any;
  asset: any;
  zoomLevel: number;
}

const PreviewAssetInstance: React.FC<PreviewAssetInstanceProps> = ({
  instance,
  asset,
  zoomLevel,
}) => {
  const transform = instance.transform || {};
  const scaleX = transform.scale_x || 1;
  const scaleY = transform.scale_y || 1;
  const rotation = transform.rotation || 0;
  const opacity = instance.opacity || 1;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: (asset.default_pos_x || 0) * zoomLevel,
    top: (asset.default_pos_y || 0) * zoomLevel,
    transform: `scale(${scaleX * zoomLevel}, ${scaleY * zoomLevel}) rotate(${rotation}deg)`,
    opacity,
    zIndex: instance.z_index,
  };

  return (
    <div className="preview-asset-instance" style={style}>
      {asset.type === 'ImageAsset' ? (
        <div className="preview-image-placeholder">
          <span>IMG</span>
          <div className="asset-name">{asset.name}</div>
        </div>
      ) : (
        <div className="preview-text-placeholder">
          <span>{asset.default_text || 'TEXT'}</span>
          <div className="asset-name">{asset.name}</div>
        </div>
      )}
    </div>
  );
};