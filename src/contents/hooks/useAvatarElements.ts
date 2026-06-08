import { useCallback, useEffect, useState, useRef } from 'react';
import { useDebounceFn } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';
import { subscribeToMutation } from './useGlobalMutationObserver';

// Interface for tracking large avatars
interface TrackedAvatar {
  element: HTMLElement;
  username: string;
}

const AVATAR_SELECTOR = '[data-testid^="UserAvatar-Container-"]';

const getElementFromNode = (node: Node): Element | null => {
  return node.nodeType === Node.TEXT_NODE
    ? node.parentElement
    : node instanceof Element
      ? node
      : null;
};

const addAvatarElement = (
  elements: Set<HTMLElement>,
  element: Element | null,
) => {
  if (!(element instanceof HTMLElement)) return;

  const avatarElement = element.matches(AVATAR_SELECTOR)
    ? element
    : element.closest(AVATAR_SELECTOR);

  if (avatarElement instanceof HTMLElement) {
    elements.add(avatarElement);
  }
};

const addAvatarDescendants = (
  elements: Set<HTMLElement>,
  element: Element | null,
) => {
  if (!(element instanceof HTMLElement)) return;

  addAvatarElement(elements, element);
  element.querySelectorAll(AVATAR_SELECTOR).forEach((avatarElement) => {
    if (avatarElement instanceof HTMLElement) {
      elements.add(avatarElement);
    }
  });
};

const collectAddedAvatarElements = (mutations: MutationRecord[]) => {
  const elements = new Set<HTMLElement>();

  mutations.forEach((mutation) => {
    if (mutation.type !== 'childList') return;

    // target 只查自身/祖先，避免 body 级 mutation 每次 query 全页
    addAvatarElement(elements, getElementFromNode(mutation.target));
    mutation.addedNodes.forEach((node) => {
      addAvatarDescendants(elements, getElementFromNode(node));
    });
  });

  return Array.from(elements);
};

const collectRemovedAvatarRoots = (mutations: MutationRecord[]) => {
  const roots: HTMLElement[] = [];

  mutations.forEach((mutation) => {
    if (mutation.type !== 'childList') return;

    mutation.removedNodes.forEach((node) => {
      const element = getElementFromNode(node);
      if (element instanceof HTMLElement) {
        roots.push(element);
      }
    });
  });

  return roots;
};

export function useAvatarElements() {
  const [avatarElements, setAvatarElements] = useState<HTMLElement[]>([]);
  const [showAvatarRank] = useLocalStorage('@settings/showAvatarRank', true);
  const controllerRef = useRef<AbortController | null>(null);
  const processedNodesRef = useRef(new WeakSet());
  const processedAvatarElementsRef = useRef(new Set<HTMLElement>());
  const largeAvatarsRef = useRef(new Map<HTMLElement, TrackedAvatar>());
  const pendingAvatarElementsRef = useRef(new Set<HTMLElement>());
  const retryAvatarElementsRef = useRef(new Set<HTMLElement>());
  const avatarScanIdleRef = useRef<number | null>(null);
  const avatarRetryTimerRef = useRef<number | null>(null);
  const delayedFullScanTimersRef = useRef<number[]>([]);

  // Simple cache for querySelectorAll results keyed by selector, invalidated via version
  const scanAvatarElements = useCallback(
    (roots?: HTMLElement[]) => {
      if (!showAvatarRank) {
        setAvatarElements([]);
        return;
      }

      const matchedElements = new Set<HTMLElement>();
      const elements =
        roots && roots.length
          ? roots
          : (Array.from(
              document.querySelectorAll(AVATAR_SELECTOR),
            ) as HTMLElement[]);

      elements.forEach((element) => {
        if (!document.body.contains(element)) {
          return;
        }

        if (!processedNodesRef.current.has(element)) {
          // Exclusion using closest traversal
          const excludedAncestor = element.closest('[data-xhunt-exclude]');
          let shouldExclude = !!excludedAncestor;

          // Size check via offset dimensions
          const w = (element as HTMLElement).offsetWidth;
          const h = (element as HTMLElement).offsetHeight;
          if (w < 33 || h < 33) {
            shouldExclude = true;
          }

          if (!shouldExclude) {
            matchedElements.add(element);
            processedNodesRef.current.add(element);
            processedAvatarElementsRef.current.add(element);

            // Track large avatars
            if (w > 120 || h > 120) {
              const testId = element.getAttribute('data-testid');
              const username =
                testId?.replace('UserAvatar-Container-', '') || '';
              largeAvatarsRef.current.set(element, {
                element,
                username,
              });
            }
          }
        }
      });

      if (!roots || matchedElements.size > 0) {
        setAvatarElements(Array.from(matchedElements));
      }
    },
    [showAvatarRank],
  );

  const { run: findAvatarElements } = useDebounceFn(
    () => {
      scanAvatarElements();
    },
    {
      wait: 80,
      maxWait: 150,
      leading: false,
      trailing: true,
    },
  );


  const scheduleAvatarRetry = useCallback(
    (elements: HTMLElement[]) => {
      elements.forEach((element) => {
        retryAvatarElementsRef.current.add(element);
      });

      if (avatarRetryTimerRef.current !== null) return;

      avatarRetryTimerRef.current = window.setTimeout(() => {
        avatarRetryTimerRef.current = null;
        const retryElements = Array.from(retryAvatarElementsRef.current).filter(
          (element) => document.body.contains(element),
        );
        retryAvatarElementsRef.current.clear();

        if (retryElements.length) {
          scanAvatarElements(retryElements);
        }
      }, 160);
    },
    [scanAvatarElements],
  );

  const cleanupRemovedLargeAvatars = useCallback(
    (removedRoots: HTMLElement[]) => {
      if (!removedRoots.length) return;

      processedAvatarElementsRef.current.forEach((avatarElement) => {
        if (
          !document.body.contains(avatarElement) ||
          removedRoots.some(
            (root) =>
              root === avatarElement ||
              root.contains(avatarElement) ||
              avatarElement.contains(root),
          )
        ) {
          processedAvatarElementsRef.current.delete(avatarElement);
        }
      });

      if (!largeAvatarsRef.current.size) return;

      largeAvatarsRef.current.forEach((trackedAvatar, avatarElement) => {
        if (
          !document.body.contains(avatarElement) ||
          removedRoots.some(
            (root) =>
              root === avatarElement ||
              root.contains(avatarElement) ||
              avatarElement.contains(root),
          )
        ) {
          largeAvatarsRef.current.delete(trackedAvatar.element);
        }
      });
    },
    [],
  );

  const scheduleFocusedScan = useCallback(
    (elements: HTMLElement[], removedRoots: HTMLElement[]) => {
      cleanupRemovedLargeAvatars(removedRoots);

      if (!elements.length) return;

      elements.forEach((element) => {
        pendingAvatarElementsRef.current.add(element);
      });

      if (avatarScanIdleRef.current !== null) return;

      avatarScanIdleRef.current = requestIdleCallback(
        () => {
          avatarScanIdleRef.current = null;
          const pendingElements = Array.from(
            pendingAvatarElementsRef.current,
          ).filter((element) => document.body.contains(element));
          pendingAvatarElementsRef.current.clear();
          scanAvatarElements(pendingElements);
          scheduleAvatarRetry(pendingElements);
        },
        { timeout: 50 },
      );
    },
    [cleanupRemovedLargeAvatars, scanAvatarElements, scheduleAvatarRetry],
  );

  const resetAvatar = (element: HTMLElement) => {
    // Remove rank badge
    const badge = element.querySelector('.xhunt-avatar-rank-badge');
    badge?.remove();

    // Remove borders
    const parent = element.parentElement;
    if (parent) {
      parent.classList.remove('xhunt-avatar-inner-border');
      parent.style.borderRadius = '';

      const grandParent = parent.parentElement;
      if (grandParent) {
        grandParent.classList.remove('xhunt-avatar-outer-border');
        grandParent.style.borderRadius = '';
      }
    }

    // Remove from processed nodes
    processedNodesRef.current.delete(element);
    largeAvatarsRef.current.delete(element);
  };

  // Export functions and refs that useAvatarRanks needs
  (useAvatarElements as any).getLargeAvatars = () => largeAvatarsRef.current;
  (useAvatarElements as any).getProcessedAvatars = () =>
    processedAvatarElementsRef.current;
  (useAvatarElements as any).resetAvatar = resetAvatar;
  (useAvatarElements as any).processedNodes = processedNodesRef;

  useEffect(() => {
    if (!showAvatarRank) {
      setAvatarElements([]);
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();

    findAvatarElements();
    delayedFullScanTimersRef.current = [250, 1000].map((delay) =>
      window.setTimeout(() => {
        scanAvatarElements();
      }, delay),
    );

    const unsubscribe = subscribeToMutation(
      (mutations) => {
        const addedAvatarElements = collectAddedAvatarElements(mutations);
        const removedRoots = collectRemovedAvatarRoots(mutations);
        scheduleFocusedScan(addedAvatarElements, removedRoots);
      },
      {
        childList: true,
        subtree: true,
      },
      {
        // 使用 filter 只处理 childList 类型的 mutations
        filter: (mutation) => mutation.type === 'childList',
        debugName: 'useAvatarElements', // 调试名称
      },
    );

    return () => {
      unsubscribe();
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      if (avatarScanIdleRef.current !== null) {
        cancelIdleCallback(avatarScanIdleRef.current);
        avatarScanIdleRef.current = null;
      }
      if (avatarRetryTimerRef.current !== null) {
        window.clearTimeout(avatarRetryTimerRef.current);
        avatarRetryTimerRef.current = null;
      }
      delayedFullScanTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
      });
      delayedFullScanTimersRef.current = [];
      pendingAvatarElementsRef.current.clear();
      retryAvatarElementsRef.current.clear();
      processedNodesRef.current = new WeakSet();
      processedAvatarElementsRef.current.clear();
      largeAvatarsRef.current.clear();
    };
  }, [findAvatarElements, scheduleFocusedScan, scanAvatarElements, showAvatarRank]);

  return avatarElements;
}
