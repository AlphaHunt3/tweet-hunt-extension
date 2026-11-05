import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Eye, LockKeyhole, RefreshCw } from 'lucide-react';
import { TweetContent } from '~compontents/TweetContent';
import { useI18n } from '~contents/hooks/i18n';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { navigateInX } from '~contents/utils/navigateInX';
import { openNewTab } from '~contents/utils';
import type { EditedTweetAccess, EditedTweetChain } from '~types';
import { configManager } from '~utils/configManager';
import {
  buildEditedTweetTransitions,
  collapseEditedTweetDiff,
  diffEditedTweetText,
  type EditedTweetTransition,
} from '~utils/editedTweetDiff';

interface EditedTweetsSectionProps {
  count: number;
  access?: EditedTweetAccess;
  items: EditedTweetChain[];
  loading: boolean;
  loaded: boolean;
  error: boolean;
  hasMore: boolean;
  onRetry: () => Promise<void> | void;
  onLoadMore: () => Promise<void> | void;
}

function formatTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template,
  );
}

function formatEditTimestamp(timestamp: number | undefined) {
  if (!timestamp || !Number.isFinite(timestamp)) return '';
  const milliseconds = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const date = dayjs(milliseconds);
  if (!date.isValid()) return '';
  const now = dayjs();
  if (now.diff(date, 'hour') < 24) return date.format('h:mm A');
  if (date.year() === now.year()) return date.format('MMM D');
  return date.format('MMM D, YYYY');
}

function TransitionDiff({
  transition,
  index,
  isLatest,
  editedAt,
  finalHtml,
  finalText,
}: {
  transition: EditedTweetTransition;
  index: number;
  isLatest?: boolean;
  editedAt?: string;
  finalHtml?: string | null;
  finalText?: string | null;
}) {
  const { t, lang } = useI18n();
  const [showFinal, setShowFinal] = useState(false);
  const changeLabel = isLatest
    ? t('editedTweetLatestChange')
    : formatTemplate(t('editedTweetChangeNumber'), { count: index + 1 });
  const diff = useMemo(() => {
    if (transition.status !== 'available') return [];
    return collapseEditedTweetDiff(
      diffEditedTweetText(
        transition.before?.tweet?.text || '',
        transition.after?.tweet?.text || '',
        lang,
      ),
      lang,
    );
  }, [transition, lang]);
  const hasFinalContent = Boolean(finalHtml || finalText);

  return (
    <section
      aria-label={changeLabel}
      className='rounded-md border theme-border theme-bg-tertiary px-2.5 py-2'
    >
      <div className='mb-1.5 flex items-center justify-between gap-2'>
        <span className='text-[10px] theme-text-tertiary'>{changeLabel}</span>
        <span className='flex items-center gap-2'>
          {isLatest && hasFinalContent && !showFinal ? (
            <button
              type='button'
              className='inline-flex items-center gap-0.5 rounded text-[10px] font-medium theme-accent-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D9BF0]'
              onClick={() => setShowFinal(true)}
            >
              <Eye aria-hidden='true' size={11} />
              {t('editedTweetViewFinal')}
            </button>
          ) : null}
          {editedAt ? (
            <span className='text-[10px] theme-text-tertiary'>{editedAt}</span>
          ) : null}
        </span>
      </div>

      {transition.status === 'pending' ? (
        <p className='text-xs leading-5 theme-text-secondary'>
          {t('editedTweetPending')}
        </p>
      ) : (
        <TweetContent
          parts={diff}
          className='text-xs leading-[18px] theme-text-primary'
        />
      )}

      {isLatest && hasFinalContent && showFinal ? (
        <div className='mt-1.5 border-t theme-border pt-1.5'>
          <TweetContent
            html={finalHtml}
            text={finalText}
            className='text-xs leading-[18px] theme-text-primary'
            limitImageWidth
          />
        </div>
      ) : null}
    </section>
  );
}

function EditedTweetCard({ chain }: { chain: EditedTweetChain }) {
  const { t } = useI18n();
  const transitions = useMemo(
    () => buildEditedTweetTransitions(chain),
    [chain],
  );
  const originalVersionId = Array.isArray(chain.edit?.version_ids)
    ? chain.edit.version_ids[0]
    : undefined;
  const originalVersion = chain.versions.find(
    (version) => version.id === originalVersionId,
  );
  const originalText = originalVersion?.tweet?.text;
  const {
    handler: localUsername,
    displayName: localName,
    avatar: localAvatar,
  } = usePlacementTracking();
  const versionProfile =
    originalVersion?.tweet?.profile || chain.latest?.profile;
  const originalProfileName =
    versionProfile?.name || localName || localUsername || '';
  const originalProfileUsername =
    versionProfile?.username || localUsername || '';
  const originalProfileAvatar =
    versionProfile?.profile_image_url || localAvatar || '';
  const originalProfileVerified = Boolean(versionProfile?.is_blue_verified);
  const hasOriginalProfile = Boolean(
    originalProfileName || originalProfileAvatar,
  );
  const lastEditedAtLabel = formatEditTimestamp(chain.edit?.last_edited_at);
  const firstCreatedAtLabel = formatEditTimestamp(
    chain.edit?.first_created_at,
  );

  return (
    <article className='xhunt-post-card rounded-lg border theme-border-soft theme-bg-primary p-2.5 shadow-sm'>
      {!chain.history_complete && (
        <p className='rounded-md bg-amber-500/10 px-2 py-1.5 text-xs leading-5 text-amber-500'>
          {t('editedTweetHistoryIncomplete')}
        </p>
      )}

      <div
        className={`space-y-1.5 ${chain.history_complete ? '' : 'mt-1.5'}`}
      >
        {transitions.length > 0 ? (
          [...transitions].reverse().map((transition, reversedIndex) => (
            <TransitionDiff
              key={transition.key}
              transition={transition}
              index={transitions.length - 1 - reversedIndex}
              isLatest={reversedIndex === 0}
              editedAt={reversedIndex === 0 ? lastEditedAtLabel : undefined}
              finalHtml={reversedIndex === 0 ? chain.latest?.info?.html : null}
              finalText={reversedIndex === 0 ? chain.latest?.text : null}
            />
          ))
        ) : (
          <p className='text-xs theme-text-secondary'>
            {t('editedTweetNoHistory')}
          </p>
        )}
      </div>

      <section
        aria-label={t('editedTweetOriginalPost')}
        className='mt-2.5 border-t theme-border pt-2'
      >
        <div className='mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold theme-text-secondary'>
          <span>{t('editedTweetOriginalPost')}</span>
          {firstCreatedAtLabel ? (
            <span className='text-[10px] font-normal theme-text-tertiary'>
              {firstCreatedAtLabel}
            </span>
          ) : null}
        </div>
        {hasOriginalProfile && (
          <div className='mb-1 flex items-center gap-1.5'>
            {originalProfileAvatar ? (
              <img
                src={originalProfileAvatar}
                alt={originalProfileName}
                className='h-4 w-4 shrink-0 rounded-full object-cover'
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
                }}
              />
            ) : null}
            <a
              href={`https://x.com/${originalProfileUsername || 'unknown'}`}
              className='truncate text-[11px] font-medium theme-text-primary hover:underline'
              title={originalProfileName}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigateInX(
                  `https://x.com/${originalProfileUsername || 'unknown'}`,
                );
              }}
            >
              {originalProfileName}
            </a>
            {originalProfileVerified && (
              <svg
                className='h-3 w-3 shrink-0 text-[#1d9bf0]'
                viewBox='0 0 22 22'
                fill='currentColor'
              >
                <path d='M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z'></path>
              </svg>
            )}
          </div>
        )}
        {originalText ? (
          <TweetContent
            html={originalVersion?.tweet?.info?.html}
            text={originalText}
            className='text-xs leading-[18px] theme-text-primary'
            limitImageWidth
          />
        ) : (
          <p className='text-xs leading-5 theme-text-secondary'>
            {t('editedTweetPending')}
          </p>
        )}
      </section>
    </article>
  );
}

export function EditedTweetsSection({
  count,
  access,
  items,
  loading,
  loaded,
  error,
  hasMore,
  onRetry,
  onLoadMore,
}: EditedTweetsSectionProps) {
  const { t } = useI18n();

  if (!access || access.detail_scope === 'count_only') {
    const vipCtaUrl = configManager.getUnfollowVipCta().url?.trim() || '';
    return (
      <div className='w-[360px] max-w-full p-3 text-center'>
        <LockKeyhole
          aria-hidden='true'
          size={22}
          className='mx-auto mb-2 text-amber-500'
        />
        <p className='text-sm font-medium theme-text-primary'>
          {formatTemplate(t('editedTweetCountTitle'), { count })}
        </p>
        <p className='mt-1 text-xs leading-5 theme-text-secondary'>
          {t('editedTweetVipRequired')}
        </p>
        {vipCtaUrl ? (
          <button
            type='button'
            onClick={() => openNewTab(vipCtaUrl)}
            className='mx-auto mt-2 rounded-md bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90'
          >
            {t('unfollowApplyVip')}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className='w-[600px] max-w-full p-2' aria-live='polite'>
      {loading && items.length === 0 ? (
        <p className='py-6 text-center text-sm theme-text-secondary'>
          {t('loading')}
        </p>
      ) : error && items.length === 0 ? (
        <div className='py-5 text-center'>
          <p className='text-sm theme-text-secondary'>
            {t('editedTweetLoadFailed')}
          </p>
          <button
            type='button'
            className='mx-auto mt-2 inline-flex items-center gap-1 rounded-md border theme-border px-2.5 py-1.5 text-xs font-medium theme-text-primary theme-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D9BF0]'
            onClick={() => void onRetry()}
          >
            <RefreshCw aria-hidden='true' size={13} />
            {t('editedTweetRetry')}
          </button>
        </div>
      ) : loaded && items.length === 0 ? (
        <p className='py-6 text-center text-sm theme-text-secondary'>
          {t('editedTweetNoRecentDetails')}
        </p>
      ) : (
        <div className='xhunt-post-list space-y-2.5'>
          {items.map((chain) => (
            <EditedTweetCard key={chain.edit.root_id} chain={chain} />
          ))}
        </div>
      )}

      {error && items.length > 0 && (
        <div className='mt-2 flex items-center justify-between gap-2 rounded-md bg-red-500/10 px-2.5 py-2'>
          <span className='text-xs text-red-500'>
            {t('editedTweetLoadMoreFailed')}
          </span>
          <button
            type='button'
            className='min-h-6 shrink-0 rounded text-xs font-medium text-[#1D9BF0] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D9BF0]'
            onClick={() => void onLoadMore()}
          >
            {t('editedTweetRetry')}
          </button>
        </div>
      )}

      {hasMore && items.length > 0 && !error && (
        <button
          type='button'
          disabled={loading}
          className='mt-2 w-full rounded-md border theme-border px-3 py-2 text-xs font-medium theme-text-primary theme-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D9BF0]'
          onClick={() => void onLoadMore()}
        >
          {loading ? t('loading') : t('editedTweetLoadMore')}
        </button>
      )}
    </div>
  );
}
