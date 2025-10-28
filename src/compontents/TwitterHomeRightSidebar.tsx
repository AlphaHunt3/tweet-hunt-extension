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

export interface TwitterHomeRightSidebarProps {
  className?: string;
}

export function TwitterHomeRightSidebar({
  className = '',
}: TwitterHomeRightSidebarProps) {
  const { t } = useI18n();
  const [activeTopTab, setActiveTopTab] = React.useState<'hot' | 'subs'>('hot');
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { isEnabled } = useCrossPageSettings();

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

    // 检查实时订阅是否启用
    if (isEnabled('showRealtimeSubscription')) {
      tabs.push({
        id: 'subs',
        label: 'realTimeSubscription',
        hasRedDot: realTimeSubscriptionHasNewMessage && activeTopTab === 'hot',
      });
    }

    return tabs;
  }, [isEnabled, realTimeSubscriptionHasNewMessage, activeTopTab]);

  // 如果没有可用的标签页，自动调整activeTopTab
  React.useEffect(() => {
    if (topTabs.length === 0) {
      setActiveTopTab('hot'); // 默认值，虽然不会显示
    } else if (!topTabs.find((tab) => tab.id === activeTopTab)) {
      // 如果当前激活的标签页不在可用列表中，切换到第一个可用的
      setActiveTopTab(topTabs[0].id as 'hot' | 'subs');
    }
  }, [topTabs, activeTopTab]);

  // // 检查是否应该显示 Mantle Hunter 活动
  // const shouldShowMantleHunter = configManager.shouldShowMantleHunterProgram();

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

    // 监听 storage 变化
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
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

  // // 如果两个条件都为 false，则不显示任何内容
  // if (!shouldShowMantleHunter && !showHotTrending) {
  //   return null;
  // }

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
      {/* Campaign Banner at the very top - 独立控制
      {shouldShowMantleHunter && (
        <div className='px-4 pt-3'>
          <MantleHunterBanner />
        </div>
      )} */}

      {/* 顶层 Tab 导航 - 只有在有多个标签页时才显示 */}
      {topTabs.length > 1 && (
        <TopTabNavigator
          tabs={topTabs}
          activeTab={activeTopTab}
          onTabChange={setActiveTopTab}
        />
      )}

      {/* 顶层 Tab 内容区域 */}
      <div className={topTabs.length > 1 ? 'pt-2' : ''}>
        {activeTopTab === 'subs' ? (
          <RealTimeSubscription ref={realTimeSubscriptionRef} />
        ) : (
          <HotProjectsKOLs />
        )}
      </div>
    </div>
  );
}
