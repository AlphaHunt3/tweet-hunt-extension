import React, { useEffect, useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useRequest } from 'ahooks';
import {
  fetchFollowRelation,
  fetchHistoricalTweets,
  fetchFansRank,
  fetchUnfollowRelation,
} from '~contents/services/api.ts';
import usePlacementTrackingDomUserInfo from '~contents/hooks/usePlacementTrackingDomUserInfo';
import { Tabs } from '~/compontents/Tabs.tsx';
import { FollowRelationPanel } from '~/compontents/FollowRelationPanel.tsx';
import { UnfollowInfoPanel } from '~/compontents/UnfollowInfoPanel.tsx';
import { ProfileChangesPanel } from '~compontents/ProfileChangesPanel.tsx';
import { DeletedTweetsSection } from '~/compontents/DeletedTweetsSection.tsx';
import { InteractionRankPanel } from '~/compontents/InteractionRankPanel.tsx';
import { FollowRelationData } from '~types';
import { localStorageInstance } from '~storage/index.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { CloseConfirmDialog } from './CloseConfirmDialog';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import useWaitForElement from '~contents/hooks/useWaitForElement';
import { ProRequired } from './ProRequired';
import { StoredUserInfo } from '~types/review.ts';
import { isLegacyUserActive } from '~/utils/legacyUserCheck.ts';

export interface PersonalAnalysisPanelProps {
  userId: string;
  newTwitterData: any;
  loadingTwInfo: boolean;
  className?: string;
}

export function PersonalAnalysisPanel({
  userId,
  newTwitterData,
  loadingTwInfo,
  className = '',
}: PersonalAnalysisPanelProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { t } = useI18n();
  const currentUrl = useCurrentUrl();
  const { isEnabled } = useCrossPageSettings();
  const [user] = useLocalStorage<StoredUserInfo | null | ''>(
    '@xhunt/user',
    null
  );
  const userObj = user && typeof user === 'object' ? user : null;
  const [currentUsername] = useLocalStorage('@xhunt/current-username', '');
  const isLegacyUser = isLegacyUserActive(currentUsername);
  // const isPro = (userObj?.isPro ?? false) || isLegacyUser;
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

  const {
    handler: hookUsername,
    displayName: hookName,
    avatar: hookAvatar,
    loading: hookLoading,
    twitterId,
  } = usePlacementTrackingDomUserInfo();
  const domUserInfo = useMemo(
    () =>
      hookUsername
        ? {
            username: hookUsername,
            name: hookName,
            avatar: hookAvatar,
            source: 'data-testid' as const,
          }
        : null,
    [hookUsername, hookName, hookAvatar]
  );
  const domUserInfoLoading = hookLoading;

  const emptyStateDom = useWaitForElement("div[data-testid='emptyState']", [
    currentUrl,
  ]);

  // Auto switch to deletedTweets tab when emptyStateDom exists
  useEffect(() => {
    if (emptyStateDom) {
      setActiveTab('deletedTweets');
    }
  }, [emptyStateDom]);

  // Fetch data to get counts
  const { data: followRelationData } = useRequest<
    FollowRelationData | undefined,
    []
  >(() => fetchFollowRelation(twitterId), {
    refreshDeps: [twitterId],
    debounceWait: 300,
  });

  // Fetch unfollow relation data
  const { data: unfollowRelationData } = useRequest(
    () =>
      twitterId
        ? fetchUnfollowRelation(twitterId, 30, 0)
        : Promise.resolve(undefined),
    {
      ready: !!twitterId,
      refreshDeps: [twitterId],
      debounceWait: 300,
    }
  );

  // Fetch historical tweets when tab is active
  const { data: historicalTweets, loading: loadingHistoricalTweets } =
    useRequest(
      () =>
        twitterId
          ? fetchHistoricalTweets(twitterId, 20, 0)
          : Promise.resolve(undefined),
      {
        ready: activeTab === 'deletedTweets' && !!twitterId,
        refreshDeps: [activeTab, twitterId],
        debounceWait: 300,
      }
    );

  // Fetch interaction rank data - always fetch to check if data exists (for tab visibility)
  // Use 7 days for initial check, then use interactionRankDays when tab is active
  const daysToFetch =
    activeTab === 'interactionRank' ? interactionRankDays : '7';
  const { data: interactionRankData, loading: loadingInteractionRank } =
    useRequest(
      () =>
        twitterId
          ? fetchFansRank(twitterId, daysToFetch)
          : Promise.resolve(undefined),
      {
        ready: !!twitterId,
        refreshDeps: [twitterId, daysToFetch],
        debounceWait: 300,
      }
    );

  // Reset hasInteractionRankData and interactionRankDays when username changes
  useEffect(() => {
    setHasInteractionRankData(false);
    setInteractionRankDays('7');
  }, [domUserInfo?.username]);

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
  const unfollowingCount =
    (unfollowRelationData?.unfollowing_action?.length || 0) +
    (unfollowRelationData?.unfollowed_action?.length || 0);

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
    if (!followRelationData && !unfollowRelationData) return undefined;
    return {
      followed_action: followRelationData?.followed_action || [],
      following_action: followRelationData?.following_action || [],
      unfollowing_action: unfollowRelationData?.unfollowing_action || [],
      unfollowed_action: unfollowRelationData?.unfollowed_action || [],
      twitter_users: {
        ...(followRelationData?.twitter_users || {}),
        ...(unfollowRelationData?.twitter_users || {}),
      },
    };
  }, [followRelationData, unfollowRelationData]);

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
    ];

    // Add "取关信息" tab only when data exists, and place it before profile
    if (unfollowingCount > 0) {
      baseTabs.push({
        id: 'unfollowing',
        label: `${t('unfollowInfo')} (${unfollowingCount})`,
        tooltip: t('unfollowInfoTooltip'),
        badge: t('betaBadge'),
      });
    }

    baseTabs.push({
      id: 'profile',
      label: `${t('profileChanges')} (${profileChangesCount})`,
    });

    // Add "互动榜" tab if we have data or have ever had data (to prevent tab from disappearing during loading)
    if (hasInteractionRankData) {
      baseTabs.push({ id: 'interactionRank', label: t('interactionRank') });
    }

    // Add "历史删帖" tab if emptyStateDom exists
    if (emptyStateDom) {
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
    emptyStateDom,
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

      <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

      <div className='max-h-[340px] overflow-y-auto custom-scrollbar'>
        {activeTab === 'follows' && (
          <FollowRelationPanel
            userId={userId}
            type='following'
            followRelationData={followRelationData}
            isPro={true}
          />
        )}

        {activeTab === 'followers' && (
          <FollowRelationPanel
            userId={userId}
            type='followers'
            followRelationData={followRelationData}
            isPro={true}
          />
        )}

        {activeTab === 'unfollowing' && (
          <UnfollowInfoPanel
            userId={userId}
            followRelationData={mergedUnfollowData}
            isPro={true}
          />
        )}

        {activeTab === 'profile' && (
          <ProRequired
            showInCenter={true}
            enableAnimation={false}
            showExtraTitle={true}
          >
            <ProfileChangesPanel
              userId={userId}
              profileHistoryData={newTwitterData}
            />
          </ProRequired>
        )}

        {activeTab === 'deletedTweets' && (
          <ProRequired
            showInCenter={true}
            enableAnimation={false}
            showExtraTitle={true}
          >
            <DeletedTweetsSection
              deletedTweets={enrichedHistoricalTweets}
              loadingDel={loadingHistoricalTweets}
              isHoverPanel={true}
            />
          </ProRequired>
        )}

        {activeTab === 'interactionRank' && (
          <InteractionRankPanel
            userId={userId}
            username={domUserInfo?.username}
            interactionRankData={interactionRankData}
            loading={loadingInteractionRank}
            selectedDays={interactionRankDays}
            onDaysChange={setInteractionRankDays}
          />
        )}
      </div>

      {/* 关闭确认弹框 */}
      <CloseConfirmDialog
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={async () => {
          setIsHidden(true);
          setShowCloseConfirm(false);
          try {
            await localStorageInstance.set('@settings/showSearchPanel', false);
          } catch {}
        }}
        prefixKey='confirmCloseTrendingPrefix'
        suffixKey='confirmCloseTrendingSuffix'
      />
    </div>
  );
}

export default PersonalAnalysisPanel;
