import cssText from 'data-text:~/css/style.css';
import React, { useState } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import { MainData } from '~contents/hooks/useMainData.ts';
import ReactDOM from 'react-dom';
import { HoverStatItem } from '~/compontents/HoverStatItem.tsx';
import { formatNumber } from '~contents/utils';
import { KolFollowersSection } from '~/compontents/KolFollowersSection.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import numeral from 'numeral';
import { ReviewHeader } from '~/compontents/ReviewHeader.tsx';
import ErrorBoundary from '~/compontents/ErrorBoundary.tsx';
import ReactDOMServer from 'react-dom/server';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { KolData } from '~types';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

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
              className={`px-2 py-1 rounded transition-colors ${
                activePeriod === 'day1'
                  ? 'theme-bg-tertiary theme-text-primary'
                  : 'theme-text-secondary hover:theme-bg-tertiary'
              }`}
              onClick={() => setActivePeriod('day1')}
            >
              {t('day1')}
            </button>
            <button
              className={`px-2 py-1 rounded transition-colors ${
                activePeriod === 'day7'
                  ? 'theme-bg-tertiary theme-text-primary'
                  : 'theme-text-secondary hover:theme-bg-tertiary'
              }`}
              onClick={() => setActivePeriod('day7')}
            >
              {t('day7')}
            </button>
            <button
              className={`px-2 py-1 rounded transition-colors ${
                activePeriod === 'day30'
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
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    styleText: cssText,
    useSiblings: true,
    targetFilter: targetFilter,
  });
  const { t, lang } = useI18n();
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

          {/*TOP100_KOLs*/}
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

          {/*中文KOLs*/}
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

          {/*关注着质量排名变化 */}
          <HoverStatItem
            label={`${(() => {
              const rank = twInfo?.kolFollow?.kolRank20W;
              if (!rank || rank <= 0) return '>200K';
              return (
                numeral(rank || 0).format('0,0') + '/200K' + kolRankChangeDom
              );
            })()}`}
            value={t('FQRank')}
            hoverContent={<RankTooltip twInfo={twInfo} rankType='followers' />}
            labelClassName={'font-bold'}
            valueClassName={'theme-text-secondary'}
          />

          {/* 影响力排名：中文显示华语；英文显示英文影响力（按条件） */}
          {lang === 'zh'
            ? twInfo?.kolFollow?.isCn && (
                <HoverStatItem
                  label={`${
                    !twInfo?.kolFollow?.kolCnRank ||
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
            : !!twInfo?.kolFollow?.kolGlobalRank && (
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
          {twInfo?.kolFollow?.isProject && (
            <HoverStatItem
              label={`${
                !twInfo?.kolFollow?.kolProjectRank ||
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
        </>
      )}
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
    </>,
    shadowRoot
  );
}

const targetFilter = (el: any) => {
  return (
    (el.tagName.toLowerCase() === 'div' &&
      el.textContent.includes('Following') &&
      el.textContent.includes('Followers')) ||
    (el.textContent.includes('正在关注') &&
      el.textContent.includes('关注者')) ||
    (el.textContent.includes('個跟隨中') &&
      el.textContent.includes('位跟隨者')) ||
    (el.textContent.includes('フォロワー') &&
      el.textContent.includes('フォロー中'))
  );
};

function formatUpperCase(num: number) {
  return numeral(Number(num))
    .format('0,0a')
    .replace(/([kmt])/i, (_, c) => c.toUpperCase());
}

export const FollowedRightData = React.memo(_FollowedRightData);
