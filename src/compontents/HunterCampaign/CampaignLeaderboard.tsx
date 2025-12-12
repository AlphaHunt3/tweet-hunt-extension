import React, { useState, useMemo, useEffect } from 'react';
import { useRequest } from 'ahooks';
import { Heart, Repeat, Eye } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage';
import { localStorageInstance } from '~storage/index';
import { formatRank } from '~js/utils.ts';
import { rankService } from '~/utils/rankService';
import { openNewTab } from '~contents/utils';
import { type LeaderboardItem, HunterCampaignConfig } from './types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface CampaignLeaderboardProps {
  campaignConfig: HunterCampaignConfig;
}

export function CampaignLeaderboard({
  campaignConfig,
}: CampaignLeaderboardProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'mindshare' | 'hotTweets'>(
    'mindshare'
  );
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [showAvatarRank] = useLocalStorage('@settings/showAvatarRank', true);
  const [userRanks, setUserRanks] = useState<Record<string, number>>({});
  const [loadingRanks, setLoadingRanks] = useState<Set<string>>(new Set());

  // 根据share值生成精致的颜色方案
  const getShareColorScheme = (share: number) => {
    const percentage = share * 100;

    if (percentage >= 15) {
      // 高份额：金色系 - 奢华感
      return {
        bg: 'from-amber-500/12 to-yellow-500/8',
        border: 'border-amber-400/25',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
      };
    } else if (percentage >= 10) {
      // 中高份额：紫色系 - 高贵感
      return {
        bg: 'from-purple-500/10 to-violet-500/8',
        border: 'border-purple-400/25',
        text: 'text-purple-400',
        dot: 'bg-purple-400',
      };
    } else if (percentage >= 5) {
      // 中等份额：蓝色系 - 稳重感
      return {
        bg: 'from-blue-500/10 to-cyan-500/8',
        border: 'border-blue-400/25',
        text: 'text-blue-400',
        dot: 'bg-blue-400',
      };
    } else if (percentage >= 2) {
      // 中低份额：绿色系 - 清新感
      return {
        bg: 'from-emerald-500/10 to-green-500/8',
        border: 'border-emerald-400/25',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
      };
    } else {
      // 低份额：灰色系 - 低调感
      return {
        bg: 'from-slate-500/8 to-gray-500/6',
        border: 'border-slate-400/20',
        text: 'text-slate-400',
        dot: 'bg-slate-400',
      };
    }
  };
  // 获取热门推文数据
  const { data: hotTweetsData, loading: hotTweetsLoading } = useRequest(
    () =>
      campaignConfig.api.fetchHotTweets
        ? campaignConfig.api.fetchHotTweets()
        : Promise.resolve(undefined),
    {
      manual: false,
      debounceWait: 300,
      refreshDeps: [campaignConfig],
    }
  );

  // 获取排行榜数据
  const { data: leaderboardData, loading: leaderboardLoading } = useRequest(
    () =>
      campaignConfig.api.fetchLeaderboard
        ? campaignConfig.api.fetchLeaderboard()
        : Promise.resolve(undefined),
    {
      manual: false,
      debounceWait: 300,
      refreshDeps: [campaignConfig],
    }
  );

  // 转换API数据为组件需要的格式，只展示前10条
  const mindshareData = useMemo(() => {
    if (!leaderboardData?.mindshare) return [];
    return leaderboardData.mindshare.slice(0, 10).map((item: any) => ({
      rank: item.rank,
      username: item.username,
      displayName: item.name,
      avatar: item.image,
      share: item.share || 0,
      change: undefined, // API中没有change字段
      isVerified: false, // API中没有isVerified字段，默认为false
    }));
  }, [leaderboardData?.mindshare]);

  // 已移除 Workshare 展示

  // 获取头像排名（xhunt rank）- 只获取当前活跃tab的前10名用户排名
  useEffect(() => {
    if (!showAvatarRank) return;

    // 仅在 mindshare 标签下获取用户排名；hotTweets 不需要
    const usernames: string[] =
      activeTab === 'mindshare'
        ? (mindshareData
            .map((i: LeaderboardItem) => i.username)
            .filter(Boolean) as string[])
        : [];

    if (usernames.length === 0) return;

    const removeCallback = rankService.addStatusCallback((loadingUsernames) => {
      setLoadingRanks(loadingUsernames);
    });

    rankService.getRanks(usernames).then((ranks) => {
      setUserRanks(ranks);
    });

    return () => {
      removeCallback();
    };
  }, [activeTab, mindshareData, showAvatarRank]);

  const handleViewMore = () => {
    // campaignConfig.links.getActiveUrl() 会根据活动类型（Mantle/Bybit）
    // 调用对应的 configManager 方法获取活动链接
    // 定义位置：campaignConfigs.ts 中的 links.getActiveUrl
    const url = campaignConfig.links.getActiveUrl();
    openNewTab(url || '#');
  };

  // 格式化数字
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    return dayjs(dateString).fromNow();
  };

  const renderLeaderboardItem = (item: LeaderboardItem) => {
    const username = item.username;
    const userRank = userRanks[username] || -1;
    const isLoading = loadingRanks.has(username);

    return (
      <div
        key={item.rank}
        className='px-3 py-2 rounded-md theme-hover transition-colors'
      >
        <a
          href={`https://x.com/${item.username}`}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center gap-2.5'
        >
          <div
            className='relative rounded-full'
            style={{ border: '3px solid #60A5FA80' }}
          >
            <img
              src={
                item.avatar ||
                'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'
              }
              alt={item.displayName}
              className='w-[34px] h-[34px] rounded-full object-cover'
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
              }}
            />
            {showAvatarRank ? (
              <div
                className={`xhunt-avatar-rank-badge ${
                  userRank && userRank > 0 && userRank <= 10000
                    ? 'high-ranked'
                    : ''
                } ${isLoading ? 'loading' : ''}`}
                data-theme={theme}
              >
                <span
                  className='xhunt-avatar-rank-text'
                  dangerouslySetInnerHTML={{
                    __html: isLoading ? '~' : formatRank(userRank),
                  }}
                ></span>
              </div>
            ) : null}
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-1'>
              <p className='font-medium text-sm theme-text-primary truncate'>
                {item.displayName}
              </p>
              {item.isVerified && (
                <svg
                  className='w-4 h-4 text-[#1d9bf0]'
                  viewBox='0 0 22 22'
                  fill='currentColor'
                >
                  <path d='M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z'></path>
                </svg>
              )}
            </div>
            <p className='text-xs theme-text-secondary truncate'>
              @{item.username}
            </p>
          </div>

          {/* Share数据独立展示在右边 */}
          <div className='flex flex-col items-end justify-center ml-2'>
            {(() => {
              const colorScheme = getShareColorScheme(item.share);
              return (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r ${colorScheme.bg} border ${colorScheme.border}`}
                >
                  <div className={`w-1 h-1 rounded-full ${colorScheme.dot}`} />
                  <span
                    className={`text-[11px] font-medium ${colorScheme.text}`}
                  >
                    {(item.share * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })()}
          </div>
        </a>
      </div>
    );
  };

  // 渲染热门推文 - 类似推文卡片的紧凑设计
  const renderHotTweet = (tweetData: any) => {
    const tweet = tweetData.tweet;
    const profile = tweet.profile;
    const statistic = tweet.statistic;
    const info = tweetData.info;

    return (
      <a
        key={tweet.id}
        href={info.link}
        target='_blank'
        rel='noopener noreferrer'
        className='block px-3 py-2.5 rounded-md theme-hover transition-colors border-l-2 border-transparent hover:border-l-2 hover:border-blue-400/50'
      >
        {/* 推文头部 */}
        <div className='flex items-start gap-2.5 mb-2'>
          <img
            src={
              profile.profile_image_url ||
              'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'
            }
            alt={profile.name}
            className='w-8 h-8 rounded-full flex-shrink-0'
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
            }}
          />
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-1 mb-0.5'>
              <span className='font-medium text-sm theme-text-primary truncate'>
                {profile.name}
              </span>
              {profile.is_blue_verified && (
                <svg
                  className='w-4 h-4 text-[#1d9bf0] flex-shrink-0'
                  viewBox='0 0 22 22'
                  fill='currentColor'
                >
                  <path d='M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z'></path>
                </svg>
              )}
              <span className='text-xs theme-text-secondary'>
                @{profile.username}
              </span>
              <span className='text-xs theme-text-secondary'>·</span>
              <span className='text-xs theme-text-secondary'>
                {formatTime(tweet.create_time)}
              </span>
            </div>

            {/* 推文内容 */}
            <div className='text-sm theme-text-primary leading-relaxed line-clamp-5'>
              {tweet.text}
            </div>

            {/* 推文统计 */}
            <div className='flex items-center gap-4 mt-2 text-xs theme-text-secondary'>
              <div className='flex items-center gap-1'>
                <Heart className='w-3 h-3' />
                <span>{formatNumber(statistic.likes || 0)}</span>
              </div>
              <div className='flex items-center gap-1'>
                <Repeat className='w-3 h-3' />
                <span>{formatNumber(statistic.retweet_count || 0)}</span>
              </div>
              <div className='flex items-center gap-1'>
                <Eye className='w-3 h-3' />
                <span>{formatNumber(statistic.views || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </a>
    );
  };

  return (
    <div className='space-y-1.5'>
      {/* Tab Headers - 参考 Tabs 组件的设计 */}
      <div className='flex border-b theme-border'>
        <button
          onClick={() => setActiveTab('mindshare')}
          className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'mindshare'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'theme-text-secondary hover:theme-text-primary'
          }`}
        >
          {t('mantleHunterTabMindshare')}
        </button>
        {/* 已移除 Workshare 标签 */}
        <button
          onClick={() => setActiveTab('hotTweets')}
          className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'hotTweets'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'theme-text-secondary hover:theme-text-primary'
          }`}
        >
          {t('mantleHunterTabHotTweets')}
        </button>
      </div>

      {/* Tab Content - 固定高度，查看更多按钮固定在底部 */}
      <div className='relative'>
        <div className='max-h-[290px] overflow-y-auto custom-scrollbar pb-10'>
          <div className='space-y-2 py-2'>
            {activeTab === 'mindshare' &&
              (leaderboardLoading ? (
                <div className='flex items-center justify-center py-4'>
                  <div className='w-5 h-5 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin' />
                </div>
              ) : mindshareData.length > 0 ? (
                mindshareData.map(renderLeaderboardItem)
              ) : (
                <div className='flex items-center justify-center py-4 theme-text-secondary'>
                  <span className='text-xs'>
                    {t('mantleHunterNoLeaderboard')}
                  </span>
                </div>
              ))}
            {/* 已移除 Workshare 内容 */}
            {activeTab === 'hotTweets' &&
              (hotTweetsLoading ? (
                <div className='flex items-center justify-center py-4'>
                  <div className='w-5 h-5 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin' />
                </div>
              ) : hotTweetsData?.data?.data?.length > 0 ? (
                hotTweetsData.data.data.slice(0, 10).map(renderHotTweet)
              ) : (
                <div className='flex items-center justify-center py-4 theme-text-secondary'>
                  <span className='text-xs'>
                    {t('mantleHunterNoHotTweets')}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* 查看更多按钮 - 固定在底部 */}
        <div
          className='absolute bottom-0 left-0 right-0 pt-6 pb-2 z-[9999]'
          style={{
            background:
              theme === 'dark'
                ? 'linear-gradient(to top, #000000 0%, #000000 50%, transparent 100%)'
                : 'linear-gradient(to top, var(--bg-primary) 0%, var(--bg-primary) 50%, transparent 100%)',
          }}
        >
          <button
            onClick={handleViewMore}
            className='w-full py-2 px-3 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors rounded-md'
          >
            {t('mantleHunterViewMore')}
          </button>
        </div>
      </div>
    </div>
  );
}
