import React, { useCallback } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';

interface Tab {
  id: string;
  label: string;
  hasRedDot?: boolean;
  tooltip?: string; // Optional hover tooltip text; defaults to label
  icon?: React.ComponentType<{ className?: string }>; // Optional leading icon
  badge?: string; // Optional badge text (e.g., "Beta", "测试")
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  zhMaxRow?: number; // Optional override for max tabs per row in Chinese
  enMaxRow?: number; // Optional override for max tabs per row in non-Chinese
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  zhMaxRow,
  enMaxRow,
}: TabsProps) {
  const { lang } = useI18n();
  // 中文：默认每行最多3个；英文：默认每行最多2个（可通过 props 覆盖）
  const perRowBase = lang === 'zh' ? zhMaxRow ?? 3 : enMaxRow ?? 2;
  const perRow = Math.max(1, perRowBase | 0);
  const tabWidthPct = 100 / perRow;

  // 检查浏览器是否支持 View Transition API
  const supportsViewTransition =
    typeof document !== 'undefined' && 'startViewTransition' in document;

  // 使用 View Transition API 处理 tab 切换
  const handleTabChange = useCallback(
    (tabId: string) => {
      if (supportsViewTransition) {
        (document as any).startViewTransition(() => {
          onChange(tabId);
        });
      } else {
        onChange(tabId);
      }
    },
    [onChange, supportsViewTransition]
  );

  return (
    <>
      <style>{`
        [data-theme='light'] .tab-badge {
          color: rgba(217, 119, 6, 0.75);
        }
        [data-theme='dark'] .tab-badge {
          color: rgba(251, 191, 36, 0.5);
        }
      `}</style>
      <div className='border-b theme-border'>
        <div className='flex flex-wrap'>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`grow-0 shrink-0 px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap text-center group ${
                activeTab === tab.id
                  ? 'text-blue-400 tab-button-active'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
              style={{
                flexBasis: `${tabWidthPct}%`,
                maxWidth: `${tabWidthPct}%`,
              }}
              onClick={() => handleTabChange(tab.id)}
            >
              {/* 底部指示器 - 使用 View Transition API 实现平滑移动 */}
              {activeTab === tab.id && (
                <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 tab-indicator' />
              )}
              {/* Content with optional icon + label */}
              <span className='inline-flex items-center justify-center gap-1.5 max-w-full'>
                {tab.icon ? <tab.icon className='w-4 h-4 shrink-0' /> : null}
                <span
                  className={`inline-block max-w-full whitespace-nowrap align-middle ${
                    lang === 'zh' ? '' : 'overflow-hidden text-ellipsis'
                  }`}
                >
                  {tab.label}
                </span>
              </span>
              {tab.badge && (
                <span className='tab-badge absolute top-0.5 right-1 px-1 py-0 text-[9px] font-normal scale-75 origin-top-right whitespace-nowrap pointer-events-none'>
                  {tab.badge}
                </span>
              )}
              {tab.hasRedDot && (
                <div className='absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm'></div>
              )}

              {/* Hover tooltip */}
              <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-[10px] theme-bg-secondary theme-text-primary rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg theme-border border'>
                {tab.tooltip || tab.label}
                <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--border-color)]'></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
