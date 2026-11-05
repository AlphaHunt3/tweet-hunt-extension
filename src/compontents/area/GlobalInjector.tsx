import { useEffect } from 'react';
import avatarRankCss from 'data-text:~/css/avatar-rank.css';
import tokenHighlightCss from 'data-text:~/css/token-highlight.css';
import floatingContainerCss from 'data-text:~/css/floating-container.css';
import cleanerCss from 'data-text:~/css/cleaner.css';
import specialMarkersCss from 'data-text:~/css/special-markers.css';

export function GlobalInjector() {
  useEffect(() => {
    const head = document.head || document.documentElement;
    if (!head) return;

    let style = document.getElementById(
      'xhunt-global-styles',
    ) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('id', 'xhunt-global-styles');
      head.appendChild(style);
    }

    style.textContent =
      avatarRankCss +
      tokenHighlightCss +
      floatingContainerCss +
      cleanerCss +
      specialMarkersCss;

    return () => {
      const styleElement = document.getElementById('xhunt-global-styles');
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  return null;
}
