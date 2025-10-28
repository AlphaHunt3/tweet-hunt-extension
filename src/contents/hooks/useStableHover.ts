import { useEffect, useState } from 'react';
import { useDebounce, useDebounceFn } from 'ahooks';
import { useGlobalResize } from './useGlobalResize';
import { useGlobalScroll } from './useGlobalScroll';

// 只获取当前元素自身的文本内容（不包含子元素）
function getDirectTextContent(el: HTMLElement): string {
  return Array.from(el.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || '')
    .join('')
    .trim();
}

export function useStableHover(delay = 800) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const elementDebounce = useDebounce(element, { wait: 100 });
  const textContentDebounce = useDebounce(textContent, { wait: 100 });
  const rectDebounce = useDebounce(rect, { wait: 100 });

  const updateHoveredElement = (e: MouseEvent) => {
    const target = document.elementFromPoint(e.clientX, e.clientY);

    if (target instanceof HTMLElement) {
      setElement(target);
      setTextContent(getDirectTextContent(target));
      setRect(target.getBoundingClientRect());
    } else {
      setElement(null);
      setTextContent('');
      setRect(null);
    }
  };

  const { run: debouncedUpdate } = useDebounceFn(updateHoveredElement, {
    wait: delay,
    maxWait: 1000,
  });

  useEffect(() => {
    let rafId: number | null = null;
    let lastExecuteTime = 0;
    const throttleDelay = 100; // 节流：每 100ms 最多执行一次

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();

      // 节流：如果距离上次执行时间不足 100ms，取消之前的 rAF 并重新调度
      if (now - lastExecuteTime < throttleDelay) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
      }

      // 使用 requestAnimationFrame 确保在浏览器下一帧更新
      rafId = requestAnimationFrame(() => {
        const currentTime = Date.now();
        if (currentTime - lastExecuteTime >= throttleDelay) {
          lastExecuteTime = currentTime;
          debouncedUpdate(e);
        }
        rafId = null;
      });
    };

    // 使用 passive listener 提升性能（mousemove 不需要阻止默认行为）
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [debouncedUpdate]);

  // Use global scroll listener (shared across all components for better performance)
  useGlobalScroll(() => {
    if (element) {
      setRect(element.getBoundingClientRect());
    }
  }, [element]);

  // Use global resize listener (shared across all components)
  useGlobalResize(() => {
    if (element) {
      setRect(element.getBoundingClientRect());
    }
  }, [element]);

  return {
    element: elementDebounce,
    textContent: textContentDebounce,
    rect: rectDebounce,
  };
}
