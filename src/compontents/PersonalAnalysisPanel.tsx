import React, { useEffect, useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useRequest } from 'ahooks';
import {
  fetchFollowRelation,
  fetchHistoricalTweets,
} from '~contents/services/api.ts';
import { useDOMUserInfo } from '~/utils/domUserExtractor';
import { Tabs } from '~/compontents/Tabs.tsx';
import { FollowRelationPanel } from '~/compontents/FollowRelationPanel.tsx';
import { ProfileChangesPanel } from '~compontents/ProfileChangesPanel.tsx';
import { DeletedTweetsSection } from '~/compontents/DeletedTweetsSection.tsx';
import { FollowRelationData } from '~types';
import { localStorageInstance } from '~storage/index.ts';
import { navigationService } from '~/compontents/navigation/NavigationService';
import { useCrossPageSettings } from '~utils/settingsManager';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import useWaitForElement from '~contents/hooks/useWaitForElement';

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
  const [activeTab, setActiveTab] = useState<
    'follows' | 'followers' | 'profile' | 'deletedTweets'
  >('follows');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const { userInfo: domUserInfo, isLoading: domUserInfoLoading } =
    useDOMUserInfo(userId, newTwitterData, loadingTwInfo);

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
  >(() => fetchFollowRelation(userId), {
    refreshDeps: [userId],
    debounceWait: 300,
  });

  // Fetch historical tweets when tab is active
  const { data: historicalTweets, loading: loadingHistoricalTweets } =
    useRequest(
      () =>
        domUserInfo?.username
          ? fetchHistoricalTweets(domUserInfo.username, 20, 0)
          : Promise.resolve(undefined),
      {
        ready: activeTab === 'deletedTweets' && !!domUserInfo?.username,
        refreshDeps: [activeTab, domUserInfo?.username],
        debounceWait: 300,
      }
    );

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

  // Calculate profile changes count
  const profileChangesCount = (() => {
    if (!newTwitterData?.profile_his?.history) return 0;

    // Filter out records with no changes
    return newTwitterData.profile_his.history.filter(
      (record: any) => record.changed_field && record.changed_field.length > 0
    ).length;
  })();

  // Handle tab change with UI fix
  const handleTabChange = (id: string) => {
    setActiveTab(id as 'follows' | 'followers' | 'profile' | 'deletedTweets');

    // Add a small delay before triggering the scroll
    setTimeout(() => {
      // Scroll down 1px and then back up to trigger UI fixes
      window.scrollBy(0, 1);
      setTimeout(() => {
        window.scrollBy(0, -1);
      }, 10);
    }, 100);
  };

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'follows', label: `${t('recentFollows')} (${followsCount})` },
      { id: 'followers', label: `${t('recentFollowers')} (${followersCount})` },
      {
        id: 'profile',
        label: `${t('profileChanges')} (${profileChangesCount})`,
      },
    ];

    // Add "历史删帖" tab if emptyStateDom exists
    if (emptyStateDom) {
      baseTabs.unshift({
        id: 'deletedTweets',
        label: `${t('deletedTweets1')}`,
      });
    }

    return baseTabs;
  }, [t, followsCount, followersCount, profileChangesCount, emptyStateDom]);

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
          />
        )}

        {activeTab === 'followers' && (
          <FollowRelationPanel
            userId={userId}
            type='followers'
            followRelationData={followRelationData}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileChangesPanel
            userId={userId}
            profileHistoryData={newTwitterData}
          />
        )}

        {activeTab === 'deletedTweets' && (
          <DeletedTweetsSection
            deletedTweets={enrichedHistoricalTweets}
            loadingDel={loadingHistoricalTweets}
            isHoverPanel={true}
          />
        )}
      </div>

      {/* 关闭确认弹框 */}
      {showCloseConfirm && (
        <div className='absolute inset-0 z-[999000] flex items-start justify-center'>
          <div
            className='absolute inset-0 z-[999001] theme-bg-secondary'
            style={{ opacity: 0.8 }}
            onClick={() => setShowCloseConfirm(false)}
          />
          <div className='relative z-[999002] theme-bg-secondary theme-text-primary rounded-lg border theme-border p-4 w-[300px] shadow-xl mt-4'>
            <div className='text-sm leading-5'>
              {t('confirmCloseTrendingPrefix')}{' '}
              <button
                type='button'
                className='underline text-blue-400 hover:text-blue-300'
                onClick={() => {
                  try {
                    const openEvt = new CustomEvent('xhunt:open-panel');
                    window.dispatchEvent(openEvt);
                  } catch {}
                  try {
                    setTimeout(() => {
                      navigationService.navigateTo('main-panel', '/settings');
                    }, 100);
                  } catch {}
                }}
              >
                {t('settingsTitle')}
              </button>{' '}
              {t('confirmCloseTrendingSuffix')}
            </div>
            <div className='mt-3 flex justify-end gap-2'>
              <button
                type='button'
                className='px-3 py-1.5 text-xs rounded-md theme-hover border theme-border theme-text-primary'
                onClick={() => setShowCloseConfirm(false)}
              >
                {t('cancel')}
              </button>
              <button
                type='button'
                className='px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600'
                onClick={async () => {
                  setIsHidden(true);
                  setShowCloseConfirm(false);
                  try {
                    await localStorageInstance.set(
                      '@settings/showSearchPanel',
                      false
                    );
                  } catch {}
                }}
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonalAnalysisPanel;
