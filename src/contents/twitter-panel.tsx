import type { PlasmoContentScript } from 'plasmo'
import { useEffect, useState, useCallback } from 'react'
import { Storage } from '@plasmohq/storage'
import { useThrottleEffect } from 'ahooks'
import cssText from 'data-text:~/style.css'
import { parseTwitterUserInfo } from './utils/twitter-parser'
import { fetchTwitterInfo } from './services/api'
import type { TwitterInfo } from './services/api'

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
 * @returns 提取的用户名，如果无法提取则返回 null
 */
function extractUsernameFromUrl(url: string): string {
  try {
    // 使用 URL 构造函数解析 URL
    const parsedUrl = new URL(url);

    // 获取路径部分（去掉开头的斜杠）
    const path = parsedUrl.pathname;

    // 去掉路径开头的斜杠并分割路径
    const segments = path.split('/').filter(segment => segment.length > 0);

    // 返回路径的最后一部分作为用户名
    return segments[segments.length - 1] || '';
  } catch (error) {
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
  const [userInfo, setUserInfo] = useState<Awaited<ReturnType<typeof parseTwitterUserInfo>>>(null)
  const [userStats, setUserStats] = useState<TwitterInfo>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState(window.location.href)

  const loadData = useCallback(async (uid: string) => {
    try {
      setLoading(true)
      setError(null)

      const info = await parseTwitterUserInfo()
      if (!info) {
        throw new Error('无法获取用户信息')
      }
      setUserInfo({
        ...info,
        userId: uid
      })

      const ret = await fetchTwitterInfo(uid);
      console.log(ret, '???==dsa')
      setUserStats(ret)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 使用 useThrottleEffect 代替手动实现的节流
  useThrottleEffect(() => {
    const uid = extractUsernameFromUrl(currentUrl);
    loadData(uid)
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
  if (loading || error || !userStats) {
    return <></>
  }
  return (
    <div className="fixed top-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50">
      <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
        TweetHunt 分析面板
      </h2>

      {loading && (
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">
          加载中...
        </div>
      )}

      {error && (
        <div className="text-center py-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && userInfo && userStats && (
        <>
          {settings.showKOLStats && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">KOL 统计</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>全球KOL关注者: {userStats?.kolFollow?.globalKolFollowers}</div>
                <div>中文KOL关注者: {userStats?.kolFollow?.cnKolFollowers}</div>
                <div>Top100 KOL 关注者: {userStats?.kolFollow?.topKolFollowersCount}</div>
              </div>
            </div>
          )}

          {/*{settings.showTop10List && (*/}
          {/*  <div className="mb-4">*/}
          {/*    <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Top 10 推文</h3>*/}
          {/*    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">*/}
          {/*      {('top10Tweets' in kolStats && kolStats?.top10Tweets || []).map((tweet, index) => (*/}
          {/*        <div key={index}>*/}
          {/*          {index + 1}. "{tweet.content}" - {tweet.retweetCount} 转发*/}
          {/*        </div>*/}
          {/*      ))}*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*)}*/}

          {/*{settings.showProfitStats && (*/}
          {/*  <div className="mb-4">*/}
          {/*    <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">盈利统计</h3>*/}
          {/*    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">*/}
          {/*      <div>总收入: ${kolStats.profitStats.totalIncome.toLocaleString()}</div>*/}
          {/*      <div>本月收入: ${kolStats.profitStats.monthlyIncome.toLocaleString()}</div>*/}
          {/*      <div>增长率: {kolStats.profitStats.growthRate.toFixed(1)}%</div>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*)}*/}

          {/*{settings.showDeletedTweets && (*/}
          {/*  <div className="mb-4">*/}
          {/*    <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">已删除推文</h3>*/}
          {/*    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">*/}
          {/*      {kolStats.deletedTweets.map((tweet, index) => (*/}
          {/*        <div key={index}>• {tweet.content}</div>*/}
          {/*      ))}*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*)}*/}
        </>
      )}
    </div>
  )
}

export default TwitterPanel
