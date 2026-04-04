// src/contents/hooks/useRealtimeSettings.ts

import { useState, useCallback, useEffect } from 'react';
import { localStorageInstance } from '~storage/index.ts';

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
  listing: {
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
  listing: {
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
    try {
      const saved = (await localStorageInstance.get(
        SETTINGS_STORAGE_KEY
      )) as RealtimeSettings | null;
      return saved || DEFAULT_SETTINGS;
    } catch (error) {
      return DEFAULT_SETTINGS;
    }
  }, []);

  // 保存设置
  const saveSettings = useCallback(
    async (newSettings: RealtimeSettings): Promise<void> => {
      try {
        await localStorageInstance.set(SETTINGS_STORAGE_KEY, newSettings);
      } catch {}
    },
    []
  );

  // 更新设置
  const updateSettings = useCallback(
    async (
      tab: 'bnb' | 'gossip' | 'listing',
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
        console.log('[useRealtimeSettings] Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [readSettings]);

  // 监听 storage 变化以同步设置
  useEffect(() => {
    const handler = async () => {
      try {
        const saved = (await localStorageInstance.get(
          SETTINGS_STORAGE_KEY
        )) as RealtimeSettings | null;
        if (saved) setSettings(saved);
      } catch {}
    };
    localStorageInstance.watch({ [SETTINGS_STORAGE_KEY]: handler });
    return () => {
      localStorageInstance.unwatch({ [SETTINGS_STORAGE_KEY]: handler });
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
