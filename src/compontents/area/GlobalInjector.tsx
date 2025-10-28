import { useEffect } from 'react';
import avatarRankCss from 'data-text:~/css/avatar-rank.css';
import tokenHighlightCss from 'data-text:~/css/token-highlight.css';
import floatingContainerCss from 'data-text:~/css/floating-container.css';

export function GlobalInjector() {
  useEffect(() => {
    // Create style element for global styles
    const style = document.createElement('style');
    style.setAttribute('id', 'xhunt-global-styles');
    style.textContent =
      avatarRankCss + tokenHighlightCss + floatingContainerCss;
    document.head.appendChild(style);

    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.getURL
    ) {
      // 注入 bs58（用于解码 OKX 返回的 base58 交易数据）
      const bs58Script = document.createElement('script');
      bs58Script.id = 'xhunt-bs58-script';
      bs58Script.src = chrome.runtime.getURL('assets/bs58.js');

      bs58Script.onload = () => {
        console.log('[XHunt] bs58 loaded successfully!');
      };

      bs58Script.onerror = (err) => {
        console.error('[XHunt] Failed to load bs58.js');
        console.error('[XHunt] Error:', err);
      };

      if (!document.getElementById('xhunt-bs58-script')) {
        document.head.appendChild(bs58Script);
      }

      // 注入 Solana Web3.js（在 bs58 之后）
      const solanaWeb3Script = document.createElement('script');
      solanaWeb3Script.id = 'xhunt-solana-web3-script';

      // 使用 assets 路径
      const scriptPath = 'assets/solanaWeb3.js';
      solanaWeb3Script.src = chrome.runtime.getURL(scriptPath);

      solanaWeb3Script.onload = () => {
        console.log('[XHunt] Solana Web3.js loaded successfully!');
      };

      solanaWeb3Script.onerror = (err) => {
        console.error(
          '[XHunt] Failed to load Solana Web3.js from:',
          scriptPath
        );
        console.error('[XHunt] Error:', err);
      };

      // 检查是否已经加载
      if (!document.getElementById('xhunt-solana-web3-script')) {
        document.head.appendChild(solanaWeb3Script);
      }
    } else {
      console.error('[XHunt] chrome.runtime.getURL not available');
    }

    // Cleanup function
    return () => {
      const styleElement = document.getElementById('xhunt-global-styles');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }

      const bs58Element = document.getElementById('xhunt-bs58-script');
      if (bs58Element) {
        document.head.removeChild(bs58Element);
      }

      const scriptElement = document.getElementById('xhunt-solana-web3-script');
      if (scriptElement) {
        document.head.removeChild(scriptElement);
      }
    };
  }, []);

  return null;
}
