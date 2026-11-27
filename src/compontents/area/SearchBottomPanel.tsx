import React, { useCallback, useMemo, useState, useEffect } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import cssText from 'data-text:~/css/style.css';
import avatarCssText from 'data-text:~/css/avatar-rank.css';
import ReactDOM from 'react-dom';
import { MainData } from '~contents/hooks/useMainData.ts';
import { HomeRightSidebar } from '~/compontents/homeRightSidebar/HomeRightSidebar';
import { TwitterPersonalRightSidebar } from '~/compontents/TwitterPersonalRightSidebar';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { useLocalStorage } from '~storage/useLocalStorage';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import { subscribeToMutation } from '~contents/hooks/useGlobalMutationObserver';
import { resolveRightRailBase } from '~contents/utils/xDomAdapter';

type SearchBottomPanelProps = Pick<
  MainData,
  'error' | 'newTwitterData' | 'loadingTwInfo'
>;

function _SearchBottomPanel({
  error,
  newTwitterData,
  loadingTwInfo,
}: SearchBottomPanelProps) {
  const handleShadowCreated = useCallback(() => {
    const r1h3ijdo = document.querySelector(
      "div[data-testid='sidebarColumn'] div[class='css-g5y9jx r-1h3ijdo']",
    );
    if (r1h3ijdo && r1h3ijdo instanceof HTMLElement) {
      r1h3ijdo.style.display = 'none';
    }
  }, []);

  const shadowOptions = useMemo(
    () => ({
      selector:
        "div[data-testid='sidebarColumn'] div[aria-label][tabindex] > div:first-child",
      resolveBaseElement: resolveRightRailBase,
      styleText: cssText + avatarCssText,
      autoZIndex: false,
      useSiblings: true,
      siblingsPosition: 'beforebegin' as InsertPosition,
      siblingsStyle: 'width:auto;height:auto;max-width:100%;z-index:0',
      onShadowCreated: handleShadowCreated,
    }),
    [],
  );

  const shadowRoot = useShadowContainer(shadowOptions);
  const isNewRightRail = Boolean(
    shadowRoot && (shadowRoot.host as HTMLElement).closest('aside'),
  );
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const portalHost = usePersistentPortalHost(shadowRoot);
  const currentUrl = useCurrentUrl();
  const {
    urlUid,
    handler: userId,
    loading: isLoadingHtml,
  } = usePlacementTracking();
  const displayUrlUid = urlUid || '';
  const displayUserId = userId || urlUid || '';
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
  const [avatarRankMode, , { isLoading: isAvatarRankModeLoading }] =
    useLocalStorage<'web3' | 'ai'>('@settings/avatarRankMode', 'web3');


  // 检测搜索框是否存在来决定marginTop
  const searchInput = useWaitForElement(
    "div[data-testid='sidebarColumn'] input[data-testid='SearchBox_Search_Input'], aside input[data-testid='SearchBox_Search_Input']",
    [userId, currentUrl, isLoadingHtml],
  );
  const r1h3ijdoDom = useWaitForElement(
    "div[data-testid='sidebarColumn'] div[class='css-175oi2r r-1h3ijdo']",
    [userId, currentUrl, isLoadingHtml],
  );
  const dynamicMarginTop = useMemo(() => {
    if (isNewRightRail) return 0;
    return displayUserId || searchInput ? 65 : 15;
  }, [displayUserId, isNewRightRail, searchInput]);

  // 计算是否应该显示组件
  const shouldShow = useMemo(() => {
    return (
      !isPremiumRoute &&
      shadowRoot &&
      !error &&
      !isAvatarRankModeLoading
    );
  }, [
    isPremiumRoute,
    shadowRoot,
    error,
    isAvatarRankModeLoading,
  ]);

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

  useEffect(() => {
    if (
      shouldShow &&
      r1h3ijdoDom &&
      r1h3ijdoDom instanceof HTMLElement &&
      !r1h3ijdoDom?.innerHTML
    ) {
      r1h3ijdoDom.style.display = 'none';
    }
  }, [r1h3ijdoDom, shouldShow]);

  useEffect(() => {
    if (!isNewRightRail || !shadowRoot) return;

    let clippingAncestor = (shadowRoot.host as HTMLElement).parentElement;
    while (clippingAncestor && clippingAncestor !== document.documentElement) {
      const overflowX = window.getComputedStyle(clippingAncestor).overflowX;
      if (overflowX === 'clip' || overflowX === 'hidden') break;
      clippingAncestor = clippingAncestor.parentElement;
    }

    if (!clippingAncestor) return;

    const previousValue = clippingAncestor.style.getPropertyValue('overflow-x');
    const previousPriority =
      clippingAncestor.style.getPropertyPriority('overflow-x');
    clippingAncestor.style.setProperty('overflow-x', 'visible');

    return () => {
      if (previousValue) {
        clippingAncestor.style.setProperty(
          'overflow-x',
          previousValue,
          previousPriority,
        );
      } else {
        clippingAncestor.style.removeProperty('overflow-x');
      }
    };
  }, [isNewRightRail, shadowRoot]);

  useEffect(() => {
    if (!isNewRightRail || !shadowRoot) return;

    const host = shadowRoot.host as HTMLElement;
    let animationFrameId: number | null = null;

    const placePanelBelowSearch = () => {
      animationFrameId = null;
      const hostParent = host.parentElement;
      const searchInput = document.querySelector<HTMLInputElement>(
        'aside input[data-testid="SearchBox_Search_Input"]',
      );
      if (!hostParent || !searchInput) return;

      let searchContainer = searchInput.closest<HTMLElement>('form');
      while (
        searchContainer?.parentElement &&
        searchContainer.parentElement !== hostParent
      ) {
        searchContainer = searchContainer.parentElement;
      }

      if (
        searchContainer?.parentElement === hostParent &&
        searchContainer.nextElementSibling !== host
      ) {
        searchContainer.insertAdjacentElement('afterend', host);
      }
    };

    const schedulePlacement = () => {
      if (animationFrameId !== null) return;
      animationFrameId = window.requestAnimationFrame(placePanelBelowSearch);
    };

    placePanelBelowSearch();
    const unsubscribe = subscribeToMutation(
      schedulePlacement,
      { childList: true, subtree: true },
      {
        filter: (mutation) => {
          const aside = host.closest('aside');
          return Boolean(
            aside &&
              mutation.type === 'childList' &&
              aside.contains(mutation.target),
          );
        },
        debugName: 'SearchBottomPanelPlacement',
      },
    );

    return () => {
      unsubscribe();
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentUrl, isNewRightRail, shadowRoot]);

  return ReactDOM.createPortal(
    <div
      data-theme={theme}
      data-xhunt-exclude={'true'}
      data-xhunt-testid='search-bottom-panel'
      className='search-bottom-panel-transition'
      data-xhunt-avatar-rank-mode={avatarRankMode}
      style={{
        marginTop: dynamicMarginTop,
        width: isNewRightRail ? '100%' : undefined,
        opacity: isVisible ? 1 : 0,
        // transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
        transition:
          'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          position: !displayUrlUid ? 'relative' : 'absolute',
          inset: !displayUrlUid ? undefined : 0,
          visibility: !displayUrlUid ? 'visible' : 'hidden',
          opacity: !displayUrlUid ? 1 : 0,
          pointerEvents: !displayUrlUid ? 'auto' : 'none',
        }}
      >
        <HomeRightSidebar fillContainer={isNewRightRail} />
      </div>
      <div
        style={{
          position: displayUrlUid ? 'relative' : 'absolute',
          inset: displayUrlUid ? undefined : 0,
          visibility: displayUrlUid ? 'visible' : 'hidden',
          opacity: displayUrlUid ? 1 : 0,
          pointerEvents: displayUrlUid ? 'auto' : 'none',
        }}
      >
        <TwitterPersonalRightSidebar
          userId={displayUserId}
          newTwitterData={newTwitterData}
          loadingTwInfo={isLoadingHtml || loadingTwInfo}
        />
      </div>
    </div>,
    portalHost!,
  );
}

export const SearchBottomPanel = React.memo(_SearchBottomPanel);
