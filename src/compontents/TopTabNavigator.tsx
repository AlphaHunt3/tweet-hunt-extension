import React, { useCallback } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage';

export interface TabOption {
  id: string;
  label: string;
  hasRedDot?: boolean;
}

export interface TopTabNavigatorProps<T extends string = string> {
  tabs: TabOption[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  className?: string;
}

export const TopTabNavigator = <T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: TopTabNavigatorProps<T>) => {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  // 中文：默认每行最多3个；英文：默认每行最多2个
  const perRowBase = lang === 'zh' ? 3 : 2;
  const perRow = Math.max(1, Math.min(tabs.length, perRowBase | 0));
  const gapPx = 8;
  const perItem = `calc((100% - ${(perRow - 1) * gapPx}px) / ${perRow})`;

  // 检查浏览器是否支持 View Transition API
  const supportsViewTransition =
    typeof document !== 'undefined' && 'startViewTransition' in document;

  // 使用 View Transition API 处理 tab 切换
  const handleTabChange = useCallback(
    (tabId: T) => {
      if (supportsViewTransition) {
        (document as any).startViewTransition(() => {
          onTabChange(tabId);
        });
      } else {
        onTabChange(tabId);
      }
    },
    [onTabChange, supportsViewTransition]
  );

  return (
    <div className={`px-3 pt-3 ${className}`}>
      <div
        className='w-full flex flex-wrap gap-2 rounded-3xl px-1 py-1 border theme-border relative'
        style={{ borderWidth: '1px' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`grow-0 shrink-0 text-sm font-semibold px-3 py-1.5 rounded-full transition-colors duration-200 relative ${
              activeTab === tab.id
                ? 'text-white shadow-sm hover:shadow-md'
                : 'theme-text-secondary hover:theme-text-primary hover:bg-white/5'
            }`}
            style={{
              flexBasis: perItem,
              maxWidth: perItem,
            }}
            onClick={() => handleTabChange(tab.id as T)}
          >
            {/* 渐变背景指示器 - 使用 View Transition API 实现平滑移动 */}
            {activeTab === tab.id && (
              <span
                className={`absolute inset-0 rounded-full top-tab-indicator ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-600/70 to-purple-600/70'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500'
                }`}
                style={{ zIndex: 0 }}
              />
            )}
            <span className='relative z-10 flex items-center justify-center gap-1 max-w-full'>
              <span
                className={`inline-block max-w-full whitespace-nowrap align-middle ${
                  lang === 'zh' ? '' : 'overflow-hidden text-ellipsis'
                }`}
              >
                {t(tab.label)}
              </span>
              {/* {tab.id === 'subs' && (
                <span className='-ml-1 text-xs px-1.5 py-1 bg-orange-500 text-white rounded-full font-bold leading-none scale-75 shrink-0'>
                  {t('newBadge')}
                </span>
              )} */}
            </span>
            {tab.hasRedDot && (
              <div className='absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm z-20'></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopTabNavigator;
