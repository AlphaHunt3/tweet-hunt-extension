import { useState } from 'react';
import { useDebounceEffect } from 'ahooks';
import { subscribeToResize } from './useGlobalResize';
import { subscribeToMutation } from './useGlobalMutationObserver';

/**
 * Check if an element is still in the document
 */
const isElementInDocument = (element: HTMLElement | null): boolean => {
  return !!(element && document.body.contains(element));
};

// ==================== Shared MutationObserver ====================
type ElementCallback = (element: HTMLElement) => void;

interface Subscription {
  selector: string;
  callback: ElementCallback;
  timeout?: number;
  timeoutId?: number;
  lastFoundElement: HTMLElement | null; // 记录上次找到的元素，避免重复通知
}

// Global shared subscriptions and cache
let subscriptions: Map<string, Subscription[]> = new Map();
let elementCache: Map<string, HTMLElement | null> = new Map();
let mutationUnsubscribe: (() => void) | null = null;

/**
 * Check all subscriptions for a specific selector
 */
const checkSelector = (selector: string): HTMLElement | null => {
  // Check cache first
  const cachedElement = elementCache.get(selector);
  if (cachedElement && isElementInDocument(cachedElement)) {
    return cachedElement;
  }

  // Query the DOM
  const element = document.querySelector(selector) as HTMLElement | null;

  // Update cache
  if (element) {
    elementCache.set(selector, element);
  } else {
    elementCache.delete(selector);
  }

  return element;
};

/**
 * Process all subscriptions (使用 requestAnimationFrame 替代 setTimeout)
 */
let processAnimationFrameId: number | null = null;
const processSubscriptions = () => {
  // 如果已经有待执行的 frame，跳过（避免重复执行）
  if (processAnimationFrameId !== null) {
    return;
  }

  // 使用 requestAnimationFrame 在浏览器下一次重绘之前执行
  // 优势：与渲染周期同步，页面不可见时自动暂停，性能更好
  processAnimationFrameId = window.requestAnimationFrame(() => {
    // Batch process all selectors
    subscriptions.forEach((subs, selector) => {
      const element = checkSelector(selector);

      if (element) {
        // Notify all callbacks for this selector
        subs.forEach((sub) => {
          // 性能优化：如果找到的元素和上次一样，不重复通知
          if (sub.lastFoundElement === element) {
            return;
          }

          try {
            sub.callback(element);
            // 记录本次找到的元素
            sub.lastFoundElement = element;
          } catch (error) {
            console.error('Error in element callback:', error);
          }
        });
      } else {
        // 元素不存在，清除记录
        subs.forEach((sub) => {
          sub.lastFoundElement = null;
        });
      }
    });

    processAnimationFrameId = null;
  });
};

/**
 * Initialize global MutationObserver (使用全局 MutationObserver)
 */
const initGlobalMutationObserver = () => {
  if (mutationUnsubscribe) return;

  // 使用全局 MutationObserver
  mutationUnsubscribe = subscribeToMutation(
    (mutations) => {
      // Only process if there are actual changes
      const hasRelevantChanges = mutations.some(
        (mutation) =>
          mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0
      );

      if (hasRelevantChanges) {
        processSubscriptions();
      }
    },
    {
      childList: true,
      subtree: true,
    },
    {
      filter: (mutation) => mutation.type === 'childList',
      debugName: 'useWaitForElement',
    }
  );
};

/**
 * Clean up global MutationObserver
 */
const cleanupGlobalMutationObserver = () => {
  if (mutationUnsubscribe) {
    mutationUnsubscribe();
    mutationUnsubscribe = null;
  }

  if (processAnimationFrameId !== null) {
    window.cancelAnimationFrame(processAnimationFrameId);
    processAnimationFrameId = null;
  }

  subscriptions.clear();
  elementCache.clear();
};

/**
 * Subscribe to element appearance
 */
const subscribeToElement = (
  selector: string,
  callback: ElementCallback,
  timeout?: number
): (() => void) => {
  // Create subscription object
  const subscription: Subscription = {
    selector,
    callback,
    timeout,
    lastFoundElement: null, // 初始化时没有找到元素
  };

  // Set up timeout if specified
  // 注意：超时机制仍然有意义，用于防止无限等待元素出现
  // 但如果元素已经找到（通过 lastFoundElement 判断），超时会被取消（在 unsubscribe 中）
  if (timeout && timeout > 0) {
    subscription.timeoutId = window.setTimeout(() => {
      // 超时后，如果还没找到元素，取消订阅
      // 注意：如果已经找到元素，unsubscribe 会清除这个 timeout
      unsubscribe();
    }, timeout);
  }

  // Add to subscriptions map
  if (!subscriptions.has(selector)) {
    subscriptions.set(selector, []);
  }
  subscriptions.get(selector)!.push(subscription);

  // Initialize global observer
  initGlobalMutationObserver();

  // Check immediately
  const element = checkSelector(selector);
  if (element) {
    // Use setTimeout to avoid sync issues
    setTimeout(() => {
      try {
        callback(element);
        // 记录立即找到的元素
        subscription.lastFoundElement = element;
      } catch (error) {
        console.error('Error in element callback:', error);
      }
    }, 0);
  }

  // Return unsubscribe function
  const unsubscribe = () => {
    // Clear timeout
    if (subscription.timeoutId !== undefined) {
      window.clearTimeout(subscription.timeoutId);
    }

    // Remove from subscriptions
    const subs = subscriptions.get(selector);
    if (subs) {
      const index = subs.indexOf(subscription);
      if (index > -1) {
        subs.splice(index, 1);
      }

      // Clean up selector if no more subscriptions
      if (subs.length === 0) {
        subscriptions.delete(selector);
        elementCache.delete(selector);
      }
    }

    // Clean up global observer if no more subscriptions
    if (subscriptions.size === 0) {
      cleanupGlobalMutationObserver();
    }
  };

  return unsubscribe;
};

/**
 * Custom Hook: Wait for a specific DOM element to appear (Optimized Version)
 * Uses shared MutationObserver and caching for better performance when multiple instances are active
 *
 * @param selector - CSS selector to search for
 * @param deps - Optional dependency array
 * @param timeout - Wait timeout in milliseconds, default is 10000ms
 * @returns Matched HTMLElement or null
 */
function useWaitForElement(
  selector: string,
  deps: any[] = [],
  timeout = 10000
): HTMLElement | null {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useDebounceEffect(
    () => {
      let isActive = true; // Flag to prevent state updates after unmount
      let elementFound = false;

      // Callback when element is found
      const handleElementFound = (el: HTMLElement) => {
        if (!isActive || elementFound) return;

        elementFound = true;
        setElement(el);

        // Unsubscribe after finding element
        unsubscribe();
      };

      // Subscribe to element changes using shared observer
      const unsubscribe = subscribeToElement(
        selector,
        handleElementFound,
        timeout
      );

      // Set up resize handler to re-check if element disappears
      const handleResize = () => {
        if (!isActive) return;

        // Check if current element is still in document
        if (element && !isElementInDocument(element)) {
          // Element is no longer in document, clear state
          setElement(null);
          elementFound = false;
        } else if (!element) {
          // No element found yet, try to find it
          const el = checkSelector(selector);
          if (el) {
            handleElementFound(el);
          }
        }
      };

      // 使用全局 Resize 监听（替换原来的 ResizeObserver）
      // 注意：useGlobalResize 监听的是 window resize 事件，功能类似
      const removeResizeCallback = subscribeToResize(handleResize);

      // Cleanup function
      return () => {
        isActive = false;
        elementFound = false;
        unsubscribe();
        removeResizeCallback();
        setElement(null);
      };
    },
    [selector, timeout, ...deps],
    { wait: 100 }
  );

  return element;
}

export default useWaitForElement;
