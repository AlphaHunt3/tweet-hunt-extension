import { useEffect, useState, useRef } from 'react';
import { useDebounceFn } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';
import { subscribeToMutation } from './useGlobalMutationObserver';

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
  const AVATAR_SELECTOR = '[data-testid^="UserAvatar-Container-"]';

  // Simple cache for querySelectorAll results keyed by selector, invalidated via version

  const { run: findAvatarElements } = useDebounceFn(
    () => {
      if (!showAvatarRank) {
        setAvatarElements([]);
        return;
      }

      const matchedElements = new Set<HTMLElement>();
      const elements = Array.from(
        document.querySelectorAll(AVATAR_SELECTOR)
      ) as HTMLElement[];

      elements.forEach((element) => {
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

      setAvatarElements(Array.from(matchedElements));
    },
    {
      wait: 80,
      maxWait: 150,
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

    // 使用全局 MutationObserver 替换原来的独立实例
    const unsubscribe = subscribeToMutation(
      (mutations) => {
        // 检查是否有新的 avatars 被添加
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const addedHasAvatars = Array.from(mutation.addedNodes).some(
              (node) => {
                if (node instanceof HTMLElement) {
                  return (
                    node.matches?.(AVATAR_SELECTOR) ||
                    node.querySelector(AVATAR_SELECTOR) !== null
                  );
                }
                return false;
              }
            );

            const removedHasAvatars = Array.from(mutation.removedNodes).some(
              (node) => {
                if (node instanceof HTMLElement) {
                  return (
                    node.matches?.(AVATAR_SELECTOR) ||
                    node.querySelector(AVATAR_SELECTOR) !== null
                  );
                }
                return false;
              }
            );

            if (addedHasAvatars || removedHasAvatars) {
              if (controllerRef.current) {
                controllerRef.current.abort();
              }
              controllerRef.current = new AbortController();

              // Coalesce bursts of mutations
              requestIdleCallback(() => findAvatarElements(), { timeout: 50 });
              break;
            }
          }
        }
      },
      {
        childList: true,
        subtree: true,
      },
      {
        // 使用 filter 只处理 childList 类型的 mutations
        filter: (mutation) => mutation.type === 'childList',
        debugName: 'useAvatarElements', // 调试名称
      }
    );

    return () => {
      unsubscribe();
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      processedNodesRef.current = new WeakSet();
      largeAvatarsRef.current.clear();
    };
  }, [findAvatarElements, showAvatarRank]);

  return avatarElements;
}
