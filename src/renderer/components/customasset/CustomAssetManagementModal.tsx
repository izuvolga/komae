import React, { useState, useEffect } from 'react';
import * as crypto from 'crypto';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import { useTheme } from '../../../theme/ThemeContext';
import { CustomAssetInfo } from '../../../main/services/CustomAssetManager';
import {
  Close as CloseIcon,
  Warning,
  AddPhotoAlternate,
  Delete,
  Add
} from '@mui/icons-material';

interface CustomAssetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'management' | 'selection';
  onCreateAsset?: (customAsset: CustomAssetInfo) => void;
}

const CustomAssetManagementModal: React.FC<CustomAssetManagementModalProps> = ({
  isOpen,
  onClose,
  mode = 'management',
  onCreateAsset,
}) => {
  const { mode: themeMode } = useTheme();
  const [customAssets, setCustomAssets] = useState<CustomAssetInfo[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState<string>('');
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const [svgError, setSvgError] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // data-theme属性の設定
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

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

    const asset = customAssets.find(a => a.id === assetId);
    if (asset) {
      generatePreview(asset);
    }
  };

  const handleCreateDynamicSVG = () => {
    if (selectedAssetId && onCreateAsset) {
      const selectedAsset = customAssets.find(a => a.id === selectedAssetId);
      if (selectedAsset) {
        onCreateAsset(selectedAsset);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const generatePreview = async (asset: CustomAssetInfo) => {
    try {
      setIsGeneratingPreview(true);
      setSvgError(null);
      setSvgPreview(null);

      // デフォルトパラメータを準備
      const defaultParams: Record<string, any> = {};
      asset.parameters.forEach(param => {
        defaultParams[param.name] = param.defaultValue;
      });

      // 既存のCustomAssetManager APIを使用してSVGを生成
      const svgContent = await window.electronAPI.customAsset.generateSVG(
        asset.id,
        defaultParams
      );

      if (svgContent && typeof svgContent === 'string') {
        // Wrap in <svg>
        const svg = `<svg width="100%" height="100%" viewBox="0 0 ${asset.width} ${asset.height}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
        setSvgPreview(svg);
      } else {
        setSvgError('CustomAssetからSVGコンテンツを生成できませんでした');
      }
    } catch (error) {
      setSvgError(error instanceof Error ? error.message : 'プレビューの生成でエラーが発生しました');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const selectedAsset = customAssets.find(a => a.id === selectedAssetId);

  return (
    <Dialog
      open={isOpen}
      onClose={isLoading ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          width: '90vw',
          maxWidth: '1000px',
          height: '80vh',
          maxHeight: '800px',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pr: 1,
        }}
      >
        {mode === 'management' ? 'Custom Asset Management' : 'CustomAssetを選択'}
        <IconButton
          onClick={onClose}
          disabled={isLoading}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          mt: 3,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 3,
        }}
      >

          <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Typography variant="h6" sx={{ mb: 2, flexShrink: 0 }}>Custom Assets ({customAssets.length})</Typography>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                  <Typography variant="body2" color="text.secondary">Loading...</Typography>
                </Box>
              ) : customAssets.length === 0 ? (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 4,
                  textAlign: 'center',
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}>
                  <Typography variant="body2">
                    No custom assets found. Click "Add Custom Asset" to import your first asset.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                  {customAssets.map((asset) => (
                    <Box
                      key={asset.id}
                      onClick={() => handleAssetSelect(asset.id)}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: selectedAssetId === asset.id ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                        bgcolor: selectedAssetId === asset.id ? 'action.selected' : 'background.paper',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{asset.name}</Typography>
                        <Typography variant="caption" sx={{
                          bgcolor: 'action.hover',
                          color: 'text.primary',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider'
                        }}>v{asset.version}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>by {asset.author}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', mb: 1 }}>{asset.description}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {asset.parameters.length > 0 ?
                            `${asset.parameters.length} parameters` :
                            'No parameters'
                          }
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{asset.width}x{asset.height}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Added: {formatDate(asset.addedAt)}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {selectedAsset ? (
                <>
                  <Typography variant="h6" sx={{ mb: 2, flexShrink: 0 }}>Asset Details</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto', pr: 1 }}>

                    {/* Preview Section */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Preview:</Typography>
                      <Box sx={{
                        bgcolor: 'action.hover',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 2,
                        minHeight: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isGeneratingPreview ? (
                          <Typography variant="body2" color="text.secondary">Generating preview...</Typography>
                        ) : svgError ? (
                          <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                            color: 'error.main'
                          }}>
                            <Typography variant="h4"><Warning /></Typography>
                            <Typography variant="body2" textAlign="center">{svgError}</Typography>
                          </Box>
                        ) : svgPreview ? (
                          <Box sx={{
                            width: '100%',
                            height: '200px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              dangerouslySetInnerHTML={{ __html: svgPreview }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">No preview available</Typography>
                        )}
                      </Box>
                    </Box>

                    {selectedAsset.parameters.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Parameters:</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {selectedAsset.parameters.map((param, index) => (
                            <Box key={index} sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1,
                              bgcolor: 'action.hover',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider'
                            }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>{param.name}</Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>({param.type})</Typography>
                              <Typography variant="body2" sx={{ color: 'primary.main' }}>= {String(param.defaultValue)}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Code Preview:</Typography>
                      <Box sx={{
                        bgcolor: 'action.hover',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 2,
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        overflow: 'auto'
                      }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          <code>{previewCode}</code>
                        </pre>
                      </Box>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}>
                  <Typography variant="body2">
                    Select a custom asset to view details
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
      </DialogContent>
      <DialogActions>
        {mode === 'management' ? (
          <>
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddAsset}
              disabled={isLoading}
            >
              <Add />
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteAsset}
              disabled={isLoading || !selectedAssetId}
            >
              <Delete />
            </Button>
          </>
        ) : (
          <Button
            sx={{ mr: 'auto' }}
            variant="contained"
            color="primary"
            onClick={handleCreateDynamicSVG}
            disabled={isLoading || !selectedAssetId}
          >
            <AddPhotoAlternate />
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CustomAssetManagementModal;
