import React from 'react';
import dayjs from 'dayjs';
import numeral from 'numeral';
import { Eye, Heart, PlayCircle } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n';
import { navigateInX } from '~contents/utils/navigateInX';

type HotTweetMediaItem = {
  id?: string;
  media_preview?: string;
  rank?: number;
  score?: number;
  summary_cn?: string;
  summary_en?: string;
  tweet?: {
    id?: string;
    link?: string;
    create_time?: string;
    profile?: {
      name?: string;
      username?: string;
      username_raw?: string;
      profile_image_url?: string;
      is_blue_verified?: boolean;
    };
    statistic?: {
      likes?: number;
      views?: number;
    };
    ai?: {
      title_cn?: string;
      title_en?: string;
      summary_cn?: string;
      summary_en?: string;
    };
  };
};

const formatNumber = (num: number | undefined) => {
  if (num === undefined || num === null) return '0';
  return numeral(num || 0)
    .format('0.[0]a')
    .toUpperCase();
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '';
  const date = dayjs(dateString);
  const now = dayjs();
  const hoursAgo = now.diff(date, 'hour');

  if (hoursAgo < 24) {
    return date.format('h:mm A');
  }

  return date.format('MMM D');
};

function VerifiedBadge() {
  return (
    <svg
      className='w-3 h-3 text-[#1d9bf0] flex-shrink-0'
      viewBox='0 0 22 22'
      fill='currentColor'
    >
      <path d='M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z'></path>
    </svg>
  );
}

export function HotTweetMediaList(props: {
  items: HotTweetMediaItem[];
  lang: 'zh' | 'en';
  media: 'photo' | 'video';
}) {
  const { t } = useI18n();
  const { items, lang, media } = props;

  if (!items.length) {
    return (
      <div className='mt-3 flex items-center justify-center h-[260px] theme-text-secondary'>
        <div className='text-center'>
          <div className='text-sm'>{t('noData')}</div>
          <div className='text-xs mt-1'>{t('tryDifferentPeriod')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className='mt-3 grid grid-cols-2 gap-2.5'>
      {items.map((it, idx) => {
        const tw = it?.tweet;
        const profile = tw?.profile;
        const ai = tw?.ai;
        const username = profile?.username_raw || profile?.username || 'unknown';
        const tweetId = tw?.id || it?.id || 'unknown';
        const rank = idx + 1;
        const title =
          lang === 'zh'
            ? it?.summary_cn ||
              ai?.title_cn ||
              ai?.summary_cn ||
              it?.summary_en ||
              ai?.title_en ||
              ai?.summary_en ||
              ''
            : it?.summary_en ||
              ai?.title_en ||
              ai?.summary_en ||
              it?.summary_cn ||
              ai?.title_cn ||
              ai?.summary_cn ||
              '';

        const handleClick = () => {
          const url = tw?.link || `https://x.com/${username}/status/${tweetId}`;
          navigateInX(url);
        };

        return (
          <button
            key={`${tweetId}-${idx}`}
            type='button'
            className='group text-left rounded-xl border theme-border overflow-hidden theme-bg-secondary/30 hover:bg-white/5 transition-colors'
            onClick={handleClick}
          >
            <div className='relative aspect-video theme-bg-tertiary overflow-hidden'>
              {it?.media_preview ? (
                <img
                  src={it.media_preview}
                  alt={title || String(tweetId)}
                  className='w-full h-full object-cover'
                  loading='lazy'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center theme-text-secondary text-xs'>
                  {t('noData')}
                </div>
              )}
              <span className='absolute left-2 top-2 min-w-[22px] h-5 px-1.5 rounded-full bg-black/60 text-white text-[11px] font-semibold flex items-center justify-center'>
                {rank}
              </span>
              {media === 'video' && (
                <span className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                  <PlayCircle className='w-8 h-8 text-white drop-shadow-lg opacity-90' />
                </span>
              )}
            </div>

            <div className='p-2'>
              <div className='text-[11px] leading-snug theme-text-primary line-clamp-2 min-h-[30px]'>
                {title || t('tweet_list_no_content')}
              </div>

              <div className='mt-2 flex items-center gap-1.5 min-w-0'>
                <img
                  src={profile?.profile_image_url}
                  alt={profile?.name || username}
                  className='w-5 h-5 rounded-full object-cover flex-shrink-0'
                  loading='lazy'
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
                  }}
                />
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-1 min-w-0'>
                    <span className='text-[10px] font-medium theme-text-primary truncate group-hover:underline'>
                      {profile?.name || username}
                    </span>
                    {profile?.is_blue_verified && <VerifiedBadge />}
                  </div>
                  <div className='text-[9px] theme-text-secondary truncate'>
                    @{profile?.username || username}
                  </div>
                </div>
              </div>

              <div className='mt-2 flex items-center justify-between gap-2 text-[9px] theme-text-secondary'>
                <span>{formatDate(tw?.create_time)}</span>
                <span className='flex items-center gap-2'>
                  <span className='inline-flex items-center gap-0.5'>
                    <Heart className='w-3 h-3' />
                    {formatNumber(tw?.statistic?.likes)}
                  </span>
                  <span className='inline-flex items-center gap-0.5'>
                    <Eye className='w-3 h-3' />
                    {formatNumber(tw?.statistic?.views)}
                  </span>
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
