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
    { key: 'showFeatureSlot', label: 'showFeatureSlot' },
    { key: 'showHotVote', label: 'showHotVote' },
    { key: 'showHotTrendingWeb3', label: 'showHotTrendingWeb3' },
    { key: 'showHotTrendingAi', label: 'showHotTrendingAi' },
    { key: 'showHunterCampaign', label: 'showHunterCampaign' },
    { key: 'showNotes', label: 'showNotes' },
    { key: 'showOfficialTags', label: 'showOfficialTags' },
    { key: 'showRealtimeSubscription', label: 'showRealtimeSubscription' },
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
    { key: 'showEditInfo', label: 'showEditInfo' },
    { key: 'showDiscussion', label: 'showDiscussion' },
    { key: 'showKolAbilityModel', label: 'showKolAbilityModel' },
    { key: 'showSoulIndex', label: 'showSoulIndex' },
    { key: 'showNarrative', label: 'showNarrative' },
  ],
  followedRight: [
    { key: 'showFqRank', label: 'showFqRank' },
    { key: 'showCnRank', label: 'showCnRank' },
    { key: 'showEnInfluenceRank', label: 'showEnInfluenceRank' },
    { key: 'showProjectRank', label: 'showProjectRank' },
    { key: 'showFqRankAi', label: 'showFqRankAi' },
    { key: 'showCnRankAi', label: 'showCnRankAi' },
    { key: 'showEnInfluenceRankAi', label: 'showEnInfluenceRankAi' },
    { key: 'showProjectRankAi', label: 'showProjectRankAi' },
    { key: 'showReviews', label: 'showReviews' },
    { key: 'showGhostFollowing', label: 'showGhostFollowing' },
    {
      key: 'showKolSocialCircleButton',
      label: 'showKolSocialCircleButton',
    },
    { key: 'showAiAvatarButton', label: 'showAiAvatarButton' },
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
  'showFeatureSlot',
  'showHotVote',
  'showHotVote',
  'showHotTrendingWeb3',
  'showReplyAlpha',
  'showReplyAlphaCn_web3',
  'showReplyAlphaGlobal_web3',
  'showReplyAlphaCn_ai',
  'showReplyAlphaGlobal_ai',
  'showHotTrendingAi',
  'showHunterCampaign',
  'showNotes',
  'showOfficialTags',
  'showRealtimeSubscription',
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
  'showEditInfo',
  'showDiscussion',
  'showKolAbilityModel',
  'showSoulIndex',
  'showNarrative',
  'showWeb3KolFollowers',
  'showAiKolFollowers',
  'showTop100KolsWeb3',
  'showTop100KolsAi',
  'showCnKolsWeb3',
  'showCnKolsAi',
  'showFqRank',
  'showCnRank',
  'showEnInfluenceRank',
  'showProjectRank',
  'showFqRankAi',
  'showCnRankAi',
  'showEnInfluenceRankAi',
  'showProjectRankAi',
  'showReviews',
  'showGhostFollowing',
  'showKolSocialCircleButton',
  'showApiAccess', // API Access 板块（隐藏设置，不在 UI 显示开关）
  'showAiDetectButton',
  'showAiAvatarButton',
  'showAiAvatarButton_official',
  'showAiAvatarButton_unofficial',
] as const;

const DEFAULT_SETTING_VALUES: Partial<
  Record<(typeof ALL_SETTING_KEYS)[number], boolean>
> = {
  showRealtimeSubscription: false,
};

const getDefaultSettingValue = (key: string): boolean =>
  DEFAULT_SETTING_VALUES[key as (typeof ALL_SETTING_KEYS)[number]] ?? true;

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
  'showHotVote',
  'showHotTrendingWeb3',
  'showHotTrendingAi',
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
  'showWeb3KolFollowers',
  'showAiKolFollowers',
  'showTop100KolsWeb3',
  'showTop100KolsAi',
  'showCnKolsWeb3',
  'showCnKolsAi',
  'showFqRank',
  'showCnRank',
  'showEnInfluenceRank',
  'showProjectRank',
  'showFqRankAi',
  'showCnRankAi',
  'showEnInfluenceRankAi',
  'showProjectRankAi',
  'showReviews',
  'showGhostFollowing',
  'showKolSocialCircleButton',
  'showAiDetectButton',
  'showAiAvatarButton',
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
        this.settings.set(
          key,
          typeof value === 'boolean' ? value : getDefaultSettingValue(key),
        );
      } catch (error) {
        console.log(`Failed to load setting ${key}:`, error);
        this.settings.set(key, getDefaultSettingValue(key));
      }
    }
  }

  public isEnabled(settingKey: string): boolean {
    return this.settings.get(settingKey) ?? getDefaultSettingValue(settingKey);
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
        newSettings.set(
          key,
          typeof value === 'boolean' ? value : getDefaultSettingValue(key),
        );
      } catch (error) {
        console.log(`Failed to load setting ${key}:`, error);
        newSettings.set(key, getDefaultSettingValue(key));
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
    return settings.get(key) ?? getDefaultSettingValue(key);
  };

  // 初始化加载
  useEffect(() => {
    loadAllSettings();
  }, []);

  // 生成设置状态映射
  const settingStates = getAllSettingKeys().reduce(
    (acc, key) => {
      acc[key] = {
        get: getSetting(key),
        set: (value: boolean) => updateSetting(key, value),
      };
      return acc;
    },
    {} as Record<string, { get: boolean; set: (value: boolean) => void }>,
  );

  return { settingStates, isLoading };
};

// 响应式设置Hook - 监听设置变更事件
// (useReactiveSettings removed; use useCrossPageSettings instead)

// 跨页面设置同步Hook - 用于popup和content script之间的通信
interface CrossPageSettingsSnapshot {
  settings: Map<string, boolean>;
  currentUsername: string;
  disableTesting: boolean;
}

const crossPageSettingsSubscribers = new Set<() => void>();
let crossPageSettingsSnapshot: CrossPageSettingsSnapshot = {
  settings: new Map(),
  currentUsername: '',
  disableTesting: false,
};
let crossPageSettingsStarted = false;
let crossPageSettingsInitPromise: Promise<void> | null = null;

const emitCrossPageSettingsChange = () => {
  crossPageSettingsSubscribers.forEach((callback) => callback());
};

const setCrossPageSettingsSnapshot = (
  next:
    | CrossPageSettingsSnapshot
    | ((prev: CrossPageSettingsSnapshot) => CrossPageSettingsSnapshot),
) => {
  crossPageSettingsSnapshot =
    typeof next === 'function' ? next(crossPageSettingsSnapshot) : next;
  emitCrossPageSettingsChange();
};

const loadCrossPageCurrentUser = async (): Promise<string> => {
  try {
    const initial: any = await localStorageInstance.get(
      '@xhunt/initial-state-current-user',
    );
    const fallback = (await localStorageInstance.get(
      '@xhunt/current-username',
    )) as string;
    const uname =
      sanitizeUsername(initial?.screen_name) ||
      sanitizeUsername(fallback) ||
      '';

    let nextDisableTesting = false;
    try {
      const key = `@settings/disableTesting/${uname || '_'}`;
      const v = await localStorageInstance.get(key);
      nextDisableTesting = Boolean(v);
    } catch {}

    setCrossPageSettingsSnapshot((prev) => ({
      ...prev,
      currentUsername: uname,
      disableTesting: nextDisableTesting,
    }));
    return uname;
  } catch {
    setCrossPageSettingsSnapshot((prev) => ({
      ...prev,
      currentUsername: '',
      disableTesting: false,
    }));
    return '';
  }
};

const loadCrossPageSettings = async () => {
  const entries = await Promise.all(
    ALL_SETTING_KEYS.map(async (key) => {
      try {
        const value = await localStorageInstance.get(`@settings/${key}`);
        return [
          key,
          typeof value === 'boolean' ? value : getDefaultSettingValue(key),
        ] as const;
      } catch (error) {
        console.log(`Failed to load setting ${key}:`, error);
        return [key, getDefaultSettingValue(key)] as const;
      }
    }),
  );

  setCrossPageSettingsSnapshot((prev) => ({
    ...prev,
    settings: new Map(entries),
  }));
};

const startCrossPageSettingsStore = () => {
  if (crossPageSettingsInitPromise) return crossPageSettingsInitPromise;

  crossPageSettingsInitPromise = (async () => {
    await loadCrossPageSettings();
    await loadCrossPageCurrentUser();

    if (crossPageSettingsStarted) return;
    crossPageSettingsStarted = true;

    const handleStorageChange = ALL_SETTING_KEYS.reduce(
      (acc, key) => {
        acc[`@settings/${key}`] = () => {
          void loadCrossPageSettings();
        };
        return acc;
      },
      {} as Record<string, () => void>,
    );

    localStorageInstance.watch({
      ...handleStorageChange,
      '@xhunt/initial-state-current-user': () => {
        void loadCrossPageCurrentUser();
      },
      '@xhunt/current-username': () => {
        void loadCrossPageCurrentUser();
      },
    });

    eventManager.on(
      'settingChanged',
      async (data: { key: string; value: boolean }) => {
        if (data.key === 'disableTesting') {
          await loadCrossPageCurrentUser();
          return;
        }

        setCrossPageSettingsSnapshot((prev) => {
          const nextSettings = new Map(prev.settings);
          nextSettings.set(data.key, data.value);
          return {
            ...prev,
            settings: nextSettings,
          };
        });
      },
    );
  })();

  return crossPageSettingsInitPromise;
};

export const useCrossPageSettings = () => {
  const [snapshot, setSnapshot] = useState<CrossPageSettingsSnapshot>(
    crossPageSettingsSnapshot,
  );

  useEffect(() => {
    const handleChange = () => setSnapshot(crossPageSettingsSnapshot);
    crossPageSettingsSubscribers.add(handleChange);
    void startCrossPageSettingsStore();
    handleChange();

    return () => {
      crossPageSettingsSubscribers.delete(handleChange);
    };
  }, []);

  const { settings, currentUsername, disableTesting } = snapshot;

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
        typeof u === 'string' ? u.toLowerCase() : u,
      );
      const uname =
        typeof currentUsername === 'string'
          ? currentUsername.toLowerCase()
          : '';
      // 如果功能在 flexibleTesting 中，直接展示给用户
      if (uname && allowedUsers.includes(uname)) {
        return settings.get(settingKey) ?? getDefaultSettingValue(settingKey);
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

    return settings.get(settingKey) ?? getDefaultSettingValue(settingKey);
  };

  const isTesterFor = (settingKey: string): boolean => {
    const { testConfig } = configManager.getConfig(); //只和testConfig有关，与flexibleTesting和canaryConfig无关
    /** 没加载出来配置，并且不在基础feature里面的功能一律不展示 */
    if (!testConfig && !BASE_SETTING_KEYS.includes(settingKey)) {
      return false;
    }
    const features = testConfig?.features || [];
    const testers = (testConfig?.testers || []).map((u: string) =>
      typeof u === 'string' ? u.toLowerCase() : u,
    );
    if (!features.includes(settingKey)) return false;
    const uname =
      typeof currentUsername === 'string' ? currentUsername.toLowerCase() : '';
    const isTester = uname ? testers.includes(uname) : false;
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
      typeof u === 'string' ? u.toLowerCase() : u,
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
      typeof u === 'string' ? u.toLowerCase() : u,
    );
    const uname =
      typeof currentUsername === 'string' ? currentUsername.toLowerCase() : '';
    return uname ? canaries.includes(uname) : false;
  })();

  // Whether current user is in testers list (ignores disableTesting)
  const isTesterOnly = (() => {
    const { testConfig } = configManager.getConfig();
    const testers = (testConfig?.testers || []).map((u: string) =>
      typeof u === 'string' ? u.toLowerCase() : u,
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
    setCrossPageSettingsSnapshot((prev) => ({
      ...prev,
      disableTesting: value,
    }));
    try {
      const key = `@settings/disableTesting/${currentUsername || '_'}`;
      await localStorageInstance.set(key, value);
      // 通知其他实例同步该开关
      eventManager.emit('settingChanged', { key: 'disableTesting', value });
    } catch {}
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
