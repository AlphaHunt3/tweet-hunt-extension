import {
  getMantleHunterStats,
  getMantleLeaderboard,
  getMantleRegistrationMe,
  getHotTweets,
  postMantleRegister,
  getHunterCampaignRegistration,
  postHunterCampaignRegister,
  getHunterCampaignStats,
  getHunterCampaignLeaderboard,
} from '~contents/services/api.ts';
import { nacosCacheManager } from '~utils/nacosCacheManager';
import { HunterCampaignConfig } from './types';
import { isUserUsingChinese } from '~contents/utils';
import { localStorageInstance } from '~storage/index.ts';
import { getCurrentUsername } from '~contents/utils/helpers.ts';

export const getActiveCampaignForUser = (
  userId: string
): HunterCampaignConfig | null => {
  return null;
};

/**
 * 从 Twitter URL 中提取 handle
 * 例如: https://x.com/0xMantleCN -> 0xmantlecn
 */
const extractHandleFromUrl = (url: string): string | null => {
  try {
    const match = url.match(/x\.com\/([^/?]+)/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  } catch {}
  return null;
};

/**
 * 任务验证映射：从 Twitter handle 到 { campaignKey, taskId }
 * 用于统一的任务验证逻辑，确保所有活动的任务都能被正确识别
 */
export const taskVerificationMap: Record<
  string,
  { campaignKey: string; taskId: string }[]
> = {};

// Readiness state for taskVerificationMap
let _taskMapReady = false;
let _ensureReadyPromise: Promise<void> | null = null;

export const isTaskMapReady = (): boolean => _taskMapReady;

export const ensureTaskMapReady = async (): Promise<void> => {
  if (_taskMapReady) return;
  if (_ensureReadyPromise) return _ensureReadyPromise;
  _ensureReadyPromise = (async () => {
    try {
      if (Object.keys(taskVerificationMap).length === 0) {
        await getActiveHunterCampaignsAsync();
      }
      _taskMapReady = Object.keys(taskVerificationMap).length > 0;
    } finally {
      _ensureReadyPromise = null;
    }
  })();
  return _ensureReadyPromise;
};

const buildHandleMapFrom = (list: HunterCampaignConfig[]) => {
  const map: Record<string, { campaignKey: string; taskId: string }[]> = {};
  list.forEach((config) => {
    (config.tasks || [])
      .filter((task) => task.type === 'twitter')
      .forEach((task) => {
        const handle = extractHandleFromUrl(task.url);
        if (handle) {
          if (!map[handle]) map[handle] = [];
          map[handle].push({
            campaignKey: config.campaignKey,
            taskId: task.id,
          });
        }
      });
  });
  Object.keys(taskVerificationMap).forEach(
    (k) => delete (taskVerificationMap as any)[k]
  );
  Object.entries(map).forEach(
    ([k, v]) => ((taskVerificationMap as any)[k] = v)
  );
  _taskMapReady = Object.keys(taskVerificationMap).length > 0;
};

/**
 * 根据 handle 查找对应的任务信息
 * @param handle Twitter handle (不区分大小写)
 * @returns { campaignKey, taskId } 或 null
 */
export const getTaskInfoByHandle = (
  handle: string
): { campaignKey: string; taskId: string }[] => {
  if (!handle) return [];
  const normalizedHandle = handle.toLowerCase();
  return taskVerificationMap[normalizedHandle] || [];
};

type ServerTask = {
  id: string;
  title: string | { zh?: string; en?: string };
  url: string;
  type: 'twitter' | 'telegram' | 'custom';
  autoComplete?: boolean;
};

type ServerCampaign = {
  id: string;
  campaignKey: string;
  enabled?: boolean;
  enrollmentWindow?: { startAt?: string | null; endAt?: string | null };
  displayName?: { zh?: string; en?: string } | string;
  logos?: {
    image: string;
    url: string;
    label: string;
    ringClassName?: string;
  }[];
  copy?: any;
  tasks?: ServerTask[];
  links?: { guideUrl?: string; activeUrl?: string };
  showExtraComponents?: boolean;
  targetUserIds?: string[];
  hotTweetsKey?: string;
  testingPhase?: boolean;
  testList?: string[];
  // 富文本风险提示弹框字段（支持中英文对象或字符串）
  riskConfirmHtml?: string | { zh?: string; en?: string };
  // 兼容中文键名
  [key: string]: any;
};

type ServerResponse = { version?: number; campaigns: ServerCampaign[] };

const CAMPAIGN_CACHE_TTL = 5 * 60 * 1000;

type Lang = 'zh' | 'en';

const getCurrentLangAsync = async (): Promise<Lang> => {
  try {
    const v = await localStorageInstance.get('@settings/language1');
    if (v === 'zh' || v === 'en') return v as Lang;
  } catch {}
  return isUserUsingChinese() ? 'zh' : 'en';
};

const chooseDisplayName = (
  dn: ServerCampaign['displayName'],
  lang: Lang
): string => {
  if (!dn) return '';
  if (typeof dn === 'string') return dn;
  return lang === 'zh' ? dn.zh || dn.en || '' : dn.en || dn.zh || '';
};

const chooseTaskTitle = (t: ServerTask['title'], lang: Lang): string => {
  if (typeof t === 'string') return t;
  return lang === 'zh'
    ? (t && (t.zh || t.en)) || ''
    : (t && (t.en || t.zh)) || '';
};

const transformServerCampaign = (
  c: ServerCampaign,
  lang: Lang
): HunterCampaignConfig => {
  const displayName = chooseDisplayName(c.displayName, lang) || c.campaignKey;
  const logos = c.logos || [];
  const tasks = (c.tasks || []).map((t) => ({
    id: t.id,
    title: chooseTaskTitle(t.title, lang),
    url: t.url,
    type: t.type,
    autoComplete: t.autoComplete,
  }));
  const campaignKey = c.campaignKey;

  const resolveText = (v: any): string => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return lang === 'zh' ? v.zh || v.en || '' : v.en || v.zh || '';
  };

  const links = {
    shouldShow: () => Boolean(c.enabled),
    getGuideUrl: () => c.links?.guideUrl || '',
    getActiveUrl: () => c.links?.activeUrl || '',
  };

  const api =
    campaignKey === 'mantle2'
      ? {
          fetchRegistration: (userId: string) =>
            getMantleRegistrationMe(userId),
          submitRegistration: (payload: {
            invitedByCode?: string | null;
            evmAddress?: string | null;
            registrationUrl?: string | null;
          }) => postMantleRegister(payload),
          fetchStats: () => getMantleHunterStats(),
          fetchLeaderboard: () => getMantleLeaderboard(),
          fetchHotTweets: () => getHotTweets('mantle2'),
        }
      : {
          fetchRegistration: (userId: string) =>
            getHunterCampaignRegistration(campaignKey, userId),
          submitRegistration: (payload: {
            invitedByCode?: string | null;
            evmAddress?: string | null;
            registrationUrl?: string | null;
          }) => postHunterCampaignRegister(campaignKey, payload),
          fetchStats: () => getHunterCampaignStats(campaignKey),
          fetchLeaderboard: () => getHunterCampaignLeaderboard(campaignKey),
          fetchHotTweets: () => getHotTweets(c.hotTweetsKey || campaignKey),
        };

  return {
    id: c.id,
    campaignKey,
    displayName,
    taskStorageKey: `@xhunt/${campaignKey}Tasks`,
    expandedStorageKey: `@xhunt/${campaignKey}Expanded`,
    logos,
    tasks,
    links,
    api,
    copy: c.copy
      ? {
          shortTitleText: resolveText((c.copy as any).shortTitle),
          activityTitleText: resolveText((c.copy as any).title),
          emoji: (c.copy as any).emoji,
        }
      : undefined,
    showExtraComponents: Boolean(c.showExtraComponents),
    targetUserIds: (c.targetUserIds || []).map((v) => String(v).toLowerCase()),
    enrollmentWindow: c.enrollmentWindow,
    riskConfirmHtml:
      resolveText(
        (c as any).riskConfirmHtml !== undefined
          ? (c as any).riskConfirmHtml
          : ''
      ) || undefined,
  } as HunterCampaignConfig;
};

export const getActiveHunterCampaignsAsync = async (): Promise<
  HunterCampaignConfig[]
> => {
  try {
    const data = await nacosCacheManager.fetchWithCache<ServerResponse>(
      'xhunt_campaigns',
      CAMPAIGN_CACHE_TTL
    );
    const lang = await getCurrentLangAsync();
    const currentUsername = (await getCurrentUsername()).toLowerCase();
    const list = (data?.campaigns || [])
      .filter((c) => {
        if (!c.enabled) return false;
        if (c.testingPhase) {
          const tl = (c.testList || []).map((v) => String(v).toLowerCase());
          return currentUsername && tl.includes(currentUsername);
        }
        return true;
      })
      .map((c) => transformServerCampaign(c, lang));
    buildHandleMapFrom(list);
    _taskMapReady = Object.keys(taskVerificationMap).length > 0;
    return list;
  } catch (e) {
    return [];
  }
};

export const getActiveCampaignForUserAsync = async (
  userId: string
): Promise<HunterCampaignConfig | null> => {
  if (!userId) return null;
  try {
    const all = await getActiveHunterCampaignsAsync();
    const normalizedUserId = String(userId).toLowerCase();
    const found = all.find((c) =>
      (c.targetUserIds || []).includes(normalizedUserId)
    );
    return found || null;
  } catch (e) {
    return null;
  }
};
