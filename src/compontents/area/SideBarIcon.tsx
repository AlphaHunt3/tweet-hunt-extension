import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import indexText from 'data-text:~/css/index.css';
import icon1SvgText from 'data-text:../../../assets/icon1.svg';
import { useDebounceFn } from 'ahooks';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
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
import { checkExtensionContext } from '~contents/utils';
import {
  resolveNewSidebarInsertionAnchor,
  resolveSidebarProfileLink,
} from '~contents/utils/xDomAdapter';

const sidebarPlaceholderStyle =
  'width:100%;height:50px;max-width:100%;min-width:50.25px;display:flex;align-items:center;justify-content:flex-start;box-sizing:border-box;';

const newXIconSvgText = icon1SvgText.replace(
  'color="#0F1418"',
  'color="currentColor"',
);

const isSidebarNavMutation = (mutation: MutationRecord) => {
  const target = mutation.target;
  if (
    target instanceof Element &&
    (target.matches('nav') || Boolean(target.closest('nav')))
  ) {
    return true;
  }

  return [...mutation.addedNodes, ...mutation.removedNodes].some(
    (node) =>
      node instanceof Element &&
      (node.matches('nav') || Boolean(node.querySelector('nav'))),
  );
};

function useNewXSidebarPortalHost() {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    let currentHost: HTMLElement | null = null;

    const ensureHost = () => {
      const anchor = resolveNewSidebarInsertionAnchor();
      if (!anchor?.parentElement) return;

      if (!currentHost?.isConnected) {
        currentHost = document.createElement('div');
        currentHost.setAttribute('data-xhunt-new-sidebar-host', 'true');
        currentHost.setAttribute('data-xhunt-exclude', 'true');
        currentHost.setAttribute('translate', 'no');
        currentHost.classList.add('notranslate');
        currentHost.style.display = 'contents';
      }

      if (anchor !== currentHost && anchor.nextElementSibling !== currentHost) {
        anchor.insertAdjacentElement('afterend', currentHost);
      }
      setPortalHost(currentHost);
    };

    ensureHost();
    const unsubscribe = subscribeToMutation(
      ensureHost,
      { childList: true, subtree: true },
      {
        filter: isSidebarNavMutation,
        debugName: 'NewXSideBarIconHost',
      },
    );

    return () => {
      unsubscribe();
      currentHost?.remove();
    };
  }, []);

  return portalHost;
}

function useSidebarEntryController() {
  const [, setShowPanel] = useLocalStorage('@settings/showPanel', true);
  const [, setIsMinimized] = useLocalStorage<boolean>(
    '@xhunt/panelMinimized',
    false,
  );
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isCheckingMessages, setIsCheckingMessages] = useState(true);
  const initialCheckDoneRef = useRef(false);
  const { t, lang } = useI18n();
  const langRef = useRef(lang);
  const { isEnabled } = useCrossPageSettings();
  const showSidebarIcon = isEnabled('showSidebarIcon');
  const { isSetupCompleted, isSetupLoading, setShouldShowSetup } =
    useUserDomain();

  useEffect(() => {
    if (lang && lang !== langRef.current) {
      langRef.current = lang;
      messageManager.updateLanguage(lang as 'zh' | 'en');
    }
  }, [lang]);

  useEffect(() => {
    if (!messageManager.getState().messages.length) {
      messageManager.init();
    }

    const removeCallback = messageManager.addCallback((state) => {
      setHasUnreadMessages(state.hasUnread);
      setIsCheckingMessages(state.isLoading);
      if (!initialCheckDoneRef.current && !state.isLoading) {
        initialCheckDoneRef.current = true;
      }
    });

    return removeCallback;
  }, []);

  const handleActivate = useCallback(async () => {
    if (!checkExtensionContext()) {
      window.location.reload();
      return;
    }

    try {
      await Promise.all([setShowPanel(true), setIsMinimized(false)]);
      // SideBarIcon 和悬浮面板可能处于不同的 React/Shadow Root。
      // 除持久化状态外再发送同页事件，确保当前已挂载的面板立即响应本次点击。
      window.dispatchEvent(new CustomEvent('xhunt:open-panel'));

      if (!isSetupCompleted) {
        await setShouldShowSetup(true);
        return;
      }

      if (hasUnreadMessages) {
        messageManager.markAllAsRead();
        window.setTimeout(() => {
          navigationService.navigateTo('main-panel', '/messages');
        }, 100);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        !checkExtensionContext() ||
        /Extension context invalidated|context invalidated/i.test(message)
      ) {
        window.location.reload();
        return;
      }
      console.error('[XHunt] Failed to open sidebar panel:', error);
    }
  }, [
    hasUnreadMessages,
    isSetupCompleted,
    isSetupLoading,
    setIsMinimized,
    setShouldShowSetup,
    setShowPanel,
  ]);

  return {
    handleActivate,
    hasUnreadMessages,
    isCheckingMessages,
    isSetupCompleted,
    initialCheckDone: initialCheckDoneRef.current,
    showSidebarIcon,
    t,
  };
}

function LegacySideBarIcon() {
  const shadowRoot = useShadowContainer({
    selector: 'a[data-testid="AppTabBar_Profile_Link"]',
    resolveBaseElement: resolveSidebarProfileLink,
    styleText: indexText,
    useSiblings: true,
    siblingsStyle: sidebarPlaceholderStyle,
    targetStyle: sidebarPlaceholderStyle,
    cleanupStaleSiblings: true,
    containerKey: 'sidebar-icon',
  });
  const portalHost = usePersistentPortalHost(shadowRoot);
  const [theme] = useLocalStorage<'light' | 'dark' | ''>(
    '@xhunt/theme',
    'dark',
  );
  const currentUrl = useCurrentUrl();
  const sidebar = useWaitForElement('nav', [theme, currentUrl]);
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    handleActivate,
    hasUnreadMessages,
    initialCheckDone,
    isCheckingMessages,
    isSetupCompleted,
    showSidebarIcon,
    t,
  } = useSidebarEntryController();

  // 获取宽度并计算 isExpanded
  const updateIsExpanded = useCallback(() => {
    // 后台/隐藏状态下 DOM 尺寸可能测得 0，跳过更新以防误折叠
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!sidebar) return;

    const profileLink = resolveSidebarProfileLink();
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

  // 1. 监听窗口大小变化
  useGlobalResize(() => {
    debouncedUpdateIsExpanded();
  }, [debouncedUpdateIsExpanded]);

  // 2. 网页从休眠/后台切回前台（唤醒/激活）时重新计算
  useEffect(() => {
    const handleWake = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      // 唤醒后在下一帧及短延时后重新测量，确保 layout 重排已落定
      requestAnimationFrame(updateIsExpanded);
      setTimeout(updateIsExpanded, 150);
    };

    document.addEventListener('visibilitychange', handleWake);
    window.addEventListener('focus', handleWake);

    return () => {
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', handleWake);
    };
  }, [updateIsExpanded]);

  // 3. 初始化、sidebar 挂载或路由切换时更新
  useEffect(() => {
    if (sidebar?.parentElement) {
      updateIsExpanded();
      const timer = setTimeout(updateIsExpanded, 150);
      return () => clearTimeout(timer);
    }
  }, [sidebar, currentUrl, updateIsExpanded]);

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
      data-xhunt-testid='sidebar-icon'
      className={`sidebarItem ${isExpanded ? 'sidebarItemExpanded' : ''}`}
      onClick={handleActivate}
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
          initialCheckDone &&
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

function NewXSideBarIcon() {
  const portalHost = useNewXSidebarPortalHost();
  const {
    handleActivate,
    hasUnreadMessages,
    initialCheckDone,
    isCheckingMessages,
    isSetupCompleted,
    showSidebarIcon,
  } = useSidebarEntryController();

  if (!portalHost || !showSidebarIcon) return null;

  return ReactDOM.createPortal(
    <button
      type='button'
      data-xhunt-testid='sidebar-icon-new-x'
      className='group/sidebar-item relative flex h-[48px] w-[calc(48px+(100%-48px)*var(--x-sidebar-expanded,0))] cursor-pointer items-center focus-visible:[outline:none]'
      aria-label='XHunt'
      onClick={handleActivate}
    >
      <span className='outline-focus inline-flex h-full w-fit max-w-full min-w-0 items-center rounded-full p-[10px] transition-colors duration-100 group-focus-visible/sidebar-item:outline-2 group-focus-visible/sidebar-item:outline-offset-2 group-hover/sidebar-item:bg-btn-ghost-hover group-hover/sidebar-item:duration-50 group-focus-visible/sidebar-item:bg-btn-ghost-hover'>
        <span aria-hidden='true' className='relative flex size-[28px] shrink-0'>
          <span className='grid size-full place-items-center [&_svg]:size-[28px]'>
            <span
              className='col-start-1 row-start-1 flex'
              style={{ transform: 'scale(0.9)', transformOrigin: 'center' }}
              dangerouslySetInnerHTML={{ __html: newXIconSvgText }}
            />
          </span>
        </span>
        {!isSetupCompleted && (
          <span
            aria-hidden='true'
            className='pointer-events-none absolute size-2 rounded-full bg-red-500 shadow-[0_0_0_2px_var(--x-bg-primary,#fff)]'
            style={{
              // 折叠时放到图标右上方、与 SVG 留出间距，避免红点压住图标笔画。
              top: '7px',
              right: '-3px',
              opacity: 'calc(1 - var(--x-sidebar-expanded, 0))',
            }}
          />
        )}
        <span
          aria-hidden='true'
          className='flex max-w-[calc(200px*var(--x-sidebar-expanded,0))] min-w-0 items-center overflow-hidden ps-[calc(20px*var(--x-sidebar-expanded,0))] pe-[calc(12px*var(--x-sidebar-expanded,0))] whitespace-nowrap'
        >
          <span className='text-headline2 text-primary min-w-0 truncate'>
            XHunt
          </span>
          {!isSetupCompleted ? (
            <span
              className='ml-2 shrink-0 rounded-full'
              aria-hidden='true'
              style={{
                width: '8px',
                height: '8px',
                marginLeft: '12px',
                background: '#ef4444',
                boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.12)',
              }}
            />
          ) : (
            !isCheckingMessages &&
            initialCheckDone &&
            hasUnreadMessages && (
              <span
                className='ml-1.5 size-2 shrink-0 rounded-full bg-rose-500'
                aria-hidden='true'
              />
            )
          )}
        </span>
      </span>
    </button>,
    portalHost,
  );
}

function SideBarIconRouter() {
  const currentUrl = useCurrentUrl();
  const { isEnabled } = useCrossPageSettings();
  const [storedShowSidebarIcon, , { isLoading: isShowSidebarIconLoading }] =
    useLocalStorage('@settings/showSidebarIcon', true);
  const showSidebarIcon =
    !isShowSidebarIconLoading &&
    storedShowSidebarIcon !== false &&
    isEnabled('showSidebarIcon');
  const [sidebarVariant, setSidebarVariant] = useState<
    'legacy' | 'new' | null
  >(() => {
    if (
      document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')
    ) {
      return 'legacy';
    }
    return resolveSidebarProfileLink() ? 'new' : null;
  });

  useLayoutEffect(() => {
    const updateVariant = () => {
      const nextVariant = document.querySelector(
        'a[data-testid="AppTabBar_Profile_Link"]',
      )
        ? 'legacy'
        : resolveSidebarProfileLink()
          ? 'new'
          : null;
      if (!nextVariant) return;
      setSidebarVariant((current) =>
        current === nextVariant ? current : nextVariant,
      );
    };

    updateVariant();
    return subscribeToMutation(
      updateVariant,
      { childList: true, subtree: true },
      {
        filter: isSidebarNavMutation,
        debugName: 'SideBarIconRouter',
      },
    );
  }, [currentUrl]);

  if (!showSidebarIcon || !sidebarVariant) return null;
  return sidebarVariant === 'legacy' ? (
    <LegacySideBarIcon />
  ) : (
    <NewXSideBarIcon />
  );
}

export const SideBarIcon = React.memo(SideBarIconRouter);
