import type { PlasmoContentScript } from "plasmo"
import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import cssText from "data-text:~/style.css"

// 导出必要的 Plasmo 配置
export const config: PlasmoContentScript = {
  matches: ["https://*.twitter.com/*", "https://*.x.com/*"]
}

// 注入 Tailwind 样式
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

  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await storage.get("settings")
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    }
    loadSettings()
  }, [])

  if (!settings.showPanel) {
    return null
  }

  return (
    <div className="fixed top-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50">
      <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
        TweetHunt 分析面板
      </h2>

      {settings.showKOLStats && (
        <div className="mb-4">
          <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">KOL 统计</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div>关注者: 10,234</div>
            <div>互动率: 5.2%</div>
            <div>平均转发: 156</div>
          </div>
        </div>
      )}

      {settings.showTop10List && (
        <div className="mb-4">
          <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Top 10 推文</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div>1. "这是最热门的推文" - 1,234 转发</div>
            <div>2. "第二热门的推文" - 987 转发</div>
            <div>3. "第三热门的推文" - 654 转发</div>
          </div>
        </div>
      )}

      {settings.showProfitStats && (
        <div className="mb-4">
          <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">盈利统计</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div>总收入: $12,345</div>
            <div>本月收入: $2,345</div>
            <div>增长率: +15%</div>
          </div>
        </div>
      )}

      {settings.showDeletedTweets && (
        <div className="mb-4">
          <h3 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">已删除推文</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div>• 昨天删除的一条推文</div>
            <div>• 上周删除的推文</div>
            <div>• 更早之前删除的推文</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TwitterPanel
