// src/compontents/RealtimeSettings.tsx

import React from 'react';
import { localStorageInstance } from '~storage/index.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useRealtimeSettings } from '~contents/hooks/useRealtimeSettings.ts';
import { useLeader } from '~contents/contexts/LeaderContext.tsx';
import { Settings, Wifi } from 'lucide-react';
import { navigationService } from '~/compontents/navigation/NavigationService';
import { PLAY_CONFIGURED_SOUND_EVENT } from '~/compontents/area/SoundPlayer';

export interface RealtimeSettingsProps {
  activeSubTab: 'bnb' | 'gossip' | 'listing';
  className?: string;
}

export const RealtimeSettings: React.FC<RealtimeSettingsProps> = ({
  activeSubTab,
  className = '',
}) => {
  const { t } = useI18n();
  const { settings, isLoading, updateSettings } = useRealtimeSettings();
  const { isLeader } = useLeader();
  const [rtStatus, setRtStatus] = React.useState<{
    isUsingSSE: boolean;
    isPolling: boolean;
    mode: string;
  } | null>(null);

  // const reconnectRealtime = React.useCallback(() => {
  //   try {
  //     (chrome as any).runtime?.sendMessage(
  //       { type: 'RECONNECT_REALTIME' },
  //       () => {
  //         try {
  //           (chrome as any).runtime?.sendMessage(
  //             { type: 'GET_REALTIME_STATUS' },
  //             (resp: any) => {
  //               if (resp && resp.success && resp.data) {
  //                 setRtStatus(resp.data);
  //               }
  //             }
  //           );
  //         } catch {}
  //       }
  //     );
  //   } catch {}
  // }, []);

  React.useEffect(() => {
    let mounted = true;
    const fetchStatus = () => {
      try {
        (chrome as any).runtime?.sendMessage(
          { type: 'GET_REALTIME_STATUS' },
          (resp: any) => {
            if (!mounted) return;
            if (resp && resp.success && resp.data) {
              setRtStatus(resp.data);
              // if (resp.data.mode === 'Inactive') {
              //   reconnectRealtime();
              // }
            }
          }
        );
      } catch {}
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  // 模拟播放声音
  const simulateSound = () => {
    try {
      window.dispatchEvent(new CustomEvent(PLAY_CONFIGURED_SOUND_EVENT));
    } catch (error) {
      console.log('Failed to play sound:', error);
    }
  };

  // 模拟显示通知
  const simulateNotification = async () => {
    try {
      const mockNotification = {
        type: 'REALTIME_FEED_UPDATE',
        dataType: activeSubTab,
        summary:
          activeSubTab === 'bnb'
            ? t('testBnbNotification')
            : activeSubTab === 'gossip'
            ? t('testGossipNotification')
            : t('testListingNotification'),
        isFirstLoad: false,
        timestamp: Date.now(),
      };

      await localStorageInstance.set(
        'xhunt:realtime_notification',
        mockNotification
      );
    } catch (error) {
      console.log('Failed to trigger notification:', error);
    }
  };

  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-4 text-xs theme-text-secondary mb-3 ${className}`}
      >
        <div className='w-4 h-4 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin' />
        <span>loading...</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between text-xs theme-text-secondary mb-2 mt-3 min-w-0 ${className}`}
    >
      <div className='flex items-center gap-2 min-w-0 flex-1 overflow-hidden'>
        <label className='flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0'>
          <input
            type='checkbox'
            checked={settings[activeSubTab].showNotification}
            onChange={async (e) => {
              const isChecked = e.target.checked;
              await updateSettings(activeSubTab, 'showNotification', isChecked);

              // 如果勾选了通知，模拟显示通知
              // 延迟一点时间确保 settings state 已经更新
              if (isChecked) {
                // 使用 setTimeout 确保 React state 更新完成后再触发通知
                setTimeout(async () => {
                  await simulateNotification();
                }, 50);
              }
            }}
            className='w-3 h-3 rounded border theme-border'
          />
          <span className='truncate'>{t('showNotification')}</span>
        </label>
        <label className='flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0'>
          <input
            type='checkbox'
            checked={settings[activeSubTab].playSound}
            onChange={(e) => {
              const isChecked = e.target.checked;
              updateSettings(activeSubTab, 'playSound', isChecked);

              // 如果勾选了声音，模拟播放声音
              if (isChecked) {
                simulateSound();
              }
            }}
            className='w-3 h-3 rounded border theme-border'
          />
          <span className='truncate'>{t('playSound')}</span>
        </label>

        {/* 设置音频按钮 */}
        <button
          onClick={() => {
            try {
              // 直接触发打开设置面板的事件
              const event = new CustomEvent('xhunt:open-panel');
              window.dispatchEvent(event);

              // 导航到设置页面
              const navigate = () => {
                navigationService.navigateTo('main-panel', '/settings');
              };

              // 延迟一点时间确保面板已经打开
              setTimeout(navigate, 100);
            } catch (error) {
              console.error('Error opening settings:', error);
            }
          }}
          className='flex items-center gap-1 text-xs theme-text-secondary hover:theme-text-primary transition-colors whitespace-nowrap shrink-0'
          title={t('soundEffect')}
        >
          <Settings className='w-3 h-3' />
          <span className='truncate'>{t('soundEffect')}</span>
        </button>
      </div>

      {/* 实时播放状态指示器 - 靠在最右边 */}
      {settings[activeSubTab].playSound && (
        <div
          className='flex items-center justify-center w-4 h-4 shrink-0 ml-2'
          title='实时播放中'
        >
          {/* <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 24 24'>
            <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z' />
          </svg> */}
          <svg
            viewBox='0 0 1024 1024'
            version='1.1'
            xmlns='http://www.w3.org/2000/svg'
            p-id='6642'
            // width='64'
            // height='64'
            className='w-3 h-3'
          >
            <path
              d='M541.2 132.3c-7.2-3.3-15.2-5-23.3-5-13.9 0-26.8 5.1-36.5 14.4L280.6 312.4h-158c-11.5 0-23.9 3.9-33.6 10.4h-4l-8.7 9.2c-7.5 7.9-12.2 20.8-12.2 33.8v290.7c0 15 6.7 31.4 16.9 41.6 10.2 10.3 26.6 16.9 41.6 16.9h158.2l200.7 165.6c8.4 7.9 23.3 16 35.6 16 5.6 0 16.5 0 27.1-8 10-4.2 17.8-10.4 23.1-18.6 5.7-8.6 8.4-19.1 8.4-32V184c0-12.9-2.8-23.4-8.4-32-5.8-9-14.6-15.6-26.1-19.7z m-24.8 57.4v642.9L310.2 662.5l-8.2-6.8v0.1H123.3V371.7h179l214.1-182zM899.3 300c-20.9-32.7-46.5-61.1-75.9-84.2l-0.1-0.1c-1.3-1.1-2.2-1.8-2.9-2.4-4.5-2.8-9.6-4.3-15.1-4.3-10.3 0-21.6 5.3-31.1 14.5l-0.1 0.1c-8.4 13.5-3.9 35.9 9 45.2l0.1 0.1c6.1 2.5 14.7 9.7 20.8 15.4 9.4 8.7 23.6 23.7 38.1 45.6 24.3 36.8 53.3 99.7 53.3 190.8 0 91-27.4 153.9-50.3 190.6-13.7 22-27.2 36.9-36.1 45.6-8.6 8.3-15.3 13.5-20.1 15.5l-0.1 0.1c-13.9 9.8-17.2 28.6-8.1 46.7 3.8 7.7 17.2 12.9 27.3 12.9 3.8 0 13.9 0 17.4-3.5 0.7-0.7 1.5-1.4 3.3-2.8 28.1-22.9 52.6-51 72.7-83.8 38.8-63.2 58.5-137.6 58.5-221.4 0-83.4-20.4-157.6-60.6-220.6z'
              fill={isLeader ? '#1159cf' : '#8a8a8a'}
              p-id='6643'
            ></path>
            <path
              d='M752.7 376.7c-23.8-27.4-48.4-40.2-53.7-42.1h-1.6l-1.9-1.3c-3.2-2.2-7.4-3.3-12-3.3-11.9 0-24.9 7.6-27.8 16.4l-0.3 1-0.6 0.9c-3.8 5.8-4.3 14.2-1.4 22.7 2.9 8.4 8.6 15.1 14.6 17.1l0.6 0.2 0.6 0.3c0.7 0.4 17.2 9.5 33.6 29.7 15.1 18.5 33.1 50.3 33.1 96.7 0 96.6-54.4 128.5-60.7 131.9-13.8 9.4-23 27.9-14.6 40.4l0.3 0.4 0.2 0.5c4.3 8.7 18.9 18.6 27.3 18.6 5.5 0 8.4-0.1 11.7-3.8l2.2-2.2H704.7c6.2-2.3 28.7-15.6 50.6-44.2 20.6-26.9 45.1-74.4 45.1-147.4 0-64.2-25.9-107.5-47.7-132.5z'
              fill={isLeader ? '#1159cf' : '#8a8a8a'}
              p-id='6644'
            ></path>
          </svg>
        </div>
      )}

      {/* 实时订阅状态：放在这一行的最右侧，使用在线图标表示 Active，慢速呼吸 */}
      {rtStatus && rtStatus.mode !== 'Inactive' ? (
        <span
          className='ml-2 inline-flex items-center opacity-75'
          title={rtStatus.mode}
        >
          <svg
            viewBox='0 0 1024 1024'
            version='1.1'
            xmlns='http://www.w3.org/2000/svg'
            p-id='3734'
            className='w-3 h-3'
          >
            <path
              d='M783.552 662.848l-60.352-60.416 60.352-60.288a213.312 213.312 0 1 0-301.696-301.696l-60.352 60.352-60.352-60.352 60.416-60.288a298.688 298.688 0 0 1 422.4 422.4l-60.416 60.288z m-120.704 120.704l-60.352 60.288a298.688 298.688 0 0 1-422.4-422.4l60.352-60.288 60.352 60.416-60.352 60.288a213.312 213.312 0 1 0 301.696 301.696l60.352-60.288 60.352 60.288zM632.64 330.88l60.416 60.416-301.696 301.632-60.416-60.352 301.696-301.632z'
              fill='#1159cf'
              p-id='3735'
            ></path>
          </svg>
        </span>
      ) : (
        <span
          className='ml-2 inline-flex items-center opacity-75'
          title={rtStatus?.mode}
        >
          <svg
            // t='1766053716442'
            className='w-2.5 h-2.5'
            viewBox='0 0 1024 1024'
            version='1.1'
            xmlns='http://www.w3.org/2000/svg'
            p-id='11314'
          >
            <path
              d='M816.952281 614.064456l-45.118858-45.118857L895.99028 447.98866a223.99433 223.99433 0 0 0-316.791981-316.791981l-124.156857 120.956938-45.118858-45.438849 122.556898-122.236906a287.99271 287.99271 0 0 1 407.029697 407.029697zM288.00567 1023.974081a287.99271 287.99271 0 0 1-203.514849-491.507559l122.556898-122.556898 45.118858 45.118858-122.556898 122.556898A223.99433 223.99433 0 0 0 448.00162 895.977321l122.556898-122.556898 45.118858 45.118858-122.556898 122.556898A285.752767 285.752767 0 0 1 288.00567 1023.974081zM137.257486 182.555379L182.50434 137.276525l255.897523 255.897523-45.246855 45.246854zM585.214147 630.544039l45.246854-45.246854 255.897523 255.897522-45.246855 45.246855z'
              fill='#8a8a8a'
              p-id='11315'
            ></path>
          </svg>
        </span>
      )}
    </div>
  );
};

export default RealtimeSettings;
