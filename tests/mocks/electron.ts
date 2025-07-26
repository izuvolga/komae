// Electron API モック

export const electronAPI = {
  project: {
    create: jest.fn(),
    load: jest.fn(), 
    save: jest.fn(),
  },
  fileSystem: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
  },
  assets: {
    import: jest.fn(),
  },
};

export default electronAPI;