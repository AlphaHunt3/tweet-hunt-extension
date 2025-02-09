import { useEffect, useState } from "react"
import type { PlasmoContentScript } from "plasmo"
import { Storage } from "@plasmohq/storage"

export const config: PlasmoContentScript = {
  matches: ["https://*.x.com/*", "https://*.twitter.com/*"]
}

interface KOLStats {
  globalKOLs: number
  chineseKOLs: number
  top100KOLs: number
  top10List: string[]
}

interface ProfitStats {
  winRate30d: number
  winRate90d: number
  currentProfit: number
  maxProfit: number
}

interface DeletedTweet {
  id: string
  content: string
  deletedAt: string
}

interface Settings {
  showPanel: boolean
  showKOLStats: boolean
  showTop10List: boolean
  showProfitStats: boolean
  showDeletedTweets: boolean
  darkMode: boolean
}

const storage = new Storage()

const TweetHuntPanel = () => {
  const [settings, setSettings] = useState<Settings>({
    showPanel: true,
    showKOLStats: true,
    showTop10List: true,
    showProfitStats: true,
    showDeletedTweets: true,
    darkMode: true
  })

  const [kolStats, setKolStats] = useState<KOLStats>({
    globalKOLs: 15000,
    chineseKOLs: 3500,
    top100KOLs: 100,
    top10List: [
      "@user1",
      "@user2",
      "@user3",
      "@user4",
      "@user5",
      "@user6",
      "@user7",
      "@user8",
      "@user9",
      "@user10"
    ]
  })

  const [profitStats, setProfitStats] = useState<ProfitStats>({
    winRate30d: 68.5,
    winRate90d: 72.3,
    currentProfit: 25000,
    maxProfit: 45000
  })

  const [deletedTweets, setDeletedTweets] = useState<DeletedTweet[]>([
    {
      id: "1",
      content: "Sample deleted tweet 1",
      deletedAt: "2023-11-20"
    },
    {
      id: "2",
      content: "Sample deleted tweet 2",
      deletedAt: "2023-11-19"
    }
  ])

  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await storage.get("settings")
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    }
    loadSettings()

    // 监听设置变化
    storage.watch({
      settings: (value) => {
        if (value) {
          setSettings(JSON.parse(value))
        }
      }
    })
  }, [])

  if (!settings.showPanel) {
    return null
  }

  return (
    <div className={`fixed top-16 right-4 z-50 w-80 ${settings.darkMode ? 'bg-black' : 'bg-white'} rounded-xl border border-gray-700 ${settings.darkMode ? 'text-white' : 'text-black'} shadow-lg`}>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">TweetHunt Analytics</h2>
        
        {/* KOL Statistics */}
        {settings.showKOLStats && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">KOL Statistics</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-2 rounded`}>
                <p className="text-sm text-gray-400">Global KOLs</p>
                <p className="text-lg font-bold">{kolStats.globalKOLs.toLocaleString()}</p>
              </div>
              <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-2 rounded`}>
                <p className="text-sm text-gray-400">Chinese KOLs</p>
                <p className="text-lg font-bold">{kolStats.chineseKOLs.toLocaleString()}</p>
              </div>
              <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-2 rounded`}>
                <p className="text-sm text-gray-400">Top 100 KOLs</p>
                <p className="text-lg font-bold">{kolStats.top100KOLs}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top 10 KOLs */}
        {settings.showTop10List && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">Top 10 KOLs</h3>
            <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded p-2`}>
              {kolStats.top10List.map((kol, index) => (
                <div key={kol} className="flex items-center py-1">
                  <span className="w-6 text-gray-400">{index + 1}.</span>
                  <span className="text-blue-400 hover:underline cursor-pointer">{kol}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profit Statistics */}
        {settings.showProfitStats && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">Performance</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-2 rounded`}>
                <p className="text-sm text-gray-400">30D Win Rate</p>
                <p className="text-lg font-bold text-green-400">{profitStats.winRate30d}%</p>
              </div>
              <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-2 rounded`}>
                <p className="text-sm text-gray-400">90D Win Rate</p>
                <p className="text-lg font-bold text-green-400">{profitStats.winRate90d}%</p>
              </div>
              <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-2 rounded`}>
                <p className="text-sm text-gray-400">Current Profit</p>
                <p className="text-lg font-bold">${profitStats.currentProfit.toLocaleString()}</p>
              </div>
              <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-gray-100'} p-2 rounded`}>
                <p className="text-sm text-gray-400">Max Profit</p>
                <p className="text-lg font-bold">${profitStats.maxProfit.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Deleted Tweets */}
        {settings.showDeletedTweets && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-300">Deleted Tweets</h3>
            <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded p-2`}>
              {deletedTweets.map((tweet) => (
                <div key={tweet.id} className="border-b border-gray-700 last:border-0 py-2">
                  <p className="text-sm">{tweet.content}</p>
                  <p className="text-xs text-gray-400 mt-1">Deleted: {tweet.deletedAt}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TweetHuntPanel