import React, { useEffect, useState } from 'react'
import {
  Users2,
  TrendingUp,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageCircle,
  Heart,
  Repeat,
  // Minimize2,
  GripVertical, Loader2
} from 'lucide-react';
import { useDebounceEffect, useDebounceFn, useLockFn } from 'ahooks'
import cssText from 'data-text:~/style.css'
import { fetchDelTwitterInfo, fetchTwitterInfo } from './services/api'
import type { TwitterInfo } from './services/api'
import { AnalyticsIcon } from './compontents/AnalyticsIcon.tsx';
import numeral from 'numeral';
import dayjs from 'dayjs';
import { DraggablePanel } from '~contents/compontents/DraggablePanel.tsx';
import { useStorage } from '@plasmohq/storage/hook'
import { extractUsernameFromUrl } from '~contents/utils';
import { useI18n } from '~contents/hooks/i18n.ts';

export const config = {
  matches: ['https://*.x.com/*']
}

export const getStyle = () => {
  const style = document.createElement('style')
  style.textContent = cssText
  return style
}

function TwitterPanel() {
  const [showPanel] = useStorage('@settings/showPanel', true);
  const [showDeletedTweets] = useStorage('@settings/showDeletedTweets', true);
  const [userId, setUserId] = useState('');
  const [deletedTweets, setDeletedTweets] = useState([]);
  const [userStats, setUserStats] = useState<TwitterInfo>(null);
  const [loading, setLoading] = useState(true)
  const [loadingDel, setLoadingDel] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState(window.location.href)
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { t } = useI18n();

  const formatNumber = (num: number | undefined) => {
    return numeral(num || 0).format('0.[0]a').toUpperCase();
  };

  const formatPercentage = (num: number | undefined) => {
    return numeral(num || 0).format('0.0%');
  };

  const formatDate = (dateString: string) => {
    const date = dayjs(dateString);
    const now = dayjs();
    const hoursAgo = now.diff(date, 'hour');

    if (hoursAgo < 24) {
      return date.format('h:mm A')
    } else {
      return date.format('MMM D');
    }
  };
  const { run: fetchDelData } = useDebounceFn(async () => {
    try {
      if (!userId || String(userId) <= 4) return;
      setLoadingDel(true);
      setError(null);
      const [{ value: deletedAry }] = await Promise.allSettled([
        fetchDelTwitterInfo(userId),
      ]);
      setDeletedTweets(deletedAry);
    } catch (err) {
      // setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoadingDel(false)
    }
  }, {
    leading: true,
    trailing: false,
    wait: 1000
  })

  const loadData = useLockFn(async () => {
    try {
      if (!userId || String(userId) <= 4) return;
      setLoading(true);
      setError(null);
      fetchDelData().then(r => r);
      const [{ value: userStats }] = await Promise.allSettled([
        fetchTwitterInfo(userId),
      ]);
      setUserStats(userStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  });

  useEffect(() => {
    loadData().then(r => r);
  }, [userId]);
  useDebounceEffect(() => {
    const uid = extractUsernameFromUrl(currentUrl);
    setUserId(uid);
  }, [currentUrl], { wait: 500 })

  useEffect(() => {
    // 使用 MutationObserver 监听 URL 变化
    const observer = new MutationObserver(() => {
      const newUrl = window.location.href
      if (newUrl !== currentUrl) {
        setCurrentUrl(newUrl)
      }
    })

    observer.observe(document, { subtree: true, childList: true })

    return () => {
      observer.disconnect()
    }
  }, [currentUrl])

  if (!showPanel) {
    return null
  }
  if (error || !userId) {
    return <></>
  }
  return <DraggablePanel
    width={isMinimized ? 48 : 320}
    dragHandleClassName="tw-hunt-drag-handle"
  >
    <div className="fixed w-[320px]">
      {/* Panel Content */}
      {!isMinimized && <div
				className={`absolute top-0 right-0 w-full bg-[#15202b] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-white overflow-hidden opacity-100 shadow-[0_8px_24px_rgba(0,0,0,0.25)]`}
			>
        {loading && (
          <div className="absolute inset-0 bg-[#15202b]/70 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center pointer-events-auto">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
            <p className="text-sm text-blue-200">{t('loading')}</p>
          </div>
        )}
        {/* Sticky Header */}
				<div className="sticky top-0 z-50 bg-[#15202b]/95 backdrop-blur-sm border-b border-gray-700/50">
					<div className="absolute right-2 top-2 flex items-center gap-1">
						<div className="tw-hunt-drag-handle p-1.5 rounded-full hover:bg-gray-700/50 transition-colors cursor-grab active:cursor-grabbing">
							<GripVertical className="w-4 h-4 text-gray-400" />
						</div>
            {/*<button*/}
            {/*	onClick={() => setIsMinimized(true)}*/}
            {/*	className="p-1.5 rounded-full hover:bg-gray-700/50 transition-colors"*/}
            {/*>*/}
            {/*	<Minimize2 className="w-4 h-4 text-gray-400" />*/}
            {/*</button>*/}
					</div>
					<div className="p-3 pt-2">
						<h1 className="text-sm font-semibold pl-1">{`@${userId}`}</h1>
					</div>
				</div>

				<div className="max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* KOL Followers Section */}
					<div className="p-3 border-b border-gray-700">
						<div className="flex items-center gap-2 mb-2">
							<Users2 className="w-4 h-4 text-blue-400" />
							<h2 className="font-bold text-sm">{t('kFollowingAnalytics')}</h2>
						</div>

						<div className="grid grid-cols-3 gap-2 mb-2">
							<div>
								<p className="text-xs text-gray-400">Global KOLs</p>
								<p className="font-bold text-sm">{formatNumber(userStats?.kolFollow?.globalKolFollowers)}</p>
							</div>
							<div>
								<p className="text-xs text-gray-400">CN KOLs</p>
								<p className="font-bold text-sm">{formatNumber(userStats?.kolFollow?.cnKolFollowers)}</p>
							</div>
							<div>
								<p className="text-xs text-gray-400">Top 100</p>
								<p className="font-bold text-sm">{userStats?.kolFollow?.topKolFollowersCount}</p>
							</div>
						</div>

						<div>
							<p className="text-xs text-gray-400 mb-1">{t("topKFollowers")}</p>
							<div className="flex flex-wrap gap-0">
                {(userStats?.kolFollow?.topKolFollowersSlice10 || []).map((follower) => (
                  <a
                    key={follower.username}
                    href={`https://x.com/${follower.username}`}
                    target={'_blank'}
                    className="block relative group -ml-1 first:ml-0"
                  >
                    <img
                      src={follower.avatar}
                      alt={follower.name}
                      className="w-7 h-7 rounded-full hover:ring-2 hover:ring-blue-400 transition-all border-2 border-[#15202b] hover:relative hover:z-10"
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-20">
                      {follower.name}
                    </div>
                  </a>
                ))}
							</div>
						</div>
					</div>

          {/*Token Performance Section*/}
          {(
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <h2 className="font-bold text-sm">{t("tokenPerformance")}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">30D Win Rate</span>
                    <span className="text-xs font-medium">
                        {formatPercentage(userStats?.kolTokenMention?.day30?.winRate)}
                      </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Max Profit</span>
                    <span className="text-xs font-medium text-green-400">
                        +{formatPercentage(userStats?.kolTokenMention?.day30?.maxProfitAvg)}
                      </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Current</span>
                    <span className={`text-xs font-medium ${userStats?.kolTokenMention?.day30?.nowProfitAvg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {userStats?.kolTokenMention?.day30?.nowProfitAvg >= 0 ? '+' : ''}
                      {formatPercentage(userStats?.kolTokenMention?.day30?.nowProfitAvg)}
                      </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">90D Win Rate</span>
                    <span className="text-xs font-medium">
                        {formatPercentage(userStats?.kolTokenMention?.day90?.winRate)}
                      </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Max Profit</span>
                    <span className="text-xs font-medium text-green-400">
                        +{formatPercentage(userStats?.kolTokenMention?.day90?.maxProfitAvg)}
                      </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Current</span>
                    <span className={`text-xs font-medium ${userStats?.kolTokenMention?.day90?.nowProfitAvg >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {userStats?.kolTokenMention?.day90?.nowProfitAvg >= 0 ? '+' : ''}
                      {formatPercentage(userStats?.kolTokenMention?.day90?.nowProfitAvg)}
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
                className="p-3 flex items-center justify-between cursor-pointer border-gray-700"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <h2 className="font-bold text-sm">{t("deletedTweets")}</h2>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>

              <div className={`${isExpanded ? '' : 'h-0'} overflow-hidden transition-[height] duration-200`}>
                <div className="p-3 space-y-4">
                  {loadingDel && <span className={'block text-center text-xs text-gray-500'}>loading...</span>}
                  {!deletedTweets?.length && !loadingDel &&
										<span className={'block text-center text-xs text-gray-500'}>No data</span>}
                  {!loadingDel && deletedTweets?.length ? deletedTweets.map(tweet => (
                    <div key={tweet?.id} className="text-xs space-y-1.5">
                      <p className="text-gray-200 leading-normal">{tweet?.text}</p>
                      <div className="flex items-center gap-4 text-gray-500">
                        <span>{formatDate(tweet?.createTime)}</span>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              {formatNumber(tweet?.viewCount)}
                            </span>
                          <span className="flex items-center gap-1">
                              <Repeat className="w-3.5 h-3.5" />
                            {formatNumber(tweet?.retweetCount)}
                            </span>
                          <span className="flex items-center gap-1">
                              <MessageCircle className="w-3.5 h-3.5" />
                            {formatNumber(tweet?.replyCount)}
                            </span>
                          <span className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5" />
                            {formatNumber(tweet?.likeCount)}
                            </span>
                        </div>
                      </div>
                      <div className="border-b border-gray-700/50 pt-2" />
                    </div>
                  )) : null}
                </div>
              </div>
            </div>
          )}
				</div>
			</div>}


      {/* Minimized State Icon */}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="absolute top-0 right-0 w-12 h-12 bg-[#15202b] rounded-2xl flex items-center justify-center cursor-pointer"
        >
          <AnalyticsIcon />
        </button>
      )}
    </div>
  </DraggablePanel>
}

export default TwitterPanel
