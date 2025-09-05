import React, { useEffect, useState } from 'react';
import { TwitterUser, FollowRelationData } from '~types';
import { Loader2, User } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { formatRank } from '~js/utils.ts';
import { rankService } from '~/utils/rankService';

dayjs.extend(relativeTime);

interface FollowRelationPanelProps {
  userId: string;
  type: 'following' | 'followers';
  followRelationData?: FollowRelationData;
}

export function FollowRelationPanel({
  userId,
  type,
  followRelationData,
}: FollowRelationPanelProps) {
  const { t } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [showAvatarRank] = useLocalStorage('@settings/showAvatarRank', true);
  const [userRanks, setUserRanks] = useState<Record<string, number>>({});
  const [loadingRanks, setLoadingRanks] = useState<Set<string>>(new Set());

  // 使用排名服务获取排名
  useEffect(() => {
    if (!followRelationData || !showAvatarRank) return;

    const actions =
      type === 'following'
        ? followRelationData.following_action
        : followRelationData.followed_action;

    if (!actions || actions.length === 0) return;

    const usernames = actions
      .map((action) => {
        const targetId =
          type === 'following' ? action.following_id : action.follower_id;
        const user = followRelationData.twitter_users[targetId];
        return user?.username_raw;
      })
      .filter(Boolean) as string[];

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
  }, [followRelationData, type, showAvatarRank]);

  // Use passed data instead of fetching
  const data = followRelationData;
  const loading = !data;
  const error = null;

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-16'>
        <Loader2 className='w-5 h-5 text-blue-400 animate-spin mb-2' />
        <p className='text-xs theme-text-secondary'>{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-16'>
        <p className='text-xs theme-text-secondary'>{t('errorLoadingData')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className='flex items-center justify-center h-16'>
        <p className='text-xs theme-text-secondary'>{t('noDataAvailable')}</p>
      </div>
    );
  }

  const actions =
    type === 'following' ? data.following_action : data.followed_action;

  if (!actions || actions.length === 0) {
    return (
      <div className='flex items-center justify-center h-16'>
        <p className='text-xs theme-text-secondary'>
          {type === 'following' ? t('noRecentFollows') : t('noRecentFollowers')}
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-2 py-2'>
      {actions.map((action) => {
        const targetId =
          type === 'following' ? action.following_id : action.follower_id;
        const user = data.twitter_users[targetId];

        if (!user) return null;

        const username = user.username_raw;
        const userRank = userRanks[username] || -1;
        const isLoading = loadingRanks.has(username);

        return (
          <FollowRelationItem
            key={`${action.created_at}-${targetId}`}
            user={user}
            timestamp={action.created_at}
            rank={userRank}
            isLoading={isLoading}
            theme={theme}
            showAvatarRank={showAvatarRank}
          />
        );
      })}
    </div>
  );
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
