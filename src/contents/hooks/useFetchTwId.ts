import { useState, useEffect } from 'react';

/**
 * 基于页面可见性/焦点变更监听来获取 twid Cookie 的 Hook
 * 规则：
 * - 如果 document.cookie 为空 => 认为无权限获取（可能浏览器限制）
 * - 如果存在 cookie 但 twid 为空 => 认为未登录
 * - 如果 twid 存在 => 返回 twid
 * @returns { data: string | null; loading: boolean; hasPermission: boolean; isLoggedIn: boolean }
 */
function useFetchTwId() {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    let observer: MutationObserver | null = null;
    let stopped = false;

    const checkCookie = () => {
      if (stopped) return;
      const allCookies = document.cookie || '';

      // 无任何 cookie，认为无权限（或页面环境不可访问 cookie）
      if (!allCookies) {
        setHasPermission(false);
        setIsLoggedIn(false);
        setData(null);
        setLoading(false);
        return;
      }

      setHasPermission(true);

      const twid =
        allCookies
          .split('; ')
          .find((row) => row.startsWith('twid='))
          ?.split('=')[1] || null;

      if (twid) {
        setData(twid);
        setIsLoggedIn(true);
        // 一旦拿到 twid，停止进一步观察与检查
        stopped = true;
        observer?.disconnect();
        document.removeEventListener('readystatechange', onReadyStateChange);
      } else {
        setData(null);
        setIsLoggedIn(false);
      }

      setLoading(false);
    };

    // 当页面就绪时检查（避免扩展加载早于页面）
    const onReadyStateChange = () => {
      if (
        document.readyState === 'interactive' ||
        document.readyState === 'complete'
      ) {
        checkCookie();
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('readystatechange', onReadyStateChange);
    } else {
      // 页面已就绪
      checkCookie();
    }

    // 使用 MutationObserver 监听页面结构变化，触发复查
    // 说明：无法直接监听 cookie 变化，但登录/登出通常伴随 DOM 变化
    let scheduled = false;
    const scheduleCheck = () => {
      if (scheduled || stopped) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        checkCookie();
      });
    };

    const newObserver = new MutationObserver(() => {
      scheduleCheck();
    });
    newObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    observer = newObserver;

    return () => {
      document.removeEventListener('readystatechange', onReadyStateChange);
      observer?.disconnect();
    };
  }, []);

  return { data, loading, hasPermission, isLoggedIn };
}

export default useFetchTwId;
