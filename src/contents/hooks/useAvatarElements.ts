import { useEffect, useState, useRef } from 'react';
import { useDebounceFn } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';

// Interface for tracking large avatars
interface TrackedAvatar {
  element: HTMLElement;
  username: string;
}

export function useAvatarElements() {
  const [avatarElements, setAvatarElements] = useState<HTMLElement[]>([]);
  const [showAvatarRank] = useLocalStorage('@settings/showAvatarRank', true);
  const controllerRef = useRef<AbortController | null>(null);
  const processedNodesRef = useRef(new WeakSet());
  const largeAvatarsRef = useRef(new Map<HTMLElement, TrackedAvatar>());

  const { run: findAvatarElements } = useDebounceFn(
    () => {
      if (!showAvatarRank) {
        setAvatarElements([]);
        return;
      }

      const matchedElements = new Set<HTMLElement>();
      const elements = document.querySelectorAll('[data-testid^="UserAvatar-Container-"]');

      elements.forEach(element => {
        if (element instanceof HTMLElement && !processedNodesRef.current.has(element)) {
          let parent = element.parentElement;
          let shouldExclude = false;

          while (parent) {
            if (parent.hasAttribute('data-xhunt-exclude')) {
              shouldExclude = true;
              break;
            }
            parent = parent.parentElement;
          }

          const rect = element.getBoundingClientRect();
          if (rect.width < 33 || rect.height < 33) {
            shouldExclude = true;
          }

          if (!shouldExclude) {
            matchedElements.add(element);
            processedNodesRef.current.add(element);

            // Track large avatars
            if (rect.width > 120 || rect.height > 120) {
              const testId = element.getAttribute('data-testid');
              const username = testId?.replace('UserAvatar-Container-', '') || '';
              largeAvatarsRef.current.set(element, {
                element,
                username
              });
            }
          }
        }
      });

      setAvatarElements(Array.from(matchedElements));
    },
    {
      wait: 300,
      leading: false,
      trailing: true,
    }
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

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const hasNewAvatars = Array.from(mutation.addedNodes).some(node => {
            if (node instanceof HTMLElement) {
              return node.matches?.('[data-testid^="UserAvatar-Container-"]') ||
                node.querySelector('[data-testid^="UserAvatar-Container-"]') !== null;
            }
            return false;
          });

          if (hasNewAvatars) {
            if (controllerRef.current) {
              controllerRef.current.abort();
            }
            controllerRef.current = new AbortController();

            requestIdleCallback(() => findAvatarElements(), { timeout: 500 });
            break;
          }
        }
      }
    });

    const targetNode = document.querySelector('.avatar-container') || document.body;
    observer.observe(targetNode, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      processedNodesRef.current = new WeakSet();
      largeAvatarsRef.current.clear();
    };
  }, [findAvatarElements, showAvatarRank]);

  return avatarElements;
}
