const X_MAIN_HOSTS = new Set(['x.com', 'twitter.com']);
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const LOG_PREFIX = '[XHunt navigateInX]';
const RETRY_DELAY = 1000;
const VERIFY_DELAY = 3000;
const LOADING_VERIFY_DELAY = 1000;
const MAX_LOADING_VERIFY_COUNT = 3;

type NavigationTask = {
  id: string;
  retryTimer: number | null;
  verifyTimer: number | null;
};

let activeNavigationTask: NavigationTask | null = null;

function getCurrentPath() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function createNavigationId() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
}

function isAllowedProtocol(url: URL) {
  return ALLOWED_PROTOCOLS.has(url.protocol);
}

function isXMainHost(hostname: string) {
  return X_MAIN_HOSTS.has(hostname.toLowerCase());
}

function isVisibleElement(el: Element) {
  const style = window.getComputedStyle(el);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    Number(style.opacity) === 0
  ) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isActiveProgressBar(el: Element) {
  if (!isVisibleElement(el)) return false;

  const ariaValueNow = el.getAttribute('aria-valuenow');
  if (ariaValueNow !== null && Number(ariaValueNow) <= 0) {
    return false;
  }

  const bar = el.querySelector('[data-testid="progressBar-bar"]') as HTMLElement | null;
  if (!bar) return true;

  const width = parseFloat(bar.style.width || '0');
  return Number.isNaN(width) || width > 0;
}

function isXRouteLoading() {
  const loadingEls = Array.from(
    document.querySelectorAll(
      [
        '[role="progressbar"]',
        '[data-testid="progressBar"]',
        '[aria-label="Loading"]',
        '[aria-label="加载中"]',
      ].join(',')
    )
  );

  return loadingEls.some(isActiveProgressBar);
}

function clearNavigationTask(task: NavigationTask | null) {
  if (!task) return;

  if (task.retryTimer) {
    window.clearTimeout(task.retryTimer);
    task.retryTimer = null;
  }

  if (task.verifyTimer) {
    window.clearTimeout(task.verifyTimer);
    task.verifyTimer = null;
  }
}

function cancelActiveNavigationTask() {
  clearNavigationTask(activeNavigationTask);
  activeNavigationTask = null;
}

function notifyRouteChange(state: unknown) {
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
  window.dispatchEvent(new Event('locationchange'));
}

function notifyRouteChangeWithRetryAndVerify(params: {
  state: unknown;
  nextPath: string;
  targetHref: string;
  previousPath: string;
  previousTitle: string;
}) {
  const { state, nextPath, targetHref, previousPath, previousTitle } = params;
  const task: NavigationTask = {
    id: createNavigationId(),
    retryTimer: null,
    verifyTimer: null,
  };

  cancelActiveNavigationTask();
  activeNavigationTask = task;

  const isActiveTask = () => activeNavigationTask?.id === task.id;

  notifyRouteChange(state);

  task.retryTimer = window.setTimeout(() => {
    task.retryTimer = null;
    if (!isActiveTask()) return;

    if (document.title !== previousTitle) {
      cancelActiveNavigationTask();
      return;
    }

    notifyRouteChange(state);
  }, RETRY_DELAY);

  const verify = (loadingVerifyCount = 0) => {
    if (!isActiveTask()) return;

    task.verifyTimer = null;

    if (getCurrentPath() !== nextPath) {
      cancelActiveNavigationTask();
      return;
    }

    if (document.title !== previousTitle) {
      cancelActiveNavigationTask();
      return;
    }

    if (isXRouteLoading() && loadingVerifyCount < MAX_LOADING_VERIFY_COUNT) {
      task.verifyTimer = window.setTimeout(
        () => verify(loadingVerifyCount + 1),
        LOADING_VERIFY_DELAY
      );
      return;
    }

    console.log(LOG_PREFIX, 'navigation looks failed, open target url in new tab', {
      nextPath,
      targetHref,
      title: document.title,
    });

    cancelActiveNavigationTask();
    window.history.replaceState(null, '', previousPath);
    window.open(targetHref, '_blank', 'noopener,noreferrer');
  };

  task.verifyTimer = window.setTimeout(() => verify(), VERIFY_DELAY);
}

export function navigateInX(url: string) {
  try {
    const targetUrl = new URL(url, window.location.href);

    if (!isAllowedProtocol(targetUrl)) {
      console.log(LOG_PREFIX, 'blocked unsupported protocol', { url });
      return;
    }

    const isXUrl = isXMainHost(targetUrl.hostname);
    const isCurrentXPage = isXMainHost(window.location.hostname);

    if (!isXUrl || !isCurrentXPage) {
      cancelActiveNavigationTask();
      window.open(targetUrl.href, '_blank', 'noopener,noreferrer');
      return;
    }

    const nextPath = targetUrl.pathname + targetUrl.search + targetUrl.hash;
    const previousPath = getCurrentPath();
    const previousTitle = document.title;

    if (nextPath === previousPath) {
      cancelActiveNavigationTask();
      return;
    }

    const nextState = null;
    window.history.pushState(nextState, '', nextPath);
    notifyRouteChangeWithRetryAndVerify({
      state: nextState,
      nextPath,
      targetHref: targetUrl.href,
      previousPath,
      previousTitle,
    });
  } catch (error) {
    cancelActiveNavigationTask();
    console.log(LOG_PREFIX, 'navigate failed, open raw url in new tab', { url, error });
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
