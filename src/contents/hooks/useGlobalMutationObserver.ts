import { useEffect } from 'react';

/**
 * Global Shared MutationObserver Manager
 *
 * Performance optimization: Instead of each component creating its own MutationObserver,
 * we use a single global observer on document.body and distribute events to all subscribers.
 *
 * Benefits:
 * - Only ONE MutationObserver instance for the entire app
 * - Browser only needs to process DOM changes once
 * - Automatic debouncing/throttling support
 * - Auto cleanup when no subscribers left
 */

// Global state
type MutationCallback = (mutations: MutationRecord[]) => void;

interface Subscription {
  id: string;
  callback: MutationCallback;
  observerOptions: MutationObserverInit; // 存储每个订阅者的原始配置
  subscriptionOptions?: {
    debounce?: number; // 防抖时间（ms）
    throttle?: number; // 节流时间（ms）
    filter?: (mutation: MutationRecord) => boolean; // 自定义过滤函数，对每个 mutation 进行过滤
  };
  // 调试信息
  debugInfo?: {
    name?: string; // 订阅者名称（可选，用于调试）
    stack?: string; // 调用栈（可选，用于调试）
  };
}

let globalObserver: MutationObserver | null = null;
let subscriptions: Set<Subscription> = new Set();
let isObserverActive = false;

// 合并所有订阅者需要的配置选项（取并集）
let mergedOptions: MutationObserverInit = {
  childList: false,
  subtree: false,
  attributes: false,
  attributeOldValue: false,
  attributeFilter: undefined,
  characterData: false,
  characterDataOldValue: false,
};

// 防抖/节流相关（每个订阅者独立管理）
interface SubscriberDebounceState {
  subscriptionId: string;
  debounceId: number | null;
  throttleId: number | null;
  lastThrottleTime: number;
}

const subscriberDebounceStates = new Map<string, SubscriberDebounceState>();

// 全局的 requestAnimationFrame ID（用于无防抖/节流的订阅者）
let globalThrottleId: number | null = null;

/**
 * 合并配置选项（取并集）
 */
const mergeOptions = (newOptions: MutationObserverInit): void => {
  mergedOptions = {
    childList: mergedOptions.childList || newOptions.childList || false,
    subtree: mergedOptions.subtree || newOptions.subtree || false,
    attributes: mergedOptions.attributes || newOptions.attributes || false,
    attributeOldValue:
      mergedOptions.attributeOldValue || newOptions.attributeOldValue || false,
    characterData:
      mergedOptions.characterData || newOptions.characterData || false,
    characterDataOldValue:
      mergedOptions.characterDataOldValue ||
      newOptions.characterDataOldValue ||
      false,
    // attributeFilter 合并去重
    attributeFilter: newOptions.attributeFilter
      ? [
          ...(mergedOptions.attributeFilter || []),
          ...newOptions.attributeFilter,
        ].filter((v, i, a) => a.indexOf(v) === i)
      : mergedOptions.attributeFilter,
  };
};

/**
 * 重新计算合并后的配置（当订阅者变化时）
 */
const recalculateMergedOptions = (): void => {
  // 重置为默认值
  mergedOptions = {
    childList: false,
    subtree: false,
    attributes: false,
    attributeOldValue: false,
    attributeFilter: undefined,
    characterData: false,
    characterDataOldValue: false,
  };

  // 重新合并所有订阅者的配置
  subscriptions.forEach((sub) => {
    mergeOptions(sub.observerOptions);
  });
};

/**
 * 通知单个订阅者（内部函数）
 */
const notifySingleSubscriber = (
  sub: Subscription,
  mutations: MutationRecord[]
): void => {
  try {
    // 应用自定义过滤
    let filteredMutations = mutations;
    if (sub.subscriptionOptions?.filter) {
      filteredMutations = mutations.filter((mutation) =>
        sub.subscriptionOptions!.filter!(mutation)
      );
      if (filteredMutations.length === 0) {
        return;
      }
    }

    sub.callback(filteredMutations);
  } catch (error) {
    console.error(
      `[GlobalMutationObserver] ❌ 订阅者回调错误:`,
      sub.debugInfo?.name || sub.id,
      error
    );
  }
};

/**
 * 通知所有订阅者（立即执行，不应用防抖/节流）
 */
const notifySubscribersImmediate = (mutations: MutationRecord[]): void => {
  const totalMutations = mutations.length;
  const subscriberCount = subscriptions.size;

  if (subscriberCount === 0) {
    return;
  }

  subscriptions.forEach((sub) => {
    // 只通知不需要防抖/节流的订阅者
    const hasDebounce = sub.subscriptionOptions?.debounce !== undefined;
    const hasThrottle = sub.subscriptionOptions?.throttle !== undefined;

    if (hasDebounce || hasThrottle) {
      // 这个订阅者需要防抖/节流，跳过
      return;
    }

    // 应用自定义过滤
    let filteredMutations = mutations;
    if (sub.subscriptionOptions?.filter) {
      filteredMutations = mutations.filter((mutation) =>
        sub.subscriptionOptions!.filter!(mutation)
      );
      if (filteredMutations.length === 0) {
        return;
      }
    }

    notifySingleSubscriber(sub, filteredMutations);
  });
};

/**
 * 处理需要防抖的订阅者
 */
const handleDebouncedSubscribers = (
  mutations: MutationRecord[],
  mutationsSnapshot: MutationRecord[]
): void => {
  subscriptions.forEach((sub) => {
    const debounceTime = sub.subscriptionOptions?.debounce;
    if (debounceTime === undefined) return;

    // 获取或创建该订阅者的防抖状态
    let state = subscriberDebounceStates.get(sub.id);
    if (!state) {
      state = {
        subscriptionId: sub.id,
        debounceId: null,
        throttleId: null,
        lastThrottleTime: 0,
      };
      subscriberDebounceStates.set(sub.id, state);
    }

    // 清除之前的防抖定时器
    if (state.debounceId !== null) {
      window.clearTimeout(state.debounceId);
    }

    // 设置新的防抖定时器
    const currentState = state; // 保存引用
    state.debounceId = window.setTimeout(() => {
      notifySingleSubscriber(sub, mutationsSnapshot);
      if (currentState) {
        currentState.debounceId = null;
      }
    }, debounceTime);
  });
};

/**
 * 处理需要节流的订阅者
 */
const handleThrottledSubscribers = (
  mutations: MutationRecord[],
  mutationsSnapshot: MutationRecord[]
): void => {
  subscriptions.forEach((sub) => {
    const throttleTime = sub.subscriptionOptions?.throttle;
    if (throttleTime === undefined) return;

    // 获取或创建该订阅者的节流状态
    let state = subscriberDebounceStates.get(sub.id);
    if (!state) {
      state = {
        subscriptionId: sub.id,
        debounceId: null,
        throttleId: null,
        lastThrottleTime: 0,
      };
      subscriberDebounceStates.set(sub.id, state);
    }

    const now = Date.now();
    if (
      state.throttleId === null &&
      now - state.lastThrottleTime >= throttleTime
    ) {
      state.lastThrottleTime = now;
      const currentState = state; // 保存引用
      state.throttleId = window.requestAnimationFrame(() => {
        notifySingleSubscriber(sub, mutationsSnapshot);
        if (currentState) {
          currentState.throttleId = null;
        }
      });
    }
  });
};

/**
 * 处理 mutations（每个订阅者独立处理防抖/节流）
 */
const handleMutations = (mutations: MutationRecord[]): void => {
  const mutationsCount = mutations.length;
  const mutationTypes = new Set(mutations.map((m) => m.type));

  // 创建 mutations 的快照（用于防抖/节流时使用）
  const mutationsSnapshot = [...mutations];

  // 统计需要防抖/节流的订阅者
  const debouncedCount = Array.from(subscriptions).filter(
    (sub) => sub.subscriptionOptions?.debounce !== undefined
  ).length;
  const throttledCount = Array.from(subscriptions).filter(
    (sub) => sub.subscriptionOptions?.throttle !== undefined
  ).length;

  // 1. 立即通知不需要防抖/节流的订阅者
  notifySubscribersImmediate(mutations);

  // 2. 处理需要防抖的订阅者（独立处理）
  if (debouncedCount > 0) {
    handleDebouncedSubscribers(mutations, mutationsSnapshot);
  }

  // 3. 处理需要节流的订阅者（独立处理）
  if (throttledCount > 0) {
    handleThrottledSubscribers(mutations, mutationsSnapshot);
  }
};

/**
 * 初始化全局 MutationObserver
 */
const initGlobalObserver = (options: MutationObserverInit): void => {
  if (isObserverActive && globalObserver) {
    // 如果配置变化，需要重新观察
    globalObserver.disconnect();
    // 观察 documentElement 而不是 body，这样可以同时监听到 documentElement 本身和 body 子树的变化
    globalObserver.observe(document.documentElement, mergedOptions);
    return;
  }

  if (globalObserver) return;



  globalObserver = new MutationObserver((mutations) => {
    if (mutations.length === 0) return;

    // 使用 requestAnimationFrame 将处理推迟到浏览器下一次重绘之前
    // 这样可以避免在 DOM 变化的高频期间阻塞主线程
    if (globalThrottleId === null) {
      // 创建 mutations 的快照（因为 mutations 数组在回调结束后可能会被重用）
      const mutationsSnapshot = Array.from(mutations);

      globalThrottleId = window.requestAnimationFrame(() => {
        handleMutations(mutationsSnapshot);
        globalThrottleId = null;
      });
    } else {
      // 如果已经有待执行的 frame，说明浏览器还没重绘
      // 这里可以选择合并 mutations 或者跳过，为了简化，我们跳过本次
      // 因为下一次 frame 会处理最新的 DOM 状态
    }
  });

  // 观察 documentElement 而不是 body，这样可以同时监听到 documentElement 本身和 body 子树的变化
  // 因为 body 是 documentElement 的子元素，设置 subtree: true 后可以监听到所有变化
  globalObserver.observe(document.documentElement, mergedOptions);
  isObserverActive = true;
};

/**
 * 清理全局 MutationObserver
 */
const cleanupGlobalObserver = (): void => {
  if (!globalObserver || !isObserverActive) return;



  globalObserver.disconnect();
  globalObserver = null;
  isObserverActive = false;

  // 清理所有订阅者的防抖/节流状态
  subscriberDebounceStates.forEach((state) => {
    if (state.debounceId !== null) {
      window.clearTimeout(state.debounceId);
    }
    if (state.throttleId !== null) {
      window.cancelAnimationFrame(state.throttleId);
    }
  });
  subscriberDebounceStates.clear();

  // 清理全局的 requestAnimationFrame
  if (globalThrottleId !== null) {
    window.cancelAnimationFrame(globalThrottleId);
    globalThrottleId = null;
  }

  // 重置配置
  mergedOptions = {
    childList: false,
    subtree: false,
    attributes: false,
    attributeOldValue: false,
    attributeFilter: undefined,
    characterData: false,
    characterDataOldValue: false,
  };
};

/**
 * 订阅全局 MutationObserver（核心函数）
 *
 * 这是一个纯函数，不依赖 React，可以在任何地方使用：
 * - 在 hooks 内部使用（推荐）
 * - 在普通函数中使用
 * - 在类组件中使用
 *
 * @param callback - 回调函数，接收 mutations 数组
 * @param observerOptions - MutationObserver 配置选项（会被合并到全局配置）
 * @param subscriptionOptions - 订阅选项（防抖/节流/过滤）
 * @returns 取消订阅函数
 *
 * @example
 * // 在 hooks 内部使用（推荐）
 * ```ts
 * useEffect(() => {
 *   const unsubscribe = subscribeToMutation(
 *     (mutations) => {
 *       // 处理变化
 *       console.log('DOM changed:', mutations);
 *     },
 *     { childList: true, subtree: true },
 *     { debounce: 100 }
 *   );
 *
 *   return unsubscribe; // 清理函数
 * }, []);
 * ```
 *
 * @example
 * // 在普通函数中使用
 * ```ts
 * function setupObserver() {
 *   return subscribeToMutation(
 *     (mutations) => {
 *       console.log('DOM changed');
 *     },
 *     { childList: true, subtree: true }
 *   );
 * }
 * ```
 */
export const subscribeToMutation = (
  callback: MutationCallback,
  observerOptions: MutationObserverInit = {
    childList: true,
    subtree: true,
  },
  subscriptionOptions?: {
    debounce?: number;
    throttle?: number;
    filter?: (mutation: MutationRecord) => boolean;
    debugName?: string; // 可选的调试名称
  }
): (() => void) => {
  // 生成唯一 ID
  const id = `${Date.now()}-${Math.random()}`;

  // 获取调用栈（用于调试）
  const stack = new Error().stack;

  // 创建订阅
  const subscription: Subscription = {
    id,
    callback,
    observerOptions,
    subscriptionOptions: subscriptionOptions
      ? {
          debounce: subscriptionOptions.debounce,
          throttle: subscriptionOptions.throttle,
          filter: subscriptionOptions.filter,
        }
      : undefined,
    debugInfo: {
      name: subscriptionOptions?.debugName,
      stack: stack?.split('\n').slice(2, 5).join('\n'), // 只保留前几行调用栈
    },
  };

  const debugName = subscriptionOptions?.debugName || `订阅者-${id.slice(-6)}`;



  // 添加到订阅列表
  subscriptions.add(subscription);

  // 合并配置选项
  mergeOptions(observerOptions);

  // 初始化或更新观察器
  initGlobalObserver(mergedOptions);

  // 返回取消订阅函数
  return () => {


    subscriptions.delete(subscription);

    // 清理该订阅者的防抖/节流状态
    const state = subscriberDebounceStates.get(id);
    if (state) {
      if (state.debounceId !== null) {
        window.clearTimeout(state.debounceId);
      }
      if (state.throttleId !== null) {
        window.cancelAnimationFrame(state.throttleId);
      }
      subscriberDebounceStates.delete(id);
    }

    // 如果还有订阅者，需要重新计算配置并更新观察器
    if (subscriptions.size > 0) {
      recalculateMergedOptions();
      // 更新观察器配置
      if (globalObserver && isObserverActive) {
        globalObserver.disconnect();
        globalObserver.observe(document.documentElement, mergedOptions);
      }
    } else {
      // 没有订阅者了，清理观察器
      cleanupGlobalObserver();
    }
  };
};

/**
 * React Hook: 订阅全局 MutationObserver
 *
 * 这是一个 React Hook，只能在 React 组件或自定义 Hook 的顶层调用。
 * 内部使用 subscribeToMutation() 实现。
 *
 * 注意：如果你在自定义 Hook 内部需要使用，建议直接使用 subscribeToMutation()，
 * 因为 hooks 内部再调用 hooks 可能违反 React Hooks 规则。
 *
 * @param callback - 回调函数
 * @param observerOptions - MutationObserver 配置选项
 * @param subscriptionOptions - 订阅选项（防抖/节流/过滤）
 * @param deps - 依赖数组（类似 useEffect）
 *
 * @example
 * // 在 React 组件中使用
 * ```tsx
 * function MyComponent() {
 *   useGlobalMutationObserver(
 *     (mutations) => {
 *       console.log('DOM changed');
 *     },
 *     { childList: true, subtree: true },
 *     { debounce: 100 },
 *     []
 *   );
 *
 *   return <div>...</div>;
 * }
 * ```
 *
 * @example
 * // 在自定义 Hook 内部，建议使用 subscribeToMutation()
 * ```tsx
 * function useMyCustomHook() {
 *   useEffect(() => {
 *     // 直接使用 subscribeToMutation，而不是 useGlobalMutationObserver
 *     const unsubscribe = subscribeToMutation(
 *       (mutations) => {
 *         // 处理 mutations
 *         console.log('Mutations:', mutations);
 *       },
 *       { childList: true, subtree: true }
 *     );
 *     return unsubscribe;
 *   }, []);
 * }
 * ```
 */
export const useGlobalMutationObserver = (
  callback: MutationCallback,
  observerOptions: MutationObserverInit = {
    childList: true,
    subtree: true,
  },
  subscriptionOptions?: {
    debounce?: number;
    throttle?: number;
    filter?: (mutation: MutationRecord) => boolean;
  },
  deps: React.DependencyList = []
): void => {
  useEffect(() => {
    const unsubscribe = subscribeToMutation(
      callback,
      observerOptions,
      subscriptionOptions
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/**
 * 获取当前订阅者数量（用于调试）
 */
export const getMutationSubscriberCount = (): number => {
  return subscriptions.size;
};

/**
 * 检查全局观察器是否激活（用于调试）
 */
export const isMutationObserverActive = (): boolean => {
  return isObserverActive;
};

/**
 * 获取当前合并后的配置（用于调试）
 */
export const getMergedObserverOptions = (): MutationObserverInit => {
  return { ...mergedOptions };
};

/**
 * 获取所有订阅者的详细信息（用于调试）
 */
export const getSubscribersInfo = (): Array<{
  id: string;
  name?: string;
  observerOptions: MutationObserverInit;
  subscriptionOptions?: {
    debounce?: number;
    throttle?: number;
    hasFilter: boolean;
  };
}> => {
  return Array.from(subscriptions).map((sub) => ({
    id: sub.id,
    name: sub.debugInfo?.name,
    observerOptions: sub.observerOptions,
    subscriptionOptions: sub.subscriptionOptions
      ? {
          debounce: sub.subscriptionOptions.debounce,
          throttle: sub.subscriptionOptions.throttle,
          hasFilter: !!sub.subscriptionOptions.filter,
        }
      : undefined,
  }));
};

/**
 * 打印当前状态（用于调试）
 */
export const printObserverStatus = (): void => {
  console.group('[GlobalMutationObserver] 📊 当前状态');
  console.log('观察者实例:', {
    exists: !!globalObserver,
    isActive: isObserverActive,
    isUnique: true, // 确保只有一个实例
  });
  console.log('订阅者数量:', subscriptions.size);
  console.log('合并后的配置:', mergedOptions);
  console.log('所有订阅者:', getSubscribersInfo());
  console.groupEnd();
};

export default useGlobalMutationObserver;
