import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { localStorageInstance } from '~storage/index.ts';
import { configManager } from '~utils/configManager.ts';
import { useState, useEffect } from 'react';
import { sanitizeUsername } from '~contents/utils/helpers.ts';

// 设置配置
export const settingsConfig = {
  basic: [
    // { key: 'showPanel', label: 'showAnalytics' },
    { key: 'showSidebarIcon', label: 'showSidebarIcon' },
    { key: 'showAvatarRank', label: 'showAvatarRank' },
    { key: 'showTokenAnalysis', label: 'showTokenAnalysis' },
    { key: 'showTweetAIAnalysis', label: 'showTweetAIAnalysis' },
    { key: 'showSearchPanel', label: 'showProfileChanges' },
    { key: 'showAnnualReport', label: 'showAnnualReport' },
    { key: 'showAdBanner', label: 'showAdBanner' },
    { key: 'showHotTrending', label: 'showHotTrending' },
    { key: 'showHunterCampaign', label: 'showHunterCampaign' },
    { key: 'showNotes', label: 'showNotes' },
    { key: 'showOfficialTags', label: 'showOfficialTags' },
    { key: 'showRealtimeSubscription', label: 'showRealtimeSubscription' },
    { key: 'showEngageToEarn', label: 'showEngageToEarn' },
    { key: 'enableBnbFeeds', label: 'enableBnbFeeds' },
    { key: 'enableGossip', label: 'enableGossip' },
    { key: 'enableListing', label: 'enableListing' },
    { key: 'showArticleBottomRightArea', label: 'showArticleBottomRightArea' },
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
    { key: 'showGhostFollowing', label: 'showGhostFollowing' },
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
  'showAnnualReport',
  'showAdBanner',
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
  'showArticleBottomRightArea',
  'showKolFollowers',
  'showTop100Kols',
  'showCnKols',
  'showFqRank',
  'showCnRank',
  'showEnInfluenceRank',
  'showProjectRank',
  'showReviews',
  'showGhostFollowing',
  'showApiAccess', // API Access 板块（隐藏设置，不在 UI 显示开关）
] as const;

/**。定义基础功能，即便config没有加载出来，
 * 不清楚当前用户是不是测试用户，也能看到的一些功能
 * 之后不要轻易修改!!
 */
const BASE_SETTING_KEYS: string[] = [
  'showPanel',
  'showSidebarIcon',
  'showAvatarRank',
  'showTokenAnalysis',
  'showTweetAIAnalysis',
  'showSearchPanel',
  'showHotTrending',
  'showNotes',
  'showOfficialTags',
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
  'showGhostFollowing',
];

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
// (useReactiveSettings removed; use useCrossPageSettings instead)

// 跨页面设置同步Hook - 用于popup和content script之间的通信
export const useCrossPageSettings = () => {
  const [settings, setSettings] = useState<Map<string, boolean>>(new Map());
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [disableTesting, setDisableTesting] = useState<boolean>(false);

  useEffect(() => {
    // 从存储加载当前用户名并同步其专属的 disableTesting
    const loadCurrentUser = async (): Promise<string> => {
      try {
        const initial: any = await localStorageInstance.get(
          '@xhunt/initial-state-current-user'
        );
        const fallback = (await localStorageInstance.get(
          '@xhunt/current-username'
        )) as string;
        const uname =
          sanitizeUsername(initial?.screen_name) ||
          sanitizeUsername(fallback) ||
          '';
        setCurrentUsername(uname);
        try {
          const key = `@settings/disableTesting/${uname || '_'}`;
          const v = await localStorageInstance.get(key);
          setDisableTesting(Boolean(v));
        } catch { }
        return uname;
      } catch {
        setCurrentUsername('');
        setDisableTesting(false);
        return '';
      }
    };

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
    // 监听用户名变更（仅当初始未获取到用户名时注册）
    let handleUserChange: Record<string, () => void> = {};

    // 监听自定义事件（同页面内同步）
    const handleSettingChange = (data: { key: string; value: boolean }) => {
      setSettings((prev) => {
        const newSettings = new Map(prev);
        newSettings.set(data.key, data.value);
        return newSettings;
      });
      // 若是与 disableTesting 相关的事件，重新同步一次用户与其开关
      if (data.key === 'disableTesting') {
        // 不依赖现有用户名，直接从存储读取，确保首次用户名到达后也会生效
        (async () => {
          try {
            const initial: any = await localStorageInstance.get(
              '@xhunt/initial-state-current-user'
            );
            const fallback = (await localStorageInstance.get(
              '@xhunt/current-username'
            )) as string;
            const uname =
              sanitizeUsername(initial?.screen_name) ||
              sanitizeUsername(fallback) ||
              '';
            setCurrentUsername(uname);
            const key = `@settings/disableTesting/${uname || '_'}`;
            const v = await localStorageInstance.get(key);
            setDisableTesting(Boolean(v));
          } catch {
            setCurrentUsername('');
            setDisableTesting(false);
          }
        })();
      }
    };

    // 初始加载并按需注册监听
    (async () => {
      await loadSettings();
      const uname = await loadCurrentUser();
      handleUserChange = !uname
        ? {
          '@xhunt/initial-state-current-user': () => loadCurrentUser(),
          '@xhunt/current-username': () => loadCurrentUser(),
        }
        : {};
      localStorageInstance.watch({
        ...handleStorageChange,
        ...handleUserChange,
      });
      eventManager.on('settingChanged', handleSettingChange);
    })();

    // 清理函数
    return () => {
      localStorageInstance.unwatch({
        ...handleStorageChange,
        ...handleUserChange,
      });
      eventManager.off('settingChanged', handleSettingChange);
    };
  }, []);

  const isEnabled = (settingKey: string): boolean => {
    const cfg: any = configManager.getConfig();

    /** 没加载出来配置，并且不在基础feature里面的功能一律不展示 */
    if (
      (!cfg ||
        !cfg?.testConfig ||
        !cfg?.canaryConfig ||
        !cfg?.flexibleTesting) &&
      !BASE_SETTING_KEYS.includes(settingKey)
    ) {
      return false;
    }
    const { flexibleTesting } = cfg;
    // 优先检查 flexibleTesting（优先级最高）
    if (flexibleTesting && flexibleTesting[settingKey]) {
      const allowedUsers = flexibleTesting[settingKey].map((u: string) =>
        typeof u === 'string' ? u.toLowerCase() : u
      );
      const uname =
        typeof currentUsername === 'string'
          ? currentUsername.toLowerCase()
          : '';
      // 如果功能在 flexibleTesting 中，直接展示给用户
      if (uname && allowedUsers.includes(uname)) {
        return settings.get(settingKey) ?? true;
      }
      return false; // 用户没在列表中，不展示给用户
    }

    const testFeatures = cfg?.testConfig?.features || [];
    if (testFeatures.includes(settingKey) && !isTesterFor(settingKey)) {
      return false;
    }

    const canaryFeatures = cfg?.canaryConfig?.features || [];
    if (canaryFeatures.includes(settingKey) && !isCanaryFor(settingKey)) {
      return false;
    }

    return settings.get(settingKey) ?? true;
  };

  const isTesterFor = (settingKey: string): boolean => {
    const { testConfig } = configManager.getConfig(); //只和testConfig有关，与flexibleTesting和canaryConfig无关
    /** 没加载出来配置，并且不在基础feature里面的功能一律不展示 */
    if (!testConfig && !BASE_SETTING_KEYS.includes(settingKey)) {
      return false;
    }
    const features = testConfig?.features || [];
    const testers = (testConfig?.testers || []).map((u: string) =>
      typeof u === 'string' ? u.toLowerCase() : u
    );
    if (!features.includes(settingKey)) return false;
    const uname =
      typeof currentUsername === 'string' ? currentUsername.toLowerCase() : '';
    const isTester = uname ? testers.includes(uname) && !disableTesting : false;
    return isTester;
  };

  const isCanaryFor = (settingKey: string): boolean => {
    const cfg: any = configManager.getConfig(); //只和canaryConfig有关，与testConfig和flexibleTesting无关
    /** 没加载出来配置，并且不在基础feature里面的功能一律不展示 */
    if (!cfg && !BASE_SETTING_KEYS.includes(settingKey)) {
      return false;
    }
    const features = cfg?.canaryConfig?.features || [];
    const canaries = (cfg?.canaryConfig?.canaries || []).map((u: string) =>
      typeof u === 'string' ? u.toLowerCase() : u
    );
    if (!features.includes(settingKey)) return false;
    const uname =
      typeof currentUsername === 'string' ? currentUsername.toLowerCase() : '';
    const isCanary = uname ? canaries.includes(uname) : false;
    return isCanary;
  };

  // Whether current user is in canaries list
  const isCanaryUser = (() => {
    const cfg: any = configManager.getConfig();
    const canaries = (cfg?.canaryConfig?.canaries || []).map((u: string) =>
      typeof u === 'string' ? u.toLowerCase() : u
    );
    const uname =
      typeof currentUsername === 'string' ? currentUsername.toLowerCase() : '';
    return uname ? canaries.includes(uname) : false;
  })();

  // Whether current user is in testers list (ignores disableTesting)
  const isTesterOnly = (() => {
    const { testConfig } = configManager.getConfig();
    const testers = (testConfig?.testers || []).map((u: string) =>
      typeof u === 'string' ? u.toLowerCase() : u
    );
    const uname =
      typeof currentUsername === 'string' ? currentUsername.toLowerCase() : '';
    return uname ? testers.includes(uname) : false;
  })();

  // Comma-joined testers list string for UI display
  const testersListStr = (() => {
    const { testConfig } = configManager.getConfig();
    const testers = testConfig?.testers || [];
    return testers.length ? testers.join(', ') : '-';
  })();

  const updateDisableTesting = async (value: boolean) => {
    setDisableTesting(value);
    try {
      const key = `@settings/disableTesting/${currentUsername || '_'}`;
      await localStorageInstance.set(key, value);
      // 通知其他实例同步该开关
      eventManager.emit('settingChanged', { key: 'disableTesting', value });
    } catch { }
  };

  return {
    isEnabled,
    settings,
    isTesterFor,
    isCanaryFor,
    isCanaryUser,
    disableTesting,
    setDisableTesting: updateDisableTesting,
    isTesterOnly,
    testersListStr,
  };
};
