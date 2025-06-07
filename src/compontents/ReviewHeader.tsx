import React, { useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { ReviewStats, UserInfo } from '~types/review.ts';
import { Avatar } from '~/compontents/UserAuthPanel.tsx';
import { ReviewSection } from '~/compontents/ReviewSection.tsx';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import { useLockFn } from 'ahooks';
import ErrorBoundary from '~/compontents/ErrorBoundary.tsx';
import TokenWordCloud from '~/compontents/TokenWordCloud.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { FloatingContainer, FloatingContainerRef } from './FloatingContainer';

interface ReviewHeaderProps {
  stats: ReviewStats | undefined | null;
  handler: string;
  refreshAsyncReviewInfo: () => Promise<ReviewStats | undefined>;
  refreshAsyncUserInfo: () => Promise<UserInfo | undefined>;
  loadingReviewInfo: boolean;
}

export const getRatingColor = (rating: number) => {
  let rating1 = Number(rating || 0);
  if (rating1 <= 2) return 'text-red-400 fill-red-400';
  if (rating1 <= 3) return 'text-orange-400 fill-orange-400';
  if (rating1 <= 4) return 'text-yellow-400 fill-yellow-400';
  return 'text-green-400 fill-green-400';
};

function _ReviewHeader({
  stats,
  handler,
  refreshAsyncReviewInfo,
  refreshAsyncUserInfo,
  loadingReviewInfo
}: ReviewHeaderProps) {
  const [reviewOnlyKol] = useLocalStorage('@xhunt/reviewOnlyKol', true);
  const [token] = useLocalStorage('@xhunt/token', '');
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { t } = useI18n();
  const isLoggedIn = !!token;
  const targetRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<FloatingContainerRef>(null);
  const preHandler = useRef('');
  const maxTgaShow = 5;
  const moreTagCount = (stats?.tagCloud?.length || 0) - maxTgaShow;
  const isShowMoreTag = moreTagCount > 0;

  useEffect(() => {
    if (!loadingReviewInfo) {
      preHandler.current = handler;
    }
  }, [loadingReviewInfo]);

  if (preHandler.current !== handler) {
    return <></>;
  }

  return (
    <>
      {!stats || !('averageRating' in stats) || !stats?.topReviewers?.length ?
        <div data-theme={theme} className="min-w-full mt-3 mb-1 p-3 theme-bg-tertiary rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Star className="w-5 h-5 theme-text-secondary flex-shrink-0" />
                <span className="text-lg font-semibold theme-text-secondary flex-shrink-0">{reviewOnlyKol ? t('noSelectedReviews') : t('noReviews')}</span>
              </div>
              <span className={`theme-text-secondary pr-2 ${stats?.currentUserReview?.note ? 'text-xs' : 'text-sm'}`}>
                {isLoggedIn && stats?.currentUserReview?.note ? `(备注：${stats.currentUserReview.note})` : ''}
              </span>
            </div>
            <div className="ml-auto flex-shrink-0">
              <button
                ref={targetRef}
                onClick={() => {
                  containerRef.current?.toggle()
                }}
                className="text-sm text-[#1d9bf0] hover:text-[#1a8cd8] transition-colors"
              >
                {stats?.currentUserReview && isLoggedIn ? t('modifyReview') : t('submitReview')}
              </button>
            </div>
          </div>
        </div> : <>
          <div data-theme={theme} className="min-w-full mt-3 mb-1 p-3 theme-bg-tertiary rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Star className={`w-5 h-5 ${getRatingColor(stats.averageRating)}`} />
                <span className={`text-lg font-semibold ${getRatingColor(stats.averageRating)}`}>
                  {Number(stats.averageRating).toFixed(1)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm theme-text-secondary">
                  ({stats.totalReviews} {t('reviews')})
                </span>
                <div className="flex -space-x-2">
                  {stats.topReviewers.map((reviewer, index) => (
                    <div
                      key={`${reviewer.name}${index}`}
                      className="relative group"
                    >
                      <ErrorBoundary>
                        <Avatar
                          src={reviewer.avatar}
                          alt={reviewer.name}
                          size={24}
                          className="border-2 theme-border transition-transform group-hover:scale-110 group-hover:z-10"
                        />
                      </ErrorBoundary>
                      <div className="theme-text-primary absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 theme-bg-tertiary text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-20">
                        {reviewer.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ml-auto">
                <button
                  ref={targetRef}
                  onClick={() => {
                    containerRef.current?.toggle()
                  }}
                  className={`text-sm transition-colors font-medium ${
                    stats.currentUserReview ? 'text-[#7dc9d9c7] hover:text-[#369cb2]' :
                      'text-[#1d9bf0] hover:text-[#1a8cd8]'
                  }`}
                >
                  {stats.currentUserReview && isLoggedIn ? t('modifyReview') : t('submitReview')}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {stats.tagCloud.slice(0, maxTgaShow).map((tag, index) => (
                <span
                  key={`${tag.text}${index}`}
                  className="cursor-default px-2 py-0.5 rounded-full bg-[#1d9bf0]/10 text-xs theme-text-primary hover:bg-[#1d9bf0]/20 transition-colors"
                >
                  {tag.text}{' '}
                  <span style={{
                    opacity: 0.9,
                    fontWeight: 800,
                    fontStyle: 'italic'
                  }}>x{tag.value}</span>
                </span>
              ))}
              {isShowMoreTag && <span
                key={`more-tag`}
                style={{
                  opacity: 0.8,
                }}
                className="cursor-default px-2 py-0.5 rounded-full bg-[#1d9bf0]/10 text-xs theme-text-primary transition-colors"
              >
                +{moreTagCount}个标签
              </span>}
              {isLoggedIn && stats.currentUserReview?.note && (
                <span key={'__my-note'} className="mt-0.5 ml-0.5 text-xs theme-text-secondary inline-block overflow-ellipsis">
                  备注：{stats.currentUserReview.note}
                </span>
              )}
            </div>
          </div>
        </>}
      <ErrorBoundary>
        <FloatingContainer
          ref={containerRef}
          targetRef={targetRef}
          offsetX={-220}
          offsetY={isLoggedIn ? -300 : -200}
          maxWidth="300px"
          maxHeight="500px"
        >
          <ReviewTooltip
            stats={stats}
            isLoggedIn={isLoggedIn}
            toggle={() => containerRef.current?.hide()}
            handler={handler}
            refreshAsyncReviewInfo={refreshAsyncReviewInfo}
            refreshAsyncUserInfo={refreshAsyncUserInfo}
          />
        </FloatingContainer>
      </ErrorBoundary>
    </>
  );
}

export const ReviewHeader = React.memo(_ReviewHeader);

interface ReviewTooltipProps {
  stats: ReviewStats | undefined | null;
  isLoggedIn: boolean;
  toggle: () => void;
  handler: string;
  refreshAsyncReviewInfo: () => Promise<ReviewStats | undefined>;
  refreshAsyncUserInfo: () => Promise<UserInfo | undefined>;
}

function _ReviewTooltip({
  stats,
  isLoggedIn,
  toggle,
  handler,
  refreshAsyncReviewInfo,
  refreshAsyncUserInfo
}: ReviewTooltipProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { t } = useI18n();
  const onBtnClick = useLockFn(async () => {
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
      toggle();
    }
  });

  return (
    <div data-theme={theme} className="w-[280px] theme-bg-secondary rounded-lg p-3 space-y-4">
      {!isLoggedIn ? (
        <>
          <div className="w-full theme-bg-tertiary rounded-lg overflow-hidden">
            <ErrorBoundary>
              <TokenWordCloud tokens={stats ? stats.tagCloud : []} height={120} emptyTips={t('noReviews')} />
            </ErrorBoundary>
          </div>
          <button
            onClick={onBtnClick}
            className="w-full py-2 theme-text-primary bg-[#1d9bf0] hover:bg-[#1a8cd8] rounded-full transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {t('loginRequired')}
          </button>
        </>
      ) : (
        <ReviewSection
          handler={handler}
          stats={stats}
          toggle={toggle}
          refreshAsyncReviewInfo={refreshAsyncReviewInfo}
          refreshAsyncUserInfo={refreshAsyncUserInfo}
        />
      )}
    </div>
  );
}

const ReviewTooltip = React.memo(_ReviewTooltip);
