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
import usePlacementTrackingDomUserInfo from '~contents/hooks/usePlacementTrackingDomUserInfo';

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
  const currentUrl = useCurrentUrl();
  const { handler: userId, loading: isLoadingHtml } =
    usePlacementTrackingDomUserInfo();
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

  // 控制显示/隐藏的状态，用于平滑过渡
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // 当 shouldShow 变化时，平滑过渡
  useEffect(() => {
    if (shouldShow) {
      // 先渲染到 DOM，然后显示
      setShouldRender(true);
      // 使用 requestAnimationFrame 确保 DOM 更新后再显示
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      // 先隐藏，然后从 DOM 中移除
      setIsVisible(false);
      // 等待过渡动画完成后再移除
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // 与 CSS transition 时长一致
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  // 如果不需要渲染，直接返回 null
  if (!shouldRender) return null;

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
      {!userId ? (
        <TwitterHomeRightSidebar />
      ) : (
        <TwitterPersonalRightSidebar
          userId={userId}
          newTwitterData={newTwitterData}
          loadingTwInfo={loadingTwInfo}
        />
      )}
    </div>,
    shadowRoot!
  );
}

export const SearchBottomPanel = React.memo(_SearchBottomPanel);
