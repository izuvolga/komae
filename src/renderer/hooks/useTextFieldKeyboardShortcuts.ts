import { useCallback } from 'react';

/**
 * テキストフィールドでのキーボードショートカット対応フック
 * アプリレベルでキーボードイベントがキャプチャされる問題を回避し、
 * 標準的なテキスト編集ショートカットを有効にする
 */
export const useTextFieldKeyboardShortcuts = () => {
  const handleTextFieldKeyEvent = useCallback((e: React.KeyboardEvent) => {
    // テキスト編集の基本的なショートカットキーの処理
    // macOSではmetaKey (Cmd), WindowsではctrlKeyを使用
    const isModifierPressed = e.ctrlKey || e.metaKey;

    if (isModifierPressed) {
      // MUIのTextFieldの実際の入力要素を取得するヘルパー
      const getInputElement = (): HTMLInputElement | HTMLTextAreaElement | null => {
        const element = e.target as HTMLElement;
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          return element as HTMLInputElement | HTMLTextAreaElement;
        } else {
          // MUIの場合、input要素が内部にネストされている場合がある
          const nestedInput = element.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
          return nestedInput || null;
        }
      };

      // 全選択 (Cmd+A / Ctrl+A)
      if (e.key === 'a') {
        e.preventDefault();
        e.stopPropagation();

        const inputElement = getInputElement();
        if (inputElement && inputElement.select) {
          inputElement.select();
        }
        return;
      }

      // Undo (Cmd+Z / Ctrl+Z)
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        const inputElement = getInputElement();
        if (inputElement) {
          // Electronの場合、webContentsのundoを試行
          if (window.electronAPI && 'undo' in window.electronAPI && typeof window.electronAPI.undo === 'function') {
            console.log('Calling electronAPI.undo()');
            window.electronAPI.undo();
          } else {
            // フォールバック: フォーカスされた要素でのundo処理を試行
            console.log('Calling document.execCommand("undo") as fallback');
            inputElement.focus();
            setTimeout(() => {
              if (document.execCommand) {
                document.execCommand('undo');
              }
            }, 0);
          }
        }
        return;
      }

      // Redo (Cmd+Shift+Z / Ctrl+Y)
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        e.stopPropagation();

        const inputElement = getInputElement();
        if (inputElement) {
          // Electronの場合、webContentsのredoを試行
          if (window.electronAPI && 'redo' in window.electronAPI && typeof window.electronAPI.redo === 'function') {
            window.electronAPI.redo();
          } else {
            // フォールバック: フォーカスされた要素でのredo処理を試行
            inputElement.focus();
            setTimeout(() => {
              if (document.execCommand) {
                document.execCommand('redo');
              }
            }, 0);
          }
        }
        return;
      }

      // その他のテキスト編集ショートカット (Copy, Paste, Cut)
      const isOtherTextEditingShortcut = (
        e.key === 'c' ||  // Copy
        e.key === 'v' ||  // Paste
        e.key === 'x'     // Cut
      );

      if (isOtherTextEditingShortcut) {
        // イベントの伝播のみ停止（preventDefaultは呼ばずブラウザの標準動作に任せる）
        e.stopPropagation();
      }
    }
  }, []);

  return { handleTextFieldKeyEvent };
};