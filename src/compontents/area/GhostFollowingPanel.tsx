import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { DraggablePanel } from '~/compontents/DraggablePanel.tsx';
import { Ghost, X, Play, Loader2, Users, Info, History, ChevronRight, AlertCircle, GripVertical } from 'lucide-react';
import { useLocalStorage } from '~storage/useLocalStorage';
import {
  fetchGhostFollowingQuota,
  fetchGhostFollowingList,
  analyzeGhostFollowingUser,
} from '~contents/services/api.ts';
import type {
  GhostFollowingRecord,
  GhostFollowingRecords,
  GhostFollowingRecordUser,
  GhostFollowingAnalyzeQuotaDetail,
  GhostFollowingFollowingQuotaDetail,
} from '~types';

export interface GhostFollowingPanelEventDetail {
  open: boolean;
  anchor?: HTMLElement;
  source?: 'button' | 'panel';
}

export const GHOST_FOLLOWING_PANEL_EVENT = 'ghost-following-panel';

// 不活跃阈值选项（月）
const INACTIVITY_THRESHOLD_OPTIONS = [1, 2, 3, 6, 12];

// 本地存储键
const GHOST_FOLLOWING_RECORDS_KEY = '@xhunt/ghost-following-records';

// 获取当前用户 ID（从 localStorage）
const getCurrentUserId = async (): Promise<string | undefined> => {
  try {
    const { localStorageInstance } = await import('~storage/index.ts');
    const userInfo = await localStorageInstance.get('@xhunt/user');
    return userInfo?.twitterId;
  } catch {
    return undefined;
  }
};

// 格式化时间差
const formatTimeDiff = (dateString: string | null, t: (key: string) => string): string => {
  if (!dateString) return t('noTweets');

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return t('daysAgo').replace('{days}', String(diffDays));
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return t('monthsAgo').replace('{months}', String(months));
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    if (remainingMonths > 0) {
      return t('yearsMonthsAgo').replace('{years}', String(years)).replace('{months}', String(remainingMonths));
    }
    return t('yearsAgo').replace('{years}', String(years));
  }
};

// 判断是否不活跃
const isInactive = (lastActiveTime: string | null, thresholdMonths: number): boolean => {
  if (!lastActiveTime) return true;

  const date = new Date(lastActiveTime);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const thresholdDays = thresholdMonths * 30;

  return diffDays > thresholdDays;
};

function GhostFollowingPanel() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [currentAnalyzingUser, setCurrentAnalyzingUser] = useState<string>('');
  const [analyzeQuota, setAnalyzeQuota] = useState<GhostFollowingAnalyzeQuotaDetail | null>(null);
  const [followingQuota, setFollowingQuota] = useState<GhostFollowingFollowingQuotaDetail | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [ghostCount, setGhostCount] = useState(0);
  const [inactivityThreshold, setInactivityThreshold] = useLocalStorage<number>(
    '@xhunt/ghost-inactivity-threshold',
    6
  );
  const [records, setRecords] = useLocalStorage<GhostFollowingRecords>(
    GHOST_FOLLOWING_RECORDS_KEY,
    []
  );
  const [selectedRecord, setSelectedRecord] = useState<GhostFollowingRecord | null>(null);
  const [viewMode, setViewMode] = useState<'main' | 'detail'>('main');
  const [sortByInactive, setSortByInactive] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const targetRef = useRef<HTMLElement | null>(null);
  const isCancelledRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasDraggedRef = useRef(false);
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [currentUserData] = useLocalStorage<any>('@xhunt/initial-state-current-user', null);

  // 格式化恢复时间
  const formatResetTime = useCallback((timestamp: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }, []);

  // 计算额度恢复时间提示
  const quotaResetInfo = useMemo(() => {
    // 检查额度是否低于10%（且不是从未申请的情况）
    const analyzeQuotaLow = analyzeQuota &&
      analyzeQuota.status !== 'none' &&
      analyzeQuota.quota.total > 0 &&
      (analyzeQuota.quota.remaining / analyzeQuota.quota.total) < 0.1;

    const followingQuotaLow = followingQuota &&
      followingQuota.status !== 'none' &&
      followingQuota.quota.total > 0 &&
      (followingQuota.quota.remaining / followingQuota.quota.total) < 0.1;

    // 获取恢复时间（优先使用 analyze 额度的 nextApplyAt，其次 following 额度的 resetAt）
    let resetTime: number | undefined;
    if (analyzeQuotaLow && analyzeQuota?.nextApplyAt) {
      resetTime = analyzeQuota.nextApplyAt;
    } else if (followingQuotaLow && followingQuota?.resetAt) {
      resetTime = followingQuota.resetAt;
    }

    if ((analyzeQuotaLow || followingQuotaLow) && resetTime) {
      return {
        show: true,
        resetTime,
        message: t('quotaResetTime').replace('{time}', formatResetTime(resetTime)),
      };
    }
    return { show: false };
  }, [analyzeQuota, followingQuota, formatResetTime, t]);

  // 查询额度
  const fetchQuota = useCallback(async () => {
    try {
      const response = await fetchGhostFollowingQuota();
      if (response?.success) {
        // 同时设置 analyze 和 following 额度
        setAnalyzeQuota(response.data.analyze);
        setFollowingQuota(response.data.following);
      }
    } catch (err) {
      console.error('Failed to fetch quota:', err);
    }
  }, []);

  // 获取当前用户 ID
  useEffect(() => {
    getCurrentUserId().then((id) => {
      if (id) setCurrentUserId(id);
    });
  }, []);

  // 打开面板时查询额度
  useEffect(() => {
    if (isOpen) {
      fetchQuota();
    }
  }, [isOpen, fetchQuota]);

  // 开始检测 - 边获取边分析
  const handleStartDetection = useCallback(async () => {
    if (!currentUserId) {
      setError(t('pleaseLoginFirst'));
      return;
    }

    // 重置取消标记
    isCancelledRef.current = false;
    abortControllerRef.current = new AbortController();

    // 获取总关注数用于计算进度
    const totalFollowingCount = currentUserData?.friends_count || 0;
    const totalCount = totalFollowingCount > 0 ? totalFollowingCount : (analyzeQuota?.quota.remaining || 0);

    setIsDetecting(true);
    setProgress(0);
    setIsCompleted(false);
    setError('');
    setGhostCount(0);
    setCurrentAnalyzingUser('');

    // 创建记录 ID
    const recordId = `record_${Date.now()}`;
    const analyzedUsers: GhostFollowingRecordUser[] = [];
    let inactiveCounter = 0;
    let totalFetched = 0;
    let cursor = '';
    let hasMore = true;
    let followingQuotaExhausted = false;
    let analyzeQuotaExhausted = false;
    let recordCreated = false;

    // 实时保存记录到缓存的函数
    const saveRecordToStorage = (isCont?: boolean, parentId?: string) => {
      if (analyzedUsers.length === 0) return;

      const newRecord: GhostFollowingRecord = {
        id: recordId,
        createdAt: Date.now(),
        totalFollowing: analyzedUsers.length,
        inactiveCount: inactiveCounter,
        threshold: inactivityThreshold,
        users: [...analyzedUsers], // 拷贝数组
        analyzedUserIds: analyzedUsers.map(u => u.id), // 记录已分析的用户ID
        isContinued: isCont,
        parentRecordId: parentId,
      };

      setRecords((prev) => {
        // 如果记录已存在则更新，否则新增
        const existingIndex = prev?.findIndex((r) => r.id === recordId) ?? -1;
        let updated: GhostFollowingRecord[];

        if (existingIndex >= 0) {
          // 更新现有记录
          updated = [...(prev || [])];
          updated[existingIndex] = newRecord;
        } else {
          // 新增记录，最多保留5条
          updated = [newRecord, ...(prev || [])].slice(0, 5);
        }

        return updated;
      });

      recordCreated = true;
      setGhostCount(inactiveCounter);
    };

    try {
      // 分页获取关注列表并实时分析
      while (hasMore && !followingQuotaExhausted && !isCancelledRef.current) {
        // 获取一页关注列表（50人）
        setProgressMessage(
          t('fetchingFollowingListCount').replace('{count}', String(totalFetched))
        );

        let response = await fetchGhostFollowingList(currentUserId, cursor);
        console.log('[GhostFollowing] Response:', response);

        // 检查是否已取消
        if (isCancelledRef.current) {
          break;
        }

        // secureFetch 返回完整响应，访问 data
        const responseData = (response as any).data || response;

        // 检查是否 success: true 但 result 为空，如果是则等待1秒后重试一次
        if (responseData?.success === true && (!responseData.result || Object.keys(responseData.result).length === 0)) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          response = await fetchGhostFollowingList(currentUserId, cursor);
          console.log('[GhostFollowing] Retry Response:', response);

          // 重新解析响应数据
          const retryData = (response as any)?.data || response;

          // 重试后还是空 result，认为结束了
          if (retryData?.success === true && (!retryData.result || Object.keys(retryData.result).length === 0)) {
            hasMore = false;
            break;
          }

          // 更新 responseData 为重试后的数据
          responseData.result = retryData?.result;
        }

        if (!response) {
          setError(t('networkError'));
          break;
        }

        // 检查 result 是否存在来判断是否成功
        if (!responseData.result) {
          // 额度耗尽或其他错误
          followingQuotaExhausted = true;
          // 更新额度重置时间
          const resetAt = responseData.quota?.resetAt;
          if (resetAt) {
            setFollowingQuota((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                resetAt,
              };
            });
          }
          break;
        }

        // 更新 following 额度的 resetAt
        const followingResetAt = responseData.quota?.resetAt;
        if (followingResetAt) {
          setFollowingQuota((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              resetAt: followingResetAt,
            };
          });
        }
        const profiles = responseData.result?.profiles || [];

        if (profiles.length === 0) {
          break;
        }

        totalFetched += profiles.length;

        // 并发分析这一页的用户，最多4个并发
        const concurrencyLimit = 4;
        const profilesToAnalyze = [...profiles];

        // 处理单个用户的分析
        const analyzeSingleUser = async (profile: typeof profiles[0]) => {
          if (isCancelledRef.current) return;

          const currentIndex = analyzedUsers.length + 1;

          // 显示当前分析的用户名
          setCurrentAnalyzingUser(profile.username);
          setProgressMessage(
            `(${currentIndex}/${totalCount}) @${profile.username}`
          );

          // 锁推用户直接标记，无需调用分析接口
          if (profile.protected) {
            const userWithActivity: GhostFollowingRecordUser = {
              ...profile,
              lastActiveTime: null,
              isAnalyzed: true, // 锁推用户也算已处理，不算分析失败
            };
            analyzedUsers.push(userWithActivity);
            // 更新进度
            const progressPercent = totalCount > 0
              ? Math.round((analyzedUsers.length / totalCount) * 100)
              : 0;
            setProgress(Math.min(progressPercent, 100));
            saveRecordToStorage();
            return;
          }

          try {
            // 分析用户推文
            const analyzeResult = await analyzeGhostFollowingUser(profile.id, profile.username);

            if (isCancelledRef.current) return;

            // 如果分析失败（undefined），标记为未分析，不纳入统计
            if (analyzeResult === undefined) {
              const userWithActivity: GhostFollowingRecordUser = {
                ...profile,
                lastActiveTime: null,
                isAnalyzed: false,
              };
              analyzedUsers.push(userWithActivity);
              // 更新进度但不增加不活跃计数
              const progressPercent = totalCount > 0
                ? Math.round((analyzedUsers.length / totalCount) * 100)
                : 0;
              setProgress(Math.min(progressPercent, 100));
              saveRecordToStorage();
              return;
            }

            // 检查是否是额度相关错误或并发限制错误
            if (!analyzeResult.success && analyzeResult.error) {
              const stopErrorCodes = ['QUOTA_COOLDOWN', 'ANALYZE_QUOTA_EXHAUSTED', 'QUOTA_EXHAUSTED', 'CONCURRENT_LIMIT_EXCEEDED'];
              if (stopErrorCodes.includes(analyzeResult.error.code)) {
                analyzeQuotaExhausted = true;
                // 更新额度信息（仅额度错误有 nextApplyAt）
                if (analyzeResult.error.data?.nextApplyAt) {
                  setAnalyzeQuota((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      nextApplyAt: analyzeResult.error!.data!.nextApplyAt,
                    };
                  });
                }
                // 根据错误码选择默认错误消息
                const defaultMessage = analyzeResult.error.code === 'CONCURRENT_LIMIT_EXCEEDED'
                  ? t('concurrentLimitExceeded')
                  : t('analyzeQuotaExhausted');
                setError(analyzeResult.error.message || defaultMessage);
                // 标记当前用户为未分析
                const userWithActivity: GhostFollowingRecordUser = {
                  ...profile,
                  lastActiveTime: null,
                  isAnalyzed: false,
                };
                analyzedUsers.push(userWithActivity);
                saveRecordToStorage();
                return;
              }
            }

            let lastActiveTime: string | null = null;

            if (analyzeResult?.success && analyzeResult.data?.result) {
              const result = analyzeResult.data.result;
              if (result.create_time) {
                lastActiveTime = result.create_time;
              }
            }

            const userWithActivity: GhostFollowingRecordUser = {
              ...profile,
              lastActiveTime,
              isAnalyzed: true,
            };

            analyzedUsers.push(userWithActivity);

            // 判断是否为不活跃用户
            if (isInactive(lastActiveTime, inactivityThreshold)) {
              inactiveCounter++;
            }

            // 更新进度
            const progressPercent = totalCount > 0
              ? Math.round((analyzedUsers.length / totalCount) * 100)
              : 0;
            setProgress(Math.min(progressPercent, 100));

            // 实时保存到缓存
            saveRecordToStorage();
          } catch (err) {
            console.error(`Failed to analyze user ${profile.username}:`, err);
          }
        };

        // 使用 async-pool 模式：保持并发池中有固定数量的任务
        const executeWithConcurrency = async () => {
          const executing: Promise<void>[] = [];

          const enqueue = async (profile: typeof profiles[0]) => {
            const promise = analyzeSingleUser(profile).then(() => {
              // 任务完成后从 executing 中移除
              const index = executing.indexOf(promise);
              if (index > -1) {
                executing.splice(index, 1);
              }
            });
            executing.push(promise);
          };

          // 先启动第一批任务
          const initialBatch = profilesToAnalyze.splice(0, concurrencyLimit);
          for (const profile of initialBatch) {
            enqueue(profile);
          }

          // 持续补充任务，保持并发数
          while (profilesToAnalyze.length > 0 || executing.length > 0) {
            if (isCancelledRef.current || analyzeQuotaExhausted) break;

            if (executing.length > 0) {
              // 等待任意一个任务完成
              await Promise.race(executing);
            }

            // 如果额度已用尽，停止添加新任务
            if (analyzeQuotaExhausted) break;

            // 补充新任务
            while (executing.length < concurrencyLimit && profilesToAnalyze.length > 0) {
              const profile = profilesToAnalyze.shift()!;
              enqueue(profile);
            }
          }
        };

        await executeWithConcurrency();

        // 如果已取消或额度已用尽，跳出外层循环
        if (isCancelledRef.current || analyzeQuotaExhausted) {
          break;
        }

        // 检查是否还有更多数据
        const nextCursor = responseData.result?.next;
        if (nextCursor && nextCursor !== '') {
          cursor = nextCursor;
          // 延迟后再获取下一页
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          hasMore = false;
        }
      }

      // 最终保存一次（确保数据完整）
      if (!isCancelledRef.current && analyzedUsers.length > 0) {
        saveRecordToStorage();
        setIsCompleted(true);
      } else if (!isCancelledRef.current && analyzedUsers.length === 0) {
        setError(t('noFollowingFound'));
      }
    } catch (err) {
      // 如果是取消导致的错误，不显示错误信息
      if (isCancelledRef.current) {
        return;
      }
      console.error('Detection failed:', err);
      setError(t('detectionFailed'));
    } finally {
      // 重置检测状态（中断时也重置 UI 状态，但记录已保存）
      setIsDetecting(false);
      setProgressMessage('');
      setCurrentAnalyzingUser('');
      abortControllerRef.current = null;
    }
  }, [currentUserId, inactivityThreshold, setRecords, t]);

  const handleReset = useCallback(() => {
    isCancelledRef.current = false;
    setIsDetecting(false);
    setProgress(0);
    setProgressMessage('');
    setCurrentAnalyzingUser('');
    setIsCompleted(false);
    setError('');
    setGhostCount(0);
  }, []);

  // 清理检测状态
  const cleanupDetection = useCallback(() => {
    // 标记为取消，停止所有进行中的请求
    isCancelledRef.current = true;
    // 中止进行中的 fetch 请求
    abortControllerRef.current?.abort();
    // 重置状态
    setIsDetecting(false);
    setProgress(0);
    setProgressMessage('');
    setCurrentAnalyzingUser('');
    setIsCompleted(false);
    setError('');
  }, []);

  // 中断分析（保留已分析的记录）
  const handleInterruptDetection = useCallback(() => {
    // 标记为取消，停止所有进行中的请求
    isCancelledRef.current = true;
    // 中止进行中的 fetch 请求
    abortControllerRef.current?.abort();
    // 注意：记录已经在分析过程中实时保存，这里只需要停止检测
    // 状态会在 handleStartDetection/handleContinueAnalysis 的 finally 块中重置
  }, []);

  const closePanel = useCallback(() => {
    // 清理检测
    cleanupDetection();
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent<GhostFollowingPanelEventDetail>(
        GHOST_FOLLOWING_PANEL_EVENT,
        {
          detail: { open: false, source: 'panel' },
        }
      )
    );
  }, [cleanupDetection]);

  // 事件监听
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<GhostFollowingPanelEventDetail>;
      if (customEvent.detail.open) {
        setIsOpen(true);
        setIsDetecting(false);
        setProgress(0);
        setIsCompleted(false);
        setError('');
        setCurrentAnalyzingUser('');
        setViewMode('main');
        setSelectedRecord(null);
        isCancelledRef.current = false;

        // 保存 target 元素引用，并根据 target 位置设置初始位置
        if (customEvent.detail.anchor) {
          targetRef.current = customEvent.detail.anchor;

          const rect = customEvent.detail.anchor.getBoundingClientRect();
          const panelWidth = 420;
          // 计算位置：trigger 元素左侧，向左偏移面板宽度的50%
          const x = rect.left - panelWidth * 0.2;
          const y = rect.top + rect.height / 2 - 100; // 面板高度约 400，垂直居中偏移

          // 派发重置位置事件
          requestAnimationFrame(() => {
            window.dispatchEvent(
              new CustomEvent('xhunt:reset-panel-position', {
                detail: {
                  storageKey: 'ghost-following-panel',
                  rightOffset: window.innerWidth - x - panelWidth,
                  y: Math.max(16, y),
                },
              })
            );
          });
        }

        // 重置拖拽标记，允许面板跟随 target
        hasDraggedRef.current = false;
      } else if (customEvent.detail.source === 'button') {
        isCancelledRef.current = true;
        abortControllerRef.current?.abort();
        setIsOpen(false);
        setIsDetecting(false);
        setProgress(0);
        setProgressMessage('');
        setCurrentAnalyzingUser('');
        setIsCompleted(false);
        setError('');
        setViewMode('main');
        // 关闭面板时重置拖拽标记
        hasDraggedRef.current = false;
      }
    };
    window.addEventListener(GHOST_FOLLOWING_PANEL_EVENT, handler);
    return () => {
      window.removeEventListener(GHOST_FOLLOWING_PANEL_EVENT, handler);
    };
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      abortControllerRef.current?.abort();
    };
  }, []);

  // 跟随 target 元素的逻辑
  useEffect(() => {
    if (!isOpen) return;

    const panelWidth = 420;

    const updatePosition = () => {
      // 如果用户已经拖拽过，不再跟随 target
      if (hasDraggedRef.current) return;
      // 如果没有 target，不更新
      if (!targetRef.current) return;

      const rect = targetRef.current.getBoundingClientRect();
      // 计算位置：trigger 元素左侧
      const x = rect.left - panelWidth * 0.2;
      const y = rect.top + rect.height / 2 - 100;

      // 派发位置更新事件
      window.dispatchEvent(
        new CustomEvent('xhunt:reset-panel-position', {
          detail: {
            storageKey: 'ghost-following-panel',
            rightOffset: window.innerWidth - x - panelWidth,
            y: Math.max(16, y),
          },
        })
      );
    };

    // 初始更新一次位置
    updatePosition();

    // 使用 requestAnimationFrame 实现平滑跟随
    let rafId: number;
    const followLoop = () => {
      updatePosition();
      rafId = requestAnimationFrame(followLoop);
    };

    rafId = requestAnimationFrame(followLoop);

    // 同时监听滚动和 resize 事件
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // 计算详情视图数据（必须在所有条件返回之前）
  const detailViewData = useMemo(() => {
    if (!selectedRecord) return null;

    // 排序：分析失败的排在最前面，锁推账户第二，然后按活跃时间排序
    const sortedUsers = [...selectedRecord.users];
    if (sortByInactive) {
      sortedUsers.sort((a, b) => {
        // 分析失败的排在最前面
        if (!a.isAnalyzed && b.isAnalyzed) return -1;
        if (a.isAnalyzed && !b.isAnalyzed) return 1;
        // 锁推账户排在第二位
        if (a.protected && !b.protected) return -1;
        if (!a.protected && b.protected) return 1;
        // 然后按活跃时间排序（越不活跃的排越前面）
        if (!a.lastActiveTime && !b.lastActiveTime) return 0;
        if (!a.lastActiveTime) return -1;
        if (!b.lastActiveTime) return 1;
        return new Date(a.lastActiveTime).getTime() - new Date(b.lastActiveTime).getTime();
      });
    }

    // 只统计已分析的用户
    const analyzedUsers = selectedRecord.users.filter(u => u.isAnalyzed);
    const activeCount = analyzedUsers.filter(u => {
      if (!u.lastActiveTime) return false;
      return !isInactive(u.lastActiveTime, selectedRecord.threshold);
    }).length;
    const inactiveCount = analyzedUsers.length - activeCount;
    const failedCount = selectedRecord.users.filter(u => !u.isAnalyzed && !u.protected).length;
    const protectedCount = selectedRecord.users.filter(u => u.protected).length;

    return {
      sortedUsers,
      activeCount,
      inactiveCount,
      failedCount,
      protectedCount,
    };
  }, [selectedRecord, sortByInactive]);

  // 检查是否可以开始检测：有剩余额度 或 可以继续申请额度
  const hasQuota = analyzeQuota && (
    analyzeQuota.quota.remaining > 0 || analyzeQuota.canApplyNow
  );

  if (!isOpen) return null;

  return (
    <DraggablePanel
      width={420}
      dragHandleClassName='ghost-following-drag-handle'
      storageKey='ghost-following-panel'
      onDragStart={() => {
        hasDraggedRef.current = true;
      }}
    >
      <div className='w-[400px] max-h-[580px] rounded-[16px] border-2 border-transparent bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-pink-500/25 p-[2px] shadow-[0_12px_32px_rgba(15,23,42,0.3)]'>
        <div
          data-theme={theme}
          className='rounded-[14px] border theme-border theme-bg-secondary p-4 relative max-h-[576px] overflow-hidden flex flex-col'
        >
          {/* 头部标题栏 */}
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              {viewMode === 'detail' && selectedRecord ? (
                <button
                  type='button'
                  onClick={() => setViewMode('main')}
                  className='p-1 rounded-full theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary transition-colors'
                >
                  <ChevronRight className='w-5 h-5 rotate-180' />
                </button>
              ) : (
                <Ghost className='w-5 h-5 theme-text-primary' />
              )}
              <h3 className='text-lg font-semibold theme-text-primary'>
                {viewMode === 'detail' && selectedRecord
                  ? t('analysisRecordDetail')
                  : t('detectGhostFollowing')}
              </h3>
            </div>
            {/* 右侧按钮组 */}
            <div className='flex items-center gap-1'>
              {/* 拖拽手柄 */}
              <button
                type='button'
                className='ghost-following-drag-handle p-1.5 rounded-full theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary transition-colors duration-200 cursor-move'
                title={t('dragPanel')}
              >
                <GripVertical className='w-4 h-4' />
              </button>
              {/* 关闭按钮 */}
              <button
                type='button'
                className='p-1.5 rounded-full theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary transition-colors duration-200'
                onClick={closePanel}
                aria-label={t('cancel')}
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          </div>

          {viewMode === 'detail' && selectedRecord && detailViewData ? (
            <div className='flex-1 overflow-hidden flex flex-col min-h-0'>
              {/* 时间和统计 */}
              <div className='text-[11px] theme-text-secondary mb-2'>
                {new Date(selectedRecord.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')}
                {' · '}{t('ghostThresholdLabel').replace('{threshold}', String(selectedRecord.threshold))}
              </div>

              {/* 统计数据 */}
              <div className='flex gap-3 mb-2 text-[11px] theme-text-secondary flex-wrap'>
                <span>{t('activeUsers')}: <span className='text-green-600 dark:text-green-400 font-medium'>{detailViewData.activeCount}</span></span>
                <span>{t('inactiveUsers')}: <span className='text-red-600 dark:text-red-400 font-medium'>{detailViewData.inactiveCount}</span></span>
                {detailViewData.protectedCount > 0 && (
                  <span>{t('protectedUsers')}: <span className='text-gray-500 font-medium'>{detailViewData.protectedCount}</span></span>
                )}
                {detailViewData.failedCount > 0 && (
                  <span>{t('failedUsers')}: <span className='text-gray-500 font-medium'>{detailViewData.failedCount}</span></span>
                )}
                <span>{t('total')}: <span className='theme-text-primary font-medium'>{selectedRecord.users.length}</span></span>
              </div>

              {/* 风控警告提示 */}
              <div className='mb-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20'>
                <div className='flex items-start gap-1.5 text-yellow-700 dark:text-yellow-400/90'>
                  <AlertCircle className='w-3.5 h-3.5 flex-shrink-0 mt-0.5' />
                  <span className='text-[11px] leading-relaxed'>
                    {t('unfollowRiskWarning')}
                  </span>
                </div>
              </div>

              {/* 排序按钮 */}
              <button
                type='button'
                onClick={() => setSortByInactive(!sortByInactive)}
                className='text-[11px] text-blue-500 hover:text-blue-600 transition-colors mb-2 text-left'
              >
                {sortByInactive ? t('sortByInactive') : t('sortByDefault')} ↓
              </button>

              {/* 用户列表 - 紧凑版 */}
              <div className='flex-1 overflow-y-auto -mx-4 px-4 min-h-0'>
                <div className='space-y-1'>
                  {detailViewData.sortedUsers.map((user) => {
                    const inactive = isInactive(user.lastActiveTime, selectedRecord.threshold);
                    const analysisFailed = !user.isAnalyzed;
                    return (
                      <a
                        key={user.id}
                        href={`https://x.com/${user.username}`}
                        target='_blank'
                        rel='noopener noreferrer'

                        className={`flex items-center gap-2 p-1.5 rounded transition-colors cursor-pointer hover:bg-blue-500/10 ${analysisFailed
                          ? 'bg-gray-500/5'
                          : user.protected
                            ? 'bg-gray-400/5'
                            : inactive
                              ? 'bg-red-500/5'
                              : 'bg-green-500/5'
                          }`}
                      >
                        <img
                          src={user.profile_image_url}
                          alt={user.name}
                          className='w-7 h-7 rounded-full object-cover border theme-border flex-shrink-0'
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
                          }}
                        />
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-1'>
                            <span className='font-medium text-xs theme-text-primary truncate'>
                              {user.name}
                            </span>
                            {user.is_blue_verified && (
                              <svg className='w-3 h-3 text-blue-500 flex-shrink-0' viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                              </svg>
                            )}
                          </div>
                          <div className='text-[10px] theme-text-secondary truncate'>
                            @{user.username}
                          </div>
                        </div>
                        <div className={`text-[10px] font-medium flex-shrink-0 ${analysisFailed
                          ? 'text-gray-500'
                          : user.protected
                            ? 'text-gray-500'
                            : inactive
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                          {analysisFailed ? t('analysisFailed') : user.protected ? t('protectedAccount') : formatTimeDiff(user.lastActiveTime, t)}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className='text-xs theme-text-secondary mb-3'>
                {t('detectGhostFollowingDesc')}
              </p>

              {/* 额度信息 - 仅展示分析额度（未申请时不展示） */}
              {!isDetecting && !isCompleted && analyzeQuota && (
                <div className='mb-3 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/10'>
                  <div className='flex items-center gap-2'>
                    <span className='text-[11px] theme-text-secondary'>{t('analyzeQuota')}</span>
                    <div className='flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                      <div
                        className={`h-full rounded-full ${analyzeQuota.quota.remaining > analyzeQuota.quota.total * 0.3
                          ? 'bg-green-500'
                          : analyzeQuota.quota.remaining > 0
                            ? 'bg-yellow-500'
                            : analyzeQuota.canApplyNow
                              ? 'bg-blue-500'
                              : 'bg-red-500'
                          }`}
                        style={{
                          width: `${Math.min((analyzeQuota.quota.remaining / analyzeQuota.quota.total) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${analyzeQuota.quota.remaining > analyzeQuota.quota.total * 0.3
                      ? 'text-green-600 dark:text-green-400'
                      : analyzeQuota.quota.remaining > 0
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : analyzeQuota.canApplyNow
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                      {analyzeQuota.quota.total > 0 ? (
                        <>
                          {analyzeQuota.quota.remaining}<span className='text-[9px] theme-text-secondary font-normal'>/{analyzeQuota.quota.total}{t('peopleUnit')}</span>
                        </>
                      ) : (
                        <span className='text-[11px] theme-text-secondary font-normal'>{'100%'}</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* 设置区域 - 直接显示阈值选项 */}
              {!isDetecting && !isCompleted && (
                <div className='mb-3'>
                  <div className='flex items-center gap-1.5 mb-2'>
                    <span className='text-xs theme-text-secondary'>
                      {t('ghostInactivityThreshold')}
                    </span>
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    {INACTIVITY_THRESHOLD_OPTIONS.map((months) => (
                      <button
                        key={months}
                        type='button'
                        onClick={() => setInactivityThreshold(months)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${inactivityThreshold === months
                          ? 'bg-blue-500 text-white'
                          : 'theme-bg-tertiary theme-text-secondary hover:theme-bg-secondary'
                          }`}
                      >
                        {months >= 12
                          ? t('ghostThresholdYear').replace('{year}', String(months / 12))
                          : t('ghostThresholdMonth').replace('{month}', String(months))}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className='flex items-start gap-1.5 text-red-600 dark:text-red-400 mb-3 p-2 rounded-lg bg-red-500/10'>
                  <AlertCircle className='w-3.5 h-3.5 flex-shrink-0 mt-0.5' />
                  <span className='text-xs'>{error}</span>
                </div>
              )}

              {/* 进度条区域 */}
              {isDetecting && (
                <div className='mb-3 space-y-2'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs theme-text-secondary font-medium flex items-center gap-1.5'>
                      <Loader2 className='w-3.5 h-3.5 animate-spin text-blue-500' />
                      <span className='truncate max-w-[180px]'>
                        {progressMessage || t('detectionProgress')}
                      </span>
                    </span>
                    <span className='text-sm font-semibold theme-text-primary'>
                      {Math.min(Math.round(progress), 100)}%
                    </span>
                  </div>
                  <div className='h-2 theme-bg-tertiary rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-blue-500 transition-all duration-300 ease-out rounded-full'
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>

                  {/* 警告提示 */}
                  <div className='flex items-start gap-1.5 text-yellow-600 dark:text-yellow-400/90'>
                    <Info className='w-3 h-3 flex-shrink-0 mt-0.5' />
                    <span className='text-[11px] leading-relaxed'>
                      {t('detectionWarning')}
                    </span>
                  </div>
                </div>
              )}

              {/* 检测结果 */}
              {isCompleted && (
                <div className='flex items-start gap-2 mb-3'>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${ghostCount > 0
                      ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                      : 'bg-green-500/20 text-green-600 dark:text-green-400'
                      }`}
                  >
                    {ghostCount > 0 ? (
                      <Users className='w-3.5 h-3.5' />
                    ) : (
                      <Ghost className='w-3.5 h-3.5' />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='text-sm font-semibold theme-text-primary'>
                      {t('detectionComplete')}
                    </div>
                    <div className='text-xs theme-text-secondary leading-relaxed'>
                      {ghostCount > 0
                        ? t('ghostFollowingFound').replace(
                          '{count}',
                          String(ghostCount)
                        )
                        : t('ghostFollowingNotFound')}
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className='pt-1'>
                {isCompleted ? (
                  <button
                    type='button'
                    onClick={handleReset}
                    className='w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2'
                  >
                    <Play className='w-4 h-4' />
                    {t('startDetection')}
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={handleStartDetection}
                    disabled={isDetecting || !hasQuota}
                    className='w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2'
                  >
                    {isDetecting ? (
                      <>
                        <Loader2 className='w-4 h-4 animate-spin' />
                        {t('detecting')}...
                      </>
                    ) : (
                      <>
                        <Play className='w-4 h-4' />
                        {!hasQuota ? t('quotaInsufficient') : t('startDetection')}
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* 额度恢复时间提示 */}
              {quotaResetInfo.show && (
                <div className='mt-2 text-center'>
                  <span className='text-xs text-yellow-600 dark:text-yellow-400'>
                    {quotaResetInfo.message}
                  </span>
                </div>
              )}

              {/* 历史记录列表 */}
              {(records?.length || 0) > 0 && !isDetecting && (
                <div className='mt-4 pt-3 border-t theme-border'>
                  <div className='flex items-center gap-1.5 mb-2.5'>
                    <div className='w-3 h-3 rounded-md flex items-center justify-center'>
                      <History className='w-3 h-3 text-blue-500' />
                    </div>
                    <span className='text-xs font-medium theme-text-primary'>
                      {t('analysisHistory')}
                    </span>
                    {/* <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium'>
                        {Math.min(records?.length || 0, 5)}
                      </span> */}
                  </div>
                  <div className='space-y-1.5'>
                    {(records || []).slice(0, 5).map((record) => {
                      return (
                        <div
                          key={record.id}
                          className='p-2.5 rounded-xl bg-gradient-to-r from-blue-500/[0.02] to-purple-500/[0.02] border border-blue-500/[0.08] shadow-sm transition-all duration-200 group'
                        >
                          <div className='flex items-center gap-2'>
                            {/* 点击查看详情区域 */}
                            <button
                              type='button'
                              onClick={() => {
                                setSelectedRecord(record);
                                setViewMode('detail');
                              }}
                              className='flex-1 min-w-0 text-left hover:opacity-80 transition-opacity'
                            >
                              <div className='flex items-center gap-2 mb-0.5'>
                                <span className='text-[11px] font-medium theme-text-primary'>
                                  {new Date(record.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')}
                                </span>
                                <span className='text-[9px] px-1 py-0.5 rounded bg-theme-tertiary theme-text-secondary'>
                                  {t('ghostThresholdLabel').replace('{threshold}', String(record.threshold))}
                                </span>
                                {record.isContinued && (
                                  <span className='text-[9px] px-1 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium'>
                                    {t('continued')}
                                  </span>
                                )}
                              </div>
                              <div className='flex items-center gap-2 text-xs'>
                                <span className='theme-text-secondary'>
                                  {t('recordSummary')
                                    .replace('{total}', String(record.totalFollowing))
                                    .replace('{inactive}', String(record.inactiveCount))}
                                </span>
                              </div>
                            </button>

                            {/* 继续分析按钮 - 暂时隐藏 */}
                            {/* {isWithin2Days && (
                                <button
                                  type='button'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleContinueAnalysis(record);
                                  }}
                                  disabled={isDetecting || !hasQuota}
                                  className='text-[10px] text-blue-500 hover:text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline whitespace-nowrap'
                                  title={t('continueAnalysisDesc')}
                                >
                                  {t('continueAnalysis')}
                                </button>
                              )} */}

                            {/* 详情箭头 */}
                            <button
                              type='button'
                              onClick={() => {
                                setSelectedRecord(record);
                                setViewMode('detail');
                              }}
                              className='w-6 h-6 rounded-full bg-blue-500/5 hover:bg-blue-500/10 flex items-center justify-center transition-colors'
                            >
                              <ChevronRight className='w-3.5 h-3.5 text-blue-500' />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DraggablePanel>
  );
}

export default React.memo(GhostFollowingPanel);
