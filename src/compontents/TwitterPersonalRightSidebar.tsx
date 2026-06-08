import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { PersonalAnalysisPanel } from './PersonalAnalysisPanel';
import { useCrossPageSettings } from '~utils/settingsManager';
import { HunterCampaignBanner } from './HunterCampaign/HunterCampaignBanner';
import { getActiveCampaignForUserAsync } from './HunterCampaign/campaignConfigs';
import { LoginRequired } from './LoginRequired';
import ErrorBoundary from './ErrorBoundary';

export interface TwitterPersonalRightSidebarProps {
  userId: string;
  newTwitterData: any;
  loadingTwInfo: boolean;
  className?: string;
}

export function TwitterPersonalRightSidebar({
  userId,
  newTwitterData,
  loadingTwInfo,
  className = '',
}: TwitterPersonalRightSidebarProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [currentUsername] = useLocalStorage('@xhunt/current-username', '');
  const { isEnabled } = useCrossPageSettings();

  // 根据 userId 获取应该显示的活动配置（逻辑封装在 campaignConfigs.ts 中）
  const [activeHunterCampaignConfig, setActiveHunterCampaignConfig] = useState(
    null as ReturnType<() => any>
  );

  useEffect(() => {
    let mounted = true;
    const uid = userId || '';
    if (!uid) {
      setActiveHunterCampaignConfig(null as any);
      return;
    }
    getActiveCampaignForUserAsync(uid)
      .then((cfg) => {
        if (mounted) setActiveHunterCampaignConfig(cfg as any);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [userId]);

  return (
    <div
      data-theme={theme}
      className={`rounded-xl ${className}`}
      key={`${currentUsername}-${theme}-personal-right-sidebar`}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Campaign Banner at the very top - 独立控制 */}
      {activeHunterCampaignConfig && isEnabled('showHunterCampaign') && (
        <div className='px-3 pt-3'>
          <HunterCampaignBanner
            unregisteredMode='collapsed'
            showMantleHunterComponents={
              activeHunterCampaignConfig.showExtraComponents
            }
            campaignConfig={activeHunterCampaignConfig}
            defaultExpanded={false}
          />
        </div>
      )}

      {/* 内容区域 */}
      {isEnabled('showSearchPanel') && (
        <div className='personal-sidebar-content'>
          <LoginRequired showInCenter={true}>
            <ErrorBoundary name='PersonalAnalysisPanel'>
              <PersonalAnalysisPanel
                userId={userId}
                newTwitterData={newTwitterData}
                loadingTwInfo={loadingTwInfo}
              />
            </ErrorBoundary>
          </LoginRequired>
        </div>
      )}
    </div>
  );
}
