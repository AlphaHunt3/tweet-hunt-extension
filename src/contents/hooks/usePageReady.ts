import { useState, useEffect } from 'react';

/**
 * Hook: 等待页面加载完成
 *
 * 检查 document.readyState，等待页面进入 interactive 或 complete 状态
 * 用于确保页面完全加载后再执行插件逻辑
 *
 * @returns {boolean} 页面是否已就绪
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isPageReady = usePageReady();
 *
 *   if (!isPageReady) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <div>Content</div>;
 * }
 * ```
 */
export function usePageReady(): boolean {
  const [isPageReady, setIsPageReady] = useState(() => {
    // 如果页面已经加载完成，直接返回 true
    if (typeof document !== 'undefined') {
      return (
        document.readyState === 'interactive' ||
        document.readyState === 'complete'
      );
    }
    return false;
  });

  useEffect(() => {
    // 如果页面已经就绪，不需要监听
    if (isPageReady) return;

    const onReadyStateChange = () => {
      if (
        document.readyState === 'interactive' ||
        document.readyState === 'complete'
      ) {
        setIsPageReady(true);
      }
    };

    // 如果页面还在加载，监听 readystatechange 事件
    if (document.readyState === 'loading') {
      document.addEventListener('readystatechange', onReadyStateChange);
      return () => {
        document.removeEventListener('readystatechange', onReadyStateChange);
      };
    } else {
      // 页面已就绪
      setIsPageReady(true);
    }
  }, [isPageReady]);

  return isPageReady;
}

export default usePageReady;
