import { useDebounceEffect, useDebounceFn } from 'ahooks';
import { useEffect, useRef, useCallback } from 'react';
// import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { useLocalStorage } from '~storage/useLocalStorage';
import { subscribeToMutation } from '~contents/hooks/useGlobalMutationObserver';

const THEME_KEY = '@xhunt/theme';
// const RELOAD_GUARD_KEY = '@xhunt/theme-reload-guard';

function getWebBackgroundColor(theme: 'light' | 'dark') {
  try {
    const inlineBg = String(document.body?.style?.backgroundColor || '').trim();
    const computedBg = String(
      window.getComputedStyle(document.body).backgroundColor || ''
    ).trim();
    const bg = inlineBg || computedBg;

    if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
      return theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
    }

    return bg;
  } catch {
    return theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
  }
}

function syncXhuntWebBg(theme: 'light' | 'dark') {
  try {
    const webBg = getWebBackgroundColor(theme);
    const currentWebBg = document.documentElement.style
      .getPropertyValue('--xhunt-web-bg')
      .trim();

    if (currentWebBg !== webBg) {
      document.documentElement.style.setProperty('--xhunt-web-bg', webBg);
    }
  } catch {
    // ignore theme sync errors
  }
}

function detectSystemTheme(): 'light' | 'dark' | '' {
  try {
    // 新版 X 直接在 html 上维护 data-theme，优先使用这一明确状态。
    const dataTheme = document.documentElement.getAttribute('data-theme');
    if (dataTheme === 'light' || dataTheme === 'dark') {
      return dataTheme;
    }

    // 兼容旧版 X 的 color-scheme。
    const scheme = document.documentElement.style.colorScheme;
    if (scheme) {
      return scheme === 'light' ? 'light' : 'dark';
    }

    // 如果 color-scheme 获取不到，通过 body 背景色检测
    const body = document.body;
    if (body) {
      const computedStyle = window.getComputedStyle(body);
      const backgroundColor = computedStyle.backgroundColor;

      // 检查是否为纯白色背景 (rgb(255, 255, 255))
      if (
        backgroundColor === 'rgb(255, 255, 255)' ||
        backgroundColor === '#ffffff'
      ) {
        return 'light';
      }
    }

    // 默认返回 dark
    return '';
  } catch {
    return '';
  }
}

export function useThemeWatcher() {
  // const currentUrl = useCurrentUrl();
  const canReloadRef = useRef(false);
  const [theme, setTheme, { isLoading: isThemeStoreLoading }] = useLocalStorage<
    'light' | 'dark' | ''
  >(THEME_KEY, 'dark');

  const checkAndApplyThemeChange = useCallback(() => {
    if (isThemeStoreLoading) return;
    const newTheme = detectSystemTheme();
    if (newTheme === '') return;
    const body = document.body;
    if (!body) return;

    syncXhuntWebBg(newTheme);

    // Sync body attribute for CSS variables/themes
    if (body.getAttribute('data-theme') !== newTheme) {
      body.setAttribute('data-theme', newTheme);
    }

    // 处理初始化或主题变化
    if (!theme) {
      // 首次初始化，设置主题但不触发重载
      setTheme(newTheme);
      return;
    }

    if (theme !== newTheme) {
      setTheme(newTheme);
      canReloadRef.current = true;
    }
  }, [theme, setTheme, isThemeStoreLoading]);

  // 使用 ahooks 的防抖函数包装 checkAndApplyThemeChange
  const { run: debouncedCheckAndApplyThemeChange } = useDebounceFn(
    checkAndApplyThemeChange,
    {
      wait: 300, // 防抖 300ms
    }
  );

  // 监听 DOM 变化（只监听可能影响主题的关键元素）
  useEffect(() => {
    if (isThemeStoreLoading) return;

    // 使用自定义过滤函数，只关注可能影响主题的变化
    const unsubscribe = subscribeToMutation(
      (mutations) => {
        // 使用防抖后的函数
        debouncedCheckAndApplyThemeChange();
      },
      {
        attributes: true,
        attributeFilter: ['data-theme', 'style'],
        subtree: false,
        childList: false, // 不需要监听子元素变化
      },
      {
        // 不在 subscriptionOptions 中设置 debounce，因为已经使用 useDebounceFn 处理了
        filter: (mutation) => {
          // 新版监听 data-theme，旧版继续兼容 style.color-scheme。
          const target = mutation.target;
          const isDocumentElement = target === document.documentElement;
          const isThemeAttribute =
            mutation.type === 'attributes' &&
            (mutation.attributeName === 'data-theme' ||
              mutation.attributeName === 'style');

          return isDocumentElement && isThemeAttribute;
        },
        debugName: 'useThemeWatcher',
      }
    );
    checkAndApplyThemeChange();

    return unsubscribe;
  }, [debouncedCheckAndApplyThemeChange, isThemeStoreLoading]);
}

export default useThemeWatcher;
