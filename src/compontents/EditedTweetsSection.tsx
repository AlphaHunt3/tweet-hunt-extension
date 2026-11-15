import { useMemo, useState } from 'react';
import { Eye, LockKeyhole, RefreshCw } from 'lucide-react';
import { TweetContent } from '~compontents/TweetContent';
import { useI18n } from '~contents/hooks/i18n';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { openNewTab } from '~contents/utils';
import type { EditedTweetAccess, EditedTweetChain } from '~types';
import { configManager } from '~utils/configManager';
import {
  buildEditedTweetTransitions,
  collapseEditedTweetDiff,
  diffEditedTweetText,
  type EditedTweetTransition,
} from '~utils/editedTweetDiff';
import { Button } from '~/ui/primitives/Button';
import { formatTweetTime } from '~/ui/profile/details/format';
import { TweetAuthor } from '~/ui/profile/details/TweetParts';

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
  editedAt?: string | null;
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
    <section aria-label={changeLabel} className='xh-edit-change'>
      <div className='xh-edit-change-head'>
        <span>{changeLabel}</span>
        <span className='xh-edit-change-actions'>
          {isLatest && hasFinalContent && !showFinal ? (
            <button
              type='button'
              className='xh-linkbtn'
              onClick={() => setShowFinal(true)}
            >
              <Eye aria-hidden='true' size={11} />
              {t('editedTweetViewFinal')}
            </button>
          ) : null}
          {editedAt ? <span>{editedAt}</span> : null}
        </span>
      </div>
      {transition.status === 'pending' ? (
        <p className='xh-tweet-muted'>{t('editedTweetPending')}</p>
      ) : (
        <TweetContent parts={diff} />
      )}
      {isLatest && hasFinalContent && showFinal ? (
        <div className='xh-edit-final'>
          <TweetContent html={finalHtml} text={finalText} limitImageWidth />
        </div>
      ) : null}
    </section>
  );
}

function EditedTweetCard({ chain }: { chain: EditedTweetChain }) {
  const { t, lang } = useI18n();
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
  const hasOriginalProfile = Boolean(
    originalProfileName || originalProfileAvatar,
  );
  const lastEditedAtLabel = formatTweetTime(chain.edit?.last_edited_at, lang);
  const firstCreatedAtLabel = formatTweetTime(
    chain.edit?.first_created_at,
    lang,
  );

  return (
    <article className='xh-tweet' data-static=''>
      {!chain.history_complete && (
        <p className='xh-tweet-warn'>{t('editedTweetHistoryIncomplete')}</p>
      )}
      <div className='xh-edit-changes'>
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
          <p className='xh-tweet-muted'>{t('editedTweetNoHistory')}</p>
        )}
      </div>
      <section
        aria-label={t('editedTweetOriginalPost')}
        className='xh-edit-original'
      >
        <div className='xh-edit-original-head'>
          <span>{t('editedTweetOriginalPost')}</span>
          {firstCreatedAtLabel ? <span>{firstCreatedAtLabel}</span> : null}
        </div>
        {hasOriginalProfile && (
          <TweetAuthor
            name={originalProfileName}
            username={originalProfileUsername}
            avatar={originalProfileAvatar}
            verified={Boolean(versionProfile?.is_blue_verified)}
            size='xs'
          />
        )}
        {originalText ? (
          <TweetContent
            html={originalVersion?.tweet?.info?.html}
            text={originalText}
            limitImageWidth
          />
        ) : (
          <p className='xh-tweet-muted'>{t('editedTweetPending')}</p>
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
      <div className='xh-edit-gate'>
        <LockKeyhole aria-hidden='true' size={22} />
        <p className='xh-edit-gate-title'>
          {formatTemplate(t('editedTweetCountTitle'), { count })}
        </p>
        <p className='xh-edit-gate-desc'>{t('editedTweetVipRequired')}</p>
        {vipCtaUrl ? (
          <Button variant='primary' size='sm' onClick={() => openNewTab(vipCtaUrl)}>
            {t('unfollowApplyVip')}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className='xh-tweets-wrap' aria-live='polite'>
      {(loading || (!loaded && !error)) && items.length === 0 ? (
        <p className='xh-dempty'>{t('loading')}</p>
      ) : error && items.length === 0 ? (
        <div className='xh-tweets-state'>
          <p className='xh-dempty'>{t('editedTweetLoadFailed')}</p>
          <Button size='sm' onClick={() => void onRetry()}>
            <RefreshCw aria-hidden='true' size={13} />
            {t('editedTweetRetry')}
          </Button>
        </div>
      ) : loaded && items.length === 0 ? (
        <p className='xh-dempty'>{t('editedTweetNoRecentDetails')}</p>
      ) : (
        <div className='xh-tweets'>
          {items.map((chain) => (
            <EditedTweetCard key={chain.edit.root_id} chain={chain} />
          ))}
        </div>
      )}
      {error && items.length > 0 && (
        <div className='xh-tweet-error'>
          <span>{t('editedTweetLoadMoreFailed')}</span>
          {/* 加载更多失败时偏移量没有前进，再调一次 onLoadMore 就是重试这一页 */}
          <button type='button' className='xh-linkbtn' onClick={() => void onLoadMore()}>
            {t('editedTweetRetry')}
          </button>
        </div>
      )}
      {hasMore && items.length > 0 && !error && (
        <Button
          size='sm'
          className='xh-tweets-more'
          disabled={loading}
          onClick={() => void onLoadMore()}
        >
          {loading ? t('loading') : t('editedTweetLoadMore')}
        </Button>
      )}
    </div>
  );
}
