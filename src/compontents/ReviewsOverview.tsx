import React from 'react';
import { Star } from 'lucide-react';
import { ReviewStats } from '~types/review.ts';
import TokenWordCloud from '~compontents/TokenWordCloud.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

interface ReviewsOverviewProps {
  stats: ReviewStats | undefined | null;
}

function _ReviewsOverview({
  stats,
}: ReviewsOverviewProps) {
  const { t } = useI18n();
  const [reviewOnlyKol, setShowAllReviews] = useLocalStorage('@xhunt/reviewOnlyKol', true);
  const getRatingColor = (rating: number) => {
    if (rating <= 2) return 'text-red-400 fill-red-400';
    if (rating <= 3) return 'text-orange-400 fill-orange-400';
    if (rating <= 4) return 'text-yellow-400 fill-yellow-400';
    return 'text-green-400 fill-green-400';
  };

  return (
    <div className="space-y-4 p-3 border-t theme-border">
      {/* Rating Overview */}
      <div className="flex items-center justify-between">
        {stats && stats?.topReviewers?.length > 0 ? <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Star className={`w-4 h-4 ${getRatingColor(stats ? stats?.averageRating : 0)}`} strokeWidth={1.5} />
            <span className={`text-lg font-semibold ml-1 ${getRatingColor(stats ? stats?.averageRating : 0)}`}>
              {(stats ? stats?.averageRating : 0).toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-gray-400">
            ({reviewOnlyKol ? `${stats.realTotalReviews || 0} ${t('reviews')} ${stats.realTotalReviews > stats.totalReviews ? `, ${stats.totalReviews || 0} ${t('reviews2')}` : ''}` : `${stats.totalReviews || 0} ${t('reviews')}`})
          </span>
        </div> : <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Star className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-semibold text-gray-500">{reviewOnlyKol ? t('noSelectedReviews') : t('noReviews')}</span>
          </div>
        </div>}

        <div className="flex items-center gap-2">
          <label className="relative flex items-center gap-2 text-xs text-gray-400 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={reviewOnlyKol}
                onChange={() => {
                  setShowAllReviews((old) => !old);
                }}
                className="peer sr-only"
              />
              <div className="w-4 h-4 border border-gray-600 rounded bg-gray-800/50 transition-colors peer-checked:bg-[#1d9bf0] peer-checked:border-[#1d9bf0] peer-focus:ring-2 peer-focus:ring-[#1d9bf0]/30 peer-focus:ring-offset-1 peer-focus:ring-offset-[#15202b]" />
              <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <span className="transition-colors">{t('onlyShowSelectedReviews')}</span>
            <div style={{
              transform: 'translate(-64%, 0.5rem)',
            }} className="absolute bottom-full left-1/2 mb-2 px-2 py-1 theme-bg-secondary text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-20 theme-text-primary">
              {t('selectedReviewersTooltip')}
            </div>
          </label>
        </div>
      </div>

      {/* Tag Cloud */}
      {stats && stats?.tagCloud?.length > 0 && <div className="w-full bg-[#101823] rounded-lg overflow-hidden">
				<TokenWordCloud tokens={stats ? stats?.tagCloud || [] : []} height={100} />
			</div>}
    </div>
  );
}

export const ReviewsOverview = React.memo(_ReviewsOverview);
