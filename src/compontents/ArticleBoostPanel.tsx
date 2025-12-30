import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';
import { Info, Loader2, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import { sanitizeHtml } from '~/utils/sanitizeHtml';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { extractStatusIdFromUrl } from '~contents/utils';
import { useRequest } from 'ahooks';
import {
  examineE2ETweet,
  createE2ECampaign,
  activateE2ECampaign,
} from '~contents/services/api.ts';
import { useCrossPageSettings } from '~utils/settingsManager.ts';

export interface BoostPanelEventDetail {
  open: boolean;
  anchor?: HTMLElement;
  source?: 'button' | 'panel';
}

export const XHUNT_BOOST_PANEL_EVENT = 'xhunt-boost-panel';

const audienceOptions = [
  { label: 'none', value: 0 },
  { label: '100K', value: 100000 },
  { label: '200K', value: 200000 },
  { label: '50K', value: 50000 },
];

function ArticleBoostPanel() {
  const { t } = useI18n();
  const { isTesterFor } = useCrossPageSettings();
  const isBoostTester = isTesterFor('showArticleBottomRightArea');
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const targetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);

  const [budget, setBudget] = useState(300);
  const [duration, setDuration] = useState(1);
  const [audience, setAudience] = useState<number>(0);
  const [rewardCount, setRewardCount] = useState(20);
  const [rewardMode, setRewardMode] = useState<'mindshare' | 'equal'>(
    'mindshare'
  );
  const rewardModes = useMemo(
    () => [
      { value: 'mindshare' as const, labelKey: 'boostRewardModeMindshare' },
      { value: 'equal' as const, labelKey: 'boostRewardModeEqual' },
    ],
    []
  );

  // For testers: allow a special 0.01 minimum but keep other steps as 100, 200, ...
  const sliderBudgetValue = useMemo(
    () => (isBoostTester && budget < 100 ? 0 : budget),
    [isBoostTester, budget]
  );

  const activateCampaign = useRequest(
    async (payload: { address: string }) => {
      return await activateE2ECampaign(payload);
    },
    { manual: true }
  );

  const renderSuccessStep = () => (
    <div className='flex flex-col gap-4 items-center text-center py-4'>
      <CheckCircle2 className='w-10 h-10 text-green-500' />
      <div>
        <h3 className='text-xl font-semibold theme-text-primary'>
          {t('boostPaymentSuccessTitle')}
        </h3>
        <div className='mt-2 text-xs theme-text-secondary max-w-[420px]'>
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(t('boostPaymentSuccessDescHtml')),
            }}
          />
        </div>
      </div>
      <div className='flex justify-center gap-3 pt-1'>
        <button
          type='button'
          className='rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90'
          onClick={(e) => {
            e.stopPropagation();
            closePanel();
          }}
        >
          {t('boostPaymentSuccessCta')}
        </button>
      </div>
    </div>
  );
  const [showRequirementTooltip, setShowRequirementTooltip] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const currentUrl = useCurrentUrl();
  const articleId = useMemo(
    () => String(extractStatusIdFromUrl(currentUrl)).toLocaleLowerCase(),
    [currentUrl]
  );
  const [apiError, setApiError] = useState<string>('');
  const [depositAddress, setDepositAddress] = useState<string>('');
  const [ownerUserId, setOwnerUserId] = useState<string>('');
  const [depositRewards, setDepositRewards] = useState<number | undefined>(
    undefined
  );
  const [feePercentage, setFeePercentage] = useState<number | undefined>(
    undefined
  );
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const examineTweet = useRequest(
    async (params: { tweet_id: string }) => {
      return await examineE2ETweet(params);
    },
    { manual: true }
  );

  const createCampaign = useRequest(
    async (payload: {
      tweet_id: string;
      user_id: string;
      rewards: number;
      days: number;
      target: number;
      winners: number;
      type: 'mindshare' | 'equal';
    }) => {
      return await createE2ECampaign(payload);
    },
    { manual: true }
  );

  const resetPanel = useCallback(
    (preservePayment: boolean = false) => {
      const atPayment = preservePayment && step === 3 && !!depositAddress;
      setBudget(300);
      setDuration(1);
      setAudience(0);
      setRewardCount(20);
      setApiError('');
      if (!atPayment) {
        setDepositAddress('');
        setQrCodeDataUrl('');
        setDepositRewards(undefined);
        setFeePercentage(undefined);
        setShowPaymentDetails(false);
        setStep(1);
      } else {
        // keep step at 3 and existing QR (it will regenerate from depositAddress anyway)
        setStep(3);
      }
      setCopySuccess(false);
      setShowRequirementTooltip(false);
    },
    [step, depositAddress]
  );

  // Reset the panel whenever currentUrl changes (regardless of current step)
  useEffect(() => {
    setStep(1);
    requestIdleCallback(() => {
      resetPanel(false);
    });
  }, [currentUrl]);

  useEffect(() => {
    if (step !== 3) {
      setCopySuccess(false);
    }
  }, [step]);

  // 生成二维码
  useEffect(() => {
    const currentAddress = depositAddress || '';
    if (currentAddress) {
      // eip155:8453:
      const qrContent = `${currentAddress}`;
      QRCode.toDataURL(qrContent, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          setQrCodeDataUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate QR code:', err);
        });
    }
  }, [depositAddress]);

  const closePanel = useCallback(() => {
    containerRef.current?.hide();
    setIsOpen(false);
    resetPanel(true);
    window.dispatchEvent(
      new CustomEvent<BoostPanelEventDetail>(XHUNT_BOOST_PANEL_EVENT, {
        detail: { open: false, source: 'panel' },
      })
    );
  }, [resetPanel]);

  const handleClose = useCallback(() => {
    // FloatingContainer 已经隐藏了，只需要重置状态
    setIsOpen(false);
    resetPanel(true);
    window.dispatchEvent(
      new CustomEvent<BoostPanelEventDetail>(XHUNT_BOOST_PANEL_EVENT, {
        detail: { open: false, source: 'panel' },
      })
    );
  }, [resetPanel]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<BoostPanelEventDetail>;
      if (customEvent.detail.open) {
        setIsOpen(true);
        resetPanel(true);
        if (customEvent.detail.anchor) {
          targetRef.current = customEvent.detail.anchor;
        }
      } else if (customEvent.detail.source === 'button') {
        setIsOpen(false);
        resetPanel(true);
        containerRef.current?.hide();
      }
    };
    window.addEventListener(XHUNT_BOOST_PANEL_EVENT, handler);
    return () => window.removeEventListener(XHUNT_BOOST_PANEL_EVENT, handler);
  }, [resetPanel]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePanel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closePanel]);

  useEffect(() => {
    if (isOpen && targetRef.current) {
      containerRef.current?.show();
    } else {
      containerRef.current?.hide();
    }
  }, [isOpen]);
  const endAtLocalText = React.useMemo(() => {
    try {
      const now = new Date();
      const endUtc = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + Math.max(1, duration) - 1,
          23,
          59,
          59
        )
      );
      const fmt = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return fmt.format(endUtc);
    } catch {
      return '';
    }
  }, [duration]);
  if (!isOpen) return null;

  const renderFormStep = () => (
    <div className='flex flex-col gap-4'>
      <div>
        <h3 className='text-xl font-semibold theme-text-primary'>
          {t('xhuntBoost')}
        </h3>
        <p className='mt-2 text-xs theme-text-secondary'>
          {t('boostPanelSubtitle')}
        </p>
      </div>
      <label className='flex flex-col gap-2 text-xs theme-text-secondary'>
        {t('boostBudgetLabel')}: {budget} USDC
        <input
          type='range'
          min={isBoostTester ? 0 : 100}
          max={1000}
          step={100}
          value={isBoostTester ? sliderBudgetValue : budget}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (isBoostTester && v === 0) {
              setBudget(0.01);
            } else {
              setBudget(v);
            }
          }}
          className='w-full h-2'
        />
      </label>
      <label className='flex flex-col gap-2 text-xs theme-text-secondary'>
        {t('boostDurationLabel')}: {duration} {t('days')} (
        {t('boostEndTimeLabel')}: {endAtLocalText})
        <input
          type='range'
          min={1}
          max={3}
          step={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className='w-full h-2'
        />
      </label>
      <label className='flex flex-col gap-2 text-xs theme-text-secondary'>
        {t('boostRewardCountLabel')}: {rewardCount}
        <input
          type='range'
          min={10}
          max={50}
          step={5}
          value={rewardCount}
          onChange={(e) => setRewardCount(Number(e.target.value))}
          className='w-full h-2 accent-blue-500'
        />
      </label>
      <div className='flex flex-col gap-1 text-xs theme-text-secondary'>
        <div className='flex items-center gap-1 relative'>
          <span>{t('boostParticipationRequirement')}</span>
          <div
            className='relative'
            onMouseEnter={() => setShowRequirementTooltip(true)}
            onMouseLeave={() => setShowRequirementTooltip(false)}
          >
            <Info
              className='w-4 h-4 theme-text-secondary flex-shrink-0 cursor-help hover:theme-text-primary transition-colors'
              aria-label={t('boostParticipationRequirementTooltip')}
            />
          </div>
          {showRequirementTooltip && (
            <div className='absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 pointer-events-none max-w-[280px] leading-relaxed'>
              {t('boostParticipationRequirementTooltip')}
              <div className='absolute top-full left-4 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900'></div>
            </div>
          )}
        </div>
        <div className='flex gap-4 text-sm'>
          {audienceOptions.map((option) => {
            const active = audience === option.value;
            const labelText =
              option.value === 0
                ? t('boostRequirementNone')
                : `Top ${option.label}`;
            return (
              <label
                key={option.value}
                className='flex cursor-pointer items-center gap-2'
              >
                <input
                  type='radio'
                  className='h-3.5 w-3.5 accent-blue-500'
                  checked={active}
                  onChange={() => setAudience(option.value)}
                />
                <span
                  className={`text-xs ${
                    active
                      ? 'text-blue-500 font-medium'
                      : 'theme-text-secondary'
                  }`}
                >
                  {labelText}
                </span>
              </label>
            );
          })}
        </div>
      </div>
      <div className='flex flex-col gap-1 text-xs theme-text-secondary'>
        {t('boostRewardModeLabel')}
        <div className='flex gap-4 text-sm'>
          {rewardModes.map((mode) => {
            const active = rewardMode === mode.value;
            return (
              <label
                key={mode.value}
                className='flex cursor-pointer items-center gap-2'
              >
                <input
                  type='radio'
                  className='h-3.5 w-3.5 accent-blue-500'
                  checked={active}
                  onChange={() => setRewardMode(mode.value)}
                />
                <span
                  className={`text-xs ${
                    active
                      ? 'text-blue-500 font-medium'
                      : 'theme-text-secondary'
                  }`}
                >
                  {t(mode.labelKey)}
                </span>
              </label>
            );
          })}
        </div>
      </div>
      {apiError && <div className='text-xs text-red-500'>{apiError}</div>}
      <div className='flex justify-end gap-3 pt-2'>
        <button
          type='button'
          className='rounded-full border theme-border px-4 py-2 text-sm theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary/80'
          onClick={(e) => {
            e.stopPropagation();
            closePanel();
          }}
        >
          {t('cancel')}
        </button>
        <button
          type='button'
          className={`rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90 ${
            examineTweet.loading || createCampaign.loading
              ? 'opacity-70 cursor-not-allowed'
              : ''
          }`}
          disabled={examineTweet.loading || createCampaign.loading}
          onClick={async (e) => {
            e.stopPropagation();
            setApiError('');
            if (!articleId) {
              setApiError('Invalid tweet link.');
              return;
            }
            try {
              const examine = await examineTweet.runAsync({
                tweet_id: articleId,
              });
              if (!examine?.status) {
                setApiError(
                  String(examine?.message || 'This tweet cannot be promoted.')
                );
                return;
              }
              setOwnerUserId(
                String(examine?.data?.owner_user_id || 'FAKE_USER_ID_TODO')
              );
              setStep(2);
            } catch (err) {
              setApiError('Network error, please try again.');
            }
          }}
        >
          {t('boostNextStep')}
        </button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className='flex flex-col gap-3'>
      <div>
        <h3 className='text-xl font-semibold theme-text-primary'>
          {t('boostPaymentTitle')}
        </h3>
        <p className='mt-1 text-xs theme-text-secondary'>
          {t('boostPaymentDescription')}
        </p>
      </div>

      <div className='rounded-xl border theme-border theme-bg-tertiary/70 p-3 text-sm theme-text-primary flex flex-col gap-2.5'>
        <div className='rounded-lg border border-dashed theme-border px-3 py-2 text-xs flex items-center justify-between gap-3 font-mono'>
          <span className='truncate'>{depositAddress}</span>
          <button
            type='button'
            className='text-blue-400 text-[11px] uppercase tracking-wide hover:text-blue-300'
            onClick={(e) => {
              e.stopPropagation();
              const address = depositAddress || '';
              if (!address) return;
              navigator.clipboard.writeText(address).then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
              });
            }}
          >
            {copySuccess ? t('copied') : t('copy')}
          </button>
        </div>
        {qrCodeDataUrl && (
          <div className='flex flex-col items-center gap-1.5'>
            <div className='text-xs theme-text-secondary'>
              {t('boostPaymentQrCodeLabel')}
            </div>
            <div className='rounded-lg border theme-border p-2 bg-white shadow-sm'>
              <img
                src={qrCodeDataUrl}
                alt='Payment Address QR Code'
                className='w-32 h-32'
              />
            </div>
          </div>
        )}
      </div>
      <div className='rounded-xl border theme-border theme-bg-tertiary/70 p-3 text-xs leading-relaxed'>
        <div
          className='theme-text-secondary break-keep'
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (
              target &&
              (target.classList?.contains('xh-amount') ||
                target.closest('.xh-amount'))
            ) {
              e.stopPropagation();
              setShowPaymentDetails((v) => !v);
            }
          }}
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(
              t('boostPaymentInstructionFullHtml').replace(
                '{amount}',
                typeof depositRewards === 'number'
                  ? `${depositRewards} USDC`
                  : `${budget} USDC`
              )
            ),
          }}
        />
        {showPaymentDetails && (
          <div className='mt-2 rounded-xl border theme-border theme-bg-tertiary/50 p-3 text-xs theme-text-primary'>
            <div className='flex justify-between py-1'>
              <span>{t('boostBudgetLabel')}</span>
              <span>{budget} USDC</span>
            </div>
            {typeof depositRewards === 'number' && (
              <>
                <div className='flex justify-between py-1'>
                  <span>{t('boostTotalToPay')}</span>
                  <span className='font-medium'>{depositRewards} USDC</span>
                </div>
                <div className='flex justify-between py-1 theme-text-secondary'>
                  <span>{t('boostIncludesFee')}</span>
                  <span>
                    {Math.max(depositRewards - budget, 0)} USDC
                    {typeof feePercentage === 'number'
                      ? ` (${Math.round(feePercentage * 100)}%)`
                      : ''}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {apiError && <div className='text-xs text-red-500'>{apiError}</div>}
      <div className='flex justify-between gap-3 pt-1'>
        <button
          type='button'
          className='rounded-full border theme-border px-5 py-2 text-sm theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary/80'
          onClick={(e) => {
            e.stopPropagation();
            setStep(2);
          }}
        >
          {t('boostBack')}
        </button>
        <div className='flex gap-3'>
          <button
            type='button'
            className='rounded-full border theme-border px-5 py-2 text-sm theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary/80'
            onClick={(e) => {
              e.stopPropagation();
              closePanel();
            }}
          >
            {t('cancel')}
          </button>
          <button
            type='button'
            className={`rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90 ${
              activateCampaign.loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={activateCampaign.loading}
            onClick={async (e) => {
              e.stopPropagation();
              setApiError('');
              const address = depositAddress || '';
              if (!address) {
                setApiError('Missing deposit address.');
                return;
              }
              try {
                const ret = await activateCampaign.runAsync({ address });
                if (ret?.status) {
                  setStep(4);
                } else {
                  setApiError(String(ret?.message || 'Activation failed.'));
                }
              } catch (err) {
                setApiError('Network error, please try again.');
              }
            }}
          >
            {t('boostConfirmPaid')}
          </button>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className='flex flex-col gap-4'>
      <div>
        <h3 className='text-xl font-semibold theme-text-primary'>
          {t('boostReviewTitle')}
        </h3>
        <p className='mt-2 text-xs theme-text-secondary'>
          {t('boostReviewDescription')}
        </p>
      </div>
      <div className='rounded-xl border theme-border theme-bg-tertiary/70 p-4 text-sm theme-text-primary'>
        <div className='flex justify-between py-1 text-xs'>
          <span>{t('boostBudgetLabel')}</span>
          <span>{budget} USDC</span>
        </div>
        <div className='flex justify-between py-1 text-xs'>
          <span>{t('boostDurationLabel')}</span>
          <span>
            {duration} {t('days')} ({t('boostEndTimeLabel')}: {endAtLocalText})
          </span>
        </div>
        <div className='flex justify-between py-1 text-xs'>
          <span>{t('boostParticipationRequirement')}</span>
          <span>
            {audience === 0
              ? t('boostRequirementNone')
              : `XHunt ${t('rank')} Top ${
                  audienceOptions.find((o) => o.value === audience)?.label ||
                  audience
                }`}
          </span>
        </div>
        <div className='flex justify-between py-1 text-xs'>
          <span>{t('boostRewardCountLabel')}</span>
          <span>{rewardCount}</span>
        </div>
        <div className='flex justify-between py-1 text-xs'>
          <span>{t('boostRewardModeLabel')}</span>
          <span>
            {rewardMode === 'mindshare'
              ? t('boostRewardModeMindshare')
              : t('boostRewardModeEqual')}
          </span>
        </div>
      </div>
      <div className='rounded-xl border theme-border theme-bg-tertiary/70 p-4 text-sm theme-text-primary'>
        <p className='leading-relaxed text-xs theme-text-secondary'>
          {t('boostPaymentCallout')}
        </p>
      </div>
      {apiError && <div className='text-xs text-red-500'>{apiError}</div>}
      <div className='flex justify-between gap-3 pt-2'>
        <button
          type='button'
          className='rounded-full border theme-border px-5 py-2 text-sm theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary/80'
          onClick={(e) => {
            e.stopPropagation();
            setStep(1);
          }}
        >
          {t('boostBack')}
        </button>
        <div className='flex gap-3'>
          <button
            type='button'
            className='rounded-full border theme-border px-5 py-2 text-sm theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary/80'
            onClick={(e) => {
              e.stopPropagation();
              closePanel();
            }}
          >
            {t('cancel')}
          </button>
          <button
            type='button'
            className='rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed'
            disabled={createCampaign.loading}
            onClick={async (e) => {
              e.stopPropagation();
              setApiError('');
              if (!ownerUserId) {
                return;
              }
              try {
                const payload = {
                  tweet_id: articleId,
                  user_id: String(ownerUserId),
                  rewards: budget,
                  days: duration,
                  target: audience,
                  winners: rewardCount,
                  type: rewardMode,
                };
                const created = await createCampaign.runAsync(payload);
                if (created?.status) {
                  const addr = String(created?.address || '');
                  setDepositAddress(addr);
                  setDepositRewards(
                    typeof created?.deposit_rewards === 'number'
                      ? created.deposit_rewards
                      : undefined
                  );
                  setFeePercentage(
                    typeof created?.fee_percentage === 'number'
                      ? created.fee_percentage
                      : undefined
                  );
                  setStep(3);
                } else {
                  setApiError(
                    String(created?.message || 'Failed to create campaign.')
                  );
                }
              } catch (err) {
                setApiError('Network error, please try again.');
              }
            }}
          >
            {t('boostProceedToPayment')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <FloatingContainer
      ref={containerRef}
      targetRef={targetRef}
      offsetX={-330}
      offsetY={-210}
      maxWidth='520px'
      maxHeight='620px'
      className='z-[1200]'
      onClose={handleClose}
    >
      <div className='w-[520px] rounded-[22px] border-2 border-transparent bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-pink-500/25 p-[2px] shadow-[0_16px_40px_rgba(15,23,42,0.35)]'>
        <div className='rounded-[20px] border theme-border theme-bg-secondary p-5 relative'>
          {step === 1
            ? renderFormStep()
            : step === 2
            ? renderReviewStep()
            : step === 3
            ? renderPaymentStep()
            : renderSuccessStep()}
          {/* help footer */}
          {step !== 4 && (
            <div className='sticky bottom-0 mt-4 pt-2 border-t theme-border text-[11px] theme-text-secondary text-end'>
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(t('boostPaymentInstructionSimple')),
                }}
              />
            </div>
          )}
          {(examineTweet.loading ||
            createCampaign.loading ||
            activateCampaign.loading) && (
            <div className='absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[20px] bg-black/30 backdrop-blur-[1px]'>
              <Loader2 className='w-5 h-5 text-blue-400 animate-spin mb-2' />
              <p className='text-xs text-white/90'>{t('loading')}</p>
            </div>
          )}
        </div>
      </div>
    </FloatingContainer>
  );
}

export default ArticleBoostPanel;
