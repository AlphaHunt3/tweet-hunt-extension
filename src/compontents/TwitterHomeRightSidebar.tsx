import React from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { configManager } from '~utils/configManager';
import { MantleHunterBanner } from './MantleHunterBanner';
import { HotProjectsKOLs } from './HotProjectsKOLs';

export interface TwitterHomeRightSidebarProps {
  className?: string;
}

export function TwitterHomeRightSidebar({
  className = '',
}: TwitterHomeRightSidebarProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [showHotTrending] = useLocalStorage('@settings/showHotTrending', true);

  // 检查是否应该显示 Mantle Hunter 活动
  const shouldShowMantleHunter = configManager.shouldShowMantleHunterProgram();

  // 如果两个条件都为 false，则不显示任何内容
  if (!shouldShowMantleHunter && !showHotTrending) {
    return null;
  }

  return (
    <div
      data-theme={theme}
      className={`rounded-xl theme-border ${className}`}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--border-color)',
        width: '350px',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Campaign Banner at the very top - 独立控制 */}
      {shouldShowMantleHunter && (
        <div className='px-4 pt-3'>
          <MantleHunterBanner />
        </div>
      )}

      {/* 实时热门区域 - 由 showHotTrending 控制 */}
      {showHotTrending && <HotProjectsKOLs />}
    </div>
  );
}
