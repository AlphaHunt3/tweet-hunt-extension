import React from 'react';
import { useRequest } from 'ahooks';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage';
import { HunterCampaignConfig } from './types';

interface HunterCampaignCaptainProps {
  totalRegistrations?: number;
  campaignConfig: HunterCampaignConfig;
}

export function HunterCampaignCaptain({
  totalRegistrations,
  campaignConfig,
}: HunterCampaignCaptainProps) {
  const { t } = useI18n();
  const [xhuntUser] = useLocalStorage<{ id: string } | null>(
    '@xhunt/user',
    null
  );

  // 使用真实API数据
  const statsFetcher = campaignConfig.api.fetchStats;
  const { data: stats, loading } = useRequest(
    () => (statsFetcher ? statsFetcher() : Promise.resolve(undefined)),
    {
      manual: false,
      refreshDeps: [campaignConfig],
    }
  );

  // 若父组件已传入 totalRegistrations，则不再重复请求报名信息
  const shouldFetchRegistration = typeof totalRegistrations !== 'number';
  const { data: registration, loading: regLoading } = useRequest(
    () => campaignConfig.api.fetchRegistration(xhuntUser?.id || ''),
    {
      manual: !shouldFetchRegistration,
      ready: shouldFetchRegistration,
      refreshDeps: [xhuntUser?.id, campaignConfig],
    }
  );

  const formatW = (val: number | undefined) => {
    if (typeof val !== 'number' || !isFinite(val))
      return String(t('statisticsInProgress'));
    if (val >= 1000000) {
      const num = val / 1000000;
      const str = num % 1 === 0 ? String(num) : num.toFixed(1);
      return `${str}M`;
    }
    return val.toLocaleString();
  };

  return (
    <div className='grid grid-cols-3 gap-1.5 relative'>
      {/* 背景装饰层 - 全局数据区域 */}
      <div className='absolute inset-0 bg-gradient-to-r from-indigo-500/[0.03] via-blue-500/[0.03] to-cyan-500/[0.03]' />
      <div className='absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.01] to-transparent' />

      <div className='p-1.5 rounded-md bg-white/[0.02]  transition-all duration-200'>
        <div className='text-[10px] theme-text-secondary mb-0.5 font-medium text-center'>
          {t('mantleHunterCaptainTotalParticipants')}
        </div>
        <div className='text-xs theme-text-primary font-bold text-center'>
          {loading && (shouldFetchRegistration ? regLoading : false)
            ? '-'
            : (
                (typeof totalRegistrations === 'number'
                  ? totalRegistrations
                  : (registration?.totalRegistrations as number | undefined)) ??
                (stats?.participants || 0)
              ).toLocaleString()}
        </div>
      </div>
      <div className='p-1.5 rounded-md bg-white/[0.02]  transition-all duration-200'>
        <div className='text-[10px] theme-text-secondary mb-0.5 font-medium text-center'>
          {t('mantleHunterCaptainTotalTweets')}
        </div>
        <div className='text-xs theme-text-primary font-bold text-center'>
          {loading
            ? '-'
            : (stats?.tweets || t('statisticsInProgress')).toLocaleString()}
        </div>
      </div>
      <div className='p-1.5 rounded-md bg-white/[0.02]  transition-all duration-200'>
        <div className='text-[10px] theme-text-secondary mb-0.5 font-medium text-center'>
          {t('mantleHunterCaptainTotalViews')}
        </div>
        <div className='text-xs theme-text-primary font-bold text-center'>
          {loading
            ? '-'
            : formatW(
                typeof stats?.views === 'number'
                  ? stats?.views
                  : Number(stats?.views)
              )}
        </div>
      </div>
    </div>
  );
}
