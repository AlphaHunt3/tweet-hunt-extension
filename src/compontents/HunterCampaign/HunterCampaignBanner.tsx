import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useLockFn, useRequest } from 'ahooks';
import { MessageCircle } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage';
import { localStorageInstance } from '~storage/index';
import { useGlobalTips } from '~compontents/area/GlobalTips.tsx';
import { cleanErrorMessage } from '~/utils/dataValidation';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import { ActivityHeader } from './ActivityHeader';
import { HunterCampaignCaptain } from './HunterCampaignCaptain';
import { CampaignLeaderboard } from './CampaignLeaderboard';
import { RegisteredContent } from './RegisteredContent';
import { UnregisteredContent } from './UnregisteredContent';
import { XLogo } from './XLogo';
import type {
  Task,
  HunterCampaignBannerProps,
  HunterCampaignTaskDefinition,
} from './types';
import { updateUserInfo } from '~contents/services/review.ts';
import { StoredUserInfo } from '~types/review.ts';

export function HunterCampaignBanner({
  className = '',
  unregisteredMode = 'expanded',
  showMantleHunterComponents = false,
  campaignConfig,
  defaultExpanded: forceDefaultExpanded,
}: HunterCampaignBannerProps) {
  // =========================================
  // 1) Core hooks & global utilities
  // =========================================
  const { t } = useI18n();
  const [, setTips] = useGlobalTips();
  const [showHotTrending] = useLocalStorage('@settings/showHotTrending', true);
  const [token] = useLocalStorage('@xhunt/token', '');
  const isLoggedIn = !!token;

  if (!campaignConfig) return null;

  // =========================================
  // 2) Local component state
  // =========================================
  const [userInviteCode, setUserInviteCode] = useState('');
  const [evmAddress, setEvmAddress] = useState('');
  const [isVerifyingWallet, setIsVerifyingWallet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisteredState, setIsRegisteredState] = useState(false);
  const [inviteCodeState, setInviteCodeState] = useState('');
  const [registrationError, setRegistrationError] = useState<string>('');
  const [userRankState, setUserRankState] = useState<number | string | null>(
    '999+'
  );
  const [invitedCountState, setInvitedCountState] = useState<number>(0);
  // total registrations for sharing with child components (e.g., Captain)
  const [totalRegistrations, setTotalRegistrations] = useState<
    number | undefined
  >(undefined);
  // 存储 hunterData 中的详细排名信息
  const [hunterDataState, setHunterDataState] = useState<{
    mindshare: { rank?: number | null; invites?: number };
    workshare: { rank?: number | null };
  }>({ mindshare: {}, workshare: {} });
  // null 表示尚未手动操作，遵循默认展开逻辑；true/false 表示用户已手动切换（持久化）
  // 基于 campaignKey 生成唯一的存储键，确保每个活动的展开状态独立存储
  const expandedStorageKey =
    campaignConfig.expandedStorageKey ||
    `@xhunt/${campaignConfig.campaignKey}HunterExpanded`;
  const [isExpandedManual, setIsExpandedManual] = useLocalStorage<
    boolean | null
  >(expandedStorageKey, null);
  const taskStorageBase = campaignConfig.taskStorageKey || '@xhunt/mantleTasks';
  const showExtraSections =
    showMantleHunterComponents ?? Boolean(campaignConfig.showExtraComponents);

  // Per-user task progress storage
  const [xhuntUser, setXhuntUser] = useLocalStorage<StoredUserInfo | null>(
    '@xhunt/user',
    null
  );
  const tasksKey = useMemo(() => {
    if (!xhuntUser || typeof xhuntUser !== 'object' || !xhuntUser.id) return '';
    return `${taskStorageBase}:${xhuntUser.id}`;
  }, [xhuntUser, taskStorageBase]);
  const [taskProgress, setTaskProgress] = useLocalStorage<
    Record<string, boolean>
  >(tasksKey || `${taskStorageBase}:guest`, {});

  // Migrate guest progress to per-user key once user info is available
  useEffect(() => {
    if (!tasksKey) return;
    (async () => {
      try {
        const guestKey = `${taskStorageBase}:guest`;
        const guestProgress = await localStorageInstance.get(guestKey);
        if (guestProgress && typeof guestProgress === 'object') {
          await localStorageInstance.set(tasksKey, guestProgress);
          await localStorageInstance.remove(guestKey);
        }
      } catch {}
    })();
  }, [tasksKey, taskStorageBase]);

  // =========================================
  // 3) Config-driven navigation (guide link)
  // =========================================
  // 官方指南链接点击时动态获取（无需校验）
  const handleOpenGuide = useCallback(() => {
    try {
      const url = campaignConfig.links.getGuideUrl();
      openNewTab(url || '#');
    } catch (e) {
      // openNewTab('#');
    }
  }, [campaignConfig]);

  // =========================================
  // 4) Clipboard helpers
  // =========================================
  const handleCopyInviteCode = async () => {
    try {
      if (!inviteCodeState) {
        setTips({
          text: t('mantleHunterErrorWalletVerification'),
          type: 'fail',
        });
        return;
      }
      await navigator.clipboard.writeText(inviteCodeState);
      setTips({ text: t('aiChatCopied'), type: 'suc' });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openTaskAndCompleteOnReturn = useCallback(
    (taskId: string, url: string) => {
      openNewTab(url);
    },
    []
  );

  const createTaskFromDefinition = useCallback(
    (
      taskDef: HunterCampaignTaskDefinition,
      progress?: Record<string, boolean>
    ): Task => {
      let icon: React.ReactNode;
      if (taskDef.type === 'twitter') {
        icon = <XLogo className='w-4 h-4' />;
      } else if (taskDef.type === 'telegram') {
        icon = <MessageCircle className='w-4 h-4' />;
      } else {
        icon = <MessageCircle className='w-4 h-4' />;
      }

      return {
        id: taskDef.id,
        title: taskDef.title,
        icon,
        completed: Boolean(progress?.[taskDef.id]),
        action: () => {
          try {
            if (taskDef.autoComplete) {
              setTaskProgress((prev) => ({
                ...(prev || {}),
                [taskDef.id]: true,
              }));
            }
          } catch {}
          openTaskAndCompleteOnReturn(taskDef.id, taskDef.url);
        },
      };
    },
    [openTaskAndCompleteOnReturn, setTaskProgress]
  );

  // =========================================
  // 5) UI helpers
  // =========================================
  // 截断地址显示（行业常用：前6后4）
  const formatEvmAddress = useCallback((addr: string) => {
    if (!addr) return '';
    const trimmed = String(addr).trim();
    if (trimmed.length <= 12) return trimmed;
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
  }, []);

  // // =========================================
  // // 6) Wallet connect & signature verification
  // // =========================================
  // const handleWalletVerification = useCallback(async () => {
  //   setIsVerifyingWallet(true);
  //   try {
  //     // 第一步：先连接钱包，拿到地址（不传message）
  //     const connectResp = await chrome.runtime.sendMessage({
  //       type: 'CONNECT_WALLET',
  //     });

  //     if (!connectResp || !connectResp.success || !connectResp.data) {
  //       throw new Error(
  //         (connectResp && connectResp.error) || 'Wallet connection failed'
  //       );
  //     }

  //     const { address } = connectResp.data as { address: string };
  //     if (!address) throw new Error('No address');

  //     // 第二步：强制向后端请求挑战（必须有后端 message，缺失则报错）
  //     const challenge = await getWalletNonce(address);
  //     const messageToSign = challenge?.message;
  //     if (!messageToSign) {
  //       throw new Error('No server challenge message');
  //     }

  //     // 第三步：用挑战消息发起签名（走背景页，确保兼容 MAIN world）
  //     const signResp = await chrome.runtime.sendMessage({
  //       type: 'CONNECT_WALLET',
  //       message: messageToSign,
  //     });

  //     if (!signResp || !signResp.success || !signResp.data) {
  //       throw new Error((signResp && signResp.error) || 'Sign failed');
  //     }

  //     const { signature, message } = signResp.data as {
  //       signature: string;
  //       message: string;
  //     };
  //     if (!signature) throw new Error('No signature');

  //     // 第四步：把 { address, signature, nonce/message } 发给后端校验（必须成功才算登录）
  //     const verifyRet = await verifyWalletSignature({
  //       address,
  //       signature,
  //       nonce: challenge?.nonce,
  //       message: message || messageToSign,
  //     });
  //     if (!verifyRet || !verifyRet.success) {
  //       throw new Error('Verify failed');
  //     }
  //     setEvmAddress(address);
  //     // setTips({ text: t('loginSuccess'), type: 'suc' });
  //   } catch (error) {
  //     console.error('Wallet verification error:', error);
  //     const message =
  //       (error instanceof Error && error.message) ||
  //       t('mantleHunterErrorWalletVerification');
  //     setTips({ text: `${message}`, type: 'fail' });
  //   } finally {
  //     setIsVerifyingWallet(false);
  //   }
  // }, [t]);

  // =========================================
  // 7) Task list & derived states
  // =========================================
  const [tasks, setTasks] = useState<Task[]>(() =>
    campaignConfig.tasks.map((taskDef) =>
      createTaskFromDefinition(taskDef, taskProgress || {})
    )
  );

  useEffect(() => {
    setTasks(
      campaignConfig.tasks.map((taskDef) =>
        createTaskFromDefinition(taskDef, taskProgress || {})
      )
    );
  }, [campaignConfig, taskProgress, createTaskFromDefinition]);

  const allRequiredTasksCompleted =
    tasks.every((task) => task.completed) && !!evmAddress;

  // 计算默认展开状态：
  // - 如果提供了 forceDefaultExpanded，直接使用它
  // - 否则：已报名默认展开，未报名由 unregisteredMode 决定
  const defaultExpanded =
    forceDefaultExpanded !== undefined
      ? forceDefaultExpanded
      : isRegisteredState
      ? true
      : unregisteredMode !== 'collapsed';

  // 内容可见性：若用户手动切换，则以手动为准；否则使用默认
  const effectiveExpanded =
    isExpandedManual !== null ? isExpandedManual : defaultExpanded;
  const isContentVisible = effectiveExpanded;

  // =========================================
  // 8) Data fetching (registration info)
  // =========================================
  const { loading: regLoading, refresh: refreshRegistration } = useRequest(
    () => campaignConfig.api.fetchRegistration(xhuntUser?.id || ''),
    {
      manual: true, // 设置为手动触发，不自动执行
      refreshDeps: [campaignConfig],
      onSuccess: (ret) => {
        const registered = !!ret?.registered;
        setIsRegisteredState(registered);
        // share total registrations regardless of personal registration state
        if (typeof ret?.totalRegistrations === 'number') {
          setTotalRegistrations(ret.totalRegistrations);
        }
        if (registered) {
          const reg: any = (ret as any).registration || {};
          setInviteCodeState(reg?.xHuntUser?.inviteCode || '');
          setEvmAddress(reg?.evmAddress || '');

          // 处理 hunterData 中的排名信息
          const hunterData = ret.hunterData || {};
          setHunterDataState({
            mindshare: {
              rank: hunterData.mindshare?.rank ?? null,
              invites: hunterData.mindshare?.invites ?? 0,
            },
            workshare: {
              rank: hunterData.workshare?.rank ?? null,
            },
          });

          // 计算最佳排名：选择 mindshare 和 workshare 中排名最靠前的
          const mindshareRank = hunterData.mindshare?.rank;
          const workshareRank = hunterData.workshare?.rank;

          let bestRank: number | string | null = null;
          if (mindshareRank !== null && mindshareRank !== undefined) {
            bestRank = mindshareRank;
          }
          if (workshareRank !== null && workshareRank !== undefined) {
            if (bestRank === null || workshareRank < bestRank) {
              bestRank = workshareRank;
            }
          }

          // 如果没有排名，显示 "999+"
          setUserRankState(bestRank !== null ? bestRank : '999+');

          setInvitedCountState(
            typeof ret.invitedCount === 'number' ? ret.invitedCount : 0
          );
          // Clear per-user task progress if already registered
          try {
            if (tasksKey) {
              localStorageInstance.remove(tasksKey);
            }
          } catch {}
        }
      },
    }
  );

  // 等待 xhuntUser 加载完成后手动触发请求
  useEffect(() => {
    if (xhuntUser?.id) {
      refreshRegistration();
    }
  }, [xhuntUser?.id, refreshRegistration, campaignConfig]);

  // Prefill EVM address from saved Settings (user profile) if available
  useEffect(() => {
    let canceled = false;
    // console.log('useEffect: fetchEvm', isLoggedIn);
    const fetchEvm = async () => {
      try {
        if (!isLoggedIn) return;
        if (evmAddress && evmAddress.trim().length > 0) return;
        const info = await updateUserInfo();
        // console.log('fetchEvm', info);
        if (info && !canceled) {
          // updateUserInfo 已经统一同步到 @xhunt/user，这里不需要再同步
          const addr = (info as any)?.evmAddresses?.[0];
          if (addr && !canceled) {
            setEvmAddress(addr);
          }
        }
      } catch {}
    };
    fetchEvm();
    return () => {
      canceled = true;
    };
  }, [isLoggedIn]);

  // =========================================
  // 9) Submit handlers & navigation
  // =========================================
  const handleSubmitRegistration = useCallback(async () => {
    if (!allRequiredTasksCompleted) return;
    setIsSubmitting(true);
    setRegistrationError(''); // 清空之前的错误
    try {
      const res = await campaignConfig.api.submitRegistration({
        invitedByCode: userInviteCode || null,
        evmAddress: evmAddress || null,
        registrationUrl: window.location.href,
      });
      if (!res || !res.success) {
        throw new Error('报名失败');
      }
      // 报名成功后，刷新报名信息
      refreshRegistration();
      // 显示成功提示
      setTips({ text: '报名成功！', type: 'suc' });
      // Clear per-user task progress upon successful registration
      try {
        if (tasksKey) {
          await localStorageInstance.remove(tasksKey);
        }
      } catch {}
    } catch (e) {
      const msg = e instanceof Error ? e.message : '报名失败';
      setTips({ text: cleanErrorMessage(msg), type: 'fail' }); // Tips 显示完整错误信息
      setRegistrationError(cleanErrorMessage(msg)); // 界面错误显示清理版本号前缀
    } finally {
      setIsSubmitting(false);
    }
  }, [
    allRequiredTasksCompleted,
    userInviteCode,
    evmAddress,
    campaignConfig,
    refreshRegistration,
    tasksKey,
  ]);

  // 已报名时跳转到活动主链接
  const handleGoToActive = useCallback(() => {
    const url = campaignConfig.links.getActiveUrl();
    openNewTab(url || '#');
  }, [campaignConfig]);

  const redirectToLogin = useLockFn(async () => {
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
    }
  });

  // 清空报名错误
  const clearRegistrationError = useCallback(() => {
    setRegistrationError('');
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* theme-bg-secondary */}
      <div className='relative z-10'>
        {/* 活动标题区域 */}
        <ActivityHeader
          isRegisteredState={isRegisteredState}
          defaultExpanded={defaultExpanded}
          isExpandedManual={isExpandedManual}
          setIsExpandedManual={setIsExpandedManual}
          handleOpenGuide={handleOpenGuide}
          shortTitle={
            campaignConfig.copy?.shortTitleText
              ? campaignConfig.copy.shortTitleText
              : campaignConfig.copy?.shortTitleKey
              ? t(campaignConfig.copy.shortTitleKey)
              : campaignConfig.displayName
          }
          fullTitle={
            campaignConfig.copy?.activityTitleText
              ? campaignConfig.copy.activityTitleText
              : campaignConfig.copy?.activityTitleKey
              ? t(campaignConfig.copy.activityTitleKey)
              : campaignConfig.displayName
          }
          emoji={campaignConfig.copy?.emoji}
          logos={campaignConfig.logos}
          registeredDescription={campaignConfig.copy?.registeredDescription}
          unregisteredDescription={campaignConfig.copy?.unregisteredDescription}
          isContentVisible={isContentVisible}
        />

        {/* 内容区域 */}
        {isContentVisible &&
          (regLoading ? (
            <div className='flex items-center justify-center py-10'>
              <div className='w-6 h-6 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin' />
            </div>
          ) : isRegisteredState ? (
            /* 已注册状态 */
            <RegisteredContent
              inviteCodeState={inviteCodeState}
              invitedCountState={invitedCountState}
              hunterDataState={hunterDataState}
              evmAddress={evmAddress}
              showMantleHunterComponents={showExtraSections}
              activeUrl={campaignConfig.links.getActiveUrl()}
              handleCopyInviteCode={handleCopyInviteCode}
              handleOpenGuide={handleOpenGuide}
              campaignConfig={campaignConfig}
            />
          ) : (
            /* 未注册状态 */
            <UnregisteredContent
              tasks={tasks}
              evmAddress={evmAddress}
              userInviteCode={userInviteCode}
              isVerifyingWallet={isVerifyingWallet}
              isSubmitting={isSubmitting}
              allRequiredTasksCompleted={allRequiredTasksCompleted}
              isLoggedIn={isLoggedIn}
              isRegisteredState={isRegisteredState}
              registrationError={registrationError}
              setUserInviteCode={setUserInviteCode}
              setEvmAddress={setEvmAddress}
              // handleWalletVerification={handleWalletVerification}
              handleSubmitRegistration={handleSubmitRegistration}
              handleGoToActive={handleGoToActive}
              redirectToLogin={redirectToLogin}
              handleOpenGuide={handleOpenGuide}
              formatEvmAddress={formatEvmAddress}
              clearRegistrationError={clearRegistrationError}
              campaignConfig={campaignConfig}
            />
          ))}

        {/* Mantle Hunter Captain 组件 - 仅在Mantle官方账号页面显示 */}
        {showExtraSections && (
          <HunterCampaignCaptain
            totalRegistrations={totalRegistrations}
            campaignConfig={campaignConfig}
          />
        )}

        {/* 榜单组件 - 仅在Mantle官方账号页面显示 */}
        {showExtraSections && (
          <div className='mt-3'>
            <CampaignLeaderboard campaignConfig={campaignConfig} />
          </div>
        )}

        {/* 底部分隔线
        {showHotTrending && (
          <div className='h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent' />
        )} */}
      </div>
    </div>
  );
}

export default HunterCampaignBanner;
