import React, { useEffect, useRef, useState } from 'react';

import { useGlobalTips } from '~compontents/area/GlobalTips';
import {
  VipSubscribeButton,
  VipUpgradeActions,
} from '~compontents/VipUpgradeActions';
import { PortalTooltip } from '~compontents/PortalTooltip';
import { useI18n } from '~contents/hooks/i18n.ts';

const CheckIcon = () => (
  <svg
    className='h-3 w-3'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <path d='m20 6-11 11-5-5' />
  </svg>
);

const CopyIcon = () => (
  <svg
    className='h-3 w-3'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
    <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
  </svg>
);

export interface VipPanelProps {
  isVip: boolean;
  vipExpiresAt?: string;
  vipInviteCode?: string | null;
  vipInviteStats?: {
    total: number;
    within200k: number;
    outside200k: number;
  };
  isLegacyVip?: boolean;
  show?: boolean;
  className?: string;
  enableAnimation?: boolean;
  onInviteDialogOpenChange?: (isOpen: boolean) => void;
}

function _VipPanel({
  isVip,
  vipExpiresAt,
  vipInviteCode,
  vipInviteStats,
  isLegacyVip = false,
  show = true,
  className = '',
  enableAnimation = true,
  onInviteDialogOpenChange,
}: VipPanelProps) {
  const { t } = useI18n();
  const [, setTips] = useGlobalTips();
  const normalizedInviteCode = vipInviteCode?.trim();
  const normalizedInviteStats = vipInviteStats
    ? {
        total: Math.max(0, Number(vipInviteStats.total) || 0),
        within200k: Math.max(0, Number(vipInviteStats.within200k) || 0),
        outside200k: Math.max(0, Number(vipInviteStats.outside200k) || 0),
      }
    : null;
  const [isInviteCodeCopied, setIsInviteCodeCopied] = useState(false);
  const copiedResetTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setIsInviteCodeCopied(false);
  }, [normalizedInviteCode]);

  useEffect(
    () => () => {
      clearTimeout(copiedResetTimerRef.current);
    },
    [],
  );

  const copyInviteCode = async () => {
    if (!normalizedInviteCode) return;
    try {
      await navigator.clipboard.writeText(normalizedInviteCode);
      setIsInviteCodeCopied(true);
      clearTimeout(copiedResetTimerRef.current);
      copiedResetTimerRef.current = setTimeout(() => {
        setIsInviteCodeCopied(false);
      }, 2000);
    } catch {
      setTips({ text: t('copyFailed'), type: 'fail' });
    }
  };

  const inviteCodeRow = normalizedInviteCode ? (
    <div className='mt-2 flex min-w-0 items-center justify-between gap-2 border-t border-amber-200/70 pt-2 dark:border-amber-700/40'>
      <div className='flex min-w-0 items-center gap-1.5 text-[10px]'>
        <span className='shrink-0 font-medium text-amber-700/90 dark:text-amber-300/90'>
          {t('vipMyInviteCode')}
        </span>
        <span className='truncate font-mono font-semibold text-amber-800 dark:text-amber-200'>
          {normalizedInviteCode}
        </span>
      </div>
      <div className='flex shrink-0 items-center gap-1.5'>
        {normalizedInviteStats && (
          <PortalTooltip
            maxWidth={220}
            content={
              <div className='min-w-[150px] space-y-1'>
                <div className='flex items-center justify-between gap-4'>
                  <span>{t('vipInviteWithin200k')}</span>
                  <span className='font-semibold'>
                    {normalizedInviteStats.within200k.toLocaleString()}{' '}
                    {t('vipInvitePeopleUnit')}
                  </span>
                </div>
                <div className='flex items-center justify-between gap-4'>
                  <span>{t('vipInviteOutside200k')}</span>
                  <span className='font-semibold'>
                    {normalizedInviteStats.outside200k.toLocaleString()}{' '}
                    {t('vipInvitePeopleUnit')}
                  </span>
                </div>
                <div className='mt-1 flex items-center justify-between gap-4 border-t border-gray-200 pt-1 font-semibold dark:border-gray-600'>
                  <span>{t('vipInviteTotal')}</span>
                  <span>
                    {normalizedInviteStats.total.toLocaleString()}{' '}
                    {t('vipInvitePeopleUnit')}
                  </span>
                </div>
              </div>
            }
          >
            <span
              tabIndex={0}
              className='cursor-pointer whitespace-nowrap text-[10px] font-medium text-amber-700 underline decoration-amber-400/60 decoration-dotted underline-offset-2 dark:text-amber-300'
            >
              {t('vipInvitedCount')}{' '}
              {normalizedInviteStats.total.toLocaleString()}{' '}
              {t('vipInvitePeopleUnit')}
            </span>
          </PortalTooltip>
        )}
        <button
          type='button'
          onClick={() => void copyInviteCode()}
          className='flex shrink-0 items-center gap-1 rounded-md border border-amber-300/80 bg-amber-50/70 px-2 py-1 text-[10px] font-medium text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-100/80 dark:border-amber-600/60 dark:bg-amber-400/[0.08] dark:text-amber-300 dark:hover:border-amber-500 dark:hover:bg-amber-400/[0.14]'
        >
          {isInviteCodeCopied ? <CheckIcon /> : <CopyIcon />}
          {isInviteCodeCopied
            ? t('vipInviteCodeCopied')
            : t('vipCopyInviteCode')}
        </button>
      </div>
    </div>
  ) : null;

  const formatExpiryTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      if (Number.isNaN(date.getTime())) return timeStr;
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  if (!show) return null;

  return (
    <div
      className={`bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-all duration-300 ease-out dark:shadow-2xl ${className}`}
      style={{
        height: 'auto',
        ...(enableAnimation ? { animation: 'slideUp 0.3s ease-out' } : {}),
      }}
    >
      {enableAnimation && (
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      )}
      <div className='p-2.5 h-full overflow-y-auto'>
        {isVip ? (
          // VIP User Panel
          <div className='space-y-2.5'>
            <div className='relative overflow-hidden rounded-md p-2 bg-gradient-to-br from-amber-50/35 via-yellow-50/20 to-amber-50/35 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-amber-900/25 border border-amber-300/60 dark:border-amber-600/50 dark:shadow-lg dark:shadow-amber-900/10'>
              <div className='flex items-center justify-between gap-3'>
                <div className='relative min-w-0'>
                  <div className='flex items-center gap-1.5 mb-1'>
                    <span className='text-sm font-bold bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-300 bg-clip-text text-transparent'>
                      {t('vipMember')}
                    </span>
                    {isLegacyVip && isVip && (
                      <span className='px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 dark:from-amber-600/30 dark:via-yellow-500/30 dark:to-amber-600/30 border border-amber-400/40 dark:border-amber-500/50'>
                        <span className='bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-300 bg-clip-text text-transparent'>
                          {t('legacyVipUser')}
                        </span>
                      </span>
                    )}
                  </div>
                  {vipExpiresAt && (
                    <div className='text-[10px] flex items-center gap-1'>
                      <span className='text-amber-700/90 dark:text-amber-300/90 font-medium'>
                        {t('vipExpiryTime')}
                      </span>
                      <span className='font-semibold text-amber-800 dark:text-amber-200'>
                        {formatExpiryTime(vipExpiresAt)}
                      </span>
                    </div>
                  )}
                </div>
                <VipSubscribeButton
                  label={t('vipRenew')}
                  className='relative shrink-0 rounded-md border border-amber-400/60 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/20 dark:border-amber-500/50 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20'
                />
              </div>
              {inviteCodeRow}
            </div>
          </div>
        ) : (
          // Non-VIP User Panel
          <div className='space-y-2.5'>
            <div className='relative overflow-hidden rounded-md p-2 bg-gradient-to-br from-amber-50/35 via-yellow-50/20 to-amber-50/35 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-amber-900/25 border theme-border dark:shadow-lg dark:shadow-amber-900/10'>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-[11px] font-medium theme-text-secondary'>
                  {t('regularUser')}
                </span>
                <VipUpgradeActions
                  className='shrink-0'
                  onInviteDialogOpenChange={onInviteDialogOpenChange}
                />
              </div>
              {inviteCodeRow}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const VipPanel = React.memo(_VipPanel);
