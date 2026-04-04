import { useEffect, useCallback, useRef, useState } from 'react';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { localStorageInstance } from '~storage/index';
import {
  getTaskInfoByHandle,
  ensureTaskMapReady,
  isTaskMapReady,
  taskVerificationMap,
} from '~compontents/HunterCampaign/campaignConfigs';

export const PLACEMENT_TRACKING_CLICK_EVENT = 'xhunt:placement-tracking-click';

/**
 * Hook: listen for div[data-testid="placementTracking"] and dispatch a window event on click
 * Returns the detected element for optional external use.
 *
 * 使用统一的任务数据源（campaignConfigs.ts）来验证任务完成状态，
 * 支持所有活动的任务验证，避免遗漏。
 */
type TaskProgress = Record<string, boolean>;

export default function usePlacementTrackingClick(): HTMLElement | null {
  // Current plugin user (must be logged in for tracking)
  const [xhuntUser] = useLocalStorage<
    | {
      id: string;
    }
    | null
    | ''
  >('@xhunt/user', null);

  // 任务映射准备完成标志（放在组件函数内部）
  const [taskMapReady, setTaskMapReady] = useState<boolean>(isTaskMapReady());
  const retryCountRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initTaskMap = async () => {
      if (isTaskMapReady()) {
        if (mounted) setTaskMapReady(true);
        return;
      }

      try {
        await ensureTaskMapReady();
        if (mounted) {
          setTaskMapReady(isTaskMapReady());
          retryCountRef.current = 0;
        }
      } catch (e) {
        // 重试机制：最多重试 3 次
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          timeoutId = setTimeout(initTaskMap, 2000 * retryCountRef.current);
        } else {
          console.warn('[TaskMap] Failed to load after retries, allowing fallback mode');
          // Fallback：即使 map 没加载，也允许组件继续运行
          if (mounted) setTaskMapReady(true);
        }
      }
    };

    if (!taskMapReady) {
      initTaskMap();
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [taskMapReady]);

  /**
   * 更新指定活动的任务进度
   */
  const updateTaskProgress = useCallback(
    async (campaignKey: string, taskId: string, completed: boolean) => {
      try {
        const userId =
          xhuntUser && typeof xhuntUser === 'object' && xhuntUser.id
            ? xhuntUser.id
            : 'guest';
        const storageKey = `@xhunt/${campaignKey}Tasks:${userId}`;
        const current = (await localStorageInstance.get(
          storageKey
        )) as TaskProgress | undefined;
        const updated = { ...(current || {}), [taskId]: completed };
        await localStorageInstance.set(storageKey, updated);
      } catch (err) {
        console.error('[TaskProgress] Failed to update:', err);
      }
    },
    [xhuntUser]
  );

  /**
   * 根据 handle 解析任务信息（使用统一的数据源）
   * @param handle Twitter handle
   * @returns { campaignKey, taskId } 或空数组
   */
  const resolveTaskInfoFromHandle = useCallback(
    (handle: string): { campaignKey: string; taskId: string }[] => {
      if (!handle) return [];
      
      // 首先尝试精确匹配
      const exactMatch = getTaskInfoByHandle(handle);
      if (exactMatch.length > 0) return exactMatch;
      
      // Fallback：尝试小写匹配
      const lowerMatch = getTaskInfoByHandle(handle.toLowerCase());
      if (lowerMatch.length > 0) return lowerMatch;
      
      // Fallback：遍历所有任务进行模糊匹配（解决大小写不一致问题）
      const allHandles = Object.keys(taskVerificationMap);
      const normalizedInput = handle.toLowerCase();
      const fuzzyMatch = allHandles.find(h => 
        h.toLowerCase() === normalizedInput
      );
      if (fuzzyMatch) {
        return taskVerificationMap[fuzzyMatch];
      }
      
      return [];
    },
    []
  );

  // 使用统一的 Hook 获取 follow 状态、目标 userId 与 handler，并在点击时回调
  const shouldAttach = useCallback(
    ({ handler }: { handler: string }) => {
      if (!taskMapReady) return false;
      return resolveTaskInfoFromHandle(handler).length > 0;
    },
    [resolveTaskInfoFromHandle, taskMapReady]
  );

  // 使用 ref 避免在回调中捕获未声明的变量
  const placementElRef = useRef<HTMLElement | null>(null);
  const followBtnRef = useRef<HTMLButtonElement | null>(null);

  const onFollowBtnClick = useCallback(
    ({
      followState,
      twitterId,
      handler,
    }: {
      followState: 'follow' | 'unfollow' | null;
      twitterId: string;
      handler: string;
    }) => {
      const taskInfos = resolveTaskInfoFromHandle(handler);
      
      if (taskInfos.length > 0 && followState === 'follow') {
        taskInfos.forEach((taskInfo) => {
          updateTaskProgress(taskInfo.campaignKey, taskInfo.taskId, true);
        });
      }
      
      const container = placementElRef.current;
      if (container) {
        dispatchPlacementEvent(container, {
          followButton: followBtnRef.current ?? null,
          followState,
          userId: twitterId || null,
        });
      }
    },
    [updateTaskProgress, resolveTaskInfoFromHandle]
  );

  const { followState, twitterId, handler, placementTrackingEl, followButton } =
    usePlacementTracking({
      ready: taskMapReady,
      shouldAttach,
      onFollowBtnClick,
    });

  // 同步 refs，供回调读取最新的 DOM 元素
  useEffect(() => {
    placementElRef.current = placementTrackingEl;
  }, [placementTrackingEl]);

  useEffect(() => {
    followBtnRef.current = followButton ?? null;
  }, [followButton]);

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

  // 初始检测：仅在名单内时进行处理；如果当前是已关注状态（unfollow），标记任务完成并分发一次事件
  useEffect(() => {
    if (!placementTrackingEl || !taskMapReady) return;
    
    const taskInfos = resolveTaskInfoFromHandle(handler);
    
    if (taskInfos.length > 0 && followState === 'unfollow') {
      taskInfos.forEach((taskInfo) => {
        updateTaskProgress(taskInfo.campaignKey, taskInfo.taskId, true);
      });
    }

    // 仅当在名单内时分发一次初始状态事件
    if (taskInfos.length > 0) {
      dispatchPlacementEvent(placementTrackingEl, {
        followButton: followButton ?? null,
        followState,
        userId: twitterId || null,
      });
    }
  }, [
    placementTrackingEl,
    updateTaskProgress,
    followState,
    handler,
    twitterId,
    taskMapReady,
  ]);

  return placementTrackingEl;
}
