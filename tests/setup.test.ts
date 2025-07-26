// テスト環境セットアップの確認テスト

describe('テスト環境セットアップ', () => {
  test('Jest が正常に動作する', () => {
    expect(1 + 1).toBe(2);
  });

  test('TypeScript が正常に動作する', () => {
    const message: string = 'TypeScript test';
    expect(message).toBe('TypeScript test');
  });

  test('Electron API モックが利用可能', () => {
    expect(window.electronAPI).toBeDefined();
    expect(window.electronAPI.project).toBeDefined();
    expect(window.electronAPI.fileSystem).toBeDefined();
    expect(window.electronAPI.assets).toBeDefined();
  });

  test('Jest モック関数が利用可能', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});