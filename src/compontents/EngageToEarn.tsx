import React, { useEffect, useState } from 'react';
import { useDebounceFn, useRequest } from 'ahooks';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useI18n } from '~contents/hooks/i18n';
import { navigationService } from '~compontents/navigation/NavigationService';
import {
  fetchE2EActivities,
  signupE2EActivity,
  fetchE2EActivitySignups,
  E2EActivityResponse,
  E2ELeaderboardItem,
  getTwitterAuthUrl,
} from '~contents/services/api';
import { openNewTab } from '~contents/utils';
import { cleanErrorMessage } from '~utils/dataValidation';
import { StoredUserInfo } from '~types/review.ts';
import { sanitizeHtml } from '~utils/sanitizeHtml';
import { ChevronDown, ChevronUp, X, ExternalLink } from 'lucide-react';
import { localStorageInstance } from '~storage/index';
import { CloseConfirmDialog } from './CloseConfirmDialog';

interface EngageToEarnProps {
  className?: string;
}

// 统一的活动状态类型
type ActivityStatus = 'active' | 'complete' | 'review';

export function EngageToEarn({ className = '' }: EngageToEarnProps) {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
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
    } catch {}
    try {
      setTimeout(() => {
        navigationService.navigateTo('main-panel', '/settings');
      }, 100);
    } catch {}
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
    'active'
  );
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
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
          bgClass:
            'bg-gradient-to-br from-green-500/[0.02] to-emerald-500/[0.03]',
          borderClass: 'border-green-500/20',
          ribbonClass: isDark
            ? 'bg-gradient-to-br from-green-600/80 to-emerald-700/80 text-white/90 shadow-md shadow-green-500/10'
            : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30',
        };
      case 'complete':
        return {
          label: t('complete'),
          bgClass: 'bg-gradient-to-br from-gray-500/[0.02] to-slate-500/[0.03]',
          borderClass: 'border-gray-500/20',
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
          borderClass: 'border-amber-500/20',
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

  if (loading) {
    if (isHidden) return null;

    return (
      <div className={`p-4 ${className}`} data-theme={theme}>
        <div className='flex items-center justify-center py-8'>
          <div
            className={`w-6 h-6 border-2 rounded-full animate-spin ${
              theme === 'dark'
                ? 'border-blue-500/20 border-t-blue-500'
                : 'border-blue-400/20 border-t-blue-400'
            }`}
          ></div>
        </div>
      </div>
    );
  }

  const makeEntries = (arr: E2EActivityResponse[]) =>
    arr.map(
      (item) =>
        [((item as any)?.detail?.tweet_id || '') as string, item] as [
          string,
          E2EActivityResponse
        ]
    );

  const allEntries = [
    ...makeEntries(activitiesByStatus.active),
    ...makeEntries(activitiesByStatus.complete),
    ...makeEntries(activitiesByStatus.review),
  ].filter(([tweetId]) => Boolean(tweetId));

  const activitiesList =
    statusFilter === 'all'
      ? allEntries
      : statusFilter === 'active'
      ? makeEntries(activitiesByStatus.active)
      : statusFilter === 'complete'
      ? makeEntries(activitiesByStatus.complete)
      : makeEntries(activitiesByStatus.review);

  if (!activitiesList || activitiesList.length === 0) {
    return (
      <div className={`p-4 ${className}`} data-theme={theme}>
        <div className='text-[12px] text-center py-8 theme-text-secondary'>
          {t('noActivitiesAvailable')}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${className} max-h-[600px] overflow-y-auto scrollbar-hide relative`}
      data-theme={theme}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {/* 顶部标题与操作区（对齐 HotProjectsKOLs 样式） */}
      <div className='px-4 pt-3 theme-border flex-shrink-0'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-base font-semibold theme-text-primary whitespace-nowrap overflow-hidden text-ellipsis'>
            🎈 {t('engageToEarn')}
          </h3>

          {/* 右侧操作区：状态下拉 + 关闭 */}
          <div className='flex items-center gap-2'>
            {/* 状态下拉选择 */}
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
                  <div className='absolute right-0 top-full mt-1 py-1 theme-bg-secondary rounded-md shadow-lg theme-border border z-20 min-w-[100px]'>
                    {[
                      { key: 'all', label: t('all') || 'all' },
                      { key: 'active', label: t('active') || 'active' },
                      { key: 'review', label: t('review') || 'review' },
                      { key: 'complete', label: t('complete') || 'complete' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                          statusFilter === (opt.key as any)
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'theme-text-primary theme-hover'
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

            {/* 关闭按钮 */}
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

      <div className='px-4 pb-3'>
        <div className='space-y-4'>
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
              />
            );
          })}
        </div>
      </div>
      {/* 关闭确认弹框（放在最外层容器末尾，避免被头部层覆盖） */}
      <CloseConfirmDialog
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={async () => {
          setIsHidden(true);
          setShowCloseConfirm(false);
          try {
            await localStorageInstance.set('@settings/showEngageToEarn', false);
          } catch {}
        }}
        prefixKey='confirmCloseTrendingPrefix'
        suffixKey='confirmCloseTrendingSuffix'
      />

      {/* 报名前的风险提示弹框（可勾选不再提示） */}
      {showRiskWarn && (
        <div className='absolute inset-0 z-[999000] flex items-start justify-center'>
          <div
            className='absolute inset-0 z-[999001] theme-bg-secondary'
            style={{ opacity: 0.8 }}
            onClick={() => setShowRiskWarn(false)}
          />
          <div className='relative z-[999002] theme-bg-secondary theme-text-primary rounded-lg border theme-border p-4 w-[300px] shadow-xl mt-4'>
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
                    } catch {}
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
        </div>
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
}

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
  formatDate,
}: ActivityCardProps) {
  const [showLeaderboard, setShowLeaderboard] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const { detail, current_user, leaderboard } = activityData;

  // 获取 AI 总结文本（如果没有就显示空字符串）
  const summaryText = React.useMemo(() => {
    const cn = detail.summary_cn;
    const en = detail.summary_en;
    return lang === 'zh' ? cn || en || '' : en || cn || '';
  }, [detail, lang]);

  // 格式化时间范围
  const getTimeRange = () => {
    const start = new Date(detail.start_time).toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
    const end = new Date(detail.end_time).toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
    return `${start} - ${end}`;
  };

  // 生成报名限制说明
  const getRequirementText = () => {
    if (detail.target) {
      return `${t('xhuntRankTop')}${formatNumber(detail.target)}${t(
        'rankUnit'
      )}`;
    }
    return null;
  };

  // 检查是否可以报名
  const canSignup = status === 'active' && !isSignedUp && !isLoading;

  return (
    <div
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
        <div className='mb-2 flex items-center gap-2 text-xs theme-text-primary'>
          <span>
            {t('activityTime')}: {getTimeRange()}
          </span>
          <span className='theme-text-secondary'>|</span>
          <span>
            {t('rewardPool')}:{' '}
            <span
              className='font-bold'
              style={{
                color: theme === 'dark' ? '#d97706' : '#ca8a04',
              }}
            >
              {detail.rewards}U
            </span>
          </span>
        </div>

        {/* 头像和名字（推主信息） */}
        <div className='flex items-center gap-2 mb-2'>
          <img
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

        {/* 报名限制说明 */}
        {getRequirementText() && (
          <div className='text-[10px] font-semibold theme-text-tertiary mt-0.5 opacity-70'>
            {t('requirements')}: {getRequirementText()}
          </div>
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
            className={`w-2.5 h-2.5 transition-transform ${
              showLeaderboard ? 'rotate-180' : ''
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
          <button
            onClick={() => canSignup && onSignup(activityData)}
            disabled={!canSignup}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
              isSignedUp
                ? theme === 'dark'
                  ? 'bg-blue-600/10 text-blue-300 cursor-not-allowed'
                  : 'bg-blue-500/10 text-blue-600 cursor-not-allowed'
                : canSignup
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
        )}
      </div>

      {/* 错误信息提示 */}
      {signupError && (
        <div className='px-3 pb-2'>
          <div
            className={`text-[11px] rounded-lg px-2 py-1.5 ${
              signupError.toLowerCase().includes('evm address')
                ? 'cursor-pointer hover:opacity-80'
                : ''
            }`}
            style={{
              color: theme === 'dark' ? '#f87171' : '#dc2626',
              backgroundColor:
                theme === 'dark'
                  ? 'rgba(127, 29, 29, 0.2)'
                  : 'rgba(254, 226, 226, 0.8)',
              border: `1px solid ${
                theme === 'dark'
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
      {showLeaderboard && (
        <LeaderboardExpanded
          activityId={tweetId}
          participantCount={detail.participants || 0}
          currentUsername={currentUsername}
          userInfoCacheBust={userInfoCacheBust}
          leaderboard={leaderboard}
          currentUser={
            current_user &&
            typeof current_user === 'object' &&
            Object.keys(current_user).length > 0
              ? (current_user as any)
              : undefined
          }
          t={t}
        />
      )}
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
  };
  t: (key: string) => string;
}

function LeaderboardExpanded({
  activityId,
  participantCount,
  currentUsername,
  userInfoCacheBust,
  leaderboard: leaderboardFromProp,
  currentUser,
  t,
}: LeaderboardExpandedProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  // 优先使用 currentUser 中的 fan_rank，这是从 API 返回的当前用户排名
  const userRank = currentUser?.fan_rank || null;

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

  const displayLeaderboard = leaderboard.slice(0, 20);

  return (
    <div className='border-t theme-border'>
      {loading ? (
        <div className='flex items-center justify-center py-4'>
          <div
            className={`w-6 h-6 border-2 rounded-full animate-spin ${
              theme === 'dark'
                ? 'border-blue-500/20 border-t-blue-500'
                : 'border-blue-400/20 border-t-blue-400'
            }`}
          ></div>
        </div>
      ) : displayLeaderboard.length > 0 ? (
        <div className='px-3 pt-2 pb-2'>
          {/* 用户排名 */}
          {userRank !== null && (
            <div className='mb-2.5 py-1.5 border-b theme-border'>
              <div className='text-[10px] theme-text-tertiary font-medium mb-0.5'>
                {t('yourRank')}
              </div>
              <div className='text-base font-bold theme-text-primary'>
                #{userRank}
                <span className='text-sm theme-text-secondary font-normal ml-1.5'>
                  / {participantCount}
                </span>
              </div>
            </div>
          )}

          {/* 排行榜标题
          <div className='flex items-center gap-1.5 mb-2'>
            <span className='text-sm'>🏆</span>
            <span className='text-[11px] font-bold theme-text-primary'>
              {t('topParticipants')}
            </span>
          </div> */}

          {/* 排行榜列表 */}
          <div className='space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar'>
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
                  className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-all ${
                    isCurrentUser
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
                  <img
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
