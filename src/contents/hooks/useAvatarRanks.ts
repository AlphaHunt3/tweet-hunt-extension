import { useEffect, useRef } from 'react';
import { useRequest } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useAvatarElements } from './useAvatarElements';
import { fetchTwitterRankBatch } from '../services/api';
import useCurrentUrl from './useCurrentUrl';

// Constants
const MAX_CACHE_SIZE = 1000;
const CACHE_EXPIRATION = 2 * 24 * 60 * 60 * 1000; // 2 days
const HIGH_RANK_THRESHOLD = 10000;

// Cache management
interface RankCacheEntry {
  kolRank: number;
  timestamp: number;
}

interface RankCache {
  [key: string]: RankCacheEntry;
}

const RANK_CACHE_KEY = '@xhunt/rank-cache';

class RankCacheManager {
  private static async getCache(): Promise<RankCache> {
    try {
      const cache = await localStorage.getItem(RANK_CACHE_KEY);
      return cache ? JSON.parse(cache) : {};
    } catch {
      return {};
    }
  }

  private static async setCache(cache: RankCache) {
    try {
      await localStorage.setItem(RANK_CACHE_KEY, JSON.stringify(cache));
    } catch {
      console.warn('Failed to save rank cache to localStorage');
    }
  }

  static async get(username: string): Promise<RankCacheEntry | null> {
    const cache = await this.getCache();
    const entry = cache[username];

    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_EXPIRATION) {
      delete cache[username];
      await this.setCache(cache);
      return null;
    }

    return entry;
  }

  static async set(username: string, rank: number) {
    const cache = await this.getCache();

    cache[username] = {
      kolRank: rank,
      timestamp: Date.now()
    };

    if (Object.keys(cache).length > MAX_CACHE_SIZE) {
      const entries = Object.entries(cache)
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => delete cache[key]);
    }

    await this.setCache(cache);
  }
}

class AvatarStyler {
  static findAvatarImage(container: HTMLElement): boolean {
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

  const { runAsync: fetchRanks } = useRequest(fetchTwitterRankBatch, {
    manual: true,
  });

  const executeBatchRequest = async () => {
    if (pendingUsernamesRef.current.size === 0) return;

    const usernamesToFetch = Array.from(pendingUsernamesRef.current);
    pendingUsernamesRef.current.clear();

    try {
      const rankData = await fetchRanks(usernamesToFetch);
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
        console.log('Error fetching ranks:', error);
      }
    }
  };

  const processAvatars = async (targetElements = avatarElements) => {
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
        const username = testId?.replace('UserAvatar-Container-', '') || '';
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
    });

    const uncachedUsernames = [...new Set(
      usernamesWithCache
      .filter(({ cached }) => !cached)
      .map(({ username }) => username)
      .filter(username => username && username !== 'unknown')
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
}
