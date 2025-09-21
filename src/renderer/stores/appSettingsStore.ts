import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AppSettings } from '../../main/services/AppSettingsManager';

interface AppSettingsState {
  // State
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  immer((set, get) => ({
    // Initial state
    settings: null,
    isLoading: false,
    error: null,

    // Actions
    loadSettings: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const settings = await window.electronAPI.appSettings.load();
        set((state) => {
          state.settings = settings;
          state.isLoading = false;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        set((state) => {
          state.error = errorMessage;
          state.isLoading = false;
        });
        console.error('Failed to load app settings:', error);
      }
    },

    updateSettings: async (updates: Partial<AppSettings>) => {
      const { settings } = get();
      if (!settings) {
        throw new Error('Settings not loaded');
      }

      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const updatedSettings = { ...settings, ...updates };
        await window.electronAPI.appSettings.save(updatedSettings);
        set((state) => {
          state.settings = updatedSettings;
          state.isLoading = false;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        set((state) => {
          state.error = errorMessage;
          state.isLoading = false;
        });
        console.error('Failed to update app settings:', error);
        throw error;
      }
    },

    updateSetting: async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const { updateSettings } = get();
      await updateSettings({ [key]: value } as Partial<AppSettings>);
    },

    resetSettings: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        await window.electronAPI.appSettings.reset();
        // リセット後に設定を再読み込み
        const settings = await window.electronAPI.appSettings.load();
        set((state) => {
          state.settings = settings;
          state.isLoading = false;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        set((state) => {
          state.error = errorMessage;
          state.isLoading = false;
        });
        console.error('Failed to reset app settings:', error);
        throw error;
      }
    },

    setLoading: (loading: boolean) => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    setError: (error: string | null) => {
      set((state) => {
        state.error = error;
      });
    },
  }))
);

// 便利なセレクター関数
export const getSkipWelcomeScreen = () => {
  const settings = useAppSettingsStore.getState().settings;
  return settings?.skipWelcomeScreen ?? false;
};

export const getSettingsLoadingState = () => {
  const { isLoading, error } = useAppSettingsStore.getState();
  return { isLoading, error };
};