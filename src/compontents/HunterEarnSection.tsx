import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { localStorageInstance } from '~storage/index.ts';
import { useLocalStorage } from '~storage/useLocalStorage';
import { CloseConfirmDialog } from './CloseConfirmDialog';
import { HunterCampaignBanner } from './HunterCampaign/HunterCampaignBanner';
import { CampaignProviderBadge } from './HunterCampaign/CampaignProviderBadge';
import type { CampaignDomain } from './HunterCampaign/campaignConfigs';

export interface HunterEarnSectionProps {
  activeHunterCampaigns: any[];
  domain?: CampaignDomain;
  active?: boolean;
}

export function HunterEarnSection({
  activeHunterCampaigns,
}: HunterEarnSectionProps) {
  const { t } = useI18n();
  const { isEnabled } = useCrossPageSettings();
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);
  const [lastViewedHunter, setLastViewedHunter] = useLocalStorage<string>(
    '@xhunt/hunterEarnLastViewedHunter',
    '',
  );
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  const showHunterSetting = isEnabled('showHunterCampaign');

  // 贡献榜：直接看后端返回列表是否为空
  const sortedHunterCampaigns = React.useMemo(
    () =>
      [...(activeHunterCampaigns || [])].sort(
        (a, b) => (b.sortWeight ?? 0) - (a.sortWeight ?? 0),
      ),
    [activeHunterCampaigns],
  );
  const hasHunterData = sortedHunterCampaigns.length > 0;
  const showHunter = showHunterSetting && hasHunterData;

  const firstHunterId = sortedHunterCampaigns[0]?.id ?? null;
  const hasHunterDot =
    showHunter &&
    Boolean(firstHunterId) &&
    firstHunterId !== (lastViewedHunter || '');

  const handleHunterTabClick = React.useCallback(() => {
    if (firstHunterId) setLastViewedHunter(firstHunterId);
  }, [firstHunterId, setLastViewedHunter]);

  if (!showHunter) {
    return <></>;
  }

  return (
    <div
      className='relative border-b border-black/[0.06] dark:border-white/[0.08]'
      data-theme={theme}
    >
      <div className='px-3 pt-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className='relative inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all px-3 py-1.5 text-xs theme-bg-secondary/60 theme-text-secondary border theme-border shadow-none'
            onClick={handleHunterTabClick}
            aria-label={t('xhuntEarnTitle')}
          >
            <span>{t('xhuntEarnTitle1')}</span>
            {hasHunterDot && (
              <span className='absolute -top-0 right-0 h-2 w-2 rounded-full bg-red-500 border border-white shadow-sm' />
            )}
          </button>
        </div>
        <div className='flex items-center gap-1.5'>
          <CampaignProviderBadge variant='topbar' />
          <button
            type='button'
            aria-label='Close Hunter Campaign'
            title='Close'
            className='p-0.5 rounded-md theme-hover theme-text-secondary hover:theme-text-primary transition-colors'
            onClick={() => setShowCloseConfirm(true)}
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      </div>

      <div className='pb-3'>
        {sortedHunterCampaigns.map((campaignConfig) => (
          <div
            data-sort-weight={campaignConfig.sortWeight ?? 0}
            key={campaignConfig.id}
            className='px-3 pt-2.5'
          >
            <HunterCampaignBanner
              campaignConfig={campaignConfig}
            />
          </div>
        ))}
      </div>

      <CloseConfirmDialog
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={async () => {
          setShowCloseConfirm(false);
          try {
            await localStorageInstance.set(
              '@settings/showHunterCampaign',
              false,
            );
          } catch {}
        }}
        prefixKey='confirmCloseTrendingPrefix'
        suffixKey='confirmCloseTrendingSuffix'
      />
    </div>
  );
}
