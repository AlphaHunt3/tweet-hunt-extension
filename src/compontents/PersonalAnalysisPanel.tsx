import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Info, X, Ghost, Loader2 } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useLockFn, useRequest } from 'ahooks';
import {
  fetchFollowRelation,
  fetchHistoricalTweets,
  fetchFansRank,
  fetchUnfollowRelation,
  getTwitterAuthUrl,
} from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import { usePlacementTrackingContext } from '~contents/contexts/PlacementTrackingContext.tsx';
import { Tabs } from '~/compontents/Tabs.tsx';
import { FollowRelationPanel } from '~/compontents/FollowRelationPanel.tsx';
import { UnfollowInfoPanel } from '~/compontents/UnfollowInfoPanel.tsx';
import { ProfileChangesPanel } from '~compontents/ProfileChangesPanel.tsx';
import { DeletedTweetsSection } from '~/compontents/DeletedTweetsSection.tsx';
import { InteractionRankPanel } from '~/compontents/InteractionRankPanel.tsx';
import {
  FanTipPanelEventDetail,
  XHUNT_FAN_TIP_PANEL_EVENT,
} from '~/compontents/FanTipPanel.tsx';
import {
  GhostFollowingPanelEventDetail,
  GHOST_FOLLOWING_PANEL_EVENT,
} from './area/GhostFollowingPanel';
import { FollowRelationData } from '~types';
import { localStorageInstance } from '~storage/index.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { CloseConfirmDialog } from './CloseConfirmDialog';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { StoredUserInfo } from '~types/review.ts';
import { isLegacyUserActive } from '~/utils/legacyUserCheck.ts';

export interface PersonalAnalysisPanelProps {
  userId: string;
  newTwitterData: any;
  loadingTwInfo: boolean;
  className?: string;
}

// ahooks 会在 refreshDeps 变化时保留上一轮 data；携带请求身份，确保旧用户
// 的结果即使仍在 state 中，也不会参与当前用户的计数或列表渲染。
interface ScopedRequestResult<T> {
  key: string;
  data: T;
}

export function PersonalAnalysisPanel({
  userId,
  newTwitterData,
  loadingTwInfo,
  className = '',
}: PersonalAnalysisPanelProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { t, lang } = useI18n();
  const currentUrl = useCurrentUrl();
  const { isEnabled } = useCrossPageSettings();
  const [user] = useLocalStorage<StoredUserInfo | null | ''>(
    '@xhunt/user',
    null
  );
  const userObj = user && typeof user === 'object' ? user : null;
  const [currentUsername] = useLocalStorage('@xhunt/current-username', '');
  const isLegacyUser = isLegacyUserActive(currentUsername);
  const [isGhostPanelOpen, setIsGhostPanelOpen] = useState(false);
  const ghostButtonRef = useRef<HTMLButtonElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const stableContentHeightRef = useRef(240);

  const redirectToLogin = useLockFn(async () => {
    try {
      const ret = await getTwitterAuthUrl();
      if (ret?.url) {
        openNewTab(ret.url);
      }
    } catch (err) {
      console.error('[PersonalAnalysisPanel] Failed to redirect to login:', err);
    }
  });

  // 判断是否在当前用户的个人页面
  const isOwnProfile = useMemo(() => {
    if (!currentUsername || !userId) return false;
    return currentUsername.toLowerCase() === userId.toLowerCase();
  }, [currentUsername, userId]);
  const [activeTab, setActiveTab] = useState<
    | 'follows'
    | 'followers'
    | 'unfollowing'
    | 'profile'
    | 'deletedTweets'
    | 'interactionRank'
  >('follows');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [interactionRankDays, setInteractionRankDays] = useState<'7' | '30'>(
    '7'
  );
  // Track if we've ever had interaction rank data to prevent tab from disappearing during loading
  const [hasInteractionRankData, setHasInteractionRankData] = useState(false);

  const placementCtx = usePlacementTrackingContext();
  const hookUrlUid = placementCtx?.urlUid || '';
  const hookUsername = placementCtx?.handler || '';
  // URL 是 SPA 切换时最先且只变化一次的身份来源；DOM/Schema 的 handler 会
  // 分阶段到达，不能用来驱动整块面板重复进入过渡态。
  const profileRequestKey = (hookUrlUid || hookUsername).toLocaleLowerCase();
  const hookName = placementCtx?.displayName || '';
  const hookAvatar = placementCtx?.avatar || '';
  const hookLoading = placementCtx?.loading || false;
  const twitterId = placementCtx?.twitterId;
  const isEmptyState = placementCtx?.isEmptyState || false;
  // SPA 切换时 newTwitterData 可能短暂保留旧用户，只允许用户名匹配的数据参与兜底。
  const apiUserMatchesHook =
    Boolean(hookUsername) &&
    String(newTwitterData?.username || '').toLocaleLowerCase() ===
      hookUsername.toLocaleLowerCase();
  const domUserInfo = useMemo(
    () =>
      hookUsername
        ? {
          username: hookUsername,
          name:
            hookName ||
            (apiUserMatchesHook ? newTwitterData?.name || '' : '') ||
            hookUsername,
          avatar:
            hookAvatar ||
            (apiUserMatchesHook
              ? newTwitterData?.profile?.profile_image_url || ''
              : ''),
          source: 'data-testid' as const,
        }
        : null,
    [
      apiUserMatchesHook,
      hookUsername,
      hookName,
      hookAvatar,
      newTwitterData?.name,
      newTwitterData?.profile?.profile_image_url,
    ]
  );
  const domUserInfoLoading = hookLoading;
  const domUserInfoKey = profileRequestKey;
  const [isDomUserInfoSettling, setIsDomUserInfoSettling] = useState(false);

  useEffect(() => {
    if (!domUserInfoKey) return;

    setIsDomUserInfoSettling(true);
    const timer = window.setTimeout(() => {
      setIsDomUserInfoSettling(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [domUserInfoKey]);

  // Auto switch to deletedTweets tab when isEmptyState exists
  useEffect(() => {
    if (isEmptyState) {
      setActiveTab('deletedTweets');
    }
  }, [isEmptyState]);

  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [currentUrl]);

  // Fetch data to get counts
  const { data: followRelationResult } = useRequest<
    ScopedRequestResult<FollowRelationData | undefined> | undefined,
    []
  >(
    async () => {
      const requestTwitterId = twitterId;
      const requestProfileKey = profileRequestKey;
      if (!requestTwitterId || !requestProfileKey) return undefined;
      return {
        key: requestProfileKey,
        data: await fetchFollowRelation(requestTwitterId),
      };
    },
    {
      // 新版 X 的 twitterId 会晚于 URL 到达；ID 未准备好时不能发空参数请求。
      ready: !!twitterId && !!profileRequestKey,
      refreshDeps: [twitterId, profileRequestKey],
      debounceWait: 300,
    },
  );
  const isFollowRelationCurrent =
    Boolean(profileRequestKey) &&
    followRelationResult?.key === profileRequestKey;
  const followRelationData = isFollowRelationCurrent
    ? followRelationResult?.data
    : undefined;
  // 同一用户的后台刷新继续展示已归属当前身份的数据；只有身份不匹配时才
  // 回到 loading，保证一次切换严格保持 loading → ready 的单向过渡。
  const loadingFollowRelation =
    Boolean(profileRequestKey) &&
    (hookLoading || (Boolean(twitterId) && !isFollowRelationCurrent));

  // Fetch unfollow relation data
  const { data: unfollowRelationResult } = useRequest(
    async () => {
      const requestTwitterId = twitterId;
      const requestProfileKey = profileRequestKey;
      if (!requestTwitterId || !requestProfileKey) return undefined;
      return {
        key: requestProfileKey,
        data: await fetchUnfollowRelation(requestTwitterId, 30, 0),
      } satisfies ScopedRequestResult<
        Awaited<ReturnType<typeof fetchUnfollowRelation>>
      >;
    },
    {
      ready: !!twitterId && !!profileRequestKey,
      refreshDeps: [twitterId, profileRequestKey],
      debounceWait: 300,
    },
  );
  const isUnfollowRelationCurrent =
    Boolean(profileRequestKey) &&
    unfollowRelationResult?.key === profileRequestKey;
  const unfollowRelationData = isUnfollowRelationCurrent
    ? unfollowRelationResult?.data
    : undefined;
  const loadingUnfollowRelation =
    Boolean(profileRequestKey) &&
    (hookLoading || (Boolean(twitterId) && !isUnfollowRelationCurrent));

  // Fetch historical tweets when tab is active
  const { data: historicalTweetsResult } = useRequest(
    async () => {
      const requestTwitterId = twitterId;
      const requestProfileKey = profileRequestKey;
      if (!requestTwitterId || !requestProfileKey) return undefined;
      return {
        key: requestProfileKey,
        data: await fetchHistoricalTweets(requestTwitterId, 20, 0),
      } satisfies ScopedRequestResult<
        Awaited<ReturnType<typeof fetchHistoricalTweets>>
      >;
    },
    {
      ready:
        activeTab === 'deletedTweets' && !!twitterId && !!profileRequestKey,
      refreshDeps: [activeTab, twitterId, profileRequestKey],
      debounceWait: 300,
    },
  );
  const isHistoricalTweetsCurrent =
    Boolean(profileRequestKey) &&
    historicalTweetsResult?.key === profileRequestKey;
  const historicalTweets = isHistoricalTweetsCurrent
    ? historicalTweetsResult?.data
    : undefined;
  const loadingHistoricalTweets =
    activeTab === 'deletedTweets' &&
    Boolean(profileRequestKey) &&
    (hookLoading || (Boolean(twitterId) && !isHistoricalTweetsCurrent));

  // Fetch interaction rank data - always fetch to check if data exists (for tab visibility)
  // Use 7 days for initial check, then use interactionRankDays when tab is active
  const daysToFetch =
    activeTab === 'interactionRank' ? interactionRankDays : '7';
  const interactionRankRequestKey = profileRequestKey
    ? `${profileRequestKey}:${daysToFetch}`
    : '';
  const { data: interactionRankResult } = useRequest(
    async () => {
      const requestTwitterId = twitterId;
      const requestProfileKey = profileRequestKey;
      const requestDays = daysToFetch;
      if (!requestTwitterId || !requestProfileKey) return undefined;
      return {
        key: `${requestProfileKey}:${requestDays}`,
        data: await fetchFansRank(requestTwitterId, requestDays),
      } satisfies ScopedRequestResult<
        Awaited<ReturnType<typeof fetchFansRank>>
      >;
    },
    {
      ready: !!twitterId && !!profileRequestKey,
      refreshDeps: [twitterId, profileRequestKey, daysToFetch],
      debounceWait: 300,
    },
  );
  const isInteractionRankCurrent =
    Boolean(interactionRankRequestKey) &&
    interactionRankResult?.key === interactionRankRequestKey;
  const interactionRankData = isInteractionRankCurrent
    ? interactionRankResult?.data
    : undefined;
  const loadingInteractionRank =
    Boolean(interactionRankRequestKey) &&
    (hookLoading || (Boolean(twitterId) && !isInteractionRankCurrent));

  // Reset hasInteractionRankData and interactionRankDays when username changes
  useEffect(() => {
    setHasInteractionRankData(false);
    setInteractionRankDays('7');
  }, [profileRequestKey]);

  // Track if we've ever had interaction rank data
  useEffect(() => {
    if (
      interactionRankData &&
      Array.isArray(interactionRankData) &&
      interactionRankData.length > 0
    ) {
      setHasInteractionRankData(true);
    }
  }, [interactionRankData]);

  // Add user profile info to historical tweets
  const enrichedHistoricalTweets = useMemo(() => {
    if (!historicalTweets || !domUserInfo) return [];

    return historicalTweets.map((tweet) => ({
      ...tweet,
      profile: {
        profile_image_url: domUserInfo.avatar || '',
        name: domUserInfo.name || '',
        username: domUserInfo.username || '',
        username_raw: domUserInfo.username || '',
        is_blue_verified: newTwitterData?.base?.is_blue_verified || false,
      },
    }));
  }, [historicalTweets, domUserInfo, newTwitterData]);

  // Calculate counts
  const followsCount = followRelationData?.following_action?.length || 0;
  const followersCount = followRelationData?.followed_action?.length || 0;
  const unfollowInnerData = unfollowRelationData?.data;
  const isUnfollowVip = unfollowRelationData?.isVip ?? false;
  const maskedUnfollowingCount =
    unfollowRelationData?.maskedUnfollowingCount || 0;
  const maskedUnfollowedCount =
    unfollowRelationData?.maskedUnfollowedCount || 0;

  const unfollowingCount =
    (unfollowInnerData?.unfollowing_action?.length || 0) +
    (unfollowInnerData?.unfollowed_action?.length || 0) +
    (!isUnfollowVip ? maskedUnfollowingCount + maskedUnfollowedCount : 0);

  // Calculate profile changes count
  const profileChangesCount = (() => {
    if (!newTwitterData?.profile_his?.history) return 0;

    // Filter out records with no changes
    return newTwitterData.profile_his.history.filter(
      (record: any) => record.changed_field && record.changed_field.length > 0
    ).length;
  })();

  // Merge data for unfollow panel consumption
  const mergedUnfollowData = useMemo(() => {
    if (
      !followRelationData &&
      !unfollowInnerData &&
      (loadingFollowRelation || loadingUnfollowRelation)
    ) {
      return undefined;
    }
    return {
      followed_action: followRelationData?.followed_action || [],
      following_action: followRelationData?.following_action || [],
      unfollowing_action: unfollowInnerData?.unfollowing_action || [],
      unfollowed_action: unfollowInnerData?.unfollowed_action || [],
      twitter_users: {
        ...(followRelationData?.twitter_users || {}),
        ...(unfollowInnerData?.twitter_users || {}),
      },
      is_vip: isUnfollowVip,
      vip_masked: unfollowRelationData?.vipMasked,
      masked_unfollowing_count: maskedUnfollowingCount,
      masked_unfollowed_count: maskedUnfollowedCount,
    };
  }, [
    followRelationData,
    unfollowInnerData,
    loadingFollowRelation,
    loadingUnfollowRelation,
    isUnfollowVip,
    unfollowRelationData,
    maskedUnfollowingCount,
    maskedUnfollowedCount,
  ]);

  // Handle tab change with UI fix
  const handleTabChange = (id: string) => {
    setActiveTab(
      id as
      | 'follows'
      | 'followers'
      | 'unfollowing'
      | 'profile'
      | 'deletedTweets'
      | 'interactionRank'
    );
  };

  const tabs = useMemo(() => {
    const baseTabs: Array<{
      id: string;
      label: string;
      badge?: string;
      tooltip?: string;
    }> = [
        { id: 'follows', label: `${t('recentFollows')} (${followsCount})` },
        { id: 'followers', label: `${t('recentFollowers')} (${followersCount})` },
        {
          id: 'unfollowing',
          label: `${t('unfollowInfo')} (${unfollowingCount})`,
        },
        {
          id: 'profile',
          label: `${t('profileChanges')} (${profileChangesCount})`,
        },
      ];

    // Add "互动榜" tab if we have data or have ever had data (to prevent tab from disappearing during loading)
    if (hasInteractionRankData) {
      baseTabs.push({ id: 'interactionRank', label: t('interactionRank') });
    }

    // Add "历史删帖" tab if isEmptyState exists
    if (isEmptyState) {
      baseTabs.unshift({
        id: 'deletedTweets',
        label: `${t('deletedTweets1')}`,
      });
    }

    return baseTabs;
  }, [
    t,
    followsCount,
    followersCount,
    unfollowingCount,
    profileChangesCount,
    isEmptyState,
    interactionRankData,
    hasInteractionRankData,
  ]);

  // If current active tab is not in the tabs list (e.g., interactionRank or deletedTweets removed due to no data), switch to follows tab
  useEffect(() => {
    const currentTabExists = tabs.some((tab) => tab.id === activeTab);
    if (!currentTabExists && activeTab !== 'follows') {
      setActiveTab('follows');
    }
  }, [tabs, activeTab]);

  const isTabsLoading =
    domUserInfoLoading ||
    loadingFollowRelation ||
    loadingUnfollowRelation ||
    isDomUserInfoSettling;

  const rawContentLoading = useMemo(() => {
    if (domUserInfoLoading || isDomUserInfoSettling) return true;

    switch (activeTab) {
      case 'follows':
      case 'followers':
        return loadingFollowRelation;
      case 'unfollowing':
        return loadingFollowRelation || loadingUnfollowRelation;
      case 'profile':
        return loadingTwInfo;
      case 'deletedTweets':
        return loadingHistoricalTweets;
      case 'interactionRank':
        return loadingInteractionRank;
      default:
        return false;
    }
  }, [
    activeTab,
    domUserInfoLoading,
    isDomUserInfoSettling,
    loadingFollowRelation,
    loadingHistoricalTweets,
    loadingInteractionRank,
    loadingTwInfo,
    loadingUnfollowRelation,
  ]);
  const isContentLoading = rawContentLoading;

  useEffect(() => {
    const contentElement = contentScrollRef.current;
    if (isContentLoading || !contentElement) return;

    // ResizeObserver 在浏览器完成布局后提供尺寸，避免每次 React render 都用
    // getBoundingClientRect 强制同步回流；loading 时停止采样，保留上一帧高度。
    const resizeObserver = new ResizeObserver(([entry]) => {
      const height = entry?.contentRect.height || 0;
      if (height > 0) stableContentHeightRef.current = height;
    });
    resizeObserver.observe(contentElement);

    return () => resizeObserver.disconnect();
  }, [activeTab, isContentLoading, profileRequestKey]);

  // 检查用户分析是否启用
  if (!isEnabled('showSearchPanel')) {
    return (
      <div className='px-4 pt-4 text-center'>
        <div className='text-sm theme-text-secondary'>
          {t('userAnalysisDisabled')}
        </div>
      </div>
    );
  }

  if (isHidden) return null;

  return (
    <div className={`relative ${className}`}>
      {/* User Info Header */}
      <div className='flex items-center justify-between p-3 theme-border border-b'>
        <div className='flex items-center gap-2'>
          {domUserInfoLoading ? (
            <div className='w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse'></div>
          ) : domUserInfo?.avatar ? (
            <img
              key={domUserInfo.avatar + 'domUserInfo-avatar'}
              src={domUserInfo.avatar}
              alt={domUserInfo.name}
              className='w-10 h-10 rounded-full border-2 theme-border'
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className='w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center border-2 theme-border'>
              <span className='text-white font-medium text-sm max-w-[240px]'>
                {domUserInfo?.name
                  ? domUserInfo.name.charAt(0).toUpperCase()
                  : '?'}
              </span>
            </div>
          )}

          <div className='flex-1'>
            {domUserInfoLoading || !domUserInfo ? (
              <div className='space-y-1'>
                <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20'></div>
                <div className='h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16'></div>
              </div>
            ) : (
              <>
                <h3 className='text-sm font-medium theme-text-primary leading-tight truncate max-w-[240px]'>
                  {domUserInfo?.name || 'Unknown User'}
                </h3>
                <p className='text-xs theme-text-secondary leading-tight truncate max-w-[240px]'>
                  @{domUserInfo?.username}
                </p>
              </>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {/* 幽灵关注检测按钮 - 只在当前用户的个人页面且开启设置时显示 */}
          {!domUserInfoLoading && isOwnProfile && isEnabled('showGhostFollowing') && (
            <div className='relative group'>
              <button
                ref={ghostButtonRef}
                type='button'
                onClick={() => {
                  if (!userObj?.username) {
                    redirectToLogin();
                    return;
                  }

                  const nextState = !isGhostPanelOpen;
                  setIsGhostPanelOpen(nextState);
                  window.dispatchEvent(
                    new CustomEvent<GhostFollowingPanelEventDetail>(
                      GHOST_FOLLOWING_PANEL_EVENT,
                      {
                        detail: {
                          open: nextState,
                          anchor: ghostButtonRef.current || undefined,
                          source: 'button',
                        },
                      }
                    )
                  );
                }}
                className='p-1.5 rounded-full theme-text-secondary hover:text-blue-500 hover:bg-blue-500/10 transition-colors focus:outline-none relative'
              >
                <Ghost className='w-4 h-4' />
                {/* NEW badge */}
                <span className='absolute -top-0.5 -right-0.5 px-0.5 text-[6px] font-semibold leading-none transform'>
                  <svg
                    className='w-3.5 h-[auto]'
                    viewBox='0 0 1024 1024'
                    version='1.1'
                    xmlns='http://www.w3.org/2000/svg'
                    p-id='10824'
                    width='64'
                    height='64'
                  >
                    <path
                      d='M245.76 286.72h552.96c124.928 0 225.28 100.352 225.28 225.28s-100.352 225.28-225.28 225.28H0V532.48c0-135.168 110.592-245.76 245.76-245.76z m133.12 348.16V401.408H348.16v178.176l-112.64-178.176H204.8V634.88h30.72v-178.176L348.16 634.88h30.72z m182.272-108.544v-24.576h-96.256v-75.776h110.592v-24.576h-141.312V634.88h143.36v-24.576h-112.64v-83.968h96.256z m100.352 28.672l-34.816-151.552h-34.816l55.296 233.472H675.84l47.104-161.792 4.096-20.48 4.096 20.48 47.104 161.792h28.672l57.344-233.472h-34.816l-32.768 151.552-4.096 30.72-6.144-30.72-40.96-151.552h-30.72l-40.96 151.552-6.144 30.72-6.144-30.72z'
                      fill='#EE502F'
                      p-id='10825'
                    ></path>
                  </svg>
                </span>
              </button>
              <div className='absolute -translate-x-[85%] bottom-0 left-0 mb-2 px-2 py-1 theme-bg-secondary text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 theme-text-primary theme-border border whitespace-nowrap'>
                {t('detectGhostFollowing')}
              </div>
            </div>
          )}
          <div className='relative group'>
            <Info className='w-4 h-4 theme-text-secondary flex-shrink-0' />
            <div className='absolute -translate-x-[90%]  bottom-0 left-0 mb-2 px-3 py-1.5 theme-bg-secondary text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 theme-text-primary theme-border border whitespace-normal min-w-72 max-w-md text-center'>
              {t('trackingNote')}
            </div>
          </div>
          <button
            type='button'
            aria-label='Close Sidebar'
            title='Close'
            className='p-1 rounded-full theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary/70 transition-colors focus:outline-none'
            onClick={() => setShowCloseConfirm(true)}
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {isTabsLoading ? (
        <div className='border-b theme-border'>
          <div className='flex flex-wrap'>
            {Array.from({ length: lang === 'zh' ? 3 : 2 }).map((_, index) => (
              <div
                key={index}
                className='grow-0 shrink-0 px-4 py-2.5 flex justify-center'
                style={{
                  flexBasis: `${100 / (lang === 'zh' ? 3 : 2)}%`,
                  maxWidth: `${100 / (lang === 'zh' ? 3 : 2)}%`,
                }}
              >
                <div className='h-4 w-14 rounded bg-gray-200/80 dark:bg-gray-700/70 animate-pulse' />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      )}

      <div
        ref={contentScrollRef}
        className={`relative max-h-[340px] overflow-y-auto custom-scrollbar ${isContentLoading ? 'xhunt-personal-analysis-content-loading' : ''
          }`}
        style={
          isContentLoading
            ? { minHeight: `${stableContentHeightRef.current}px` }
            : undefined
        }
      >
        <div>
          {activeTab === 'follows' && (
            <FollowRelationPanel
              userId={userId}
              type='following'
              followRelationData={followRelationData}
              loading={loadingFollowRelation}
            />
          )}

          {activeTab === 'followers' && (
            <FollowRelationPanel
              userId={userId}
              type='followers'
              followRelationData={followRelationData}
              loading={loadingFollowRelation}
            />
          )}

          {activeTab === 'unfollowing' && (
            <UnfollowInfoPanel
              userId={userId}
              followRelationData={mergedUnfollowData}
              isVip={isUnfollowVip}
              maskedUnfollowingCount={maskedUnfollowingCount}
              maskedUnfollowedCount={maskedUnfollowedCount}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileChangesPanel
              userId={userId}
              profileHistoryData={newTwitterData}
              loading={loadingTwInfo}
            />
          )}

          {activeTab === 'deletedTweets' && (
            <DeletedTweetsSection
              deletedTweets={enrichedHistoricalTweets}
              loadingDel={loadingHistoricalTweets}
              isHoverPanel={true}
            />
          )}

          {activeTab === 'interactionRank' && (
            <InteractionRankPanel
              userId={userId}
              username={domUserInfo?.username}
              interactionRankData={interactionRankData}
              loading={loadingInteractionRank}
              selectedDays={interactionRankDays}
              onDaysChange={setInteractionRankDays}
              onOpenTip={({ anchor }) => {
                window.dispatchEvent(
                  new CustomEvent<FanTipPanelEventDetail>(
                    XHUNT_FAN_TIP_PANEL_EVENT,
                    {
                      detail: {
                        open: true,
                        anchor,
                        source: 'button',
                        interactionRankData,
                      },
                    }
                  )
                );
              }}
            />
          )}
        </div>

        {isContentLoading && (
          <div className='absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black'>
            <Loader2
              className='w-6 h-6 animate-spin text-blue-500'
              aria-label={t('loading')}
            />
          </div>
        )}
      </div>

      <style>{`
        .xhunt-personal-analysis-content-loading .xhunt-avatar-rank-badge {
          visibility: hidden !important;
        }

        .xhunt-personal-analysis-content-loading [style*='--xhunt-avatar-outer-border-color'] {
          border-color: transparent !important;
        }
      `}</style>

      {/* 关闭确认弹框 */}
      <CloseConfirmDialog
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={async () => {
          setIsHidden(true);
          setShowCloseConfirm(false);
          try {
            await localStorageInstance.set('@settings/showSearchPanel', false);
          } catch { }
        }}
        prefixKey='confirmCloseTrendingPrefix'
        suffixKey='confirmCloseTrendingSuffix'
      />
    </div>
  );
}

export default PersonalAnalysisPanel;
