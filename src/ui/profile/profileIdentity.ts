import { useMemo } from 'react';

export function readProfileIdentity() {
  const avatarImg = document.querySelector('main [data-testid*="UserAvatar-Container"] img') as HTMLImageElement | null;
  const nameText = document.querySelector("main [data-testid='UserName']")?.textContent || '@';
  const [displayName] = nameText.split('@');
  return {
    avatar: avatarImg?.src || '',
    displayName: displayName.trim(),
    xLink: window.location.origin + window.location.pathname,
  };
}

export function useProfileIdentity(handle: string) {
  return useMemo(() => {
    const identity = readProfileIdentity();
    return { ...identity, displayName: identity.displayName || handle };
  }, [handle]);
}
