import { useEffect } from 'react';
import avatarRankCss from 'data-text:~/css/avatar-rank.css';
import tokenHighlightCss from 'data-text:~/css/token-highlight.css';
import floatingContainerCss from 'data-text:~/css/floating-container.css';

export function GlobalInjector() {
  useEffect(() => {
    // Create style element for global styles
    const style = document.createElement('style');
    style.setAttribute('id', 'xhunt-global-styles');
    style.textContent = avatarRankCss + tokenHighlightCss + floatingContainerCss;
    document.head.appendChild(style);

    // Cleanup function
    return () => {
      const styleElement = document.getElementById('xhunt-global-styles');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  return null;
}