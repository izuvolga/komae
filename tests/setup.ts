// Jest テストセットアップファイル

// TextDecoder/TextEncoder ポリフィル（Node.js環境用）
if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
}

// Electron API モックの設定
Object.defineProperty(window, 'electronAPI', {
  value: {
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
  },
  writable: true,
});

// DOM環境の追加設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});