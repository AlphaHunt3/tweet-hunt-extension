import React from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { useTagTranslation } from '~contents/hooks/useTagTranslation';
import {
    Eye,
    MessageCircle,
    Heart,
    Repeat,
    Bookmark,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import dayjs from 'dayjs';
import numeral from 'numeral';
import { sanitizeHtml } from '~utils/sanitizeHtml';

type HotTweetItem = {
    id?: string;
    rank?: number;
    score?: number;
    tweet?: {
        id?: string;
        text?: string;
        create_time?: string;
        info?: {
            html?: string;
        };
        profile?: {
            name?: string;
            username?: string;
            username_raw?: string;
            profile_image_url?: string;
            verified?: boolean;
            is_blue_verified?: boolean;
        };
        statistic?: {
            likes?: number;
            reply_count?: number;
            retweet_count?: number;
            views?: number;
            quote_count?: number;
            bookmark_count?: number;
        };
        ai?: {
            summary_cn?: string;
            summary_en?: string;
            domain_tag?: string;
            hot_tags?: string[];
            crypto_sub_tags?: string[];
            ai_sub_tags?: string[];
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
    } else {
        return date.format('MMM D');
    }
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

export function TweetList(props: {
    items: HotTweetItem[];
    filter: {
        type: 'domain' | 'hot' | null;
        groupId: string | null;
        subTagId: string | null;
        hotTag: string | null;
    };
    lang: 'zh' | 'en';
}) {
    const { t } = useI18n();
    const { translateTag } = useTagTranslation();
    const { items, filter, lang } = props;
    const [expandedIds, setExpandedIds] = React.useState<Record<string, boolean>>({});

    const filtered = React.useMemo(() => {
        if (!filter.type) return items;

        if (filter.type === 'hot') {
            const key = (filter.hotTag || '').trim();
            if (!key) return items;
            return items.filter((it) => {
                const tags = it?.tweet?.ai?.hot_tags;
                if (!Array.isArray(tags)) return false;
                return tags.includes(key);
            });
        }

        const domain = (filter.groupId || '').trim();
        const sub = (filter.subTagId || '').trim();

        const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

        return items.filter((it) => {
            const ai = it?.tweet?.ai;
            if (!ai) return false;

            const domainNorm = norm(domain);
            const aiDomainNorm = norm(ai.domain_tag);
            if (domainNorm && aiDomainNorm !== domainNorm) return false;

            const subNorm = norm(sub);

            if (subNorm && domainNorm === 'crypto') {
                const subs = Array.isArray(ai.crypto_sub_tags)
                    ? ai.crypto_sub_tags
                    : [];
                return subs.some((x) => norm(x) === subNorm);
            }
            if (subNorm && domainNorm === 'ai') {
                const subs = Array.isArray(ai.ai_sub_tags) ? ai.ai_sub_tags : [];
                return subs.some((x) => norm(x) === subNorm);
            }

            return true;
        });
    }, [items, filter]);

    if (!filtered.length) {
        return (
            <div className='mt-3 flex items-center justify-center h-[260px] theme-text-secondary'>
                <div className='text-center'>
                    <div className='text-sm'>{t('tweet_list_no_tweets')}</div>
                    <div className='text-xs mt-1'>{t('tweet_list_try_changing_filters')}</div>
                </div>
            </div>
        );
    }

    return (
        <div className='mt-3 space-y-2'>
            {filtered.map((it, idx) => {
                const tw = it?.tweet;
                const profile = tw?.profile;
                const ai = tw?.ai;
                const scoreVal = typeof it?.score === 'number' ? it.score : null;

                const summary =
                    lang === 'zh'
                        ? ai?.summary_cn || ''
                        : ai?.summary_en || ai?.summary_cn || '';

                const username = profile?.username_raw || profile?.username || 'unknown';
                const tweetId = tw?.id || it?.id || 'unknown';
                const rowKey = String(tweetId) + String(idx);
                // const isExpanded = !!expandedIds[rowKey];
                const rank = it?.rank ?? idx + 1;

                const handleTweetClick = () => {
                    window.open(`https://x.com/${username}/status/${tweetId}`, '_blank');
                };

                return (
                    <div
                        key={rowKey}
                        className='px-3 py-2 rounded-lg border theme-border hover:bg-white/5 cursor-pointer transition-colors'
                        onClick={handleTweetClick}
                    >
                        <div className='flex gap-2'>
                            {/* 左侧整体序号列 */}
                            <div className='flex-shrink-0 flex justify-center pt-0.5 w-7'>
                                <span
                                    className={`min-w-[20px] px-1.5 h-5 flex items-center justify-center text-[11px] font-semibold rounded-full ${idx === 0
                                        ? 'bg-[#e3c102]/90 text-white'
                                        : idx === 1
                                            ? 'bg-[#C0C0C0]/90 text-white'
                                            : idx === 2
                                                ? 'bg-[#CD7F32]/90 text-white'
                                                : 'bg-black/5 theme-text-secondary'
                                        }`}
                                >
                                    {rank}
                                </span>
                            </div>

                            {/* 右侧原有内容 */}
                            <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-2 mb-1'>
                                    <div className='relative'>
                                        <img
                                            src={profile?.profile_image_url}
                                            alt={profile?.name || username}
                                            className='w-7 h-7 rounded-full object-cover'
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src =
                                                    'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
                                            }}
                                        />
                                    </div>

                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-center justify-between text-xs theme-text-primary'>
                                            <div className='flex items-center gap-2 min-w-0 flex-1'>
                                                <a
                                                    href={`https://x.com/${username}`}
                                                    target='_blank'
                                                    rel='noopener noreferrer'
                                                    className='font-semibold truncate hover:underline'
                                                    title={profile?.name || username}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {profile?.name || username}
                                                </a>
                                                {profile?.is_blue_verified && <VerifiedBadge />}
                                            </div>
                                            <div className='text-[10px] theme-text-secondary ml-2 flex-shrink-0'>
                                                {formatDate(tw?.create_time)}
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-1 mt-0.5 text-[11px] theme-text-secondary'>
                                            <span className='truncate'>
                                                @{profile?.username || username}
                                            </span>
                                            {scoreVal !== null && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        {t('score')}{' '}
                                                        {Number(Number(scoreVal) * 100).toFixed(0)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {summary ? (
                                    <div className='text-[11px] theme-text-secondary mb-1 break-words'>
                                        {summary}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* {(() => {
                            const domainRaw = String(ai?.domain_tag || '').trim();
                            const domainNorm = domainRaw.toLowerCase();
                            const domainDisplay = domainNorm
                                ? domainNorm.charAt(0).toUpperCase() + domainNorm.slice(1)
                                : '';

                            const hotTags = (Array.isArray(ai?.hot_tags) ? ai?.hot_tags : []) as string[];
                            const subTags = (
                                domainNorm === 'crypto'
                                    ? (Array.isArray(ai?.crypto_sub_tags) ? ai?.crypto_sub_tags : [])
                                    : domainNorm === 'ai'
                                        ? (Array.isArray(ai?.ai_sub_tags) ? ai?.ai_sub_tags : [])
                                        : []
                            ) as string[];

                            const pills: Array<{ key: string; label: string; tone: 'domain' | 'hot' | 'sub' }> = [];
                            if (domainDisplay)
                                pills.push({ key: `domain:${domainNorm}`, label: domainDisplay, tone: 'domain' });
                            for (const t of subTags) {
                                const s = String(t || '').trim();
                                if (!s) continue;
                                pills.push({ key: `sub:${s}`, label: s, tone: 'sub' });
                            }
                            for (const t of hotTags) {
                                const s = String(t || '').trim();
                                if (!s) continue;
                                pills.push({ key: `hot:${s}`, label: s, tone: 'hot' });
                            }

                            if (!pills.length) return null;

                            const cls = (_tone: 'domain' | 'hot' | 'sub') => {
                                return 'theme-bg-tertiary/20 border theme-border-soft text-[10px] theme-text-secondary font-medium';
                            };

                            return (
                                <div className='flex flex-wrap gap-1.5 mb-2'>
                                    {pills.map((p) => (
                                        <span
                                            key={p.key}
                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls(
                                                p.tone
                                            )}`}
                                        >
                                            {translateTag(p.label)}
                                        </span>
                                    ))}
                                </div>
                            );
                        })()} */}

                        {/* <div className='text-sm theme-text-primary mb-2 break-words'>
                            <div className='flex items-center justify-between gap-2'>
                                <div className={`min-w-0 flex-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                    {tw?.info?.html ? (
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: sanitizeHtml(tw.info.html),
                                            }}
                                        />
                                    ) : (
                                        <div>
                                            {tw?.text || (
                                                <span className='italic text-gray-400'>{t('tweet_list_no_content')}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button
                                    type='button'
                                    className='shrink-0 p-1 rounded-md theme-hover theme-text-secondary'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedIds((prev) => ({
                                            ...prev,
                                            [rowKey]: !prev[rowKey],
                                        }));
                                    }}
                                    aria-label={isExpanded ? t('tweet_list_collapse') : t('tweet_list_expand')}
                                >
                                    {isExpanded ? (
                                        <ChevronUp className='w-4 h-4' />
                                    ) : (
                                        <ChevronDown className='w-4 h-4' />
                                    )}
                                </button>
                            </div>
                        </div> */}
                        {/* 
                        <div className='flex items-center gap-4 text-[10px] theme-text-secondary'>
                            <div className='flex items-center gap-1'>
                                <MessageCircle className='w-3 h-3' />
                                <span>{formatNumber(tw?.statistic?.reply_count)}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                                <Repeat className='w-3 h-3' />
                                <span>{formatNumber(tw?.statistic?.retweet_count)}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                                <Heart className='w-3 h-3' />
                                <span>{formatNumber(tw?.statistic?.likes)}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                                <Eye className='w-3 h-3' />
                                <span>{formatNumber(tw?.statistic?.views)}</span>
                            </div>
                            <div className='flex items-center gap-1'>
                                <Bookmark className='w-3 h-3' />
                                <span>{formatNumber(tw?.statistic?.bookmark_count)}</span>
                            </div>
                            <div className='ml-auto text-[10px] theme-text-tertiary'>
                                #{it?.rank ?? idx + 1}
                            </div>
                        </div> */}
                    </div>
                );
            })}
        </div>
    );
}
