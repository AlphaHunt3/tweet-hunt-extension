import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import indexText from 'data-text:~/css/index.css';
import icon1SvgText from 'data-text:../../../assets/icon1.svg';
import { useDebounceFn } from 'ahooks';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { navigationService } from '~/compontents/navigation/NavigationService';
import { messageManager } from '~/utils/messageManager';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useCrossPageSettings } from '~/utils/settingsManager.ts';
import { subscribeToMutation } from '~contents/hooks/useGlobalMutationObserver';
import { useGlobalResize } from '~contents/hooks/useGlobalResize';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { useUserDomain } from '~contents/hooks/useUserDomain';

const sidebarPlaceholderStyle =
  'width:100%;height:50px;max-width:100%;min-width:50.25px;display:flex;align-items:center;justify-content:flex-start;box-sizing:border-box;';

function _SideBarIcon() {
  const shadowRoot = useShadowContainer({
    selector: 'a[data-testid="AppTabBar_Profile_Link"]',
    styleText: indexText,
    useSiblings: true,
    siblingsStyle: sidebarPlaceholderStyle,
    targetStyle: sidebarPlaceholderStyle,
    cleanupStaleSiblings: true,
    containerKey: 'sidebar-icon',
  });
  const portalHost = usePersistentPortalHost(shadowRoot);
  const [, setShowPanel] = useLocalStorage('@settings/showPanel', true);
  const [, setIsMinimized] = useLocalStorage<boolean>(
    '@xhunt/panelMinimized',
    false,
  );
  const [theme] = useLocalStorage<'light' | 'dark' | ''>(
    '@xhunt/theme',
    'dark',
  );
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isCheckingMessages, setIsCheckingMessages] = useState(true);
  const initialCheckDoneRef = useRef(false);
  const currentUrl = useCurrentUrl();
  const sidebar = useWaitForElement('nav[role]', [theme, currentUrl]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { t, lang } = useI18n();
  const langRef = useRef(lang);
  const { isEnabled } = useCrossPageSettings();
  const showSidebarIcon = isEnabled('showSidebarIcon');
  const { isSetupCompleted, setShouldShowSetup } = useUserDomain();

  // 获取宽度并计算 isExpanded
  const updateIsExpanded = useCallback(() => {
    if (!sidebar) return;

    const profileLink = document.querySelector(
      'a[data-testid="AppTabBar_Profile_Link"]',
    ) as HTMLElement | null;
    const profileLinkWidth = profileLink?.getBoundingClientRect().width || 0;
    const hasVisibleProfileText = Array.from(
      profileLink?.querySelectorAll('span') || [],
    ).some((span) => {
      const text = span.textContent?.trim();
      if (!text) return false;

      const rect = span.getBoundingClientRect();
      const style = window.getComputedStyle(span);
      return (
        rect.width > 20 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    });

    // X 左侧栏存在中间宽度布局：容器宽度够大，但原生菜单文案已隐藏。
    // 因此以 Profile 原生文案是否可见为准，避免窄屏时 XHunt 文案溢出。
    setIsExpanded(
      !currentUrl.includes('/i/chat') &&
      profileLinkWidth > 120 &&
      hasVisibleProfileText,
    );
  }, [sidebar, currentUrl]);

  // 防抖处理宽度获取和计算
  const { run: debouncedUpdateIsExpanded } = useDebounceFn(updateIsExpanded, {
    wait: 50, // 防抖 50ms
    maxWait: 200,
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
        '.css-175oi2r.r-1pi2tsx.r-1wtj0ep.r-1rnoaur.r-f9dfq4.r-is05cd',
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
      },
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
        if (!isSetupCompleted) {
          setShouldShowSetup(true);
          return;
        }
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
      <span
        className='sidebarIcon'
        aria-hidden='true'
        dangerouslySetInnerHTML={{ __html: icon1SvgText }}
      />
      {/* 未选择领域时，折叠态显示红点提示 */}
      {!isExpanded && !isSetupCompleted && (
        <span
          style={{
            position: 'absolute',
            top: '4px',
            right: isExpanded ? 'auto' : '8px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#ef4444',
            boxShadow: '0 0 0 2px var(--bg-primary, #fff)',
          }}
        />
      )}
      <div
        className={`sidebarTextContainer ${isExpanded
            ? 'sidebarTextContainerExpanded'
            : 'sidebarTextContainerCollapsed'
          }`}
        aria-hidden={!isExpanded}
      >
        <span className='sidebarText'>XHunt</span>
        {!isSetupCompleted ? (
          <span
            style={{
              marginLeft: '6px',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, #ef4444, #ec4899)',
              color: '#fff',
              fontWeight: 500,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {t('domainSetupBadge') || '去选择'}
          </span>
        ) : (
          !isCheckingMessages &&
          initialCheckDoneRef.current &&
          hasUnreadMessages && (
            <div className='unreadTextDot'>
              <span className='unreadDotInner'></span>
            </div>
          )
        )}
      </div>
    </div>,
    portalHost!,
  );
}

export const SideBarIcon = React.memo(_SideBarIcon);
