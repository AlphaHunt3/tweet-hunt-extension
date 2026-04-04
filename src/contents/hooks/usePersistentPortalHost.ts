import { useEffect, useRef } from 'react';

export default function usePersistentPortalHost(shadowRoot: ShadowRoot | null) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  if (!hostRef.current) {
    hostRef.current = document.createElement('div');
    hostRef.current.style.display = 'contents';
  }
  useEffect(() => {
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
