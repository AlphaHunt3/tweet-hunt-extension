const activeOverlayInteractionLocks = new Set<symbol>();
const lockedHoverPortalZIndexes = new Map<HTMLElement, string>();

const lowerHoverPortalLayers = () => {
  if (typeof document === 'undefined') return;
  document
    .querySelectorAll<HTMLElement>('[data-xhunt-hover-portal="true"]')
    .forEach((element) => {
      if (!lockedHoverPortalZIndexes.has(element)) {
        lockedHoverPortalZIndexes.set(element, element.style.zIndex);
      }
      element.style.zIndex = '2147483646';
    });
};

const restoreHoverPortalLayers = () => {
  lockedHoverPortalZIndexes.forEach((zIndex, element) => {
    if (element.isConnected) element.style.zIndex = zIndex;
  });
  lockedHoverPortalZIndexes.clear();
};

export const acquireOverlayInteractionLock = (): (() => void) => {
  const lockId = Symbol('overlay-interaction-lock');
  activeOverlayInteractionLocks.add(lockId);
  lowerHoverPortalLayers();

  return () => {
    activeOverlayInteractionLocks.delete(lockId);
    if (activeOverlayInteractionLocks.size === 0) restoreHoverPortalLayers();
  };
};

export const isOverlayInteractionLocked = (): boolean =>
  activeOverlayInteractionLocks.size > 0;
