import React from 'react';
import { Check, X, Trash2, UserCog, Rss, User, Users } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';

export interface ProPanelProps {
  isPro: boolean;
  proExpiryTime?: string;
  isLegacyPro?: boolean;
  inviteCode?: string;
  setInviteCode?: (value: string) => void;
  isSubmittingInvite?: boolean;
  onInviteCodeSubmit?: () => void;
  show?: boolean;
  className?: string;
  enableAnimation?: boolean;
  showExtraTitle?: boolean | string;
  showBenefits?: boolean;
}

const proBenefits = [
  {
    key: 'deleteTweets',
    titleKey: 'proBenefitDeleteTweetsTitle',
    icon: Trash2,
    color: 'text-red-500 dark:text-red-400',
  },
  {
    key: 'deleteAccount',
    titleKey: 'proBenefitDeleteAccountTitle',
    icon: UserCog,
    color: 'text-blue-500 dark:text-blue-400',
  },
  {
    key: 'realtimeFeeds',
    titleKey: 'proBenefitRealtimeFeedsTitle',
    icon: Rss,
    color: 'text-purple-500 dark:text-purple-400',
  },
  {
    key: 'profileChanges',
    titleKey: 'proBenefitProfileChangesTitle',
    icon: User,
    color: 'text-green-500 dark:text-green-400',
  },
  {
    key: 'recentFollows',
    titleKey: 'proBenefitRecentFollowsTitle',
    icon: Users,
    color: 'text-orange-500 dark:text-orange-400',
  },
];

function _ProPanel({
  isPro,
  proExpiryTime,
  isLegacyPro = false,
  inviteCode = '',
  setInviteCode,
  isSubmittingInvite = false,
  onInviteCodeSubmit,
  show = true,
  className = '',
  enableAnimation = true,
  showExtraTitle = false,
  showBenefits = false,
}: ProPanelProps) {
  const { t } = useI18n();

  const formatExpiryTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString('zh-CN', {
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
        ...(showExtraTitle ? { border: 'none' } : {}),
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
        {isPro ? (
          // Pro User Panel
          <div className='space-y-2.5'>
            <div className='relative overflow-hidden rounded-md p-2 bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-amber-50/90 dark:from-amber-950/60 dark:via-yellow-950/40 dark:to-amber-900/50 border border-amber-300/60 dark:border-amber-600/50 dark:shadow-lg dark:shadow-amber-900/20'>
              <div className='relative'>
                <div className='flex items-center gap-1.5 mb-1'>
                  <span className='text-sm font-bold bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-300 bg-clip-text text-transparent'>
                    {t('proMember')}
                  </span>
                  {isLegacyPro && isPro && (
                    <span className='px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 dark:from-amber-600/30 dark:via-yellow-500/30 dark:to-amber-600/30 border border-amber-400/40 dark:border-amber-500/50'>
                      <span className='bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 dark:from-amber-300 dark:via-yellow-200 dark:to-amber-300 bg-clip-text text-transparent'>
                        {t('legacyProUser')}
                      </span>
                    </span>
                  )}
                </div>
                {proExpiryTime && (
                  <div className='text-[10px] flex items-center gap-1'>
                    <span className='text-amber-700/90 dark:text-amber-300/90 font-medium'>
                      {t('proExpiryTime')}
                    </span>
                    <span className='font-semibold text-amber-800 dark:text-amber-200'>
                      {formatExpiryTime(proExpiryTime)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {showBenefits && (
              <div className='space-y-2'>
                <div className='text-[11px] font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5'>
                  <div className='w-0.5 h-3 bg-gradient-to-b from-amber-500 to-yellow-500 dark:from-amber-400 dark:to-yellow-300 rounded-full' />
                  {t('proBenefits')}
                </div>
                <div className='space-y-1'>
                  {proBenefits.map((benefit) => {
                    const IconComponent = benefit.icon;
                    return (
                      <div
                        key={benefit.key}
                        className='group flex items-center gap-2 px-2 py-1.5 rounded-md bg-gradient-to-r from-amber-50/80 to-yellow-50/60 dark:from-amber-950/50 dark:to-yellow-950/30 border border-amber-200/50 dark:border-amber-700/40 hover:border-amber-300/70 dark:hover:border-amber-600/60 transition-all'
                      >
                        <div className='flex-shrink-0 w-5 h-5 rounded-md bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/30 flex items-center justify-center border border-amber-200/60 dark:border-amber-700/50'>
                          <IconComponent
                            className={`w-3 h-3 ${benefit.color}`}
                            strokeWidth={2}
                          />
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='text-[11px] font-semibold text-gray-900 dark:text-gray-100 leading-tight'>
                            {t(benefit.titleKey)}
                          </div>
                        </div>
                        <div className='flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 dark:from-amber-400 dark:to-yellow-300 flex items-center justify-center shadow-sm'>
                          <Check
                            className='w-2.5 h-2.5 text-amber-900 dark:text-white'
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Non-Pro User Panel
          <div className='space-y-2.5'>
            {/* 额外标题 */}
            {showExtraTitle && (
              <div className='text-center pb-2 mb-2'>
                <div className='text-[12px] font-medium text-gray-700 dark:text-gray-300 leading-relaxed'>
                  {typeof showExtraTitle === 'string'
                    ? showExtraTitle
                    : t('proRequiredTitle')}
                </div>
              </div>
            )}
            <div className='text-center pb-2 border-b border-gray-200 dark:border-gray-700 relative'>
              {/* 黑金色装饰背景 */}
              <div className='absolute inset-0 pointer-events-none overflow-hidden rounded-t-lg'>
                {/* 顶部金色光晕 */}
                <div className='absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 bg-gradient-to-b from-amber-600/20 via-yellow-500/12 to-transparent dark:from-amber-500/15 dark:via-yellow-400/10 blur-lg' />
                {/* 左右两侧金色装饰线 */}
                <div className='absolute top-0 left-0 w-20 h-px bg-gradient-to-r from-amber-600/60 via-yellow-500/40 to-transparent dark:from-amber-500/50 dark:via-yellow-400/35' />
                <div className='absolute top-0 right-0 w-20 h-px bg-gradient-to-l from-amber-600/60 via-yellow-500/40 to-transparent dark:from-amber-500/50 dark:via-yellow-400/35' />
                {/* 顶部装饰点 */}
                <div className='absolute top-1 left-1/4 w-0.5 h-0.5 rounded-full bg-amber-500/60 dark:bg-amber-400/50' />
                <div className='absolute top-1 right-1/4 w-0.5 h-0.5 rounded-full bg-amber-500/60 dark:bg-amber-400/50' />
              </div>
              <div className='relative z-10'>
                <div className='text-sm font-bold mb-1 relative inline-block'>
                  {/* 黑金色渐变文字 - 更深的金色 */}
                  <span className='bg-gradient-to-r from-gray-900 via-amber-700 to-gray-900 dark:from-gray-50 dark:via-amber-300 dark:to-gray-50 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(217,119,6,0.3)]'>
                    {t('proUpgrade')}
                  </span>
                  {/* 文字下方的金色装饰线 */}
                  <div className='absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-600/70 to-transparent dark:via-amber-500/60' />
                </div>
                <div className='text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed px-1'>
                  {t('proBenefitDescription')}
                </div>
              </div>
            </div>

            {showBenefits && (
              <div className='space-y-2'>
                <div className='text-[11px] font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5'>
                  <div className='w-0.5 h-3 bg-gray-400 dark:bg-gray-600 rounded-full' />
                  {t('proBenefits')}
                </div>
                <div className='space-y-1'>
                  {proBenefits.map((benefit) => {
                    const IconComponent = benefit.icon;
                    return (
                      <div
                        key={benefit.key}
                        className='group flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50/60 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300/70 dark:hover:border-gray-600/70 transition-all'
                      >
                        <div className='flex-shrink-0 w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800/70 flex items-center justify-center border border-gray-200 dark:border-gray-700/60'>
                          <IconComponent
                            className={`w-3 h-3 ${benefit.color} opacity-50`}
                            strokeWidth={2}
                          />
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='text-[11px] font-semibold text-gray-900 dark:text-gray-100 leading-tight'>
                            {t(benefit.titleKey)}
                          </div>
                        </div>
                        {isPro && (
                          <div className='flex-shrink-0 w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center'>
                            <X
                              className='w-2.5 h-2.5 text-gray-500 dark:text-gray-400'
                              strokeWidth={3}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 开通方式 */}
            {setInviteCode && onInviteCodeSubmit && (
              <div className='space-y-2 pt-1 border-t border-gray-200 dark:border-gray-700'>
                {/* 邀请码开通 */}
                <div className='space-y-1.5'>
                  {/* <div className='text-[10px] font-medium text-gray-700 dark:text-gray-300'>
                    {t('proUpgradeByInvite')}
                  </div> */}
                  <div className='flex gap-1.5'>
                    <input
                      type='text'
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder={t('proInviteCodePlaceholder')}
                      className='flex-1 px-2 py-1.5 text-[11px] rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:focus:ring-amber-400/50 focus:border-amber-500 dark:focus:border-amber-400 transition-all'
                      disabled={isSubmittingInvite}
                    />
                    <button
                      onClick={onInviteCodeSubmit}
                      disabled={!inviteCode.trim() || isSubmittingInvite}
                      className='px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 dark:from-amber-600 dark:via-yellow-500 dark:to-amber-600 text-amber-900 dark:text-amber-100 font-semibold text-[11px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm border border-amber-300/50 dark:border-amber-500/40 whitespace-nowrap'
                    >
                      {isSubmittingInvite
                        ? t('proInviteCodeSubmitting')
                        : t('proInviteCodeSubmit')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const ProPanel = React.memo(_ProPanel);
