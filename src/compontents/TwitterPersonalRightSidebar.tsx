import React, { useMemo, useState, useEffect } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { PersonalAnalysisPanel } from './PersonalAnalysisPanel';
import RealTimeSubscription, {
  RealTimeSubscriptionRef,
} from './RealTimeSubscription';
import {
  notificationEventManager,
  NotificationClickEvent,
} from '~utils/notificationEvents';
import { TopTabNavigator } from './TopTabNavigator';
import { useCrossPageSettings } from '~utils/settingsManager';

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
  const { t } = useI18n();
  const { isEnabled } = useCrossPageSettings();
  const [activeTopTab, setActiveTopTab] = useState<'analysis' | 'subs'>(
    'analysis'
  );

  // RealTimeSubscription 的 ref
  const realTimeSubscriptionRef = React.useRef<RealTimeSubscriptionRef>(null);

  // 红点状态：当用户在 analysis 页面时，如果有新消息，在 subs 标签显示红点
  const [
    realTimeSubscriptionHasNewMessage,
    setRealTimeSubscriptionHasNewMessage,
  ] = useState(false);

  // 动态生成顶部标签页选项
  const topTabs = React.useMemo(() => {
    const tabs = [];

    // 检查用户分析是否启用
    if (isEnabled('showSearchPanel')) {
      tabs.push({ id: 'analysis', label: 'userAnalysis' });
    }

    // 检查实时订阅是否启用
    if (isEnabled('showRealtimeSubscription')) {
      tabs.push({
        id: 'subs',
        label: 'realTimeSubscription',
        hasRedDot:
          realTimeSubscriptionHasNewMessage && activeTopTab === 'analysis',
      });
    }

    return tabs;
  }, [isEnabled, realTimeSubscriptionHasNewMessage, activeTopTab]);

  // 如果没有可用的标签页，自动调整activeTopTab
  React.useEffect(() => {
    if (topTabs.length === 0) {
      setActiveTopTab('analysis'); // 默认值，虽然不会显示
    } else if (!topTabs.find((tab) => tab.id === activeTopTab)) {
      // 如果当前激活的标签页不在可用列表中，切换到第一个可用的
      setActiveTopTab(topTabs[0].id as 'analysis' | 'subs');
    }
  }, [topTabs, activeTopTab]);

  // // 是否显示 Mantle Hunter 活动（独立控制，且仅在 Mantle_Official 主页显示）
  // const shouldShowMantleHunterBase =
  //   configManager.shouldShowMantleHunterProgram();
  // const canShowMantleHunter =
  //   shouldShowMantleHunterBase &&
  //   String(userId || '').toLowerCase() === 'mantle_official';

  // 监听实时通知变化，用于红点显示
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: any }) => {
      if (changes['xhunt:realtime_notification']) {
        const notification = changes['xhunt:realtime_notification'].newValue;
        if (notification && !notification.isFirstLoad) {
          // 如果当前在 analysis 页面，显示红点
          if (activeTopTab === 'analysis') {
            setRealTimeSubscriptionHasNewMessage(true);
          }
        }
      }
    };

    // 监听 chrome.storage 变化
    (chrome as any).storage?.onChanged?.addListener(handleStorageChange);

    return () => {
      (chrome as any).storage?.onChanged?.removeListener(handleStorageChange);
    };
  }, [activeTopTab]);

  // 当切换到 subs 标签时，清除红点
  useEffect(() => {
    if (activeTopTab === 'subs') {
      setRealTimeSubscriptionHasNewMessage(false);
    }
  }, [activeTopTab]);

  // 监听通知点击事件
  React.useEffect(() => {
    const handleNotificationClick = (event: NotificationClickEvent) => {
      console.log('[TwitterPersonalRightSidebar] Notification clicked:', event);

      // 切换到 RealTimeSubscription 标签页
      setActiveTopTab('subs');
      console.log('[TwitterPersonalRightSidebar] Switched to subs tab');

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
      className={`rounded-xl ${className}`}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Campaign Banner at the very top - 独立控制
      {canShowMantleHunter && (
        <div className='px-3 pt-3'>
          <MantleHunterBanner
            unregisteredMode='collapsed'
            showMantleHunterComponents={true}
          />
        </div>
      )} */}

      {/* 顶层标签页 - 只有在有多个标签页时才显示 */}
      {topTabs.length > 1 && (
        <TopTabNavigator
          tabs={topTabs}
          activeTab={activeTopTab}
          onTabChange={setActiveTopTab}
        />
      )}

      {/* 内容区域 */}
      <div className={topTabs.length > 1 ? 'pt-2' : ''}>
        {activeTopTab === 'analysis' ? (
          <PersonalAnalysisPanel
            userId={userId}
            newTwitterData={newTwitterData}
            loadingTwInfo={loadingTwInfo}
          />
        ) : (
          <RealTimeSubscription ref={realTimeSubscriptionRef} />
        )}
      </div>
    </div>
  );
}
