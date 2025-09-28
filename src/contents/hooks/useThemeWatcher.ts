import { useDebounceEffect } from 'ahooks';
import { useEffect, useRef, useCallback } from 'react';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { useLocalStorage } from '~storage/useLocalStorage';

const THEME_KEY = '@xhunt/theme';
const RELOAD_GUARD_KEY = '@xhunt/theme-reload-guard';

function detectSystemTheme(): 'light' | 'dark' {
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
    return 'dark';
  } catch {
    return 'dark';
  }
}

export function useThemeWatcher() {
  const currentUrl = useCurrentUrl();
  const canReloadRef = useRef(false);
  const [theme, setTheme, { isLoading: isThemeStoreLoading }] = useLocalStorage<
    'light' | 'dark' | ''
  >(THEME_KEY, '');

  const checkAndApplyThemeChange = useCallback(() => {
    if (isThemeStoreLoading) return;
    const newTheme = detectSystemTheme();
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

  useDebounceEffect(
    () => {
      if (isThemeStoreLoading) return;
      const timer = setTimeout(() => {
        checkAndApplyThemeChange();
      }, 1500);
      return () => clearTimeout(timer);
    },
    [currentUrl, isThemeStoreLoading],
    { wait: 100, maxWait: 500 }
  );

  useEffect(() => {
    if (isThemeStoreLoading) return;
    const intervalId = window.setInterval(() => {
      checkAndApplyThemeChange();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [theme, isThemeStoreLoading]); // 添加 theme 作为依赖项，确保闭包读取最新值

  useEffect(() => {
    if (isThemeStoreLoading) return;
    if (canReloadRef.current) {
      canReloadRef.current = false;
      // Prevent infinite reload loops
      try {
        const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
        const parsed = raw
          ? (JSON.parse(raw) as { theme: string; ts: number })
          : null;
        const now = Date.now();
        const within5s = parsed && now - parsed.ts < 10000;
        const sameTheme = parsed && parsed.theme === theme;

        if (!(within5s && sameTheme)) {
          sessionStorage.setItem(
            RELOAD_GUARD_KEY,
            JSON.stringify({ theme: theme, ts: now })
          );
          // Full reload so injected DOM re-mounts under new theme
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      } catch {
        // window.location.reload();
      }
    }
  }, [theme, isThemeStoreLoading]);
}

export default useThemeWatcher;
