import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';
import { Info } from 'lucide-react';
import QRCode from 'qrcode';
import { sanitizeHtml } from '~/utils/sanitizeHtml';

export interface BoostPanelEventDetail {
  open: boolean;
  anchor?: HTMLElement;
  source?: 'button' | 'panel';
}

export const XHUNT_BOOST_PANEL_EVENT = 'xhunt-boost-panel';

const budgets = Array.from({ length: 10 }, (_, index) => (index + 1) * 100);
const rewardModes: Array<{ value: 'mindshare' | 'equal'; labelKey: string }> = [
  { value: 'mindshare', labelKey: 'boostRewardModeMindshare' },
  { value: 'equal', labelKey: 'boostRewardModeEqual' },
];
type PaymentChain = 'bsc' | 'arbitrum';

const audienceOptions = [
  { label: 'none', value: 'none' },
  { label: '100K', value: '100k' },
  { label: '200K', value: '200k' },
  { label: '50K', value: '50k' },
];

const paymentChains: Array<{
  value: PaymentChain;
  labelKey: string;
  address: string;
}> = [
  {
    value: 'bsc',
    labelKey: 'boostChainBsc',
    address: '0x3BC3f0E1B4c3a89dE0B5C8c31B62f41a9CbB66b5',
  },
  {
    value: 'arbitrum',
    labelKey: 'boostChainArb',
    address: '0x7Fa2eF7306C2e6155c6f948203F0C8b04F9d5Bc4',
  },
];

function ArticleBoostPanel() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const targetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);

  const [budget, setBudget] = useState(300);
  const [duration, setDuration] = useState(1);
  const [audience, setAudience] = useState('none');
  const [rewardCount, setRewardCount] = useState(20);
  const [rewardMode, setRewardMode] = useState<'mindshare' | 'equal'>(
    'mindshare'
  );
  const [showRequirementTooltip, setShowRequirementTooltip] = useState(false);
  const [chain, setChain] = useState<PaymentChain>('bsc');
  const [copySuccess, setCopySuccess] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (step !== 3) {
      setCopySuccess(false);
    }
  }, [step]);

  // 生成二维码
  useEffect(() => {
    const currentAddress =
      paymentChains.find((item) => item.value === chain)?.address || '';
    if (currentAddress) {
      QRCode.toDataURL(currentAddress, {
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
  }, [chain]);

  const closePanel = useCallback(() => {
    containerRef.current?.hide();
    setIsOpen(false);
    setStep(1);
    window.dispatchEvent(
      new CustomEvent<BoostPanelEventDetail>(XHUNT_BOOST_PANEL_EVENT, {
        detail: { open: false, source: 'panel' },
      })
    );
  }, []);

  const handleClose = useCallback(() => {
    // FloatingContainer 已经隐藏了，只需要重置状态
    setIsOpen(false);
    setStep(1);
    window.dispatchEvent(
      new CustomEvent<BoostPanelEventDetail>(XHUNT_BOOST_PANEL_EVENT, {
        detail: { open: false, source: 'panel' },
      })
    );
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<BoostPanelEventDetail>;
      if (customEvent.detail.open) {
        setIsOpen(true);
        setStep(1);
        if (customEvent.detail.anchor) {
          targetRef.current = customEvent.detail.anchor;
        }
      } else if (customEvent.detail.source === 'button') {
        setIsOpen(false);
        setStep(1);
        containerRef.current?.hide();
      }
    };
    window.addEventListener(XHUNT_BOOST_PANEL_EVENT, handler);
    return () => window.removeEventListener(XHUNT_BOOST_PANEL_EVENT, handler);
  }, []);

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
          min={100}
          max={1000}
          step={100}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className='w-full h-2'
        />
      </label>
      <label className='flex flex-col gap-2 text-xs theme-text-secondary'>
        {t('boostDurationLabel')}: {duration} {t('days')}
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
              option.value === 'none'
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
          className='rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90'
          onClick={(e) => {
            e.stopPropagation();
            setStep(2);
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
        <div className='flex gap-3 text-xs'>
          {paymentChains.map((item) => {
            const active = chain === item.value;
            return (
              <label
                key={item.value}
                className='flex cursor-pointer items-center gap-2 theme-text-secondary'
              >
                <input
                  type='radio'
                  className='h-3.5 w-3.5 accent-blue-500'
                  checked={active}
                  onChange={() => setChain(item.value)}
                />
                <span
                  className={`text-xs ${
                    active
                      ? 'text-blue-500 font-medium'
                      : 'theme-text-secondary'
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </label>
            );
          })}
        </div>
        <div className='rounded-lg border border-dashed theme-border px-3 py-2 text-xs flex items-center justify-between gap-3 font-mono'>
          <span className='truncate'>
            {paymentChains.find((item) => item.value === chain)?.address}
          </span>
          <button
            type='button'
            className='text-blue-400 text-[11px] uppercase tracking-wide hover:text-blue-300'
            onClick={(e) => {
              e.stopPropagation();
              const address =
                paymentChains.find((item) => item.value === chain)?.address ||
                '';
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
      <div className='rounded-xl border theme-border theme-bg-tertiary/70 p-3 text-xs theme-text-secondary leading-relaxed'>
        <div
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(t('boostPaymentInstructionSimple')),
          }}
        />
      </div>
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
            className='rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90'
            onClick={(e) => {
              e.stopPropagation();
              closePanel();
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
            {duration} {t('days')}
          </span>
        </div>
        <div className='flex justify-between py-1 text-xs'>
          <span>{t('boostParticipationRequirement')}</span>
          <span>
            {audience === 'none'
              ? t('boostRequirementNone')
              : `XHunt ${t('rank')} Top ${audience}`}
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
            className='rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90'
            onClick={(e) => {
              e.stopPropagation();
              setStep(3);
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
        <div className='rounded-[20px] border theme-border theme-bg-secondary p-5'>
          {step === 1
            ? renderFormStep()
            : step === 2
            ? renderReviewStep()
            : renderPaymentStep()}
        </div>
      </div>
    </FloatingContainer>
  );
}

export default ArticleBoostPanel;
