import { useEffect } from 'react';

/**
 * Global Shared Window Scroll Manager
 *
 * Performance optimization: Instead of each component adding its own scroll listener,
 * we use a single global listener and distribute events to all subscribers.
 *
 * Benefits:
 * - Only ONE window scroll listener for the entire app
 * - Automatic throttling to prevent excessive callbacks
 * - Auto cleanup when no subscribers left
 */

// Global state
let scrollCallbacks: Set<() => void> = new Set();
let scrollThrottleId: number | null = null;
let isListenerAttached = false;

// Default throttle time (16ms = ~1 frame for smooth updates)
const DEFAULT_THROTTLE_MS = 16;
let lastScrollTime = 0;

/**
 * Global scroll handler - called once per scroll event
 */
const globalScrollHandler = () => {
  const now = Date.now();

  // Throttle: only execute if enough time has passed
  if (scrollThrottleId !== null || now - lastScrollTime < DEFAULT_THROTTLE_MS) {
    return;
  }

  lastScrollTime = now;

  // Use requestAnimationFrame for smooth updates
  scrollThrottleId = window.requestAnimationFrame(() => {
    // Notify all subscribers
    scrollCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('[useGlobalScroll] Error in scroll callback:', error);
      }
    });

    scrollThrottleId = null;
  });
};

/**
 * Initialize global scroll listener
 */
const initGlobalScrollListener = () => {
  if (isListenerAttached) return;

  // Use capture phase to catch all scroll events (including from child elements)
  window.addEventListener('scroll', globalScrollHandler, true);
  isListenerAttached = true;
};

/**
 * Cleanup global scroll listener
 */
const cleanupGlobalScrollListener = () => {
  if (!isListenerAttached) return;

  window.removeEventListener('scroll', globalScrollHandler, true);
  isListenerAttached = false;

  // Clear any pending animation frame
  if (scrollThrottleId !== null) {
    window.cancelAnimationFrame(scrollThrottleId);
    scrollThrottleId = null;
  }
};

/**
 * Subscribe to global scroll events
 * @param callback - Function to call when window is scrolled
 * @returns Unsubscribe function
 */
export const subscribeToScroll = (callback: () => void): (() => void) => {
  // Add callback to set
  scrollCallbacks.add(callback);

  // Initialize listener if not already attached
  initGlobalScrollListener();

  // Return unsubscribe function
  return () => {
    scrollCallbacks.delete(callback);

    // Cleanup listener if no subscribers left
    if (scrollCallbacks.size === 0) {
      cleanupGlobalScrollListener();
    }
  };
};

/**
 * React Hook: Subscribe to global window scroll events
 *
 * @param callback - Function to call when window is scrolled
 * @param deps - Dependency array (similar to useEffect)
 *
 * @example
 * ```tsx
 * useGlobalScroll(() => {
 *   console.log('Window scrolled!');
 *   // Update your component state/layout
 * }, []);
 * ```
 */
export const useGlobalScroll = (
  callback: () => void,
  deps: React.DependencyList = []
) => {
  useEffect(() => {
    // Subscribe to scroll events
    const unsubscribe = subscribeToScroll(callback);

    // Cleanup on unmount
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/**
 * Get current subscriber count (for debugging)
 */
export const getScrollSubscriberCount = (): number => {
  return scrollCallbacks.size;
};

/**
 * Check if global listener is active (for debugging)
 */
export const isScrollListenerActive = (): boolean => {
  return isListenerAttached;
};

export default useGlobalScroll;
