import { useCallback, useEffect, useState } from 'react';

import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { localStorageInstance } from '~storage/index.ts';
import {
  getCurrentTwitterId,
  sanitizeUsername,
} from '~contents/utils/helpers.ts';
import {
  fetchFeatureAccess,
  type FeatureAccessResponse,
} from '~contents/services/api.ts';
import {
  isSettingForcedDisabled,
  REALTIME_SUBSCRIPTION_SETTING_KEY,
} from '~shared/runtimeFeaturePolicy';

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
    {
      key: REALTIME_SUBSCRIPTION_SETTING_KEY,
      label: REALTIME_SUBSCRIPTION_SETTING_KEY,
    },
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
  REALTIME_SUBSCRIPTION_SETTING_KEY,
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
  [REALTIME_SUBSCRIPTION_SETTING_KEY]: false,
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
    if (isSettingForcedDisabled(settingKey)) return false;
    return this.settings.get(settingKey) ?? getDefaultSettingValue(settingKey);
  }

  public async updateSetting(settingKey: string, value: boolean) {
    if (isSettingForcedDisabled(settingKey)) return;
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
    if (isSettingForcedDisabled(key)) return;
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
    if (isSettingForcedDisabled(key)) return false;
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
  featureAccess: FeatureAccessResponse | null;
  featureAccessLoaded: boolean;
}

const crossPageSettingsSubscribers = new Set<() => void>();
let crossPageSettingsSnapshot: CrossPageSettingsSnapshot = {
  settings: new Map(),
  currentUsername: '',
  disableTesting: false,
  featureAccess: null,
  featureAccessLoaded: false,
};
let crossPageSettingsStarted = false;
let crossPageSettingsInitPromise: Promise<void> | null = null;
let featureAccessRequestId = 0;
let featureAccessLoadedIdentity = '';
let featureAccessInFlight: {
  identity: string;
  requestId: number;
  promise: Promise<FeatureAccessResponse | undefined>;
} | null = null;
let identityAccessRefreshTimer: ReturnType<typeof setTimeout> | null = null;

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

// 权限身份可能已经变化。在新身份的 feature-access 明确返回前，
// 立即退回基础功能，不能继续使用游客或上一账号的高级功能权限。
const markFeatureAccessPending = (invalidateInFlight = false) => {
  if (invalidateInFlight) featureAccessRequestId += 1;
  featureAccessLoadedIdentity = '';
  setCrossPageSettingsSnapshot((prev) => ({
    ...prev,
    featureAccess: null,
    featureAccessLoaded: false,
  }));
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

const loadCrossPageFeatureAccess = async (cacheBust?: number) => {
  const requestedTwitterId = await getCurrentTwitterId();
  const requestedIdentity = [
    requestedTwitterId,
    crossPageSettingsSnapshot.currentUsername.toLowerCase(),
  ].join(':');
  const forceRefresh = typeof cacheBust === 'number';

  // 老版 X 初始化会连续写入当前用户的两个 storage key。它们可以同时触发
  // feature-access 刷新；同一登录身份已有结果或请求在途时直接复用。
  if (
    !forceRefresh &&
    crossPageSettingsSnapshot.featureAccessLoaded &&
    featureAccessLoadedIdentity === requestedIdentity
  ) {
    return;
  }
  if (
    !forceRefresh &&
    featureAccessInFlight?.identity === requestedIdentity &&
    featureAccessInFlight.requestId === featureAccessRequestId
  ) {
    await featureAccessInFlight.promise;
    return;
  }

  const requestId = ++featureAccessRequestId;

  markFeatureAccessPending();

  const request = fetchFeatureAccess(cacheBust);
  featureAccessInFlight = {
    identity: requestedIdentity,
    requestId,
    promise: request,
  };
  let access: FeatureAccessResponse | undefined;
  try {
    access = await request;
  } finally {
    if (featureAccessInFlight?.promise === request) {
      featureAccessInFlight = null;
    }
  }
  const currentTwitterId = await getCurrentTwitterId();
  if (
    requestId !== featureAccessRequestId ||
    currentTwitterId !== requestedTwitterId ||
    (access && access.twitterId !== requestedTwitterId)
  ) {
    return;
  }

  featureAccessLoadedIdentity = requestedIdentity;
  setCrossPageSettingsSnapshot((prev) => ({
    ...prev,
    featureAccess: access || null,
    featureAccessLoaded: true,
  }));
};

const refreshCrossPageCurrentUserAccess = async () => {
  await loadCrossPageCurrentUser();
  await loadCrossPageFeatureAccess();
};

const getStoredUserAccessIdentity = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '';
  const user = value as { id_str?: unknown; screen_name?: unknown };
  return [
    String(user.id_str || '').trim(),
    sanitizeUsername(String(user.screen_name || '')).toLowerCase(),
  ].join(':');
};

// initial-state-current-user 和 current-username 通常会在同一轮初始化中连续写入。
// 先立即收紧权限，再把刷新合并到一个任务，避免两个 watcher 互相废弃在途请求。
const scheduleCurrentUserAccessRefresh = () => {
  markFeatureAccessPending(true);
  if (identityAccessRefreshTimer) {
    clearTimeout(identityAccessRefreshTimer);
  }
  identityAccessRefreshTimer = setTimeout(() => {
    identityAccessRefreshTimer = null;
    void refreshCrossPageCurrentUserAccess();
  }, 50);
};

const startCrossPageSettingsStore = () => {
  if (crossPageSettingsInitPromise) return crossPageSettingsInitPromise;

  crossPageSettingsInitPromise = (async () => {
    // 身份可能在初始化请求期间写入，因此监听必须先就位；监听触发时会立即
    // 清空旧权限，新身份的 feature-access 返回前始终只开放基础功能。
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
      '@xhunt/initial-state-current-user': (change: {
        oldValue?: unknown;
        newValue?: unknown;
      }) => {
        if (
          getStoredUserAccessIdentity(change.oldValue) ===
          getStoredUserAccessIdentity(change.newValue)
        ) {
          return;
        }
        scheduleCurrentUserAccessRefresh();
      },
      '@xhunt/current-username': (change: {
        oldValue?: unknown;
        newValue?: unknown;
      }) => {
        if (
          sanitizeUsername(String(change.oldValue || '')).toLowerCase() ===
          sanitizeUsername(String(change.newValue || '')).toLowerCase()
        ) {
          return;
        }
        scheduleCurrentUserAccessRefresh();
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

    await loadCrossPageSettings();
    await refreshCrossPageCurrentUserAccess();
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

  const {
    settings,
    currentUsername,
    disableTesting,
    featureAccess,
    featureAccessLoaded,
  } = snapshot;

  const isAvailable = useCallback(
    (settingKey: string): boolean => {
      const isBaseFeature = BASE_SETTING_KEYS.includes(settingKey);
      if (!featureAccessLoaded || !featureAccess) return isBaseFeature;
      if (
        !featureAccess.features ||
        typeof featureAccess.features !== 'object'
      ) {
        return isBaseFeature;
      }
      if (
        !Object.prototype.hasOwnProperty.call(
          featureAccess.features,
          settingKey,
        )
      ) {
        // features 只包含受限制功能；缺少 key 表示该功能不受限制。
        return true;
      }
      return featureAccess.features[settingKey] === true;
    },
    [featureAccess, featureAccessLoaded],
  );

  const isEnabled = useCallback(
    (settingKey: string): boolean => {
      if (isSettingForcedDisabled(settingKey)) return false;
      if (!isAvailable(settingKey)) return false;
      return settings.get(settingKey) ?? getDefaultSettingValue(settingKey);
    },
    [isAvailable, settings],
  );

  const isTesterFor = useCallback(
    (settingKey: string): boolean =>
      featureAccess?.entitlements.internalTest === true &&
      isAvailable(settingKey),
    [featureAccess?.entitlements.internalTest, isAvailable],
  );

  const isCanaryFor = useCallback(
    (settingKey: string): boolean =>
      featureAccess?.entitlements.canary === true && isAvailable(settingKey),
    [featureAccess?.entitlements.canary, isAvailable],
  );

  const isCanaryUser = featureAccess?.entitlements.canary === true;

  const isTesterOnly = featureAccess?.entitlements.internalTest === true;

  // Comma-joined testers list string for UI display
  const testersListStr = '-';

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
    isAvailable,
    settings,
    isTesterFor,
    isCanaryFor,
    isCanaryUser,
    disableTesting,
    setDisableTesting: updateDisableTesting,
    isTesterOnly,
    testersListStr,
    refreshFeatureAccess: loadCrossPageFeatureAccess,
  };
};
