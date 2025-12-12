import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import indexText from 'data-text:~/css/index.css';
import { useDebounceFn } from 'ahooks';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { navigationService } from '~/compontents/navigation/NavigationService';
import { messageManager } from '~/utils/messageManager';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useReactiveSettings } from '~/utils/settingsManager.ts';
import { subscribeToMutation } from '~contents/hooks/useGlobalMutationObserver';
import { useGlobalResize } from '~contents/hooks/useGlobalResize';

function _SideBarIcon() {
  const shadowRoot = useShadowContainer({
    selector: 'a[data-testid="AppTabBar_Profile_Link"]',
    styleText: indexText,
    useSiblings: true,
    siblingsStyle: 'width:auto;height:auto;max-width:100%;min-width:50.25px',
  });
  const [, setShowPanel] = useLocalStorage('@settings/showPanel', true);
  const [, setIsMinimized] = useLocalStorage<boolean>(
    '@xhunt/panelMinimized',
    false
  );
  const [theme] = useLocalStorage<'light' | 'dark' | ''>(
    '@xhunt/theme',
    'dark'
  );
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isCheckingMessages, setIsCheckingMessages] = useState(true);
  const initialCheckDoneRef = useRef(false);
  const sidebar = useWaitForElement('nav[role]', [theme]);
  const [isExpanded, setIsExpanded] = useState(true);
  const { lang } = useI18n();
  const langRef = useRef(lang);
  const { isEnabled } = useReactiveSettings();
  const showSidebarIcon = isEnabled('showSidebarIcon');

  // 获取宽度并计算 isExpanded
  const updateIsExpanded = useCallback(() => {
    if (!sidebar?.parentElement) return;
    const parentElement = sidebar.parentElement;
    const width = parentElement.getBoundingClientRect().width || 0;
    // 根据宽度判断是否展开（宽度大于 72px 时展开）
    setIsExpanded(width > 72);
  }, [sidebar]);

  // 防抖处理宽度获取和计算
  const { run: debouncedUpdateIsExpanded } = useDebounceFn(updateIsExpanded, {
    wait: 100, // 防抖 100ms
  });

  // 监听窗口大小变化
  useGlobalResize(() => {
    debouncedUpdateIsExpanded();
  }, [debouncedUpdateIsExpanded]);

  // 初始化和 sidebar 变化时也更新
  useEffect(() => {
    if (sidebar?.parentElement) {
      updateIsExpanded();
    }
  }, [sidebar, updateIsExpanded]);

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
    if (!shadowRoot || !showSidebarIcon) return;

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

      // 查找并隐藏指定元素的滚动条
      const targetElement = document.querySelector(
        '.css-175oi2r.r-1pi2tsx.r-1wtj0ep.r-1rnoaur.r-f9dfq4.r-is05cd'
      ) as HTMLElement | null;
      if (targetElement && !targetElement.classList.contains('hideScrollbar')) {
        targetElement.classList.add('hideScrollbar');
      }
    };

    // 使用全局 MutationObserver 替换原来的独立实例
    // 注意：全局观察器观察 document.body，但会捕获所有子元素的变化（包括 header）
    const unsubscribe = subscribeToMutation(
      () => {
        requestAnimationFrame(addStylesIfNeeded);
      },
      {
        childList: true, // 监听直接子节点的变化
        subtree: true, // 监听整个子树的变化
        attributes: false, // 不监听属性变化
      },
      {
        // 使用 filter 只处理 childList 类型的 mutations，并且只关注 header 相关的变化
        filter: (mutation) => {
          if (mutation.type !== 'childList') return false;
          // 检查变化是否发生在 header 内部
          const target = mutation.target as Node;
          return header.contains(target) || target === header;
        },
        debugName: 'SideBarIcon',
      }
    );

    addStylesIfNeeded();
    return () => {
      unsubscribe();
    };
  }, [shadowRoot, showSidebarIcon]);

  if (!shadowRoot || !showSidebarIcon) return null;

  return ReactDOM.createPortal(
    <div
      className={`sidebarItem ${isExpanded ? 'sidebarItemExpanded' : ''}`}
      onClick={() => {
        setShowPanel(true);
        setIsMinimized(false);
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
