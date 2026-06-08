import React from 'react';
import { useRequest } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';
import { Web3HotProjectsKOLs } from '../hotProjects/Web3HotProjectsKOLs';
import {
  RealTimeSubscription,
  RealTimeSubscriptionRef,
} from '../RealTimeSubscription';
import { useI18n } from '~contents/hooks/i18n.ts';
import {
  notificationEventManager,
  NotificationClickEvent,
} from '~utils/notificationEvents';
import { TopTabNavigator } from '../TopTabNavigator';
import { useCrossPageSettings } from '~utils/settingsManager';
import { getActiveHunterCampaignsAsync } from '../HunterCampaign/campaignConfigs';
import { ProRequired } from '../ProRequired';
import { LoginRequired } from '../LoginRequired';
import { HunterEarnSection } from '../HunterEarnSection';
import ErrorBoundary from '../ErrorBoundary';
import AdBannerSection from '../AdBannerSection';

export interface Web3HomeSidebarProps {
  className?: string;
}

export function Web3HomeSidebar({
  className = '',
}: Web3HomeSidebarProps) {
  const [activeTopTab, setActiveTopTab] = React.useState<
    'hot' | 'subs' | 'e2e'
  >('hot');
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { isEnabled } = useCrossPageSettings();
  const [currentUsername] = useLocalStorage('@xhunt/current-username', '');

  const { data: activeHunterCampaigns = [] } = useRequest(
    getActiveHunterCampaignsAsync,
    {
      pollingInterval: 200_000,
      pollingWhenHidden: false,
    }
  );

  const [
    realTimeSubscriptionHasNewMessage,
    setRealTimeSubscriptionHasNewMessage,
  ] = React.useState(false);

  const realTimeSubscriptionRef = React.useRef<RealTimeSubscriptionRef>(null);

  const topTabs = React.useMemo(() => {
    const tabs = [];
    if (isEnabled('showHotTrendingWeb3')) {
      tabs.push({
        id: 'hot',
        label: 'trendingNow',
        hasRedDot: false,
      });
    }
    if (isEnabled('showRealtimeSubscription') && currentUsername) {
      tabs.push({
        id: 'subs',
        label: 'realTimeSubscription',
        hasRedDot: realTimeSubscriptionHasNewMessage && activeTopTab === 'hot',
      });
    }
    return tabs;
  }, [
    isEnabled,
    realTimeSubscriptionHasNewMessage,
    activeTopTab,
    activeHunterCampaigns,
    currentUsername,
  ]);

  React.useEffect(() => {
    if (topTabs.length === 0) {
      setActiveTopTab('hot');
    } else if (!topTabs.find((tab) => tab.id === activeTopTab)) {
      setActiveTopTab(topTabs[0].id as 'hot' | 'subs' | 'e2e');
    }
  }, [topTabs, activeTopTab]);

  React.useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: any }) => {
      if (changes['xhunt:realtime_notification']?.newValue) {
        const message = changes['xhunt:realtime_notification'].newValue;
        if (message.type === 'REALTIME_FEED_UPDATE') {
          const { isFirstLoad } = message;
          if (isFirstLoad) return;
          if (activeTopTab === 'hot') {
            setRealTimeSubscriptionHasNewMessage(true);
          }
        }
      }
    };
    const handler = async () => {
      try {
        const msg = await (
          await import('~storage/index.ts')
        ).localStorageInstance.get('xhunt:realtime_notification');
        if (!msg) return;
        handleStorageChange({
          'xhunt:realtime_notification': { newValue: msg },
        } as any);
      } catch { }
    };
    (async () => {
      const { localStorageInstance } = await import('~storage/index.ts');
      localStorageInstance.watch({ 'xhunt:realtime_notification': handler });
    })();

    return () => {
      (async () => {
        const { localStorageInstance } = await import('~storage/index.ts');
        localStorageInstance.unwatch({
          'xhunt:realtime_notification': handler,
        });
      })();
    };
  }, [activeTopTab]);

  React.useEffect(() => {
    if (activeTopTab === 'subs') {
      setRealTimeSubscriptionHasNewMessage(false);
    }
  }, [activeTopTab]);

  React.useEffect(() => {
    const handleNotificationClick = (event: NotificationClickEvent) => {
      setActiveTopTab('subs');
      setTimeout(() => {
        if (realTimeSubscriptionRef.current) {
          realTimeSubscriptionRef.current.switchToTabAndHighlight(
            event.dataType
          );
        }
      }, 100);
    };

    notificationEventManager.addEventListener(handleNotificationClick);

    return () => {
      notificationEventManager.removeEventListener(handleNotificationClick);
    };
  }, []);

  return (
    <div
      data-theme={theme}
      className={`rounded-xl theme-border ${className}`}
      key={`${currentUsername}-${theme}-home-right-sidebar`}
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
      {isEnabled('showAdBanner') && (
        <ErrorBoundary name='AdBannerSection'>
          <AdBannerSection />
        </ErrorBoundary>
      )}

      <ErrorBoundary name='HunterEarnSection'>
        <HunterEarnSection activeHunterCampaigns={activeHunterCampaigns} key={currentUsername} />
      </ErrorBoundary>

      {topTabs.length > 1 && (
        <TopTabNavigator
          tabs={topTabs}
          activeTab={activeTopTab}
          onTabChange={setActiveTopTab}
        />
      )}

      {Boolean(topTabs.length) && (
        <div className={topTabs.length > 1 ? 'pt-2' : ''}>
          {activeTopTab === 'subs' ? (
            <LoginRequired showInCenter={true}>
              <ProRequired enableAnimation={false} showExtraTitle={true}>
                <ErrorBoundary name='RealTimeSubscription_1'>
                  <RealTimeSubscription ref={realTimeSubscriptionRef} />
                </ErrorBoundary>
              </ProRequired>
            </LoginRequired>
          ) : (
            <ErrorBoundary name='HotProjectsKOLs'>
              <Web3HotProjectsKOLs />
            </ErrorBoundary>
          )}
        </div>
      )}
    </div>
  );
}
