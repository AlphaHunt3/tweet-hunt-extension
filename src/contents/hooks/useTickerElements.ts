import { useEffect, useState } from 'react';
import { extractTickerOrCA } from '~contents/utils';
import { useDebounceFn } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';

// Constants definition: excluded tag types
const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

// Input element types that should be excluded
const INPUT_ELEMENT_TYPES = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// Cache processed nodes to avoid reprocessing
const processedNodes = new WeakSet();

export function useTickerElements() {
  const [tickerElements, setTickerElements] = useState<HTMLElement[]>([]);
  const [showTokenAnalysis] = useLocalStorage('@settings/showTokenAnalysis', true);

  const { run: findTickerElements } = useDebounceFn(
    () => {
      if (!showTokenAnalysis) {
        setTickerElements([]);
        return;
      }

      const matchedElements = new Set<HTMLElement>();

      const walker = document.createTreeWalker(
        document.body,
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
            let parent = node.parentElement;
            while (parent) {
              // Check if parent is an input element
              if (INPUT_ELEMENT_TYPES.has(parent.tagName)) {
                return NodeFilter.FILTER_SKIP;
              }

              // Check for contenteditable elements
              if (parent.contentEditable === 'true') {
                return NodeFilter.FILTER_SKIP;
              }

              // Check for role="textbox" elements
              if (parent.getAttribute('role') === 'textbox') {
                return NodeFilter.FILTER_SKIP;
              }

              // Check for data-xhunt-exclude ancestors
              if (parent.hasAttribute('data-xhunt-exclude') || parent.hasAttribute('data-xhunt-processed')) {
                return NodeFilter.FILTER_SKIP;
              }
              const dataTestId = parent.getAttribute('data-testid');
              if (dataTestId === 'UserName' || dataTestId === 'SideNav_AccountSwitcher_Button' || dataTestId === 'conversation') {
                return NodeFilter.FILTER_SKIP;
              }

              parent = parent.parentElement;
            }

            // 4. Exclude processed nodes
            if (processedNodes.has(node)) {
              return NodeFilter.FILTER_SKIP;
            }

            // 5. Get current node's pure text content (don't merge child nodes)
            const directText = node.textContent.trim();
            if (!directText) return NodeFilter.FILTER_SKIP;

            // 6. Check if matches ticker or CA
            const matches = extractTickerOrCA(directText);
            if (!matches.length) return NodeFilter.FILTER_SKIP;

            // 7. Mark node as processed
            processedNodes.add(node);

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      // Collect all matching elements (auto-dedupe)
      let node;
      while ((node = walker.nextNode())) {
        const el = node.parentElement;
        if (el) matchedElements.add(el);
      }

      setTickerElements(Array.from(matchedElements));
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

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          requestIdleCallback(() => findTickerElements(), { timeout: 1000 });
          break;
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false,
    });

    return () => observer.disconnect();
  }, [findTickerElements, showTokenAnalysis]);

  return tickerElements;
}
