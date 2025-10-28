import { useState, useEffect } from 'react';

// ==================== Shared ResizeObserver ====================
let resizeObserver: ResizeObserver | null = null;
let resizeCallbacks: Set<() => void> = new Set();
let resizeTimeoutId: number | null = null;

/**
 * Initialize global resize observer that's shared across all hook instances
 */
const initGlobalResizeObserver = () => {
  if (resizeObserver) return;

  resizeObserver = new ResizeObserver(() => {
    // Use 1 second debounce for window size changes
    if (resizeTimeoutId !== null) {
      window.clearTimeout(resizeTimeoutId);
    }

    resizeTimeoutId = window.setTimeout(() => {
      resizeCallbacks.forEach((callback) => callback());
      resizeTimeoutId = null;
    }, 1000); // 1 second debounce
  });

  // Observe the entire viewport
  resizeObserver.observe(document.documentElement);
};

/**
 * Clean up global resize observer
 */
const cleanupGlobalResizeObserver = () => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
    resizeCallbacks.clear();

    if (resizeTimeoutId !== null) {
      window.clearTimeout(resizeTimeoutId);
      resizeTimeoutId = null;
    }
  }
};

/**
 * Add a resize callback function
 */
const addResizeCallback = (callback: () => void) => {
  resizeCallbacks.add(callback);

  // Ensure global observer is initialized
  initGlobalResizeObserver();

  return () => {
    resizeCallbacks.delete(callback);

    // If no callbacks left, clean up the observer
    if (resizeCallbacks.size === 0) {
      cleanupGlobalResizeObserver();
    }
  };
};

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
}

// Global shared MutationObserver
let globalMutationObserver: MutationObserver | null = null;
let subscriptions: Map<string, Subscription[]> = new Map();
let mutationDebounceId: number | null = null;
let elementCache: Map<string, HTMLElement | null> = new Map();

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
 * Process all subscriptions (debounced)
 */
const processSubscriptions = () => {
  if (mutationDebounceId !== null) {
    window.clearTimeout(mutationDebounceId);
  }

  // Debounce for 16ms (~1 frame)
  mutationDebounceId = window.setTimeout(() => {
    // Batch process all selectors
    subscriptions.forEach((subs, selector) => {
      const element = checkSelector(selector);

      if (element) {
        // Notify all callbacks for this selector
        subs.forEach((sub) => {
          try {
            sub.callback(element);
          } catch (error) {
            console.error('Error in element callback:', error);
          }
        });
      }
    });

    mutationDebounceId = null;
  }, 16); // ~1 animation frame delay
};

/**
 * Initialize global MutationObserver
 */
const initGlobalMutationObserver = () => {
  if (globalMutationObserver) return;

  globalMutationObserver = new MutationObserver((mutations) => {
    // Only process if there are actual changes
    const hasRelevantChanges = mutations.some(
      (mutation) =>
        mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0
    );

    if (hasRelevantChanges) {
      processSubscriptions();
    }
  });

  globalMutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

/**
 * Clean up global MutationObserver
 */
const cleanupGlobalMutationObserver = () => {
  if (globalMutationObserver) {
    globalMutationObserver.disconnect();
    globalMutationObserver = null;
  }

  if (mutationDebounceId !== null) {
    window.clearTimeout(mutationDebounceId);
    mutationDebounceId = null;
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
  };

  // Set up timeout if specified
  if (timeout && timeout > 0) {
    subscription.timeoutId = window.setTimeout(() => {
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

  useEffect(() => {
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

    // Add resize callback
    const removeResizeCallback = addResizeCallback(handleResize);

    // Cleanup function
    return () => {
      isActive = false;
      elementFound = false;
      unsubscribe();
      removeResizeCallback();
      setElement(null);
    };
  }, [selector, timeout, ...deps]);

  return element;
}

export default useWaitForElement;
