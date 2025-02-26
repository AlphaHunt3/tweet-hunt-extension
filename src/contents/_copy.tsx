import React, { useState } from 'react';
import { Users2, TrendingUp, Trash2, ChevronDown, ChevronUp, Eye, MessageCircle, Heart, Repeat, Minimize2, GripVertical } from 'lucide-react';
import Draggable from 'react-draggable';
import numeral from 'numeral';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { AnalyticsIcon } from './components/AnalyticsIcon';

dayjs.extend(relativeTime);

interface AppProps {
    showDeletedTweets: boolean;
    showTokenPerformance: boolean;
    language: 'en' | 'zh';
}

interface KolFollower {
    username: string;
    name: string;
    avatar: string;
}

interface DeletedTweet {
    id: string;
    text: string;
    createTime: string;
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
    viewCount: number;
}

function App({ showDeletedTweets, showTokenPerformance, language }: AppProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const kolData = {
        kolFollow: {
            globalKolFollowers: 2502,
            cnKolFollowers: 1077,
            topKolFollowersCount: 33,
            topKolFollowersSlice10: [
                {
                    username: "hasufl",
                    name: "Hasu⚡️🤖",
                    avatar: "https://pbs.twimg.com/profile_images/1792945040211251200/3TkOPQFF_normal.jpg"
                },
                {
                    username: "zhusu",
                    name: "Zhu Su",
                    avatar: "https://pbs.twimg.com/profile_images/1642482315602395138/7g4NNyuA_normal.jpg"
                },
                {
                    username: "iamDCinvestor",
                    name: "DCinvestor",
                    avatar: "https://pbs.twimg.com/profile_images/1548726894417305601/Ko19bO_Q_normal.png"
                },
                {
                    username: "laurashin",
                    name: "Laura Shin",
                    avatar: "https://pbs.twimg.com/profile_images/1539462748173746176/hxR80FYT_normal.png"
                },
                {
                    username: "Rewkang",
                    name: "Andrew Kang",
                    avatar: "https://pbs.twimg.com/profile_images/1786874758421983232/L06COzZ-_normal.jpg"
                },
                {
                    username: "ErikVoorhees",
                    name: "Erik Voorhees",
                    avatar: "https://pbs.twimg.com/profile_images/1866265437719117824/bOPwQJXE_normal.jpg"
                },
                {
                    username: "ASvanevik",
                    name: "Alex Svanevik 🐧",
                    avatar: "https://pbs.twimg.com/profile_images/1580189120063627265/DOQY0ygF_normal.jpg"
                },
                {
                    username: "loomdart",
                    name: "loomdart - Holy War Arc",
                    avatar: "https://pbs.twimg.com/profile_images/1890221706104508416/f_NKIFhr_normal.jpg"
                },
                {
                    username: "mdudas",
                    name: "Mike Dudas",
                    avatar: "https://pbs.twimg.com/profile_images/1890521355986116608/lJQkTA-I_normal.jpg"
                },
                {
                    username: "KyleSamani",
                    name: "Kyle Samani",
                    avatar: "https://pbs.twimg.com/profile_images/1858578125870809088/sfUhlDBd_normal.jpg"
                }
            ]
        },
        kolTokenMention: {
            day30: {
                winRate: 0.5803571428571429,
                maxProfitAvg: 0.33380073177150565,
                nowProfitAvg: -0.27528721716488386,
                winRatePct: 0.24916201117318434,
                maxProfitAvgPct: 0.16145251396648044,
                nowProfitAvgPct: 0.7564245810055866
            },
            day90: {
                winRate: 0.8064516129032258,
                maxProfitAvg: 0.8139314369315542,
                nowProfitAvg: -0.5219619961591074,
                winRatePct: 0.3419764279238441,
                maxProfitAvgPct: 0.1769718948322756,
                nowProfitAvgPct: 0.8257479601087941
            }
        }
    };

    const deletedTweets = Array(5).fill({
        id: "1894409122550026500",
        text: '一周前，我在群里谨慎地分享"那就进入熊市了"，但我也没想到，今天就已经如此惨淡。\n\n或许这就是墨菲定律：害怕发生的事，就一定会发生。',
        createTime: "2025-02-25T15:28:25.000Z",
        retweetCount: 2,
        replyCount: 30,
        likeCount: 35,
        quoteCount: 3,
        viewCount: 17747
    }).map((tweet, index) => ({
        ...tweet,
        id: `${tweet.id}-${index}`,
        text: `${tweet.text} ${index + 1}`,
    }));

    const formatNumber = (num: number) => {
        return numeral(num).format('0.[0]a').toUpperCase();
    };

    const formatPercentage = (num: number) => {
        return numeral(num).format('0.0%');
    };

    const formatDate = (dateString: string) => {
        const date = dayjs(dateString);
        const now = dayjs();
        const hoursAgo = now.diff(date, 'hour');

        if (hoursAgo < 24) {
            return date.fromNow();
        } else {
            return date.format('MMM D');
        }
    };

    return (
        <Draggable
            defaultPosition={{ x: window.innerWidth - 336, y: 16 }}
            handle=".drag-handle"
            bounds="parent"
        >
            <div className="fixed w-[320px]">
                {/* Panel Content */}
                <div
                    className={`absolute top-0 right-0 w-full bg-[#15202b] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-white overflow-hidden ${
                        isHovered ? 'opacity-100 shadow-[0_8px_24px_rgba(0,0,0,0.25)]' : 'opacity-90'
                    } ${
                        isMinimized ? 'invisible' : ''
                    }`}
                >
                    {/* Sticky Header */}
                    <div className="sticky top-0 z-50 bg-[#15202b]/95 backdrop-blur-sm border-b border-gray-700/50">
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                            <div className="drag-handle p-1.5 rounded-full hover:bg-gray-700/50 transition-colors cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                            </div>
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1.5 rounded-full hover:bg-gray-700/50 transition-colors"
                            >
                                <Minimize2 className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-3 pt-2">
                            <h1 className="text-sm font-semibold pl-1">Analytics Dashboard</h1>
                        </div>
                    </div>

                    <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
                        {/* KOL Followers Section */}
                        <div className="p-3 border-b border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <Users2 className="w-4 h-4 text-blue-400" />
                                <h2 className="font-bold text-sm">KOL Following Analytics</h2>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-2">
                                <div>
                                    <p className="text-xs text-gray-400">Global KOLs</p>
                                    <p className="font-bold text-sm">{formatNumber(kolData.kolFollow.globalKolFollowers)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">CN KOLs</p>
                                    <p className="font-bold text-sm">{formatNumber(kolData.kolFollow.cnKolFollowers)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Top 100</p>
                                    <p className="font-bold text-sm">{kolData.kolFollow.topKolFollowersCount}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-400 mb-1">Top KOL Followers</p>
                                <div className="flex flex-wrap gap-0">
                                    {kolData.kolFollow.topKolFollowersSlice10.map((follower) => (
                                        <div
                                            key={follower.username}
                                            className="relative group -ml-1 first:ml-0"
                                        >
                                            <img
                                                src={follower.avatar}
                                                alt={follower.name}
                                                className="w-7 h-7 rounded-full hover:ring-2 hover:ring-blue-400 transition-all border-2 border-[#15202b] hover:relative hover:z-10"
                                            />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-20">
                                                {follower.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Token Performance Section */}
                        {showTokenPerformance && (
                            <div className="p-3 border-b border-gray-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                    <h2 className="font-bold text-sm">Token Performance</h2>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">30D Win Rate</span>
                                            <span className="text-xs font-medium">
                        {formatPercentage(kolData.kolTokenMention.day30.winRate)}
                      </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Max Profit</span>
                                            <span className="text-xs font-medium text-green-400">
                        +{formatPercentage(kolData.kolTokenMention.day30.maxProfitAvg)}
                      </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Current</span>
                                            <span className={`text-xs font-medium ${kolData.kolTokenMention.day30.nowProfitAvg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {kolData.kolTokenMention.day30.nowProfitAvg >= 0 ? '+' : ''}
                                                {formatPercentage(kolData.kolTokenMention.day30.nowProfitAvg)}
                      </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">90D Win Rate</span>
                                            <span className="text-xs font-medium">
                        {formatPercentage(kolData.kolTokenMention.day90.winRate)}
                      </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Max Profit</span>
                                            <span className="text-xs font-medium text-green-400">
                        +{formatPercentage(kolData.kolTokenMention.day90.maxProfitAvg)}
                      </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Current</span>
                                            <span className={`text-xs font-medium ${kolData.kolTokenMention.day90.nowProfitAvg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {kolData.kolTokenMention.day90.nowProfitAvg >= 0 ? '+' : ''}
                                                {formatPercentage(kolData.kolTokenMention.day90.nowProfitAvg)}
                      </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Deleted Tweets Section */}
                        {showDeletedTweets && (
                            <div>
                                <div
                                    className="p-3 flex items-center justify-between cursor-pointer border-b border-gray-700"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                        <h2 className="font-bold text-sm">Deleted Tweets</h2>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>

                                <div className={`${isExpanded ? '' : 'h-0'} overflow-hidden transition-[height] duration-200`}>
                                    <div className="p-3 space-y-4">
                                        {deletedTweets.map(tweet => (
                                            <div key={tweet.id} className="text-xs space-y-1.5">
                                                <p className="text-gray-200 leading-normal">{tweet.text}</p>
                                                <div className="flex items-center gap-4 text-gray-500">
                                                    <span>{formatDate(tweet.createTime)}</span>
                                                    <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                                {formatNumber(tweet.viewCount)}
                            </span>
                                                        <span className="flex items-center gap-1">
                              <Repeat className="w-3.5 h-3.5" />
                                                            {tweet.retweetCount}
                            </span>
                                                        <span className="flex items-center gap-1">
                              <MessageCircle className="w-3.5 h-3.5" />
                                                            {tweet.replyCount}
                            </span>
                                                        <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5" />
                                                            {tweet.likeCount}
                            </span>
                                                    </div>
                                                </div>
                                                <div className="border-b border-gray-700/50 pt-2" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Minimized State Icon */}
                <button
                    onClick={() => setIsMinimized(false)}
                    className={`absolute top-0 right-0 w-12 h-12 bg-[#15202b] rounded-2xl flex items-center justify-center ${
                        isMinimized ? 'cursor-pointer' : 'invisible'
                    }`}
                >
                    <AnalyticsIcon />
                </button>
            </div>
        </Draggable>
    );
}

export default App;