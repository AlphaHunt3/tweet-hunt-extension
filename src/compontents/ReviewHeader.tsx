import React, { useMemo, useState } from 'react';
import { ReviewStats, UserInfo } from '~types/review.ts';
import { ReviewSection } from '~/compontents/ReviewSection.tsx';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import { useDebounceEffect, useLockFn } from 'ahooks';
import ErrorBoundary from '~/compontents/ErrorBoundary.tsx';
import TokenWordCloud from '~/compontents/TokenWordCloud.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { navigationService } from '~/compontents/navigation/NavigationService';
import { ProfileReviewCard } from '~/ui/profile/ProfileReviewCard';

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
  loadingReviewInfo,
}: ReviewHeaderProps) {
  const [reviewOnlyKol] = useLocalStorage('@xhunt/reviewOnlyKol', true);
  const [token] = useLocalStorage('@xhunt/token', '');
  const { t } = useI18n();
  const isLoggedIn = !!token;
  const [preHandler, setPreHandler] = useState('');

  const [user] = useLocalStorage<
    | {
        avatar: string;
        displayName: string;
        username: string;
        id: string;
        twitterId: string;
      }
    | null
    | ''
  >('@xhunt/user', null);

  const isCurrentUser = useMemo(() => {
    if (user) {
      return (
        String(user.username).toLowerCase() === String(handler).toLowerCase()
      );
    }
    return false;
  }, [user, handler]);

  useDebounceEffect(
    () => {
      if (!loadingReviewInfo && handler) {
        setPreHandler(handler);
      }
    },
    [loadingReviewInfo, handler],
    {
      wait: 100,
      maxWait: 300,
      leading: true,
    }
  );

  if (preHandler !== handler) {
    return (
      <div
        style={{
          display: 'contents',
        }}
        key={`${handler}-review-none`}
      />
    );
  }

  const openComments = () => {
    try {
      window.dispatchEvent(new CustomEvent('xhunt:open-panel'));
    } catch {}
    try {
      const navigate = () =>
        navigationService.navigateTo('main-panel', '/home', {
          scrollToId: 'panel-scroll-comments',
        });
      navigate();
      window.addEventListener(
        'xhunt:panel-registered',
        () => {
          try {
            navigate();
          } catch {}
        },
        { once: true },
      );
    } catch {}
  };

  return (
    <div
      className='xh-review-slot'
      key={`${handler}-review`}
      data-user-handler={handler}
    >
      <ProfileReviewCard
        stats={stats || {}}
        reviewOnlyKol={Boolean(reviewOnlyKol)}
        canWrite={!isCurrentUser}
        writeLabel={
          stats?.currentUserReview && isLoggedIn
            ? t('modifyReview')
            : t('submitReview')
        }
        onOpenComments={openComments}
        renderWriteForm={(close) => (
          <ErrorBoundary>
            <ReviewTooltip
              stats={stats}
              isLoggedIn={isLoggedIn}
              toggle={close}
              handler={handler}
              refreshAsyncReviewInfo={refreshAsyncReviewInfo}
              refreshAsyncUserInfo={refreshAsyncUserInfo}
            />
          </ErrorBoundary>
        )}
      />
    </div>
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
  refreshAsyncUserInfo,
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
    <div
      data-theme={theme}
      className='w-[380px] theme-bg-secondary rounded-2xl p-2.5 space-y-4 border theme-border shadow-[0_12px_32px_rgba(0,0,0,0.22)]'
    >
      {!isLoggedIn ? (
        <>
          <div className='w-full theme-bg-tertiary rounded-xl overflow-hidden'>
            <ErrorBoundary>
              <TokenWordCloud
                tokens={stats ? stats.tagCloud : []}
                height={120}
                emptyTips={t('noReviews')}
              />
            </ErrorBoundary>
          </div>
          <button
            onClick={onBtnClick}
            className='w-full py-2.5 text-white bg-[#1d9bf0] hover:bg-[#1a8cd8] rounded-full transition-colors flex items-center justify-center gap-2 text-sm font-semibold'
          >
            <svg viewBox='0 0 24 24' className='w-4 h-4 fill-current'>
              <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
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
