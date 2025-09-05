import { useEffect, useMemo } from 'react';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

export const PLACEMENT_TRACKING_CLICK_EVENT = 'xhunt:placement-tracking-click';

/**
 * Hook: listen for div[data-testid="placementTracking"] and dispatch a window event on click
 * Returns the detected element for optional external use.
 */
type MantleTaskProgress = {
  'follow-mantle'?: boolean;
  'follow-xhunt'?: boolean;
  'follow-minibridge'?: boolean;
  'follow-biteye'?: boolean;
  'join-telegram'?: boolean;
};

export default function usePlacementTrackingClick(): HTMLElement | null {
  // Current plugin user (must be logged in for tracking)
  const [xhuntUser] = useLocalStorage<
    | {
        id: string;
      }
    | null
    | ''
  >('@xhunt/user', null);

  const tasksKey = useMemo(() => {
    if (!xhuntUser || typeof xhuntUser !== 'object' || !xhuntUser.id) return '';
    return `@xhunt/mantleTasks:${xhuntUser.id}`;
  }, [xhuntUser]);

  const [taskProgress, setTaskProgress] = useLocalStorage<MantleTaskProgress>(
    tasksKey || '@xhunt/mantleTasks:guest',
    {}
  );

  const placementTrackingEl = useWaitForElement(
    'div[data-testid="placementTracking"]'
  );

  // Shared helpers to avoid duplication between initial detection and click handling
  const parseFollowInfo = (container: HTMLElement) => {
    const followButton = container.querySelector(
      'button[data-testid$="-unfollow"], button[data-testid$="-follow"]'
    ) as HTMLButtonElement | null;

    let followState: 'follow' | 'unfollow' | null = null;
    let targetUserId: string | null = null;

    if (followButton) {
      const testId = followButton.getAttribute('data-testid') || '';
      const match = testId.match(/^(\d+)-(unfollow|follow)$/);
      if (match) {
        targetUserId = match[1];
        followState = match[2] as 'follow' | 'unfollow';
      } else {
        if (testId.includes('-unfollow')) followState = 'unfollow';
        if (testId.includes('-follow')) followState = 'follow';
        const lastDash = testId.lastIndexOf('-');
        if (lastDash > 0) {
          const possibleId = testId.slice(0, lastDash);
          if (/^\d+$/.test(possibleId)) {
            targetUserId = possibleId;
          }
        }
      }
    }

    let handle = '';
    try {
      const path = window.location.pathname || '';
      const seg = path.split('/').filter(Boolean)[0];
      handle = (seg || '').toLowerCase();
    } catch {}

    return { followButton, followState, targetUserId, handle };
  };

  const resolveTaskIdFromHandle = (
    handle: string
  ): keyof MantleTaskProgress | null => {
    if (handle === 'mantle_official') return 'follow-mantle';
    if (handle === 'xhunt_ai') return 'follow-xhunt';
    if (handle === 'chaineye_tools') return 'follow-minibridge';
    if (handle === 'biteyecn') return 'follow-biteye';
    return null;
  };

  const dispatchPlacementEvent = (
    container: HTMLElement,
    detail: {
      followButton: HTMLButtonElement | null;
      followState: 'follow' | 'unfollow' | null;
      userId: string | null;
    }
  ) => {
    window.dispatchEvent(
      new CustomEvent(PLACEMENT_TRACKING_CLICK_EVENT, {
        detail: {
          element: container,
          button: detail.followButton,
          followState: detail.followState,
          userId: detail.userId,
        },
      })
    );
  };

  // Initial detection: if the page loads with an "-unfollow" state (already following),
  // mark the corresponding task as completed and dispatch the event once.
  useEffect(() => {
    if (!placementTrackingEl) return;
    const info = parseFollowInfo(placementTrackingEl);
    const taskId = resolveTaskIdFromHandle(info.handle);
    if (tasksKey && info.followState === 'unfollow' && taskId) {
      try {
        setTaskProgress((prev) => ({ ...(prev || {}), [taskId]: true }));
      } catch {}
    }
    // Always dispatch once so listeners know the initial state
    dispatchPlacementEvent(placementTrackingEl, {
      followButton: info.followButton,
      followState: info.followState,
      userId: info.targetUserId,
    });
  }, [placementTrackingEl, tasksKey, setTaskProgress]);

  // Click handling using the same parsing/dispatch logic
  useEffect(() => {
    if (!placementTrackingEl) return;

    const handleClick = () => {
      const info = parseFollowInfo(placementTrackingEl);
      const taskId = resolveTaskIdFromHandle(info.handle);
      if (tasksKey && info.followState === 'follow' && taskId) {
        try {
          setTaskProgress((prev) => ({ ...(prev || {}), [taskId]: true }));
        } catch {}
      }
      dispatchPlacementEvent(placementTrackingEl, {
        followButton: info.followButton,
        followState: info.followState,
        userId: info.targetUserId,
      });
    };

    placementTrackingEl.addEventListener('click', handleClick);
    return () => placementTrackingEl.removeEventListener('click', handleClick);
  }, [placementTrackingEl, tasksKey, setTaskProgress]);

  return placementTrackingEl;
}
