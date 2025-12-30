import React, { useCallback, useMemo, useState, useEffect } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import cssText from 'data-text:~/css/style.css';
import avatarCssText from 'data-text:~/css/avatar-rank.css';
import ReactDOM from 'react-dom';
import { MainData } from '~contents/hooks/useMainData.ts';
import { TwitterHomeRightSidebar } from '~/compontents/TwitterHomeRightSidebar';
import { TwitterPersonalRightSidebar } from '~/compontents/TwitterPersonalRightSidebar';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { useLocalStorage } from '~storage/useLocalStorage';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';

function _SearchBottomPanel({
  error,
  userId: _userId,
  newTwitterData,
  loadingTwInfo,
}: MainData) {
  const handleShadowCreated = useCallback(() => {
    const r1h3ijdo = document.querySelector(
      "div[data-testid='sidebarColumn'] div[class='css-175oi2r r-1h3ijdo']"
    );
    if (r1h3ijdo && r1h3ijdo instanceof HTMLElement) {
      r1h3ijdo.style.display = 'none';
    }
  }, []);

  const shadowOptions = useMemo(
    () => ({
      selector:
        "div[data-testid='sidebarColumn'] div[class='css-175oi2r r-1adg3ll']",
      styleText: cssText + avatarCssText,
      autoZIndex: false,
      useSiblings: true,
      siblingsPosition: 'beforebegin' as InsertPosition,
      siblingsStyle: 'width:auto;height:auto;max-width:100%;z-index:0',
      onShadowCreated: handleShadowCreated,
    }),
    [handleShadowCreated]
  );

  const shadowRoot = useShadowContainer(shadowOptions);
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const portalHost = usePersistentPortalHost(shadowRoot);
  const currentUrl = useCurrentUrl();
  const {
    urlUid,
    handler: userId,
    loading: isLoadingHtml,
  } = usePlacementTracking();
  // 如果是 https://x.com/i/premium 或其子路径，直接返回空
  const isPremiumRoute = useMemo(() => {
    try {
      const url = new URL(currentUrl);
      if (url.hostname !== 'x.com') return false;
      const path = url.pathname || '';
      return path === '/i/premium' || path.startsWith('/i/premium/');
    } catch {
      return false;
    }
  }, [currentUrl]);
  // 检测搜索框是否存在来决定marginTop
  const searchInput = useWaitForElement(
    "div[data-testid='sidebarColumn'] input[data-testid='SearchBox_Search_Input']",
    [userId, currentUrl, isLoadingHtml]
  );
  const dynamicMarginTop = useMemo(() => {
    return userId || searchInput ? 65 : 15;
  }, [userId, searchInput]);

  // 计算是否应该显示组件
  const shouldShow = useMemo(() => {
    return !isPremiumRoute && !isLoadingHtml && shadowRoot && !error;
  }, [isPremiumRoute, isLoadingHtml, shadowRoot, error]);

  // 控制显示/隐藏的状态，用于平滑过渡（不卸载，始终保留以缓存状态）
  const [isVisible, setIsVisible] = useState(false);

  // 当 shouldShow 变化时，仅控制可见性，不卸载
  useEffect(() => {
    if (shouldShow) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
    } else {
      setIsVisible(false);
    }
  }, [shouldShow]);

  return ReactDOM.createPortal(
    <div
      data-theme={theme}
      data-xhunt-exclude={'true'}
      className='search-bottom-panel-transition'
      style={{
        marginTop: dynamicMarginTop,
        opacity: isVisible ? 1 : 0,
        // transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
        transition:
          'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {!urlUid ? (
        <TwitterHomeRightSidebar />
      ) : (
        <TwitterPersonalRightSidebar
          userId={userId}
          newTwitterData={newTwitterData}
          loadingTwInfo={loadingTwInfo}
        />
      )}
    </div>,
    portalHost!
  );
}

export const SearchBottomPanel = React.memo(_SearchBottomPanel);
