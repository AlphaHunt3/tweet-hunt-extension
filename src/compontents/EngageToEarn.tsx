import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCrossPageSettings } from '~utils/settingsManager';
import { useDebounceFn, useRequest } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useI18n } from '~contents/hooks/i18n';
import { navigationService } from '~compontents/navigation/NavigationService';
import {
  fetchE2EActivities,
  signupE2EActivity,
  fetchE2EActivitySignups,
  E2EActivityResponse,

  getTwitterAuthUrl,
} from '~contents/services/api';
import { openNewTab } from '~contents/utils';
import { cleanErrorMessage } from '~utils/dataValidation';
import { StoredUserInfo } from '~types/review.ts';
import { sanitizeHtml } from '~utils/sanitizeHtml';
import {
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  User,
  Check,
} from 'lucide-react';
import { localStorageInstance } from '~storage/index';
import { CloseConfirmDialog } from './CloseConfirmDialog';
import { formatNumber as formatRankThreshold } from './HunterCampaign/utils';

interface EngageToEarnProps {
  className?: string;
  embedded?: boolean;
  externalStatus?: 'all' | 'active' | 'complete' | 'review';
  onStatusChange?: (next: 'all' | 'active' | 'complete' | 'review') => void;
  /** 活动列表加载完成后，用于外层小红点：最新进行中活动的 tweet_id */
  onNewestActiveActivityChange?: (tweetId: string | null) => void;
  portalContainer?: HTMLElement | null;
}

// 统一的活动状态类型
type ActivityStatus = 'active' | 'complete' | 'review';

export function EngageToEarn({
  className = '',
  embedded = false,
  externalStatus,
  onStatusChange,
  onNewestActiveActivityChange,
  portalContainer,
}: EngageToEarnProps) {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { isTesterOnly } = useCrossPageSettings();
  // E2E 报名前风险提示首选项 & 弹框状态
  const [skipRiskWarn, setSkipRiskWarn] = useLocalStorage<boolean>(
    '@settings/engageToEarnSkipRisk',
    false
  );
  const [showRiskWarn, setShowRiskWarn] = useState(false);
  const [riskWarnChecked, setRiskWarnChecked] = useState(false);
  const [pendingActivity, setPendingActivity] =
    useState<E2EActivityResponse | null>(null);

  // 打开设置页面
  const openSettingsPage = () => {
    try {
      const openEvt = new CustomEvent('xhunt:open-panel');
      window.dispatchEvent(openEvt);
    } catch { }
    try {
      setTimeout(() => {
        navigationService.navigateTo('main-panel', '/settings');
      }, 100);
    } catch { }
  };
  const [activitiesByStatus, setActivitiesByStatus] = useState<{
    active: E2EActivityResponse[];
    complete: E2EActivityResponse[];
    review: E2EActivityResponse[];
  }>({ active: [], complete: [], review: [] });
  const [loading, setLoading] = useState(true);
  const [signupLoading, setSignupLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [signedUpActivities, setSignedUpActivities] = useState<
    Record<string, boolean>
  >({});
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [token] = useLocalStorage('@xhunt/token', '');
  const [user] = useLocalStorage<StoredUserInfo | null | ''>(
    '@xhunt/user',
    null
  );
  // 状态筛选（默认选中进行中）
  const [statusFilter, setStatusFilter] = useState<'all' | ActivityStatus>(
    'all'
  );
  const effectiveStatus: 'all' | ActivityStatus =
    externalStatus ?? statusFilter;
  const updateStatus = (next: 'all' | ActivityStatus) => {
    if (onStatusChange) onStatusChange(next as any);
    else setStatusFilter(next as any);
  };
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [hideInfoTimer, setHideInfoTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const infoTriggerRef = useRef<HTMLDivElement>(null);
  const [infoPopoverRect, setInfoPopoverRect] = useState<DOMRect | null>(null);

  // 列表高度随浏览行为变化：持续往下滚动时增至 400px，鼠标移出 2s 后恢复 250px
  const [listMaxHeight, setListMaxHeight] = useState(290);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringE2EListRef = useRef(false);

  // Timer-based hover for info popover to bridge the gap
  const handleInfoEnter = () => {
    if (hideInfoTimer) {
      clearTimeout(hideInfoTimer);
      setHideInfoTimer(null);
    }
    setShowInfo(true);
  };

  const handleInfoLeave = () => {
    const timer = setTimeout(() => {
      setShowInfo(false);
    }, 200); // 200ms delay allows moving mouse into the popover
    setHideInfoTimer(timer);
  };

  // Position rules popover via portal so it isn't clipped by overflow-y-auto on the scroll container
  useLayoutEffect(() => {
    if (!showInfo || !infoTriggerRef.current) {
      setInfoPopoverRect(null);
      return;
    }
    const rect = infoTriggerRef.current.getBoundingClientRect();
    setInfoPopoverRect(rect);
  }, [showInfo]);

  // 列表高度：滚动向下时展开，鼠标移出 2s 后收起
  const handleListScroll = () => {
    if (!isHoveringE2EListRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop } = el;
    if (scrollTop > lastScrollTopRef.current && scrollTop > 200) {
      setListMaxHeight(430);
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
    }
    lastScrollTopRef.current = scrollTop;
  };
  const handleListMouseLeave = () => {
    isHoveringE2EListRef.current = false;
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => {
      setListMaxHeight(290);
      collapseTimerRef.current = null;
    }, 700);
  };
  const handleListMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    isHoveringE2EListRef.current = true;
  };

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      if (hideInfoTimer) {
        clearTimeout(hideInfoTimer);
      }
    };
  }, [hideInfoTimer]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [
    userInfoCacheBust,
    setUserInfoCacheBust,
    { isLoading: loadingUserInfoCacheBust },
  ] = useLocalStorage<number>('@xhunt/userInfoCacheBust', 0);

  // 加载活动列表（防抖）
  const { run: debouncedLoadActivities } = useDebounceFn(
    async () => {
      setLoading(true);
      const result = await fetchE2EActivities({
        cacheBust: userInfoCacheBust,
      });
      if (result && result.data) {
        // 兼容新老结构：
        // 新结构：{ active: [...], complete: [...], review: [...] }
        // 旧结构：Record<tweetId, E2EActivityResponse>
        const data = result.data as any;
        let next: {
          active: E2EActivityResponse[];
          complete: E2EActivityResponse[];
          review: E2EActivityResponse[];
        } = {
          active: [],
          complete: [],
          review: [],
        };
        if (
          Array.isArray(data.active) ||
          Array.isArray(data.complete) ||
          Array.isArray(data.review)
        ) {
          next = {
            active: Array.isArray(data.active) ? data.active : [],
            complete: Array.isArray(data.complete) ? data.complete : [],
            review: Array.isArray(data.review) ? data.review : [],
          };
        } else if (typeof data === 'object' && data) {
          // 旧结构 -> 尝试根据 detail.status 分类，否则默认 active
          const entries = Object.values(data) as E2EActivityResponse[];
          entries.forEach((item) => {
            const status = (item as any)?.detail?.status as
              | 'active'
              | 'complete'
              | 'review'
              | undefined;
            if (status === 'complete') next.complete.push(item);
            else if (status === 'review') next.review.push(item);
            else next.active.push(item);
          });
        }
        setActivitiesByStatus(next);

        // 最新进行中活动 tweet_id（按 start_time 倒序取第一个），供外层小红点用
        const activeSorted = [...(next.active || [])].sort((a, b) => {
          const sa = (a as any)?.detail?.start_time || '';
          const sb = (b as any)?.detail?.start_time || '';
          return sb.localeCompare(sa);
        });
        const newestTweetId =
          (activeSorted[0] as any)?.detail?.tweet_id ?? null;
        onNewestActiveActivityChange?.(newestTweetId);

        // 计算报名状态（基于 tweet_id）
        const signupStatus: Record<string, boolean> = {};
        const fillSignup = (arr: E2EActivityResponse[]) => {
          arr.forEach((activityData) => {
            const tweetId = (activityData as any)?.detail?.tweet_id || '';
            if (!tweetId) return;
            const hasSignedUp =
              activityData.current_user &&
              typeof activityData.current_user === 'object' &&
              Object.keys(activityData.current_user).length > 0;
            signupStatus[tweetId] = hasSignedUp;
          });
        };
        fillSignup(next.active);
        fillSignup(next.complete);
        fillSignup(next.review);
        setSignedUpActivities(signupStatus);
      }
      setLoading(false);
    },
    { wait: 500 }
  );

  useEffect(() => {
    if (loadingUserInfoCacheBust) return;
    debouncedLoadActivities();
  }, [
    user && typeof user === 'object' ? user.username : null,
    loadingUserInfoCacheBust,
    userInfoCacheBust,
  ]);

  // 允许外部通过事件控制状态筛选/下拉
  useEffect(() => {
    const onSetStatus = (e: Event) => {
      const det = (e as CustomEvent).detail as any;
      const next = det?.status as 'all' | ActivityStatus;
      if (
        next === 'all' ||
        next === 'active' ||
        next === 'complete' ||
        next === 'review'
      ) {
        setStatusFilter(next as any);
        setShowStatusDropdown(false);
      }
    };
    const onToggleDropdown = () => setShowStatusDropdown((v) => !v);
    window.addEventListener('xhunt:e2e-set-status', onSetStatus as any);
    window.addEventListener('xhunt:e2e-toggle-filter', onToggleDropdown as any);
    return () => {
      window.removeEventListener('xhunt:e2e-set-status', onSetStatus as any);
      window.removeEventListener(
        'xhunt:e2e-toggle-filter',
        onToggleDropdown as any
      );
    };
  }, []);

  // 将内部状态变更广播给外层（用于外层按钮文案同步）
  useEffect(() => {
    const ev = new CustomEvent('xhunt:e2e-status-changed', {
      detail: { status: statusFilter },
    });
    window.dispatchEvent(ev);
  }, [statusFilter]);

  // 报名活动（防抖）
  const { run: debouncedSignup } = useDebounceFn(
    async (activity: E2EActivityResponse) => {
      const activityId = (activity as any)?.detail?.tweet_id || '';
      // 检查是否登录（使用token判断）
      if (!token) {
        // 跳转到登录页面
        try {
          const ret = await getTwitterAuthUrl();
          if (ret?.url) {
            openNewTab(ret.url);
          }
        } catch (e) {
          // 如果获取登录链接失败，显示错误
          setSignupErrors({
            ...signupErrors,
            [activityId]: t('pleaseLoginFirst'),
          });
        }
        return;
      }

      // 清除之前的错误
      setSignupErrors({ ...signupErrors, [activityId]: '' });
      setSignupLoading({ ...signupLoading, [activityId]: true });
      try {
        // 直接从传入的活动对象读取 address
        const address = (activity as any)?.detail?.address as
          | string
          | undefined;
        if (!address) {
          setSignupErrors({
            ...signupErrors,
            [activityId]: t('signupError') || 'Signup failed',
          });
          setSignupLoading({ ...signupLoading, [activityId]: false });
          return;
        }

        // 获取用户id与绑定地址
        const userId =
          user && typeof user === 'object' ? user.twitterId || '' : '';
        const userAddress =
          user && typeof user === 'object' && Array.isArray(user.evmAddresses)
            ? user.evmAddresses[0]
            : '';
        if (!userAddress) {
          setSignupErrors({
            ...signupErrors,
            [activityId]: 'Please bind EVM address in Settings',
          });
          setSignupLoading({ ...signupLoading, [activityId]: false });
          return;
        }

        const result = await signupE2EActivity({
          address,
          user_id: String(userId),
          user_address: String(userAddress),
        });
        const ok =
          Boolean((result as any)?.success) || Boolean((result as any)?.status);
        if (ok) {
          setSignedUpActivities({ ...signedUpActivities, [activityId]: true });
          // 更新 cacheBust 以触发活动列表刷新
          setUserInfoCacheBust(Date.now());
        } else {
          // 显示服务端返回的错误信息
          const errorMsg =
            (result as any)?.message ||
            (result as any)?.error ||
            t('signupError');
          setSignupErrors({ ...signupErrors, [activityId]: errorMsg });
        }
      } catch (e) {
        setSignupErrors({
          ...signupErrors,
          [activityId]: cleanErrorMessage(String(e)),
        });
      }

      setSignupLoading({ ...signupLoading, [activityId]: false });
    },
    { wait: 500 }
  );

  const handleSignup = (activity: E2EActivityResponse) => {
    // 未登录：直接走登录流程（不显示风险弹框）
    if (!token) {
      debouncedSignup(activity);
      return;
    }
    // 已登录：根据是否跳过提示决定是否展示弹框
    if (skipRiskWarn) {
      debouncedSignup(activity);
    } else {
      setPendingActivity(activity);
      setRiskWarnChecked(false);
      setShowRiskWarn(true);
    }
  };

  // 格式化时间
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}${t('days')} ${hours % 24}${t('hours')}`;
    } else if (hours > 0) {
      return `${hours}${t('hours')}`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${Math.max(0, minutes)}${t('minutes')}`;
    }
  };

  const getActivityStatus = (serverStatus: string): ActivityStatus => {
    if (serverStatus === 'complete') return 'complete';
    if (serverStatus === 'review') return 'review';
    return 'active';
  };

  // 状态配置：背景色 + Ribbon样式
  const getStatusConfig = (status: ActivityStatus) => {
    const isDark = theme === 'dark';
    switch (status) {
      case 'active':
        return {
          label: t('active'),
          bgClass: 'bg-gradient-to-br from-gray-500/[0.02] to-slate-500/[0.03]',
          borderClass: isDark ? 'border-green-500/20' : 'border-green-500/15',
          ribbonClass: isDark
            ? 'bg-gradient-to-br from-green-600/80 to-emerald-700/80 text-white/90 shadow-md shadow-green-500/10'
            : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30',
        };
      case 'complete':
        return {
          label: t('complete'),
          bgClass: 'bg-gradient-to-br from-gray-500/[0.02] to-slate-500/[0.03]',
          borderClass: isDark ? 'border-gray-500/30' : 'border-gray-500/20',
          ribbonClass: isDark
            ? 'bg-gradient-to-br from-gray-600/70 to-slate-700/70 text-white/80 shadow-md shadow-gray-500/10'
            : 'bg-gradient-to-br from-gray-500 to-slate-600 text-white shadow-lg shadow-gray-500/20',
        };
      case 'review':
      default:
        return {
          label: t('review'),
          bgClass:
            'bg-gradient-to-br from-amber-500/[0.02] to-yellow-500/[0.03]',
          borderClass: isDark ? 'border-amber-500/25' : 'border-amber-500/20',
          ribbonClass: isDark
            ? 'bg-gradient-to-br from-amber-600/80 to-yellow-700/80 text-white/90 shadow-md shadow-amber-500/10'
            : 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/30',
        };
    }
  };

  // 格式化数字（添加千位分隔符）
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const filteredActivities = React.useMemo(() => {
    const filterFn = (item: E2EActivityResponse) => {
      const rewards = (item as any)?.detail?.rewards;
      if (typeof rewards !== 'number') {
        return true; // 如果没有金额信息，默认显示
      }
      if (isTesterOnly) {
        return true; // 测试用户看所有
      }
      return Number(rewards) >= 100; // 普通用户只能看大于等于100的
    };

    return {
      active: activitiesByStatus.active.filter(filterFn),
      complete: activitiesByStatus.complete.filter(filterFn),
      review: activitiesByStatus.review.filter(filterFn),
    };
  }, [activitiesByStatus, isTesterOnly]);

  const makeEntries = (arr: E2EActivityResponse[]) =>
    arr.map(
      (item) =>
        [((item as any)?.detail?.tweet_id || '') as string, item] as [
          string,
          E2EActivityResponse
        ]
    );

  const allEntries = [
    ...makeEntries(filteredActivities.active),
    ...makeEntries(filteredActivities.complete),
    ...makeEntries(filteredActivities.review),
  ].filter(([tweetId]) => Boolean(tweetId));

  // 统计各状态数量（用于芯片计数展示）
  const counts = {
    active: filteredActivities.active.length,
    review: filteredActivities.review.length,
    complete: filteredActivities.complete.length,
  };
  const allCount = counts.active + counts.review + counts.complete;

  const activitiesList =
    effectiveStatus === 'all'
      ? allEntries
      : effectiveStatus === 'active'
        ? makeEntries(filteredActivities.active)
        : effectiveStatus === 'complete'
          ? makeEntries(filteredActivities.complete)
          : makeEntries(filteredActivities.review);

  const isEmpty = !activitiesList || activitiesList.length === 0;
  if (loading) {
    if (isHidden) return null;

    return (
      <div className={`p-4 ${className}`} data-theme={theme}>
        <div className='flex items-center justify-center py-8'>
          <div
            className={`w-6 h-6 border-2 rounded-full animate-spin ${theme === 'dark'
              ? 'border-blue-500/20 border-t-blue-500'
              : 'border-blue-400/20 border-t-blue-400'
              }`}
          ></div>
        </div>
      </div>
    );
  }
  return (
    <div
      ref={scrollContainerRef}
      className={`${className} overflow-y-auto scrollbar-auto relative transition-[max-height] duration-300`}
      data-theme={theme}
      style={{
        maxHeight: listMaxHeight,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      onScroll={handleListScroll}
      onMouseLeave={handleListMouseLeave}
      onMouseEnter={handleListMouseEnter}
    >
      {!embedded && (
        <div className='px-4 pt-3 theme-border flex-shrink-0'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-base font-semibold theme-text-primary whitespace-nowrap overflow-hidden text-ellipsis'>
              🎈 {t('engageToEarn')}
            </h3>

            <div className='flex items-center gap-2'>
              <div className='relative'>
                <button
                  className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md theme-text-primary theme-hover transition-colors border theme-border whitespace-nowrap'
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  aria-label={t('status') || 'Status'}
                >
                  {(statusFilter === 'all' && (t('all') || 'all')) ||
                    (statusFilter === 'active' && (t('active') || 'active')) ||
                    (statusFilter === 'complete' &&
                      (t('complete') || 'complete')) ||
                    t('review') ||
                    'review'}
                  <ChevronDown className='w-3 h-3' />
                </button>

                {showStatusDropdown && (
                  <>
                    <div
                      className='fixed inset-0 z-10'
                      onClick={() => setShowStatusDropdown(false)}
                    />
                    <div className='absolute right-0 top-full mt-1 py-1 theme-bg-secondary rounded-lg shadow-lg theme-border border z-20 min-w-[100px]'>
                      {[
                        { key: 'all', label: t('all') || 'all' },
                        { key: 'active', label: t('active') || 'active' },
                        { key: 'review', label: t('review') || 'review' },
                        { key: 'complete', label: t('complete') || 'complete' },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${statusFilter === (opt.key as any)
                            ? 'theme-bg-tertiary text-blue-500 dark:text-blue-400 font-medium'
                            : 'theme-text-primary hover:theme-bg-tertiary'
                            }`}
                          onClick={() => {
                            setStatusFilter(opt.key as any);
                            setShowStatusDropdown(false);
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type='button'
                aria-label='Close Engage To Earn'
                title='Close'
                className='p-1.5 rounded-md theme-hover theme-text-primary'
                onClick={() => setShowCloseConfirm(true)}
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>
      )}

      {embedded && (
        <div className='sticky top-0 z-[999] pb-2 flex items-center justify-between' style={{
          backgroundColor: 'var(--xhunt-web-bg)',
        }}>
          <div className='flex-1 min-w-0 overflow-x-auto scrollbar-hide'>
            <div className='flex items-center gap-1.5 flex-nowrap'>
              {[
                // { key: 'all', label: t('all') || 'all', count: allCount },
                {
                  key: 'active',
                  label: t('active') || 'active',
                  count: counts.active,
                },
                {
                  key: 'review',
                  label: t('review') || 'review',
                  count: counts.review,
                },
                {
                  key: 'complete',
                  label: t('complete') || 'complete',
                  count: counts.complete,
                },
              ].map((opt) => {
                const selected = effectiveStatus === (opt.key as any);
                return (
                  <button
                    key={opt.key}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md border transition-colors whitespace-nowrap flex-shrink-0 ${selected
                      ? 'theme-bg-tertiary text-blue-500 dark:text-blue-400 font-medium theme-border'
                      : 'theme-text-secondary hover:theme-bg-tertiary theme-border'
                      }`}
                    onClick={() => updateStatus(opt.key as any)}
                    aria-label={`${opt.label}`}
                    title={`${opt.label}`}
                  >
                    <span>{opt.label}</span>
                    <span>{opt.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className='flex items-center gap-1 pl-2 flex-shrink-0'>
            <div
              ref={infoTriggerRef}
              className='relative'
              onPointerEnter={handleInfoEnter}
              onPointerLeave={handleInfoLeave}
            >
              <button
                type='button'
                className='p-1 whitespace-nowrap rounded-md theme-hover theme-text-secondary hover:theme-text-primary'
                aria-label={t('info') || 'Info'}
              >
                <span className='text-[11px]'>{t('howToParticipate')}</span>
                <svg
                  // t='1766460765482'
                  className='w-3.5 h-3.5 inline-block opacity-70 hover:opacity-100'
                  style={{
                    filter: 'saturate(1.5) hue-rotate(196deg) brightness(0.9)',
                  }}
                  viewBox='0 0 1024 1024'
                  version='1.1'
                  xmlns='http://www.w3.org/2000/svg'
                  p-id='9293'
                >
                  <path
                    d='M576 800c32.448 0 84.928 9.344 96 0 24.48-20.672-21.376-76.352 0-128 21.664-52.352 128-112.576 128-185.216 0-68.736 74.336-139.2 37.44-191.36A319.616 319.616 0 0 0 576 160C399.264 160 256 303.264 256 480c0 59.84-22.56 50.368 0 110.784 8.128 21.76 78.464 47.872 96 81.216 27.2 51.712 5.6 111.552 32 128 49.024 30.528 129.984 0 192 0z'
                    fill='#FFCB01'
                    p-id='9294'
                  ></path>
                  <path
                    d='M640 672v-27.616l29.056-18.912a288 288 0 1 0-314.08 0l29.056 18.944V672H640z m0 64h-256v64h256v-64zM512 32c194.4 0 352 157.6 352 352a351.68 351.68 0 0 1-160 295.04V800a64 64 0 0 1-64 64h-256a64 64 0 0 1-64-64v-120.896A351.68 351.68 0 0 1 160 384C160 189.6 317.6 32 512 32z m-128 896h256a32 32 0 0 1 0 64h-256a32 32 0 0 1 0-64z'
                    fill='#1C412F'
                    p-id='9295'
                  ></path>
                </svg>
                {/* <Info className='w-3.5 h-3.5' /> */}
              </button>
              {showInfo &&
                infoPopoverRect &&
                createPortal(
                  <div
                    className='fixed p-3 theme-bg-secondary rounded-md shadow-lg theme-border border z-[9999] w-[280px]'
                    style={{
                      left: Math.max(8, infoPopoverRect.right - 280),
                      top: infoPopoverRect.bottom + 4,
                    }}
                    onMouseEnter={handleInfoEnter}
                    onMouseLeave={handleInfoLeave}
                  >
                    <div className='text-xs font-semibold theme-text-primary mb-2'>
                      {t('engageEarnRulesTitle') || 'Interaction Rules'}
                    </div>
                    <div className='text-[11px] leading-5 theme-text-secondary space-y-1.5'>
                      <div>
                        {t('engageEarnRuleInteraction') ||
                          'Interaction: Quotes/RTs/Replies increase points, Quotes>RTs>Replies.'}
                      </div>
                      <div>
                        {t('engageEarnRuleContent') ||
                          'Content: Authentic, valuable content gets a boost; AI-like content is discounted.'}
                      </div>
                      <div>
                        {t('engageEarnRuleTimeliness') ||
                          'Timeliness: Earlier engagement increases weight; late engagement reduces it.'}
                      </div>
                      <div>
                        {t('engageEarnRuleInfluence') ||
                          'Influence: XHunt rank applies different multipliers.'}
                      </div>
                      <div className='pt-1'>
                        <span
                          className='text-[11px] leading-5 theme-text-secondary [&_a]:underline [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a:hover]:opacity-90'
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(
                              t('engageEarnLearnMore') ||
                              'Learn more: <a href="https://x.com/xhunt_ai/status/2009941394002194773">Engage to Earn intro</a>'
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </div>,
                  portalContainer || document.body
                )}
            </div>
          </div>
        </div>
      )}

      <div>
        {isEmpty ? (
          <div className='text-[12px] text-center py-1 theme-text-secondary'>
            {t('noActivitiesAvailable')}
          </div>
        ) : (
          <div className='space-y-2'>
            {activitiesList.map(([tweetId, activityData]) => {
              const status = getActivityStatus(
                (activityData as any)?.detail?.status
              );
              const isSignedUp = signedUpActivities[tweetId];
              const isLoading = signupLoading[tweetId];
              const statusConfig = getStatusConfig(status);

              return (
                <ActivityCard
                  key={tweetId}
                  tweetId={tweetId}
                  activityData={activityData}
                  statusConfig={statusConfig}
                  status={status}
                  isSignedUp={isSignedUp}
                  isLoading={isLoading}
                  onSignup={handleSignup}
                  signupError={signupErrors[tweetId] || ''}
                  onNavigateToSettings={openSettingsPage}
                  currentUsername={
                    user && typeof user === 'object' ? user.username : ''
                  }
                  userInfoCacheBust={userInfoCacheBust}
                  theme={theme as 'dark' | 'light'}
                  t={t}
                  lang={lang || 'zh'}
                  formatNumber={formatNumber}
                  formatDate={formatDate}
                  listMaxHeight={listMaxHeight}
                />
              );
            })}
          </div>
        )}
      </div>
      {!embedded && (
        <CloseConfirmDialog
          isOpen={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={async () => {
            setIsHidden(true);
            setShowCloseConfirm(false);
            try {
              await localStorageInstance.set(
                '@settings/showEngageToEarn',
                false
              );
            } catch { }
          }}
          prefixKey='confirmCloseTrendingPrefix'
          suffixKey='confirmCloseTrendingSuffix'
        />
      )}

      {/* 报名前的风险提示弹框（可勾选不再提示） */}
      {showRiskWarn &&
        createPortal(
          <div
            className={`${portalContainer ? 'absolute' : 'fixed'
              } inset-0 z-[999000] flex items-start justify-center`}
          >
            <div
              className={`${portalContainer ? 'absolute' : 'fixed'
                } inset-0 z-[999001] theme-bg-secondary`}
              style={{ opacity: 0.8 }}
              onClick={() => setShowRiskWarn(false)}
            />
            <div className='relative z-[999002] theme-bg-secondary theme-text-primary rounded-lg border theme-border p-4 w-[300px] shadow-xl mt-10'>
              <div className='text-xs whitespace-pre-line'>
                {t('e2eRiskWarningText')}
              </div>
              <label className='mt-3 flex items-center gap-2 text-xs theme-text-secondary'>
                <input
                  type='checkbox'
                  checked={riskWarnChecked}
                  onChange={(e) => setRiskWarnChecked(e.target.checked)}
                />
                <span>{t('e2eRiskDontShowAgain')}</span>
              </label>
              <div className='mt-3 flex justify-end gap-2'>
                <button
                  type='button'
                  className='px-3 py-1.5 text-xs rounded-md theme-hover border theme-border theme-text-primary'
                  onClick={() => setShowRiskWarn(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type='button'
                  className='px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600'
                  onClick={() => {
                    if (riskWarnChecked) {
                      try {
                        setSkipRiskWarn(true);
                      } catch { }
                    }
                    setShowRiskWarn(false);
                    if (pendingActivity) {
                      debouncedSignup(pendingActivity);
                      setPendingActivity(null);
                    }
                  }}
                >
                  {t('e2eRiskContinueButton')}
                </button>
              </div>
            </div>
          </div>,
          portalContainer || document.body
        )}
    </div>
  );
}

interface ActivityCardProps {
  tweetId: string;
  activityData: E2EActivityResponse;
  statusConfig: {
    label: string;
    bgClass: string;
    borderClass: string;
    ribbonClass: string;
  };
  status: ActivityStatus;
  isSignedUp: boolean;
  isLoading: boolean;
  onSignup: (activity: E2EActivityResponse) => void;
  signupError: string;
  onNavigateToSettings: () => void;
  currentUsername: string;
  userInfoCacheBust: number;
  theme: 'dark' | 'light';
  t: (key: string) => string;
  lang: string;
  formatNumber: (num: number) => string;
  formatDate: (dateStr: string) => string;
  listMaxHeight: number;
}

// 头像组件，带加载失败处理
const Avatar = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) => {
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    setError(false);
  }, [src]);

  if (error || !src) {
    return (
      <div
        className={`${className} bg-gray-500/30 flex items-center justify-center`}
      >
        <User className='w-4/5 h-4/5 text-gray-500/60' />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};

// 付费推广政策免责声明组件（可展开折叠）
interface PolicyDisclaimerProps {
  agreed: boolean;
  onAgreeChange: (value: boolean) => void;
  t: (key: string) => string;
}

const PolicyDisclaimer: React.FC<PolicyDisclaimerProps> = ({
  agreed,
  onAgreeChange,
  t,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const policyText = t('hunterCampaignPaidPartnershipDisclaimer');

  return (
    <label
      className={`group flex items-start gap-2 p-2 rounded-lg border transition-all duration-200 cursor-pointer mt-2 ${agreed
        ? 'bg-gradient-to-br from-amber-400/5 to-blue-500/5 border-amber-400/20 hover:border-amber-400/30'
        : 'bg-amber-400/[0.02] border-amber-400/15 hover:border-amber-400/25 hover:bg-amber-400/[0.04]'
        }`}
    >
      {/* 自定义 checkbox */}
      <div
        className={`relative flex items-center justify-center w-4 h-4 mt-0.5 rounded transition-all duration-200 flex-shrink-0 ${agreed
          ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm shadow-amber-500/20'
          : 'border border-dashed border-amber-400/50 group-hover:border-amber-400/70 group-hover:bg-amber-400/5'
          }`}
      >
        {agreed && (
          <Check className='w-2.5 h-2.5 text-white' strokeWidth={3} />
        )}
      </div>
      <input
        type='checkbox'
        checked={agreed}
        onChange={(e) => onAgreeChange(e.target.checked)}
        className='sr-only'
      />

      {/* 文本内容区域 - 展开/折叠按钮与文本同行 */}
      <div className='flex-1 min-w-0'>
        {expanded ? (
          // 展开状态：完整文本 + 收起按钮
          <div className='text-[10px] leading-relaxed theme-text-secondary/80 select-none'>
            <span dangerouslySetInnerHTML={{ __html: policyText }} />
            <button
              type='button'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(false);
              }}
              className='inline-flex items-center gap-0.5 ml-1 text-[9px] text-amber-500/70 hover:text-amber-500 transition-colors align-middle'
            >
              <span>{t('collapse')}</span>
              <ChevronUp className='w-3 h-3' />
            </button>
          </div>
        ) : (
          // 折叠状态：单行文本末尾 + 展开按钮
          <div className='flex items-center gap-1 text-[10px] leading-relaxed theme-text-secondary/80 select-none'>
            <span className='line-clamp-1 flex-1 min-w-0' dangerouslySetInnerHTML={{ __html: policyText }} />
            <button
              type='button'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(true);
              }}
              className='inline-flex items-center gap-0.5 flex-shrink-0 text-[9px] text-amber-500/70 hover:text-amber-500 transition-colors'
            >
              <span>{t('expand')}</span>
              <ChevronDown className='w-3 h-3' />
            </button>
          </div>
        )}
      </div>
    </label>
  );
};

function ActivityCard({
  tweetId,
  activityData,
  statusConfig,
  status,
  isSignedUp,
  isLoading,
  onSignup,
  signupError,
  onNavigateToSettings,
  currentUsername,
  userInfoCacheBust,
  theme,
  t,
  lang,
  formatNumber,
  listMaxHeight,
}: ActivityCardProps) {
  const [showLeaderboard, setShowLeaderboard] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [agreedToSponsoredPolicy, setAgreedToSponsoredPolicy] = React.useState(false);
  const leaderboardRef = React.useRef<HTMLDivElement | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const { detail, current_user, leaderboard } = activityData;

  // 获取 AI 总结文本（如果没有就显示空字符串）
  const summaryText = React.useMemo(() => {
    const cn = detail.summary_cn;
    const en = detail.summary_en;
    return lang === 'zh' ? cn || en || '' : en || cn || '';
  }, [detail, lang]);

  // 格式化时间范围
  const getTimeRange = () => {
    const locale = lang === 'zh' ? 'zh-CN' : 'en-US';
    const fmt = new Intl.DateTimeFormat(locale, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const start = fmt.format(new Date(detail.start_time));
    const end = fmt.format(new Date(detail.end_time));
    return `${start} - ${end}`;
  };

  // 生成报名限制说明（与 CampaignTags 一致：数字用 compact 格式，-1 表示 200k+creator）
  const getRequirementText = (): string | null => {
    const target = detail.target;
    if (target === -1) {
      return t('xhuntRankTop200kOrCreator');
    }
    if (
      typeof target === 'number' &&
      Number.isFinite(target) &&
      target > 0
    ) {
      return `${t('xhuntRankTop')}${formatRankThreshold(target, 'en-US')}${t(
        'rankUnit'
      )}`;
    }
    return null;
  };

  // 检查是否可以报名
  const canSignup = status === 'active' && !isSignedUp && !isLoading;

  // 展开排行榜时，平滑滚动一点，让排行榜更容易被看到
  React.useEffect(() => {
    if (listMaxHeight > 420) return;
    if (!showLeaderboard) return;
    const el = leaderboardRef.current;
    if (!el) return;
    try {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } catch {
      // 部分旧浏览器不支持 scrollIntoView options，忽略错误
    }
  }, [showLeaderboard]);

  // 有报错信息时，平滑滚动到该卡片，让错误信息更容易被看到
  React.useEffect(() => {
    if (!signupError) return;
    const el = cardRef.current;
    if (!el) return;
    try {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } catch {
      // 部分旧浏览器不支持 scrollIntoView options，忽略错误
    }
  }, [signupError]);

  return (
    <div
      ref={cardRef}
      data-activity-id={tweetId}
      className={`relative rounded-xl border ${statusConfig.borderClass} ${statusConfig.bgClass} overflow-hidden transition-all duration-300 hover:shadow-md`}
    >
      {/* 状态Ribbon */}
      <div
        className={`absolute top-0 right-0 px-5 py-0.5 text-[9px] font-bold ${statusConfig.ribbonClass} transform rotate-45 origin-center z-10 flex items-center justify-center`}
        style={{
          width: '100px',
          transform: 'rotate(45deg) translate(23px, -11px)',
          textIndent: '10px',
        }}
      >
        {statusConfig.label}
      </div>

      {/* 主体内容 */}
      <div className='p-3 pb-2'>
        {/* 顶部：活动时间和奖金 */}
        <div className='mb-2 text-xs theme-text-primary space-y-1'>
          <div>
            {t('rewardPool')}:{' '}
            <span
              className='font-bold inline-block'
              style={{
                color: theme === 'dark' ? '#d97706' : '#ca8a04',
              }}
            >
              {detail.rewards}U
            </span>
            {detail?.type === 'equal' ? (
              <span className='relative inline-flex group ml-2'>
                <span
                  className='cursor-pointer px-1.5 py-0 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  aria-label={t('e2eRewardModeEqual')}
                >
                  {t('e2eRewardModeEqual')}
                </span>
                <div className='absolute -left-10 top-full mt-1 z-20 w-max max-w-[280px] whitespace-normal break-words px-2 py-1 rounded theme-bg-secondary theme-text-primary text-[10px] shadow theme-border border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition'>
                  {t('e2eRewardModeEqualTooltip')}
                </div>
              </span>
            ) : detail?.type === 'mindshare' ? (
              <span className='relative inline-flex group ml-2'>
                <span
                  className='cursor-pointer px-1.5 py-0 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                  aria-label={t('e2eRewardModeMindshare')}
                >
                  {t('e2eRewardModeMindshare')}
                </span>
                <div className='absolute -left-10 top-full mt-1 z-20 w-max max-w-[280px] whitespace-normal break-words px-2 py-1 rounded theme-bg-secondary theme-text-primary text-[10px] shadow theme-border border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition'>
                  {t('e2eRewardModeMindshareTooltip')}
                </div>
              </span>
            ) : null}

            <span className='relative inline-flex group ml-2'>
              <span
                className='cursor-pointer px-1.5 py-0 rounded-full text-[10px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                aria-label={t('e2eLangBadgeTooltip')}
              >
                {detail?.lang === 'cn'
                  ? t('e2eLangBadgeCn')
                  : detail?.lang === 'en'
                    ? t('e2eLangBadgeEn')
                    : t('e2eLangBadgeAll')}
              </span>
              <div className='absolute -left-10 top-full mt-1 z-20 w-max max-w-[200px] whitespace-normal break-words px-2 py-1 rounded theme-bg-secondary theme-text-primary text-[10px] shadow theme-border border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition'>
                {t('e2eLangBadgeTooltip')}
              </div>
            </span>

            {detail?.winners ? (
              <span className='inline-block ml-2 px-1.5 py-[1.6px] rounded-full text-[10px] font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'>
                {t('e2eWinnersCount').replace(
                  '{count}',
                  String(detail.winners)
                )}
              </span>
            ) : null}
          </div>
          <div>
            {t('activityTime')}: {getTimeRange()}
          </div>
        </div>

        {/* 头像和名字（推主信息） */}
        <div className='flex items-center gap-2 mb-2'>
          <Avatar
            src={detail.tweet_owner_image}
            alt={detail.tweet_owner_handle}
            className='w-6 h-6 rounded-full object-cover'
          />
          <a
            href={`https://x.com/${detail.tweet_owner_handle}`}
            target='_blank'
            rel='noopener noreferrer'
            className='font-semibold text-xs theme-text-primary hover:underline truncate'
            title={detail.tweet_owner_handle}
          >
            {detail.tweet_owner_handle}
          </a>
        </div>

        {/* AI 总结和原文 */}
        <div className='mb-2'>
          {/* AI 总结 */}
          <div className='text-xs theme-text-secondary leading-relaxed'>
            {summaryText}
          </div>

          {/* 查看原文按钮和原推链接 */}
          <div className='flex items-center gap-1.5 mt-1.5'>
            <button
              onClick={() => setExpanded(!expanded)}
              className='inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] theme-text-secondary hover:theme-text-primary theme-bg-tertiary hover:theme-bg-secondary transition-all'
            >
              {expanded ? (
                <>
                  <ChevronUp className='w-2.5 h-2.5' />
                  <span>{t('collapse')}</span>
                </>
              ) : (
                <>
                  <ChevronDown className='w-2.5 h-2.5' />
                  <span>{t('viewOriginalTweet')}</span>
                </>
              )}
            </button>
            {detail.tweet_link && detail.tweet_link.startsWith('https') && (
              <a
                href={detail.tweet_link}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] theme-text-secondary hover:theme-text-primary theme-bg-tertiary hover:theme-bg-secondary transition-all'
              >
                <span>{t('originalTweetLink')}</span>
                <ExternalLink className='w-2.5 h-2.5' />
              </a>
            )}
          </div>

          {/* 展开后的原文 */}
          {expanded && (
            <>
              {/* 分割线 */}
              <div className='border-t theme-border my-2'></div>

              {/* 原文 */}
              <div className='mb-2'>
                <a
                  href={detail.tweet_link}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block'
                >
                  <div
                    className='text-[11px] theme-text-primary whitespace-pre-wrap break-words'
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(detail.text || ''),
                    }}
                  />
                </a>
              </div>
            </>
          )}
        </div>

        {/* 报名要求 */}
        {getRequirementText() && (
          <div className='text-[10px] font-semibold theme-text-tertiary mt-0.5 opacity-70'>
            {t('requirements')}: {getRequirementText()}
          </div>
        )}

        {/* 付费推广政策免责声明（仅未报名且进行中时显示） */}
        {status === 'active' && !isSignedUp && (
          <PolicyDisclaimer
            agreed={agreedToSponsoredPolicy}
            onAgreeChange={setAgreedToSponsoredPolicy}
            t={t}
          />
        )}
      </div>

      {/* 底部操作栏 */}
      <div className='flex items-center gap-1.5 px-3 pb-2'>
        {/* 参与人数按钮 */}
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className='flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg theme-bg-tertiary hover:theme-bg-secondary border theme-border transition-all text-[11px] font-medium theme-text-primary'
        >
          <svg
            className='w-3 h-3'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
            />
          </svg>
          <span>{t('leaderboard') || 'Leaderboard'}</span>
          <svg
            className={`w-2.5 h-2.5 transition-transform ${showLeaderboard ? 'rotate-180' : ''
              }`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 9l-7 7-7-7'
            />
          </svg>
        </button>

        {/* 报名按钮 */}
        {status === 'active' && (
          <div className='relative group flex-1'>
            <button
              onClick={() => canSignup && agreedToSponsoredPolicy && onSignup(activityData)}
              disabled={!canSignup || !agreedToSponsoredPolicy}
              className={`w-full flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${isSignedUp
                ? theme === 'dark'
                  ? 'bg-blue-600/10 text-blue-300 cursor-not-allowed'
                  : 'bg-blue-500/10 text-blue-600 cursor-not-allowed'
                : canSignup && agreedToSponsoredPolicy
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-600/90 to-purple-700/90 text-white hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-500/20 theme-text-secondary cursor-not-allowed'
                }`}
            >
              {isLoading ? (
                <>
                  <div className='w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  <span>{t('loading')}</span>
                </>
              ) : isSignedUp ? (
                <>
                  <svg
                    className='w-3 h-3'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>{t('signedUp')}</span>
                </>
              ) : (
                <>
                  <svg
                    className='w-3 h-3'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 10V3L4 14h7v7l9-11h-7z'
                    />
                  </svg>
                  <span>{t('signUp')}</span>
                </>
              )}
            </button>
            {/* 未同意政策时的提示 */}
            {!isSignedUp && canSignup && !agreedToSponsoredPolicy && (
              <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg'>
                {t('hunterCampaignAgreeToPolicyFirst')}
                <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 错误信息提示 */}
      {signupError && (
        <div className='px-3 pb-2'>
          <div
            className={`text-[11px] rounded-lg px-2 py-1.5 ${signupError.toLowerCase().includes('evm address')
              ? 'cursor-pointer hover:opacity-80'
              : ''
              }`}
            style={{
              color: theme === 'dark' ? '#f87171' : '#dc2626',
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(127, 29, 29, 0.2)'
                  : 'rgba(254, 226, 226, 0.8)',
              border: `1px solid ${theme === 'dark'
                ? 'rgba(185, 28, 28, 0.3)'
                : 'rgba(252, 165, 165, 0.5)'
                }`,
            }}
            onClick={() => {
              if (signupError.toLowerCase().includes('evm address')) {
                onNavigateToSettings();
              }
            }}
          >
            {signupError}
            {signupError.toLowerCase().includes('evm address') && (
              <span className='ml-1 underline'>
                {t('goToSettings') || '前往设置'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 展开的排行榜 */}
      <div ref={leaderboardRef}>
        {showLeaderboard && (
          <LeaderboardExpanded
            activityId={tweetId}
            participantCount={detail.participants || 0}
            currentUsername={currentUsername}
            userInfoCacheBust={userInfoCacheBust}
            leaderboard={leaderboard}
            currentUser={current_user}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

// 排行榜展开组件（替代Hover）
interface LeaderboardExpandedProps {
  activityId: string;
  participantCount: number;
  currentUsername: string;
  userInfoCacheBust: number;
  leaderboard?: Array<{
    mindshare: number;
    fan_rank?: number;
    id: string;
    name: string;
    username_raw?: string;
    profile_image_url: string;
    point: number;
  }>;
  currentUser?: {
    fan_rank?: number;
    id?: string;
    name?: string;
    username_raw?: string;
    profile_image_url?: string;
    point?: number;
    mindshare?: number;
  };
  t: (key: string) => string;
}

function LeaderboardExpanded({
  activityId,
  currentUsername,
  userInfoCacheBust,
  leaderboard: leaderboardFromProp,
  currentUser,
  t,
}: LeaderboardExpandedProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  // 优先使用 currentUser 中的 fan_rank，这是从 API 返回的当前用户排名
  const userRank = currentUser?.fan_rank || null;
  const userRankName = currentUser?.name || currentUser?.username_raw || '';
  const userMindshare = currentUser?.mindshare || 0;
  const userPoint = currentUser?.point || 0;
  // console.log('userRankName', userRankName);
  // console.log('currentUser', currentUser);

  // 使用 useRequest 自动管理加载状态
  // 优先使用传入的排行榜数据，如果没有则从接口获取
  const { data: leaderboard = [], loading } = useRequest(
    async () => {
      // 如果传入的排行榜数据存在，直接转换格式使用
      if (leaderboardFromProp && leaderboardFromProp.length > 0) {
        return leaderboardFromProp.map((item, index) => ({
          rank: item.fan_rank || index + 1,
          userId: (item as any).user_id || item.id,
          username: (item as any).username || item.username_raw || '',
          displayName: item.name,
          avatar: item.profile_image_url,
          score: item.point || 0,
          fan_rank: item.fan_rank,
          username_raw: (item as any).username || item.username_raw,
          point: item.point,
          mindshare: item.mindshare,
        }));
      }

      // 否则从接口获取
      const data = await fetchE2EActivitySignups(activityId, {
        cacheBust: userInfoCacheBust,
      });
      // 兼容不同返回格式，确保始终返回数组
      if (Array.isArray(data)) return data;
      const inner = (data as any)?.data;
      return Array.isArray(inner) ? inner : [];
    },
    {
      refreshDeps: [
        activityId,
        userInfoCacheBust,
        leaderboardFromProp?.length || 0,
      ],
    }
  );

  const displayLeaderboard =
    leaderboard && leaderboard?.length > 0 ? leaderboard : [];

  return (
    <div className='border-t theme-border'>
      {loading ? (
        <div className='flex items-center justify-center py-4'>
          <div
            className={`w-6 h-6 border-2 rounded-full animate-spin ${theme === 'dark'
              ? 'border-blue-500/20 border-t-blue-500'
              : 'border-blue-400/20 border-t-blue-400'
              }`}
          ></div>
        </div>
      ) : displayLeaderboard.length > 0 ? (
        <div className='px-3 pt-2 pb-2'>
          {/* 用户排名 */}
          {Boolean(userRankName) && (
            <div className='mb-2.5 py-1.5 border-b theme-border'>
              <div className='text-[10px] theme-text-tertiary font-medium mb-0.5'>
                {t('yourRank')}
              </div>
              <div className='text-[11px] font-bold theme-text-primary'>
                {
                  <>
                    #{userRank || t('irNotRanked')} · {userPoint} {t('points') || 'points'} (
                    {`${Number(Number(userMindshare || 0) * 100).toFixed(2)}%`})
                    {/* <span className='text-[11px] theme-text-secondary font-normal ml-1.5'>
                      / {participantCount}
                    </span> */}
                  </>
                }
              </div>
            </div>
          )}

          {/* 排行榜列表 */}
          <div className='space-y-0.5 h-auto overflow-y-auto custom-scrollbar'>
            {displayLeaderboard.map((item, index) => {
              const displayRank =
                typeof item.rank === 'number' && item.rank > 0
                  ? item.rank
                  : index + 1;
              const itemUsername = item.username || item.username_raw || '';
              const isCurrentUser =
                itemUsername.toLowerCase() === currentUsername.toLowerCase();
              return (
                <div
                  key={item.userId || item.id || index}
                  className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-all ${isCurrentUser
                    ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-l-2 border-l-amber-500'
                    : 'hover:theme-bg-tertiary'
                    }`}
                >
                  {/* 排名 */}
                  <div className='w-6 text-center flex-shrink-0'>
                    {displayRank === 1 ? (
                      <span className='text-xl'>🥇</span>
                    ) : displayRank === 2 ? (
                      <span className='text-base'>🥈</span>
                    ) : displayRank === 3 ? (
                      <span className='text-base'>🥉</span>
                    ) : (
                      <span className='text-[10px] font-bold theme-text-secondary'>
                        #{displayRank}
                      </span>
                    )}
                  </div>

                  {/* 头像 */}
                  <Avatar
                    src={item.avatar || item.profile_image_url}
                    alt={item.displayName || item.name}
                    className='w-6 h-6 rounded-full ring-2 ring-white/10'
                  />

                  {/* 用户信息 */}
                  <div className='flex-1 min-w-0'>
                    <div className='text-[11px] font-medium theme-text-primary truncate'>
                      {item.displayName || item.name}
                    </div>
                    <div className='text-[9px] theme-text-secondary truncate'>
                      @{itemUsername}
                    </div>
                  </div>

                  {/* 分数 */}
                  <div className='text-[11px] font-bold theme-text-primary flex-shrink-0'>
                    {item.score || item.point || 0}
                    {item?.mindshare
                      ? ` (${Number(Number(item?.mindshare || 0) * 100).toFixed(
                        2
                      )}%)`
                      : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className='text-[11px] theme-text-secondary text-center py-4'>
          {t('noParticipants')}
        </div>
      )}
    </div>
  );
}
