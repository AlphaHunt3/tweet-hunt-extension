import {
  MessageCircle,
  Repeat,
  Heart,
  Eye,
  Sparkles,
  CircleX,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React, { SetStateAction, Dispatch } from 'react';
import { TokenAnalysisData } from '~types';
import { useI18n } from '~contents/hooks/i18n.ts';

dayjs.extend(relativeTime);

interface TokenAnalysisPanelProps {
  token: string;
  data: TokenAnalysisData | undefined;
  hotTokenData?: any;
  isLoading: boolean;
  onClose?: () => void;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseOver?: () => void;
}

function TokenAnalysisPanel({
  token,
  data,
  hotTokenData,
  isLoading,
  setIsVisible,
  onMouseEnter,
  onMouseLeave,
  onMouseOver,
}: TokenAnalysisPanelProps) {
  const { t, lang } = useI18n();
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const answerDS = lang === 'en' ? data?.answerEn : data?.answerCn;
  const hasTweets = Boolean(data?.tweets?.length);

  // Extract token symbol from ticker (remove $ if present)
  const tokenSymbol = token.replace(/^\$/, '').toLowerCase();

  // KOL item interface
  interface KOLItem {
    profile: {
      username: string;
      name?: string;
      profile_image_url?: string;
      is_blue_verified?: boolean;
      followers_count?: number;
      [key: string]: any;
    };
    score: number;
  }

  // Find the token in hotTokenData and get top 5 KOL scores
  const getTopKOLs = (): KOLItem[] => {
    if (!hotTokenData?.data?.data?.day1) return [];

    const tokenItem = hotTokenData.data.data.day1.find(
      (item: any) =>
        item.symbol?.toLowerCase() === tokenSymbol ||
        item.token_raw?.toLowerCase() === tokenSymbol
    );

    if (!tokenItem?.kol_score || !Array.isArray(tokenItem.kol_score)) return [];

    // Sort by score descending and take top 5
    return [...tokenItem.kol_score]
      .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map(
        (item: any): KOLItem => ({
          profile: item.profile,
          score: item.score || 0,
        })
      );
  };

  const topKOLs = getTopKOLs();
  const hasLeftContent = Boolean(topKOLs.length) || hasTweets;

  return (
    <div
      className='z-50 w-[560px] overflow-hidden rounded-2xl border theme-border theme-bg-secondary shadow-[0_18px_50px_rgba(15,23,42,0.24)] backdrop-blur-xl'
      data-xhunt-exclude={'true'}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseOver={onMouseOver}
      style={{
        fontFamily:
          'Lato, "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <div className='flex items-center justify-between border-b theme-border bg-gradient-to-r from-sky-500/10 via-violet-500/10 to-fuchsia-500/10 px-3.5 py-2.5'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <img
            src='https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/xhunt_new.jpg'
            alt='XHunt'
            className='h-7 w-7 flex-shrink-0 rounded-full shadow-sm ring-1 ring-white/40'
          />
          <div className='min-w-0'>
            <div className='truncate text-[17px] font-extrabold leading-none tracking-tight theme-text-primary'>
              {token}
            </div>
            <div className='mt-0.5 text-[10px] font-semibold leading-none text-sky-500'>
              XHunt AI Analysis
            </div>
          </div>
        </div>
        <button
          type='button'
          className='flex h-8 w-8 items-center justify-center rounded-full theme-hover transition-colors cursor-pointer'
          onClick={() => {
            setIsVisible(false);
          }}
        >
          <CircleX className='h-5 w-5 theme-text-secondary' />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className='h-[320px] flex flex-col items-center justify-center gap-5 theme-text-primary'>
          <div className='relative'>
            <div className='w-14 h-14 rounded-full border-2 border-blue-400/20' />
            <div className='absolute inset-0 w-14 h-14 rounded-full border-2 border-transparent border-t-blue-400 animate-[breathing_2s_ease-in-out_infinite]' />
            <div className='absolute inset-0 flex items-center justify-center'>
              <Sparkles className='w-5 h-5 text-blue-400' />
            </div>
          </div>
          <div className='text-center space-y-1.5'>
            <h3 className='text-[17px] font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'>
              XHunt AI Analysis
            </h3>
            <p className='text-[12px] theme-text-secondary'>{t('loading')}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && data && (
        <div
          className={
            hasLeftContent
              ? 'grid h-[350px] grid-cols-[250px_1fr]'
              : 'h-[320px]'
          }
        >
          {/* Left Column - KOLs and Tweets */}
          {hasLeftContent ? (
            <div
              className='overflow-y-auto custom-scrollbar'
              style={{ borderRight: '1px solid rgba(148, 163, 184, 0.16)' }}
            >
              {/* Top KOLs Section */}
              {topKOLs.length > 0 && (
                <section>
                  <div className='sticky top-0 z-10 border-b theme-border theme-bg-secondary/95 px-3 py-1.5 backdrop-blur'>
                    <h3 className='text-[12px] font-bold leading-5 theme-text-secondary'>
                      {t('tickerTopInfluencers')}
                    </h3>
                  </div>
                  <div className='px-2 py-1 space-y-0.5'>
                    {topKOLs.map((kol: KOLItem, index: number) => (
                      <a
                        key={`${kol.profile.username}_${index}`}
                        href={`https://x.com/${kol.profile.username}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='block rounded-lg border border-transparent px-2 py-[5px] theme-hover transition-colors'
                      >
                        <div className='flex items-center gap-2'>
                          <img
                            src={kol.profile.profile_image_url || ''}
                            alt={kol.profile.name || kol.profile.username}
                            className='h-5 w-5 rounded-full flex-shrink-0 ring-1 ring-black/5'
                          />
                          <div className='min-w-0 flex-1 flex items-center gap-1.5'>
                            <span className='truncate text-[12px] font-bold leading-5 theme-text-primary'>
                              {kol.profile.name || kol.profile.username}
                            </span>
                            {kol.profile.is_blue_verified && (
                              <svg
                                viewBox='0 0 22 22'
                                aria-label='Verified account'
                                className='h-3.5 w-3.5 text-blue-400 flex-shrink-0'
                              >
                                <g>
                                  <path
                                    fill='currentColor'
                                    d='M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z'
                                  />
                                </g>
                              </svg>
                            )}
                            <span className='flex-shrink-0 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-sky-500'>
                              {t('tickerScore')}: {kol.score}
                            </span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Related Tweets Section */}
              {hasTweets && (
                <section>
                  <div className='sticky top-0 z-10 border-y theme-border theme-bg-secondary/95 px-3 py-1.5 backdrop-blur'>
                    <h3 className='text-[12px] font-bold leading-5 theme-text-secondary'>
                      {t('tickerRelatedTweets')}
                    </h3>
                  </div>
                  <div className='px-2 py-1.5 space-y-1.5'>
                    {(data?.tweets || []).map((tweet) => (
                      <a
                        key={tweet.tweetId}
                        href={tweet.link}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='block rounded-xl p-1.5 theme-hover transition-colors'
                      >
                        <div className='flex gap-2'>
                          <img
                            src={tweet.avatar}
                            alt={tweet.name}
                            className='h-7 w-7 rounded-full flex-shrink-0'
                          />
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-1 mb-1'>
                              <span className='font-bold theme-text-primary text-[12px] truncate whitespace-nowrap'>
                                {tweet.name}
                              </span>
                              <span className='theme-text-secondary text-[11px]'>
                                ·
                              </span>
                              <time className='theme-text-secondary text-[11px] whitespace-nowrap'>
                                {dayjs(tweet.createTime).fromNow()}
                              </time>
                            </div>
                            <p className='theme-text-primary text-[12px] leading-[18px] whitespace-pre-wrap mb-2'>
                              {tweet.text}
                            </p>
                            <div className='flex items-center justify-between theme-text-secondary'>
                              <div className='flex items-center gap-1'>
                                <MessageCircle className='w-3.5 h-3.5' />
                                <span className='text-[11px]'>
                                  {formatNumber(tweet.replyCount ?? 0)}
                                </span>
                              </div>
                              <div className='flex items-center gap-1'>
                                <Repeat className='w-3.5 h-3.5' />
                                <span className='text-[11px]'>
                                  {formatNumber(tweet.retweetCount ?? 0)}
                                </span>
                              </div>
                              <div className='flex items-center gap-1'>
                                <Heart className='w-3.5 h-3.5' />
                                <span className='text-[11px]'>
                                  {formatNumber(tweet.likeCount ?? 0)}
                                </span>
                              </div>
                              <div className='flex items-center gap-1'>
                                <Eye className='w-3.5 h-3.5' />
                                <span className='text-[11px]'>
                                  {formatNumber(tweet.viewCount ?? 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : null}

          {/* Right Column - AI Analysis */}
          <div className='overflow-hidden'>
            <div className='h-full overflow-y-auto custom-scrollbar px-3.5 py-3'>
              <div className='mb-2 inline-flex items-center gap-1.5 rounded-full border theme-border-soft bg-sky-500/5 px-2 py-1'>
                <Sparkles className='h-3 w-3 text-sky-500' />
                <span className='text-[11px] font-bold leading-none bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'>
                  XHunt AI Analysis
                </span>
              </div>
              <div className='space-y-3'>
                <div className='text-[13px] font-medium theme-text-primary leading-[22px] whitespace-pre-wrap'>
                  {answerDS || t('tickerNoData')}
                </div>
                <div className='rounded-xl border theme-border-soft bg-black/[0.03] px-3 py-2'>
                  <p className='text-[10px] font-medium theme-text-secondary leading-[16px]'>
                    {t('tickerAiTips')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(TokenAnalysisPanel);
