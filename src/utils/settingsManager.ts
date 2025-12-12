import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { localStorageInstance } from '~storage/index.ts';
import { configManager } from '~utils/configManager.ts';
import { useState, useEffect } from 'react';
import { getCurrentUsername } from '~contents/utils/helpers.ts';

// 设置配置
export const settingsConfig = {
  basic: [
    // { key: 'showPanel', label: 'showAnalytics' },
    { key: 'showSidebarIcon', label: 'showSidebarIcon' },
    { key: 'showAvatarRank', label: 'showAvatarRank' },
    { key: 'showTokenAnalysis', label: 'showTokenAnalysis' },
    { key: 'showTweetAIAnalysis', label: 'showTweetAIAnalysis' },
    { key: 'showSearchPanel', label: 'showProfileChanges' },
    { key: 'showHotTrending', label: 'showHotTrending' },
    { key: 'showHunterCampaign', label: 'showHunterCampaign' },
    { key: 'showNotes', label: 'showNotes' },
    { key: 'showOfficialTags', label: 'showOfficialTags' },
    { key: 'showRealtimeSubscription', label: 'showRealtimeSubscription' },
    { key: 'showEngageToEarn', label: 'showEngageToEarn' },
    { key: 'enableBnbFeeds', label: 'enableBnbFeeds' },
    { key: 'enableGossip', label: 'enableGossip' },
    { key: 'enableListing', label: 'enableListing' },
  ],
  nameRight: [
    { key: 'showProjectMembers', label: 'showProjectMembers' },
    { key: 'showInvestors', label: 'showInvestors' },
    { key: 'showPortfolio', label: 'showPortfolio' },
    { key: 'show90dMention', label: 'show90dMention' },
    { key: 'show90dPerformance', label: 'show90dPerformance' },
    { key: 'showPersonalityType', label: 'showPersonalityType' },
    { key: 'showRenameInfo', label: 'showRenameInfo' },
    { key: 'showDelInfo', label: 'showDelInfo' },
    { key: 'showDiscussion', label: 'showDiscussion' },
    { key: 'showKolAbilityModel', label: 'showKolAbilityModel' },
    { key: 'showSoulIndex', label: 'showSoulIndex' },
    { key: 'showNarrative', label: 'showNarrative' },
  ],
  followedRight: [
    { key: 'showKolFollowers', label: 'showKolFollowers' },
    { key: 'showTop100Kols', label: 'showTop100Kols' },
    { key: 'showCnKols', label: 'showCnKols' },
    { key: 'showFqRank', label: 'showFqRank' },
    { key: 'showCnRank', label: 'showCnRank' },
    { key: 'showEnInfluenceRank', label: 'showEnInfluenceRank' },
    { key: 'showProjectRank', label: 'showProjectRank' },
    { key: 'showReviews', label: 'showReviews' },
  ],
};

// 所有设置键的统一列表
const ALL_SETTING_KEYS = [
  'showPanel',
  'showSidebarIcon',
  'showAvatarRank',
  'showTokenAnalysis',
  'showTweetAIAnalysis',
  'showSearchPanel',
  'showHotTrending',
  'showHunterCampaign',
  'showNotes',
  'showOfficialTags',
  'showRealtimeSubscription',
  'showEngageToEarn',
  'enableBnbFeeds',
  'enableGossip',
  'enableListing',
  'showProjectMembers',
  'showInvestors',
  'showPortfolio',
  'show90dMention',
  'show90dPerformance',
  'showPersonalityType',
  'showRenameInfo',
  'showDelInfo',
  'showDiscussion',
  'showKolAbilityModel',
  'showSoulIndex',
  'showNarrative',
  'showKolFollowers',
  'showTop100Kols',
  'showCnKols',
  'showFqRank',
  'showCnRank',
  'showEnInfluenceRank',
  'showProjectRank',
  'showReviews',
] as const;

// 事件管理器
class EventManager {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  emit(event: string, data?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => callback(data));
    }
  }
}

const eventManager = new EventManager();

// 设置管理器 - 用于在组件中检查设置状态
export class SettingsManager {
  private static instance: SettingsManager;
  private settings: Map<string, boolean> = new Map();

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private async loadSettings() {
    // 从Plasmo Storage加载所有设置
    for (const key of ALL_SETTING_KEYS) {
      try {
        const value = await localStorageInstance.get(`@settings/${key}`);
        this.settings.set(key, typeof value === 'boolean' ? value : true);
      } catch (error) {
        console.log(`Failed to load setting ${key}:`, error);
        this.settings.set(key, true);
      }
    }
  }

  public isEnabled(settingKey: string): boolean {
    return this.settings.get(settingKey) ?? true;
  }

  public async updateSetting(settingKey: string, value: boolean) {
    this.settings.set(settingKey, value);

    try {
      await localStorageInstance.set(`@settings/${settingKey}`, value);
      // 发出设置变更事件
      eventManager.emit('settingChanged', { key: settingKey, value });
    } catch (error) {
      console.error(`Failed to save setting ${settingKey}:`, error);
    }
  }

  public async refreshSettings() {
    await this.loadSettings();
    // 发出设置刷新事件
    eventManager.emit('settingsRefreshed');
  }
}

// 导出单例实例
export const settingsManager = SettingsManager.getInstance();

// 统一的设置管理Hook - 用于popup
export const useAllSettings = () => {
  const [settings, setSettings] = useState<Map<string, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // 获取所有设置键
  const getAllSettingKeys = () => {
    return ALL_SETTING_KEYS;
  };

  // 加载所有设置
  const loadAllSettings = async () => {
    const newSettings = new Map();
    const keys = getAllSettingKeys();

    for (const key of keys) {
      try {
        const value = await localStorageInstance.get(`@settings/${key}`);
        newSettings.set(key, typeof value === 'boolean' ? value : true);
      } catch (error) {
        console.log(`Failed to load setting ${key}:`, error);
        newSettings.set(key, true);
      }
    }

    setSettings(newSettings);
    setIsLoading(false);
  };

  // 更新单个设置
  const updateSetting = async (key: string, value: boolean) => {
    try {
      await localStorageInstance.set(`@settings/${key}`, value);
      setSettings((prev) => {
        const newSettings = new Map(prev);
        newSettings.set(key, value);
        return newSettings;
      });
      // 通知其他页面设置已变更
      eventManager.emit('settingChanged', { key, value });
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  };

  // 获取设置值
  const getSetting = (key: string): boolean => {
    return settings.get(key) ?? true;
  };

  // 初始化加载
  useEffect(() => {
    loadAllSettings();
  }, []);

  // 生成设置状态映射
  const settingStates = getAllSettingKeys().reduce((acc, key) => {
    acc[key] = {
      get: getSetting(key),
      set: (value: boolean) => updateSetting(key, value),
    };
    return acc;
  }, {} as Record<string, { get: boolean; set: (value: boolean) => void }>);

  return { settingStates, isLoading };
};

// 响应式设置Hook - 监听设置变更事件
export const useReactiveSettings = () => {
  const [settings, setSettings] = useState<Map<string, boolean>>(new Map());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // 初始化设置
    const loadSettings = async () => {
      const newSettings = new Map();

      for (const key of ALL_SETTING_KEYS) {
        try {
          const value = await localStorageInstance.get(`@settings/${key}`);
          newSettings.set(key, value !== null ? value : true);
        } catch (error) {
          console.log(`Failed to load setting ${key}:`, error);
          newSettings.set(key, true);
        }
      }

      setSettings(newSettings);
    };

    // 监听设置变更事件
    const handleSettingChange = (data: { key: string; value: boolean }) => {
      setSettings((prev) => {
        const newSettings = new Map(prev);
        newSettings.set(data.key, data.value);
        return newSettings;
      });
    };

    // 监听设置刷新事件
    const handleSettingsRefresh = () => {
      loadSettings();
    };

    // 初始加载
    loadSettings();

    // 注册事件监听器
    eventManager.on('settingChanged', handleSettingChange);
    eventManager.on('settingsRefreshed', handleSettingsRefresh);

    // 清理函数
    return () => {
      eventManager.off('settingChanged', handleSettingChange);
      eventManager.off('settingsRefreshed', handleSettingsRefresh);
    };
  }, []);

  const isEnabled = (settingKey: string): boolean => {
    return settings.get(settingKey) ?? true;
  };

  return { isEnabled, settings };
};

// 跨页面设置同步Hook - 用于popup和content script之间的通信
export const useCrossPageSettings = () => {
  const [settings, setSettings] = useState<Map<string, boolean>>(new Map());
  const [currentUsername, setCurrentUsername] = useState<string>('');

  useEffect(() => {
    // 初始化当前用户名
    getCurrentUsername()
      .then((name) => setCurrentUsername(name || ''))
      .catch(() => setCurrentUsername(''));

    const loadSettings = async () => {
      const newSettings = new Map();

      for (const key of ALL_SETTING_KEYS) {
        try {
          const value = await localStorageInstance.get(`@settings/${key}`);
          newSettings.set(key, value !== null ? value : true);
        } catch (error) {
          console.log(`Failed to load setting ${key}:`, error);
          newSettings.set(key, true);
        }
      }

      setSettings(newSettings);
    };

    // 监听Plasmo Storage变更事件
    const handleStorageChange = ALL_SETTING_KEYS.reduce((acc, key) => {
      acc[`@settings/${key}`] = () => loadSettings();
      return acc;
    }, {} as Record<string, () => void>);

    // 监听自定义事件（同页面内同步）
    const handleSettingChange = (data: { key: string; value: boolean }) => {
      setSettings((prev) => {
        const newSettings = new Map(prev);
        newSettings.set(data.key, data.value);
        return newSettings;
      });
      getCurrentUsername()
        .then((name) => setCurrentUsername(name || ''))
        .catch(() => setCurrentUsername(''));
    };

    // 初始加载
    loadSettings();

    // 注册Plasmo Storage监听器
    localStorageInstance.watch(handleStorageChange);
    eventManager.on('settingChanged', handleSettingChange);

    // 清理函数
    return () => {
      localStorageInstance.unwatch(handleStorageChange);
      eventManager.off('settingChanged', handleSettingChange);
    };
  }, []);

  const isEnabled = (settingKey: string): boolean => {
    const { testConfig } = configManager.getConfig();
    const features = testConfig?.features || [];
    const testers = testConfig?.testers || [];
    if (features.includes(settingKey)) {
      const isTester = currentUsername
        ? testers.includes(currentUsername)
        : false;
      if (!isTester) return false;
    }

    return settings.get(settingKey) ?? true;
  };

  return { isEnabled, settings };
};
