import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useDebounceEffect, useLatest } from 'ahooks';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { subscribeToMutation } from './useGlobalMutationObserver';

export interface UseShadowContainerOptions {
  /** 初步查找的选择器 */
  selector: string;
  /** 可选：使用 XPath 查找基准元素（优先于 selector） */
  selectorXPath?: string;
  /** 是否需要从基准元素的同级元素中筛选目标 */
  useSiblings?: boolean;
  /**
   *  // 'beforebegin'	在目标元素 外部前面（同级）	[E] <div id="baseEl"></div>
   *  // 'afterbegin'	在目标元素 内部开头（第一个子元素）	<div id="baseEl">[E] ...</div>
   *  // 'beforeend'	在目标元素 内部末尾（最后一个子元素）	<div id="baseEl">... [E]</div>
   *  // 'afterend'	在目标元素 外部后面（同级）	<div id="baseEl"></div> [E]
   * **/
  siblingsPosition?: InsertPosition;
  /**
   * 当 useSiblings 为 true 时，用于筛选基准元素的同级元素，
   * 返回 true 表示符合要求；如果不传，则默认在 baseEl 的下一个位置新建坑位
   */
  targetFilter?: (el: Element) => boolean;
  /** 可选：当 useSiblings 为 true 时，使用 XPath 在同级元素中查找目标（优先于 targetFilter） */
  siblingsXPath?: string;
  /** 要注入到 Shadow 内部的样式文本 */
  styleText?: string;
  /** Shadow 模式：'open' 或 'closed' */
  shadowMode?: 'closed' | 'open';
  /** 防抖等待时间（ms） */
  waitTime?: number;
  /** 最大等待时间（ms），超时后停止监听 */
  maxWaitTime?: number;
  /**
   * 当 useSiblings 为 true 时，同级元素的初始化样式
   */
  siblingsStyle?: string;
  /**
   * target的初始化样式
   */
  targetStyle?: string;
  /**
   * 是否自动管理zIndex **/
  autoZIndex?: boolean;
  /**
   * Shadow 容器创建后的回调函数
   */
  onShadowCreated?: (shadowRoot: ShadowRoot, target: HTMLElement) => void;
}

// 全局 z-index 管理
interface ZIndexInstance {
  element: HTMLElement;
  originalZIndex: string;
  clickHandler: (e: Event) => void;
  mouseenterHandler: (e: Event) => void;
  instanceId: string;
}

// 模块级变量，管理所有实例
const zIndexInstances = new Map<string, ZIndexInstance>();
let activeInstanceId: string | null = null;

// 全局事件处理函数
const handleGlobalZIndexActivation = (instanceId: string) => {
  checkMainSectionAndFixZIndex();
  // 如果点击的是当前激活的实例，不做处理
  if (activeInstanceId === instanceId) return;

  // 恢复之前激活实例的 z-index
  if (activeInstanceId) {
    const prevInstance = zIndexInstances.get(activeInstanceId);
    if (prevInstance) {
      if (prevInstance.originalZIndex === 'auto') {
        prevInstance.element.style.removeProperty('z-index');
      } else {
        prevInstance.element.style.zIndex = prevInstance.originalZIndex;
      }
    }
  }

  // 设置新的激活实例
  const currentInstance = zIndexInstances.get(instanceId);
  if (currentInstance) {
    currentInstance.element.style.zIndex = '999';
    activeInstanceId = instanceId;
  }
};

// 清理指定实例
const cleanupZIndexInstance = (instanceId: string) => {
  const instance = zIndexInstances.get(instanceId);
  if (instance) {
    // 移除事件监听器
    instance.element.removeEventListener('click', instance.clickHandler);
    instance.element.removeEventListener(
      'mouseenter',
      instance.mouseenterHandler
    );

    // 如果是当前激活的实例，恢复 z-index
    if (activeInstanceId === instanceId) {
      if (instance.originalZIndex === 'auto') {
        instance.element.style.removeProperty('z-index');
      } else {
        instance.element.style.zIndex = instance.originalZIndex;
      }
      activeInstanceId = null;
    }

    // 从管理器中移除
    zIndexInstances.delete(instanceId);
  }
};

// 检查元素是否仍在文档中
const isElementInDocument = (element: HTMLElement | null): boolean => {
  return !!(element && document.body.contains(element));
};

// 全局窗口大小变化监听器
let resizeObserver: ResizeObserver | null = null;
let resizeCallbacks: Set<() => void> = new Set();
let resizeTimeoutId: number | null = null;

// 初始化全局窗口大小变化监听器
const initGlobalResizeObserver = () => {
  if (resizeObserver) return;

  resizeObserver = new ResizeObserver(() => {
    // 使用1秒防抖处理窗口大小变化
    if (resizeTimeoutId !== null) {
      window.clearTimeout(resizeTimeoutId);
    }

    resizeTimeoutId = window.setTimeout(() => {
      resizeCallbacks.forEach((callback) => callback());
      resizeTimeoutId = null;
    }, 1000); // 1秒防抖
  });

  // 监视整个视口
  resizeObserver.observe(document.documentElement);
};

// 清理全局窗口大小变化监听器
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

// 添加窗口大小变化回调
const addResizeCallback = (callback: () => void) => {
  resizeCallbacks.add(callback);

  // 确保全局监听器已初始化
  initGlobalResizeObserver();

  return () => {
    resizeCallbacks.delete(callback);

    // 如果没有回调了，清理全局监听器
    if (resizeCallbacks.size === 0) {
      cleanupGlobalResizeObserver();
    }
  };
};

/**
 * 该 Hook 会：
 * 1. 根据 selector 查找基准元素（如：div[data-testid="UserName"]）
 * 2. 如果 useSiblings 为 true，则：
 *    - 当 targetFilter 存在时，从基准元素的同级中筛选出目标；
 *    - 当 targetFilter 不存在时，在 baseEl 后新建一个 div 作为目标坑位。
 *    否则直接使用 selector 匹配到的元素作为目标。
 * 3. 在目标内创建唯一的 Shadow 容器，并注入 styleText 指定的样式
 * 4. 针对 DOM 动态变化和样式更新做了健壮性处理：
 *    - 当目标已创建后，不再重复调用 attachShadow。
 *    - 当 styleText 发生变化时，自动更新 shadow 内的 style 标签内容。
 *    - 设置最大等待时间，防止无限监听。
 * 5. 自动为 target 元素添加 z-index 调整功能（全局管理）
 * 6. 支持窗口大小变化时重新创建 Shadow 容器
 */
export default function useShadowContainer({
  selector,
  selectorXPath,
  useSiblings = false,
  siblingsPosition = 'afterend',
  targetFilter,
  siblingsXPath,
  styleText = '',
  shadowMode = 'closed',
  waitTime = 100,
  maxWaitTime = 40000,
  siblingsStyle = 'width:auto;height:auto;max-width:100%;',
  targetStyle = '',
  autoZIndex = true,
  onShadowCreated,
}: UseShadowContainerOptions): ShadowRoot | null {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const autoZIndexRef = useLatest(autoZIndex);
  const currentUrl = useCurrentUrl();

  // 生成稳定的配置 key，避免对象引用变化导致 effect 重创建
  const configKey = useMemo(() => JSON.stringify({
    selector,
    selectorXPath,
    useSiblings,
    siblingsPosition,
    siblingsXPath,
    siblingsStyle,
    targetStyle,
    styleText,
    shadowMode,
    theme,
    targetFilter: targetFilter?.toString(), // 函数转为字符串
  }), [selector, selectorXPath, useSiblings, siblingsPosition, siblingsXPath, siblingsStyle, targetStyle, styleText, shadowMode, theme, targetFilter]);
  // 用于标记是否已经创建过容器，避免重复创建
  const createdRef = useRef(false);
  // 当前实例的唯一 ID（延迟创建）
  const instanceIdRef = useRef<string>('');
  // 保存当前 target 元素的引用
  const currentTargetRef = useRef<HTMLElement | null>(null);
  // 保存回调函数的引用
  const onShadowCreatedRef = useLatest(onShadowCreated);

  const setupAutoZIndex = (targetElement: HTMLElement) => {
    // 延迟创建 instanceId（只在需要时创建）
    if (!instanceIdRef.current) {
      instanceIdRef.current = `shadow-${Date.now()}-${Math.random()}`;
    }
    const instanceId = instanceIdRef.current;

    // 清理之前的实例（如果存在）
    cleanupZIndexInstance(instanceId);

    // 保存原始 z-index
    const computedStyle = window.getComputedStyle(targetElement);
    const originalZIndex =
      targetElement.style.zIndex || computedStyle.zIndex || 'auto';

    // 创建点击事件处理器
    const clickHandler = (e: Event) => {
      // 检查点击是否发生在元素内部
      if (targetElement.contains(e.target as Node)) {
        handleGlobalZIndexActivation(instanceId);
      }
    };

    // 创建鼠标移入事件处理器
    const mouseenterHandler = (e: Event) => {
      // 检查鼠标移入是否发生在元素内部
      if (targetElement.contains(e.target as Node)) {
        handleGlobalZIndexActivation(instanceId);
      }
    };

    // 添加事件监听器
    autoZIndexRef.current &&
      targetElement.addEventListener('click', clickHandler);
    autoZIndexRef.current &&
      targetElement.addEventListener('mouseenter', mouseenterHandler);

    // 注册到全局管理器
    zIndexInstances.set(instanceId, {
      element: targetElement,
      originalZIndex,
      clickHandler,
      mouseenterHandler,
      instanceId,
    });

    // 更新当前 target 引用
    currentTargetRef.current = targetElement;
  };

  // 创建 Shadow 容器的函数（使用 useCallback 缓存）
  const createShadowContainer = useCallback((): boolean => {
    // 如果已经创建过，则检查当前引用的元素是否仍在文档中
    if (createdRef.current) {
      // 检查当前引用的元素是否仍在文档中
      if (isElementInDocument(currentTargetRef.current)) {
        // 元素仍在文档中，重新设置 z-index 管理
        setupAutoZIndex(currentTargetRef.current!);
        return true;
      } else {
        // 元素已不在文档中，需要重新创建
        createdRef.current = false;
        // 继续执行下面的创建逻辑
      }
    }

    // 1. 根据 selectorXPath 或 selector 查找基准元素
    const evaluateXPathSingle = (
      xpath: string,
      context: Node = document
    ): Element | null => {
      try {
        const result = document.evaluate(
          xpath,
          context,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        return (result.singleNodeValue as Element) || null;
      } catch (e) {
        return null;
      }
    };

    const evaluateXPathAll = (xpath: string, context: Node): Element[] => {
      try {
        const snapshot = document.evaluate(
          xpath,
          context,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        const nodes: Element[] = [];
        for (let i = 0; i < snapshot.snapshotLength; i++) {
          const n = snapshot.snapshotItem(i);
          if (n && n instanceof Element) nodes.push(n);
        }
        return nodes;
      } catch (e) {
        return [];
      }
    };

    const baseEl = selectorXPath
      ? evaluateXPathSingle(selectorXPath)
      : document.querySelector(selector);
    if (!baseEl) return false;

    let target: Element | null = null as unknown as Element;
    if (useSiblings) {
      // 如果没有提供 targetFilter，则在 baseEl 后面新建一个 div 作为坑位
      if (!targetFilter && !siblingsXPath) {
        if (
          baseEl.getAttribute('data-plasmo-shadow-container-useSiblings') ===
          'true' && shadowRoot
        ) {
          return true;
        }
        const placeholder = document.createElement('div');
        placeholder.style.cssText = siblingsStyle || '';
        baseEl.insertAdjacentElement(siblingsPosition, placeholder);
        baseEl.setAttribute('data-plasmo-shadow-container-useSiblings', 'true');
        target = placeholder;
      } else if (siblingsXPath) {
        // 优先使用 XPath 在同级中查找
        if (!baseEl.parentElement) return false;
        // 在父级作用域内查找，避免跨层级
        const matches = evaluateXPathAll(siblingsXPath, baseEl.parentElement);
        // 过滤掉 baseEl 自身，并取第一个匹配
        target = (matches || []).find((el) => el !== baseEl) || null;
      } else {
        // 如果提供了 targetFilter，则在 baseEl 的同级中查找符合条件的目标
        if (!baseEl.parentElement) return false;
        const siblings = Array.from(baseEl.parentElement.children).filter(
          (el) => el !== baseEl
        );
        target =
          siblings.find((el) =>
            typeof targetFilter === 'function' ? targetFilter(el) : false
          ) || null;
      }
    } else {
      target = baseEl;
    }

    if (!target) return false;

    // 2. 检查目标元素内是否已存在唯一的容器
    if (target.getAttribute('data-plasmo-shadow-container') === 'true') {
      // 重新设置 z-index 管理
      setupAutoZIndex(target as HTMLElement);
      return true;
    }
    // 3. 获取或创建 shadowRoot，并更新 style
    let shadow = target.shadowRoot;
    if (!shadow) {
      try {
        shadow = target.attachShadow(<ShadowRootInit>{ mode: shadowMode });
        const styleEl = document.createElement('style');
        if (typeof styleText === 'string') {
          styleEl.textContent = styleText;
        }
        const slotEl = document.createElement('slot');
        shadow.appendChild(slotEl);
        shadow.appendChild(styleEl);
        target.setAttribute('data-plasmo-shadow-container', 'true');
        target.setAttribute('data-theme', theme);
        // 合并 targetStyle 和 autoZIndex 的 z-index
        const zIndexStyle = autoZIndex ? 'z-index: 1;' : '';
        const finalStyle = targetStyle ? `${targetStyle} ${zIndexStyle}`.trim() : zIndexStyle;
        if (finalStyle) {
          target.setAttribute('style', finalStyle);
        }

        // 调用创建后的回调函数
        if (onShadowCreatedRef.current) {
          onShadowCreatedRef.current(shadow, target as HTMLElement);
        }
      } catch (e) {
        return false;
      }
    } else {
      // 如果 shadow 已存在，检测 style 标签内容是否需要更新
      const styleEl = shadow.querySelector('style');
      if (styleEl && styleEl.textContent !== styleText) {
        if (typeof styleText === 'string') {
          styleEl.textContent = styleText;
        }
      }
    }

    // 4. 设置自动 z-index 调整（直接在 target 上）
    setupAutoZIndex(target as HTMLElement);
    // 对比后再设置状态，避免重复触发重渲染
    if (shadow !== shadowRoot) {
      setShadowRoot(shadow);
    }
    createdRef.current = true;
    return true;
  }, [configKey, shadowRoot]); // configKey 已包含 targetFilter

  // 处理窗口大小变化
  useDebounceEffect(
    () => {
      // 添加窗口大小变化回调
      const removeResizeCallback = addResizeCallback(() => {
        // 窗口大小变化时，尝试重新创建 Shadow 容器
        if (!createShadowContainer()) {
          // 如果创建失败，可能是元素还没准备好，设置 createdRef 为 false 以便下次重试
          createdRef.current = false;
        }
      });

      return removeResizeCallback;
    },
    [configKey], // 使用稳定的 configKey 代替长列表
    {
      wait: 100,
      leading: true,
      trailing: true,
    }
  );

  useDebounceEffect(
    () => {
      if (createShadowContainer()) {
        return;
      }

      const unsubscribe = subscribeToMutation(
        () => {
          if (createShadowContainer()) {
            unsubscribe();
          }
        },
        { childList: true, subtree: true },
        {
          debugName: 'useShadowContainer',
        }
      );

      return () => {
        unsubscribe();
        // 清理 z-index 管理
        cleanupZIndexInstance(instanceIdRef.current);
      };
    },
    [configKey, currentUrl, waitTime], // 使用 configKey 简化依赖
    {
      wait: waitTime,
      maxWait: 300,
      leading: true,
      trailing: true,
    }
  );

  return shadowRoot;
}

/** 必须修复，不然悬浮框有问题 **/
export const checkMainSectionAndFixZIndex = () => {
  try {
    const section = document.querySelector('main [aria-label] section');
    if (!section || section.hasAttribute('data-xhunt-fixed')) return false;

    const prevSibling = section.previousElementSibling
      ?.previousElementSibling as HTMLElement;
    if (prevSibling) {
      prevSibling.style.zIndex = '99';

      // 查找第二个子元素
      let mainSection = prevSibling.children[1] as HTMLElement;

      if (mainSection) {
        mainSection.style.zIndex = '99';
        section.setAttribute('data-xhunt-fixed', 'true');
        mainSection.setAttribute('data-xhunt-fixed', 'true');
      }
    }
    return !!prevSibling;
  } catch (err) {
    return false;
  }
};
