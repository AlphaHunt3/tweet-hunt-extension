import type { PlasmoContentScript } from 'plasmo'
import React, { useEffect, useState, useCallback } from 'react'
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
  Minimize2,
  GripVertical
} from 'lucide-react';
import { Storage } from '@plasmohq/storage'
import { useDebounceEffect, useDebounceFn, useLockFn } from 'ahooks'
import cssText from 'data-text:~/style.css'
import { fetchDelTwitterInfo, fetchTwitterInfo } from './services/api'
import type { TwitterInfo } from './services/api'
import { AnalyticsIcon } from './compontents/AnalyticsIcon.tsx';
import numeral from 'numeral';
import dayjs from 'dayjs';
import { DraggablePanel } from '~contents/compontents/DraggablePanel.tsx';

export const config: PlasmoContentScript = {
  matches: ['https://*.twitter.com/*', 'https://*.x.com/*']
}

export const getStyle = () => {
  const style = document.createElement('style')
  style.textContent = cssText
  return style
}

const storage = new Storage()

/**
 * 从给定的 URL 中提取用户名
 * @param url - 完整的 URL 字符串，例如 "https://x.com/aixbt_agent"
 * @returns 提取的用户名，如果无法提取或域名不是 x.com 则返回空字符串
 */
function extractUsernameFromUrl(url: string): string {
  try {
    // 使用 URL 构造函数解析 URL
    const parsedUrl = new URL(url);

    // 检查域名是否为 x.com
    if (parsedUrl.hostname !== 'x.com') {
      return '';
    }

    // 获取路径部分（去掉开头的斜杠）
    const path = parsedUrl.pathname;

    // 去掉路径开头的斜杠并分割路径
    const segments = path.split('/').filter(segment => segment.length > 0);

    // 返回路径的第一个有效部分作为用户名
    return segments[0] || '';
  } catch (error) {
    // 如果 URL 格式无效，捕获错误并返回空字符串
    console.error('Invalid URL:', error);
    return '';
  }
}

function TwitterPanel() {
  const [settings, setSettings] = useState({
    showPanel: true,
    showKOLStats: true,
    showTop10List: true,
    showProfitStats: true,
    showDeletedTweets: true,
    darkMode: true
  })
  const [userId, setUserId] = useState('');
  const [deletedTweets, setDeletedTweets] = useState([]);
  const [userStats, setUserStats] = useState<TwitterInfo>(null);
  const [loading, setLoading] = useState(true)
  const [loadingDel, setLoadingDel] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState(window.location.href)
  const [isExpanded, setIsExpanded] = useState(false);
  // const [isHovered, setIsHovered] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const showTokenPerformance = true;
  const showDeletedTweets = true;

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
  }, [currentUrl], { wait: 1000 })

  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await storage.get('settings')
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    }
    loadSettings()
  }, [])

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

  if (!settings.showPanel) {
    return null
  }
  if ((loading && !userStats) || error || !userStats) {
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
						<h1 className="text-sm font-semibold pl-1">{loading ? 'loading...' : `@${userId}`}</h1>
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
							<p className="text-xs text-gray-400 mb-1">Top KOL Followers</p>
							<div className="flex flex-wrap gap-0">
                {(userStats?.kolFollow?.topKolFollowersSlice10 || []).map((follower) => (
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

          {/*Token Performance Section*/}
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
                  {loadingDel && <span className={'block text-center'}>loading...</span>}
                  {!deletedTweets?.length && !loadingDel && <span className={'block text-center'}>No data</span>}
                  {!loadingDel && deletedTweets?.length ? deletedTweets.map(tweet => (
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
