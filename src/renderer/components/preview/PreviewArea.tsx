import React, { useRef, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { PanelCollapseRightIcon, FitToViewIcon } from '../icons/PanelIcons';
import './PreviewArea.css';

export const PreviewArea: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const currentPage = useProjectStore((state) => state.ui.currentPage);
  const zoomLevel = useProjectStore((state) => state.ui.zoomLevel);
  const setZoomLevel = useProjectStore((state) => state.setZoomLevel);
  const togglePreview = useProjectStore((state) => state.togglePreview);

  const previewContentRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStartPos, setPanStartPos] = React.useState({ x: 0, y: 0 });
  const [panStartScroll, setPanStartScroll] = React.useState({ x: 0, y: 0 });

  if (!project) return null;

  const canvasWidth = project.canvas.width;
  const canvasHeight = project.canvas.height;

  // パッシブリスナー問題を回避するためuseEffectで直接イベントを設定
  React.useEffect(() => {
    const container = previewContentRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // ⌘キー（macOS）が押されている場合はズーム処理
      if (e.metaKey) {
        const zoomSpeed = 0.1;
        const zoomDirection = e.deltaY > 0 ? -1 : 1; // 上にスクロール = ズームイン
        const newZoomLevel = Math.min(3.0, Math.max(0.1, zoomLevel + (zoomSpeed * zoomDirection)));
        
        setZoomLevel(newZoomLevel);
        return;
      }
      
      // 通常のスクロール処理
      const scrollSpeed = 30;
      const deltaY = e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
      
      // ネイティブスクロール位置を更新
      container.scrollTop += deltaY;
    };

    // マウスパンイベントハンドラー
    const handleMouseDown = (e: MouseEvent) => {
      // 中ボタン（ホイールボタン）の場合のみパン開始
      if (e.button === 1) { // 中ボタン = 1
        e.preventDefault();
        setIsPanning(true);
        setPanStartPos({ x: e.clientX, y: e.clientY });
        setPanStartScroll({ x: container.scrollLeft, y: container.scrollTop });
        document.body.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      
      e.preventDefault();
      const deltaX = e.clientX - panStartPos.x;
      const deltaY = e.clientY - panStartPos.y;
      
      // パン方向を逆にする（ドラッグ方向と逆方向にスクロール）
      const newScrollX = panStartScroll.x - deltaX;
      const newScrollY = panStartScroll.y - deltaY;
      
      // ネイティブスクロール位置を更新
      container.scrollLeft = newScrollX;
      container.scrollTop = newScrollY;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && isPanning) { // 中ボタンを離した場合
        e.preventDefault();
        setIsPanning(false);
        document.body.style.cursor = '';
      }
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      container.removeEventListener('wheel', handleWheelNative);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasWidth, canvasHeight, zoomLevel, isPanning, panStartPos, panStartScroll, setZoomLevel]);

  // 初期スクロール位置を中央に設定
  React.useEffect(() => {
    const container = previewContentRef.current;
    if (!container) return;

    // コンテナとキャンバスの中央位置を計算
    const containerRect = container.getBoundingClientRect();
    const wrapperWidth = Math.max(canvasWidth * zoomLevel + 400, containerRect.width * 2);
    const wrapperHeight = Math.max(canvasHeight * zoomLevel + 400, containerRect.height * 2);
    
    // キャンバスを中央に配置するスクロール位置
    const centerScrollLeft = (wrapperWidth - containerRect.width) / 2;
    const centerScrollTop = (wrapperHeight - containerRect.height) / 2;
    
    container.scrollLeft = centerScrollLeft;
    container.scrollTop = centerScrollTop;
  }, [canvasWidth, canvasHeight, zoomLevel]);

  const pages = project.pages;
  const currentPageData = currentPage 
    ? pages.find(page => page.id === currentPage) 
    : pages[0];

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

  const handleFitToView = () => {
    const container = previewContentRef.current;
    if (!container) return;

    // コンテナのサイズを取得
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // キャンバスサイズに対してコンテナに収まるズームレベルを計算
    const widthRatio = containerWidth / canvasWidth;
    const heightRatio = containerHeight / canvasHeight;
    
    // 両方向に収まる最小の倍率を選択（マージンを考慮して0.9倍）
    const fitZoomLevel = Math.min(widthRatio, heightRatio) * 0.9;
    const clampedZoomLevel = Math.min(3.0, Math.max(0.1, fitZoomLevel));
    
    setZoomLevel(clampedZoomLevel);
    
    // ズーム変更後、キャンバスを中央に配置
    setTimeout(() => {
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const wrapperWidth = Math.max(canvasWidth * clampedZoomLevel + 400, containerRect.width * 2);
      const wrapperHeight = Math.max(canvasHeight * clampedZoomLevel + 400, containerRect.height * 2);
      
      const centerScrollLeft = (wrapperWidth - containerRect.width) / 2;
      const centerScrollTop = (wrapperHeight - containerRect.height) / 2;
      
      container.scrollLeft = centerScrollLeft;
      container.scrollTop = centerScrollTop;
    }, 50);
  };

  return (
    <div className="preview-area">
      <div className="preview-header">
        <div className="header-top">
          <div className="header-left">
            <h3>プレビュー</h3>
          </div>
          <div className="header-right">
            <button 
              className="panel-toggle-btn preview-close-btn"
              onClick={togglePreview}
              title="プレビューウィンドウを閉じる"
            >
              <PanelCollapseRightIcon />
            </button>
          </div>
        </div>
        <div className="preview-controls">
          <div className="controls-left">
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
                className="mode-btn fit-btn"
                onClick={handleFitToView}
                title="キャンバスをプレビュー画面に収める"
              >
                <FitToViewIcon size={14} />
              </button>
            </div>
          </div>
          <div className="page-info">
            <span>Page:{Object.values(project.pages).indexOf(currentPageData) + 1} Assets:{Object.keys(currentPageData.asset_instances).length} {canvasWidth}×{canvasHeight}px</span>
          </div>
        </div>
      </div>

      <div className="preview-content">
        <div 
          className="preview-canvas-container"
          ref={previewContentRef}
        >
          <div 
            className="preview-canvas-wrapper"
            style={{
              width: canvasWidth * zoomLevel + 400,
              height: canvasHeight * zoomLevel + 400,
              minWidth: '200%',
              minHeight: '200%',
            }}
          >
            <div 
              className="preview-canvas"
              style={{
                width: canvasWidth * zoomLevel,
                height: canvasHeight * zoomLevel,
                position: 'relative',
                display: 'inline-block',
              }}
            >
              {/* キャンバス背景 */}
              <div className="canvas-background" />
              
              {/* アセットインスタンスのレンダリング */}
              {Object.values(currentPageData.asset_instances)
                .sort((a: any, b: any) => a.z_index - b.z_index)
                .map((instance: any) => {
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
