import { useEffect, useMemo, useState } from 'react';
import useWaitForElement from './useWaitForElement';
import useCurrentUrl from './useCurrentUrl';
import { extractUsernameFromUrl } from '~contents/utils';
import { localStorageInstance } from '~storage/index';
import { useDebounceEffect, useRequest } from 'ahooks';
import { getCurrentUserInfo } from '~contents/utils/helpers';
import { fetchTwitterInfoNew } from '~contents/services/api';
import { useLocalStorage } from '~storage/useLocalStorage';

/**
 * 返回当前 profile 页的推特 handler, Twitter ID 和加载状态。
 */
type FollowState = 'follow' | 'unfollow' | null;

const USER_PROFILE_SCHEMA_SELECTOR =
  'script[type="application/ld+json"][data-testid="UserProfileSchema-test"]';

export default function usePlacementTrackingDomUserInfo(options?: {
  onFollowBtnClick?: (payload: {
    followState: FollowState;
    twitterId: string;
    handler: string;
  }) => void;
  shouldAttach?: (payload: { handler: string }) => boolean;
  ready?: boolean;
}): {
  currentUrl: string;
  urlUid: string | undefined;
  twitterId: string | undefined;
  handler: string;
  displayName: string;
  avatar: string;
  isFollowing: boolean;
  followState: FollowState;
  placementTrackingEl: HTMLElement | null;
  followButton: HTMLButtonElement | null | undefined;
  loading: boolean;
  isEmptyState: boolean;
} {
  const currentUrl = useCurrentUrl();
  const [currentUsername] = useLocalStorage('@xhunt/current-username', '');
  const urlUid = useMemo(
    () => String(extractUsernameFromUrl(currentUrl)).toLocaleLowerCase(),
    [currentUrl]
  );

  const isCurrentUser = useMemo(() => {
    if (!currentUsername || !urlUid) return false;
    return (
      String(currentUsername).toLocaleLowerCase() ===
      String(urlUid).toLocaleLowerCase()
    );
  }, [currentUsername, urlUid]);

  // console.log('isCurrentUser', isCurrentUser);

  const placementTrackingEl = useWaitForElement(
    'div[data-testid="primaryColumn"] div[data-testid="placementTracking"]',
    [currentUrl]
  );
  const avatarImgEl = useWaitForElement(
    'div[data-testid="primaryColumn"] [data-testid*="UserAvatar-Container"] img',
    [currentUrl]
  );
  const emptyStateDom = useWaitForElement("div[data-testid='emptyState']", [
    currentUrl,
  ]);
  const editProfileButtonEl = useWaitForElement(
    'div[data-testid="primaryColumn"] a[data-testid="editProfileButton"]',
    [currentUrl]
  );
  const userProfileSchemaEl = useWaitForElement(
    USER_PROFILE_SCHEMA_SELECTOR,
    [currentUrl]
  );

  const followButton = useMemo<HTMLButtonElement | null | undefined>(() => {
    if (!placementTrackingEl || !urlUid) return undefined;
    return placementTrackingEl.querySelector(
      'button[data-testid$="-follow"], button[data-testid$="-unfollow"]'
    ) as HTMLButtonElement | null;
  }, [placementTrackingEl, urlUid]);

  const [infoState, setInfoState] = useState({
    twitterId: '',
    handler: '',
    displayName: '',
    avatar: '',
    followState: null as FollowState,
  });

  // 防抖计算，避免依赖频繁变动时多次解析 DOM
  // 需要有点时间延迟 否则没有感知 变化加载过程
  useDebounceEffect(
    () => {
      // if (!followButton) return;
      let cancelled = false;

      (async () => {
        if (!urlUid) {
          if (!cancelled) {
            setInfoState({
              twitterId: '',
              handler: '',
              displayName: '',
              avatar: '',
              followState: null,
            });
          }
          return;
        }

        if (isCurrentUser || editProfileButtonEl) {
          try {
            const userInfo = await getCurrentUserInfo();
            const currentUserHandler = userInfo?.screen_name || '';
            const shouldUseProfileSchema =
              isCurrentUser &&
              urlUid &&
              currentUserHandler.toLocaleLowerCase() !==
              String(urlUid).toLocaleLowerCase();
            const schemaInfo = shouldUseProfileSchema
              ? getUserProfileSchemaInfo(userProfileSchemaEl)
              : null;

            if (!cancelled) {
              setInfoState({
                twitterId: schemaInfo?.twitterId || userInfo?.id_str || '',
                handler: schemaInfo?.handler || currentUserHandler || '',
                displayName: schemaInfo?.displayName || userInfo?.name || '',
                avatar:
                  schemaInfo?.avatar || userInfo?.profile_image_url_https || '',
                followState: null,
              });
            }
          } catch {
            // ignore
          }
          return;
        }

        const info = getPlacementTrackingInfo({
          currentUrl,
          el: placementTrackingEl,
          noCached: true,
        });
        const shouldUseProfileSchema = !info.twitterId;
        const schemaInfo = shouldUseProfileSchema
          ? getUserProfileSchemaInfo(userProfileSchemaEl)
          : null;
        const twitterId = schemaInfo?.twitterId || info.twitterId;
        const handler = schemaInfo?.handler || info.handler || urlUid || '';

        if (!cancelled && twitterId) {
          setInfoState({
            twitterId,
            handler,
            displayName: schemaInfo?.displayName || info.displayName,
            avatar: schemaInfo?.avatar || info.avatar,
            followState: info.followState,
          });
        } else if (!cancelled) {
          setInfoState({
            twitterId: '',
            handler,
            displayName: schemaInfo?.displayName || info.displayName || '',
            avatar: schemaInfo?.avatar || info.avatar || '',
            followState: info.followState || null,
          });
        }
      })();

      return () => {
        cancelled = true;
      };
    },
    [
      followButton,
      placementTrackingEl,
      currentUrl,
      urlUid,
      avatarImgEl,
      editProfileButtonEl,
      emptyStateDom,
      isCurrentUser,
      userProfileSchemaEl,
    ],
    { wait: 200, leading: true, trailing: true }
  );

  const [loading, setLoading] = useState(true);

  const { runAsync: runFetchAsync, cancel: cancelFetch } = useRequest(
    async (uid?: string) => {
      if (!uid) return undefined as any;
      return fetchTwitterInfoNew(undefined, uid);
    },
    {
      manual: true,
      cacheKey: urlUid ? `fetchTwitterInfoNew:${urlUid}` : undefined,
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      debounceWait: 100,
    }
  );

  useDebounceEffect(
    () => {
      let cancelled = false;

      if (!!followButton || !emptyStateDom || !urlUid) {
        return;
      }
      runFetchAsync(urlUid)
        .then((apiInfo) => {
          if (!cancelled) {
            setInfoState({
              twitterId: apiInfo?.id || '-99999',
              handler: apiInfo?.username || urlUid || '',
              displayName:
                apiInfo?.name ||
                apiInfo?.profile?.name ||
                apiInfo?.username ||
                '',
              avatar: apiInfo?.profile?.profile_image_url || '',
              followState: null,
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setInfoState({
              twitterId: '-99999',
              handler: urlUid || '',
              displayName: '',
              avatar: '',
              followState: null,
            });
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
        cancelFetch();
      };
    },
    [!!emptyStateDom, !!followButton],
    {
      wait: 300,
      leading: false,
      trailing: true,
    }
  );

  const { twitterId, handler, displayName, avatar, followState } = infoState;

  const isFollowing = useMemo(() => followState === 'unfollow', [followState]);

  // 每次url变化，开始标志正在加载
  useEffect(() => {
    if (!urlUid) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [urlUid]);

  useDebounceEffect(
    () => {
      if (
        !handler ||
        String(handler).toLocaleLowerCase() ===
        String(urlUid).toLocaleLowerCase()
      ) {
        setLoading(false);
      }
    },
    [urlUid, handler, placementTrackingEl],
    {
      wait: 20,
    }
  );

  // 可选：对 follow 按钮点击进行回调通知（防抖）
  useDebounceEffect(
    () => {
      if (
        !urlUid ||
        !placementTrackingEl ||
        !options?.onFollowBtnClick ||
        options?.ready === false
      ) {
        return;
      }

      if (
        options?.shouldAttach &&
        !options.shouldAttach({
          handler: urlUid,
        })
      ) {
        return;
      }
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        const clickedFollowBtn = target?.closest(
          'button[data-testid$="-follow"], button[data-testid$="-unfollow"], button[data-testid*="-follow"], button[data-testid*="-unfollow"]'
        ) as HTMLElement | null;

        const followBtn =
          clickedFollowBtn ||
          (placementTrackingEl.querySelector(
            'button[data-testid$="-follow"], button[data-testid$="-unfollow"], button[data-testid*="-follow"], button[data-testid*="-unfollow"]'
          ) as HTMLElement | null);

        const testId = followBtn?.getAttribute('data-testid') || '';
        const isFollowBtn = testId.includes('follow');
        const isUnfollowBtn = testId.includes('unfollow');
        let wasFollow = isFollowBtn && !isUnfollowBtn;
        let wasUnfollow = isUnfollowBtn;

        if (!wasFollow && !wasUnfollow && followBtn) {
          const btnText = (followBtn.textContent || '').toLowerCase();
          const btnAria = (followBtn.getAttribute('aria-label') || '').toLowerCase();
          const followingKeywords = [
            'following',
            'siguiendo',
            'フォロー中',
            '正在关注',
            '正在追蹤',
            '팔로잉',
            'abonné',
            'folge ich',
            'читаю',
          ];
          if (followingKeywords.some(k => btnText.includes(k) || btnAria.includes(k))) {
            wasUnfollow = true;
          } else {
            wasFollow = true;
          }
        }

        // Plan B: invalidate cache for currentUrl before reading fresh DOM
        _placementInfoCache.delete(currentUrl);
        requestAnimationFrame(() => {
          const info = getPlacementTrackingInfo({
            currentUrl,
            el: placementTrackingEl,
            noCached: true,
          });
          const targetHandler = info.handler || urlUid || '';
          if (targetHandler) {
            let nextFollowState: 'follow' | 'unfollow';
            if (wasFollow) {
              nextFollowState = 'follow';
            } else if (wasUnfollow) {
              nextFollowState = 'unfollow';
            } else {
              nextFollowState =
                info.followState === 'unfollow' ? 'follow' : 'unfollow';
            }

            const payload: {
              followState: 'follow' | 'unfollow';
              twitterId: string;
              handler: string;
            } = {
              followState: nextFollowState,
              twitterId: info.twitterId || '',
              handler: targetHandler,
            };
            options?.onFollowBtnClick?.(payload);
          }
        });
      };

      placementTrackingEl.addEventListener('click', handleClick);
      return () =>
        placementTrackingEl.removeEventListener('click', handleClick);
    },
    [
      placementTrackingEl,
      options?.onFollowBtnClick,
      options?.shouldAttach,
      currentUrl,
      urlUid,
      options?.ready,
    ],
    { wait: 200 }
  );
  return {
    currentUrl,
    urlUid,
    twitterId,
    handler,
    displayName,
    avatar,
    isFollowing,
    followState,
    placementTrackingEl,
    followButton,
    loading,
    isEmptyState: !!emptyStateDom,
  };
}


export function getUserProfileSchemaInfo(el?: Element | null): {
  twitterId: string;
  handler: string;
  displayName: string;
  avatar: string;
} | null {
  const schemaEl =
    el ||
    document.querySelector(USER_PROFILE_SCHEMA_SELECTOR);

  if (!schemaEl?.textContent) return null;

  try {
    const data = JSON.parse(schemaEl.textContent || '{}');
    const person = data?.mainEntity;
    if (!person) return null;

    const urlHandler =
      typeof person.url === 'string'
        ? extractUsernameFromUrl(person.url) || ''
        : '';

    return {
      twitterId: String(person.identifier || ''),
      handler: person.additionalName || urlHandler || '',
      displayName: person.name || '',
      avatar: person.image?.contentUrl || person.image?.thumbnailUrl || '',
    };
  } catch {
    return null;
  }
}

let _cacheUrl: string | undefined;
let _lastEl: HTMLElement | null = null;
const _elIdCache = new WeakMap<HTMLElement, string>();

export function getPlacementTrackingTwitterId(options?: {
  currentUrl?: string;
  el?: HTMLElement | null;
}): string | undefined {
  const currentUrl = options?.currentUrl;
  const urlUid = extractUsernameFromUrl(currentUrl || '');
  if (!urlUid) return '';
  const el =
    options?.el ||
    (document.querySelector(
      'div[data-testid="primaryColumn"] div[data-testid="placementTracking"]'
    ) as HTMLElement | null);

  if (currentUrl === _cacheUrl && el && _lastEl === el) {
    const cached = _elIdCache.get(el);
    if (cached) return cached;
  }

  const followButton = el?.querySelector(
    'button[data-testid$="-follow"], button[data-testid$="-unfollow"], button[data-testid*="-follow"], button[data-testid*="-unfollow"]'
  ) as HTMLElement | null;
  const testId = followButton?.getAttribute('data-testid') || '';
  const match = testId.match(/^(\d+)-/);
  const id = match ? match[1] : undefined;

  _cacheUrl = currentUrl;
  _lastEl = el || null;
  if (el && id) _elIdCache.set(el, id);

  return id;
}

export function getFollowButtonHandler(options?: {
  el?: HTMLElement | null;
}): string | undefined {
  const el =
    options?.el ||
    (document.querySelector(
      'div[data-testid="primaryColumn"] div[data-testid="placementTracking"]'
    ) as HTMLElement | null);
  const followButton = el?.querySelector(
    'button[data-testid$="-follow"], button[data-testid$="-unfollow"], button[data-testid*="-follow"], button[data-testid*="-unfollow"]'
  ) as HTMLElement | null;
  const aria = followButton?.getAttribute('aria-label') || '';
  const m = aria.match(/@([A-Za-z0-9_]+)/);
  return m ? m[1] : undefined;
}

interface _PlacementInfoCacheItem {
  twitterId: string;
  handler: string;
  displayName: string;
  avatar: string;
}
const _placementInfoCache = new Map<string, _PlacementInfoCacheItem>();

export const clearPlacementInfoCache = () => {
  _placementInfoCache.clear();
};
const _CACHE_KEY = '@xhunt/placementInfoCacheV2';
(async () => {
  try {
    const entries = (await localStorageInstance.get(_CACHE_KEY)) as
      | [string, _PlacementInfoCacheItem][]
      | undefined;
    if (Array.isArray(entries)) {
      _placementInfoCache.clear();
      for (const [k, v] of entries) {
        if (k && v && v.twitterId && v.handler) {
          _placementInfoCache.set(k, {
            twitterId: v.twitterId,
            handler: v.handler,
            displayName: v.displayName || '',
            avatar: v.avatar || '',
          });
        }
      }
      while (_placementInfoCache.size > 20) {
        const firstKey = _placementInfoCache.keys().next().value as string;
        if (firstKey) _placementInfoCache.delete(firstKey);
      }
    }
  } catch { }
})();

export function getPlacementTrackingInfo(options?: {
  currentUrl?: string;
  el?: HTMLElement | null;
  noCached?: boolean;
}): {
  twitterId: string;
  handler: string;
  displayName: string;
  avatar: string;
  followState: FollowState;
} {
  const currentUrl = options?.currentUrl || window.location.href;
  const urlUid = extractUsernameFromUrl(currentUrl || '');
  if (!urlUid)
    return {
      twitterId: '',
      handler: '',
      displayName: '',
      avatar: '',
      followState: null,
    };
  const cached = _placementInfoCache.get(currentUrl);

  const el =
    options?.el ||
    (document.querySelector(
      'div[data-testid="primaryColumn"] div[data-testid="placementTracking"]'
    ) as HTMLElement | null);
  // 从同一 DOM 子树中精确提取 followButton（过滤掉 userActions、sendDM 等其他按钮）
  const followButton = el?.querySelector(
    'button[data-testid$="-follow"], button[data-testid$="-unfollow"], button[data-testid*="-follow"], button[data-testid*="-unfollow"]'
  ) as HTMLElement | null;
  const testId = followButton?.getAttribute('data-testid') || '';
  const match = testId.match(/^(\d+)-/);
  const twitterId = match ? match[1] : (cached?.twitterId || '');

  // 从 followButton 的 aria-label 中提取 handler，例如 "Follow @cz_binance"
  let handler: string = '';
  const aria = followButton?.getAttribute('aria-label') || '';
  const m = aria.match(/@([A-Za-z0-9_]+)/);
  if (m && m[1]) {
    handler = m[1];
  }

  // Fallback 1: 如果 aria-label 提取失败，尝试从 URL 提取
  if (!handler && urlUid) {
    handler = urlUid;
  }

  // Fallback 2: 从缓存提取
  if (!handler && cached?.handler) {
    handler = cached.handler;
  }

  // Fallback 3: 从 UserName DOM 区域提取
  if (!handler) {
    const userNameEl = document.querySelector('main [data-testid="UserName"]');
    if (userNameEl?.textContent) {
      const textMatch = userNameEl.textContent.match(/@([A-Za-z0-9_]+)/);
      if (textMatch?.[1]) {
        handler = textMatch[1];
      }
    }
  }

  // 解析 followState：unfollow 代表当前已关注，follow 代表未关注
  let followState: FollowState = null;
  if (testId.includes('unfollow')) {
    followState = 'unfollow';
  } else if (testId.includes('follow')) {
    followState = 'follow';
  } else if (followButton) {
    // Fallback：通过按钮文本或 aria-label 判断
    const buttonText = followButton?.textContent?.toLowerCase() || '';
    const ariaLower = aria.toLowerCase();
    // 多语言 "Following" 关键词（补充繁体中文、韩语等）
    const followingKeywords = [
      'following',
      'siguiendo',
      'フォロー中',
      '正在关注',
      '正在追蹤',
      '팔로잉',
      'abonné',
      'folge ich',
      'читаю',
    ];
    const followKeywords = [
      'follow',
      'seguir',
      'フォロー',
      '关注',
      '追蹤',
      '팔로우',
      "s'abonner",
      'folgen',
      'читать',
    ];

    if (followingKeywords.some(k => buttonText.includes(k) || ariaLower.includes(k))) {
      followState = 'unfollow';
    } else if (followKeywords.some(k => buttonText.includes(k) || ariaLower.includes(k))) {
      followState = 'follow';
    }
  }

  // 如果命中了静态信息缓存且没有要求 noCached
  // 注意：followState 必须始终由当前 DOM 实时计算，禁止从缓存读取，防止跨账号污染
  if (
    cached &&
    cached.twitterId &&
    cached.handler &&
    cached.avatar &&
    !options?.noCached
  ) {
    return {
      ...cached,
      followState,
    };
  }

  // 提取 displayName 与 avatar（同 domUserExtractor 的优先级）
  let displayName = '';
  let avatar = '';

  // 优先使用 data-testid 结构（优先匹配 handler 定位的照片链接，再回退通用 img）
  const avatarImg = document.querySelector(
    `div[data-testid="primaryColumn"] [data-testid*="UserAvatar-Container"] a[href="/${handler}/photo"] img`
  ) as HTMLImageElement | null;
  if (avatarImg?.src) {
    avatar = avatarImg.src;
  }
  const nameInfoDiv = document.querySelector(
    'main [data-testid="UserName"]'
  ) as HTMLDivElement | null;

  if (nameInfoDiv?.textContent) {
    const nameAllText = nameInfoDiv.textContent || '@';
    const parts = nameAllText.split('@');
    if (parts.length > 1) {
      displayName = parts[0].trim();
    }
  }

  const result: _PlacementInfoCacheItem = {
    twitterId,
    handler,
    displayName,
    avatar,
  };
  if (twitterId && handler && avatar) {
    if (_placementInfoCache.has(currentUrl))
      _placementInfoCache.delete(currentUrl);
    _placementInfoCache.set(currentUrl, result);
    if (_placementInfoCache.size > 50) {
      const firstKey = _placementInfoCache.keys().next().value as string;
      if (firstKey) _placementInfoCache.delete(firstKey);
    }
    (async () => {
      try {
        await localStorageInstance.set(
          _CACHE_KEY,
          Array.from(_placementInfoCache.entries())
        );
      } catch { }
    })();
  }
  return {
    ...result,
    followState,
  };
}
