import { DraggablePanel } from '~/compontents/DraggablePanel.tsx';
import { MainData } from '~contents/hooks/useMainData.ts';
import { UserAuthPanel } from '~/compontents/UserAuthPanel.tsx';
import React, { useEffect, useRef, useState } from 'react';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { PanelNavigator } from '~/compontents/navigation/PanelNavigator';
import { HomePage } from '~/compontents/pages/HomePage';
import { MessagesPage } from '~/compontents/pages/MessagesPage';
import SettingsPage from '~/compontents/pages/SettingsPage';
import { navigationService } from '~/compontents/navigation/NavigationService';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { PanelContextProvider } from '~/compontents/navigation/PanelContext';
import { useDebounce } from 'ahooks';
import iconUrl from 'url:~/assets/icon.png';

function _FixedTwitterPanel({
  twInfo,
  deletedTweets,
  loadingTwInfo,
  loadingDel,
  error,
  userId,
  rootData,
  loadingRootData,
  reviewInfo,
  userInfo,
  projectMemberData,
  loadingProjectMember,
}: MainData) {
  const currentUrl = useCurrentUrl();
  const [showPanel, setShowPanel] = useLocalStorage(
    '@settings/showPanel',
    true
  );
  const searchInput = useWaitForElement(
    'input[data-testid="SearchBox_Search_Input"]',
    [showPanel, currentUrl]
  );
  const [panelWidth, , { isLoading: isPanelWidthLoading }] =
    useLocalStorage<number>('@xhunt/panelWidth', 340);
  const safeWidth = Math.min(
    400,
    Math.max(300, Number(isPanelWidthLoading ? 340 : panelWidth) || 340)
  );
  const [isFocused, setIsFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();
  const [isMinimized, setIsMinimized] = useLocalStorage<boolean>(
    '@xhunt/panelMinimized',
    false
  );
  const [floatingPanelMode, , { isLoading: isFloatingPanelModeLoading }] =
    useLocalStorage<'default' | 'persistent'>(
      '@xhunt/floatingPanelMode',
      'default'
    );

  // 使用 useDebounce 延迟显示，但需要特殊处理：只对 true 值延迟，false 值立即生效
  const debouncedMinimized = useDebounce(isMinimized, { wait: 200 });
  // 当 isMinimized 为 false 时立即隐藏，为 true 时使用延迟后的值
  const showIcon = isMinimized ? debouncedMinimized : false;

  // 当 isMinimized 变化时，触发重置事件以触发边界检查
  useEffect(() => {
    if (isFloatingPanelModeLoading || floatingPanelMode === 'default') return;
    const RESET_EVENT = 'xhunt:reset-panel-position';
    const event = new CustomEvent(RESET_EVENT, {
      detail: {
        storageKey: 'fixed-twitter-panel',
      },
    });
    requestIdleCallback(() => {
      window.dispatchEvent(event);
    });
  }, [isMinimized, isFloatingPanelModeLoading]);

  // 供外部触发打开面板
  useEffect(() => {
    const openPanel = () => {
      setShowPanel(true);
      requestAnimationFrame(() => {
        setIsMinimized(false);
      });
    };
    window.addEventListener('xhunt:open-panel', openPanel);
    return () => window.removeEventListener('xhunt:open-panel', openPanel);
  }, []);

  useEffect(() => {
    if (!searchInput) return;

    const handleFocus = () => {
      blurTimer.current && clearTimeout(blurTimer.current);
      setIsFocused(true);
    };

    const handleBlur = () => {
      blurTimer.current && clearTimeout(blurTimer.current);
      blurTimer.current = setTimeout(() => {
        setIsFocused(false);
      }, 500);
    };

    searchInput.addEventListener('focus', handleFocus);
    searchInput.addEventListener('blur', handleBlur);

    return () => {
      searchInput.removeEventListener('focus', handleFocus);
      searchInput.removeEventListener('blur', handleBlur);
    };
  }, [searchInput]);

  // Handle panel close
  const handleClosePanel = () => {
    setShowPanel(false);
  };

  // 直接使用组件实例定义路由
  const routes = {
    '/home': {
      path: '/home',
      component: (
        <HomePage
          twInfo={twInfo}
          deletedTweets={deletedTweets}
          loadingTwInfo={loadingTwInfo}
          loadingDel={loadingDel}
          userId={userId}
          rootData={rootData}
          loadingRootData={loadingRootData}
          reviewInfo={reviewInfo}
          projectMemberData={projectMemberData}
          loadingProjectMember={loadingProjectMember}
          onClose={handleClosePanel}
        />
      ),
      showBackButton: false,
    },
    '/messages': {
      path: '/messages',
      component: (
        <MessagesPage
          showBackButton={!!userId} // 只有在有userId时才显示返回按钮
          onClose={handleClosePanel}
        />
      ),
      showBackButton: !!userId, // 只有在有userId时才显示返回按钮
    },
    '/settings': {
      path: '/settings',
      component: <SettingsPage onClose={handleClosePanel} />,
      showBackButton: true,
    },
  };

  // Hide panel on Twitter OAuth authorization page
  const isOAuthPage = currentUrl.includes('x.com/i/oauth2/authorize');

  if (!showPanel || isOAuthPage) {
    return null;
  }

  if (error) {
    return <></>;
  }

  return (
    <DraggablePanel
      width={isMinimized ? 40 : safeWidth}
      dragHandleClassName={
        isMinimized ? 'tw-hunt-drag-handle-minimized' : 'tw-hunt-drag-handle'
      }
      storageKey='fixed-twitter-panel'
      disabled={isMinimized}
    >
      <div
        className='relative'
        data-key={showPanel}
        data-xhunt-exclude={'true'}
      >
        {/* 缩小状态：显示图标（延迟 100ms 显示，立即隐藏） */}
        {isMinimized && showIcon && (
          <div
            className='tw-hunt-drag-handle-minimized w-11 h-11 theme-bg-secondary rounded-2xl theme-text-primary overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.25)] cursor-pointer transition-all opacity-90 hover:opacity-100'
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--text-primary)',
            }}
            onClick={() => {
              setIsMinimized(false);
            }}
            title='XHunt'
          >
            <img
              src={iconUrl}
              alt='XHunt'
              className='w-full h-full object-contain pointer-events-none user-select-none'
            />
          </div>
        )}

        {/* 展开状态：显示完整内容，但保持 PanelNavigator 始终挂载以保留状态 */}
        <div
          className='relative'
          style={{
            opacity: isMinimized ? 0 : isFocused ? 0 : 1,
            pointerEvents: isMinimized ? 'none' : isFocused ? 'none' : 'auto',
            transition: 'opacity 0.3s ease-in-out',
            width: `${Math.min(
              500,
              Math.max(300, Number(panelWidth) || 340)
            )}px`,
            position: isMinimized ? 'absolute' : 'relative',
            visibility: isMinimized ? 'hidden' : 'visible',
            height: isMinimized ? 0 : 'auto',
            overflow: isMinimized ? 'hidden' : 'visible',
          }}
        >
          {/* Panel Content */}
          <div
            className={`absolute top-0 right-0 w-full theme-bg-secondary rounded-2xl theme-text-primary overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.25)]`}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              maxHeight: 'calc(90vh - 32px)',
            }}
          >
            {/* Navigation System with Panel Context - 始终保持挂载以保留状态 */}
            <PanelContextProvider onMinimize={() => setIsMinimized(true)}>
              <PanelNavigator
                routes={routes}
                initialRoute={userId ? '/home' : '/messages'}
              />
            </PanelContextProvider>

            <UserAuthPanel userInfo={userInfo} />
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
}

export const FixedTwitterPanel = React.memo(_FixedTwitterPanel);
