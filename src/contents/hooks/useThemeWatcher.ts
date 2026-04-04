import { useDebounceEffect, useDebounceFn } from 'ahooks';
import { useEffect, useRef, useCallback } from 'react';
// import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { useLocalStorage } from '~storage/useLocalStorage';
import { subscribeToMutation } from '~contents/hooks/useGlobalMutationObserver';

const THEME_KEY = '@xhunt/theme';
// const RELOAD_GUARD_KEY = '@xhunt/theme-reload-guard';

function detectSystemTheme(): 'light' | 'dark' | '' {
  try {
    // 首先尝试通过 color-scheme 检测
    const scheme = (document?.documentElement?.style as any)?.['color-scheme'];
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
        attributeFilter: ['style'],
        subtree: true, // 需要 subtree: true 才能监听到 documentElement 本身的变化（当观察目标是 documentElement 时）
        childList: false, // 不需要监听子元素变化
      },
      {
        // 不在 subscriptionOptions 中设置 debounce，因为已经使用 useDebounceFn 处理了
        filter: (mutation) => {
          // 只关注 documentElement 的 style 属性变化
          // 因为 color-scheme 是设置在 <html> 元素的 style 属性中的
          const target = mutation.target;
          const isDocumentElement = target === document.documentElement;
          const isStyleAttribute =
            mutation.type === 'attributes' &&
            mutation.attributeName === 'style';

          return isDocumentElement && isStyleAttribute;
        },
        debugName: 'useThemeWatcher',
      }
    );
    checkAndApplyThemeChange();

    return unsubscribe;
  }, [debouncedCheckAndApplyThemeChange, isThemeStoreLoading]);
}

export default useThemeWatcher;
