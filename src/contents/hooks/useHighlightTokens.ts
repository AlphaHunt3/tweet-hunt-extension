import { useEffect, useMemo } from 'react';
import { SupportedToken } from '~types';
import { extractTickerOrCA } from '~contents/utils';
import { useTickerElements } from './useTickerElements';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { localSupportedTokens } from '~contents/utils/tokens.ts';

export const TOKEN_HOVER_EVENT = 'xhunt:token-hover';

export interface TokenHoverDetail {
  ticker: string;
  element: HTMLElement;
}

interface TokenMatch {
  text: string;
  index: number;
  length: number;
}

export function useHighlightTokens(supportedTokens: SupportedToken[] | null) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const tickerElements = useTickerElements();
  const { supportedSymbols, supportedCAs } = useMemo(() => {
    if (!supportedTokens) {
      return { supportedSymbols: localSupportedTokens, supportedCAs: new Set<string>() };
    }
    return {
      supportedSymbols: new Set(supportedTokens.map(token => token.symbol.toLowerCase())),
      supportedCAs: new Set(supportedTokens.map(token => token.ca?.toLowerCase()).filter(Boolean))
    };
  }, [supportedTokens]);

  useEffect(() => {
    if (!supportedTokens || !tickerElements.length) return;

    function createTokenRegex(tokens: string[]): RegExp {
      const escaped = tokens.map(t => t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
      return new RegExp(`(${escaped.join('|')})`, 'g');
    }

    function findTokenMatches(text: string, tokens: string[]): TokenMatch[] {
      if (!tokens.length) return [];
      const regex = createTokenRegex(tokens);
      const matches: TokenMatch[] = [];

      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          text: match[0],
          index: match.index,
          length: match[0].length
        });
      }

      return matches.sort((a, b) => a.index - b.index);
    }

    const processNode = (element: Node): DocumentFragment | null => {
      const node = element.firstChild!;
      if (!node.textContent) return null;

      let text = node.textContent;
      if (!text.includes('$')) {
        const preSibling = element.previousSibling;
        if (preSibling && preSibling.textContent && preSibling.textContent.endsWith('$')) {
          preSibling.textContent = preSibling.textContent.slice(0, -1);
          text = `$${text}`;
        } else {
          return null;
        }
      }
      const tickersOrCAs = extractTickerOrCA(text);
      if (!tickersOrCAs.length) return null;

      const allMatches = findTokenMatches(text, tickersOrCAs);
      const validMatches = allMatches.reduce<TokenMatch[]>((acc, curr) => {
        const lastMatch = acc[acc.length - 1];
        if (!lastMatch || curr.index >= lastMatch.index + lastMatch.length) {
          acc.push(curr);
        }
        return acc;
      }, []);

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      for (const match of validMatches) {
        const isTicker = match.text.startsWith('$');
        const key = isTicker ? match.text.slice(1).toLowerCase() : match.text.toLowerCase();
        const isSupported = isTicker ? supportedSymbols.has(key) : supportedCAs.has(key);

        if (!isSupported) continue;

        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        const wrapper = document.createElement('span');
        wrapper.setAttribute('data-xhunt-processed', 'true');
        wrapper.setAttribute('data-xhunt-url', window.location.href);
        wrapper.className = 'xhunt-token-highlight';

        const textSpan = document.createElement('span');
        textSpan.textContent = match.text;
        textSpan.className = 'xhunt-token-highlight-text';

        wrapper.appendChild(textSpan);

        wrapper.addEventListener('mouseenter', () => {
          requestIdleCallback(() => {
            const detail: TokenHoverDetail = {
              ticker: match.text,
              element: wrapper
            };
            window.dispatchEvent(new CustomEvent(TOKEN_HOVER_EVENT, { detail }));
          }, {
             timeout: 300
          });
        });

        wrapper.addEventListener('mouseleave', () => {
          requestIdleCallback(() => {
            window.dispatchEvent(new CustomEvent(TOKEN_HOVER_EVENT, { detail: null }));
          }, {
            timeout: 300
          });
        });

        fragment.appendChild(wrapper);
        lastIndex = match.index + match.length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      return fragment;
    };

    tickerElements.forEach(element => {
      const processedUrl = element.getAttribute('data-xhunt-url');
      const currentUrl = window.location.href;

      if (processedUrl === currentUrl) return;

      const fragment = processNode(element);
      if (fragment) {
        element.textContent = '';
        element.appendChild(fragment);
        element.setAttribute('data-xhunt-url', currentUrl);
      }
    });

  }, [theme, supportedSymbols, supportedCAs, tickerElements]);
}
