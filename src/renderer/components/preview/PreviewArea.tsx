import React, { useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Slider,
  Button,
  Divider,
  Stack,
  Tooltip,
  Chip,
  useTheme as useMuiTheme
} from '@mui/material';
import { Remove as ZoomInIcon, Add as ZoomOutIcon } from '@mui/icons-material';
import { useProjectStore } from '../../stores/projectStore';
import { useTheme } from '../../../theme/ThemeContext';
import { PanelCollapseRightIcon, FitToViewIcon } from '../icons/PanelIcons';
import { PagePreview } from './PagePreview';

export const PreviewArea: React.FC = () => {
  const { mode } = useTheme();
  const muiTheme = useMuiTheme();
  const project = useProjectStore((state) => state.project);
  const currentPage = useProjectStore((state) => state.ui.currentPage);
  const cursor = useProjectStore((state) => state.ui.cursor);
  const zoomLevel = useProjectStore((state) => state.ui.zoomLevel);
  const canvasFit = useProjectStore((state) => state.ui.canvasFit);
  const setZoomLevel = useProjectStore((state) => state.setZoomLevel);
  const setCanvasFit = useProjectStore((state) => state.setCanvasFit);
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
      
      // ⌘キーまたはctrlKey（ピンチズーム）が押されている場合はズーム処理
      if (e.metaKey || e.ctrlKey) {
        const zoomSpeed = 0.1;
        const zoomDirection = e.deltaY > 0 ? -1 : 1; // 上にスクロール = ズームイン
        const newZoomLevel = Math.min(3.0, Math.max(0.1, zoomLevel + (zoomSpeed * zoomDirection)));
        
        setZoomLevel(newZoomLevel);
        return;
      }
      
      // 通常のスクロール処理（縦・横両方対応）
      const scrollSpeed = 10;
      
      // 横スクロール処理（Magic Padの二本指横スワイプ）
      if (Math.abs(e.deltaX) > 0) {
        const deltaX = e.deltaX > 0 ? scrollSpeed : -scrollSpeed;
        container.scrollLeft += deltaX;
      }
      
      // 縦スクロール処理
      if (Math.abs(e.deltaY) > 0) {
        const deltaY = e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
        container.scrollTop += deltaY;
      }
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

  // キャンバスフィット機能（旧自動ズーム機能）
  React.useEffect(() => {
    if (!canvasFit) return;
    
    const container = previewContentRef.current;
    if (!container) return;
    
    const handleResize = () => {
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
    };
    
    // 初期計算
    handleResize();
    
    // リサイズ監視
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasFit, canvasWidth, canvasHeight, setZoomLevel]);

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
  // カーソルがある行（ページ）のプレビューを表示。カーソルがない場合は現在のページ、それもない場合は最初のページ
  const targetPageId = cursor.visible && cursor.pageId ? cursor.pageId : currentPage;
  const currentPageData = targetPageId
    ? pages.find(page => page.id === targetPageId)
    : pages[0];

  if (!currentPageData) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary'
          }}
        >
          <Typography variant="body2">
            プレビューするページがありません
          </Typography>
        </Box>
      </Box>
    );
  }

  const handleCanvasFitButtonClick = () => {
    setCanvasFit(!canvasFit);
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%'}}>
      {/* Header */}
      <Paper
        sx={{
          p: 0,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.default'
        }}
      >
        {/* Top Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} mt={1} spacing={1}>
          {/* Left Side Controls */}
          <Stack direction="row" alignItems="center" pl={2} spacing={0}>
            {/* Canvas Fit Button */}
            <Tooltip title="キャンバスをプレビュー画面に収める">
              <Button
                variant={canvasFit ? "contained" : "outlined"}
                size="small"
                onClick={handleCanvasFitButtonClick}
                sx={{
                  minWidth: 'auto',
                  width: 24,
                  height: 24,
                  p: 0,
                  color: canvasFit ? 'primary.contrastText' : 'text.primary'
                }}
              >
                <FitToViewIcon size={16} />
              </Button>
            </Tooltip>

            {/* Zoom Controls */}
            {!canvasFit && (
              <Stack direction="row" alignItems="center" pl={2} spacing={1}>
                <ZoomInIcon sx={{ fontSize: 16 }} />
                <Slider
                  value={zoomLevel}
                  onChange={(_, value) => setZoomLevel(value as number)}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  sx={{ width: 80 }}
                  size="small"
                />
                <ZoomOutIcon sx={{ fontSize: 16 }} />
                <Typography
                  variant="caption"
                  color="text.primary"
                  fontWeight={500}
                  sx={{ minWidth: 35, textAlign: 'right' }}
                >
                  {Math.round(zoomLevel * 100)}%
                </Typography>
              </Stack>
            )}

          </Stack>

          {/* Right Side Controls */}
          <Stack direction="row" alignItems="center" pr={2} spacing={1}>
            {/* Close Button */}
            <Tooltip title="プレビューウィンドウを閉じる">
              <IconButton
                size="small"
                onClick={togglePreview}
                sx={{
                  height: 28,
                  color: 'text.secondary'
                }}
              >
                <PanelCollapseRightIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Page Info */}
        <Stack direction="row" spacing={1} sx={{ p: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Page ${Object.values(project.pages).indexOf(currentPageData) + 1}`}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 20,
              backgroundColor: 'primary.50',
              borderColor: 'primary.200',
              color: 'primary.700'
            }}
          />
          <Chip
            label={`${Object.keys(currentPageData.asset_instances).length} Assets`}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 20,
              backgroundColor: 'success.50',
              borderColor: 'success.200',
              color: 'success.700'
            }}
          />
          <Chip
            label={`${canvasWidth}×${canvasHeight}px`}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.75rem',
              height: 20,
              backgroundColor: 'grey.50',
              borderColor: 'grey.300',
              color: 'grey.700'
            }}
          />
        </Stack>
      </Paper>

      {/* Preview Content */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Box
          ref={previewContentRef}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'background.default',
            backgroundImage: `
              linear-gradient(45deg, var(--canvas-grid-color) 25%, transparent 25%),
              linear-gradient(-45deg, var(--canvas-grid-color) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, var(--canvas-grid-color) 75%),
              linear-gradient(-45deg, transparent 75%, var(--canvas-grid-color) 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            overflow: 'auto'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: canvasWidth * zoomLevel + 400,
              height: canvasHeight * zoomLevel + 400,
              minWidth: '200%',
              minHeight: '200%',
              p: '50px',
              boxSizing: 'border-box'
            }}
          >
            <Box
              sx={{
                width: canvasWidth * zoomLevel,
                height: canvasHeight * zoomLevel,
                position: 'relative',
                display: 'inline-block',
                backgroundColor: project.canvas.backgroundColor || '#ffffff',
                border: 1,
                borderColor: 'grey.300',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}
            >
              {/* Canvas Background */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: project.canvas.backgroundColor || '#ffffff'
                }}
              />

              {/* SVG-based Page Preview */}
              <PagePreview
                project={project}
                page={currentPageData}
                zoomLevel={zoomLevel}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

