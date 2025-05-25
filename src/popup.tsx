require('events').defaultMaxListeners = 20;
import './css/style.css';
import { MessageCircle, Settings, Github } from 'lucide-react';
import { useStorage } from '@plasmohq/storage/hook';
import { useI18n } from '~contents/hooks/i18n.ts';
import pageJSON from "../package.json";

function IndexPopup() {
  const [showPanel, setShowPanel] = useStorage('@settings/showPanel', true);
  const [theme] = useStorage('@xhunt/theme', 'dark');
  const { t, lang, setLang } = useI18n();
  return <div data-theme={theme}  className="theme-bg-secondary backdrop-blur-sm px-4 py-2 theme-text-primary w-[280px] shadow-lg">
    <div className="flex items-center gap-2 mb-4">
      <Settings className="w-4 h-4 text-blue-400" />
      <h2 className="text-sm font-bold">{t('settings')}</h2>
    </div>

    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm">{t('language')}</span>
        <div className="flex rounded-lg overflow-hidden">
          <button
            className={`px-2 py-1 text-xs ${lang === 'en' ? 'bg-blue-400 text-white' : 'theme-bg-tertiary theme-text-primary'}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            className={`px-2 py-1 text-xs ${lang === 'zh' ? 'bg-blue-400 text-white' : 'theme-bg-tertiary theme-text-primary'}`}
            onClick={() => setLang('zh')}
          >
            中
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">{t('showAnalytics')}</span>
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
    </div>

    <div className="mt-6 pt-4 theme-border border-t">
      <div className="flex items-center gap-2 text-xs theme-text-secondary mb-2">
        <Github className="w-3.5 h-3.5" />
        <a href="https://github.com/AlphaHunt3/tweet-hunt-extension" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
          {t('sourceGithub')}
        </a>
      </div>
      <div className="flex items-center gap-2 text-xs theme-text-secondary mb-2">
        <MessageCircle className="w-3.5 h-3.5" />
        <a href="https://t.me/cryptohunt_ai" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
          {t('contactUs')}
        </a>
      </div>
      <div className="flex items-center justify-between text-xs theme-text-secondary">
        <span>{t('version')} {pageJSON.version}</span>
      </div>
    </div>
  </div>
}

export default IndexPopup
