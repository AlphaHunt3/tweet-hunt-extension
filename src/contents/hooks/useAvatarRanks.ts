import { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useAvatarElements } from './useAvatarElements';
import { rankService } from '~/utils/rankService';
import useCurrentUrl from './useCurrentUrl';
import packageJson from '../../../package.json';

const HIGH_RANK_THRESHOLD = 10000;

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

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
      devLog(
        'error',
        `📊 [v${packageJson.version}] Error in findAvatarImage:`,
        error
      );
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
      badge.innerHTML = `<span class="xhunt-avatar-rank-text">${formatRank(
        Number(rank),
        username
      )}</span>`;
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Error in updateRankBadge:`,
        error
      );
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
      devLog(
        'error',
        `📊 [v${packageJson.version}] Error in setDMOverflowVisible:`,
        error
      );
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

        if (
          href &&
          href.startsWith('/') &&
          testId === 'DM_Conversation_Avatar'
        ) {
          const username = href.slice(1); // 移除开头的 '/'
          if (username && username !== 'unknown') {
            devLog(
              'log',
              `📊 [v${packageJson.version}] Resolved unknown username via ancestor: ${username}`
            );
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
            devLog(
              'log',
              `📊 [v${packageJson.version}] Resolved unknown username via sibling: ${username}`
            );
            return username;
          }
        }
      }
    }

    devLog(
      'log',
      `📊 [v${packageJson.version}] Could not resolve unknown username, will be filtered out`
    );
    return null;
  } catch (error) {
    devLog(
      'error',
      `📊 [v${packageJson.version}] Error resolving unknown username:`,
      error
    );
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
    if (
      typeof chrome === 'undefined' ||
      !chrome.runtime ||
      !chrome.runtime.id
    ) {
      devLog(
        'warn',
        `📊 [v${packageJson.version}] ${operationName} skipped: Extension context invalid`
      );
      return fallback;
    }

    // 尝试访问 runtime.getManifest，如果失败说明上下文无效
    chrome.runtime.getManifest();

    const result = await apiCall();
    return result;
  } catch (error) {
    // 检查是否是上下文失效错误
    if (
      error instanceof Error &&
      error.message.includes('Extension context invalidated')
    ) {
      devLog(
        'warn',
        `📊 [v${packageJson.version}] ${operationName} failed: Extension context invalidated`
      );
    } else {
      devLog(
        'warn',
        `📊 [v${packageJson.version}] ${operationName} failed:`,
        error
      );
    }
    return fallback;
  }
}

export function useAvatarRanks() {
  const avatarElements = useAvatarElements();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const currentUrl = useCurrentUrl();
  const preUrlRef = useRef('');
  const hasCredibilityBadgeRef = useRef<undefined | boolean>(undefined);
  const [loadingUsernames, setLoadingUsernames] = useState<Set<string>>(
    new Set()
  );

  // 初始化排名服务
  useEffect(() => {
    rankService.init();

    // 添加状态回调监听
    const removeCallback = rankService.addStatusCallback((loadingUsernames) => {
      setLoadingUsernames(loadingUsernames);
    });

    return () => {
      removeCallback();
    };
  }, []);

  const processAvatars = async (targetElements = avatarElements) => {
    try {
      const matchedElements = new Set<HTMLElement>();

      targetElements.forEach((el: HTMLElement) => {
        const processedUrl = (el as any).processedUrl;
        if (!processedUrl || processedUrl !== currentUrl) {
          matchedElements.add(el);
        }
      });

      if (!matchedElements.size) {
        return;
      }

      // Extract usernames from elements
      const usernameElements: Array<{ el: HTMLElement; username: string }> = [];
      const usernamesToCheck: string[] = [];

      // First pass: extract usernames and prepare for batch cache check
      for (const el of matchedElements) {
        const testId = el.getAttribute('data-testid');
        let username = testId?.replace('UserAvatar-Container-', '') || '';

        // Handle unknown username
        if (username === 'unknown') {
          const resolvedUsername = resolveUnknownUsername(el);
          if (resolvedUsername) {
            username = resolvedUsername;
            // Update element's data-testid
            el.setAttribute('data-testid', `UserAvatar-Container-${username}`);
          }
        }

        if (username && username !== 'unknown') {
          usernameElements.push({ el, username });
          usernamesToCheck.push(username);
        }
      }

      if (usernamesToCheck.length === 0) {
        return;
      }

      // 使用排名服务获取排名
      const ranks = await rankService.getRanks(usernamesToCheck);

      // 处理排名结果并更新UI（批量读写，减少布局抖动）
      const writeTasks: Array<() => void> = [];

      for (const { el, username } of usernameElements) {
        const rank = ranks[username] ?? -2;
        const isLoading = loadingUsernames.has(username);

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

        const isSquareShape = AvatarStyler.findAvatarImage(el);
        const borderRadius = isSquareShape ? '10%' : '50%';

        // 单次测量
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const isLarge = size > 120;

        // 收集写任务
        writeTasks.push(() => {
          if (hasTweetUserAvatar) {
            if (!parent.classList.contains('xhunt-avatar-inner-border')) {
              parent.classList.add('xhunt-avatar-inner-border');
            }
            if (parent.style.borderRadius !== borderRadius) {
              parent.style.borderRadius = borderRadius;
            }

            const grandParent = parent.parentElement;
            if (grandParent) {
              if (
                !grandParent.classList.contains('xhunt-avatar-outer-border')
              ) {
                grandParent.classList.add('xhunt-avatar-outer-border');
              }
              if (grandParent.style.borderRadius !== borderRadius) {
                grandParent.style.borderRadius = borderRadius;
              }
              AvatarStyler.updateRankBadge(
                grandParent,
                rank,
                isLoading,
                false,
                isLarge,
                username,
                theme,
                hasCredibilityBadgeRef.current
              );
            }
          } else {
            if (el.style.backgroundColor !== 'transparent') {
              el.style.backgroundColor = 'transparent';
            }
            const expectedBorder = `${
              size > 120 ? '5px' : '3px'
            } solid rgba(96, 165, 250, 0.5)`;
            if (el.style.border !== expectedBorder) {
              el.style.border = expectedBorder;
            }
            if (el.style.borderRadius !== borderRadius) {
              el.style.borderRadius = borderRadius;
            }
            AvatarStyler.updateRankBadge(
              el,
              rank,
              isLoading,
              true,
              isLarge,
              username,
              theme,
              hasCredibilityBadgeRef.current
            );
          }

          // 为每个头像元素设置 DM 对话的 overflow
          AvatarStyler.setDMOverflowVisible(el);

          if (!isLoading) {
            (el as any).processedUrl = currentUrl;
          }
        });
      }

      if (writeTasks.length) {
        requestAnimationFrame(() => {
          for (const task of writeTasks) task();
        });
      }
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Error in processAvatars:`,
        error
      );
    }
  };

  useEffect(() => {
    hasCredibilityBadgeRef.current = !!document.querySelector(
      '.credibility-badge-wrapper'
    );
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
    getServiceStats: rankService.getStats,
    preloadRanks: rankService.preloadRanks,
  };
}
