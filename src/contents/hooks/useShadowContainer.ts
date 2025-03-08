import { useState, useEffect } from 'react';

export default function useShadowContainer({
  selector,
  styleText = '',
  shadowStyle = '',
  shadowMode = 'closed',
}: {
  selector: string;
  styleText?: string;
  shadowStyle?: string;
  shadowMode?: 'closed' | 'open';
}): ShadowRoot | null {
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    let observer: MutationObserver | null = null;

    function createShadowContainer(): boolean {
      const target = document.querySelector(selector);
      if (target) {
        // 每次创建一个新的容器，不依赖于固定 id
        const container = document.createElement('div');
        container.style.cssText = shadowStyle;
        target.appendChild(container);
        const shadow = container.attachShadow({ mode: shadowMode });
        // 创建 style 标签并注入传入的 CSS 文本
        const styleEl = document.createElement('style');
        styleEl.textContent = styleText;
        shadow.appendChild(styleEl);
        setShadowRoot(shadow);
        return true;
      }
      return false;
    }

    // 如果目标元素一开始就存在则直接创建
    if (createShadowContainer()) {
      return;
    }

    // 否则使用 MutationObserver 等待目标元素出现
    observer = new MutationObserver(() => {
      if (createShadowContainer()) {
        observer && observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer && observer.disconnect();
    };
  }, [selector, styleText, shadowStyle]);

  return shadowRoot;
}
