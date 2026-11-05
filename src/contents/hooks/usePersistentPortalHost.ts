import { useEffect, useRef } from 'react';

export default function usePersistentPortalHost(shadowRoot: ShadowRoot | null) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  if (!hostRef.current) {
    hostRef.current = document.createElement('div');
    hostRef.current.style.display = 'contents';
    hostRef.current.setAttribute('translate', 'no');
    hostRef.current.classList.add('notranslate');
  }
  useEffect(() => {
    hostRef.current?.setAttribute('translate', 'no');
    hostRef.current?.classList.add('notranslate');
    if (
      shadowRoot &&
      hostRef.current &&
      hostRef.current.parentNode !== shadowRoot
    ) {
      shadowRoot.appendChild(hostRef.current);
    }
  }, [shadowRoot]);
  return hostRef.current;
}
