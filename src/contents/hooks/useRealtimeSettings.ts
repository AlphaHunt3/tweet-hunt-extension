// src/contents/hooks/useRealtimeSettings.ts

import { useState, useCallback, useEffect } from 'react';

const SETTINGS_STORAGE_KEY = 'xhunt:realtime_settings';

export interface RealtimeSettings {
  bnb: {
    showNotification: boolean;
    playSound: boolean;
  };
  gossip: {
    showNotification: boolean;
    playSound: boolean;
  };
}

const DEFAULT_SETTINGS: RealtimeSettings = {
  bnb: {
    showNotification: false,
    playSound: false,
  },
  gossip: {
    showNotification: false,
    playSound: false,
  },
};

/**
 * 实时订阅设置管理 Hook
 */
export function useRealtimeSettings() {
  const [settings, setSettings] = useState<RealtimeSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 读取设置
  const readSettings = useCallback(async (): Promise<RealtimeSettings> => {
    return new Promise((resolve) => {
      try {
        (chrome as any).storage?.local?.get(
          [SETTINGS_STORAGE_KEY],
          (res: any) => {
            const savedSettings = res?.[SETTINGS_STORAGE_KEY];
            if (savedSettings) {
              resolve(savedSettings);
            } else {
              resolve(DEFAULT_SETTINGS);
            }
          }
        );
      } catch (error) {
        resolve(DEFAULT_SETTINGS);
      }
    });
  }, []);

  // 保存设置
  const saveSettings = useCallback(
    async (newSettings: RealtimeSettings): Promise<void> => {
      return new Promise((resolve) => {
        try {
          (chrome as any).storage?.local?.set(
            { [SETTINGS_STORAGE_KEY]: newSettings },
            () => {
              resolve();
            }
          );
        } catch (error) {
          resolve();
        }
      });
    },
    []
  );

  // 更新设置
  const updateSettings = useCallback(
    async (
      tab: 'bnb' | 'gossip',
      key: 'showNotification' | 'playSound',
      value: boolean
    ) => {
      const newSettings = {
        ...settings,
        [tab]: {
          ...settings[tab],
          [key]: value,
        },
      };

      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [settings, saveSettings]
  );

  // 重置设置为默认值
  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    await saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  // 初始化设置
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const savedSettings = await readSettings();
        setSettings(savedSettings);
      } catch (error) {
        console.warn('[useRealtimeSettings] Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [readSettings]);

  // 监听 storage 变化以同步设置
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: any }) => {
      if (changes[SETTINGS_STORAGE_KEY]?.newValue) {
        setSettings(changes[SETTINGS_STORAGE_KEY].newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
    saveSettings,
  };
}
