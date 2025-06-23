import { useState, useRef, useEffect } from 'react';
import { useDebounceEffect } from 'ahooks';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

export interface UseShadowContainerOptions {
  /** 初步查找的选择器 */
  selector: string;
  /** 是否需要从基准元素的同级元素中筛选目标 */
  useSiblings?: boolean;
  /**
   * 当 useSiblings 为 true 时，用于筛选基准元素的同级元素，
   * 返回 true 表示符合要求；如果不传，则默认在 baseEl 的下一个位置新建坑位
   */
  targetFilter?: (el: Element) => boolean;
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
    instance.element.removeEventListener('mouseenter', instance.mouseenterHandler);

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
 */
export default function useShadowContainer({
  selector,
  useSiblings = false,
  targetFilter,
  styleText = '',
  shadowMode = 'closed',
  waitTime = 500,
  maxWaitTime = 30000,
  siblingsStyle = 'width:auto;height:auto;max-width:100%;',
}: UseShadowContainerOptions): ShadowRoot | null {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const currentUrl = useCurrentUrl();
  // 用于标记是否已经创建过容器，避免重复创建
  const createdRef = useRef(false);
  // 当前实例的唯一 ID
  const instanceIdRef = useRef<string>(`shadow-${Date.now()}-${Math.random()}`);
  // 保存当前 target 元素的引用
  const currentTargetRef = useRef<HTMLElement | null>(null);

  const setupAutoZIndex = (targetElement: HTMLElement) => {
    const instanceId = instanceIdRef.current;

    // 清理之前的实例（如果存在）
    cleanupZIndexInstance(instanceId);

    // 保存原始 z-index
    const computedStyle = window.getComputedStyle(targetElement);
    const originalZIndex = targetElement.style.zIndex || computedStyle.zIndex || 'auto';

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
    targetElement.addEventListener('click', clickHandler);
    targetElement.addEventListener('mouseenter', mouseenterHandler);

    // 注册到全局管理器
    zIndexInstances.set(instanceId, {
      element: targetElement,
      originalZIndex,
      clickHandler,
      mouseenterHandler,
      instanceId
    });

    // 更新当前 target 引用
    currentTargetRef.current = targetElement;
  };

  useEffect(() => {
    createdRef.current = false;
    // 清理当前实例的 z-index 管理
    cleanupZIndexInstance(instanceIdRef.current);
    // 生成新的实例 ID
    instanceIdRef.current = `shadow-${Date.now()}-${Math.random()}`;
    // 清空当前 target 引用
    currentTargetRef.current = null;

    // 重新为当前 target 设置 z-index 管理（如果存在的话）
    const findAndSetupTarget = () => {
      // 1. 根据 selector 查找基准元素
      const baseEl = document.querySelector(selector);
      if (!baseEl) return;

      let target: Element | null = null;
      if (useSiblings) {
        // 如果没有提供 targetFilter，则在 baseEl 后面新建一个 div 作为坑位
        if (!targetFilter) {
          const placeholder = baseEl.nextElementSibling;
          if (placeholder && placeholder.getAttribute('data-plasmo-shadow-container') === 'true') {
            target = placeholder;
          }
        } else {
          // 如果提供了 targetFilter，则在 baseEl 的同级中查找符合条件的目标
          if (baseEl.parentElement) {
            const siblings = Array.from(baseEl.parentElement.children).filter(el => el !== baseEl);
            target = siblings.find(el => targetFilter(el) && el.getAttribute('data-plasmo-shadow-container') === 'true') || null;
          }
        }
      } else {
        if (baseEl.getAttribute('data-plasmo-shadow-container') === 'true') {
          target = baseEl;
        }
      }

      if (target) {
        setupAutoZIndex(target as HTMLElement);
      }
    };

    // 延迟执行，确保 DOM 已经更新
    setTimeout(findAndSetupTarget, 100);
  }, [currentUrl, selector, useSiblings, targetFilter]);

  useDebounceEffect(() => {

    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function createShadowContainer(): boolean {
      // 如果已经创建过，则直接返回 true
      if (createdRef.current) {
        // 但是需要检查是否需要重新设置 z-index 管理
        if (currentTargetRef.current) {
          setupAutoZIndex(currentTargetRef.current);
        }
        return true;
      }

      // 1. 根据 selector 查找基准元素
      const baseEl = document.querySelector(selector);
      if (!baseEl) return false;

      let target: Element | null = null as unknown as Element;
      if (useSiblings) {
        // 如果没有提供 targetFilter，则在 baseEl 后面新建一个 div 作为坑位
        if (!targetFilter) {
          const placeholder = document.createElement('div');
          placeholder.style.cssText = siblingsStyle || '';
          baseEl.insertAdjacentElement('afterend', placeholder);
          target = placeholder;
        } else {
          // 如果提供了 targetFilter，则在 baseEl 的同级中查找符合条件的目标
          if (!baseEl.parentElement) return false;
          const siblings = Array.from(baseEl.parentElement.children).filter(el => el !== baseEl);
          target = siblings.find(el => targetFilter(el)) || null;
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
          if (typeof styleText === 'string') {styleEl.textContent = styleText;}
          const slotEl = document.createElement('slot');
          shadow.appendChild(slotEl);
          shadow.appendChild(styleEl);
          target.setAttribute('data-plasmo-shadow-container', 'true');
          target.setAttribute('data-theme', theme);
          target.setAttribute('style', 'z-index: 1;');
        } catch (e) {
          return false;
        }
      } else {
        // 如果 shadow 已存在，检测 style 标签内容是否需要更新
        const styleEl = shadow.querySelector('style');
        if (styleEl && styleEl.textContent !== styleText) {
          if (typeof styleText === 'string') {styleEl.textContent = styleText;}
        }
      }

      // 4. 设置自动 z-index 调整（直接在 target 上）
      setupAutoZIndex(target as HTMLElement);

      setShadowRoot(shadow);
      createdRef.current = true;
      return true;
    }

    if (createShadowContainer()) {
      return;
    }

    observer = new MutationObserver(() => {
      if (createShadowContainer()) {
        observer && observer.disconnect();
        if (timeoutId) clearTimeout(timeoutId);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 设置最大等待时间
    timeoutId = setTimeout(() => {
      observer && observer.disconnect();
    }, Number(maxWaitTime));

    return () => {
      observer && observer.disconnect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // 清理 z-index 管理
      cleanupZIndexInstance(instanceIdRef.current);
    };
  }, [selector, useSiblings, targetFilter, styleText, shadowMode, currentUrl, waitTime], {
    wait: waitTime,
    leading: false,
    trailing: true,
  });

  return shadowRoot;
}

/** 必须修复，不然悬浮框有问题 **/
export const checkMainSectionAndFixZIndex = () => {
  try {
    const section = document.querySelector('main [aria-label] section');
    if (!section || section.hasAttribute('data-xhunt-fixed')) return false;

    const prevSibling = section.previousElementSibling?.previousElementSibling as HTMLElement;
    if (prevSibling) {
      prevSibling.style.zIndex = '99';

      // 查找第二个子元素
      let mainSection = prevSibling.children[1]  as HTMLElement;

      if (mainSection) {
        mainSection.style.zIndex = '99';
        section.setAttribute('data-xhunt-fixed', 'true');
        mainSection.setAttribute('data-xhunt-fixed', 'true');
      }
    }
    return !!prevSibling;
  } catch (err) {
    // console.log(err);
    return false
  }
};
