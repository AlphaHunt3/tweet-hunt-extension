import { useState, useRef, useEffect } from 'react';
import { useDebounceEffect } from 'ahooks';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';

export interface UseShadowContainerOptions {
  /** 初步查找的选择器 */
  selector: string;
  /** 是否需要从基准元素的同级元素中筛选目标 */
  useSiblings?: boolean;
  /**
   * 当 useSiblings 为 true 时，用于筛选基准元素的同级元素，
   * 返回 true 表示符合要求；如果不传，则默认取第一个同级元素
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
}

/**
 * 该 Hook 会：
 * 1. 根据 selector 查找基准元素（如：div[data-testid="UserName"]）
 * 2. 如果 useSiblings 为 true，则从该元素的同级元素中筛选出目标（可通过 targetFilter 控制）
 *    否则直接使用 selector 匹配到的元素作为目标。
 * 3. 在目标内创建唯一的 Shadow 容器，并注入 styleText 指定的样式
 * 4. 针对 DOM 动态变化和样式更新做了健壮性处理：
 *    - 当目标已创建后，不再重复调用 attachShadow。
 *    - 当 styleText 发生变化时，自动更新 shadow 内的 style 标签内容。
 *    - 设置最大等待时间，防止无限监听。
 */
export default function useShadowContainer({
  selector,
  useSiblings = false,
  targetFilter,
  styleText = '',
  shadowMode = 'closed',
  waitTime = 500,
  maxWaitTime = 30000,
}: UseShadowContainerOptions): ShadowRoot | null {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const currentUrl = useCurrentUrl();
  // 用于标记是否已经创建过容器，避免重复创建
  const createdRef = useRef(false);

  useEffect(() => {
    createdRef.current = false;
  }, [currentUrl]);

  useDebounceEffect(() => {

    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function createShadowContainer(): boolean {
      // 如果已经创建过，则直接返回 true
      if (createdRef.current) return true;

      // 1. 根据 selector 查找基准元素
      const baseEl = document.querySelector(selector);
      if (!baseEl) return false;

      let target: Element | null = null;
      if (useSiblings) {
        if (!baseEl.parentElement) {
          // console.warn('useShadowContainer: Base element has no parent, cannot search siblings.');
          return false;
        }
        const siblings = Array.from(baseEl.parentElement.children).filter(el => el !== baseEl);
        target = targetFilter ? siblings.find(el => targetFilter(el)) || null : siblings[0] || null;
      } else {
        target = baseEl;
      }

      if (!target) return false;
      // 2. 检查目标元素内是否已存在唯一的容器
      if (target.getAttribute('data-plasmo-shadow-container') === 'true') return true;

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
        } catch (e) {
          // console.error('Error attaching shadow:', e);
          return false;
        }
      } else {
        // 如果 shadow 已存在，检测 style 标签内容是否需要更新
        const styleEl = shadow.querySelector('style');
        if (styleEl && styleEl.textContent !== styleText) {
          if (typeof styleText === 'string') {styleEl.textContent = styleText;}
        }
      }
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
      // console.warn(`useShadowContainer: Timeout reached (${maxWaitTime}ms), target element not found.`);
    }, Number(maxWaitTime));

    return () => {
      observer && observer.disconnect();
      if (timeoutId) {
        // console.info('useShadowContainer: Cleanup observer and timeout.')
        clearTimeout(timeoutId);
      }
    };
  }, [selector, useSiblings, targetFilter, styleText, shadowMode, currentUrl, waitTime], {
    wait: waitTime,
    leading: false,
    trailing: true,
  });

  return shadowRoot;
}
