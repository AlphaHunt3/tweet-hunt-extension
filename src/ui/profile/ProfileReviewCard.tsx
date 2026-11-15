import { useState, type ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { PencilIcon, StarIcon } from '../icons';
import { Avatar } from '../primitives/Avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/Popover';
import { useUiSkin } from '../skin/useUiSkin';

export interface ReviewCardStats {
  averageRating?: number;
  totalReviews?: number;
  realTotalReviews?: number;
  tagCloud?: Array<{ text: string; value: number }>;
  topReviewers?: Array<{ avatar?: string; name?: string; displayName?: string; username?: string }>;
}

export interface ProfileReviewCardProps {
  stats: ReviewCardStats;
  reviewOnlyKol: boolean;
  canWrite: boolean;
  writeLabel: string;
  onOpenComments: () => void;
  renderWriteForm: (close: () => void) => ReactNode;
}

const MAX_TAGS = 5;
const MAX_AVATARS = 4;

export function ProfileReviewCard({
  stats,
  reviewOnlyKol,
  canWrite,
  writeLabel,
  onOpenComments,
  renderWriteForm,
}: ProfileReviewCardProps) {
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const [writing, setWriting] = useState(false);

  const real = stats.realTotalReviews || 0;
  const total = stats.totalReviews || 0;
  const hasReviews = real > 0;
  const rating = stats.averageRating ? Number(stats.averageRating).toFixed(1) : null;
  const countText = reviewOnlyKol
    ? `${real} ${t('reviews')}${real > total ? ` · ${total} ${t('reviews2')}` : ''}`
    : `${total} ${t('reviews')}`;
  const hasData = reviewOnlyKol ? real > 0 : total > 0;
  const tags = (stats.tagCloud || []).slice(0, MAX_TAGS);
  const moreTags = (stats.tagCloud?.length || 0) - MAX_TAGS;
  const reviewers = (stats.topReviewers || []).slice(0, MAX_AVATARS);

  const count = hasData ? (
    <button type='button' className='xh-review-count' onClick={onOpenComments}>
      {countText}
    </button>
  ) : (
    <span className='xh-review-count'>{countText}</span>
  );

  const write = canWrite && (
    <Popover open={writing} onOpenChange={setWriting}>
      <PopoverTrigger className='xh-review-write' data-xhunt-testid='review-open-button'>
        {skin !== 'native' && <PencilIcon size={14} />}
        {writeLabel}
      </PopoverTrigger>
      <PopoverContent align='end' className='xh-review-pop' aria-label={writeLabel}>
        {renderWriteForm(() => setWriting(false))}
      </PopoverContent>
    </Popover>
  );

  const star = <StarIcon size={skin === 'soft' ? 18 : 14} className='xh-review-star' />;

  if (!hasReviews) {
    return (
      <div className={skin === 'soft' ? 'xh-review' : 'xh-review-line'}>
        <div className='xh-review-row'>
          {star}
          <span className='xh-review-empty'>{reviewOnlyKol ? t('noSelectedReviews') : t('noReviews')}</span>
          {write}
        </div>
      </div>
    );
  }

  if (skin === 'soft') {
    return (
      <div className='xh-review'>
        <div className='xh-review-row'>
          {star}
          {rating && <b className='xh-review-rating'>{rating}</b>}
          {count}
          {reviewers.length > 0 && (
            <span className='xh-review-stack'>
              {reviewers.map((reviewer, index) => (
                <Avatar
                  key={`${reviewer.name ?? reviewer.username ?? ''}${index}`}
                  name={reviewer.name || reviewer.displayName || reviewer.username || '?'}
                  src={reviewer.avatar}
                  size='xs'
                />
              ))}
            </span>
          )}
          {write}
        </div>
        {tags.length > 0 && (
          <div className='xh-review-tags'>
            {tags.map((tag, index) => (
              <span key={`${tag.text}${index}`} className='xh-ptag'>
                {tag.text} <b>{tag.value}</b>
              </span>
            ))}
            {moreTags > 0 && <span className='xh-ptag'>{t('reviewMoreTags').replace('{count}', String(moreTags))}</span>}
          </div>
        )}
      </div>
    );
  }

  if (skin === 'obsidian') {
    return (
      <div className='xh-review-line'>
        <span className='xh-chip xh-review-chip'>
          {star}
          {rating && <b>{rating}</b>}
          {count}
        </span>
        {tags.slice(0, 4).map((tag, index) => (
          <span key={`${tag.text}${index}`} className='xh-ptag'>
            {tag.text} {tag.value}
          </span>
        ))}
        {(stats.tagCloud?.length || 0) > 4 && (
          <span className='xh-ptag'>
            {t('reviewMoreTags').replace('{count}', String((stats.tagCloud?.length || 0) - 4))}
          </span>
        )}
        {write}
      </div>
    );
  }

  return (
    <div className='xh-review-line'>
      <span className='xh-review-score'>
        {star}
        {rating && <b>{rating}</b>}
      </span>
      {count}
      {tags.length > 0 && <span className='xh-review-tagtext'>{tags.slice(0, 3).map((tag) => tag.text).join(' · ')}</span>}
      {write}
    </div>
  );
}
