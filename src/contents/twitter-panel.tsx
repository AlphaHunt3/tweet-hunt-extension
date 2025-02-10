import type { PlasmoContentScript } from "plasmo"
import { useEffect, useState, useCallback } from "react"
import { Storage } from "@plasmohq/storage"
import { useThrottleEffect, useTimeout } from 'ahooks'
import cssText from "data-text:~/style.css"
import { parseTwitterUserInfo } from "./utils/twitter-parser"
import { fetchKOLStats } from "./services/api"

export const config: PlasmoContentScript = {
  matches: ["https://*.twitter.com/*", "https://*.x.com/*"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

const storage = new Storage()

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
  const [kolStats, setKolStats] = useState<Awaited<ReturnType<typeof fetchKOLStats>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState(window.location.href)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const info = await parseTwitterUserInfo()
      if (!info) {
        throw new Error('无法获取用户信息')
      }
      console.log('info', info)
      setUserInfo(info)

      const stats = await fetchKOLStats(info.userId)
      console.log(stats, '????dsad')
      setKolStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 使用 useThrottleEffect 代替手动实现的节流
  useThrottleEffect(() => {
    loadData()
  }, [currentUrl], { wait: 1000 })

  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await storage.get("settings")
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

      {!loading && !error && userInfo && kolStats && (
        <>
          {settings.showKOLStats && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">KOL 统计</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {/*<div>关注者: {userInfo.followersCount.toLocaleString()}</div>*/}
                {/*<div>互动率: {kolStats.engagementRate.toFixed(1)}%</div>*/}
                {/*<div>平均转发: {kolStats.averageRetweets}</div>*/}
              </div>
            </div>
          )}

          {settings.showTop10List && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Top 10 推文</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {(kolStats?.top10Tweets || []).map((tweet, index) => (
                  <div key={index}>
                    {index + 1}. "{tweet.content}" - {tweet.retweetCount} 转发
                  </div>
                ))}
              </div>
            </div>
          )}

          {settings.showProfitStats && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">盈利统计</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>总收入: ${kolStats.profitStats.totalIncome.toLocaleString()}</div>
                <div>本月收入: ${kolStats.profitStats.monthlyIncome.toLocaleString()}</div>
                <div>增长率: {kolStats.profitStats.growthRate.toFixed(1)}%</div>
              </div>
            </div>
          )}

          {settings.showDeletedTweets && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">已删除推文</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {kolStats.deletedTweets.map((tweet, index) => (
                  <div key={index}>• {tweet.content}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TwitterPanel
