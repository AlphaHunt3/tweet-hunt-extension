import { useEffect } from 'react';

/**
 * Global Shared Window Resize Manager
 *
 * Performance optimization: Instead of each component adding its own resize listener,
 * we use a single global listener and distribute events to all subscribers.
 *
 * Benefits:
 * - Only ONE window resize listener for the entire app
 * - Automatic debouncing to prevent excessive callbacks
 * - Auto cleanup when no subscribers left
 */

// Global state
let resizeCallbacks: Set<() => void> = new Set();
let resizeDebounceId: number | null = null;
let isListenerAttached = false;

// Default debounce time (can be customized)
const DEFAULT_DEBOUNCE_MS = 100;

/**
 * Global resize handler - called once per resize event
 */
const globalResizeHandler = () => {
  // Clear existing debounce
  if (resizeDebounceId !== null) {
    window.clearTimeout(resizeDebounceId);
  }

  // Debounce: wait for resize to settle before notifying subscribers
  resizeDebounceId = window.setTimeout(() => {
    // Notify all subscribers
    resizeCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('[useGlobalResize] Error in resize callback:', error);
      }
    });

    resizeDebounceId = null;
  }, DEFAULT_DEBOUNCE_MS);
};

/**
 * Initialize global resize listener
 */
const initGlobalResizeListener = () => {
  if (isListenerAttached) return;

  window.addEventListener('resize', globalResizeHandler);
  isListenerAttached = true;
};

/**
 * Cleanup global resize listener
 */
const cleanupGlobalResizeListener = () => {
  if (!isListenerAttached) return;

  window.removeEventListener('resize', globalResizeHandler);
  isListenerAttached = false;

  // Clear any pending debounce
  if (resizeDebounceId !== null) {
    window.clearTimeout(resizeDebounceId);
    resizeDebounceId = null;
  }
};

/**
 * Subscribe to global resize events
 * @param callback - Function to call when window is resized
 * @returns Unsubscribe function
 */
export const subscribeToResize = (callback: () => void): (() => void) => {
  // Add callback to set
  resizeCallbacks.add(callback);

  // Initialize listener if not already attached
  initGlobalResizeListener();

  // Return unsubscribe function
  return () => {
    resizeCallbacks.delete(callback);

    // Cleanup listener if no subscribers left
    if (resizeCallbacks.size === 0) {
      cleanupGlobalResizeListener();
    }
  };
};

/**
 * React Hook: Subscribe to global window resize events
 *
 * @param callback - Function to call when window is resized
 * @param deps - Dependency array (similar to useEffect)
 *
 * @example
 * ```tsx
 * useGlobalResize(() => {
 *   console.log('Window resized!');
 *   // Update your component state/layout
 * }, []);
 * ```
 */
export const useGlobalResize = (
  callback: () => void,
  deps: React.DependencyList = []
) => {
  useEffect(() => {
    // Subscribe to resize events
    const unsubscribe = subscribeToResize(callback);

    // Optionally call callback immediately on mount
    // callback();

    // Cleanup on unmount
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/**
 * Get current subscriber count (for debugging)
 */
export const getResizeSubscriberCount = (): number => {
  return resizeCallbacks.size;
};

/**
 * Check if global listener is active (for debugging)
 */
export const isResizeListenerActive = (): boolean => {
  return isListenerAttached;
};

export default useGlobalResize;
