import { useState } from 'react';
import { Users2, ChevronDown, ChevronUp } from 'lucide-react';
import { KolData, KolTabType, KolFollower } from '~types';
import { useI18n } from '~contents/hooks/i18n.ts';
import { formatNumber } from '~contents/utils';
import { officialTagsManager } from '~/utils/officialTagsManager.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

interface KolFollowersSectionProps {
  kolData: KolData;
  isHoverPanel?: boolean;
  defaultTab?: KolTabType;
}

// 生成基于字符串的一致颜色（恢复原来的颜色生成方式）
function generateTagColor(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  // 生成柔和的颜色
  const hue = Math.abs(hash) % 360;
  const saturation = 45 + (Math.abs(hash) % 25); // 45-70%
  const lightness = 65 + (Math.abs(hash) % 20); // 65-85%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// 官方标签组件 - 统一使用 tooltip 方式
function OfficialTag({ text, theme, className }: { text: string; theme: string, className?: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const backgroundColor = generateTagColor(text);

  return (
    <span className="relative inline-block h-[18px] w-full">
      <span
        className={`inline-block items-center px-0.5 py-0.5 rounded text-[8px] font-medium whitespace-nowrap w-full overflow-hidden text-ellipsis text-center break-all ${className}`}
        style={{
          backgroundColor: theme === 'dark' ? `${backgroundColor}20` : `${backgroundColor}30`,
          borderWidth: '0.5px',
          borderStyle: 'solid',
          borderColor: theme === 'dark' ? 'rgba(207,217,223,0.2)' : '#CFD9DF',
          color: theme === 'dark' ? backgroundColor : `hsl(${backgroundColor.match(/\d+/)?.[0] || 0}, 70%, 35%)`,
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={text} // 浏览器原生 tooltip 作为备选
      >
        {text}
      </span>

      {/* 自定义 tooltip - 无论字数多少都显示 */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap z-50 pointer-events-none">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </span>
  );
}

// KOL 关注者卡片组件
function KolFollowerCard({ follower, theme }: { follower: KolFollower; theme: string }) {
  const [showNameTooltip, setShowNameTooltip] = useState(false);
  const { lang } = useI18n();
  // 获取官方标签 - 使用当前语言
  const officialTags = officialTagsManager.getUserTags(follower.username, lang as 'zh' | 'en');
  const displayTags = officialTags.slice(0, 2); // 最多显示2个标签

  return (
    <a
      href={`https://x.com/${follower.username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-0.5 rounded theme-hover transition-all duration-200 hover:shadow-sm group"
      title={`${follower.name} (@${follower.username})`}
    >
      <div className="flex flex-col items-center space-y-1 min-w-0">
        {/* 头像 */}
        <img
          src={follower.avatar}
          alt={follower.name}
          className="w-7 h-7 rounded-full border theme-border flex-shrink-0 group-hover:ring-1 group-hover:ring-blue-400 transition-all"
        />

        {/* 用户信息 */}
        <div className="flex flex-col items-center space-y-0.5 min-w-0 w-full">
          {/* 用户名 - 限制一行显示，hover 显示完整内容 */}
          <div className="relative w-full">
            <div
              className="text-[10px] font-medium theme-text-primary leading-tight text-center w-full px-0.5 truncate"
              onMouseEnter={() => setShowNameTooltip(true)}
              onMouseLeave={() => setShowNameTooltip(false)}
              title={follower.name} // 浏览器原生 tooltip 作为备选
            >
              {follower.name}
            </div>

            {/* 名字的自定义 tooltip */}
            {showNameTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none">
                {follower.name}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>

          {/* 官方标签 */}
          {displayTags.length > 0 && (
            <div className="flex items-center gap-[2px] flex-wrap justify-center w-full">
              {displayTags.map((tag, index) => (
                <OfficialTag key={index} text={tag} theme={theme} />
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

export function KolFollowersSection({ kolData, defaultTab = 'global', isHoverPanel = false }: KolFollowersSectionProps) {
  const [activeKolTab, setActiveKolTab] = useState<KolTabType>(defaultTab as KolTabType);
  const [isExpanded, setIsExpanded] = useState(isHoverPanel); // HoverPanel 默认展开，FixedPanel 默认收起
  const { t } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  const getActiveKolList = (): KolFollower[] => {
    let result: KolFollower[] = [];

    switch (activeKolTab) {
      case 'global':
        result = kolData?.kolFollow?.globalKolFollowers || [];
        break;
      case 'cn':
        result = kolData?.kolFollow?.cnKolFollowers || [];
        break;
      case 'top100':
        result = kolData?.kolFollow?.topKolFollowers || [];
        break;
      default:
        result = kolData?.kolFollow?.globalKolFollowers || [];
    }

    return Array.isArray(result) ? result : [];
  };

  const globalFollowers = kolData?.kolFollow?.globalKolFollowersCount || 0;
  const cnFollowers = kolData?.kolFollow?.cnKolFollowersCount || 0;
  const topFollowers = kolData?.kolFollow?.topKolFollowersCount || 0;
  const activeKolList = getActiveKolList();

  // 根据是否为 HoverPanel 决定显示的数量
  const itemsPerRow = 4; // 每行4个
  const displayList = isHoverPanel || isExpanded
    ? activeKolList
    : activeKolList.slice(0, itemsPerRow); // FixedPanel 未展开时只显示第一行

  const hasMore = activeKolList.length > itemsPerRow;

  return (
    <div className={`p-2 theme-border ${isHoverPanel ? '' : 'border-b'} overflow-hidden`}>
      {!isHoverPanel && (
        <div className="flex items-center gap-2 mb-2">
          <Users2 className="w-4 h-4 text-blue-400" />
          <h2 className="font-bold text-sm theme-text-primary">{t('kFollowingAnalytics')}</h2>
        </div>
      )}

      {!isHoverPanel && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            className={`text-center py-1 px-2 rounded-md text-xs transition-colors ${
              activeKolTab === 'global' ? 'bg-blue-500/20 text-blue-400' : 'theme-hover'
            }`}
            onClick={() => setActiveKolTab('global')}
          >
            <p className="theme-text-secondary">{t('KOL_Followers')}</p>
            <p className="font-bold">{formatNumber(globalFollowers)}</p>
          </button>
          <button
            className={`text-center py-1 px-2 rounded-md text-xs transition-colors ${
              activeKolTab === 'cn' ? 'bg-blue-500/20 text-blue-400' : 'theme-hover'
            }`}
            onClick={() => setActiveKolTab('cn')}
          >
            <p className="theme-text-secondary">{t('CN_KOLs')}</p>
            <p className="font-bold">{formatNumber(cnFollowers)}</p>
          </button>
          <button
            className={`text-center py-1 px-2 rounded-md text-xs transition-colors ${
              activeKolTab === 'top100' ? 'bg-blue-500/20 text-blue-400' : 'theme-hover'
            }`}
            onClick={() => setActiveKolTab('top100')}
          >
            <p className="theme-text-secondary">{t('TOP100_KOLs')}</p>
            <p className="font-bold">{formatNumber(topFollowers)}</p>
          </button>
        </div>
      )}

      {isHoverPanel && <div className={'w-full h-[15px]'} />}

      {activeKolList && activeKolList?.length ? (
        <div>
          {/* 网格布局 - 减小间距 */}
          <div className="grid grid-cols-4 gap-1">
            {displayList.map((follower) => (
              <KolFollowerCard
                key={follower?.username}
                follower={follower}
                theme={theme}
              />
            ))}
          </div>

          {/* 展开/收起按钮 - 只在 FixedPanel 且有更多内容时显示 */}
          {!isHoverPanel && hasMore && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 px-2 py-1 text-xs theme-text-secondary hover:theme-text-primary theme-hover rounded transition-colors"
              >
                <span>{isExpanded ? t('showLess') : t('showMore')}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}