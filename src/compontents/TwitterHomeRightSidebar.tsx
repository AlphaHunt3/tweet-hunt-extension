import React from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { HotProjectsKOLs } from './HotProjectsKOLs';
import {
  RealTimeSubscription,
  RealTimeSubscriptionRef,
} from './RealTimeSubscription';
import { useI18n } from '~contents/hooks/i18n.ts';
import {
  notificationEventManager,
  NotificationClickEvent,
} from '~utils/notificationEvents';
import { TopTabNavigator } from './TopTabNavigator';
import { useCrossPageSettings } from '~utils/settingsManager';
import { getActiveHunterCampaignsAsync } from './HunterCampaign/campaignConfigs';
import { ProRequired } from './ProRequired';
import { LoginRequired } from './LoginRequired';
import { HunterEarnSection } from './HunterEarnSection';
import ErrorBoundary from './ErrorBoundary';
import AnnualReportSection from './AnnualReportSection';

export interface TwitterHomeRightSidebarProps {
  className?: string;
}

export function TwitterHomeRightSidebar({
  className = '',
}: TwitterHomeRightSidebarProps) {
  // const { t } = useI18n();
  const [activeTopTab, setActiveTopTab] = React.useState<
    'hot' | 'subs' | 'e2e'
  >('hot');
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { isEnabled } = useCrossPageSettings();
  const [currentUsername] = useLocalStorage('@xhunt/current-username', '');

  // 获取所有应该显示的活动配置列表（统一管理） - 需在 topTabs 之前定义
  const [activeHunterCampaigns, setActiveHunterCampaigns] = React.useState(
    [] as ReturnType<typeof Array.prototype.slice>
  );
  React.useEffect(() => {
    let mounted = true;
    getActiveHunterCampaignsAsync()
      .then((list) => {
        if (mounted) setActiveHunterCampaigns(list);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // RealTimeSubscription 小红点状态管理
  const [
    realTimeSubscriptionHasNewMessage,
    setRealTimeSubscriptionHasNewMessage,
  ] = React.useState(false);

  // RealTimeSubscription 的 ref
  const realTimeSubscriptionRef = React.useRef<RealTimeSubscriptionRef>(null);

  // 动态生成顶部标签页选项
  const topTabs = React.useMemo(() => {
    const tabs = [];

    // 检查热门趋势是否启用
    if (isEnabled('showHotTrending')) {
      tabs.push({
        id: 'hot',
        label: 'trendingNow',
        hasRedDot: false, // HotProjectsKOLs 不需要小红点
      });
    }

    // 检查实时订阅是否启用，且当前用户名已就绪
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

  // 如果没有可用的标签页，自动调整activeTopTab
  React.useEffect(() => {
    if (topTabs.length === 0) {
      setActiveTopTab('hot'); // 默认值，虽然不会显示
    } else if (!topTabs.find((tab) => tab.id === activeTopTab)) {
      // 如果当前激活的标签页不在可用列表中，切换到第一个可用的
      setActiveTopTab(topTabs[0].id as 'hot' | 'subs' | 'e2e');
    }
  }, [topTabs, activeTopTab]);

  // 监听实时通知变化，设置小红点
  React.useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: any }) => {
      // 监听实时通知变化
      if (changes['xhunt:realtime_notification']?.newValue) {
        const message = changes['xhunt:realtime_notification'].newValue;

        if (message.type === 'REALTIME_FEED_UPDATE') {
          const { dataType, isFirstLoad } = message;

          // 跳过第一次加载的通知
          if (isFirstLoad) {
            return;
          }

          // 如果当前在 HotProjectsKOLs 页面，显示 RealTimeSubscription 小红点
          if (activeTopTab === 'hot') {
            setRealTimeSubscriptionHasNewMessage(true);
          }
        }
      }
    };
    // 使用加密存储监听
    const handler = async () => {
      try {
        const msg = await (
          await import('~storage/index.ts')
        ).localStorageInstance.get('xhunt:realtime_notification');
        if (!msg) return;
        handleStorageChange({
          'xhunt:realtime_notification': { newValue: msg },
        } as any);
      } catch {}
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

  // 监听 activeTopTab 切换，清除小红点
  React.useEffect(() => {
    if (activeTopTab === 'subs') {
      setRealTimeSubscriptionHasNewMessage(false);
    }
  }, [activeTopTab]);

  // 监听通知点击事件
  React.useEffect(() => {
    const handleNotificationClick = (event: NotificationClickEvent) => {
      console.log('[TwitterHomeRightSidebar] Notification clicked:', event);

      // 切换到 RealTimeSubscription 标签页
      setActiveTopTab('subs');
      console.log('[TwitterHomeRightSidebar] Switched to subs tab');

      // 延迟调用 RealTimeSubscription 的方法
      setTimeout(() => {
        if (realTimeSubscriptionRef.current) {
          realTimeSubscriptionRef.current.switchToTabAndHighlight(
            event.dataType
          );
        }
      }, 100); // 给组件渲染一点时间
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
      {/* Annual Report section at the very top */}
      {isEnabled('showAnnualReport') && (
        <ErrorBoundary name='AnnualReportSection'>
          <AnnualReportSection />
        </ErrorBoundary>
      )}

      {/* Campaign Banner at the very top - 独立控制 */}
      <ErrorBoundary name='HunterEarnSection'>
        <HunterEarnSection activeHunterCampaigns={activeHunterCampaigns} />
      </ErrorBoundary>

      {/* 顶层 Tab 导航 - 只有在有多个标签页时才显示 */}
      {topTabs.length > 1 && (
        <TopTabNavigator
          tabs={topTabs}
          activeTab={activeTopTab}
          onTabChange={setActiveTopTab}
        />
      )}

      {/* 顶层 Tab 内容区域 */}
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
              <HotProjectsKOLs />
            </ErrorBoundary>
          )}
          {/* activeTopTab === 'e2e' ? (
            <LoginRequired showInCenter={true}>
              <EngageToEarn />
            </LoginRequired>
          )  */}
        </div>
      )}
    </div>
  );
}
