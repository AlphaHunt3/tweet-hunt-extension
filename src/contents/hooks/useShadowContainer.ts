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
    };
  }, [selector, useSiblings, targetFilter, styleText, shadowMode, currentUrl, waitTime], {
    wait: waitTime,
    leading: false,
    trailing: true,
  });

  return shadowRoot;
}
