import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import indexText from 'data-text:~/css/index.css';
import { useSize } from 'ahooks';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import React, { useEffect, useState, useRef } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { navigationService } from '~/compontents/navigation/NavigationService';
import { messageManager } from '~/utils/messageManager';
import { useI18n } from '~contents/hooks/i18n.ts';

function _SideBarIcon() {
  const shadowRoot = useShadowContainer({
    selector: 'a[data-testid="AppTabBar_Profile_Link"]',
    styleText: indexText,
    useSiblings: true,
    siblingsStyle: 'width:auto;height:auto;max-width:100%;min-width:50.25px',
  });
  const [, setShowPanel] = useLocalStorage('@settings/showPanel', true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isCheckingMessages, setIsCheckingMessages] = useState(true);
  const initialCheckDoneRef = useRef(false);
  const sidebar = useWaitForElement('nav[role]');
  const size = useSize(sidebar?.parentElement);
  const width = size?.width || 0;
  const isExpanded = width > 72;
  const { lang } = useI18n();
  const langRef = useRef(lang);

  // Update message manager language when user language changes
  useEffect(() => {
    if (lang && lang !== langRef.current) {
      langRef.current = lang;
      messageManager.updateLanguage(lang as 'zh' | 'en');
    }
  }, [lang]);

  // Use the message manager to check for unread messages
  useEffect(() => {
    // Initialize message manager if needed
    if (!messageManager.getState().messages.length) {
      messageManager.init();
    }

    // Add callback to listen for message state changes
    const removeCallback = messageManager.addCallback((state) => {
      setHasUnreadMessages(state.hasUnread);
      setIsCheckingMessages(state.isLoading);
      if (!initialCheckDoneRef.current && !state.isLoading) {
        initialCheckDoneRef.current = true;
      }
    });

    return () => {
      removeCallback();
    };
  }, []);

  useEffect(() => {
    if (!shadowRoot) return;

    // 获取 header 和 nav 元素
    const header = document.querySelector('header[role]') as HTMLElement | null;
    const nav = document.querySelector('nav[role]') as HTMLElement | null;
    const navP1 = nav?.parentElement as HTMLElement | null;
    const navP2 = navP1?.parentElement as HTMLElement | null;
    const navP3 = navP2?.parentElement as HTMLElement | null;

    if (!header || !navP2 || !navP3) return;
    const addStylesIfNeeded = () => {
      if (!navP3.classList.contains('hideScrollbar')) {
        const styleEl = document.createElement('style');
        styleEl.textContent = indexText; // 假设 indexText 是你的 CSS 样式
        header.appendChild(styleEl);
        navP3.classList.add('hideScrollbar');
      }
    };
    const observer = new MutationObserver(() => {
      requestAnimationFrame(addStylesIfNeeded);
    });
    if (header) {
      observer.observe(header, {
        childList: true, // 监听直接子节点的变化
        subtree: true, // 监听整个子树的变化
        attributes: false, // 不监听属性变化
      });
    }
    addStylesIfNeeded();
    return () => {
      observer.disconnect();
    };
  }, [shadowRoot]);

  if (!shadowRoot) return null;

  return ReactDOM.createPortal(
    <div
      className={`sidebarItem ${isExpanded ? 'sidebarItemExpanded' : ''}`}
      onClick={() => {
        setShowPanel(true);

        // Update last read timestamp when clicking the icon
        if (hasUnreadMessages) {
          messageManager.markAllAsRead();
          setTimeout(() => {
            navigationService.navigateTo('main-panel', '/messages');
          }, 100);
        }
      }}
    >
      <img
        className='sidebarIcon'
        src='https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/xhunt_new.jpg'
        alt=''
      />
      {isExpanded && (
        <div className='sidebarTextContainer'>
          <span className='sidebarText'>XHunt</span>
          {/* Only show the indicator when we've confirmed there are unread messages and initial check is done */}
          {!isCheckingMessages &&
            initialCheckDoneRef.current &&
            hasUnreadMessages && (
              <div className='unreadTextDot'>
                <span className='unreadDotInner'></span>
              </div>
            )}
        </div>
      )}
    </div>,
    shadowRoot
  );
}

export const SideBarIcon = React.memo(_SideBarIcon);
