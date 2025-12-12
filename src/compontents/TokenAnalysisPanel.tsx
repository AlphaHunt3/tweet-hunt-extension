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
    return tokenItem.kol_score
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

  return (
    <>
      {/* Panel */}
      <div
        className='z-50 w-[520px] rounded-xl shadow-2xl overflow-hidden theme-border'
        data-xhunt-exclude={'true'}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseOver={onMouseOver}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-3 py-2 theme-border border-b theme-bg-secondary backdrop-blur-md'>
          <div className='flex items-center gap-2'>
            {data && token && (
              <img
                src='https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/xhunt_new.jpg'
                alt='XHunt'
                className='w-6 h-6 rounded-2xl'
              />
            )}
            <span className='text-base font-medium theme-text-primary'>
              {token}
            </span>
          </div>
          <div
            className='p-1.5 rounded-full theme-hover transition-colors cursor-pointer'
            onClick={() => {
              setIsVisible(false);
            }}
          >
            <CircleX className='w-4 h-4 theme-text-secondary' />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className='h-[400px] flex flex-col items-center justify-center gap-6 theme-text-primary theme-bg-secondary backdrop-blur-md'>
            <div className='relative'>
              <div className='w-16 h-16 rounded-full border-2 border-blue-400/20' />
              <div className='absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-blue-400 animate-[breathing_2s_ease-in-out_infinite]' />
              <div className='absolute inset-0 flex items-center justify-center'>
                <Sparkles className='w-6 h-6 text-blue-400' />
              </div>
            </div>
            <div className='text-center space-y-2'>
              <h3 className='text-lg font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'>
                XHunt AI Analysis
              </h3>
              <p className='text-sm theme-text-secondary'>{t('loading')}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && data && (
          <div
            className={
              data?.tweets && Boolean(data?.tweets?.length)
                ? 'grid grid-cols-2 divide-x theme-border'
                : ''
            }
          >
            {/* Left Column - KOLs and Tweets */}
            {(topKOLs && topKOLs.length > 0) ||
            (data?.tweets && Boolean(data?.tweets?.length)) ? (
              <div className='h-[400px] overflow-y-auto custom-scrollbar theme-bg-secondary backdrop-blur-md'>
                {/* Top KOLs Section */}
                {topKOLs && topKOLs.length > 0 && (
                  <>
                    <div className='px-3 py-1.5 theme-border border-b'>
                      <h3 className='text-xs font-medium theme-text-secondary'>
                        {lang === 'en' ? 'Top Influencers' : '顶级影响者'}
                      </h3>
                    </div>
                    <div className='divide-y theme-border'>
                      {topKOLs.map((kol: KOLItem, index: number) => (
                        <a
                          key={`${kol.profile.username}_${index}`}
                          href={`https://x.com/${kol.profile.username}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='block px-2 py-1.5 theme-hover'
                        >
                          <div className='flex items-center gap-1.5'>
                            <img
                              src={kol.profile.profile_image_url || ''}
                              alt={kol.profile.name || kol.profile.username}
                              className='w-5 h-5 rounded-full flex-shrink-0'
                            />
                            <div className='flex-1 min-w-0 flex items-center gap-1.5'>
                              <span className='font-medium theme-text-primary text-xs truncate'>
                                {kol.profile.name || kol.profile.username}
                              </span>
                              {kol.profile.is_blue_verified && (
                                <svg
                                  viewBox='0 0 22 22'
                                  aria-label='Verified account'
                                  className='w-3 h-3 text-blue-400 flex-shrink-0'
                                >
                                  <g>
                                    <path
                                      fill='currentColor'
                                      d='M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z'
                                    />
                                  </g>
                                </svg>
                              )}
                              <span className='text-[10px] font-semibold theme-text-secondary whitespace-nowrap'>
                                {lang === 'en' ? 'Score' : '得分'}: {kol.score}
                              </span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </>
                )}

                {/* Related Tweets Section */}
                {data?.tweets && Boolean(data?.tweets?.length) && (
                  <>
                    <div className='px-3 py-1.5 theme-border border-b'>
                      <h3 className='text-xs font-medium theme-text-secondary'>
                        {lang === 'en' ? 'Related Tweets' : '相关推文'}
                      </h3>
                    </div>
                    <div className='divide-y theme-border'>
                      {data?.tweets ? (
                        (data?.tweets || []).map((tweet) => (
                          <a
                            key={tweet.tweetId}
                            href={tweet.link}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='block p-2.5 theme-hover'
                          >
                            <div className='flex gap-2'>
                              <img
                                src={tweet.avatar}
                                alt={tweet.name}
                                className='w-6 h-6 rounded-full'
                              />
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-1 mb-0.5'>
                                  <span className='font-medium theme-text-primary text-xs truncate whitespace-nowrap'>
                                    {tweet.name}
                                  </span>
                                  {/*<span className="theme-text-secondary text-xs truncate">@{tweet.username}</span>*/}
                                  <span className='theme-text-secondary text-xs'>
                                    ·
                                  </span>
                                  <time className='theme-text-secondary text-xs whitespace-nowrap'>
                                    {dayjs(tweet.createTime).fromNow()}
                                  </time>
                                </div>
                                <p className='theme-text-primary text-xs leading-normal whitespace-pre-wrap mb-1.5'>
                                  {tweet.text}
                                </p>
                                <div className='flex items-center gap-4 theme-text-secondary'>
                                  <div className='flex items-center gap-1'>
                                    <MessageCircle className='w-3.5 h-3.5' />
                                    <span className='text-xs'>
                                      {formatNumber(tweet.replyCount ?? 0)}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-1'>
                                    <Repeat className='w-3.5 h-3.5' />
                                    <span className='text-xs'>
                                      {formatNumber(tweet.retweetCount ?? 0)}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-1'>
                                    <Heart className='w-3.5 h-3.5' />
                                    <span className='text-xs'>
                                      {formatNumber(tweet.likeCount ?? 0)}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-1'>
                                    <Eye className='w-3.5 h-3.5' />
                                    <span className='text-xs'>
                                      {formatNumber(tweet.viewCount ?? 0)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </a>
                        ))
                      ) : (
                        <div className={'block p-2.5 theme-hover'}>
                          <div className='flex gap-2'>
                            <div className='text-sm theme-text-primary leading-relaxed'>
                              {'NO DATA'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {/* Right Column - AI Analysis */}
            <div className='h-[400px] overflow-hidden theme-bg-secondary backdrop-blur-md'>
              <div className='h-full p-3 overflow-y-auto custom-scrollbar'>
                <div className='mb-3'>
                  <div className='flex items-center gap-2'>
                    <Sparkles className='w-5 h-5 text-blue-400' />
                    <h3 className='text-base font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'>
                      XHunt AI Analysis
                    </h3>
                  </div>
                </div>
                <div className='space-y-3'>
                  <div className='text-sm theme-text-primary leading-relaxed'>
                    {answerDS || 'NO DATA'}
                  </div>
                  <div className='pt-2 theme-border'>
                    <p className='text-[10px] theme-text-secondary leading-relaxed'>
                      {t('tickerAiTips')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default React.memo(TokenAnalysisPanel);
