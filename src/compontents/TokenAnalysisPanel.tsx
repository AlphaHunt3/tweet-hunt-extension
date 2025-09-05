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
  isLoading,
  setIsVisible,
  onMouseEnter,
  onMouseLeave,
  onMouseOver,
}: TokenAnalysisPanelProps) {
  const { t, lang } = useI18n();
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const answerDS = lang === 'en' ? data?.answerEn : data?.answerCn;

  return (
    <>
      {/* Panel */}
      <div
        className='z-50 w-[480px] rounded-xl shadow-2xl overflow-hidden theme-border'
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
              'divide-x theme-border' + data?.tweets &&
              Boolean(data?.tweets?.length)
                ? 'grid grid-cols-2'
                : ''
            }
          >
            {/* Left Column - Tweets */}
            {data?.tweets && Boolean(data?.tweets?.length) && (
              <div className='h-[400px] overflow-y-auto custom-scrollbar theme-bg-secondary backdrop-blur-md'>
                <div className='px-3 py-1.5 theme-border'>
                  <h3 className='text-xs font-medium theme-text-secondary'>
                    Related Tweets
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
                                  {formatNumber(tweet.replyCount)}
                                </span>
                              </div>
                              <div className='flex items-center gap-1'>
                                <Repeat className='w-3.5 h-3.5' />
                                <span className='text-xs'>
                                  {formatNumber(tweet.retweetCount)}
                                </span>
                              </div>
                              <div className='flex items-center gap-1'>
                                <Heart className='w-3.5 h-3.5' />
                                <span className='text-xs'>
                                  {formatNumber(tweet.likeCount)}
                                </span>
                              </div>
                              <div className='flex items-center gap-1'>
                                <Eye className='w-3.5 h-3.5' />
                                <span className='text-xs'>
                                  {formatNumber(tweet.viewCount)}
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
              </div>
            )}

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
