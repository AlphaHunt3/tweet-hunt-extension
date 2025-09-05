import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useRequest } from 'ahooks';
import { fetchFollowRelation } from '~contents/services/api.ts';
import { useDOMUserInfo } from '~/utils/domUserExtractor';
import { Tabs } from '~/compontents/Tabs.tsx';
import { FollowRelationPanel } from '~/compontents/FollowRelationPanel.tsx';
import { ProfileChangesPanel } from '~compontents/ProfileChangesPanel.tsx';
import { FollowRelationData } from '~types';
import { configManager } from '~utils/configManager';
import { MantleHunterBanner } from './MantleHunterBanner';

export interface TwitterPersonalRightSidebarProps {
  userId: string;
  newTwitterData: any;
  loadingTwInfo: boolean;
  className?: string;
}

export function TwitterPersonalRightSidebar({
  userId,
  newTwitterData,
  loadingTwInfo,
  className = '',
}: TwitterPersonalRightSidebarProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [showSearchPanel] = useLocalStorage('@settings/showSearchPanel', true);
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<
    'follows' | 'followers' | 'profile'
  >('follows');

  const { userInfo: domUserInfo, isLoading: domUserInfoLoading } =
    useDOMUserInfo(userId, newTwitterData, loadingTwInfo);

  // 是否显示 Mantle Hunter 活动（独立控制，且仅在 Mantle_Official 主页显示）
  const shouldShowMantleHunterBase =
    configManager.shouldShowMantleHunterProgram();
  const canShowMantleHunter =
    shouldShowMantleHunterBase &&
    String(userId || '').toLowerCase() === 'mantle_official';

  // // 仅当两者都为 false 时整体不渲染
  // if (!showSearchPanel && !canShowMantleHunter) {
  //   return null;
  // }

  // Fetch data to get counts
  const { data: followRelationData } = useRequest<
    FollowRelationData | undefined,
    []
  >(() => fetchFollowRelation(userId), {
    refreshDeps: [userId],
    debounceWait: 300,
  });

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
    setActiveTab(id as 'follows' | 'followers' | 'profile');

    // Add a small delay before triggering the scroll
    setTimeout(() => {
      // Scroll down 1px and then back up to trigger UI fixes
      window.scrollBy(0, 1);
      setTimeout(() => {
        window.scrollBy(0, -1);
      }, 10);
    }, 100);
  };

  const tabs = useMemo(
    () => [
      { id: 'follows', label: `${t('recentFollows')} (${followsCount})` },
      { id: 'followers', label: `${t('recentFollowers')} (${followersCount})` },
      {
        id: 'profile',
        label: `${t('profileChanges')} (${profileChangesCount})`,
      },
    ],
    [t, followsCount, followersCount, profileChangesCount]
  );

  return (
    <div
      data-theme={theme}
      className={`rounded-xl ${className}`}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--border-color)',
        opacity: !showSearchPanel && !canShowMantleHunter ? 0 : 1,
        pointerEvents:
          !showSearchPanel && !canShowMantleHunter ? 'none' : 'auto',
      }}
    >
      {/* Campaign Banner at the very top - 独立控制 */}
      {canShowMantleHunter && (
        <div className='px-3 pt-3'>
          <MantleHunterBanner
            unregisteredMode='collapsed'
            showMantleHunterComponents={true}
          />
        </div>
      )}

      {showSearchPanel && (
        <>
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

            <div className='relative group'>
              <Info className='w-4 h-4 theme-text-secondary flex-shrink-0' />
              <div className='absolute -translate-x-[90%]  bottom-0 left-0 mb-2 px-3 py-1.5 theme-bg-secondary text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 theme-text-primary theme-border border whitespace-normal min-w-72 max-w-md text-center'>
                {t('trackingNote')}
              </div>
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
          </div>
        </>
      )}
    </div>
  );
}
