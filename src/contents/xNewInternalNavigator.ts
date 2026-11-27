const NAVIGATE_EVENT = '__xhunt:new-x-navigate';
const NAVIGATE_RESULT_EVENT = '__xhunt:new-x-navigate-result';

export const config = {
  matches: ['https://x.com/*'],
  world: 'MAIN',
};

type ReactFiber = {
  child?: ReactFiber | null;
  sibling?: ReactFiber | null;
  memoizedProps?: unknown;
  pendingProps?: unknown;
};

type XRouter = {
  navigate: (options: { to: string }) => unknown;
  history?: unknown;
  state?: unknown;
};

type NavigateRequest = {
  requestId?: string;
  path?: string;
};

let cachedRouter: XRouter | null = null;

const isXRouter = (value: unknown): value is XRouter => {
  if (!value || typeof value !== 'object') return false;

  const router = value as Partial<XRouter>;
  return (
    typeof router.navigate === 'function' &&
    Boolean(router.history) &&
    Boolean(router.state)
  );
};

const getRouterFromProps = (value: unknown) => {
  if (!value || typeof value !== 'object') return null;

  const router = (value as { router?: unknown }).router;
  return isXRouter(router) ? router : null;
};

const getReactFiberRoots = () => {
  const roots: ReactFiber[] = [];
  const elements = [
    document,
    document.documentElement,
    document.body,
    ...Array.from(document.body?.children || []),
  ].filter(Boolean) as Array<Document | Element>;

  for (const element of elements) {
    for (const key of Object.getOwnPropertyNames(element)) {
      if (
        !key.startsWith('__reactContainer$') &&
        !key.startsWith('__reactFiber$')
      ) {
        continue;
      }

      const fiber = (element as unknown as Record<string, unknown>)[key];
      if (fiber && typeof fiber === 'object') {
        roots.push(fiber as ReactFiber);
      }
    }
  }

  return roots;
};

const findXRouter = () => {
  if (cachedRouter) return cachedRouter;

  const stack = getReactFiberRoots();
  const visited = new Set<ReactFiber>();

  while (stack.length > 0 && visited.size < 10000) {
    const fiber = stack.pop();
    if (!fiber || visited.has(fiber)) continue;
    visited.add(fiber);

    const router =
      getRouterFromProps(fiber.memoizedProps) ||
      getRouterFromProps(fiber.pendingProps);
    if (router) {
      cachedRouter = router;
      return router;
    }

    if (fiber.sibling) stack.push(fiber.sibling);
    if (fiber.child) stack.push(fiber.child);
  }

  return null;
};

const emitResult = (
  requestId: string | undefined,
  ok: boolean,
  reason: string,
) => {
  if (!requestId) return;

  window.dispatchEvent(
    new CustomEvent(NAVIGATE_RESULT_EVENT, {
      detail: { requestId, ok, reason },
    }),
  );
};

window.addEventListener(NAVIGATE_EVENT, (event) => {
  const { path, requestId } = (
    event as CustomEvent<NavigateRequest>
  ).detail || { path: undefined, requestId: undefined };

  if (!path || !path.startsWith('/')) {
    emitResult(requestId, false, 'invalid-path');
    return;
  }

  const targetUrl = new URL(path, window.location.origin);
  if (targetUrl.origin !== window.location.origin) {
    emitResult(requestId, false, 'cross-origin-path');
    return;
  }

  const router = findXRouter();
  if (!router) {
    emitResult(requestId, false, 'router-not-found');
    return;
  }

  try {
    const result = router.navigate({
      to: targetUrl.pathname + targetUrl.search + targetUrl.hash,
    });
    Promise.resolve(result).catch(() => {
      cachedRouter = null;
    });
    emitResult(requestId, true, 'router-navigate-called');
  } catch {
    cachedRouter = null;
    emitResult(requestId, false, 'router-navigate-threw');
  }
});
