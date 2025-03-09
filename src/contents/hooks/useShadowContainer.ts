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
        // 检查是否已经存在唯一的容器
        let container = target.querySelector('[data-plasmo-shadow-container="true"]') as HTMLElement | null;
        if (!container) {
          container = document.createElement('div');
          container.setAttribute('data-plasmo-shadow-container', 'true');
          container.style.cssText = shadowStyle;
          target.appendChild(container);
        }
        // 获取或创建 shadowRoot
        let shadow = container.shadowRoot;
        if (!shadow) {
          shadow = container.attachShadow({ mode: shadowMode });
          const styleEl = document.createElement('style');
          styleEl.textContent = styleText;
          shadow.appendChild(styleEl);
        }
        setShadowRoot(shadow);
        return true;
      }
      return false;
    }

    if (createShadowContainer()) {
      return;
    }

    observer = new MutationObserver(() => {
      if (createShadowContainer()) {
        observer && observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer && observer.disconnect();
    };
  }, [selector, styleText, shadowStyle, shadowMode]);

  return shadowRoot;
}
