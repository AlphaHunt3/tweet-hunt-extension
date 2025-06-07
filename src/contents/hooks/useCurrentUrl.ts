import { useEffect, useState, useRef } from 'react';
import { useDebounceFn } from 'ahooks';

// 模块级共享状态
let currentUrlRef = { current: window.location.href };
let observers = new Set<(url: string) => void>();
let mutationObserverRef = { current: null as MutationObserver | null };
let refCount = 0;

// 原始 history 方法备份
let originalPushState: History['pushState'];
let originalReplaceState: History['replaceState'];

// 存储当前有效的 debouncedNotify 函数
let debouncedNotifyRef = { current: null as (() => void) | null };

// 通知所有观察者
const notifyObservers = () => {
  const newUrl = window.location.href;
  if (newUrl !== currentUrlRef.current) {
    currentUrlRef.current = newUrl;
    observers.forEach((cb) => cb(newUrl));
  }
};

// 初始化全局监听器
const setupGlobalObserver = () => {
  if (!mutationObserverRef.current && debouncedNotifyRef.current) {
    // 1. MutationObserver：用于监听 DOM 变化（如某些动态加载内容）
    mutationObserverRef.current = new MutationObserver(() => {
      debouncedNotifyRef.current!();
    });

    mutationObserverRef.current.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: false,
      characterData: false
    });

    // 2. popstate / hashchange：用于 SPA 路由变化
    window.addEventListener('popstate', debouncedNotifyRef.current);
    window.addEventListener('hashchange', debouncedNotifyRef.current);

    // 3. 劫持 history.pushState / replaceState
    originalPushState = history.pushState;
    originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      debouncedNotifyRef.current?.(); // 触发防抖更新
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      debouncedNotifyRef.current?.(); // 触发防抖更新
      return result;
    };
  }
};

// 清理全局监听器
const teardownGlobalObserver = () => {
  if (mutationObserverRef.current) {
    mutationObserverRef.current.disconnect();
    mutationObserverRef.current = null;
  }

  if (debouncedNotifyRef.current) {
    window.removeEventListener('popstate', debouncedNotifyRef.current);
    window.removeEventListener('hashchange', debouncedNotifyRef.current);
  }

  // 恢复原始 history 方法
  if (originalPushState) {
    history.pushState = originalPushState;
  }
  if (originalReplaceState) {
    history.replaceState = originalReplaceState;
  }
};

const useCurrentUrl = () => {
  const [url, setUrl] = useState(currentUrlRef.current);
  const observerRef = useRef<(url: string) => void>(() => {});

  // 创建防抖函数
  const { run: debouncedNotify } = useDebounceFn(notifyObservers, {
    wait: 100,
    maxWait: 100,
    leading: true,
    trailing: true
  });

  // 更新模块级 ref，确保 setupGlobalObserver 能访问到当前有效的 debouncedNotify
  debouncedNotifyRef.current = debouncedNotify;

  useEffect(() => {
    observerRef.current = (newUrl) => setUrl(newUrl);
    observers.add(observerRef.current);

    refCount++;

    if (refCount === 1) {
      setupGlobalObserver();
    }

    return () => {
      observers.delete(observerRef.current);
      refCount--;

      if (refCount === 0) {
        teardownGlobalObserver();
      }
    };
  }, [debouncedNotify]); // 添加依赖项

  return url;
};

export default useCurrentUrl;
