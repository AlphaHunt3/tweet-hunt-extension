import { useCallback, useEffect, useRef, useState } from 'react';
import { extractTickerOrCA } from '~contents/utils';
import { useDebounceFn } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';
import { subscribeToMutation } from './useGlobalMutationObserver';

// Constants definition: excluded tag types
const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';

const getElementFromNode = (node: Node): Element | null => {
  return node.nodeType === Node.TEXT_NODE
    ? node.parentElement
    : node instanceof Element
      ? node
      : null;
};

const collectTweetTextContainers = (mutations: MutationRecord[]) => {
  const affected = new Set<HTMLElement>();

  const addContainer = (container: Element | null) => {
    if (container instanceof HTMLElement) {
      affected.add(container);
    }
  };

  const addFromElement = (element: Element | null) => {
    if (!(element instanceof HTMLElement)) return;

    if (element.matches(TWEET_TEXT_SELECTOR)) {
      affected.add(element);
    }

    addContainer(element.closest(TWEET_TEXT_SELECTOR));

    element.querySelectorAll(TWEET_TEXT_SELECTOR).forEach((container) => {
      addContainer(container);
    });
  };

  mutations.forEach((mutation) => {
    if (mutation.type === 'characterData') {
      addContainer(
        (mutation.target as Node).parentElement?.closest(TWEET_TEXT_SELECTOR) ||
          null,
      );
      return;
    }

    if (mutation.type !== 'childList') return;

    addFromElement(getElementFromNode(mutation.target));
    mutation.addedNodes.forEach((node) =>
      addFromElement(getElementFromNode(node)),
    );
    mutation.removedNodes.forEach((node) =>
      addFromElement(getElementFromNode(node)),
    );
  });

  return Array.from(affected);
};

export function useTickerElements(enabled = true) {
  const [tickerElements, setTickerElements] = useState<HTMLElement[]>([]);
  const focusedScanIdleRef = useRef<number | null>(null);
  const pendingFocusedContainersRef = useRef(new Set<HTMLElement>());
  const [showTokenAnalysis] = useLocalStorage(
    '@settings/showTokenAnalysis',
    true,
  );

  const scanContainers = useCallback((roots?: HTMLElement[]) => {
    const processedNodes = new WeakSet<Node>();
    const matchedElements = new Set<HTMLElement>();

    const containers: HTMLElement[] =
      roots && roots.length
        ? roots
        : (Array.from(
            document.querySelectorAll(TWEET_TEXT_SELECTOR),
          ) as HTMLElement[]);

    for (const container of containers) {
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // 1. Quick exclude empty text
            if (!node.textContent?.trim()) return NodeFilter.FILTER_SKIP;

            // 2. Exclude script/style/noscript tag content
            const parentTag = node.parentElement?.tagName;
            if (parentTag && EXCLUDED_TAGS.has(parentTag)) {
              return NodeFilter.FILTER_SKIP;
            }

            // 3. Exclude input elements and their descendants
            const p = node.parentElement;
            if (!p) return NodeFilter.FILTER_SKIP;
            if (p.closest('input, textarea, select')) {
              return NodeFilter.FILTER_SKIP;
            }
            if (
              p.closest(
                '[contenteditable="true"], [role="textbox"], [data-xhunt-exclude], [data-xhunt-processed]',
              )
            ) {
              return NodeFilter.FILTER_SKIP;
            }
            if (
              p.closest(
                '[data-testid="UserName"], [data-testid="SideNav_AccountSwitcher_Button"], [data-testid="conversation"]',
              )
            ) {
              return NodeFilter.FILTER_SKIP;
            }

            // 4. Exclude processed nodes
            if (processedNodes.has(node)) {
              return NodeFilter.FILTER_SKIP;
            }

            // 5. Get current node's pure text content (don't merge child nodes)
            const directText = node.textContent.trim();
            if (!directText) return NodeFilter.FILTER_SKIP;

            // 5.1 Quick symbol pre-check to avoid unnecessary parsing
            if (!directText.includes('$') && !directText.includes('0x')) {
              return NodeFilter.FILTER_SKIP;
            }

            // 6. Check if matches ticker or CA
            const matches = extractTickerOrCA(directText);
            if (!matches.length) return NodeFilter.FILTER_SKIP;

            // 7. Mark node as processed
            processedNodes.add(node);

            return NodeFilter.FILTER_ACCEPT;
          },
        },
      );

      let n;
      while ((n = walker.nextNode())) {
        const el = (n as Node).parentElement as HTMLElement | null;
        if (el) matchedElements.add(el);
      }
    }

    if (!roots || matchedElements.size > 0) {
      setTickerElements(Array.from(matchedElements));
    }
  }, []);

  const { run: findTickerElements } = useDebounceFn(
    () => {
      if (!enabled || !showTokenAnalysis) {
        setTickerElements([]);
        return;
      }

      scanContainers();
    },
    {
      wait: 1000,
      leading: false,
      trailing: true,
    },
  );

  useEffect(() => {
    if (!enabled || !showTokenAnalysis) {
      setTickerElements([]);
      return;
    }

    findTickerElements();

    const scheduleFocusedScan = (containers: HTMLElement[]) => {
      if (!containers.length) return;

      containers.forEach((container) => {
        pendingFocusedContainersRef.current.add(container);
      });

      if (focusedScanIdleRef.current !== null) return;

      focusedScanIdleRef.current = requestIdleCallback(
        () => {
          focusedScanIdleRef.current = null;
          const pendingContainers = Array.from(
            pendingFocusedContainersRef.current,
          ).filter((container) => document.body.contains(container));
          pendingFocusedContainersRef.current.clear();
          scanContainers(pendingContainers);
        },
        { timeout: 1000 },
      );
    };

    // 使用全局 MutationObserver 替换原来的独立实例
    const unsubscribe = subscribeToMutation(
      (mutations) => {
        const affected = collectTweetTextContainers(mutations);
        scheduleFocusedScan(affected);
      },
      {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false,
      },
      {
        // 使用 filter 只处理 childList 或 characterData 类型的 mutations
        filter: (mutation) =>
          mutation.type === 'childList' || mutation.type === 'characterData',
        debugName: 'useTickerElements',
      },
    );

    return () => {
      unsubscribe();
      if (focusedScanIdleRef.current !== null) {
        cancelIdleCallback(focusedScanIdleRef.current);
        focusedScanIdleRef.current = null;
      }
      pendingFocusedContainersRef.current.clear();
    };
  }, [enabled, findTickerElements, scanContainers, showTokenAnalysis]);

  return tickerElements;
}
