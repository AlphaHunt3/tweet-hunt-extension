import { useEffect, useState } from 'react';
import { extractTickerOrCA } from '~contents/utils';
import { useDebounceFn } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';
import { subscribeToMutation } from './useGlobalMutationObserver';

// Constants definition: excluded tag types
const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

// Input element types that should be excluded
const INPUT_ELEMENT_TYPES = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// Cache processed nodes to avoid reprocessing (scoped per scan)

export function useTickerElements() {
  const [tickerElements, setTickerElements] = useState<HTMLElement[]>([]);
  const [showTokenAnalysis] = useLocalStorage(
    '@settings/showTokenAnalysis',
    true
  );

  const TWEET_TEXT_SELECTOR = '[data-testid="tweetText"]';

  const { run: findTickerElements } = useDebounceFn(
    () => {
      if (!showTokenAnalysis) {
        setTickerElements([]);
        return;
      }

      const scan = (roots?: HTMLElement[]) => {
        const processedNodes = new WeakSet<Node>();
        const matchedElements = new Set<HTMLElement>();

        const containers: HTMLElement[] =
          roots && roots.length
            ? roots
            : (Array.from(
                document.querySelectorAll(TWEET_TEXT_SELECTOR)
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
                    '[contenteditable="true"], [role="textbox"], [data-xhunt-exclude], [data-xhunt-processed]'
                  )
                ) {
                  return NodeFilter.FILTER_SKIP;
                }
                if (
                  p.closest(
                    '[data-testid="UserName"], [data-testid="SideNav_AccountSwitcher_Button"], [data-testid="conversation"]'
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
            }
          );

          let n;
          while ((n = walker.nextNode())) {
            const el = (n as Node).parentElement as HTMLElement | null;
            if (el) matchedElements.add(el);
          }
        }

        setTickerElements(Array.from(matchedElements));
      };

      scan();
    },
    {
      wait: 1000,
      leading: false,
      trailing: true,
    }
  );

  useEffect(() => {
    if (!showTokenAnalysis) {
      setTickerElements([]);
      return;
    }

    findTickerElements();

    // 使用全局 MutationObserver 替换原来的独立实例
    const unsubscribe = subscribeToMutation(
      (mutations) => {
        // 检查是否有 childList 或 characterData 类型的变化
        for (const mutation of mutations) {
          if (
            mutation.type === 'childList' ||
            mutation.type === 'characterData'
          ) {
            const affected = new Set<HTMLElement>();
            if (mutation.type === 'characterData') {
              const p = (mutation.target as Node).parentElement;
              const c = p?.closest(TWEET_TEXT_SELECTOR) as HTMLElement | null;
              if (c) affected.add(c);
            } else {
              const nodes = [
                ...Array.from(mutation.addedNodes),
                ...Array.from(mutation.removedNodes),
              ];
              for (const n of nodes) {
                const el =
                  n.nodeType === Node.TEXT_NODE
                    ? (n as Node).parentElement
                    : (n as Element | null);
                const c =
                  el instanceof HTMLElement
                    ? (el.closest(TWEET_TEXT_SELECTOR) as HTMLElement | null)
                    : null;
                if (c) affected.add(c);
              }
            }

            if (affected.size) {
              requestIdleCallback(
                () => {
                  // reuse inner scan via debounced runner by invoking directly similar to initial
                  // We can't pass args to debounced run; perform a focused scan here
                  const processedNodes = new WeakSet<Node>();
                  const matchedElements = new Set<HTMLElement>();
                  for (const container of affected) {
                    const walker = document.createTreeWalker(
                      container,
                      NodeFilter.SHOW_TEXT,
                      {
                        acceptNode: (node) => {
                          if (!node.textContent?.trim())
                            return NodeFilter.FILTER_SKIP;
                          const parentTag = node.parentElement?.tagName;
                          if (parentTag && EXCLUDED_TAGS.has(parentTag)) {
                            return NodeFilter.FILTER_SKIP;
                          }
                          const p = node.parentElement;
                          if (!p) return NodeFilter.FILTER_SKIP;
                          if (p.closest('input, textarea, select'))
                            return NodeFilter.FILTER_SKIP;
                          if (
                            p.closest(
                              '[contenteditable="true"], [role="textbox"], [data-xhunt-exclude], [data-xhunt-processed]'
                            )
                          )
                            return NodeFilter.FILTER_SKIP;
                          if (
                            p.closest(
                              '[data-testid="UserName"], [data-testid="SideNav_AccountSwitcher_Button"], [data-testid="conversation"]'
                            )
                          )
                            return NodeFilter.FILTER_SKIP;
                          if (processedNodes.has(node))
                            return NodeFilter.FILTER_SKIP;
                          const directText = node.textContent.trim();
                          if (!directText) return NodeFilter.FILTER_SKIP;
                          if (
                            !directText.includes('$') &&
                            !directText.includes('0x')
                          )
                            return NodeFilter.FILTER_SKIP;
                          const matches = extractTickerOrCA(directText);
                          if (!matches.length) return NodeFilter.FILTER_SKIP;
                          processedNodes.add(node);
                          return NodeFilter.FILTER_ACCEPT;
                        },
                      }
                    );
                    let nx;
                    while ((nx = walker.nextNode())) {
                      const el = (nx as Node)
                        .parentElement as HTMLElement | null;
                      if (el) matchedElements.add(el);
                    }
                  }
                  setTickerElements(Array.from(matchedElements));
                },
                { timeout: 1000 }
              );
            } else {
              requestIdleCallback(() => findTickerElements(), {
                timeout: 1000,
              });
            }
            break;
          }
        }
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
      }
    );

    return () => unsubscribe();
  }, [findTickerElements, showTokenAnalysis]);

  return tickerElements;
}
