import { useState, useEffect, useRef, useMemo } from 'react';
import { User } from 'lucide-react';
import { useVirtualList } from 'ahooks';
import { HotItem, HotDiscussion, DiscussionAttitudeItem } from './types';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { rankService } from '~/utils/rankService';
import { useI18n } from '~contents/hooks/i18n.ts';
import AvatarRankBadge from '../AvatarRankBadge';
import type { StoredUserInfo } from '~types/review.ts';

type TrendingItem = HotItem | HotDiscussion | DiscussionAttitudeItem;

interface TrendingListVisualizationProps {
  items: TrendingItem[];
  loading: boolean;
  type: 'project' | 'person' | 'discussion';
}

export function TrendingListVisualization({
  items,
  loading,
  type,
}: TrendingListVisualizationProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [token] = useLocalStorage('@xhunt/token', '');
  const [user] = useLocalStorage<StoredUserInfo | null>('@xhunt/user', null);

  const [avatarRankMode, , { isLoading: isAvatarRankModeLoading }] =
    useLocalStorage<'influence' | 'composite'>(
      '@settings/avatarRankMode',
      'influence'
    );
  const { lang } = useI18n();
  const [userRanks, setUserRanks] = useState<Record<string, number>>({});
  const [loadingRanks, setLoadingRanks] = useState<Set<string>>(new Set());

  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  // 按热度指数排序（从高到低）
  const sortedItems = useMemo(() => {
    // For 'person' type with score, sort by score descending.
    // For others, sort by share descending.
    if (type === 'person' && items.length > 0 && 'score' in items[0]) {
      return [...items].sort((a, b) => (b as any).score - (a as any).score);
    }
    return [...items].sort((a, b) => b.share - a.share);
  }, [items, type]);

  // 我当前用户排名：不请求 API，直接在 sortedItems 里按 username（大小写不敏感）查找
  const currentUserRank = useMemo(() => {
    if (!token) return null;

    const myUsername = user?.username;
    if (!myUsername) return null;

    const myUsernameLower = myUsername.toLowerCase();

    const idx = sortedItems.findIndex(
      (item) => item.twitter.username.toLowerCase() === myUsernameLower
    );
    if (idx < 0) return null;
    const scoreVal =
      (sortedItems[idx] as any).score ??
      (sortedItems[idx] as any)['score:'] ??
      null;
    return {
      fan_rank: idx + 1,
      // 这里沿用原组件展示 point 的逻辑：用 share * 10000 作为显示值
      point: scoreVal
        ? (scoreVal ?? 0) * 100
        : sortedItems[idx].share
        ? Math.round(sortedItems[idx].share * 10000)
        : 0,
    };
  }, [sortedItems, token, user?.username]);

  const [list] = useVirtualList(sortedItems, {
    containerTarget: containerRef,
    wrapperTarget: wrapperRef,
    itemHeight: (index) => {
      const item = sortedItems[index];
      if (!item) return 0;

      const narrative =
        type === 'project' && (item as HotItem).twitter.feature?.narrative;
      const summary = type === 'person' || type === 'discussion';

      return narrative || summary ? 68 : 55;
    },
    overscan: 5,
  });

  // 使用排名服务获取排名（所有tab都获取）
  useEffect(() => {
    if (!sortedItems.length || isAvatarRankModeLoading) return;

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
    rankService.getRanks(allUsernames, avatarRankMode).then((ranks) => {
      setUserRanks(ranks);
    });

    return () => {
      removeCallback();
    };
  }, [sortedItems, isAvatarRankModeLoading]);

  const { t } = useI18n();

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
          <div className='text-sm'>{t('noData')}</div>
          <div className='text-xs mt-1'>{t('tryDifferentPeriod')}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 我的排名 - 仅登录后显示 */}
      {type === 'person' && token && (
        <div className='relative flex items-center gap-1.5 px-2 py-1 rounded-md theme-bg-secondary/50 border theme-border whitespace-nowrap flex-shrink-0 mx-3 mt-2 mb-2 mr-4'>
          {
            <>
              <User className='w-3 h-3 theme-text-secondary flex-shrink-0' />
              <span className='text-xs font-medium theme-text-secondary'>
                {t('irMy')}:
              </span>
              <span className='text-xs font-medium theme-text-primary'>
                {currentUserRank &&
                typeof currentUserRank.fan_rank === 'number' &&
                currentUserRank.fan_rank > 0
                  ? t('irRankN').replace(
                      '@{n}',
                      String(currentUserRank.fan_rank)
                    )
                  : t('irNotRanked')}
              </span>
              {typeof currentUserRank?.point === 'number' && (
                <>
                  <span className='text-xs theme-text-secondary'>•</span>
                  <span className='text-xs theme-text-secondary'>
                    {typeof currentUserRank?.point === 'number'
                      ? currentUserRank.point
                      : 0}{' '}
                    {t('points')}
                  </span>
                </>
              )}
            </>
          }
        </div>
      )}

      <div
        ref={containerRef}
        className='py-2 h-[360px] overflow-y-auto custom-scrollbar'
      >
        <div
          ref={wrapperRef}
          style={{
            maxHeight: 'max-content',
            // minHeight: 'min-content',
          }}
        >
          {list.map((ele) => {
            const hotItem = ele.data as HotItem | HotDiscussion;
            return (
              <div
                style={{ marginBottom: '8px' }}
                key={(hotItem as any).id || hotItem.twitter.username}
              >
                <TrendingListItem
                  item={hotItem}
                  index={ele.index}
                  totalItems={sortedItems.length}
                  theme={theme}
                  userRank={userRanks[hotItem.twitter.username_raw] || -1}
                  isLoading={loadingRanks.has(hotItem.twitter.username_raw)}
                  type={type}
                  lang={lang}
                  avatarRankMode={avatarRankMode}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface TrendingListItemProps {
  item: TrendingItem;
  index: number;
  totalItems: number;
  theme: string;
  userRank: number;
  isLoading: boolean;
  type: 'project' | 'person' | 'discussion';
  lang: string;
  avatarRankMode: 'influence' | 'composite';
}

function TrendingListItem({
  item,
  index,
  totalItems,
  theme,
  userRank,
  isLoading,
  type,
  lang,
  avatarRankMode,
}: TrendingListItemProps) {
  const { t } = useI18n();
  // 优先使用 score 字段，其次使用 share 计算热度
  const scoreVal = (item as any).score ?? (item as any)['score:'] ?? null;
  const heatIndex = item.share ? Math.round(item.share * 10000) : null;

  // 获取叙事内容（仅项目类型）
  const narrative =
    type === 'project' && (item as HotItem).twitter.feature?.narrative
      ? lang === 'zh'
        ? (item as HotItem).twitter.feature.narrative.cn
        : (item as HotItem).twitter.feature.narrative.en
      : null;

  // 获取摘要内容（KOL/person 或 discussion 类型）
  const summary =
    type === 'person' || type === 'discussion'
      ? lang === 'zh'
        ? (item as any).summary_cn
        : (item as any).summary_en
      : null;

  return (
    <div className='px-3 py-2 rounded-md theme-hover transition-colors virtual-list-item'>
      <a
        href={
          (item as any).tweet_url || `https://x.com/${item.twitter.username}`
        }
        target='_blank'
        rel='noopener noreferrer'
        className='flex items-center gap-2.5 flex-wrap'
      >
        {/* 排名序号 - 仅当列表总数 > 20 时显示 */}
        {totalItems > 20 && (
          <div
            className={`flex-shrink-0 flex justify-center w-7 ${
              narrative || summary ? 'translate-y-[8px]' : ''
            }`}
          >
            <span
              className={`min-w-[20px] px-1.5 h-5 flex items-center justify-center text-[11px] font-semibold rounded-full ${
                index === 0
                  ? 'bg-[#e3c102]/90 text-white'
                  : index === 1
                  ? 'bg-[#C0C0C0]/90 text-white'
                  : index === 2
                  ? 'bg-[#CD7F32]/90 text-white'
                  : 'bg-black/5 theme-text-secondary'
              }`}
            >
              {index + 1}
            </span>
          </div>
        )}

        <div
          className={`relative rounded-full ${
            narrative || summary ? 'translate-y-[8px]' : ''
          }`}
          style={{ border: '3px solid var(--xhunt-avatar-outer-border-color)' }}
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
          <AvatarRankBadge
            rank={userRank}
            isLoading={isLoading}
            avatarRankMode={avatarRankMode}
            theme={theme}
            loadingPlaceholder='...'
          />
        </div>
        <div className='flex-1 min-w-0 pl-[3px]'>
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
              {(item as DiscussionAttitudeItem).displayValue
                ? (item as DiscussionAttitudeItem).displayValue
                : scoreVal !== null
                ? `${t('score')} ${Number(Number(scoreVal) * 100).toFixed(0)}`
                : heatIndex !== null
                ? `${t('heat')} ${heatIndex}`
                : ''}
            </p>
          </div>
        </div>
        {narrative && (
          <div
            className={`inline-grid w-full ${
              totalItems > 20 ? 'ml-[5.9rem]' : 'ml-14'
            } -mt-3 mr-2 pointer-events-none`}
            data-testid='narrative'
          >
            <p
              className='text-xs theme-text-secondary leading-relaxed whitespace-normal break-words line-clamp-2'
              title={narrative}
            >
              {narrative}
            </p>
          </div>
        )}
        {summary && (
          <div
            className={`inline-grid w-full ${
              totalItems > 20 ? 'ml-[5.9rem]' : 'ml-14'
            } -mt-3 mr-2 pointer-events-none`}
            data-testid='summary'
          >
            <p
              className='text-xs theme-text-secondary leading-relaxed whitespace-normal break-words line-clamp-2'
              title={summary}
            >
              {summary}
            </p>
          </div>
        )}
      </a>
    </div>
  );
}
