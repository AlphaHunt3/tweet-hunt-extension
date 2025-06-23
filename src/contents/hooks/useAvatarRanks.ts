import { useEffect, useRef } from 'react';
import { useRequest } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useAvatarElements } from './useAvatarElements';
import { fetchTwitterRankBatch } from '../services/api';
import useCurrentUrl from './useCurrentUrl';
import packageJson from '../../../package.json';

// Constants
const MAX_CACHE_SIZE = 500; // 🆕 降低缓存大小限制
const CACHE_EXPIRATION = 2 * 24 * 60 * 60 * 1000; // 2 days
const HIGH_RANK_THRESHOLD = 10000;
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 🆕 10分钟清理一次
const MAX_STORAGE_SIZE = 1024 * 1024; // 1MB

// Cache management
interface RankCacheEntry {
  kolRank: number;
  timestamp: number;
  lastAccessed: number; // 🆕 添加最后访问时间
}

interface RankCache {
  [key: string]: RankCacheEntry;
}

const RANK_CACHE_KEY = '@xhunt/rank-cache';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

class RankCacheManager {
  private static cleanupTimer: NodeJS.Timeout | null = null;

  // 🆕 启动定时清理
  static startCleanupTimer() {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setInterval(() => {
      this.performScheduledCleanup();
    }, CLEANUP_INTERVAL);
    
    devLog('log', `📊 [v${packageJson.version}] Cache cleanup timer started (${CLEANUP_INTERVAL / 1000}s interval)`);
  }

  // 🆕 停止定时清理
  static stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      devLog('log', `📊 [v${packageJson.version}] Cache cleanup timer stopped`);
    }
  }

  // 🆕 执行定时清理
  private static async performScheduledCleanup() {
    try {
      const cache = await this.getCache();
      const now = Date.now();
      let cleanedCount = 0;

      // 清理过期数据
      for (const [username, entry] of Object.entries(cache)) {
        if (now - entry.timestamp > CACHE_EXPIRATION) {
          delete cache[username];
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await this.setCache(cache);
        devLog('log', `📊 [v${packageJson.version}] Scheduled cleanup removed ${cleanedCount} expired entries`);
      }
    } catch (error) {
      devLog('error', `📊 [v${packageJson.version}] Scheduled cleanup failed:`, error);
    }
  }

  private static async getCache(): Promise<RankCache> {
    try {
      const cache = await localStorage.getItem(RANK_CACHE_KEY);
      return cache ? JSON.parse(cache) : {};
    } catch (error) {
      devLog('error', `📊 [v${packageJson.version}] Failed to get cache:`, error);
      return {};
    }
  }

  private static async setCache(cache: RankCache) {
    try {
      const now = Date.now();
      
      // 🆕 检查缓存大小限制
      if (Object.keys(cache).length > MAX_CACHE_SIZE) {
        devLog('log', `📊 [v${packageJson.version}] Cache size limit exceeded (${Object.keys(cache).length}/${MAX_CACHE_SIZE}), performing LRU cleanup...`);
        
        const entries = Object.entries(cache);
        
        // LRU清理：按最后访问时间排序，保留最近访问的
        const sortedEntries = entries.sort(([, a], [, b]) => b.lastAccessed - a.lastAccessed);
        const entriesToKeep = sortedEntries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.8)); // 保留80%
        
        cache = Object.fromEntries(entriesToKeep);
        devLog('log', `📊 [v${packageJson.version}] LRU cleanup completed, kept ${entriesToKeep.length} entries`);
      }

      // 🆕 检查存储大小
      const cacheString = JSON.stringify(cache);
      if (cacheString.length > MAX_STORAGE_SIZE) {
        devLog('warn', `📊 [v${packageJson.version}] Cache size too large (${cacheString.length} bytes), performing aggressive cleanup...`);
        
        // 激进清理：只保留最近的数据
        const entries = Object.entries(cache);
        const recentEntries = entries
          .filter(([, entry]) => now - entry.timestamp < 24 * 60 * 60 * 1000) // 只保留24小时内的
          .sort(([, a], [, b]) => b.lastAccessed - a.lastAccessed)
          .slice(0, Math.floor(MAX_CACHE_SIZE * 0.5)); // 只保留50%
        
        cache = Object.fromEntries(recentEntries);
        devLog('log', `📊 [v${packageJson.version}] Aggressive cleanup completed, kept ${recentEntries.length} entries`);
      }

      await localStorage.setItem(RANK_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      devLog('error', `📊 [v${packageJson.version}] Failed to set cache:`, error);
      // 如果存储失败，尝试清空缓存
      try {
        await localStorage.removeItem(RANK_CACHE_KEY);
        devLog('warn', `📊 [v${packageJson.version}] Cache cleared due to storage failure`);
      } catch (clearError) {
        devLog('error', `📊 [v${packageJson.version}] Failed to clear cache:`, clearError);
      }
    }
  }

  static async get(username: string): Promise<RankCacheEntry | null> {
    try {
      const cache = await this.getCache();
      const entry = cache[username];

      if (!entry) return null;

      const now = Date.now();
      if (now - entry.timestamp > CACHE_EXPIRATION) {
        delete cache[username];
        await this.setCache(cache);
        return null;
      }

      // 🆕 更新最后访问时间
      entry.lastAccessed = now;
      cache[username] = entry;
      await this.setCache(cache);

      return entry;
    } catch (error) {
      devLog('error', `📊 [v${packageJson.version}] Failed to get cache entry:`, error);
      return null;
    }
  }

  static async set(username: string, rank: number) {
    try {
      let cache = await this.getCache();
      const now = Date.now();

      cache[username] = {
        kolRank: rank,
        timestamp: now,
        lastAccessed: now // 🆕 设置最后访问时间
      };

      await this.setCache(cache);
    } catch (error) {
      devLog('error', `📊 [v${packageJson.version}] Failed to set cache entry:`, error);
      // 创建最小缓存
      const minimalCache = {
        [username]: {
          kolRank: rank,
          timestamp: Date.now(),
          lastAccessed: Date.now()
        }
      };
      
      try {
        await localStorage.setItem(RANK_CACHE_KEY, JSON.stringify(minimalCache));
      } catch (fallbackError) {
        devLog('error', `📊 [v${packageJson.version}] Failed to create minimal cache:`, fallbackError);
      }
    }
  }

  // 🆕 获取缓存统计信息
  static async getStats() {
    try {
      const cache = await this.getCache();
      const now = Date.now();
      
      const stats = {
        totalEntries: Object.keys(cache).length,
        expiredEntries: 0,
        recentEntries: 0,
        cacheSize: JSON.stringify(cache).length,
        cleanupInterval: CLEANUP_INTERVAL
      };

      Object.values(cache).forEach(entry => {
        if (now - entry.timestamp > CACHE_EXPIRATION) {
          stats.expiredEntries++;
        }
        if (now - entry.lastAccessed < 60 * 60 * 1000) { // 1小时内访问的
          stats.recentEntries++;
        }
      });

      return stats;
    } catch (error) {
      devLog('error', `📊 [v${packageJson.version}] Failed to get cache stats:`, error);
      return null;
    }
  }

  // 🆕 手动清理方法
  static async manualCleanup() {
    await this.performScheduledCleanup();
  }
}

class AvatarStyler {
  static findAvatarImage(container: HTMLElement): boolean {
    try {
      const aTag = container.querySelector('a');
      if (aTag) {
        const divs = aTag.getElementsByTagName('div');
        for (const div of divs) {
          const computedStyle = window.getComputedStyle(div);
          if (computedStyle.clipPath?.includes('#shape-square')) {
            return true;
          }
        }
      }

      const ariaHiddenDiv = container.querySelector('div[aria-hidden="true"]');
      if (ariaHiddenDiv) {
        const firstDiv = ariaHiddenDiv.querySelector('div');
        if (firstDiv) {
          const computedStyle = window.getComputedStyle(firstDiv);
          if (computedStyle.clipPath?.includes('#shape-square')) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      devLog('error', `📊 [v${packageJson.version}] Error in findAvatarImage:`, error);
      return false;
    }
  }

  static updateRankBadge(
    container: HTMLElement,
    rank: number,
    isLoading: boolean,
    isSpecialCase: boolean = false,
    isLarge: boolean = false,
    username: string = '',
    theme: string,
    hasCredibilityBadge: boolean = false
  ) {
    try {
      let badge = container.querySelector('.xhunt-avatar-rank-badge');

      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'xhunt-avatar-rank-badge';

        if (hasCredibilityBadge) {
          badge.classList.add('xhunt-badge-top');
        }

        if (isSpecialCase) {
          // @ts-ignore
          badge.style.zIndex = '9999';
        }
        if (isLarge) {
          badge.classList.add('large');
        }
        if (rank > 0 && rank <= HIGH_RANK_THRESHOLD) {
          badge.classList.add('high-ranked');
        }
        container.appendChild(badge);
      }

      badge.setAttribute('data-theme', theme);
      badge.classList.toggle('loading', isLoading);
      badge.innerHTML = `<span class="xhunt-avatar-rank-text">${formatRank(Number(rank), username)}</span>`;
    } catch (error) {
      devLog('error', `📊 [v${packageJson.version}] Error in updateRankBadge:`, error);
    }
  }

  // 设置 DM 对话头像的 overflow
  static setDMOverflowVisible(container: HTMLElement) {
    try {
      // A元素的父元素
      const parent1 = container.parentElement;
      if (!parent1) return;

      // A元素的父元素的父元素
      const parent2 = parent1.parentElement;
      if (!parent2) return;

      // 检查是否是 DM_Conversation_Avatar
      if (parent2.getAttribute('data-testid') !== 'DM_Conversation_Avatar') {
        return;
      }

      // A元素的父元素的父元素的父元素
      const parent3 = parent2.parentElement;
      if (!parent3) return;

      // A元素的父元素的父元素的父元素的父元素（往上数4层）
      const parent4 = parent3.parentElement;
      if (!parent4) return;

      // 设置 overflow 为 visible
      parent4.style.overflow = 'visible';
    } catch (error) {
      // 静默处理错误
      devLog('error', `📊 [v${packageJson.version}] Error in setDMOverflowVisible:`, error);
    }
  }
}

// 🆕 处理 unknown username 的特殊情况
function resolveUnknownUsername(element: HTMLElement): string | null {
  try {
    // 情况1：检查祖先元素（最多2层）
    let currentElement: HTMLElement | null = element;
    for (let i = 0; i < 2 && currentElement; i++) {
      currentElement = currentElement.parentElement;
      if (currentElement && currentElement.tagName.toLowerCase() === 'a') {
        const href = currentElement.getAttribute('href');
        const testId = currentElement.getAttribute('data-testid');
        
        if (href && href.startsWith('/') && testId === 'DM_Conversation_Avatar') {
          const username = href.slice(1); // 移除开头的 '/'
          if (username && username !== 'unknown') {
            devLog('log', `📊 [v${packageJson.version}] Resolved unknown username via ancestor: ${username}`);
            return username;
          }
        }
      }
    }

    // 情况2：检查相邻的下一个元素
    const nextElement = element.nextElementSibling;
    if (nextElement) {
      const aLinks = nextElement.querySelectorAll('a[role="link"]');
      for (const aLink of aLinks) {
        const href = aLink.getAttribute('href');
        if (href && href.startsWith('/')) {
          const username = href.slice(1); // 移除开头的 '/'
          if (username && username !== 'unknown') {
            devLog('log', `📊 [v${packageJson.version}] Resolved unknown username via sibling: ${username}`);
            return username;
          }
        }
      }
    }

    devLog('log', `📊 [v${packageJson.version}] Could not resolve unknown username, will be filtered out`);
    return null;
  } catch (error) {
    devLog('error', `📊 [v${packageJson.version}] Error resolving unknown username:`, error);
    return null;
  }
}

function formatRank(rank: number, username: string): string {
  if (rank === -2 && username) return '~';
  if (rank < 0) return '-';
  let trophy = '#';
  if (rank < 2000) {
    trophy = '<span class="gold-trophy">&#x1F3C6;</span>';
  } else if (rank < 10000) {
    trophy = '<span class="silver-trophy">&#x1F3C6;</span>';
  } else if (rank < 100000) {
    trophy = '<span class="bronze-trophy">&#x1F3C6;</span>';
  }
  return `${trophy}${rank.toLocaleString()}`;
}

// 🆕 安全的 Chrome API 调用包装器
async function safeChromeCaller<T>(
  apiCall: () => Promise<T> | T,
  fallback: T,
  operationName: string = 'Chrome API'
): Promise<T> {
  try {
    // 检查扩展上下文是否有效
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      devLog('warn', `📊 [v${packageJson.version}] ${operationName} skipped: Extension context invalid`);
      return fallback;
    }

    // 尝试访问 runtime.getManifest，如果失败说明上下文无效
    chrome.runtime.getManifest();
    
    const result = await apiCall();
    return result;
  } catch (error) {
    // 检查是否是上下文失效错误
    if (error instanceof Error && error.message.includes('Extension context invalidated')) {
      devLog('warn', `📊 [v${packageJson.version}] ${operationName} failed: Extension context invalidated`);
    } else {
      devLog('warn', `📊 [v${packageJson.version}] ${operationName} failed:`, error);
    }
    return fallback;
  }
}

export function useAvatarRanks() {
  const avatarElements = useAvatarElements();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const currentUrl = useCurrentUrl();
  const preUrlRef = useRef('');
  const pendingRequestsRef = useRef(new Set<string>());
  const currentBatchRef = useRef(new Set<string>());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUsernamesRef = useRef<Set<string>>(new Set());
  const hasCredibilityBadgeRef = useRef<undefined | boolean>(undefined);

  // 🆕 启动和停止清理定时器
  useEffect(() => {
    RankCacheManager.startCleanupTimer();
    
    return () => {
      RankCacheManager.stopCleanupTimer();
    };
  }, []);

  const { runAsync: fetchRanks } = useRequest(fetchTwitterRankBatch, {
    manual: true,
  });

  const executeBatchRequest = async () => {
    if (pendingUsernamesRef.current.size === 0) return;

    const usernamesToFetch = Array.from(pendingUsernamesRef.current);
    pendingUsernamesRef.current.clear();

    try {
      // 🆕 使用安全的 API 调用
      const rankData = await safeChromeCaller(
        () => fetchRanks(usernamesToFetch),
        null,
        'Fetch Twitter Ranks'
      );

      if (!rankData) {
        usernamesToFetch.forEach(username => {
          pendingRequestsRef.current.delete(username);
          currentBatchRef.current.delete(username);
        });
        return;
      }

      const rankMap = new Map(
        rankData.map((data, index) => [usernamesToFetch[index], data])
      );

      for (const el of document.querySelectorAll('[data-testid^="UserAvatar-Container-"]')) {
        if (!(el instanceof HTMLElement)) continue;

        const testId = el.getAttribute('data-testid');
        const username = testId?.replace('UserAvatar-Container-', '') || '';
        const data = rankMap.get(username);
        if (!data) continue;

        await RankCacheManager.set(username, data.kolRank);

        const parent = el.parentElement;
        if (!parent) continue;

        let hasTweetUserAvatar = false;
        let ancestor: HTMLElement | null = parent;
        while (ancestor) {
          if (ancestor.getAttribute('data-testid') === 'Tweet-User-Avatar') {
            hasTweetUserAvatar = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }

        const rect = el.getBoundingClientRect();
        const isLarge = Math.max(rect.width, rect.height) > 120;

        // 设置 DM 对话头像的 overflow
        AvatarStyler.setDMOverflowVisible(el);

        if (hasTweetUserAvatar) {
          const grandParent = parent.parentElement;
          if (grandParent) {
            AvatarStyler.updateRankBadge(grandParent, data.kolRank, false, false, isLarge, username, theme, hasCredibilityBadgeRef.current);
          }
        } else {
          AvatarStyler.updateRankBadge(el, data.kolRank, false, true, isLarge, username, theme, hasCredibilityBadgeRef.current);
        }
      }

      usernamesToFetch.forEach(username => {
        pendingRequestsRef.current.delete(username);
        currentBatchRef.current.delete(username);
      });
    } catch (error) {
      usernamesToFetch.forEach(username => {
        pendingRequestsRef.current.delete(username);
        currentBatchRef.current.delete(username);
      });

      if ((error as Error).name !== 'AbortError') {
        devLog('error', `📊 [v${packageJson.version}] Error fetching ranks:`, error);
      }
    }
  };

  const processAvatars = async (targetElements = avatarElements) => {
    try {
      const matchedElements = new Set<HTMLElement>();

      targetElements.forEach((el: HTMLElement) => {
        const processedUrl = (el as any).processedUrl;
        if (!processedUrl || processedUrl !== currentUrl) {
          matchedElements.add(el);
        }
      });

      if (!matchedElements.size) return;

      currentBatchRef.current.clear();

      const usernamesWithCache = await Promise.all(
        Array.from(matchedElements).map(async (el) => {
          const testId = el.getAttribute('data-testid');
          let username = testId?.replace('UserAvatar-Container-', '') || '';
          
          // 🆕 处理 unknown username 的特殊情况
          if (username === 'unknown') {
            const resolvedUsername = resolveUnknownUsername(el);
            if (resolvedUsername) {
              username = resolvedUsername;
              // 更新元素的 data-testid
              el.setAttribute('data-testid', `UserAvatar-Container-${username}`);
            }
          }
          
          const cached = await RankCacheManager.get(username);
          return { el, username, cached };
        })
      );

      usernamesWithCache.forEach(({ el }) => {
        const parent = el.parentElement;
        if (!parent) return;

        let hasTweetUserAvatar = false;
        let ancestor: HTMLElement | null = parent;
        while (ancestor) {
          if (ancestor.getAttribute('data-testid') === 'Tweet-User-Avatar') {
            hasTweetUserAvatar = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }

        const isSquareShape = AvatarStyler.findAvatarImage(el);
        const borderRadius = isSquareShape ? '10%' : '50%';

        if (hasTweetUserAvatar) {
          parent.classList.add('xhunt-avatar-inner-border');
          parent.style.borderRadius = borderRadius;

          const grandParent = parent.parentElement;
          if (grandParent) {
            grandParent.classList.add('xhunt-avatar-outer-border');
            grandParent.style.borderRadius = borderRadius;
          }
        } else {
          const rect = el.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          el.style.backgroundColor = 'transparent';
          el.style.border = `${size > 120 ? '5px' : '3px'} solid rgba(96, 165, 250, 0.5)`;
          el.style.borderRadius = borderRadius;
        }

        // 为每个头像元素设置 DM 对话的 overflow
        AvatarStyler.setDMOverflowVisible(el);
      });

      // 🆕 修改过滤逻辑，处理 unknown username
      const uncachedUsernames = [...new Set(
        usernamesWithCache
        .filter(({ cached }) => !cached)
        .map(({ username }) => username)
        .filter(username => username && username !== 'unknown') // 经过处理后的 unknown 已经被解析或过滤
      )];

      uncachedUsernames.forEach(username => {
        pendingRequestsRef.current.add(username);
        currentBatchRef.current.add(username);
        pendingUsernamesRef.current.add(username);
      });

      for (const { el, username, cached } of usernamesWithCache) {
        const parent = el.parentElement;
        if (!parent) continue;

        let hasTweetUserAvatar = false;
        let ancestor: HTMLElement | null = parent;
        while (ancestor) {
          if (ancestor.getAttribute('data-testid') === 'Tweet-User-Avatar') {
            hasTweetUserAvatar = true;
            break;
          }
          ancestor = ancestor.parentElement;
        }

        const rect = el.getBoundingClientRect();
        const isLarge = Math.max(rect.width, rect.height) > 120;

        const rank = cached ? cached.kolRank : -2;
        const isLoading = !cached && pendingRequestsRef.current.has(username);

        if (hasTweetUserAvatar) {
          const grandParent = parent.parentElement;
          if (grandParent) {
            AvatarStyler.updateRankBadge(grandParent, rank, isLoading, false, isLarge, username, theme, hasCredibilityBadgeRef.current);
          }
        } else {
          AvatarStyler.updateRankBadge(el, rank, isLoading, true, isLarge, username, theme, hasCredibilityBadgeRef.current);
        }

        if (cached) {
          (el as any).processedUrl = currentUrl;
        }
      }

      if (uncachedUsernames.length > 0) {
        if (batchTimeoutRef.current) {
          clearTimeout(batchTimeoutRef.current);
        }

        batchTimeoutRef.current = setTimeout(() => {
          executeBatchRequest();
          batchTimeoutRef.current = null;
        }, 600);
      }
    } catch (error) {
      devLog('error', `📊 [v${packageJson.version}] Error in processAvatars:`, error);
    }
  };

  useEffect(() => {
    hasCredibilityBadgeRef.current = !!document.querySelector('.credibility-badge-wrapper');
    const largeAvatars = (useAvatarElements as any).getLargeAvatars();
    const resetAvatar = (useAvatarElements as any).resetAvatar;
    const processedNodesRef = (useAvatarElements as any).processedNodes;

    if (preUrlRef.current !== currentUrl && largeAvatars?.size > 0) {
      const elementsToReprocess = new Set<HTMLElement>();

      largeAvatars.forEach((trackedAvatar: any) => {
        resetAvatar(trackedAvatar.element);
        elementsToReprocess.add(trackedAvatar.element);
        processedNodesRef.current.delete(trackedAvatar.element);
      });

      if (elementsToReprocess.size > 0) {
        requestAnimationFrame(() => {
          processAvatars(Array.from(elementsToReprocess));
        });
      }
      preUrlRef.current = currentUrl;
    }
    requestAnimationFrame(() => {
      processAvatars();
    });
  }, [avatarElements, currentUrl, theme]);

  // 🆕 返回缓存管理方法供调试使用
  return {
    getCacheStats: RankCacheManager.getStats,
    manualCleanup: RankCacheManager.manualCleanup
  };
}