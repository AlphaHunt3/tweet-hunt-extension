import cssText from 'data-text:~/css/style.css';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import { MainData } from '~contents/hooks/useMainData.ts';
import ReactDOM from 'react-dom';
import { HoverStatItem } from '~/compontents/HoverStatItem.tsx';
import { formatNumber, openNewTab } from '~contents/utils';
import { KolFollowersSection } from '~/compontents/KolFollowersSection.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import numeral from 'numeral';
import { ReviewHeader } from '~/compontents/ReviewHeader.tsx';
import ErrorBoundary from '~/compontents/ErrorBoundary.tsx';
import ReactDOMServer from 'react-dom/server';
import { ArrowUp, ArrowDown, Ghost, ChevronRight } from 'lucide-react';
import {
  GhostFollowingPanelEventDetail,
  GHOST_FOLLOWING_PANEL_EVENT,
} from './GhostFollowingPanel';
import { KolData } from '~types';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useCrossPageSettings } from '~/utils/settingsManager.ts';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { useLockFn } from 'ahooks';



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

const RankTooltip = React.memo(
  ({
    twInfo,
    rankType,
  }: {
    twInfo: KolData | null;
    rankType: 'followers' | 'project' | 'chinese' | 'english';
  }) => {
    const [activePeriod, setActivePeriod] = useState<'day1' | 'day7' | 'day30'>(
      'day1'
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
        change = twInfo?.kolFollow?.kolRankChange?.[activePeriod];
        rank = twInfo?.kolFollow?.kolRank20W;
        title = t('followersQualityRankChange');
        description =
          !rank || rank <= 0
            ? t('notInTop10w')
            : `${t('inTop10w1')} ${rank} ${t('inTop10w2')}`;
        tooltip = t('globalInfluenceRankTooltip');
        break;
      case 'project':
        change = twInfo?.kolFollow?.kolProjectRankChange?.[activePeriod];
        rank = twInfo?.kolFollow?.kolProjectRank;
        title = t('projectRankChange');
        description =
          !rank || rank <= 0
            ? t('notInTop10kProject')
            : Number(rank) > Number(t('kolProjectRankTotal') || 10000)
              ? `${t('inTop10kProject1')} >${formatUpperCase(
                Number(t('kolProjectRankTotal'))
              )}`
              : `${t('inTop10kProject1')} ${rank} ${t('inTop10kProject2')}`;
        tooltip = t('projectInfluenceRankTooltip');
        break;
      case 'chinese':
        change = twInfo?.kolFollow?.kolCnRankChange?.[activePeriod];
        rank = twInfo?.kolFollow?.kolCnRank;
        title = t('chineseKOLRankChange');
        description =
          !rank || rank <= 0
            ? t('notInTop1k')
            : Number(rank) > Number(t('kolCnRankTotal') || 10000)
              ? `${t('inTop1k1')} >${formatUpperCase(
                Number(t('kolCnRankTotal'))
              )}`
              : `${t('inTop1k1')} ${rank} ${t('inTop1k2')}`;
        tooltip = t('chineseInfluenceRankTooltip');
        break;
      case 'english':
        change = twInfo?.kolFollow?.kolGlobalRankChange?.[activePeriod] as any;
        rank = twInfo?.kolFollow?.kolGlobalRank as any;
        title = t('englishInfluenceRankChange');
        description =
          !rank || rank <= 0
            ? t('notInTopEn')
            : Number(rank) > Number(t('kolEnRankTotal') || 10000)
              ? `${t('inTopEn1')} >${formatUpperCase(
                Number(t('kolEnRankTotal'))
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
  }
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
}: MainData) {
  const ghostButtonRef = useRef<HTMLDivElement>(null);
  const [isGhostPanelOpen, setIsGhostPanelOpen] = useState(false);
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [token] = useLocalStorage('@xhunt/token', '');
  const [currentUsername] = useLocalStorage('@xhunt/current-username', '');
  const { t } = useI18n();

  // 登录跳转
  const redirectToLogin = useLockFn(async () => {
    try {
      const ret = await getTwitterAuthUrl();
      if (ret?.url) {
        openNewTab(ret.url);
      }
    } catch (e) { }
  });

  // 检查是否登录
  const isLoggedIn = !!token;

  // 判断是否在当前用户的个人页面
  const isOwnProfile = useMemo(() => {
    if (!currentUsername || !userId) return false;
    return currentUsername.toLowerCase() === userId.toLowerCase();
  }, [currentUsername, userId]);

  // 监听面板关闭事件
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<GhostFollowingPanelEventDetail>;
      if (customEvent.detail.source === 'panel') {
        setIsGhostPanelOpen(customEvent.detail.open);
      }
    };
    window.addEventListener(GHOST_FOLLOWING_PANEL_EVENT, handler);
    return () => window.removeEventListener(GHOST_FOLLOWING_PANEL_EVENT, handler);
  }, []);

  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    siblingsXPath:
      ".//*[ (contains(., 'Following') and contains(., 'Followers')) or (contains(., '正在关注') and contains(., '关注者')) or (contains(., '個跟隨中') and contains(., '位跟隨者')) or (contains(., 'フォロワー') and contains(., 'フォロー中')) ]",
    styleText: cssText,
    useSiblings: true,
  });
  const portalHost = usePersistentPortalHost(shadowRoot);
  const { lang } = useI18n();

  // 使用响应式设置管理
  const { isEnabled } = useCrossPageSettings();
  const kolRankChangeDom = ReactDOMServer.renderToStaticMarkup(
    renderRankChange(twInfo?.kolFollow?.kolRankChange?.day1 || 0)
  );
  const kolProjectRankChangeDom = ReactDOMServer.renderToStaticMarkup(
    renderRankChange(twInfo?.kolFollow?.kolProjectRankChange?.day1 || 0)
  );
  const kolCnRankChangeDom = ReactDOMServer.renderToStaticMarkup(
    renderRankChange(twInfo?.kolFollow?.kolCnRankChange?.day1 || 0)
  );
  const kolGlobalRankChangeDom = ReactDOMServer.renderToStaticMarkup(
    renderRankChange(twInfo?.kolFollow?.kolGlobalRankChange?.day1 || 0)
  );

  if (!shadowRoot) return null;

  if (error || !userId) {
    return <></>;
  }

  return ReactDOM.createPortal(
    <>
      {!loadingTwInfo && twInfo && (
        <>
          <div className={'mr-6'} />
          {/*全球KOL粉丝*/}
          {isEnabled('showKolFollowers') && (
            <HoverStatItem
              label={formatNumber(
                twInfo?.kolFollow?.globalKolFollowersCount || 0
              )}
              value={t('KOL_Followers')}
              hoverContent={
                twInfo?.kolFollow?.globalKolFollowersCount ? (
                  <KolFollowersSection
                    kolData={twInfo}
                    isHoverPanel={true}
                    defaultTab={'global'}
                  />
                ) : null
              }
              labelClassName={'font-bold'}
              valueClassName={'theme-text-secondary'}
            />
          )}

          {/*TOP100_KOLs*/}
          {isEnabled('showTop100Kols') && (
            <HoverStatItem
              label={formatNumber(twInfo?.kolFollow?.topKolFollowersCount || 0)}
              value={t('TOP100_KOLs')}
              hoverContent={
                twInfo?.kolFollow?.topKolFollowersCount ? (
                  <KolFollowersSection
                    kolData={twInfo}
                    isHoverPanel={true}
                    defaultTab={'top100'}
                  />
                ) : null
              }
              labelClassName={'font-bold'}
              valueClassName={'theme-text-secondary'}
            />
          )}

          {/*中文KOLs*/}
          {isEnabled('showCnKols') && (
            <HoverStatItem
              label={formatNumber(twInfo?.kolFollow?.cnKolFollowersCount || 0)}
              value={t('CN_KOLs')}
              hoverContent={
                twInfo?.kolFollow?.cnKolFollowersCount ? (
                  <KolFollowersSection
                    kolData={twInfo}
                    isHoverPanel={true}
                    defaultTab={'cn'}
                  />
                ) : null
              }
              labelClassName={'font-bold'}
              valueClassName={'theme-text-secondary'}
            />
          )}

          {/*关注着质量排名变化 */}
          {isEnabled('showFqRank') && (
            <HoverStatItem
              label={`${(() => {
                const rank = twInfo?.kolFollow?.kolRank20W;
                if (!rank || rank <= 0) return '>200K';
                return (
                  numeral(rank || 0).format('0,0') + '/200K' + kolRankChangeDom
                );
              })()}`}
              value={t('FQRank')}
              hoverContent={
                <RankTooltip twInfo={twInfo} rankType='followers' />
              }
              labelClassName={'font-bold'}
              valueClassName={'theme-text-secondary'}
            />
          )}

          {/* 影响力排名：中文显示华语；英文显示英文影响力（按条件） */}
          {lang === 'zh'
            ? isEnabled('showCnRank') &&
            twInfo?.kolFollow?.isCn && (
              <HoverStatItem
                label={`${!twInfo?.kolFollow?.kolCnRank ||
                  twInfo?.kolFollow?.kolCnRank <= 0 ||
                  Number(twInfo?.kolFollow?.kolCnRank) >
                  Number(t('kolCnRankTotal') || 10000)
                  ? `>${formatUpperCase(Number(t('kolCnRankTotal')))}`
                  : numeral(twInfo?.kolFollow?.kolCnRank || 0).format(
                    '0,0'
                  ) +
                  `/${formatUpperCase(Number(t('kolCnRankTotal')))}` +
                  kolCnRankChangeDom
                  }`}
                value={t('cnRank')}
                hoverContent={
                  <RankTooltip twInfo={twInfo} rankType='chinese' />
                }
                labelClassName={'font-bold'}
                valueClassName={'theme-text-secondary'}
              />
            )
            : isEnabled('showEnInfluenceRank') &&
            !!twInfo?.kolFollow?.kolGlobalRank && (
              <HoverStatItem
                label={`${(() => {
                  const total = Number(t('kolEnRankTotal')) || 10000;
                  const rank = Number(twInfo?.kolFollow?.kolGlobalRank || 0);
                  if (!rank || rank <= 0) {
                    return `>${formatUpperCase(total)}`;
                  }
                  if (rank > total) {
                    return (
                      `>${formatUpperCase(total)}` + kolGlobalRankChangeDom
                    );
                  }
                  return (
                    numeral(rank).format('0,0') +
                    `/${formatUpperCase(total)}` +
                    kolGlobalRankChangeDom
                  );
                })()}`}
                value={t('enInfluenceRank')}
                hoverContent={
                  <RankTooltip twInfo={twInfo} rankType='english' />
                }
                labelClassName={'font-bold'}
                valueClassName={'theme-text-secondary'}
              />
            )}

          {/*项目排名变化 */}
          {isEnabled('showProjectRank') && twInfo?.kolFollow?.isProject && (
            <HoverStatItem
              label={`${!twInfo?.kolFollow?.kolProjectRank ||
                twInfo?.kolFollow?.kolProjectRank <= 0 ||
                Number(twInfo?.kolFollow?.kolProjectRank) >
                Number(t('kolProjectRankTotal') || 10000)
                ? `>${formatUpperCase(Number(t('kolProjectRankTotal')))}`
                : numeral(twInfo?.kolFollow?.kolProjectRank || 0).format(
                  '0,0'
                ) +
                `/${formatUpperCase(Number(t('kolProjectRankTotal')))}` +
                kolProjectRankChangeDom
                }`}
              value={t('projectRank')}
              hoverContent={<RankTooltip twInfo={twInfo} rankType='project' />}
              labelClassName={'font-bold'}
              valueClassName={'theme-text-secondary'}
            />
          )}

          {/* 检测幽灵following按钮 - 只在当前用户的个人页面显示，且需要开启设置 */}
          {isOwnProfile && isEnabled('showGhostFollowing') && (
            <div
              ref={ghostButtonRef}
              data-theme={theme}
              className='relative mr-4 cursor-pointer group'
              onClick={() => {
                // 未登录时跳转到登录
                if (!isLoggedIn) {
                  redirectToLogin();
                  return;
                }
                const nextState = !isGhostPanelOpen;
                setIsGhostPanelOpen(nextState);
                window.dispatchEvent(
                  new CustomEvent<GhostFollowingPanelEventDetail>(
                    GHOST_FOLLOWING_PANEL_EVENT,
                    {
                      detail: {
                        open: nextState,
                        anchor: ghostButtonRef.current || undefined,
                        source: undefined,
                      },
                    }
                  )
                );
              }}
            >
              <div className='flex items-center gap-0.5 relative'>
                <Ghost className='w-4 h-4 theme-text-secondary' />
                <span className='text-sm theme-text-secondary group-hover:underline'>
                  {t('detectGhostFollowing')}
                </span>
                <span style={{
                  transform: "translate(-4px, -7px)"
                }} className='px-0.5 text-[6px] font-semibold leading-none transform'>
                  <svg
                    className='w-4 h-[auto]'
                    viewBox='0 0 1024 1024'
                    version='1.1'
                    xmlns='http://www.w3.org/2000/svg'
                    p-id='10824'
                    width='64'
                    height='64'
                  >
                    <path
                      d='M245.76 286.72h552.96c124.928 0 225.28 100.352 225.28 225.28s-100.352 225.28-225.28 225.28H0V532.48c0-135.168 110.592-245.76 245.76-245.76z m133.12 348.16V401.408H348.16v178.176l-112.64-178.176H204.8V634.88h30.72v-178.176L348.16 634.88h30.72z m182.272-108.544v-24.576h-96.256v-75.776h110.592v-24.576h-141.312V634.88h143.36v-24.576h-112.64v-83.968h96.256z m100.352 28.672l-34.816-151.552h-34.816l55.296 233.472H675.84l47.104-161.792 4.096-20.48 4.096 20.48 47.104 161.792h28.672l57.344-233.472h-34.816l-32.768 151.552-4.096 30.72-6.144-30.72-40.96-151.552h-30.72l-40.96 151.552-6.144 30.72-6.144-30.72z'
                      fill='#EE502F'
                      p-id='10825'
                    ></path>
                  </svg>
                </span>
                {/* <ChevronRight className='w-3.5 h-3.5 theme-text-secondary group-hover:translate-x-0.5 transition-transform' /> */}
              </div>
            </div>
          )}
        </>
      )}
      {isEnabled('showReviews') && (
        <ErrorBoundary>
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
      )}
    </>,
    portalHost!
  );
}

function formatUpperCase(num: number) {
  return numeral(Number(num))
    .format('0,0a')
    .replace(/([kmt])/i, (_, c) => c.toUpperCase());
}

export const FollowedRightData = React.memo(_FollowedRightData);
