// src/compontents/StatusAndNotificationPanel.tsx

import React, { useEffect, useState } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useLeader } from '~contents/contexts/LeaderContext';
import { localStorageInstance } from '~storage/index';

// Chrome 类型声明
declare const chrome: any;

interface StatusAndNotificationPanelProps {
  activeSubTab: 'bnb' | 'gossip';
  lastUpdateTime: string;
  tweetsCount: number;
  followsCount: number;
  gossipCount: number;
  className?: string;
}

export const StatusAndNotificationPanel: React.FC<
  StatusAndNotificationPanelProps
> = ({
  activeSubTab,
  lastUpdateTime,
  tweetsCount,
  followsCount,
  gossipCount,
  className = '',
}) => {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { isLeader } = useLeader();
  const [currentUsername, setCurrentUsername] = useState<string>('');

  // 获取当前用户名
  useEffect(() => {
    const getUsername = async () => {
      try {
        const username = await localStorageInstance.get(
          '@xhunt/current-username'
        );
        setCurrentUsername(username || '');
      } catch (error) {
        console.log('Failed to get current username:', error);
        setCurrentUsername('');
      }
    };
    getUsername();
  }, []);

  // 只有当前用户是 luoyukun4 时才显示测试 UI
  if (currentUsername !== 'luoyukun4') {
    return null;
  }

  // 测试通知函数
  const testNotification = (dataType: 'bnb' | 'gossip', summary: string) => {
    const notificationData = {
      type: 'REALTIME_FEED_UPDATE',
      dataType,
      summary,
      isFirstLoad: false,
      timestamp: Date.now(),
    };
    chrome.storage.local.set({
      'xhunt:realtime_notification': notificationData,
    });
  };

  return (
    <div data-theme={theme} className={`space-y-3 ${className}`}>
      <div className='theme-bg-secondary theme-border rounded-lg p-3 border'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-xs theme-text-secondary'>Status:</span>
            <div className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
            <span className='text-xs font-medium text-green-600 dark:text-green-400'>
              Running
            </span>
            {isLeader && (
              <span className='px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium'>
                Leader
              </span>
            )}
          </div>
          <div className='text-xs theme-text-secondary'>
            {lastUpdateTime && `Last update: ${lastUpdateTime}`}
          </div>
        </div>
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-medium theme-text-primary'>
              Notification Test:
            </span>
          </div>

          <div className='space-y-2'>
            <div className='space-y-1'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                <button
                  onClick={() =>
                    testNotification(
                      'bnb',
                      'Solana network upgrade completed, transaction speed significantly improved!'
                    )
                  }
                  className='px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm hover:shadow-md'
                >
                  Test Solana
                </button>
                <button
                  onClick={() =>
                    testNotification(
                      'gossip',
                      'AI Summary: Famous KOL released important news about new project, causing community buzz'
                    )
                  }
                  className='px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm hover:shadow-md'
                >
                  Test Gossip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusAndNotificationPanel;
