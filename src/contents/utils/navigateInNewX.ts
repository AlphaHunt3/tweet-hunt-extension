const X_MAIN_HOSTS = new Set(['x.com', 'twitter.com']);
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const ROUTE_COMMIT_TIMEOUT = 400;
const ROUTER_BRIDGE_TIMEOUT = 150;
const NAVIGATE_EVENT = '__xhunt:new-x-navigate';
const NAVIGATE_RESULT_EVENT = '__xhunt:new-x-navigate-result';
const LOG_PREFIX = '[XHunt Navigation]';

type LegacyNavigationFallback = (url: string) => void;

type NewXNavigationTask = {
  id: string;
  bridgeTimer: number | null;
  verifyTimer: number | null;
  removeBridgeListener: (() => void) | null;
};

let activeNavigationTask: NewXNavigationTask | null = null;

const getCurrentPath = () =>
  window.location.pathname + window.location.search + window.location.hash;

const getNavigationEntryKey = () => {
  const navigation = (window as Window & {
    navigation?: { currentEntry?: { key?: string } };
  }).navigation;
  return navigation?.currentEntry?.key || '';
};

const createNavigationId = () => {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const normalizeRoute = (url: URL) => url.pathname + url.search + url.hash;

const isVisibleAnchor = (anchor: HTMLAnchorElement) => {
  const style = window.getComputedStyle(anchor);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    Number(style.opacity) === 0
  ) {
    return false;
  }
  const rect = anchor.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const findNativeRouteAnchor = (targetUrl: URL) => {
  const targetRoute = normalizeRoute(targetUrl).toLowerCase();
  const candidates = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a.x-link[href]'),
  ).filter((anchor) => {
    if (!anchor.isConnected || anchor.hasAttribute('download')) return false;
    if (anchor.target && anchor.target !== '_self') return false;

    try {
      const anchorUrl = new URL(anchor.href, window.location.href);
      return (
        anchorUrl.origin === targetUrl.origin &&
        normalizeRoute(anchorUrl).toLowerCase() === targetRoute
      );
    } catch {
      return false;
    }
  });

  return candidates.find(isVisibleAnchor) || candidates[0] || null;
};

const clickNativeRouteAnchorSafely = (anchor: HTMLAnchorElement) => {
  let handledByX = false;
  const preventUnhandledNavigation = (event: MouseEvent) => {
    if (!event.composedPath().includes(anchor)) return;

    handledByX = event.defaultPrevented;
    if (!handledByX) {
      // X 没有接管这次点击时，阻止浏览器执行 anchor 的整页默认导航。
      event.preventDefault();
    }
  };

  window.addEventListener('click', preventUnhandledNavigation, { once: true });
  try {
    anchor.click();
  } finally {
    window.removeEventListener('click', preventUnhandledNavigation);
  }
  return handledByX;
};

export const cancelNewXNavigationTask = () => {
  if (activeNavigationTask?.bridgeTimer) {
    window.clearTimeout(activeNavigationTask.bridgeTimer);
  }
  if (activeNavigationTask?.verifyTimer) {
    window.clearTimeout(activeNavigationTask.verifyTimer);
  }
  activeNavigationTask?.removeBridgeListener?.();
  activeNavigationTask = null;
};

/**
 * 优先通过 MAIN world 桥接调用新版 X 的 TanStack Router。
 * 桥接不可用时复用完全匹配的原生 Link，再回退到老版 SPA 方案。
 * 禁止调用 location.assign / navigation.navigate，避免整页刷新。
 */
export const navigateInNewX = (
  url: string,
  fallback: LegacyNavigationFallback,
) => {
  cancelNewXNavigationTask();

  const fallbackToLegacy = (target: string, reason: string) => {
    console.log(LOG_PREFIX, 'new -> legacy fallback', {
      reason,
      target,
    });
    fallback(target);
  };

  let targetUrl: URL;
  try {
    targetUrl = new URL(url, window.location.href);
  } catch {
    fallbackToLegacy(url, 'invalid-url');
    return;
  }

  if (!ALLOWED_PROTOCOLS.has(targetUrl.protocol)) return;
  if (
    !X_MAIN_HOSTS.has(targetUrl.hostname.toLowerCase()) ||
    !X_MAIN_HOSTS.has(window.location.hostname.toLowerCase())
  ) {
    fallbackToLegacy(targetUrl.href, 'non-x-url');
    return;
  }

  const nextPath = normalizeRoute(targetUrl);
  const previousPath = getCurrentPath();
  if (nextPath.toLowerCase() === previousPath.toLowerCase()) return;

  const previousEntryKey = getNavigationEntryKey();
  const task: NewXNavigationTask = {
    id: createNavigationId(),
    bridgeTimer: null,
    verifyTimer: null,
    removeBridgeListener: null,
  };
  activeNavigationTask = task;

  const verifyRouteCommit = (strategy: 'internal-router' | 'native-link') => {
    task.removeBridgeListener?.();
    task.removeBridgeListener = null;
    if (task.bridgeTimer) {
      window.clearTimeout(task.bridgeTimer);
      task.bridgeTimer = null;
    }

    task.verifyTimer = window.setTimeout(() => {
      task.verifyTimer = null;
      if (activeNavigationTask?.id !== task.id) return;

      const routeCommitted =
        getCurrentPath().toLowerCase() === nextPath.toLowerCase() ||
        Boolean(
          previousEntryKey && getNavigationEntryKey() !== previousEntryKey,
        );

      activeNavigationTask = null;
      if (routeCommitted) {
        console.log(LOG_PREFIX, 'new strategy: SPA committed', {
          strategy,
          target: targetUrl.href,
          current: window.location.href,
        });
      } else {
        fallbackToLegacy(targetUrl.href, `${strategy}-route-not-committed`);
      }
    }, ROUTE_COMMIT_TIMEOUT);
  };

  const tryNativeLink = (bridgeReason: string) => {
    const nativeAnchor = findNativeRouteAnchor(targetUrl);
    if (!nativeAnchor) {
      cancelNewXNavigationTask();
      fallbackToLegacy(
        targetUrl.href,
        `${bridgeReason};native-link-not-found`,
      );
      return;
    }

    console.log(LOG_PREFIX, 'new strategy: native X link matched', {
      bridgeReason,
      target: targetUrl.href,
      nativeHref: nativeAnchor.href,
      visible: isVisibleAnchor(nativeAnchor),
    });

    try {
      const handledByX = clickNativeRouteAnchorSafely(nativeAnchor);
      console.log(LOG_PREFIX, 'new strategy: native link clicked', {
        target: targetUrl.href,
        handledByX,
        fullPageNavigationPrevented: !handledByX,
      });
      verifyRouteCommit('native-link');
    } catch {
      cancelNewXNavigationTask();
      fallbackToLegacy(targetUrl.href, 'native-link-click-failed');
    }
  };

  const handleBridgeResult = (event: Event) => {
    const detail = (
      event as CustomEvent<{
        requestId?: string;
        ok?: boolean;
        reason?: string;
      }>
    ).detail;

    if (detail?.requestId !== task.id || activeNavigationTask?.id !== task.id) {
      return;
    }

    task.removeBridgeListener?.();
    task.removeBridgeListener = null;
    if (task.bridgeTimer) {
      window.clearTimeout(task.bridgeTimer);
      task.bridgeTimer = null;
    }

    if (detail.ok) {
      console.log(LOG_PREFIX, 'new strategy: internal TanStack router called', {
        target: targetUrl.href,
      });
      verifyRouteCommit('internal-router');
      return;
    }

    tryNativeLink(detail.reason || 'internal-router-unavailable');
  };

  window.addEventListener(NAVIGATE_RESULT_EVENT, handleBridgeResult);
  task.removeBridgeListener = () =>
    window.removeEventListener(NAVIGATE_RESULT_EVENT, handleBridgeResult);

  task.bridgeTimer = window.setTimeout(() => {
    task.bridgeTimer = null;
    if (activeNavigationTask?.id !== task.id) return;
    task.removeBridgeListener?.();
    task.removeBridgeListener = null;
    tryNativeLink('internal-router-timeout');
  }, ROUTER_BRIDGE_TIMEOUT);

  window.dispatchEvent(
    new CustomEvent(NAVIGATE_EVENT, {
      detail: { requestId: task.id, path: nextPath },
    }),
  );
};
