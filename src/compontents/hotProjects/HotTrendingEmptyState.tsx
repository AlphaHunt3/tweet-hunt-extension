import React from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { localStorageInstance } from '~storage/index.ts';

interface HotTrendingEmptyStateProps {
  settingKey: string;
}

export function HotTrendingEmptyState({ settingKey }: HotTrendingEmptyStateProps) {
  const { t } = useI18n();

  const handleEnable = async () => {
    try {
      await localStorageInstance.set(`@settings/${settingKey}`, true);
    } catch { }
  };

  return (
    <div className='flex items-center justify-between px-3 py-1 mx-2 my-1.5 rounded-md'>
      <span className='text-[12px] theme-text-secondary'>
        {t('hotTrendingDisabledMini') || '实时热门已关闭'}
      </span>
      <button
        onClick={handleEnable}
        className={`px-2 py-0.5 rounded text-[10px] font-medium text-white transition-opacity hover:opacity-90 ${'bg-emerald-500'}`}
      >
        {t('enableHotTrending') || '开启'}
      </button>
    </div>
  );
}
