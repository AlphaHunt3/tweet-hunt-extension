import React, { useEffect, useRef, useState } from 'react';
import { useLockFn } from 'ahooks';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import cssText from 'data-text:~/css/style.css';

import { useGlobalTips } from '~compontents/area/GlobalTips';
import { useI18n } from '~contents/hooks/i18n';
import { useGlobalMutationObserver } from '~contents/hooks/useGlobalMutationObserver';
import {
  getTwitterAuthUrl,
  redeemVipInviteCode,
} from '~contents/services/api';
import { updateUserInfo } from '~contents/services/review';
import { openNewTab } from '~contents/utils';
import { useLocalStorage } from '~storage/useLocalStorage';
import type { StoredUserInfo } from '~types/review';
import { cleanErrorMessage } from '~utils/dataValidation';
import { configManager } from '~utils/configManager';
import { acquireOverlayInteractionLock } from '~utils/overlayInteractionLock';
import { useCrossPageSettings } from '~utils/settingsManager';

interface VipUpgradeActionsProps {
  className?: string;
  showInvite?: boolean;
  showSubscribe?: boolean;
  onInviteDialogOpenChange?: (isOpen: boolean) => void;
}

const VIP_INVITE_SHADOW_HOST_ID = 'xhunt-vip-invite-shadow-host';
const VIP_INVITE_PORTAL_HOST_ID = 'xhunt-vip-invite-portal-host';
const VIP_INVITE_CODE_MIN_LENGTH = 4;
const VIP_INVITE_CODE_MAX_LENGTH = 20;

const placeVipInviteHost = (shadowHost: HTMLElement) => {
  shadowHost.style.zIndex = '2147483647';
  if (document.body?.parentNode) {
    // 新版 X 可能清理追加在 body 后面的 html 直属节点。放到 body 前，并由
    // overlayInteractionLock 临时降低 Hover 层级，既稳定又能保证模态框置顶。
    if (shadowHost.nextElementSibling !== document.body) {
      document.body.parentNode.insertBefore(shadowHost, document.body);
    }
    return;
  }
  if (!shadowHost.isConnected) document.documentElement.appendChild(shadowHost);
};

const getOrCreateVipInvitePortalHost = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;

  let shadowHost = document.getElementById(
    VIP_INVITE_SHADOW_HOST_ID,
  ) as HTMLElement | null;
  if (!shadowHost) {
    shadowHost = document.createElement('div');
    shadowHost.id = VIP_INVITE_SHADOW_HOST_ID;
    shadowHost.style.cssText =
      'position:fixed;inset:0;width:0;height:0;z-index:2147483647;pointer-events:none;overflow:visible;';
    shadowHost.setAttribute('translate', 'no');
    shadowHost.classList.add('notranslate');
    placeVipInviteHost(shadowHost);

    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = cssText;
    shadowRoot.appendChild(style);

    const portalHost = document.createElement('div');
    portalHost.id = VIP_INVITE_PORTAL_HOST_ID;
    portalHost.style.cssText =
      'position:fixed;inset:0;pointer-events:none;overflow:visible;';
    portalHost.setAttribute('translate', 'no');
    portalHost.classList.add('notranslate');
    shadowRoot.appendChild(portalHost);
    return portalHost;
  }

  placeVipInviteHost(shadowHost);
  const shadowRoot = shadowHost.shadowRoot;
  if (!shadowRoot) {
    shadowHost.remove();
    return getOrCreateVipInvitePortalHost();
  }

  let portalHost = shadowRoot.getElementById(
    VIP_INVITE_PORTAL_HOST_ID,
  ) as HTMLElement | null;
  if (!portalHost) {
    portalHost = document.createElement('div');
    portalHost.id = VIP_INVITE_PORTAL_HOST_ID;
    portalHost.style.cssText =
      'position:fixed;inset:0;pointer-events:none;overflow:visible;';
    portalHost.setAttribute('translate', 'no');
    portalHost.classList.add('notranslate');
    shadowRoot.appendChild(portalHost);
  }
  return portalHost;
};

const useVipInvitePortalHost = (isOpen: boolean) => {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) setPortalHost(getOrCreateVipInvitePortalHost());
  }, [isOpen]);

  // 仅关注 html 直属子节点的移除。恢复时新增的宿主已 connected，过滤条件会
  // 立即失效，因此不会因自身写 DOM 形成 MutationObserver 反馈循环。
  useGlobalMutationObserver(
    () => {
      if (!isOpen || portalHost?.isConnected) return;
      setPortalHost(getOrCreateVipInvitePortalHost());
    },
    { childList: true, subtree: false },
    {
      filter: (mutation) =>
        isOpen &&
        mutation.target === document.documentElement &&
        !portalHost?.isConnected,
    },
    [isOpen, portalHost],
  );

  return portalHost;
};

const useVipSubscribeUrl = () => {
  const [subscribeUrl, setSubscribeUrl] = useState(() =>
    configManager.getVipSubscribeUrl(),
  );

  useEffect(
    () =>
      configManager.subscribe(() => {
        setSubscribeUrl(configManager.getVipSubscribeUrl());
      }),
    [],
  );

  return subscribeUrl;
};

const toStoredUserInfo = (info: Awaited<ReturnType<typeof updateUserInfo>>) => {
  if (!info) return;
  return {
    avatar: info.avatar,
    displayName: info.displayName,
    username: info.username,
    id: info.twitterId,
    twitterId: info.twitterId,
    xPoints: info.xPoints,
    evmAddresses: info.evmAddresses,
    isPro: info.isPro,
    proExpiryTime: info.proExpiryTime,
    isLegacyPro: info.isLegacyPro,
    isVip: info.isVip,
    vipExpiresAt: info.vipExpiresAt,
    vipInviteCode: info.vipInviteCode,
    vipInviteRedemption: info.vipInviteRedemption,
  } satisfies StoredUserInfo;
};

export function VipSubscribeButton({
  className = '',
  label,
}: {
  className?: string;
  label?: string;
}) {
  const { t } = useI18n();
  const subscribeUrl = useVipSubscribeUrl();
  if (!subscribeUrl) return null;

  return (
    <button
      type='button'
      onClick={() => openNewTab(subscribeUrl)}
      className={className}
    >
      {label || t('vipSubscribe')}
    </button>
  );
}

export function VipUpgradeActions({
  className = '',
  showInvite = true,
  showSubscribe = true,
  onInviteDialogOpenChange,
}: VipUpgradeActionsProps) {
  const { t } = useI18n();
  const [, setTips] = useGlobalTips();
  const vipSubscribeUrl = useVipSubscribeUrl();
  const [theme] = useLocalStorage<'light' | 'dark'>('@xhunt/theme', 'dark');
  const [user, setUser, { isLoading: isUserLoading }] = useLocalStorage<
    StoredUserInfo | null | ''
  >('@xhunt/user', null);
  const [, setUserInfoCacheBust] = useLocalStorage<number>(
    '@xhunt/userInfoCacheBust',
    Date.now(),
  );
  const { refreshFeatureAccess } = useCrossPageSettings();
  const [inviteCode, setInviteCode] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const releaseInteractionLockRef = useRef<(() => void) | null>(null);
  const onInviteDialogOpenChangeRef = useRef(onInviteDialogOpenChange);

  useEffect(() => {
    onInviteDialogOpenChangeRef.current = onInviteDialogOpenChange;
  }, [onInviteDialogOpenChange]);

  const userObject = user && typeof user === 'object' ? user : null;
  const isLoggedIn = Boolean(userObject?.username);
  const canRedeem =
    showInvite && userObject?.vipInviteRedemption?.canRedeem === true;
  const showInviteAction =
    showInvite && !isUserLoading && (!isLoggedIn || canRedeem);
  const subscribeUrl = showSubscribe ? vipSubscribeUrl : null;
  const invitePortalHost = useVipInvitePortalHost(isInviteDialogOpen);

  const releaseInteractionLock = () => {
    releaseInteractionLockRef.current?.();
    releaseInteractionLockRef.current = null;
  };

  const finishInviteDialog = () => {
    setIsInviteDialogOpen(false);
    releaseInteractionLock();
    onInviteDialogOpenChangeRef.current?.(false);
  };

  const openInviteDialog = () => {
    setFeedback(null);
    if (!releaseInteractionLockRef.current) {
      releaseInteractionLockRef.current = acquireOverlayInteractionLock();
    }
    onInviteDialogOpenChangeRef.current?.(true);
    setIsInviteDialogOpen(true);
  };

  const handleInviteAction = useLockFn(async () => {
    if (!isLoggedIn) {
      const auth = await getTwitterAuthUrl();
      if (auth?.url) openNewTab(auth.url);
      return;
    }
    openInviteDialog();
  });

  const closeInviteDialog = () => {
    if (isSubmitting) return;
    finishInviteDialog();
    setInviteCode('');
    setFeedback(null);
  };

  useEffect(() => {
    return () => {
      releaseInteractionLock();
      onInviteDialogOpenChangeRef.current?.(false);
    };
  }, []);

  const submitInviteCode = useLockFn(async () => {
    const code = inviteCode.trim();
    if (
      code.length < VIP_INVITE_CODE_MIN_LENGTH ||
      code.length > VIP_INVITE_CODE_MAX_LENGTH
    ) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await redeemVipInviteCode(code);
      if (!result?.isVip) throw new Error(t('vipRedeemFailed'));

      if (userObject) {
        await setUser({
          ...userObject,
          isVip: true,
          vipExpiresAt: result.vipExpiresAt,
          vipInviteRedemption: {
            canRedeem: false,
            status: 'already_redeemed',
            redeemedAt: new Date().toISOString(),
          },
        });
      }

      const cacheBust = Date.now();
      await setUserInfoCacheBust(cacheBust);
      const [info] = await Promise.all([
        updateUserInfo(cacheBust),
        refreshFeatureAccess(cacheBust),
      ]);
      const storedInfo = toStoredUserInfo(info);
      if (storedInfo) await setUser(storedInfo);

      setInviteCode('');
      setTips({ text: t('vipRedeemSuccess'), type: 'suc' });
      finishInviteDialog();
    } catch (error: any) {
      const message =
        error?.errorDetails?.message ||
        error?.originalResponse?.message ||
        error?.message ||
        t('vipRedeemFailed');
      setFeedback({
        type: 'error',
        text: cleanErrorMessage(String(message)),
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  if (
    !showInviteAction &&
    !subscribeUrl &&
    !feedback &&
    !isInviteDialogOpen
  ) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {(showInviteAction || subscribeUrl) && (
        <div className='flex flex-wrap items-center justify-center gap-2'>
          {showInviteAction && (
            <button
              type='button'
              onClick={() => void handleInviteAction()}
              className='flex items-center justify-center whitespace-nowrap rounded-md border border-amber-300/80 bg-amber-50/70 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100/80 dark:border-amber-600/60 dark:bg-amber-400/[0.08] dark:text-amber-300 dark:hover:border-amber-500 dark:hover:bg-amber-400/[0.14]'
            >
              {t('vipBindInviteCode')}
            </button>
          )}

          {subscribeUrl && (
            <button
              type='button'
              onClick={() => openNewTab(subscribeUrl)}
              className='flex items-center justify-center whitespace-nowrap rounded-md bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90'
            >
              {t('vipSubscribe')}
            </button>
          )}
        </div>
      )}

      {feedback?.type === 'success' && (
        <div
          className='rounded-md bg-green-500/10 px-2 py-1.5 text-[10px] leading-relaxed text-green-700 dark:text-green-300'
        >
          {feedback.text}
        </div>
      )}

      {isInviteDialogOpen &&
        invitePortalHost &&
        createPortal(
          <div
            data-theme={theme}
            role='dialog'
            aria-modal='true'
            aria-labelledby='xhunt-vip-invite-dialog-title'
            className='fixed inset-0 z-[2147483647] flex items-center justify-center p-4 pointer-events-auto'
          >
            <div
              className='absolute inset-0 bg-black/55 backdrop-blur-[2px]'
              onClick={closeInviteDialog}
            />
            <form
              className='relative z-10 w-full max-w-[360px] rounded-xl border theme-border theme-bg-secondary p-4 shadow-2xl'
              onSubmit={(event) => {
                event.preventDefault();
                void submitInviteCode();
              }}
            >
              <div className='flex items-center justify-between gap-3'>
                <h2
                  id='xhunt-vip-invite-dialog-title'
                  className='text-sm font-semibold theme-text-primary'
                >
                  {t('vipBindInviteCode')}
                </h2>
                <button
                  type='button'
                  onClick={closeInviteDialog}
                  disabled={isSubmitting}
                  aria-label={t('close')}
                  className='rounded-md p-1 theme-text-secondary transition-colors theme-hover disabled:opacity-50'
                >
                  <X className='h-4 w-4' />
                </button>
              </div>

              <input
                autoFocus
                type='text'
                minLength={VIP_INVITE_CODE_MIN_LENGTH}
                maxLength={VIP_INVITE_CODE_MAX_LENGTH}
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder={t('vipInviteCodePlaceholder')}
                disabled={isSubmitting}
                className='mt-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-amber-400'
              />

              {feedback?.type === 'error' && (
                <div className='mt-2 rounded-md bg-red-500/10 px-2.5 py-2 text-xs leading-relaxed text-red-700 dark:text-red-300'>
                  {feedback.text}
                </div>
              )}

              <div className='mt-4 flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={closeInviteDialog}
                  disabled={isSubmitting}
                  className='rounded-md border theme-border px-3 py-1.5 text-xs font-medium theme-text-primary transition-colors theme-hover disabled:opacity-50'
                >
                  {t('cancel')}
                </button>
                <button
                  type='submit'
                  disabled={
                    inviteCode.trim().length < VIP_INVITE_CODE_MIN_LENGTH ||
                    isSubmitting
                  }
                  className='rounded-md bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {isSubmitting
                    ? t('vipInviteCodeSubmitting')
                    : t('vipInviteCodeSubmit')}
                </button>
              </div>
            </form>
          </div>,
          invitePortalHost,
        )}
    </div>
  );
}
