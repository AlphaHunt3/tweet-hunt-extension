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
  const [showPanel, setShowPanel] = useLocalStorage(
    '@settings/showPanel',
    true
  );
  const searchInput = useWaitForElement(
    'input[data-testid="SearchBox_Search_Input"]',
    [showPanel]
  );

  const [panelWidth, , { isLoading: isPanelWidthLoading }] =
    useLocalStorage<number>('@xhunt/panelWidth', 340);
  const safeWidth = Math.min(
    400,
    Math.max(300, Number(isPanelWidthLoading ? 340 : panelWidth) || 340)
  );
  const [isFocused, setIsFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();
  const currentUrl = useCurrentUrl();

  // 供外部触发打开面板
  useEffect(() => {
    const openPanel = () => setShowPanel(true);
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
      width={safeWidth}
      dragHandleClassName='tw-hunt-drag-handle'
      storageKey='fixed-twitter-panel'
    >
      <div
        className='relative'
        style={{
          opacity: isFocused ? 0 : 1,
          pointerEvents: isFocused ? 'none' : 'auto',
          transition: 'opacity 0.3s ease-in-out',
          width: `${Math.min(500, Math.max(300, Number(panelWidth) || 340))}px`,
        }}
        data-key={showPanel}
        data-xhunt-exclude={'true'}
      >
        {/* Panel Content */}
        <div
          className={`absolute top-0 right-0 w-full theme-bg-secondary rounded-2xl theme-text-primary overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.25)]`}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            maxHeight: 'calc(90vh - 32px)',
          }}
        >
          {/* Navigation System */}
          <PanelNavigator
            routes={routes}
            initialRoute={userId ? '/home' : '/messages'}
          />

          <UserAuthPanel userInfo={userInfo} />
        </div>
      </div>
    </DraggablePanel>
  );
}

export const FixedTwitterPanel = React.memo(_FixedTwitterPanel);
