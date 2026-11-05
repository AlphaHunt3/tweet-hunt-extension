import { useEffect, useState } from 'react';
import cssText from 'data-text:~/css/style.css';

const PORTAL_HOST_ID = 'xhunt-privacy-portal-host';
const SHADOW_HOST_ID = 'xhunt-privacy-shadow-host';

export function usePrivacyPortalHost() {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let shadowHost = document.getElementById(SHADOW_HOST_ID) as HTMLElement | null;
    let portalHostElement = document.getElementById(PORTAL_HOST_ID) as HTMLElement | null;

    if (!shadowHost) {
      shadowHost = document.createElement('div');
      shadowHost.id = SHADOW_HOST_ID;
      shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:99998;pointer-events:none;';
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

      portalHostElement = document.createElement('div');
      portalHostElement.id = PORTAL_HOST_ID;
      portalHostElement.style.cssText = 'position:fixed;bottom:0;left:0;right:0;pointer-events:auto;';
      portalHostElement.setAttribute('translate', 'no');
      portalHostElement.classList.add('notranslate');
      shadowRoot.appendChild(portalHostElement);
    } else {
      shadowHost.setAttribute('translate', 'no');
      shadowHost.classList.add('notranslate');
      const shadowRoot = shadowHost.shadowRoot;
      portalHostElement = shadowRoot?.getElementById(PORTAL_HOST_ID) as HTMLElement | null;
    }

    portalHostElement?.setAttribute('translate', 'no');
    portalHostElement?.classList.add('notranslate');
    setPortalHost(portalHostElement);
  }, []);

  return { portalHost };
}

export default usePrivacyPortalHost;
