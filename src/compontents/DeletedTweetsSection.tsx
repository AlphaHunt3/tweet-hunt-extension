import { useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Eye,
  Heart,
  MessageCircle,
  Repeat,
  Trash2,
} from 'lucide-react';
import numeral from 'numeral';
import { DeletedTweet } from '~types';
import { useI18n } from '~contents/hooks/i18n.ts';
import { fetchDeletedStatus } from '~contents/services/api';
import { navigateInX } from '~contents/utils/navigateInX';
import { TweetContent } from '~compontents/TweetContent';
import { formatTweetTime } from '~/ui/profile/details/format';
import { TweetAuthor } from '~/ui/profile/details/TweetParts';

const DELETED_TWEET_UNAVAILABLE_TEXT = '您暂时无法查看详细删帖内容';

function getVisibleDeletedTweets(
  deletedTweets: DeletedTweet[],
  isVip: boolean,
) {
  if (!isVip) return deletedTweets;

  return deletedTweets.filter(
    (tweet) => tweet.text?.trim() !== DELETED_TWEET_UNAVAILABLE_TEXT,
  );
}

const statText = (num: number | undefined | null) =>
  numeral(num || 0)
    .format('0.[0]a')
    .toUpperCase();

const postUrl = (tweet: DeletedTweet) =>
  `https://x.com/${tweet.profile?.username || 'unknown'}/status/${tweet.id || 'unknown'}`;

function openDeletedTweet(tweet: DeletedTweet) {
  // 先上报再跳转，不等上报结果
  fetchDeletedStatus(tweet.id);
  navigateInX(postUrl(tweet));
}

const STATS = [
  { key: 'reply_count', Icon: MessageCircle },
  { key: 'retweet_count', Icon: Repeat },
  { key: 'likes', Icon: Heart },
  { key: 'views', Icon: Eye },
  { key: 'bookmark_count', Icon: Bookmark },
] as const;

function DeletedTweetCard({
  tweet,
  quote = false,
}: {
  tweet: DeletedTweet;
  quote?: boolean;
}) {
  const { t, lang } = useI18n();
  const open = () => openDeletedTweet(tweet);

  return (
    <div
      className={quote ? 'xh-tweet xh-tweet-quote' : 'xh-tweet'}
      onClick={(event) => {
        event.stopPropagation();
        open();
      }}
    >
      <TweetAuthor
        name={tweet.profile?.name}
        username={tweet.profile?.username}
        avatar={tweet.profile?.profile_image_url}
        verified={Boolean(tweet.profile?.is_blue_verified)}
        time={formatTweetTime(tweet.create_time, lang)}
        postUrl={postUrl(tweet)}
        onOpenPost={open}
        size={quote ? 'xs' : 'sm'}
      />
      <TweetContent
        html={tweet.info?.html}
        text={tweet.text}
        emptyContent={
          <span className='xh-tweet-empty'>{t('tweet_list_no_content')}</span>
        }
        limitImageWidth
      />
      {!quote && tweet.quote_status ? (
        <DeletedTweetCard tweet={tweet.quote_status} quote />
      ) : null}
      {!quote ? (
        <div className='xh-tweet-stats'>
          {STATS.map(({ key, Icon }) => (
            <span key={key}>
              <Icon aria-hidden='true' />
              {statText(tweet.statistic?.[key])}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface DeletedTweetsSectionProps {
  deletedTweets: DeletedTweet[];
  loadingDel: boolean;
  isHoverPanel?: boolean;
  isVip?: boolean;
}

export function DeletedTweetsSection({
  deletedTweets = [],
  loadingDel,
  isHoverPanel = false,
  isVip = true,
}: DeletedTweetsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { t } = useI18n();
  const visibleDeletedTweets = getVisibleDeletedTweets(deletedTweets, isVip);
  const hasUnavailableTweets =
    isVip && visibleDeletedTweets.length !== deletedTweets.length;

  if (isHoverPanel && !isVip) {
    return <p className='xh-dempty'>{t('deletedTweetNoVipDetail')}</p>;
  }
  if (!deletedTweets?.length) return null;

  const list = (
    <div className='xh-tweets'>
      {loadingDel ? <p className='xh-dempty'>{t('loading')}</p> : null}
      {!loadingDel && !visibleDeletedTweets.length && !hasUnavailableTweets ? (
        <p className='xh-dempty'>{t('noData')}</p>
      ) : null}
      {!loadingDel
        ? visibleDeletedTweets.map((tweet) => (
            <DeletedTweetCard key={tweet.id} tweet={tweet} />
          ))
        : null}
      {hasUnavailableTweets && !loadingDel ? (
        <p className='xh-tweets-note'>{t('deletedTweets24hOnly')}</p>
      ) : null}
    </div>
  );

  if (isHoverPanel) return list;

  return (
    <div>
      <button
        type='button'
        className='p-3 flex w-full items-center justify-between theme-border bg-transparent border-0 cursor-pointer'
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className='flex items-center gap-2'>
          <Trash2 aria-hidden='true' className='w-4 h-4 text-red-400' />
          <span className='font-bold text-sm theme-text-primary'>
            {t('deletedTweets')}
          </span>
        </span>
        {isExpanded ? (
          <ChevronUp aria-hidden='true' className='w-4 h-4 theme-text-secondary' />
        ) : (
          <ChevronDown aria-hidden='true' className='w-4 h-4 theme-text-secondary' />
        )}
      </button>
      {isExpanded ? <div className='p-3'>{list}</div> : null}
    </div>
  );
}

export default {};
