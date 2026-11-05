import { createElement, useEffect, useRef, useCallback } from 'react';
import { useDebounceFn } from 'ahooks';
import { subscribeToMutation } from './useGlobalMutationObserver';
import { useLocalStorage } from '~storage/useLocalStorage';
import { cleanerRuleManager } from '~contents/utils/cleaner/ruleManager';
import {
  applyAction,
  restoreArticle,
} from '~contents/utils/cleaner/domRenderer';
import {
  recordInterceptedAccount,
  removeInterceptedAccount,
  updateInterceptedBlockStatus,
} from '~contents/utils/cleaner/interceptedManager';
import { consumePendingBlockIntent } from '~contents/utils/cleaner/profileBlockLauncher';
import useCurrentUrl from './useCurrentUrl';
import { extractUsernameFromUrl } from '~contents/utils';
import { useI18n } from './i18n';
import { RankCacheManager } from '~utils/rankCacheManager';
import type { RankCacheNamespace } from '~utils/rankCacheManager';
import { rankService } from '~utils/rankService';
import type { CleanerMode } from '~contents/utils/cleaner/types';
import { isCleanerIgnoredUrl, isNotificationInteractionOnOwnPost } from '~contents/utils/cleaner/urlFilter';
import { kolFollowerCacheManager } from '~contents/utils/cleaner/kolFollowerCacheManager';
import { kolFollowerBatchService } from '~contents/utils/cleaner/kolFollowerBatchService';
const TWEET_SELECTOR = 'article[data-testid="tweet"], article[role="article"], article';

// 从推文节点中提取作者真实 handle（优先从作者个人链接与独立 handle 容器提取，避免 DisplayName 内夹带 @ 误识别）
const extractTweetHandle = (article: HTMLElement): string => {
  const userNameEl = article.querySelector(
    "div[data-testid='User-Name'], div[data-testid='UserName']"
  );
  if (!userNameEl) return '';

  // 1. 优先从 User-Name 内部作者个人主页链接的 href 提取（如 href="/elonmusk"）
  const links = userNameEl.querySelectorAll<HTMLAnchorElement>('a[href]');
  const reservedPaths = new Set([
    'home',
    'explore',
    'notifications',
    'messages',
    'bookmarks',
    'i',
    'settings',
    'search',
    'tos',
    'privacy',
  ]);

  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/^\/([a-zA-Z0-9_]+)(?:\/)?$/);
    if (match) {
      const candidate = match[1].toLowerCase();
      if (!reservedPaths.has(candidate)) {
        return candidate;
      }
    }
  }

  // 2. 次选：在 User-Name 区域中寻找完整内容仅为 @handle 的 span 节点
  const spans = userNameEl.querySelectorAll('span');
  for (const span of spans) {
    const text = (span.textContent || '').trim();
    if (/^@[a-zA-Z0-9_]+$/.test(text)) {
      return text.slice(1).toLowerCase();
    }
  }

  // 3. 兜底：若前两者均未命中，提取最后一个出现 @handle 的段落（Display Name 在前，handle 在后）
  const allMatches = Array.from(
    (userNameEl.textContent || '').matchAll(/@([a-zA-Z0-9_]+)/g)
  );
  if (allMatches.length > 0) {
    const lastMatch = allMatches[allMatches.length - 1];
    return lastMatch[1].toLowerCase();
  }

  return '';
};

interface TweetAuthorInfo {
  handle: string;
  name: string;
}

const extractTweetAuthor = (article: HTMLElement): TweetAuthorInfo => {
  const handle = extractTweetHandle(article);
  const userNameEl = article.querySelector(
    "div[data-testid='User-Name'], div[data-testid='UserName']"
  );
  if (!userNameEl) {
    return { handle, name: "" };
  }

  const profileLink = userNameEl.querySelector<HTMLAnchorElement>("a[href^='/']");
  if (profileLink) {
    const linkText = (profileLink.textContent || "").trim();
    if (linkText && !linkText.startsWith("@")) {
      return { handle, name: linkText };
    }
  }

  const firstSpan = userNameEl.querySelector("span");
  const name = firstSpan?.textContent?.trim() || "";
  return { handle, name };
};


export function TweetCleaner() {
  const [enabled] = useLocalStorage<boolean>('@settings/cleaner-enabled', false);
  const currentUrl = useCurrentUrl();
  const isIgnored = isCleanerIgnoredUrl(currentUrl);

  // 页面加载后若存在“去屏蔽”跳转标记，自动唤起 X 官方屏蔽确认弹窗
  useEffect(() => {
    consumePendingBlockIntent();
  }, []);

  // 未启用或处于无需净化的页面（通知、私信、Grok、Studio、设置、Lists 等），停止挂载与 DOM 监听
  if (!enabled || isIgnored) {
    return null;
  }

  return createElement(EnabledTweetCleaner, { enabled, currentUrl });
}

function EnabledTweetCleaner({
  enabled,
  currentUrl,
}: {
  enabled: boolean;
  currentUrl: string;
}) {
  const [mode] = useLocalStorage<CleanerMode>(
    '@settings/cleaner-mode',
    'collapse'
  );
  const [whitelist] = useLocalStorage<string[]>(
    '@xhunt/cleaner-whitelist',
    []
  );
  const [customKeywords] = useLocalStorage<string[]>(
    '@xhunt/cleaner-custom-keywords',
    []
  );
  const [currentUsername] = useLocalStorage<string>(
    '@xhunt/current-username',
    ''
  );
  const { t } = useI18n();

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const effectiveMode: CleanerMode =
    mode === 'hide' || mode === 'mark' ? mode : 'collapse';
  const modeRef = useRef(effectiveMode);
  modeRef.current = effectiveMode;

  const whitelistRef = useRef(whitelist);
  whitelistRef.current = whitelist;

  const customKeywordsRef = useRef(customKeywords);
  customKeywordsRef.current = customKeywords;

  const currentUsernameRef = useRef(currentUsername);
  currentUsernameRef.current = currentUsername;

 useEffect(() => {
   cleanerRuleManager.init();
   void kolFollowerCacheManager.init();
    void RankCacheManager.preload();

    return () => {
      kolFollowerBatchService.clear();
      const handled = document.querySelectorAll<HTMLElement>(
        "article[data-xhunt-cleaner-handled='true']"
      );
      handled.forEach((article) => restoreArticle(article));
    };
  }, []);

  const getWarnLabel = useCallback(
    (category?: string) => {
      if (category === 'custom') {
        return t('cleanerTagCustom');
      }
      if (category === 'gray') {
        return t('cleanerTagGray');
      }
      return t('cleanerTagAdult');
    },
    [t]
  );

  // 检查是否免除拦截
  const isExempt = useCallback(
    (article: HTMLElement, handle: string): boolean => {
      // 0. 通知页面卡片中别人对用户本人帖子的互动（如别人点赞/转推/喜欢了用户的帖子），一律免除
      if (isNotificationInteractionOnOwnPost(article, currentUrl)) {
        return true;
      }

      if (!handle) return false;
      const lowerHandle = handle.toLowerCase().replace(/^@/, '');

      // 1. 自己 (Self)
      const selfUsername = (currentUsernameRef.current || '')
        .toLowerCase()
        .replace(/^@/, '');
      if (selfUsername) {
        if (lowerHandle === selfUsername) {
          return true;
        }
        // 1.2 卡片中包含指向自己推文的链接（例如通知中展示了用户自己的推文）
        const ownStatusLink = article.querySelector(
          `a[href*="/${selfUsername}/status/"]`
        );
        if (ownStatusLink) {
          return true;
        }
      }

      // 2. 用户本地白名单
      const localWhitelist = whitelistRef.current || [];
      if (
        localWhitelist.some(
          (w) => w.toLowerCase().replace(/^@/, '') === lowerHandle
        )
      ) {
        return true;
      }

     // 3. 云端全局豁免名单
     if (cleanerRuleManager.isGlobalExempt(lowerHandle)) {
       return true;
     }

      // 4. 命中 12 小时 KOL 关注防误杀白名单缓存
      if (
        cleanerRuleManager.getKolFollowerConfig().enabled &&
        kolFollowerCacheManager.isSyncExempt(lowerHandle)
      ) {
        return true;
      }

      return false;
    },
    [currentUrl]
  );

  // 核心检测与处理单篇推文（完全同步判定，同帧微任务执行，消除视觉闪烁）
  const inspectArticle = useCallback(
    (article: HTMLElement) => {
      if (!enabledRef.current || isCleanerIgnoredUrl(window.location.href)) return;

      // 提取作者 handle 与名字
      const userNameEl = article.querySelector(
        "div[data-testid='User-Name'], div[data-testid='UserName']"
      );
      const { handle, name } = extractTweetAuthor(article);

      // 免死白名单校验
      if (isExempt(article, handle)) {
        if (article.dataset.xhuntCleanerHandled === 'true') {
          restoreArticle(article);
        }
        article.dataset.xhuntCleanerHandled = 'true';
        article.dataset.xhuntCleanerAuthor = (handle || '').toLowerCase();
        article.dataset.xhuntCleanerMode = modeRef.current;
        return;
      }

      // 1. 优先检测作者名字/用户名是否命中自定义屏蔽词或后台强词
      let detectResult = cleanerRuleManager.checkAuthorSpam(
        { name, handle },
        customKeywordsRef.current
      );

      // 2. 若作者名字未命中，再检测推文正文内容
      if (!detectResult.matched) {
        // 提取正文文本（兼容多段文本、引用推文及不同标签形态）
        const textEls = article.querySelectorAll<HTMLElement>(
          "[data-testid='tweetText']"
        );
        if (textEls.length === 0) return;

        const texts: string[] = [];
        textEls.forEach((el) => {
          const content = el.textContent || '';
          if (content.trim()) {
            texts.push(content);
          }
        });
        if (texts.length === 0) return;

        const fullText = texts.join('\n');

        // 执行垃圾推文检测（先检测整篇组合文本，若有多段则再逐段检测以防弱词被长文本保护稀释）
        detectResult = cleanerRuleManager.checkSpam(
          fullText,
          customKeywordsRef.current
        );

        if (!detectResult.matched && texts.length > 1) {
          for (const singleText of texts) {
            const res = cleanerRuleManager.checkSpam(
              singleText,
              customKeywordsRef.current
            );
            if (res.matched) {
              detectResult = res;
              break;
            }
          }
        }
      }

      if (detectResult.matched) {
        // 同步校验 KOL 排名免除（若内存缓存中是知名认证 KOL 则放行）
        const namespaces: RankCacheNamespace[] = ['web3', 'ai'];
        if (handle) {
          for (const ns of namespaces) {
            const cachedRank = RankCacheManager.peekSync(handle, ns);
            if (cachedRank && cachedRank.kolRank && cachedRank.kolRank > 0) {
              if (article.dataset.xhuntCleanerHandled === 'true') {
                restoreArticle(article);
              }
              article.dataset.xhuntCleanerHandled = 'true';
              article.dataset.xhuntCleanerAuthor = handle.toLowerCase();
              article.dataset.xhuntCleanerMode = modeRef.current;
              return;
            }
          }
        }

        // 同帧立即应用动作（在当前微任务中直接修改，保证在浏览器进入渲染绘制前完成）
        applyAction({
          article,
          handle,
          authorName: name,
          category: detectResult.category,
          mode: modeRef.current,
          warnLabel: getWarnLabel(detectResult.category),
          collapseHint: t('cleanerCollapsedHint'),
        });

        // 记录被拦截的账号信息（加入名单列表供用户查看与手动屏蔽）
        if (handle) {
          let avatar = '';
          const avatarImg = article.querySelector<HTMLImageElement>(
            "div[data-testid='Tweet-User-Avatar'] img, [data-testid='avatar'] img"
          );
          if (avatarImg?.src) {
            avatar = avatarImg.src;
          }

          recordInterceptedAccount({
            handle,
            name: name || '',
            avatar,
            category: detectResult.category,
            reason: detectResult.reason || '',
            matchedWord: detectResult.matchedWord,
          });
        }

        // 排名异步复核：缓存未命中时主动查询排名接口（请求合并，与头像排名共用管线），
        // 一旦确认有排名（KOL）立即恢复该推文并撤销拦截记录，覆盖排名数据晚到的场景
        if (handle) {
          void (async () => {
            try {
              for (const ns of namespaces) {
                const rank = await rankService.getRank(handle, ns);
                if (rank && rank > 0) {
                  // 有排名的账号不允许进入违规账号屏蔽记录
                  void removeInterceptedAccount(handle);
                  if (
                    article.isConnected &&
                    article.dataset.xhuntCleanerHandled === 'true' &&
                    article.dataset.xhuntCleanerAuthor === handle.toLowerCase()
                  ) {
                    restoreArticle(article);
                  }
                  return;
                }
              }
            } catch {
              // ignore
            }
         })();
       }

        // KOL 关注关系链异步防误杀复核：
        // 仅在明确拟拦截（非白名单、非已知大KOL）时额外触发，检查是否有知名 KOL 关注他
        const kolConfig = cleanerRuleManager.getKolFollowerConfig();
        if (
          kolConfig.enabled &&
          handle &&
          !kolFollowerCacheManager.isSyncNegative(handle)
        ) {
          kolFollowerBatchService.checkExemption(handle, (isExempt) => {
            if (!isExempt) return;

            // 证实被误杀：移出拦截记录并恢复页面上属于该作者的所有推文
            void removeInterceptedAccount(handle);
            const lowerHandle = handle.toLowerCase();
            const matchedArticles = document.querySelectorAll<HTMLElement>(
              `article[data-xhunt-cleaner-author="${lowerHandle}"]`
            );
            matchedArticles.forEach((art) => {
              if (
                art.isConnected &&
                art.dataset.xhuntCleanerHandled === 'true'
              ) {
                restoreArticle(art);
              }
            });
          });
        }
      } else {
        if (article.dataset.xhuntCleanerHandled === 'true') {
          // 之前处理过但不再命中
          restoreArticle(article);
        }
        article.dataset.xhuntCleanerHandled = 'true';
        article.dataset.xhuntCleanerAuthor = (handle || '').toLowerCase();
        article.dataset.xhuntCleanerMode = modeRef.current;
      }
    },
    [getWarnLabel, isExempt]
  );

  // 方案一：感知当前推特个人主页的真实屏蔽状态，并与插件本地状态双向校正
  const syncCurrentProfileBlockStatus = useCallback(() => {
    if (isCleanerIgnoredUrl(window.location.href)) return;
    const currentHandle = extractUsernameFromUrl(window.location.href);
    if (!currentHandle) return;

    // 检查是否为自己的主页
    const isOwnProfile = document.querySelector(
      'a[data-testid="editProfileButton"]'
    );
    if (isOwnProfile) return;

    const cleanHandle = currentHandle.toLowerCase();

    // 1. 若存在 unblock 按钮或 emptyState 屏蔽提示，说明在推特官方是“已屏蔽”状态
    const unblockBtn = document.querySelector(
      'button[data-testid$="-unblock"], button[data-testid*="-unblock"]'
    );
    const emptyState = document.querySelector('div[data-testid="emptyState"]');
    const emptyText = emptyState?.textContent?.toLowerCase() || '';
    const isBlockedState =
      Boolean(unblockBtn) ||
      emptyText.includes('blocked') ||
      emptyText.includes('屏蔽') ||
      emptyText.includes('封锁');

    if (isBlockedState) {
      void updateInterceptedBlockStatus(cleanHandle, true);
      return;
    }

    // 2. 若存在 follow 或 unfollow 按钮，说明在推特官方是“未屏蔽”状态
    const followBtn = document.querySelector(
      'button[data-testid$="-follow"], button[data-testid$="-unfollow"], button[data-testid*="-follow"], button[data-testid*="-unfollow"]'
    );
    if (followBtn) {
      void updateInterceptedBlockStatus(cleanHandle, false);
    }
  }, []);

  const { run: debouncedSyncProfile } = useDebounceFn(
    syncCurrentProfileBlockStatus,
    { wait: 150, maxWait: 500 }
  );

  const isProfilePage = Boolean(extractUsernameFromUrl(currentUrl));
  const isProfilePageRef = useRef(isProfilePage);
  isProfilePageRef.current = isProfilePage;

  // 监听路由变化，即刻触发当前个人主页的屏蔽状态感知与多阶段轮询
  useEffect(() => {
    if (!enabled || !isProfilePage || isCleanerIgnoredUrl(currentUrl)) return;

    syncCurrentProfileBlockStatus();
    const timers = [
      setTimeout(syncCurrentProfileBlockStatus, 300),
      setTimeout(syncCurrentProfileBlockStatus, 800),
      setTimeout(syncCurrentProfileBlockStatus, 1600),
      setTimeout(syncCurrentProfileBlockStatus, 2600),
    ];
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [currentUrl, enabled, isProfilePage, syncCurrentProfileBlockStatus]);

  // 监听用户点击推特原生操作弹窗（如确认解除屏蔽或屏蔽）
  useEffect(() => {
    if (!enabled) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (
        target.closest('[data-testid="confirmationSheetConfirm"]') ||
        target.closest('button[data-testid$="-unblock"]') ||
        target.closest('button[data-testid*="-unblock"]')
      ) {
        setTimeout(syncCurrentProfileBlockStatus, 200);
        setTimeout(syncCurrentProfileBlockStatus, 600);
        setTimeout(syncCurrentProfileBlockStatus, 1200);
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [enabled, syncCurrentProfileBlockStatus]);

  // 当 mode / whitelist 改变或路由切换时响应 DOM
  useEffect(() => {
    if (isCleanerIgnoredUrl(currentUrl)) return;
    // 全量扫描当前已渲染的推文
    const tweetArticles = document.querySelectorAll<HTMLElement>(TWEET_SELECTOR);
    tweetArticles.forEach((article) => {
      inspectArticle(article);
    });
  }, [effectiveMode, whitelist, customKeywords, inspectArticle, currentUrl]);

  // 订阅 DOM Mutation
  useEffect(() => {
    if (!enabled || isCleanerIgnoredUrl(currentUrl)) return;

    // 走全局 observer 的即时通道（无防抖节流），在 MutationObserver 微任务中同帧即时执行
    const unsubscribe = subscribeToMutation(
      (mutations) => {
        // 感知到无需检测的 url 时即刻停止微任务判定
        if (isCleanerIgnoredUrl(window.location.href)) return;

        // 方案一：若当前处于个人主页，任何 DOM 变动均触发防抖检测，不受是否有推文 article 影响
        if (isProfilePageRef.current) {
          debouncedSyncProfile();
        }

        // 增量处理：只收集本次变更涉及的推文，避免全文档扫描
        const affectedArticles = new Set<HTMLElement>();
        for (const mutation of mutations) {
          if (mutation.type !== 'childList') {
            continue;
          }
          const targetEl =
            mutation.target instanceof HTMLElement
              ? mutation.target
              : mutation.target.parentElement;
          if (targetEl) {
            const host = targetEl.closest(TWEET_SELECTOR);
            if (host instanceof HTMLElement) {
              affectedArticles.add(host);
            }
          }
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            // 新增节点本身是推文
            if (node.matches(TWEET_SELECTOR)) {
              affectedArticles.add(node);
            }
            // 新增节点内部包含的推文（如整条推文单元格挂载）
            node
              .querySelectorAll<HTMLElement>(TWEET_SELECTOR)
              .forEach((article) => affectedArticles.add(article));
          });
        }

        if (affectedArticles.size === 0) return;

        // 同帧微任务内立即同步判定，在浏览器首帧绘制前应用动作，彻底消除视觉闪烁
        affectedArticles.forEach((article) => {
          if (!article.isConnected) return;
          if (article.dataset.xhuntCleanerHandled === 'true') {
            const sameMode = article.dataset.xhuntCleanerMode === modeRef.current;
            const currentAuthor = extractTweetHandle(article);
            const savedAuthor = article.dataset.xhuntCleanerAuthor || '';
            // 若模式未变且作者一致（包含广告/特殊卡片两者皆为空的场景），直接跳过
            if (sameMode && savedAuthor === currentAuthor) return;
          }
          inspectArticle(article);
        });
      },
      { childList: true, subtree: true }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, currentUrl, inspectArticle, debouncedSyncProfile]);

  return null;
}
