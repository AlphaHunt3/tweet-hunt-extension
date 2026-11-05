import { useState, useEffect } from 'react';
import cssText from 'data-text:~/css/style.css';

const SHADOW_HOST_ID = 'xhunt-hotvote-shadow-host';
const PORTAL_HOST_ID = 'xhunt-hotvote-portal-host';

export function getOrCreateHotVotePortalHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  let shadowHost = document.getElementById(SHADOW_HOST_ID) as HTMLElement | null;
  if (!shadowHost) {
    shadowHost = document.createElement('div');
    shadowHost.id = SHADOW_HOST_ID;
    shadowHost.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483640;pointer-events:none;overflow:visible;';
    shadowHost.setAttribute('translate', 'no');
    shadowHost.classList.add('notranslate');

    if (document.body?.parentNode) {
      document.body.parentNode.insertBefore(shadowHost, document.body);
    } else {
      document.documentElement.appendChild(shadowHost);
    }

    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = cssText;
    shadowRoot.appendChild(style);

    const portalHost = document.createElement('div');
    portalHost.id = PORTAL_HOST_ID;
    portalHost.style.cssText =
      'position:fixed;inset:0;pointer-events:none;overflow:visible;';
    portalHost.setAttribute('translate', 'no');
    portalHost.classList.add('notranslate');
    shadowRoot.appendChild(portalHost);

    return portalHost;
  }

  shadowHost.setAttribute('translate', 'no');
  shadowHost.classList.add('notranslate');
  const shadowRoot = shadowHost.shadowRoot;
  let portalHost = shadowRoot?.getElementById(PORTAL_HOST_ID) as HTMLElement | null;
  if (!portalHost && shadowRoot) {
    portalHost = document.createElement('div');
    portalHost.id = PORTAL_HOST_ID;
    portalHost.style.cssText =
      'position:fixed;inset:0;pointer-events:none;overflow:visible;';
    portalHost.setAttribute('translate', 'no');
    portalHost.classList.add('notranslate');
    shadowRoot.appendChild(portalHost);
  }
  portalHost?.setAttribute('translate', 'no');
  portalHost?.classList.add('notranslate');
  return portalHost;
}

export function useHotVotePortalHost(isOpen: boolean): HTMLElement | null {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(() => {
    if (typeof window !== 'undefined' && isOpen) {
      return getOrCreateHotVotePortalHost();
    }
    return null;
  });

  useEffect(() => {
    if (isOpen) {
      setPortalHost(getOrCreateHotVotePortalHost());
    }
  }, [isOpen]);

  return portalHost;
}
