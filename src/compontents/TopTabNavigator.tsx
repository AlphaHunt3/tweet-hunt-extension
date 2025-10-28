import React from 'react';
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
  const { t } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  return (
    <div className={`px-3 pt-3 ${className}`}>
      <div
        className='w-full flex items-center justify-between rounded-full px-1 py-1 border theme-border'
        style={{ borderWidth: '1px' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 text-sm font-semibold px-3 py-1.5 rounded-full transition-all duration-200 relative ${
              activeTab === tab.id
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600/70 to-purple-600/70 text-white shadow-sm hover:shadow-md'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm hover:shadow-md'
                : 'theme-text-secondary hover:theme-text-primary hover:bg-white/5'
            }`}
            onClick={() => onTabChange(tab.id as T)}
          >
            <span className='flex items-center justify-center gap-1'>
              {t(tab.label)}
              {tab.id === 'subs' && (
                <span className='-ml-1 text-xs px-1.5 py-1 bg-orange-500 text-white rounded-full font-bold leading-none scale-75'>
                  {t('newBadge')}
                </span>
              )}
            </span>
            {tab.hasRedDot && (
              <div className='absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm'></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopTabNavigator;
