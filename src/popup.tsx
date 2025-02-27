import './style.css';
import { MessageCircle, Settings } from 'lucide-react';
import { useStorage } from '@plasmohq/storage/dist/hook';

function IndexPopup() {
  const [showPanel, setShowPanel] = useStorage('@settings/showPanel', true);
  const [showDeletedTweets, setShowDeletedTweets] = useStorage('@settings/showDeletedTweets', true);
  return <div className="bg-[#000000]/90 backdrop-blur-sm px-4 py-2 text-white w-[280px] shadow-lg">
    <div className="flex items-center gap-2 mb-4">
      <Settings className="w-4 h-4 text-blue-400" />
      <h2 className="text-sm font-bold">Settings</h2>
    </div>

    <div className="space-y-3">
      {/*<div className="flex items-center justify-between">*/}
      {/*  <span className="text-sm">Language</span>*/}
      {/*  <div className="flex rounded-lg overflow-hidden">*/}
      {/*    <button*/}
      {/*      className={`px-2 py-1 text-xs ${language === 'en' ? 'bg-blue-400 text-white' : 'bg-gray-700 text-gray-300'}`}*/}
      {/*      // onClick={() => onLanguageChange('en')}*/}
      {/*    >*/}
      {/*      EN*/}
      {/*    </button>*/}
      {/*    <button*/}
      {/*      className={`px-2 py-1 text-xs ${language === 'zh' ? 'bg-blue-400 text-white' : 'bg-gray-700 text-gray-300'}`}*/}
      {/*      // onClick={() => onLanguageChange('zh')}*/}
      {/*    >*/}
      {/*      中*/}
      {/*    </button>*/}
      {/*  </div>*/}
      {/*</div>*/}
      <div className="flex items-center justify-between">
        <span className="text-sm">Show Analytics</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={showPanel}
            onChange={(e) => setShowPanel(e.target.checked)}
          />
          <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-400"></div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Show Deleted Tweets</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={showDeletedTweets}
            onChange={(e) => setShowDeletedTweets(e.target.checked)}
          />
          <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-400"></div>
        </label>
      </div>
    </div>

    <div className="mt-6 pt-4 border-t border-gray-700/50">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
        <MessageCircle className="w-3.5 h-3.5" />
        <a href="https://t.me/cryptohunt_ai" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
          Contact us on Telegram
        </a>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Version 1.0.0</span>
        {/*<span>Updated 2024/03/14</span>*/}
      </div>
    </div>
  </div>
}

export default IndexPopup
