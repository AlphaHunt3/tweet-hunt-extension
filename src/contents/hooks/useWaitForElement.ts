import { useState, useEffect } from 'react';

// Module-level variables for shared ResizeObserver
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
      resizeCallbacks.forEach(callback => callback());
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

/**
 * Custom Hook: Wait for a specific DOM element to appear
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
    let observer: MutationObserver | null = null;
    let timeoutId: number | undefined;
    let isActive = true; // Flag to prevent state updates after unmount

    // Function to check for the element
    const checkForElement = () => {
      if (!isActive) return false;

      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        setElement(el);
        return true;
      }
      return false;
    };

    // Initial check
    if (checkForElement()) {
      return;
    }

    // Set up MutationObserver to watch for DOM changes
    observer = new MutationObserver(() => {
      if (checkForElement()) {
        observer?.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Set up timeout mechanism
    if (timeout > 0) {
      timeoutId = window.setTimeout(() => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      }, timeout);
    }

    // Set up resize handler
    const handleResize = () => {
      // Check if current element is still in document
      if (element && !isElementInDocument(element)) {
        // Element is no longer in document, try to find it again
        checkForElement();
      } else if (!element) {
        // No element found yet, try again
        checkForElement();
      }
    };

    // Add resize callback
    const removeResizeCallback = addResizeCallback(handleResize);

    // Cleanup function
    return () => {
      isActive = false;

      if (observer) {
        observer.disconnect();
      }

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // Remove resize callback
      removeResizeCallback();
      setElement(null);
    };
  }, [selector, timeout, ...deps]);

  return element;
}

export default useWaitForElement;
