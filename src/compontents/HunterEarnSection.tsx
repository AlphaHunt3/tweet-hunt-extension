import React from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { CloseConfirmDialog } from './CloseConfirmDialog';
import { HunterCampaignBanner } from './HunterCampaign/HunterCampaignBanner';
import { EngageToEarn } from './EngageToEarn';
import { LoginRequired } from './LoginRequired';
import { X } from 'lucide-react';
import { localStorageInstance } from '~storage/index.ts';
import { useLocalStorage } from '~storage/useLocalStorage';

export interface HunterEarnSectionProps {
  activeHunterCampaigns: any[];
}

export function HunterEarnSection({
  activeHunterCampaigns,
}: HunterEarnSectionProps) {
  const { t } = useI18n();
  const { isEnabled } = useCrossPageSettings();
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);
  const [savedTab, setSavedTab] = useLocalStorage<'hunter' | 'engage'>(
    '@xhunt/hunterEarnSelectedTab',
    'hunter'
  );
  const [showEngageInEarn, setShowEngageInEarn] = React.useState(false);
  const portalRef = React.useRef<HTMLDivElement>(null);
  // const [isHovered, setIsHovered] = React.useState(false);

  const showHunter = isEnabled('showHunterCampaign');
  const showEngage = isEnabled('showEngageToEarn');
  const showingEngage = showEngage && (!showHunter || showEngageInEarn);
  const [e2eStatus, setE2EStatus] = React.useState<
    'all' | 'active' | 'complete' | 'review'
  >('all');

  // 初始化：根据保存的选择和可用性设置初始状态
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    // 如果已经初始化过，不再执行
    if (initializedRef.current) return;

    // 如果两个选项都不可用，不执行初始化
    if (!showHunter && !showEngage) return;

    // 如果保存的选择可用，则使用保存的选择
    if (savedTab === 'engage' && showEngage) {
      setShowEngageInEarn(true);
      initializedRef.current = true;
      return;
    }
    if (savedTab === 'hunter' && showHunter) {
      setShowEngageInEarn(false);
      initializedRef.current = true;
      return;
    }

    // 如果保存的选择不可用，则选择第一个可用的选项
    if (showHunter) {
      setShowEngageInEarn(false);
      setSavedTab('hunter');
    } else if (showEngage) {
      setShowEngageInEarn(true);
      setSavedTab('engage');
    }
    initializedRef.current = true;
  }, [showHunter, showEngage, savedTab, setSavedTab]);

  // 当 showingEngage 变化时，更新本地存储
  React.useEffect(() => {
    if (showingEngage && showEngage) {
      setSavedTab('engage');
    } else if (!showingEngage && showHunter) {
      setSavedTab('hunter');
    }
  }, [showingEngage, showEngage, showHunter, setSavedTab]);

  if (!showHunter && !showEngage) {
    return <></>;
  }

  return (
    <div
      className='relative'
      ref={portalRef}
      // onMouseEnter={() => setIsHovered(true)}
      // onMouseLeave={() => setIsHovered(false)}
    >
      <div className='px-4 pt-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {showHunter && (
            <button
              type='button'
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !showingEngage
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow'
                  : 'theme-bg-secondary theme-text-secondary hover:opacity-80'
              }`}
              onClick={() => setShowEngageInEarn(false)}
              aria-label={t('xhuntEarnTitle')}
            >
              <span>{t('xhuntEarnTitle1')}</span>
            </button>
          )}
          {showEngage && (
            <button
              type='button'
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showingEngage
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow'
                  : 'theme-bg-secondary theme-text-secondary hover:opacity-80'
              }`}
              onClick={() => setShowEngageInEarn(true)}
              aria-label={t('engageToEarn')}
            >
              <span>{t('engageToEarn1')}</span>
            </button>
          )}
        </div>
        <div className='flex items-center gap-1'>
          {(showHunter || showEngage) && (
            <button
              type='button'
              aria-label={
                showingEngage ? 'Close Engage To Earn' : 'Close Hunter Campaign'
              }
              title='Close'
              className='p-1.5 rounded-md theme-hover theme-text-primary'
              onClick={() => setShowCloseConfirm(true)}
            >
              <X className='w-4 h-4' />
            </button>
          )}
        </div>
      </div>
      {showingEngage ? (
        <div className='px-4 pt-3'>
          <LoginRequired showInCenter={true}>
            <EngageToEarn
              className=''
              embedded={true}
              externalStatus={e2eStatus}
              onStatusChange={(next) => setE2EStatus(next)}
              portalContainer={portalRef.current}
            />
          </LoginRequired>
        </div>
      ) : (
        <>
          {activeHunterCampaigns.length === 0 ? (
            <div className='px-4 pt-3 text-xs text-center theme-text-secondary'>
              {t('noActivitiesPleaseFollow')}{' '}
              <a
                href='https://x.com/xhunt_ai'
                className='text-blue-500 hover:underline'
              >
                @xhunt_ai
              </a>{' '}
              {t('latestUpdates')}
            </div>
          ) : (
            activeHunterCampaigns.map((campaignConfig) => (
              <div key={campaignConfig.id} className='px-4 pt-3'>
                <HunterCampaignBanner
                  campaignConfig={campaignConfig}
                  defaultExpanded={false}
                />
              </div>
            ))
          )}
        </>
      )}
      {(showHunter || showingEngage) && (
        <CloseConfirmDialog
          isOpen={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={async () => {
            setShowCloseConfirm(false);
            try {
              if (showingEngage) {
                await localStorageInstance.set(
                  '@settings/showEngageToEarn',
                  false
                );
              } else if (showHunter) {
                await localStorageInstance.set(
                  '@settings/showHunterCampaign',
                  false
                );
              }
            } catch {}
          }}
          prefixKey='confirmCloseTrendingPrefix'
          suffixKey='confirmCloseTrendingSuffix'
        />
      )}
    </div>
  );
}
