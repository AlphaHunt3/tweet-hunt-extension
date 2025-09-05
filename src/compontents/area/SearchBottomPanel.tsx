import React, { useMemo, useState } from 'react';
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

function _SearchBottomPanel({
  error,
  userId,
  newTwitterData,
  loadingTwInfo,
}: MainData) {
  const shadowRoot = useShadowContainer({
    selector:
      "div[data-testid='sidebarColumn'] div[class='css-175oi2r r-1adg3ll']",
    styleText: cssText + avatarCssText,
    autoZIndex: false,
    useSiblings: true,
    siblingsPosition: 'beforebegin',
    siblingsStyle: 'width:auto;height:auto;max-width:100%;z-index:0',
    onShadowCreated: () => {
      const r1h3ijdo = document.querySelector(
        "div[data-testid='sidebarColumn'] div[class='css-175oi2r r-1h3ijdo']"
      );
      if (r1h3ijdo && r1h3ijdo instanceof HTMLElement) {
        r1h3ijdo.style.display = 'none';
      }
    },
  });
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const currentUrl = useCurrentUrl();
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
    [currentUrl, userId],
    20000
  );
  const dynamicMarginTop = searchInput ? 65 : 15;

  if (isPremiumRoute) return <></>;
  if (!shadowRoot) return null;

  if (error) {
    return <></>;
  }

  return ReactDOM.createPortal(
    <div
      data-theme={theme}
      data-xhunt-exclude={'true'}
      style={{
        marginTop: dynamicMarginTop,
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
    shadowRoot
  );
}

export const SearchBottomPanel = React.memo(_SearchBottomPanel);
