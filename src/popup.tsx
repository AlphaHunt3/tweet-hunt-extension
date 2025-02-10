import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import "./style.css";
const storage = new Storage()

function IndexPopup() {
  const [settings, setSettings] = useState({
    showPanel: true,
    showKOLStats: true,
    showTop10List: true,
    showProfitStats: true,
    showDeletedTweets: true,
    darkMode: true
  })

  useEffect(() => {
    // 加载保存的设置
    const loadSettings = async () => {
      const savedSettings = await storage.get("settings")
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    }
    loadSettings()
  }, [])

  // 保存设置
  const handleSettingChange = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    await storage.set("settings", JSON.stringify(newSettings))
  }

  return (
    <div className="w-64 p-4 bg-black text-white">
      <h1 className="text-xl font-bold mb-4">TweetHunt 设置</h1>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm">显示悬浮面板</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.showPanel}
              onChange={(e) => handleSettingChange("showPanel", e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm">显示KOL统计</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.showKOLStats}
              onChange={(e) => handleSettingChange("showKOLStats", e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm">显示Top10列表</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.showTop10List}
              onChange={(e) => handleSettingChange("showTop10List", e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm">显示盈利统计</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.showProfitStats}
              onChange={(e) => handleSettingChange("showProfitStats", e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm">显示已删除推文</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.showDeletedTweets}
              onChange={(e) => handleSettingChange("showDeletedTweets", e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm">深色模式</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.darkMode}
              onChange={(e) => handleSettingChange("darkMode", e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        版本 0.0.1
      </div>
    </div>
  )
}

export default IndexPopup
