import React, { useEffect, useState } from 'react';
import { TwitterUser, FollowRelationData } from '~types';
import { Loader2 } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { formatRank } from '~js/utils.ts';
import { rankService } from '~/utils/rankService';
import { ProPanel } from './ProPanel.tsx';

dayjs.extend(relativeTime);

interface UnfollowInfoPanelProps {
  userId: string;
  followRelationData?: FollowRelationData & {
    unfollowed_action?: Array<{
      created_at: string;
      follower_id: string;
      following_id: string;
      latest?: number;
    }>;
    unfollowing_action?: Array<{
      created_at: string;
      follower_id: string;
      following_id: string;
      latest?: number;
    }>;
  };
  isPro?: boolean;
}

interface FollowRelationItemProps {
  user: TwitterUser;
  timestamp: string;
  rank?: number;
  isLoading?: boolean;
  theme: string;
  showAvatarRank: boolean;
}

function FollowRelationItem({
  user,
  timestamp,
  rank,
  isLoading = false,
  theme,
  showAvatarRank,
}: FollowRelationItemProps) {
  const formattedTime = dayjs(timestamp).fromNow();

  return (
    <a
      href={`https://x.com/${user.username}`}
      target='_blank'
      rel='noopener noreferrer'
      className='flex items-center gap-2.5 px-6 py-2 rounded-md theme-hover transition-colors'
    >
      <div
        className='relative rounded-full'
        style={{ border: '3px solid #60A5FA80' }}
      >
        <img
          src={user.profile.profile_image_url}
          alt={user.name}
          className='w-[34px] h-[34px] rounded-full object-cover'
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
          }}
        />
        {showAvatarRank ? (
          <div
            className={`xhunt-avatar-rank-badge ${
              rank && rank > 0 && rank <= 10000 ? 'high-ranked' : ''
            } ${isLoading ? 'loading' : ''}`}
            data-theme={theme}
          >
            <span
              className='xhunt-avatar-rank-text'
              dangerouslySetInnerHTML={{
                __html: isLoading ? '~' : formatRank(rank),
              }}
            ></span>
          </div>
        ) : null}
      </div>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-1'>
          <p className='font-medium text-sm theme-text-primary truncate'>
            {user.name}
          </p>
          {user.profile.is_blue_verified && (
            <svg
              className='w-4 h-4 text-[#1d9bf0]'
              viewBox='0 0 22 22'
              fill='currentColor'
            >
              <path d='M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z'></path>
            </svg>
          )}
        </div>
        <div className='flex items-center gap-1'>
          <p className='text-xs theme-text-secondary truncate'>
            @{user.username}
          </p>
          <span className='text-xs theme-text-secondary'>•</span>
          <p className='text-xs theme-text-secondary whitespace-nowrap'>
            {formattedTime}
          </p>
        </div>
      </div>
    </a>
  );
}

export function UnfollowInfoPanel({
  userId,
  followRelationData,
  isPro = false,
}: UnfollowInfoPanelProps) {
  const { t } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [showAvatarRank] = useLocalStorage('@settings/showAvatarRank', true);
  const [userRanks, setUserRanks] = useState<Record<string, number>>({});
  const [loadingRanks, setLoadingRanks] = useState<Set<string>>(new Set());

  const unfollowingActions = followRelationData?.unfollowing_action || [];
  const unfollowedActions = followRelationData?.unfollowed_action || [];

  // 使用排名服务获取排名
  useEffect(() => {
    if (!followRelationData || !showAvatarRank) return;

    // 分别处理两组数据获取用户名
    const unfollowingUsernames = unfollowingActions
      .map((action) => {
        const user = followRelationData.twitter_users[action.following_id];
        return user?.username_raw;
      })
      .filter(Boolean) as string[];

    const unfollowedUsernames = unfollowedActions
      .map((action) => {
        const user = followRelationData.twitter_users[action.follower_id];
        return user?.username_raw;
      })
      .filter(Boolean) as string[];

    const usernames = [...unfollowingUsernames, ...unfollowedUsernames];
    if (usernames.length === 0) return;

    if (usernames.length === 0) return;

    // 添加状态监听
    const removeCallback = rankService.addStatusCallback((loadingUsernames) => {
      setLoadingRanks(loadingUsernames);
    });

    // 获取排名
    rankService.getRanks(usernames).then((ranks) => {
      setUserRanks(ranks);
    });

    return () => {
      removeCallback();
    };
  }, [
    followRelationData,
    showAvatarRank,
    unfollowingActions,
    unfollowedActions,
  ]);

  const loading = !followRelationData;

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-16'>
        <Loader2 className='w-5 h-5 text-blue-400 animate-spin mb-2' />
        <p className='text-xs theme-text-secondary'>{t('loading')}</p>
      </div>
    );
  }

  if (!followRelationData) {
    return (
      <div className='flex items-center justify-center h-16'>
        <p className='text-xs theme-text-secondary'>{t('noDataAvailable')}</p>
      </div>
    );
  }

  const BLUR_COUNT = 5; // 需要遮挡的前几条数据
  const hasActiveUnfollows = unfollowingActions.length > 0;
  const hasPassiveUnfollows = unfollowedActions.length > 0;
  const hasBlurredActiveItems = !isPro && unfollowingActions.length > 0;
  const hasBlurredPassiveItems = !isPro && unfollowedActions.length > 0;

  return (
    <div>
      {/* 提示条 */}
      <div className='px-6 py-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-b border-yellow-200 dark:border-yellow-800/50'>
        <p className='text-xs'>{t('unfollowInfoTooltip')}</p>
      </div>

      {/* 主动取关部分 */}
      <div className='space-y-2 mb-1'>
        <div className='px-6 py-2 theme-bg-secondary/50 border-b border-t theme-border'>
          <h4 className='text-sm font-medium theme-text-secondary'>
            {t('activeUnfollow')}
          </h4>
        </div>
        {hasActiveUnfollows ? (
          <>
            {hasBlurredActiveItems && (
              <div className='mb-2'>
                <ProPanel
                  isPro={false}
                  show={true}
                  className='border border-gray-200 dark:border-gray-800 rounded-md'
                  enableAnimation={false}
                  showExtraTitle={t('proRequiredViewFirst5')}
                  showBenefits={false}
                />
              </div>
            )}
            {unfollowingActions.map((action, index) => {
              const user =
                followRelationData.twitter_users[action.following_id];
              if (!user) return null;
              if (!isPro && index < BLUR_COUNT) return null;

              const username = user.username_raw;
              const userRank = userRanks[username] || -1;
              const isLoading = loadingRanks.has(username);

              return (
                <FollowRelationItem
                  key={`unfollowing-${action.created_at}-${action.following_id}`}
                  user={user}
                  timestamp={action.created_at}
                  rank={userRank}
                  isLoading={isLoading}
                  theme={theme}
                  showAvatarRank={showAvatarRank}
                />
              );
            })}
          </>
        ) : (
          <div className='px-6 py-2'>
            <p className='text-xs theme-text-secondary'>
              {t('noActiveUnfollows')}
            </p>
          </div>
        )}
      </div>

      {/* 被动被取关部分 */}
      <div className='space-y-2 mb-1'>
        <div className='px-6 py-2 theme-bg-secondary/50 border-b border-t theme-border'>
          <h4 className='text-sm font-medium theme-text-secondary'>
            {t('passiveUnfollowed')}
          </h4>
        </div>
        {hasPassiveUnfollows ? (
          <>
            {hasBlurredPassiveItems && (
              <div className='mb-2'>
                <ProPanel
                  isPro={false}
                  show={true}
                  className='border border-gray-200 dark:border-gray-800 rounded-md'
                  enableAnimation={false}
                  showExtraTitle={t('proRequiredViewFirst5')}
                  showBenefits={false}
                />
              </div>
            )}
            {unfollowedActions.map((action, index) => {
              const user = followRelationData.twitter_users[action.follower_id];
              if (!user) return null;
              if (!isPro && index < BLUR_COUNT) return null;

              const username = user.username_raw;
              const userRank = userRanks[username] || -1;
              const isLoading = loadingRanks.has(username);

              return (
                <FollowRelationItem
                  key={`unfollowed-${action.created_at}-${action.follower_id}`}
                  user={user}
                  timestamp={action.created_at}
                  rank={userRank}
                  isLoading={isLoading}
                  theme={theme}
                  showAvatarRank={showAvatarRank}
                />
              );
            })}
          </>
        ) : (
          <div className='px-6 py-2'>
            <p className='text-xs theme-text-secondary'>
              {t('noPassiveUnfollows')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
