import React, { useState, useEffect } from 'react';
import { HotItem, HotDiscussion } from './types';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useRequest } from 'ahooks';
import { rankService } from '~/utils/rankService';
import { useI18n } from '~contents/hooks/i18n.ts';
import { formatRank } from '~js/utils.ts';

interface TrendingListVisualizationProps {
  items: HotItem[] | HotDiscussion[];
  loading: boolean;
  type: 'project' | 'person' | 'discussion';
}

export function TrendingListVisualization({
  items,
  loading,
  type,
}: TrendingListVisualizationProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [showAvatarRank] = useLocalStorage('@settings/showAvatarRank', true);
  const { lang } = useI18n();
  const [userRanks, setUserRanks] = useState<Record<string, number>>({});
  const [loadingRanks, setLoadingRanks] = useState<Set<string>>(new Set());

  // 按热度指数排序（从高到低）
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => b.share - a.share);
  }, [items]);

  // 使用排名服务获取排名（所有tab都获取）
  useEffect(() => {
    if (!sortedItems.length) return;

    const allUsernames = sortedItems
      .map((item) => {
        if ('twitter' in item) {
          return item.twitter.username_raw;
        }
        return null;
      })
      .filter((username): username is string => username !== null);

    if (allUsernames.length === 0) return;

    // 添加状态监听
    const removeCallback = rankService.addStatusCallback((loadingUsernames) => {
      setLoadingRanks(loadingUsernames);
    });

    // 获取排名
    rankService.getRanks(allUsernames).then((ranks) => {
      setUserRanks(ranks);
    });

    return () => {
      removeCallback();
    };
  }, [sortedItems]);

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='w-6 h-6 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin'></div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className='flex items-center justify-center h-full theme-text-secondary'>
        <div className='text-center'>
          <div className='text-sm'>No data</div>
          <div className='text-xs mt-1'>Try different period</div>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-2 py-2 h-full overflow-y-auto custom-scrollbar'>
      {sortedItems.map((item, index) => {
        if (type === 'discussion') {
          const discussionItem = item as HotDiscussion;
          return (
            <DiscussionListItem
              key={`${discussionItem.tag}-${index}`}
              item={discussionItem}
              index={index}
              theme={theme}
              lang={lang}
              showAvatarRank={showAvatarRank}
              userRank={userRanks[discussionItem.twitter.username_raw] || -1}
              isLoading={loadingRanks.has(discussionItem.twitter.username_raw)}
            />
          );
        } else {
          const hotItem = item as HotItem;
          return (
            <TrendingListItem
              key={`${hotItem.twitter.username}-${index}`}
              item={hotItem}
              index={index}
              theme={theme}
              showAvatarRank={showAvatarRank}
              userRank={userRanks[hotItem.twitter.username_raw] || -1}
              isLoading={loadingRanks.has(hotItem.twitter.username_raw)}
              type={type}
              lang={lang}
            />
          );
        }
      })}
    </div>
  );
}

function DiscussionListItem({
  item,
  index,
  theme,
  lang,
  showAvatarRank,
  userRank,
  isLoading,
}: DiscussionListItemProps) {
  const { t } = useI18n();
  // 计算热度指数（转换为更直观的数值）
  const heatIndex = Math.round(item.share * 10000);

  // 获取摘要内容
  const summary = lang === 'zh' ? item.summary_cn : item.summary_en;

  return (
    <div className='px-3 py-2 rounded-md theme-hover transition-colors'>
      <a
        href={`https://x.com/${item.twitter.username}`}
        target='_blank'
        rel='noopener noreferrer'
        className='flex items-center gap-2.5 flex-wrap'
      >
        <div
          className='relative rounded-full'
          style={{ border: '3px solid #60A5FA80' }}
        >
          <img
            src={item.twitter.profile.profile_image_url}
            alt={item.twitter.name}
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
                  __html: isLoading ? '...' : formatRank(userRank),
                }}
              ></span>
            </div>
          ) : null}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-1'>
            <p className='font-medium text-sm theme-text-primary truncate'>
              {item.twitter.name}
            </p>
            {item.twitter.profile.is_blue_verified && (
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
              @{item.twitter.username}
            </p>
            <span className='text-xs theme-text-secondary'>•</span>
            <p className='text-xs theme-text-secondary whitespace-nowrap'>
              {t('heat')} {heatIndex}
            </p>
          </div>
        </div>
        {summary && (
          <div
            className='inline-grid w-full ml-14 -mt-3 mr-2 pointer-events-none'
            data-testid='discussion'
          >
            <p className='text-xs theme-text-secondary leading-relaxed whitespace-normal break-words'>
              {summary}
            </p>
          </div>
        )}
      </a>
    </div>
  );
}

interface TrendingListItemProps {
  item: HotItem;
  index: number;
  theme: string;
  showAvatarRank: boolean;
  userRank: number;
  isLoading: boolean;
  type: 'project' | 'person';
  lang: string;
}

interface DiscussionListItemProps {
  item: HotDiscussion;
  index: number;
  theme: string;
  lang: string;
  showAvatarRank: boolean;
  userRank: number;
  isLoading: boolean;
}

function TrendingListItem({
  item,
  index,
  theme,
  showAvatarRank,
  userRank,
  isLoading,
  type,
  lang,
}: TrendingListItemProps) {
  const { t } = useI18n();
  // 计算热度指数（转换为更直观的数值）
  const heatIndex = Math.round(item.share * 10000);

  // 获取叙事内容（仅项目类型）
  const narrative =
    type === 'project' && item.twitter.feature?.narrative
      ? lang === 'zh'
        ? item.twitter.feature.narrative.cn
        : item.twitter.feature.narrative.en
      : null;

  // 获取摘要内容（仅 KOL/person 类型）
  const summary =
    type === 'person'
      ? lang === 'zh'
        ? item.summary_cn
        : item.summary_en
      : null;

  return (
    <div className='px-3 py-2 rounded-md theme-hover transition-colors'>
      <a
        href={`https://x.com/${item.twitter.username}`}
        target='_blank'
        rel='noopener noreferrer'
        className='flex items-center gap-2.5 flex-wrap'
      >
        <div
          className='relative rounded-full'
          style={{ border: '3px solid #60A5FA80' }}
        >
          <img
            src={item.twitter.profile.profile_image_url}
            alt={item.twitter.name}
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
                  __html: isLoading ? '...' : formatRank(userRank),
                }}
              ></span>
            </div>
          ) : null}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-1'>
            <p className='font-medium text-sm theme-text-primary truncate'>
              {item.twitter.name}
            </p>
            {item.twitter.profile.is_blue_verified && (
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
              @{item.twitter.username}
            </p>
            <span className='text-xs theme-text-secondary'>•</span>
            <p className='text-xs theme-text-secondary whitespace-nowrap'>
              {t('heat')} {heatIndex}
            </p>
          </div>
        </div>
        {narrative && (
          <div className='inline-grid w-full ml-14 -mt-3 mr-2 pointer-events-none'>
            {/*<div className="flex items-center gap-1 mb-1">*/}
            {/*  <Sparkles className="w-3 h-3 text-amber-400" />*/}
            {/*  /!*<span className="text-[10px] text-amber-400 font-medium">AI Generated</span>*!/*/}
            {/*</div>*/}
            <p className='text-xs theme-text-secondary leading-relaxed whitespace-normal break-words'>
              {narrative}
            </p>
          </div>
        )}
        {summary && (
          <div
            className='inline-grid w-full ml-14 -mt-3 mr-2 pointer-events-none'
            data-testid='trending'
          >
            <p className='text-xs theme-text-secondary leading-relaxed whitespace-normal break-words'>
              {summary}
            </p>
          </div>
        )}
      </a>
    </div>
  );
}
