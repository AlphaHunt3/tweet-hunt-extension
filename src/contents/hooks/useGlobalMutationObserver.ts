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
let observerInitRetryId: number | null = null;

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
let pendingMutations: MutationRecord[] = [];

/**
 * 全局 observer 使用所有订阅配置的并集，但分发时仍必须恢复每个订阅者自己的范围。
 * 否则只订阅 childList 的挂载逻辑也会收到 attributes 变化，回写属性后可能形成反馈循环。
 */
const filterMutationsForSubscription = (
  sub: Subscription,
  mutations: MutationRecord[],
): MutationRecord[] => {
  const options = sub.observerOptions;
  return mutations.filter((mutation) => {
    if (!options.subtree && mutation.target !== document.documentElement) {
      return false;
    }
    if (mutation.type === 'childList' && !options.childList) return false;
    if (mutation.type === 'attributes') {
      if (!options.attributes) return false;
      if (
        options.attributeFilter?.length &&
        (!mutation.attributeName ||
          !options.attributeFilter.includes(mutation.attributeName))
      ) {
        return false;
      }
    }
    if (mutation.type === 'characterData' && !options.characterData) {
      return false;
    }
    if (
      sub.subscriptionOptions?.filter &&
      !sub.subscriptionOptions.filter(mutation)
    ) {
      return false;
    }
    return true;
  });
};

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
    const filteredMutations = filterMutationsForSubscription(sub, mutations);
    if (filteredMutations.length === 0) return;

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

    notifySingleSubscriber(sub, mutations);
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

    // 必须先过滤再重置防抖计时器。否则 X 的无关 DOM 更新会持续覆盖真正相关的
    // mutation，最后一次又可能被 filter 丢弃，表现为挂载点偶发永远收不到通知。
    const relevantMutations = filterMutationsForSubscription(
      sub,
      mutationsSnapshot,
    );
    if (relevantMutations.length === 0) return;

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
      notifySingleSubscriber(sub, relevantMutations);
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

    // 无关 mutation 不应占用该订阅者的节流窗口，否则紧随其后的有效变化会被跳过。
    const relevantMutations = filterMutationsForSubscription(
      sub,
      mutationsSnapshot,
    );
    if (relevantMutations.length === 0) return;

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
        notifySingleSubscriber(sub, relevantMutations);
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
const initGlobalObserver = (): void => {
  // content script 在 document_start 执行，极早期 documentElement 可能尚未建立。
  // 延迟到下一任务重试，不能静默放弃，否则之后不会再有 DOM mutation 来唤醒观察器。
  const observeTarget = document.documentElement;
  if (!(observeTarget instanceof Node)) {
    if (observerInitRetryId === null && subscriptions.size > 0) {
      observerInitRetryId = window.setTimeout(() => {
        observerInitRetryId = null;
        if (subscriptions.size > 0) initGlobalObserver();
      }, 0);
    }
    return;
  }
  if (observerInitRetryId !== null) {
    window.clearTimeout(observerInitRetryId);
    observerInitRetryId = null;
  }

  if (isObserverActive && globalObserver) {
    // 如果配置变化，需要重新观察
    globalObserver.disconnect();
    // 观察 documentElement 而不是 body，这样可以同时监听到 documentElement 本身和 body 子树的变化
    globalObserver.observe(observeTarget, mergedOptions);
    return;
  }

  if (globalObserver) return;

  globalObserver = new MutationObserver((mutations) => {
    if (mutations.length === 0) return;

    // 合并同一帧内的 mutation，避免高频 DOM 更新时跳过后续批次。
    // X 页面会分批插入头像/文本节点，直接丢弃可能导致少量元素漏处理。
    pendingMutations.push(...Array.from(mutations));

    // 使用 requestAnimationFrame 将处理推迟到浏览器下一次重绘之前
    // 这样可以避免在 DOM 变化的高频期间阻塞主线程
    if (globalThrottleId === null) {
      globalThrottleId = window.requestAnimationFrame(() => {
        const mutationsSnapshot = pendingMutations;
        pendingMutations = [];
        handleMutations(mutationsSnapshot);
        globalThrottleId = null;
      });
    }
  });

  // 观察 documentElement 而不是 body，这样可以同时监听到 documentElement 本身和 body 子树的变化
  // 因为 body 是 documentElement 的子元素，设置 subtree: true 后可以监听到所有变化
  globalObserver.observe(observeTarget, mergedOptions);
  isObserverActive = true;
};

/**
 * 清理全局 MutationObserver
 */
const cleanupGlobalObserver = (): void => {
  if (observerInitRetryId !== null) {
    window.clearTimeout(observerInitRetryId);
    observerInitRetryId = null;
  }
  globalObserver?.disconnect();
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
  pendingMutations = [];

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
  initGlobalObserver();

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
        const observeTarget = document.documentElement;
        if (observeTarget instanceof Node) {
          globalObserver.observe(observeTarget, mergedOptions);
        }
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
