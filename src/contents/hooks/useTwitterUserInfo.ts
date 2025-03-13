import { useState, useEffect } from 'react';
import useCurrentUrl from './useCurrentUrl';
import { useDebounceEffect } from 'ahooks';

export interface TwitterUserInfo {
  displayName: string;
}

export function useTwitterUserInfo(): TwitterUserInfo | null {
  const currentUrl = useCurrentUrl();
  const [userInfo, setUserInfo] = useState<TwitterUserInfo | null>(null);

  useDebounceEffect(() => {
    // 每次 URL 变化时重置信息
    setUserInfo(null);

    const MAX_WAIT_TIME = 10000; // 最长等待 10 秒
    let usernameObserver: MutationObserver | null = null;
    let handleObserver: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // 定义查找 handle 的函数
    const findHandle = (usernameElement: Element): string | null => {
      const spans = usernameElement.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent?.trim() || '';
        // 要求文本以 "@" 开头，并且 "@" 后只包含大小写字母、下划线或短横线
        if (text.startsWith('@') && /^@[A-Za-z_-]+$/.test(text)) {
          return text.slice(1); // 去掉 @ 返回
        }
      }
      return null;
    };

    // 观察整个文档，等待 [data-testid="UserName"] 元素出现
    const observeUsername = () => {
      usernameObserver = new MutationObserver(() => {
        const usernameElement = document.querySelector('[data-testid="UserName"]');
        if (usernameElement) {
          usernameObserver?.disconnect(); // 找到后停止全局观察

          // 尝试直接查找 handle
          const handle = findHandle(usernameElement);
          if (handle) {
            setUserInfo({ displayName: handle });
          } else {
            // 如果没有找到，则在 usernameElement 内部观察变化
            handleObserver = new MutationObserver(() => {
              const newHandle = findHandle(usernameElement);
              if (newHandle) {
                handleObserver?.disconnect();
                setUserInfo({ displayName: newHandle });
              }
            });
            handleObserver.observe(usernameElement, {
              childList: true,
              subtree: true,
            });
            // 超时后停止内部观察
            timeoutId = setTimeout(() => {
              handleObserver?.disconnect();
            }, MAX_WAIT_TIME);
          }
        }
      });
      usernameObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
      // 全局超时保护
      timeoutId = setTimeout(() => {
        usernameObserver?.disconnect();
      }, MAX_WAIT_TIME);
    };

    observeUsername();

    // 清理函数
    return () => {
      usernameObserver?.disconnect();
      handleObserver?.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentUrl], {
    wait: 500,
  });

  return userInfo;
}
