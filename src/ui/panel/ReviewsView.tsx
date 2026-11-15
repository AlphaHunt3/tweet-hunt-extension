import { Field, FieldDescription, FieldLabel } from '@ui-sdk/react/field';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useRef, useState } from 'react';
import { navigationService } from '~/compontents/navigation/NavigationService';
import { useI18n } from '~contents/hooks/i18n';
import { getHandleComments } from '~contents/services/review.ts';
import { useLocalStorage } from '~storage/useLocalStorage';
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from '../icons';
import { Avatar, IconButton, RowButton, Switch, Tag } from '../primitives';
import { cx } from '../primitives/cx';
import { CardHeader, EmptyState, PanelCard, Skeleton } from './PanelSection';

dayjs.extend(relativeTime);

export const REVIEW_ONLY_KOL_KEY = '@xhunt/reviewOnlyKol';
const REPORT_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdm_ekrYB57m1xUaYTmgOsQBdWTkc4pzNnLsctJS17O7u1FrA/viewform';
const LONG_COMMENT = 150;

export function reviewCounts(stats: any, onlyFeatured: boolean, t: (key: string) => string) {
  const total = Number(stats?.totalReviews) || 0;
  const real = Number(stats?.realTotalReviews) || 0;
  if (!onlyFeatured) return [`${total} ${t('reviews')}`];
  return real > total ? [`${real} ${t('reviews')}`, `${total} ${t('reviews2')}`] : [`${real} ${t('reviews')}`];
}

export function hasReviews(stats: any) {
  return Array.isArray(stats?.topReviewers) && stats.topReviewers.length > 0;
}

function Stars({ value }: { value: number }) {
  return (
    <span className='flex gap-px text-[#f2b01e]'>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={12} className={n <= Math.round(value) ? undefined : 'opacity-30'} />
      ))}
    </span>
  );
}

export function ReviewsView({ stats, userId }: { stats: any; userId: string }) {
  const { t } = useI18n();
  const [onlyFeatured, setOnlyFeatured] = useLocalStorage<boolean>(REVIEW_ONLY_KOL_KEY, true);
  const [page, setPage] = useState(1);
  const paginated = useRef(false);
  const { data, loading } = useRequest(() => getHandleComments(userId, page, 5, onlyFeatured), {
    refreshDeps: [userId, page, onlyFeatured],
    ready: Boolean(userId),
  });

  useEffect(() => {
    if (loading || !data || !paginated.current) return;
    paginated.current = false;
    requestAnimationFrame(() =>
      navigationService.navigateTo('main-panel', '/home', { scrollToId: 'panel-scroll-comments' }),
    );
  }, [loading, data]);

  const goTo = (next: number) => {
    paginated.current = true;
    setPage(next);
  };

  const average = Number(stats?.averageRating) || 0;
  const tags: Array<{ text: string; value: number }> = Array.isArray(stats?.tagCloud) ? stats.tagCloud : [];
  const comments: any[] = data?.comments ?? [];
  const pagination = data?.pagination;

  return (
    <div className='flex flex-col soft:gap-2 obsidian:gap-2.5'>
      <PanelCard id='panel-scroll-reviews'>
        {hasReviews(stats) ? (
          <div className='flex items-center gap-4'>
            <div className='flex min-w-[76px] flex-col items-center gap-1.5'>
              <span className='font-xh-num text-[34px] font-semibold leading-none tracking-[-0.04em] obsidian:text-[32px] obsidian:font-normal native:text-[40px] native:font-extrabold'>
                {average.toFixed(1)}
              </span>
              <Stars value={average} />
            </div>
            <ul className='flex flex-col gap-0.5 text-[12px] text-xh-fg-2 native:text-[14px]'>
              {reviewCounts(stats, onlyFeatured, t).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState>{onlyFeatured ? t('noSelectedReviews') : t('noReviews')}</EmptyState>
        )}
        <Field className='mt-3 flex items-center justify-between gap-3 border-t border-xh-line pt-2.5'>
          <div className='min-w-0'>
            <FieldLabel className='block text-[12px] font-medium native:text-[14px]'>
              {t('onlyShowSelectedReviews')}
            </FieldLabel>
            <FieldDescription className='mt-0.5 text-[11px] leading-snug text-xh-fg-2 native:text-[13px]'>
              {t('selectedReviewersTooltip')}
            </FieldDescription>
          </div>
          <Switch
            checked={onlyFeatured}
            onCheckedChange={(next) => {
              setOnlyFeatured(next);
              setPage(1);
            }}
          />
        </Field>
        {tags.length ? (
          <div className='mt-2.5 flex flex-wrap gap-1'>
            {tags.slice(0, 8).map((tag) => (
              <Tag key={tag.text}>{`${tag.text} ${tag.value}`}</Tag>
            ))}
          </div>
        ) : null}
      </PanelCard>

      <div id='panel-scroll-comments'>
        {loading && !data ? (
          <PanelCard>
            <div className='flex flex-col gap-1.5'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-14' />
              <Skeleton className='h-14' />
            </div>
          </PanelCard>
        ) : comments.length ? (
          <PanelCard>
            <CardHeader
              title={
                <>
                  {t('comments')}{' '}
                  <span className='font-normal text-xh-fg-2'>{pagination?.totalComments ?? comments.length}</span>
                </>
              }
              aside={
                pagination && pagination.totalPages > 1 ? (
                  <span className='flex items-center gap-0.5 font-xh-num text-[12px] tabular-nums text-xh-fg-2'>
                    <IconButton
                      label={t('panelPrevPage')}
                      size='sm'
                      disabled={!pagination.hasPrevPage || loading}
                      onClick={() => goTo(Math.max(1, page - 1))}
                    >
                      <ChevronLeftIcon size={14} />
                    </IconButton>
                    {pagination.page} / {pagination.totalPages}
                    <IconButton
                      label={t('panelNextPage')}
                      size='sm'
                      disabled={!pagination.hasNextPage || loading}
                      onClick={() => goTo(Math.min(pagination.totalPages, page + 1))}
                    >
                      <ChevronRightIcon size={14} />
                    </IconButton>
                  </span>
                ) : null
              }
            />
            <ul
              aria-busy={loading}
              className={cx(
                'flex flex-col gap-1.5 transition-opacity native:-mx-4 native:-mb-3 native:gap-0',
                loading && 'opacity-60',
              )}
            >
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </ul>
          </PanelCard>
        ) : null}
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: any }) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const text = String(comment.comment ?? '');
  const long = text.length > LONG_COMMENT;
  const reviewer = comment.reviewer ?? {};
  const rating = Number(comment.rating) || 0;

  return (
    <li className='flex flex-col gap-1.5 soft:rounded-xl soft:bg-xh-canvas soft:px-2.5 soft:py-2 obsidian:rounded-[10px] obsidian:bg-xh-canvas obsidian:px-2.5 obsidian:py-2 native:border-t native:border-xh-line native:px-4 native:py-3'>
      <div className='flex items-center gap-2'>
        <Avatar name={reviewer.displayName || reviewer.username || '?'} src={reviewer.avatar} size='sm' />
        <div className='min-w-0 flex-1 leading-tight'>
          <p className='truncate text-[12px] font-semibold native:text-[14px] native:font-bold'>{reviewer.displayName}</p>
          <p className='truncate text-[11px] text-xh-fg-2 native:text-[13px]'>
            @{reviewer.username} ·{' '}
            {dayjs(comment.updatedAt)
              .locale(lang === 'zh' ? 'zh-cn' : 'en')
              .fromNow()}
          </p>
        </div>
        <span className='flex shrink-0 items-center gap-0.5 font-xh-num text-[12px] font-semibold tabular-nums'>
          <StarIcon size={11} className='text-[#f2b01e]' />
          {rating.toFixed(1)}
        </span>
      </div>
      {Array.isArray(comment.tags) && comment.tags.length ? (
        <div className='flex flex-wrap gap-1'>
          {comment.tags.map((tag: string) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      ) : null}
      <p className='whitespace-pre-wrap break-words text-[12px] leading-[1.5] native:text-[15px]'>
        {long && !expanded ? `${text.substring(0, LONG_COMMENT)}...` : text}
      </p>
      <div className='flex items-center justify-between gap-2'>
        {long ? (
          <RowButton
            onClick={() => setExpanded((value) => !value)}
            className='w-auto rounded-md text-[11px] text-xh-accent-fg hover:bg-transparent hover:underline native:text-[13px]'
          >
            {expanded ? t('showLess') : t('showMore')}
          </RowButton>
        ) : (
          <span />
        )}
        <a
          href={REPORT_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='xh-link text-[11px] text-xh-fg-2 hover:text-xh-fg native:text-[13px]'
        >
          {t('reportError') || 'Report error'}
        </a>
      </div>
    </li>
  );
}
