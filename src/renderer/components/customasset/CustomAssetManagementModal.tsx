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
import { Close as CloseIcon } from '@mui/icons-material';
import { useTheme } from '../../../theme/ThemeContext';

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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 3,
        }}
      >
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mb: 3,
              pt: 3,
              flexShrink: 0,
            }}
          >
            {mode === 'management' ? (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddAsset}
                  disabled={isLoading}
                >
                  Add Custom Asset
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteAsset}
                  disabled={isLoading || !selectedAssetId}
                >
                  Delete Selected
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateDynamicSVG}
                disabled={isLoading || !selectedAssetId}
              >
                このCustomAssetでDynamic SVGを作成
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Custom Assets ({customAssets.length})</Typography>
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
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
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
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Added: {formatDate(asset.addedAt)}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {selectedAsset ? (
                <>
                  <Typography variant="h6" sx={{ mb: 2 }}>Asset Details</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Name:</Typography>
                      <Typography variant="body2">{selectedAsset.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Type:</Typography>
                      <Typography variant="body2">{selectedAsset.type}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Version:</Typography>
                      <Typography variant="body2">{selectedAsset.version}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Author:</Typography>
                      <Typography variant="body2">{selectedAsset.author}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>Description:</Typography>
                      <Typography variant="body2">{selectedAsset.description}</Typography>
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
                              borderRadius: 1
                            }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{param.name}</Typography>
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
                        bgcolor: 'grey.100',
                        border: '1px solid',
                        borderColor: 'grey.300',
                        borderRadius: 1,
                        p: 2,
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        overflow: 'auto',
                        maxHeight: '300px'
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
    </Dialog>
  );
};

export default CustomAssetManagementModal;
