import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import useWaitForElement from './useWaitForElement';
import useCurrentUrl from './useCurrentUrl';
import { extractUsernameFromUrl } from '~contents/utils';
import { localStorageInstance } from '~storage/index';
import { useDebounceEffect, useRequest } from 'ahooks';
import { getCurrentUserInfo } from '~contents/utils/helpers';
import { fetchTwitterInfoNew } from '~contents/services/api';
import { useLocalStorage } from '~storage/useLocalStorage';
import { resolveProfileDom } from '~contents/utils/xDomAdapter';
import { useGlobalMutationObserver } from './useGlobalMutationObserver';

/**
 * 返回当前 profile 页的推特 handler, Twitter ID 和加载状态。
 */
type FollowState = 'follow' | 'unfollow' | null;

const USER_PROFILE_SCHEMA_SELECTOR =
  'script[type="application/ld+json"][data-testid="UserProfileSchema-test"]';
const PROFILE_EMPTY_STATE_SELECTOR =
  'div[data-testid="emptyState"], main div.mx-auto.my-10.flex.w-full.flex-col.items-center.text-center:has(> h2.text-headline1 + p.text-body)';

const containsProfileEmptyState = (node: Node): boolean =>
  node instanceof Element &&
  (node.matches(PROFILE_EMPTY_STATE_SELECTOR) ||
    Boolean(node.querySelector(PROFILE_EMPTY_STATE_SELECTOR)));

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
  const [profileDomRevision, setProfileDomRevision] = useState(0);
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
  const editProfileButtonEl = useWaitForElement(
    'main a[data-testid="editProfileButton"]',
    [currentUrl]
  );
  const userProfileSchemaEl = useWaitForElement(
    USER_PROFILE_SCHEMA_SELECTOR,
    [currentUrl]
  );
  const newProfileAnchorEl = useWaitForElement(
    'main a[href$="/photo"], main a[href$="/header_photo"]',
    [currentUrl]
  );

  // 新版 X 的 SPA 切换有时会复用同一个 Profile 节点，仅修改 href/src。
  // useWaitForElement 对同一节点不会再次通知，因此单独监听资料头的语义属性变化，
  // 强制重新解析当前 KOL，避免 profileDom 永远停留在 unknown 导致 loading 卡死。
  useGlobalMutationObserver(
    () => setProfileDomRevision((revision) => revision + 1),
    {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ['href', 'src'],
    },
    {
      debounce: 60,
      filter: (mutation) => {
        if (!urlUid) return false;

        if (
          mutation.type === 'childList' &&
          [...mutation.addedNodes, ...mutation.removedNodes].some(
            containsProfileEmptyState,
          )
        ) {
          return true;
        }

        const target =
          mutation.target instanceof Element
            ? mutation.target
            : mutation.target.parentElement;
        if (!target?.closest('main') || target.closest('article')) return false;

        const isCurrentProfileAnchor = (element: Element): boolean => {
          const anchor =
            element instanceof HTMLAnchorElement
              ? element
              : element.closest<HTMLAnchorElement>('a[href]');
          if (!anchor) return false;
          const pathname = anchor.pathname.toLocaleLowerCase();
          return (
            pathname === `/${urlUid}/photo` ||
            pathname === `/${urlUid}/header_photo` ||
            pathname === `/${urlUid}/following`
          );
        };

        if (mutation.type === 'attributes') {
          return isCurrentProfileAnchor(target);
        }

        if (mutation.type === 'characterData') {
          return Boolean(target.closest('h1') && !target.closest('article'));
        }

        // 仅响应当前资料头语义节点的增删，避免插件自己在 main 下挂载 Portal
        // 时反复触发 profileDomRevision，形成 MutationObserver 反馈循环。
        return Array.from(mutation.addedNodes).some((node) => {
          if (!(node instanceof Element)) return false;
          if (isCurrentProfileAnchor(node)) return true;
          return Array.from(node.querySelectorAll('a[href]')).some(
            isCurrentProfileAnchor,
          );
        });
      },
    },
    [urlUid],
  );

  // useWaitForElement 找到节点后会停止订阅，无法感知新版 X 在 SPA 切换时
  // 移除 empty state。由上面的全局 DOM revision 驱动实时查询，避免状态串页。
  const isEmptyState = Boolean(
    document.querySelector(PROFILE_EMPTY_STATE_SELECTOR),
  );

  const profileDom = useMemo(
    () => resolveProfileDom(urlUid),
    [
      currentUrl,
      urlUid,
      placementTrackingEl,
      avatarImgEl,
      editProfileButtonEl,
      userProfileSchemaEl,
      newProfileAnchorEl,
      profileDomRevision,
    ]
  );
  const resolvedPlacementTrackingEl =
    profileDom.actionHost || placementTrackingEl;
  const profileDomMatchesUrl = useMemo(() => {
    const avatarHref = profileDom.avatarImg
      ?.closest<HTMLAnchorElement>('a[href]')
      ?.getAttribute('href');
    let avatarHandler = '';
    try {
      avatarHandler = String(
        extractUsernameFromUrl(
          avatarHref ? new URL(avatarHref, window.location.origin).href : '',
        ),
      ).toLocaleLowerCase();
    } catch {
      avatarHandler = '';
    }
    return Boolean(urlUid && avatarHandler && avatarHandler === urlUid);
  }, [profileDom.avatarImg, urlUid]);

  // src/href 更新后图片本身可能仍在加载；load/error 不一定继续产生 DOM mutation，
  // 因此在头像或 banner 加载结束时主动触发一次资料头复核。
  useEffect(() => {
    const pendingImages = [profileDom.avatarImg, profileDom.bannerImg].filter(
      (image): image is HTMLImageElement => Boolean(image && !image.complete),
    );
    if (pendingImages.length === 0) return;

    const handleSettled = () => {
      setProfileDomRevision((revision) => revision + 1);
    };
    pendingImages.forEach((image) => {
      image.addEventListener('load', handleSettled, { once: true });
      image.addEventListener('error', handleSettled, { once: true });
    });
    return () => {
      pendingImages.forEach((image) => {
        image.removeEventListener('load', handleSettled);
        image.removeEventListener('error', handleSettled);
      });
    };
  }, [profileDom.avatarImg, profileDom.bannerImg, urlUid]);

  const followButton = useMemo<HTMLButtonElement | null | undefined>(() => {
    if (!urlUid) return undefined;
    return profileDom.followButton || undefined;
  }, [profileDom.followButton, urlUid]);

  const [infoState, setInfoState] = useState({
    twitterId: '',
    handler: '',
    displayName: '',
    avatar: '',
    followState: null as FollowState,
  });
  const [loading, setLoading] = useState(true);

  // Twitter ID 可能先于资料头 DOM 到达。资料头晚到时补齐名称/头像，
  // 但只合并当前 URL 对应的用户，绝不能用上一位用户的资料覆盖。
  useEffect(() => {
    if (!urlUid || !profileDomMatchesUrl) return;

    setInfoState((previous) => {
      const previousMatchesUrl =
        !previous.handler ||
        previous.handler.toLocaleLowerCase() === urlUid.toLocaleLowerCase();
      if (!previousMatchesUrl) return previous;

      const displayName = profileDom.displayName || previous.displayName;
      const avatar = profileDom.avatar || previous.avatar;
      const handler = previous.handler || profileDom.handler || urlUid;
      if (
        displayName === previous.displayName &&
        avatar === previous.avatar &&
        handler === previous.handler
      ) {
        return previous;
      }

      return {
        ...previous,
        handler,
        displayName,
        avatar,
      };
    });
  }, [
    profileDom.avatar,
    profileDom.displayName,
    profileDom.handler,
    profileDomMatchesUrl,
    urlUid,
  ]);

  useEffect(() => {
    if (!urlUid) return;

    const timer = window.setTimeout(() => {
      setLoading((currentLoading) => {
        if (!currentLoading) return currentLoading;
        return false;
      });
    }, 12_000);

    return () => window.clearTimeout(timer);
  }, [urlUid]);

  // URL 一变化就在浏览器绘制前清空上一位用户，避免 SPA 过渡期展示旧资料。
  useLayoutEffect(() => {
    setInfoState({
      twitterId: '',
      handler: '',
      displayName: '',
      avatar: '',
      followState: null,
    });
    setLoading(Boolean(urlUid));
  }, [urlUid]);

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
            const currentUserMatchesUrl =
              String(currentUserHandler).toLocaleLowerCase() ===
              String(urlUid).toLocaleLowerCase();
            const shouldUseProfileSchema =
              !currentUserMatchesUrl;
            const rawSchemaInfo = shouldUseProfileSchema
              ? getUserProfileSchemaInfo(userProfileSchemaEl)
              : null;
            const schemaInfo =
              rawSchemaInfo &&
              String(rawSchemaInfo.handler).toLocaleLowerCase() ===
                String(urlUid).toLocaleLowerCase()
                ? rawSchemaInfo
                : null;
            if (!cancelled) {
              setInfoState({
                twitterId:
                  profileDom.twitterId ||
                  schemaInfo?.twitterId ||
                  (currentUserMatchesUrl ? userInfo?.id_str : '') ||
                  '',
                handler:
                  schemaInfo?.handler ||
                  (currentUserMatchesUrl ? currentUserHandler : '') ||
                  urlUid,
                displayName:
                  schemaInfo?.displayName ||
                  (currentUserMatchesUrl ? userInfo?.name : '') ||
                  (profileDomMatchesUrl ? profileDom.displayName : '') ||
                  '',
                avatar:
                  schemaInfo?.avatar ||
                  (currentUserMatchesUrl
                    ? userInfo?.profile_image_url_https
                    : '') ||
                  (profileDomMatchesUrl ? profileDom.avatar : '') ||
                  '',
                followState: profileDomMatchesUrl
                  ? profileDom.followState
                  : null,
              });
            }
          } catch {
            if (!cancelled) {
              setInfoState((previous) => {
                const previousMatchesUrl =
                  !previous.handler ||
                  previous.handler.toLocaleLowerCase() ===
                    urlUid.toLocaleLowerCase();
                return {
                  // 新版资料 DOM 会短暂缺少 ID；同一 URL 已确认的身份不能降级为空。
                  twitterId: previousMatchesUrl ? previous.twitterId : '',
                  handler: urlUid,
                  displayName:
                    (profileDomMatchesUrl ? profileDom.displayName : '') ||
                    (previousMatchesUrl ? previous.displayName : ''),
                  avatar:
                    (profileDomMatchesUrl ? profileDom.avatar : '') ||
                    (previousMatchesUrl ? previous.avatar : ''),
                  followState:
                    (profileDomMatchesUrl ? profileDom.followState : null) ||
                    (previousMatchesUrl ? previous.followState : null),
                };
              });
            }
          }
          return;
        }

        const info = getPlacementTrackingInfo({
          currentUrl,
          el: resolvedPlacementTrackingEl,
          noCached: true,
        });
        const infoMatchesUrl =
          String(info.handler).toLocaleLowerCase() ===
          String(urlUid).toLocaleLowerCase();
        const domTwitterId =
          (infoMatchesUrl ? info.twitterId : '') || profileDom.twitterId;
        const shouldUseProfileSchema = !domTwitterId;
        const rawSchemaInfo = shouldUseProfileSchema
          ? getUserProfileSchemaInfo(userProfileSchemaEl)
          : null;
        const schemaInfo =
          rawSchemaInfo &&
          String(rawSchemaInfo.handler).toLocaleLowerCase() ===
            String(urlUid).toLocaleLowerCase()
            ? rawSchemaInfo
            : null;
        const twitterId = domTwitterId || schemaInfo?.twitterId || '';
        const handler =
          schemaInfo?.handler ||
          (infoMatchesUrl ? info.handler : '') ||
          urlUid ||
          '';

        if (!cancelled && twitterId) {
          setInfoState({
            twitterId,
            handler,
            displayName:
              schemaInfo?.displayName ||
              (profileDomMatchesUrl ? profileDom.displayName : '') ||
              (infoMatchesUrl ? info.displayName : ''),
            avatar:
              schemaInfo?.avatar ||
              (profileDomMatchesUrl ? profileDom.avatar : '') ||
              (infoMatchesUrl ? info.avatar : ''),
            followState:
              (profileDomMatchesUrl ? profileDom.followState : null) ||
              (infoMatchesUrl ? info.followState : null),
          });
        } else if (!cancelled) {
          setInfoState((previous) => {
            const previousMatchesUrl =
              !previous.handler ||
              previous.handler.toLocaleLowerCase() ===
                urlUid.toLocaleLowerCase();
            return {
              // 新版 X 会反复替换资料头节点。后到的临时 DOM 解析不到 ID 时，
              // 保留同一 URL 已由 banner/API/Schema 确认的 ID，避免 ready 反复 true/false。
              twitterId: previousMatchesUrl ? previous.twitterId : '',
              handler,
              displayName:
                schemaInfo?.displayName ||
                (profileDomMatchesUrl ? profileDom.displayName : '') ||
                (infoMatchesUrl ? info.displayName : '') ||
                (previousMatchesUrl ? previous.displayName : '') ||
                '',
              avatar:
                schemaInfo?.avatar ||
                (profileDomMatchesUrl ? profileDom.avatar : '') ||
                (infoMatchesUrl ? info.avatar : '') ||
                (previousMatchesUrl ? previous.avatar : '') ||
                '',
              followState:
                (profileDomMatchesUrl ? profileDom.followState : null) ||
                (infoMatchesUrl ? info.followState : null) ||
                (previousMatchesUrl ? previous.followState : null) ||
                null,
            };
          });
        }
      })();

      return () => {
        cancelled = true;
      };
    },
    [
      followButton,
      resolvedPlacementTrackingEl,
      currentUrl,
      urlUid,
      avatarImgEl,
      editProfileButtonEl,
      isEmptyState,
      isCurrentUser,
      userProfileSchemaEl,
      profileDom,
      profileDomMatchesUrl,
    ],
    { wait: 200, leading: true, trailing: true }
  );

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

      if (
        !urlUid ||
        infoState.twitterId ||
        (profileDom.variant !== 'new' && !isEmptyState)
      ) {
        return;
      }
      runFetchAsync(urlUid)
        .then((apiInfo) => {
          if (!cancelled) {
            const apiMatchesUrl =
              !apiInfo?.username ||
              String(apiInfo.username).toLocaleLowerCase() ===
                String(urlUid).toLocaleLowerCase();
            setInfoState((previous) => ({
              twitterId:
                (apiMatchesUrl ? apiInfo?.id : '') || previous.twitterId || '',
              handler:
                (apiMatchesUrl ? apiInfo?.username : '') ||
                previous.handler ||
                urlUid ||
                '',
              displayName:
                (apiMatchesUrl ? apiInfo?.name : '') ||
                (apiMatchesUrl ? apiInfo?.profile?.name : '') ||
                (apiMatchesUrl ? apiInfo?.username : '') ||
                previous.displayName,
              avatar:
                (apiMatchesUrl ? apiInfo?.profile?.profile_image_url : '') ||
                previous.avatar,
              followState: previous.followState,
            }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setInfoState((previous) => ({
              ...previous,
              handler: previous.handler || urlUid || '',
            }));
          }
        })
        .finally(() => {
          if (!cancelled && isEmptyState) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
        cancelFetch();
      };
    },
    [
      isEmptyState,
      urlUid,
      infoState.twitterId,
      profileDom.variant,
    ],
    {
      wait: 300,
      leading: false,
      trailing: true,
    }
  );

  const { twitterId, handler, displayName, avatar, followState } = infoState;

  const isFollowing = useMemo(() => followState === 'unfollow', [followState]);

  // 自己的资料页没有关注按钮身份链；“当前登录账号 + 编辑资料按钮”是更明确的
  // 页面归属信号。仍继续等待头像和 banner settled，避免放松 SPA 切换保护。
  const currentUserProfileMatches = Boolean(
    isCurrentUser && editProfileButtonEl,
  );
  const profileDomBelongsToTarget =
    profileDomMatchesUrl || currentUserProfileMatches;
  const profileDomIdentityMatches =
    currentUserProfileMatches ||
    !twitterId ||
    !profileDom.twitterId ||
    String(profileDom.twitterId) === String(twitterId);
  const isProfileVisualReady = Boolean(
    urlUid &&
      profileDomBelongsToTarget &&
      profileDom.avatarImg?.complete &&
      (!profileDom.bannerImg || profileDom.bannerImg.complete) &&
      profileDomIdentityMatches,
  );

  useDebounceEffect(
    () => {
      if (
        !urlUid ||
        (twitterId &&
          String(handler).toLocaleLowerCase() ===
            String(urlUid).toLocaleLowerCase() &&
          isProfileVisualReady)
      ) {
        setLoading(false);
      }
    },
    [urlUid, twitterId, handler, isProfileVisualReady],
    {
      wait: 20,
    }
  );

  // 可选：对 follow 按钮点击进行回调通知（防抖）
  useDebounceEffect(
    () => {
      if (
        !urlUid ||
        !resolvedPlacementTrackingEl ||
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
        const clickedButton = target?.closest('button') as HTMLButtonElement | null;
        if (!clickedButton) return;

        const clickedLegacyFollowBtn = target?.closest(
          'button[data-testid$="-follow"], button[data-testid$="-unfollow"], button[data-testid*="-follow"], button[data-testid*="-unfollow"]'
        ) as HTMLButtonElement | null;
        const followBtn = profileDom.followButton || clickedLegacyFollowBtn;
        if (!followBtn || clickedButton !== followBtn) return;

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
            el: resolvedPlacementTrackingEl,
            noCached: true,
          });
          const targetHandler =
            info.handler || profileDom.handler || handler || urlUid || '';
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
              twitterId: info.twitterId || twitterId || '',
              handler: targetHandler,
            };
            options?.onFollowBtnClick?.(payload);
          }
        });
      };

      resolvedPlacementTrackingEl.addEventListener('click', handleClick);
      return () =>
        resolvedPlacementTrackingEl.removeEventListener('click', handleClick);
    },
    [
      resolvedPlacementTrackingEl,
      options?.onFollowBtnClick,
      options?.shouldAttach,
      currentUrl,
      urlUid,
      handler,
      twitterId,
      profileDom.followButton,
      profileDom.handler,
      profileDom.followState,
      options?.ready,
    ],
    { wait: 200 }
  );
  const infoMatchesCurrentUrl =
    !urlUid ||
    String(handler).toLocaleLowerCase() ===
      String(urlUid).toLocaleLowerCase();
  const profileLoading =
    Boolean(urlUid) && (loading || !infoMatchesCurrentUrl);
  const canExposeProfile = !profileLoading;

  return {
    currentUrl,
    urlUid,
    twitterId: infoMatchesCurrentUrl ? twitterId || undefined : undefined,
    handler: infoMatchesCurrentUrl && canExposeProfile ? handler : '',
    displayName: infoMatchesCurrentUrl && canExposeProfile ? displayName : '',
    avatar: infoMatchesCurrentUrl && canExposeProfile ? avatar : '',
    isFollowing: infoMatchesCurrentUrl && canExposeProfile ? isFollowing : false,
    followState: infoMatchesCurrentUrl && canExposeProfile ? followState : null,
    placementTrackingEl: resolvedPlacementTrackingEl,
    followButton: canExposeProfile ? followButton : undefined,
    loading: profileLoading,
    isEmptyState,
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
