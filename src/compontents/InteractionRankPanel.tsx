import React from 'react';
import { Loader2, Info, User } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { InteractionRankItem } from '~contents/services/api.ts';
import type {
  FanByHandleResponse,
  TwitterInitialStateCurrentUser,
} from '~types';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { formatRank } from '~js/utils.ts';
import { rankService } from '~/utils/rankService';
import { useEffect, useState } from 'react';
import { fetchFanByHandle } from '~contents/services/api.ts';
import { getCurrentUserInfo } from '~contents/utils/helpers';
import { useRequest } from 'ahooks';
import usePlacementTrackingDomUserInfo from '~contents/hooks/usePlacementTrackingDomUserInfo';

interface InteractionRankPanelProps {
  userId: string;
  username?: string;
  interactionRankData?: InteractionRankItem[];
  loading?: boolean;
  selectedDays: '7' | '30';
  onDaysChange: (days: '7' | '30') => void;
}

export function InteractionRankPanel({
  userId: _,
  username,
  interactionRankData,
  loading = false,
  selectedDays,
  onDaysChange,
}: InteractionRankPanelProps) {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [showAvatarRank] = useLocalStorage('@settings/showAvatarRank', true);
  const [userRanks, setUserRanks] = useState<Record<string, number>>({});
  const [loadingRanks, setLoadingRanks] = useState<Set<string>>(new Set());
  const [currentUserInfo, setCurrentUserInfo] =
    useState<TwitterInitialStateCurrentUser | null>(null);
  const { twitterId } = usePlacementTrackingDomUserInfo();

  // 使用排名服务获取排名
  useEffect(() => {
    if (!interactionRankData || !showAvatarRank) return;

    const usernames = interactionRankData
      .map((item) => item.username_raw)
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
  }, [interactionRankData, showAvatarRank]);

  // 获取当前用户名
  useEffect(() => {
    getCurrentUserInfo().then((userInfo) => {
      setCurrentUserInfo(userInfo || null);
    });
  }, []);

  // 当前用户对该 KOL 的粉丝排名 & 分数（ahooks useRequest）
  const { data: fanStats, loading: fanLoading } = useRequest<
    FanByHandleResponse | undefined,
    any[]
  >(
    async () => {
      if (!currentUserInfo?.id_str) return undefined;
      return fetchFanByHandle(currentUserInfo?.id_str, twitterId);
    },
    {
      ready:
        Boolean(twitterId) &&
        Boolean(interactionRankData && interactionRankData.length > 0) &&
        Boolean(currentUserInfo?.id_str),
      refreshDeps: [
        twitterId,
        interactionRankData?.length,
        currentUserInfo?.id_str,
      ],
    }
  );

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-16'>
        <Loader2 className='w-5 h-5 text-blue-400 animate-spin mb-2' />
        <p className='text-xs theme-text-secondary'>{t('loading')}</p>
      </div>
    );
  }

  if (!interactionRankData || interactionRankData.length === 0) {
    return (
      <div className='flex items-center justify-center h-16'>
        <p className='text-xs theme-text-secondary'>{t('noDataAvailable')}</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Days selector - Fixed at top */}
      <div className='flex-shrink-0 px-4 pt-2 pb-2 border-b theme-border sticky top-0 theme-bg-primary z-[99999]'>
        <div className='flex items-center justify-between'>
          {/* Left side: Title and stats */}
          <div className='flex items-center gap-2'>
            {/* <TrendingUp className='w-4 h-4 text-blue-400' /> */}
            {/* 🌟 */}
            <span className='text-xs font-semibold theme-text-primary leading-tight whitespace-nowrap'>
              {t('interactionRank')}
            </span>
            {/* {interactionRankData && interactionRankData.length > 0 && (
              <span className='text-xs theme-text-secondary leading-tight'>
                ({interactionRankData.length} {t('interactionRankCount')})
              </span>
            )} */}
            <span className='relative group inline-flex items-center'>
              <Info className='w-4 h-4 theme-text-secondary flex-shrink-0 cursor-help' />
              <div
                className={`absolute ${
                  lang === 'zh' ? '-left-20' : '-left-32'
                } top-full mt-2 px-3 py-1.5 theme-bg-secondary text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 theme-text-primary theme-border border min-w-80 max-w-md text-left leading-5`}
              >
                <div className='space-y-1'>
                  <div className='font-medium whitespace-nowrap'>
                    {t('irInfoTitle')}
                  </div>
                  <div className='whitespace-nowrap'>
                    {t('irInfoTimeRange').replace('@{days}', selectedDays)}
                  </div>
                  <div className='whitespace-nowrap'>{t('irInfoWeight')}</div>
                  <div className='whitespace-nowrap'>{t('irInfoContent')}</div>
                  <div className='whitespace-nowrap'>
                    {t('irInfoTimeliness')}
                  </div>
                  <div className='whitespace-nowrap'>
                    {t('irInfoInfluence')}
                  </div>
                </div>
              </div>
            </span>
          </div>

          {/* Right side: current user's rank & point against this KOL */}
          <div
            className='relative flex items-center gap-1.5 px-2 py-1 rounded-md theme-bg-secondary/50 border theme-border whitespace-nowrap flex-shrink-0'
            data-days={selectedDays}
            data-has-onchange={!!onDaysChange}
          >
            {fanLoading ? (
              <div className='flex items-center gap-2'>
                <Loader2 className='w-3.5 h-3.5 animate-spin theme-text-secondary' />
                <span className='text-xs theme-text-secondary'>
                  {t('loading')}
                </span>
              </div>
            ) : (
              <>
                <User className='w-3 h-3 theme-text-secondary flex-shrink-0' />
                <span className='text-xs font-medium theme-text-secondary'>
                  {t('irMy')}:
                </span>
                <span className='text-xs font-medium theme-text-primary'>
                  {fanStats &&
                  typeof fanStats.fan_rank === 'number' &&
                  fanStats.fan_rank > 0
                    ? t('irRankN').replace('@{n}', String(fanStats.fan_rank))
                    : t('irNotRanked')}
                </span>
                <span className='text-xs theme-text-secondary'>•</span>
                <span className='text-xs theme-text-secondary'>
                  {typeof fanStats?.point === 'number' ? fanStats.point : 0}{' '}
                  {t('points')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rank list - Scrollable */}
      <div className='flex-1 overflow-y-auto space-y-2 py-2 px-1'>
        {interactionRankData.map((item, index) => {
          const itemUsername = item.username_raw;
          const userRank = userRanks[itemUsername] || -1;
          const isLoading = loadingRanks.has(itemUsername);

          return (
            <InteractionRankItemRow
              key={`${item.id}-${index}`}
              item={item}
              rank={userRank}
              isLoading={isLoading}
              theme={theme}
              showAvatarRank={showAvatarRank}
              isCurrentUser={
                currentUserInfo
                  ? item.username_raw?.toLowerCase() ===
                    currentUserInfo?.screen_name?.toLowerCase()
                  : false
              }
            />
          );
        })}
      </div>
    </div>
  );
}

interface InteractionRankItemRowProps {
  item: InteractionRankItem;
  rank?: number;
  isLoading?: boolean;
  theme: string;
  showAvatarRank: boolean;
  isCurrentUser?: boolean;
}

function InteractionRankItemRow({
  item,
  rank,
  isLoading = false,
  theme,
  showAvatarRank,
  isCurrentUser = false,
}: InteractionRankItemRowProps) {
  const { t, lang } = useI18n();
  return (
    <a
      href={`https://x.com/${item.username_raw}`}
      target='_blank'
      rel='noopener noreferrer'
      className={`flex items-center gap-2.5 px-6 py-2 rounded-md theme-hover transition-colors ${
        isCurrentUser
          ? 'ring-2 ring-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20 mx-0.5'
          : ''
      }`}
    >
      <div
        className='relative rounded-full'
        style={{ border: '3px solid #60A5FA80' }}
      >
        <img
          src={item.profile_image_url}
          alt={item.name}
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
          <p
            className={`font-medium text-sm truncate ${
              isCurrentUser
                ? 'text-blue-600 dark:text-blue-400'
                : 'theme-text-primary'
            }`}
          >
            {item.name}
          </p>
          {isCurrentUser && (
            <span className='text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium'>
              {t('irMe')}
            </span>
          )}
        </div>
        <div className='flex items-center gap-1'>
          <p
            className={`text-xs truncate ${
              isCurrentUser
                ? 'text-blue-500 dark:text-blue-400'
                : 'theme-text-secondary'
            }`}
          >
            @{item.username_raw}
          </p>
          <span className='text-xs theme-text-secondary'>•</span>
          <p className='text-xs theme-text-secondary font-medium'>
            {typeof item.point === 'number' && item.point % 1 === 0
              ? item.point
              : item.point.toFixed(2)}{' '}
            {t('points')}
          </p>
        </div>
      </div>
    </a>
  );
}
