import { useEffect } from 'react';
import useCurrentUrl from './useCurrentUrl';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

// 模块级变量，跨 Hook 实例共享
let observer: MutationObserver | null = null;
let timeoutId: number | null = null;
let refCount = 0;

const useFixUIZIndex = () => {
  const currentUrl = useCurrentUrl(); // 自动响应 URL 变化
  const [theme, setTheme] = useLocalStorage('@xhunt/theme', 'dark');

  useEffect(() => {
    if (!currentUrl) return;
    // 修复逻辑
    const checkAndFix = () => {
      const section = document.querySelector('section[role="region"]');
      if (!section) return false;

      const prevSibling = section.previousElementSibling?.previousElementSibling as HTMLElement;
      if (prevSibling) {
        prevSibling.style.zIndex = '99';

        // 查找第一个 div 子元素
        let firstDiv: HTMLElement | null = null;
        for (let i = 0; i < prevSibling.children.length; i++) {
          const child = prevSibling.children[i];
          if (child.tagName === 'DIV') {
            firstDiv = child as HTMLElement;
            break;
          }
        }

        if (firstDiv) {
          firstDiv.style.zIndex = '99';
        }
      }
      // @ts-ignore
      const _theme = document.documentElement.style?.['color-scheme'];
      if (theme !== _theme) {
        setTheme(_theme === 'light' ? 'light' : 'dark').then(r => r);
      }

      // Set data-theme on body if not present
      const body = document.body;
      if (!body.hasAttribute('data-theme')) {
        body.setAttribute('data-theme', _theme === 'light' ? 'light' : 'dark');
      }

      return !!prevSibling;
    };

    // 增加引用计数
    refCount++;

    // 首次挂载时启动观察者
    if (!observer) {
      observer = new MutationObserver(() => {
        if (checkAndFix()) {
          // 修复成功后断开观察者
          if (observer) {
            observer.disconnect();
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // 设置 10 秒超时
      timeoutId = window.setTimeout(() => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        timeoutId = null;
      }, 10000);
    }

    // 立即检查一次
    if (!checkAndFix()) {
      // 若未修复成功，保持观察者运行
    }

    // 清理逻辑
    return () => {
      refCount--;
      if (refCount === 0) {
        // 最后一个组件卸载时清理资源
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };
  }, [currentUrl]); // 依赖 currentUrl，确保 URL 变化时重新执行
};

export default useFixUIZIndex;