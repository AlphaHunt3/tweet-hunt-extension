import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDebounce } from 'ahooks';

import { DraggablePanel } from '~/compontents/DraggablePanel.tsx';
import { UserAuthPanel } from '~/compontents/UserAuthPanel.tsx';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { PanelNavigator } from '~/compontents/navigation/PanelNavigator';
import { HomePage } from '~/compontents/pages/HomePage';
import { MessagesPage } from '~/compontents/pages/MessagesPage';
import SettingsPage from '~/compontents/pages/SettingsPage';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { PanelContextProvider } from '~/compontents/navigation/PanelContext';
import { MainData } from '~contents/hooks/useMainData.ts';
import iconUrl from 'url:~/assets/icon-min.png';
import avatarCssText from 'data-text:~/css/avatar-rank.css';
import cssText from 'data-text:~/css/style.css';
import { useGlobalMutationObserver } from '~contents/hooks/useGlobalMutationObserver';

const SHADOW_HOST_ID = 'xhunt-fixed-panel-shadow-host';
const PORTAL_HOST_ID = 'xhunt-fixed-panel-portal-host';

const getOrCreatePanelPortalHost = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;

  let shadowHost = document.getElementById(
    SHADOW_HOST_ID,
  ) as HTMLElement | null;
  if (!shadowHost) {
    shadowHost = document.createElement('div');
    shadowHost.id = SHADOW_HOST_ID;
    shadowHost.style.cssText =
      'position:fixed;inset:0;width:0;height:0;z-index:2147483000;pointer-events:none;overflow:visible;';
    shadowHost.setAttribute('translate', 'no');
    shadowHost.classList.add('notranslate');
    if (document.body?.parentNode) {
      // 与项目内其他稳定 Portal 保持一致：放在 body 前，避免 X 清理 html 末尾的额外节点。
      document.body.parentNode.insertBefore(shadowHost, document.body);
    } else {
      document.documentElement.appendChild(shadowHost);
    }

    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `${cssText}\n${avatarCssText}`;
    shadowRoot.appendChild(style);

    const portalHost = document.createElement('div');
    portalHost.id = PORTAL_HOST_ID;
    portalHost.style.cssText =
      'position:fixed;inset:0;pointer-events:none;overflow:visible;';
    portalHost.setAttribute('translate', 'no');
    portalHost.classList.add('notranslate');
    shadowRoot.appendChild(portalHost);
    return portalHost;
  }

  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) return null;
  let portalHost = shadowRoot.getElementById(
    PORTAL_HOST_ID,
  ) as HTMLElement | null;
  if (!portalHost) {
    portalHost = document.createElement('div');
    portalHost.id = PORTAL_HOST_ID;
    portalHost.style.cssText =
      'position:fixed;inset:0;pointer-events:none;overflow:visible;';
    shadowRoot.appendChild(portalHost);
  }
  return portalHost;
};

type FixedTwitterPanelProps = Pick<
  MainData,
  | 'twInfo'
  | 'deletedTweets'
  | 'loadingTwInfo'
  | 'loadingDel'
  | 'userId'
  | 'rootData'
  | 'loadingRootData'
  | 'reviewInfo'
  | 'userInfo'
  | 'projectMemberData'
  | 'loadingProjectMember'
>;

function _FixedTwitterPanel({
  twInfo,
  deletedTweets,
  loadingTwInfo,
  loadingDel,
  userId,
  rootData,
  loadingRootData,
  reviewInfo,
  userInfo,
  projectMemberData,
  loadingProjectMember,
}: FixedTwitterPanelProps) {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(() =>
    getOrCreatePanelPortalHost(),
  );
  const currentUrl = useCurrentUrl();
  const [storedTheme, , { isLoading: isThemeLoading }] = useLocalStorage(
    '@xhunt/theme',
    'dark',
  );
  const xTheme = document.documentElement.getAttribute('data-theme');
  const theme =
    xTheme === 'light' || xTheme === 'dark' ? xTheme : storedTheme;
  const [showPanel, setShowPanel, { isLoading: isShowPanelLoading }] =
    useLocalStorage('@settings/showPanel', true);
  const [panelWidth, , { isLoading: isPanelWidthLoading }] =
    useLocalStorage<number>('@xhunt/panelWidth', 340);
  const safeWidth = Math.min(
    400,
    Math.max(300, Number(isPanelWidthLoading ? 340 : panelWidth) || 340),
  );
  const [
    isMinimized,
    setIsMinimized,
    { isLoading: isPanelMinimizedLoading },
  ] = useLocalStorage<boolean>('@xhunt/panelMinimized', false);
  const [floatingPanelMode, , { isLoading: isFloatingPanelModeLoading }] =
    useLocalStorage<'default' | 'persistent'>(
      '@xhunt/floatingPanelMode',
      'default',
    );

  // 使用 useDebounce 延迟显示，但需要特殊处理：只对 true 值延迟，false 值立即生效
  const debouncedMinimized = useDebounce(isMinimized, { wait: 200 });
  // 当 isMinimized 为 false 时立即隐藏，为 true 时使用延迟后的值
  const showIcon = isMinimized ? debouncedMinimized : false;

  // 当 isMinimized 变化时，触发重置事件以触发边界检查
  useEffect(() => {
    // X 的 SPA 更新可能替换 body；面板使用 documentElement 下的独立单例宿主，
    // 确保关闭再打开、切换页面时都复用同一个 Shadow Root，不发生闪现或重复挂载。
    setPortalHost(getOrCreatePanelPortalHost());
  }, [currentUrl]);

  // X 冷启动会重建 html 的直接子节点并移除早期宿主；只监听这一层的移除事件。
  // 恢复动作新增宿主时 portalHost 已重新 connected，因此不会形成 observer 反馈循环。
  useGlobalMutationObserver(
    () => {
      if (portalHost?.isConnected) return;
      setPortalHost(getOrCreatePanelPortalHost());
    },
    { childList: true, subtree: false },
    {
      filter: (mutation) =>
        mutation.target === document.documentElement &&
        !portalHost?.isConnected,
    },
    [portalHost],
  );

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

  // Handle panel close
  const handleClosePanel = () => {
    setShowPanel(false);
  };

  const handleMinimizePanel = () => {
    setIsMinimized(true);
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

  const isPanelPreferenceLoading =
    isThemeLoading ||
    isShowPanelLoading ||
    isPanelWidthLoading ||
    isPanelMinimizedLoading ||
    isFloatingPanelModeLoading;

  if (isPanelPreferenceLoading || !showPanel || isOAuthPage || !portalHost) {
    return null;
  }

  return createPortal(
    <div
      data-theme={theme}
      data-xhunt-avatar-rank-mode={
        document.documentElement.getAttribute('data-xhunt-avatar-rank-mode') ||
        undefined
      }
      style={{ display: 'contents' }}
    >
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
          data-xhunt-testid='fixed-twitter-panel'
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
              opacity: isMinimized ? 0 : 1,
              pointerEvents: isMinimized ? 'none' : 'auto',
              transition: 'opacity 0.3s ease-in-out',
              width: `${Math.min(
                500,
                Math.max(300, Number(panelWidth) || 340),
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
              <PanelContextProvider onMinimize={handleMinimizePanel}>
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
    </div>,
    portalHost,
  );
}

export const FixedTwitterPanel = React.memo(_FixedTwitterPanel);
