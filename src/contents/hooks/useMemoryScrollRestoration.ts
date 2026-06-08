import React from 'react';
import { useInViewport } from 'ahooks';

export interface UseMemoryScrollRestorationOptions {
  restoreThreshold?: number;
  resetThreshold?: number;
  disabled?: boolean;
  memoryKey?: string | number | null;
  maxEntries?: number;
  saveDelay?: number;
}

export function useMemoryScrollRestoration<T extends HTMLElement>({
  restoreThreshold = 10,
  resetThreshold = 2,
  disabled = false,
  memoryKey,
  maxEntries = 50,
  saveDelay = 160,
}: UseMemoryScrollRestorationOptions = {}) {
  const scrollRef = React.useRef<T | null>(null);
  const isRestoringRef = React.useRef(false);
  const scrollPositionsRef = React.useRef<Record<string, number>>({});
  const keyOrderRef = React.useRef<string[]>([]);
  const saveTimerRef = React.useRef<number | null>(null);
  const currentMemoryKey = String(memoryKey ?? '__default__');
  const safeMaxEntries = Math.max(1, maxEntries);
  const [inViewport] = useInViewport(scrollRef);

  const rememberScrollTop = React.useCallback(
    (key: string, scrollTop: number) => {
      if (
        !Object.prototype.hasOwnProperty.call(scrollPositionsRef.current, key)
      ) {
        keyOrderRef.current.push(key);
      }

      scrollPositionsRef.current[key] = scrollTop;

      while (keyOrderRef.current.length > safeMaxEntries) {
        const oldestKey = keyOrderRef.current.shift();
        if (oldestKey) {
          delete scrollPositionsRef.current[oldestKey];
        }
      }
    },
    [safeMaxEntries],
  );

  const saveCurrentScrollTop = React.useCallback(() => {
    if (disabled || isRestoringRef.current) return;
    const container = scrollRef.current;
    if (!container) return;
    rememberScrollTop(currentMemoryKey, container.scrollTop || 0);
  }, [currentMemoryKey, disabled, rememberScrollTop]);

  React.useEffect(() => {
    const container = scrollRef.current;
    if (disabled || !container) return;

    const handleScroll = () => {
      if (isRestoringRef.current) return;

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        saveCurrentScrollTop();
      }, saveDelay);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      saveCurrentScrollTop();
    };
  }, [disabled, saveCurrentScrollTop, saveDelay]);

  React.useLayoutEffect(() => {
    if (disabled || !inViewport) return;

    const container = scrollRef.current;
    const savedScrollTop = scrollPositionsRef.current[currentMemoryKey] || 0;

    if (!container || savedScrollTop <= restoreThreshold) return;
    if (container.scrollTop > resetThreshold) return;
    if (container.scrollHeight <= container.clientHeight + resetThreshold) {
      return;
    }

    let applyFrame = 0;
    let resetFrame = 0;

    applyFrame = requestAnimationFrame(() => {
      const currentContainer = scrollRef.current;
      if (!currentContainer) return;

      const nextScrollTop = scrollPositionsRef.current[currentMemoryKey] || 0;
      if (nextScrollTop <= restoreThreshold) return;
      if (currentContainer.scrollTop > resetThreshold) return;
      if (
        currentContainer.scrollHeight <=
        currentContainer.clientHeight + resetThreshold
      ) {
        return;
      }

      const maxScrollTop = Math.max(
        0,
        currentContainer.scrollHeight - currentContainer.clientHeight,
      );
      const targetScrollTop = Math.min(nextScrollTop, maxScrollTop);

      isRestoringRef.current = true;
      currentContainer.scrollTop = targetScrollTop;
      scrollPositionsRef.current[currentMemoryKey] = targetScrollTop;

      resetFrame = requestAnimationFrame(() => {
        isRestoringRef.current = false;
      });
    });

    return () => {
      cancelAnimationFrame(applyFrame);
      cancelAnimationFrame(resetFrame);
    };
  }, [
    currentMemoryKey,
    disabled,
    inViewport,
    resetThreshold,
    restoreThreshold,
  ]);

  return {
    scrollRef,
    saveCurrentScrollTop,
  } as const;
}

export default useMemoryScrollRestoration;
