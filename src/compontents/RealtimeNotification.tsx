// src/compontents/RealtimeNotification.tsx

import React, { useEffect, useRef, useState } from 'react';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useRealtimeSettings } from '~contents/hooks/useRealtimeSettings';
import { useLeader } from '~contents/contexts/LeaderContext';
import { useCrossPageSettings } from '~utils/settingsManager';
import { PLAY_CONFIGURED_SOUND_EVENT } from '~compontents/area/SoundPlayer';
import {
  notificationEventManager,
  NOTIFICATION_EVENTS,
} from '~utils/notificationEvents';

// Chrome 类型声明
declare const chrome: any;

interface NotificationData {
  type: string;
  dataType: 'bnb' | 'gossip' | 'listing';
  summary: string;
  isFirstLoad: boolean;
  timestamp: number;
}

interface RealtimeNotificationProps {
  getTargetElement?: () => Element | null; // 获取目标DOM元素的回调函数，默认为body
  onNotificationClick?: (
    dataType: 'bnb' | 'gossip' | 'listing',
    data: any
  ) => void;
  className?: string;
  offset?: {
    x?: number; // 水平偏移量，单位px
    y?: number; // 垂直偏移量，单位px
  };
}

export const RealtimeNotification: React.FC<RealtimeNotificationProps> = ({
  getTargetElement,
  onNotificationClick,
  className = '',
  offset = { x: 0, y: 0 },
}) => {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { t } = useI18n();
  const { settings, isLoading } = useRealtimeSettings();
  const { isLeader } = useLeader();
  const { isEnabled } = useCrossPageSettings();
  const currentUrl = useCurrentUrl();
  // 稳定保存 getTargetElement 的引用，避免父组件每次渲染导致回调身份变化
  const getTargetElementRef = useRef<typeof getTargetElement>(getTargetElement);
  useEffect(() => {
    getTargetElementRef.current = getTargetElement;
  }, [getTargetElement]);
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      dataType: 'bnb' | 'gossip' | 'listing';
      title: string;
      content: string;
      timestamp: number;
    }>
  >([]);

  // 监听 storage 变化
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: any }) => {
      if (changes['xhunt:realtime_notification']?.newValue) {
        const message: NotificationData =
          changes['xhunt:realtime_notification'].newValue;

        if (message.type === 'REALTIME_FEED_UPDATE') {
          const { dataType, summary, isFirstLoad } = message;

          // 跳过第一次加载的通知
          if (isFirstLoad) {
            return;
          }

          // 检查是否启用了对应的数据类型
          const isDataTypeEnabled =
            dataType === 'bnb'
              ? isEnabled('enableBnbFeeds')
              : dataType === 'gossip'
              ? isEnabled('enableGossip')
              : isEnabled('enableListing');
          if (!isDataTypeEnabled) {
            return; // 如果数据类型被禁用，直接返回
          }

          // 检查用户设置
          const userSettings = settings[dataType];

          // 播放声音：需要是 leader 且用户配置了声音
          if (isLeader && userSettings.playSound) {
            try {
              window.dispatchEvent(
                new CustomEvent(PLAY_CONFIGURED_SOUND_EVENT)
              );
            } catch (error) {
              // 忽略播放失败
            }
          }

          // 显示弹框：用户配置了弹框（所有页面都显示，不仅仅是 leader）
          if (userSettings.showNotification) {
            const notification = {
              id: `notification_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              dataType,
              title:
                dataType === 'bnb'
                  ? t('realtime.bnbFeedUpdate')
                  : dataType === 'gossip'
                  ? t('realtime.gossipUpdate')
                  : t('realtime.listingUpdate'),
              content:
                summary.length > 100
                  ? summary.substring(0, 100) + '...'
                  : summary,
              timestamp: Date.now(),
            };

            setNotifications((prev) => [...prev, notification]);

            // 8秒后自动移除
            setTimeout(() => {
              setNotifications((prev) =>
                prev.filter((n) => n.id !== notification.id)
              );
            }, 8000);
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [settings, isLeader]);

  // 处理通知点击
  const handleNotificationClick = (notification: any) => {
    console.log('[RealtimeNotification] Notification clicked:', notification);

    if (onNotificationClick) {
      onNotificationClick(notification.dataType, {});
    }

    // 发送事件通知，让其他组件响应
    const event = {
      type: NOTIFICATION_EVENTS.CLICKED,
      dataType: notification.dataType,
      data: {},
    };
    console.log('[RealtimeNotification] Dispatching event:', event);
    notificationEventManager.dispatchEvent(event);

    // 滚动到页面顶部
    try {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      // 如果 smooth scroll 不支持，使用 fallback
      try {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch (fallbackError) {
        console.log(
          '[RealtimeNotification] Failed to scroll to top:',
          fallbackError
        );
      }
    }

    // 点击后立即移除
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
  };

  // 位置状态：避免每次渲染都重新计算
  const [position, setPosition] = useState(() => ({
    position: 'fixed' as const,
    top: 20 + (offset.y || 0),
    right: 20 + (offset.x || 0),
  }));

  // 仅在需要时（初次、滚动、窗口尺寸变化、offset 变化、getTargetElement 变化）重新计算
  const computePosition = React.useCallback(() => {
    try {
      const element = getTargetElementRef.current
        ? getTargetElementRef.current()
        : null;
      if (!element) {
        setPosition({
          position: 'fixed',
          top: 20 + (offset.y || 0),
          right: 20 + (offset.x || 0),
        });
        return;
      }
      const rect = element.getBoundingClientRect();
      setPosition({
        position: 'fixed',
        top: rect.top + window.scrollY + 10 + (offset.y || 0),
        right: window.innerWidth - rect.right + 10 + (offset.x || 0),
      });
    } catch {}
  }, [offset?.x, offset?.y]);

  useEffect(() => {
    // URL 或 offset 变化时，重新计算一次
    computePosition();
  }, [computePosition, currentUrl, offset?.x, offset?.y]);

  return (
    <div
      data-theme={theme}
      className={`realtime-notification-container ${className} ${
        getTargetElement ? 'relative' : ''
      }`}
    >
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`${position.position} z-[9999] theme-bg-primary theme-border rounded-lg shadow-lg p-4 max-w-sm cursor-pointer transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-105 border`}
          style={{
            top: `${position.top + index * 100}px`,
            right: `${position.right}px`,
            animation: 'slideInRight 0.3s ease-out',
          }}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <div className='flex items-center gap-2 mb-2'>
                <div
                  className={`w-2 h-2 rounded-full animate-pulse bg-blue-500`}
                />
                <h4 className='text-sm font-semibold theme-text-primary'>
                  {notification.title}
                </h4>
                <span className='text-xs theme-text-secondary'>
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className='text-xs theme-text-secondary leading-relaxed'>
                {notification.content}
              </p>
            </div>
            <button
              className='ml-2 theme-text-secondary hover:theme-text-primary transition-colors p-1 rounded hover:theme-bg-secondary'
              onClick={(e) => {
                e.stopPropagation();
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notification.id)
                );
              }}
            >
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default RealtimeNotification;
