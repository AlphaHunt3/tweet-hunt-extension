import cssText from 'data-text:~/css/style.css';
import React, { useState, useCallback, useEffect } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import { MainData } from '~contents/hooks/useMainData.ts';
import ReactDOM from 'react-dom';
import { KolFollowersSection } from '~/compontents/KolFollowersSection.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import numeral from 'numeral';
import { ReviewHeader } from '~/compontents/ReviewHeader.tsx';
import ErrorBoundary from '~/compontents/ErrorBoundary.tsx';
import { ArrowUp, ArrowDown } from 'lucide-react';
import {
  GhostFollowingPanelEventDetail,
  GHOST_FOLLOWING_PANEL_EVENT,
} from './GhostFollowingPanel';
import { KolData } from '~types';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useCrossPageSettings } from '~/utils/settingsManager.ts';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import { SkinScope } from '~/ui/skin/SkinScope';
import { buildKolStats, buildRankStats, type RankStatKey, type RankType } from '~/ui/profile/kolRankItems';
import { ProfileKolRow } from '~/ui/profile/ProfileKolRow';

const RANK_TYPES: Record<RankStatKey, RankType> = {
  rankGlobal: 'followers',
  rankCn: 'chinese',
  rankEn: 'english',
  rankProject: 'project',
};
import { useUserDomain } from '~contents/hooks/useUserDomain';

type FollowedRightDataProps = Pick<
  MainData,
  | 'twInfo'
  | 'error'
  | 'userId'
  | 'loadingTwInfo'
  | 'reviewInfo'
  | 'refreshAsyncReviewInfo'
  | 'refreshAsyncUserInfo'
  | 'loadingReviewInfo'
>;

const renderRankChange = (change: number | undefined | null) => {
  try {
    if (!change || change === 0) return null;
    const isPositive = change > 0;
    const Icon = isPositive ? ArrowUp : ArrowDown;
    const textColor = isPositive ? 'text-green-500' : 'text-red-500';

    return (
      <span
        className={`align-text-top inline-flex items-center ${textColor} ml-1`}
      >
        <Icon className='w-3.5 h-3.5' strokeWidth={2.5} />
        <span className='text-xs ml-0.5'>{Math.abs(change)}</span>
      </span>
    );
  } catch (err) {
    return null;
  }
};

function FollowStatsSkeleton() {
  const items = [
    { label: 'w-9', value: 'w-12' },
    { label: 'w-10', value: 'w-11' },
    { label: 'w-8', value: 'w-12' },
    { label: 'w-10', value: 'w-14' },
  ];

  return (
    <>
      <div className='mr-6' />
      {items.map((item, index) => (
        <div
          key={index}
          data-xhunt-exclude='true'
          className='relative mr-4 inline-flex align-baseline'
          style={{ width: 'max-content' }}
        >
          <div className='flex items-center gap-1 rounded px-1 -mx-1 leading-5 h-5'>
            <span
              className={`inline-block h-3.5 ${item.label} rounded-sm bg-gray-300/40 dark:bg-gray-700/50 animate-pulse`}
            />
            <span
              className={`inline-block h-3 ${item.value} rounded-sm bg-gray-300/30 dark:bg-gray-700/40 animate-pulse`}
            />
          </div>
        </div>
      ))}
    </>
  );
}

function ReviewHeaderSkeleton() {
  return (
    <div className='min-w-full mt-3 mb-1 px-3 py-2 rounded-xl border border-gray-200/20 dark:border-white/10 bg-gray-100/10 dark:bg-white/[0.02]'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className='w-4 h-4 rounded bg-gray-300/35 dark:bg-gray-700/45 animate-pulse flex-shrink-0' />
          <span className='h-4 w-24 rounded-sm bg-gray-300/35 dark:bg-gray-700/45 animate-pulse' />
        </div>
        <span className='h-4 w-14 rounded-sm bg-gray-300/30 dark:bg-gray-700/40 animate-pulse flex-shrink-0' />
      </div>
    </div>
  );
}

const RankTooltip = React.memo(
  ({
    twInfo,
    rankType,
    isAi = false,
  }: {
    twInfo: KolData | null;
    rankType: 'followers' | 'project' | 'chinese' | 'english';
    isAi?: boolean;
  }) => {
    const [activePeriod, setActivePeriod] = useState<'day1' | 'day7' | 'day30'>(
      'day1',
    );
    const { t } = useI18n();
    const [theme] = useLocalStorage('@xhunt/theme', 'dark');

    if (!twInfo) return null;

    let change;
    let rank;
    let title;
    let description;
    let tooltip;

    switch (rankType) {
      case 'followers':
        change = isAi
          ? twInfo?.kolFollow?.kolRankChangeAi?.[activePeriod]
          : twInfo?.kolFollow?.kolRankChange?.[activePeriod];
        rank = isAi
          ? twInfo?.kolFollow?.kolRank20WAi
          : twInfo?.kolFollow?.kolRank20W;
        title = t('followersQualityRankChange');
        description =
          !rank || rank <= 0
            ? isAi
              ? t('notInTop50k')
              : t('notInTop10w')
            : isAi
              ? `${t('inTop50k1')} ${rank} ${t('inTop50k2')}`
              : `${t('inTop10w1')} ${rank} ${t('inTop10w2')}`;
        tooltip = t('globalInfluenceRankTooltip');
        break;
      case 'project':
        change = isAi
          ? twInfo?.kolFollow?.kolProjectRankChangeAi?.[activePeriod]
          : twInfo?.kolFollow?.kolProjectRankChange?.[activePeriod];
        rank = isAi
          ? twInfo?.kolFollow?.kolProjectRankAi
          : twInfo?.kolFollow?.kolProjectRank;
        title = t('projectRankChange');
        description =
          !rank || rank <= 0
            ? t('notInTop10kProject')
            : Number(rank) > Number(t('kolProjectRankTotal') || 10000)
              ? `${t('inTop10kProject1')} >${formatUpperCase(
                Number(t('kolProjectRankTotal')),
              )}`
              : `${t('inTop10kProject1')} ${rank} ${t('inTop10kProject2')}`;
        tooltip = t('projectInfluenceRankTooltip');
        break;
      case 'chinese':
        change = isAi
          ? twInfo?.kolFollow?.kolCnRankChangeAi?.[activePeriod]
          : twInfo?.kolFollow?.kolCnRankChange?.[activePeriod];
        rank = isAi
          ? twInfo?.kolFollow?.kolCnRankAi
          : twInfo?.kolFollow?.kolCnRank;
        title = t('chineseKOLRankChange');
        {
          const cnTotal = isAi ? 3000 : Number(t('kolCnRankTotal') || 10000);
          description =
            !rank || rank <= 0
              ? isAi
                ? t('notInTop3k')
                : t('notInTop1k')
              : Number(rank) > cnTotal
                ? `${isAi ? t('inTop3k1') : t('inTop1k1')} >${formatUpperCase(cnTotal)}`
                : `${isAi ? t('inTop3k1') : t('inTop1k1')} ${rank} ${isAi ? t('inTop3k2') : t('inTop1k2')}`;
        }
        tooltip = t('chineseInfluenceRankTooltip');
        break;
      case 'english':
        change = isAi
          ? (twInfo?.kolFollow?.kolGlobalRankChangeAi?.[activePeriod] as any)
          : (twInfo?.kolFollow?.kolGlobalRankChange?.[activePeriod] as any);
        rank = isAi
          ? (twInfo?.kolFollow?.kolGlobalRankAi as any)
          : (twInfo?.kolFollow?.kolGlobalRank as any);
        title = t('englishInfluenceRankChange');
        description =
          !rank || rank <= 0
            ? t('notInTopEn')
            : Number(rank) > Number(t('kolEnRankTotal') || 10000)
              ? `${t('inTopEn1')} >${formatUpperCase(
                Number(t('kolEnRankTotal')),
              )}`
              : `${t('inTopEn1')} ${rank} ${t('inTopEn2')}`;
        tooltip = t('englishInfluenceRankTooltip');
        break;
    }

    // if (!change) return null;

    return (
      <div
        data-theme={theme}
        className='theme-bg-secondary rounded-lg theme-border  p-3 w-full'
      >
        <div className='text-xs space-y-2'>
          <div className='flex justify-between items-center mb-4'>
            <button
              className={`px-2 py-1 rounded transition-colors ${activePeriod === 'day1'
                ? 'theme-bg-tertiary theme-text-primary'
                : 'theme-text-secondary hover:theme-bg-tertiary'
                }`}
              onClick={() => setActivePeriod('day1')}
            >
              {t('day1')}
            </button>
            <button
              className={`px-2 py-1 rounded transition-colors ${activePeriod === 'day7'
                ? 'theme-bg-tertiary theme-text-primary'
                : 'theme-text-secondary hover:theme-bg-tertiary'
                }`}
              onClick={() => setActivePeriod('day7')}
            >
              {t('day7')}
            </button>
            <button
              className={`px-2 py-1 rounded transition-colors ${activePeriod === 'day30'
                ? 'theme-bg-tertiary theme-text-primary'
                : 'theme-text-secondary hover:theme-bg-tertiary'
                }`}
              onClick={() => setActivePeriod('day30')}
            >
              {t('day30')}
            </button>
          </div>
          <div className='p-2 theme-bg-tertiary rounded-lg'>
            <div className='flex justify-between items-center'>
              <span className='theme-text-secondary'>{title}</span>
              {change === 0 ? 0 : change ? renderRankChange(change) : '-'}
            </div>
            <div className='mt-1 text-[11px] theme-text-secondary opacity-80'>
              {description}
            </div>
          </div>

          {/* 说明文字移到底部，样式更轻量 */}
          <div className='pt-2 mt-2 border-t theme-border'>
            <div className='flex items-start gap-2'>
              <div className='w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0'></div>
              <p className='text-[10px] theme-text-secondary leading-relaxed opacity-75'>
                {tooltip}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

function _FollowedRightData({
  twInfo,
  error,
  userId,
  loadingTwInfo,
  reviewInfo,
  refreshAsyncReviewInfo,
  refreshAsyncUserInfo,
  loadingReviewInfo,
}: FollowedRightDataProps) {
  const [isGhostPanelOpen, setIsGhostPanelOpen] = useState(false);
  const { t, lang } = useI18n();
  const { hasWeb3, hasAi, primaryDomain } = useUserDomain();

  // 监听面板关闭事件
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<GhostFollowingPanelEventDetail>;
      if (customEvent.detail.source === 'panel') {
        setIsGhostPanelOpen(customEvent.detail.open);
      }
    };
    window.addEventListener(GHOST_FOLLOWING_PANEL_EVENT, handler);
    return () =>
      window.removeEventListener(GHOST_FOLLOWING_PANEL_EVENT, handler);
  }, []);

  // 用户主动切换的领域（localStorage，跨新开 tab 保留）
  const [savedActiveDomain, setSavedActiveDomain] = useLocalStorage<
    'web3' | 'ai' | null
  >('@xhunt/followed-active-domain', null);

  const getDefaultDomain = useCallback(
    () => (hasWeb3 && hasAi ? primaryDomain : hasWeb3 ? 'web3' : 'ai'),
    [hasWeb3, hasAi, primaryDomain],
  );

  const [activeDomain, setActiveDomain] = useState<'web3' | 'ai'>(
    savedActiveDomain || getDefaultDomain(),
  );

  // 当用户修改首选领域或关闭某个领域后，同步更新当前激活的面
  // 如果当前激活的领域已被关闭，强制切换到另一个可用领域
  // 否则优先恢复用户主动切换的领域，并支持新 tab 水合后恢复
  useEffect(() => {
    if (savedActiveDomain === 'ai' && hasAi) {
      setActiveDomain('ai');
    } else if (savedActiveDomain === 'web3' && hasWeb3) {
      setActiveDomain('web3');
    } else {
      setActiveDomain(getDefaultDomain());
    }
  }, [savedActiveDomain, hasWeb3, hasAi, getDefaultDomain]);

  // 用户主动切换领域：更新 state + localStorage
  const handleSwitchDomain = useCallback(
    (domain: 'web3' | 'ai') => {
      setActiveDomain(domain);
      setSavedActiveDomain(domain);
    },
    [setSavedActiveDomain],
  );

  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    siblingsXPath:
      ".//*[ (contains(., 'Following') and contains(., 'Followers')) or (contains(., '正在关注') and contains(., '关注者')) or (contains(., '個跟隨中') and contains(., '位跟隨者')) or (contains(., 'フォロワー') and contains(., 'フォロー中')) ]",
    styleText: cssText,
    useSiblings: true,
    shadowMode: 'open',
  });
  const portalHost = usePersistentPortalHost(shadowRoot);

  // 使用响应式设置管理
  const { isEnabled } = useCrossPageSettings();

  if (!shadowRoot) return null;

  if (error || !userId) {
    return <></>;
  }

  const domainAvailable = activeDomain === 'web3' ? hasWeb3 : hasAi;

  return ReactDOM.createPortal(
    <SkinScope data-xhunt-testid='followed-right-data'>
      {loadingTwInfo ? (
        <FollowStatsSkeleton />
      ) : twInfo && (
        <>
          <ProfileKolRow
            kolStats={
              domainAvailable
                ? buildKolStats({ t, isEnabled, domain: activeDomain, kolFollow: twInfo?.kolFollow })
                : []
            }
            rankStats={
              domainAvailable
                ? buildRankStats({ t, lang, isEnabled, domain: activeDomain, kolFollow: twInfo?.kolFollow })
                : []
            }
            domain={activeDomain}
            canSwitch={hasWeb3 && hasAi}
            onDomainChange={handleSwitchDomain}
            renderDetail={(key) => {
              if (key === 'kolGlobal' || key === 'kolTop100' || key === 'kolCn') {
                const tab = key === 'kolGlobal' ? 'global' : key === 'kolTop100' ? 'top100' : 'cn';
                return (
                  <KolFollowersSection
                    kolData={twInfo}
                    isHoverPanel={true}
                    defaultTab={tab}
                    domain={activeDomain}
                  />
                );
              }
              const rankType = RANK_TYPES[key];
              return <RankTooltip twInfo={twInfo} rankType={rankType} isAi={activeDomain === 'ai'} />;
            }}
          />
        </>
      )}

      {isEnabled('showReviews') &&
        (loadingTwInfo || loadingReviewInfo ? (
          <ReviewHeaderSkeleton />
        ) : (
          <ErrorBoundary name='ReviewHeader'>
            {/*// @ts-ignore*/}
            <ReviewHeader
              stats={{
                averageRating: reviewInfo?.averageRating ?? 0,
                totalReviews: reviewInfo?.totalReviews ?? 0,
                realTotalReviews: reviewInfo?.realTotalReviews ?? 0,
                tagCloud: reviewInfo?.tagCloud ?? [],
                topReviewers: reviewInfo?.topReviewers ?? [],
                currentUserReview: reviewInfo?.currentUserReview,
                defaultTags: reviewInfo?.defaultTags ?? {
                  kol: [],
                  project: [],
                  colorTags: {},
                },
                isKol: twInfo?.basicInfo?.classification !== 'project',
                allTagCount: reviewInfo?.allTagCount ?? 0,
              }}
              handler={userId}
              refreshAsyncReviewInfo={refreshAsyncReviewInfo}
              refreshAsyncUserInfo={refreshAsyncUserInfo}
              loadingReviewInfo={loadingReviewInfo}
            />
          </ErrorBoundary>
        ))}

    </SkinScope>,
    portalHost!,
  );
}

function formatUpperCase(num: number) {
  return numeral(Number(num))
    .format('0,0a')
    .replace(/([kmt])/i, (_, c) => c.toUpperCase());
}

export const FollowedRightData = React.memo(_FollowedRightData);
