import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FloatingContainer,
  FloatingContainerRef,
} from '~/compontents/FloatingContainer';
import { useI18n } from '~contents/hooks/i18n.ts';
import { X } from 'lucide-react';

export interface FanTipPanelEventDetail {
  open: boolean;
  anchor?: HTMLElement;
  source?: 'button' | 'panel';
  interactionRankData?: Array<{
    id: string;
    name: string;
    username_raw: string;
    profile_image_url: string;
    point: number;
    time_diff?: number;
    high_human_value?: boolean;
    likely_ai_generated?: boolean;
    mindshare?: number;
  }>;
}

export const XHUNT_FAN_TIP_PANEL_EVENT = 'xhunt-fan-tip-panel';

// 打赏分配模式
type TipDistributionMode = 'equal' | 'mindshare';

type TipStep = 'setup' | 'confirm' | 'payment';

// 打赏用户项
interface TipUserItem {
  id: string;
  name: string;
  username: string;
  avatar: string;
  point: number;
  mindshare?: number;
  amount: number;
  amountInput: string;
  selected: boolean;
  locked: boolean;
}

const MIN_TOTAL_AMOUNT = 50;
const DEFAULT_TOTAL_AMOUNT = 500;

function formatAmount2(n: number): string {
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2);
}

function FanTipPanel() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);

  const [step, setStep] = useState<TipStep>('setup');

  const [distributionMode, setDistributionMode] =
    useState<TipDistributionMode>('equal');
  const [totalAmount, setTotalAmount] = useState<string>(
    String(DEFAULT_TOTAL_AMOUNT)
  );
  const [tipUsers, setTipUsers] = useState<TipUserItem[]>([]);
  const [errorText, setErrorText] = useState<string>('');

  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const closePanel = useCallback(() => {
    containerRef.current?.hide();
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent<FanTipPanelEventDetail>(XHUNT_FAN_TIP_PANEL_EVENT, {
        detail: { open: false, source: 'panel' },
      })
    );
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent<FanTipPanelEventDetail>(XHUNT_FAN_TIP_PANEL_EVENT, {
        detail: { open: false, source: 'panel' },
      })
    );
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<FanTipPanelEventDetail>;
      if (customEvent.detail.open) {
        setIsOpen(true);
        setStep('setup');
        setErrorText('');
        setTotalAmount(String(DEFAULT_TOTAL_AMOUNT));
        setDistributionMode('equal');

        if (customEvent.detail.anchor) {
          targetRef.current = customEvent.detail.anchor;
        }

        const rawList = customEvent.detail.interactionRankData || [];
        const users: TipUserItem[] = rawList.map((item) => ({
          id: String(item.id || item.username_raw),
          name: item.name,
          username: item.username_raw,
          avatar: item.profile_image_url,
          point: typeof item.point === 'number' ? item.point : 0,
          mindshare: typeof item.mindshare === 'number' ? item.mindshare : 0,
          amount: 0,
          amountInput: '',
          selected: true,
          locked: false,
        }));
        setTipUsers(users);
      } else if (customEvent.detail.source === 'button') {
        setIsOpen(false);
        containerRef.current?.hide();
      }
    };
    window.addEventListener(XHUNT_FAN_TIP_PANEL_EVENT, handler);
    return () => window.removeEventListener(XHUNT_FAN_TIP_PANEL_EVENT, handler);
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

  const selectedUsers = useMemo(
    () => tipUsers.filter((u) => u.selected),
    [tipUsers]
  );

  const selectedCount = selectedUsers.length;

  const totalAmountNumberRaw = useMemo(() => {
    const n = Number(totalAmount);
    return Number.isFinite(n) ? n : 0;
  }, [totalAmount]);

  const totalAmountNumber = useMemo(() => {
    const n = Number(totalAmount);
    const parsed = Number.isFinite(n) ? n : 0;
    if (parsed <= 0) return 0;
    return parsed;
  }, [totalAmount]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate =
      selectedCount > 0 && selectedCount < tipUsers.length;
  }, [selectedCount, tipUsers.length]);

  const computedTotal = useMemo(
    () =>
      tipUsers
        .filter((u) => u.selected)
        .reduce((acc, u) => acc + (Number.isFinite(u.amount) ? u.amount : 0), 0),
    [tipUsers]
  );

  // 当总金额/分配方式变化时：仅更新"未锁定"的用户金额，锁定的保持不变；
  // 并将剩余金额按 equal/mindshare 分配给未锁定用户。
  useEffect(() => {
    if (!tipUsers.length) return;

    // 总金额不足最小值时，不做自动分配，避免抖动
    if (totalAmountNumberRaw < MIN_TOTAL_AMOUNT) return;

    const selected = tipUsers.filter((u) => u.selected);
    if (!selected.length) return;

    const lockedSelected = selected.filter((u) => u.locked);

    const lockedSum = lockedSelected.reduce(
      (acc, u) => acc + (Number.isFinite(u.amount) ? u.amount : 0),
      0
    );

    // 剩余给未锁定用户
    const totalTarget = Math.max(MIN_TOTAL_AMOUNT, totalAmountNumber);
    const remaining = Math.max(totalTarget - lockedSum, 0);

    setTipUsers((prev) => {
      const prevSelected = prev.filter((u) => u.selected);
      const prevUnlocked = prevSelected.filter((u) => !u.locked);

      // 若没有未锁定用户，就不进行分配
      if (!prevUnlocked.length) return prev;

      if (distributionMode === 'equal') {
        const per = remaining / prevUnlocked.length;
        return prev.map((u) => {
          if (!u.selected) return u;
          if (u.locked) return u;
          return {
            ...u,
            amount: per,
            amountInput: u.amountInput ? u.amountInput : '',
          };
        });
      }

      const weights = prevUnlocked.map((u) => Math.max(0, u.mindshare || 0));
      const sum = weights.reduce((a, b) => a + b, 0);
      if (!sum) {
        const per = remaining / prevUnlocked.length;
        return prev.map((u) => {
          if (!u.selected) return u;
          if (u.locked) return u;
          return {
            ...u,
            amount: per,
            amountInput: u.amountInput ? u.amountInput : '',
          };
        });
      }

      return prev.map((u) => {
        if (!u.selected) return u;
        if (u.locked) return u;
        const w = Math.max(0, u.mindshare || 0);
        const per = (remaining * w) / sum;
        return {
          ...u,
          amount: per,
          amountInput: u.amountInput ? u.amountInput : '',
        };
      });
    });
  }, [totalAmountNumberRaw, totalAmountNumber, distributionMode, tipUsers.length, selectedCount]);

  const handleToggleAll = (checked: boolean) => {
    setTipUsers((prev) => prev.map((u) => ({ ...u, selected: checked })));
  };

  const handleToggleOne = (id: string, checked: boolean) => {
    setTipUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, selected: checked } : u))
    );
  };

  const handleAmountChange = (id: string, value: string) => {
    setTipUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        return { ...u, amountInput: value };
      })
    );
  };

  const commitAmountInput = (id: string) => {
    setTipUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id !== id) return u;

        const raw = String(u.amountInput || '').trim();
        if (!raw) {
          // 清空也视为"手动锁定"为 0
          return { ...u, amount: 0, amountInput: '', locked: true };
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          // 非法输入也视为 0
          return { ...u, amount: 0, amountInput: '', locked: true };
        }
        return { ...u, amount: n, amountInput: formatAmount2(n), locked: true };
      });

      const sum = next
        .filter((u) => u.selected)
        .reduce((acc, u) => acc + (Number.isFinite(u.amount) ? u.amount : 0), 0);

      // 手动改单人金额：其他人保持不变，总金额跟随变化（但不小于最小值）
      const nextTotal = Math.max(MIN_TOTAL_AMOUNT, sum);
      setTotalAmount(String(nextTotal));

      return next;
    });
  };

  const handleResetAmounts = () => {
    setTipUsers((prev) =>
      prev.map((u) => ({ ...u, amount: 0, amountInput: '', locked: false }))
    );
  };

  const validateSetup = () => {
    if (selectedCount <= 0) {
      setErrorText(t('fanTipPanelEmptyUserList'));
      return false;
    }
    if (totalAmountNumberRaw < MIN_TOTAL_AMOUNT) {
      setErrorText(`${t('fanTipPanelTotalAmountLabel')}${MIN_TOTAL_AMOUNT}U`);
      return false;
    }
    setErrorText('');
    return true;
  };

  const canContinue = selectedCount > 0 && totalAmountNumberRaw >= MIN_TOTAL_AMOUNT;

  if (!isOpen) return null;

  return (
    <FloatingContainer
      ref={containerRef}
      targetRef={targetRef}
      offsetX={-430}
      offsetY={-150}
      maxWidth='520px'
      maxHeight='620px'
      className='z-[1200]'
      onClose={handleClose}
    >
      {/* 外层渐变边框容器 */}
      <div className='w-[460px] rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-pink-500/25 p-[2px] shadow-[0_16px_40px_rgba(15,23,42,0.35)]'>
        {/* 内层内容容器 */}
        <div className='rounded-xl border theme-border theme-bg-secondary overflow-hidden'>
          {/* 头部标题栏 - 优化间距和行高 */}
          <div className='px-4 py-3 border-b theme-border flex items-center justify-between'>
            <div className='min-w-0'>
              <div className='text-sm theme-text-primary font-semibold leading-tight'>
                {t('fanTipPanelTitle')}
              </div>
              <div className='text-[11px] theme-text-secondary mt-0.5 leading-relaxed'>
                {t('fanTipPanelSubtitle')}
              </div>
            </div>
            <button
              type='button'
              className='p-1.5 rounded-full theme-text-secondary hover:theme-text-primary theme-hover transition-colors duration-200'
              onClick={handleClose}
              aria-label={t('fanTipPanelCloseButtonLabel')}
              title={t('fanTipPanelCloseButtonLabel')}
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* Setup Step - 优化间距和细节 */}
          {step === 'setup' && (
            <div className='px-4 py-4'>
              <div className='space-y-4'>
                {/* 总金额输入区 */}
                <div className='grid grid-cols-2 gap-3'>
                  <div className='col-span-2'>
                    <label className='block text-xs theme-text-secondary mb-1.5 font-medium'>
                      {t('fanTipPanelTotalAmountLabel')}
                    </label>
                    <div className='flex items-center gap-2'>
                      <input
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        inputMode='decimal'
                        placeholder={t('fanTipPanelTotalAmountPlaceholder')}
                        className='w-full px-3 py-2 rounded-lg theme-bg-primary border theme-border text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200'
                      />
                      <div className='text-xs theme-text-secondary whitespace-nowrap font-medium'>
                        {t('fanTipPanelAmountUnit')}
                      </div>
                    </div>
                    {totalAmountNumberRaw > 0 && totalAmountNumberRaw < MIN_TOTAL_AMOUNT && (
                      <div className='mt-1.5 text-[11px] text-red-500'>
                        {t('fanTipPanelTotalAmountLabel')}: {MIN_TOTAL_AMOUNT}U+
                      </div>
                    )}
                  </div>

                  {/* 分配模式选择 */}
                  <div className='col-span-2 flex items-center justify-between gap-3 py-1'>
                    <label className='block text-xs theme-text-secondary whitespace-nowrap font-medium'>
                      {t('fanTipPanelDistributionModeLabel')}
                    </label>
                    <div className='flex items-center gap-4 text-sm whitespace-nowrap'>
                      {(
                        [
                          {
                            value: 'equal' as const,
                            label: t('fanTipPanelDistributionModeEqual'),
                          },
                          {
                            value: 'mindshare' as const,
                            label: t('fanTipPanelDistributionModeMindshare'),
                          },
                        ]
                      ).map((opt) => {
                        const active = distributionMode === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className='flex cursor-pointer items-center gap-2 group'
                          >
                            <input
                              type='radio'
                              className='w-4 h-4 accent-blue-500 cursor-pointer'
                              checked={active}
                              onChange={() => {
                                setDistributionMode(opt.value);
                                handleResetAmounts();
                              }}
                            />
                            <span
                              className={`text-xs transition-colors duration-200 ${
                                active
                                  ? 'text-blue-500 font-medium'
                                  : 'theme-text-secondary group-hover:theme-text-primary'
                              }`}
                            >
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 已选人数和全选 */}
                <div className='flex items-center justify-between py-1'>
                  <div className='text-xs theme-text-secondary font-medium'>
                    {t('fanTipPanelSelectedCountLabel').replace(
                      '@{count}',
                      String(selectedCount)
                    )}
                  </div>
                  <label className='flex items-center gap-2 cursor-pointer group'>
                    <input
                      ref={selectAllRef}
                      type='checkbox'
                      className='w-4 h-4 accent-blue-500 cursor-pointer'
                      checked={selectedCount > 0 && selectedCount === tipUsers.length}
                      onChange={(e) => handleToggleAll(e.target.checked)}
                    />
                    <span className='text-xs theme-text-secondary group-hover:theme-text-primary transition-colors duration-200'>
                      {t('fanTipPanelSelectAll')}
                    </span>
                  </label>
                </div>

                {/* 用户列表 - 优化卡片样式 */}
                <div className='max-h-[250px] overflow-y-auto custom-scrollbar pr-1 space-y-2'>
                  {tipUsers.length === 0 && (
                    <div className='text-xs theme-text-secondary py-10 text-center'>
                      {t('fanTipPanelEmptyUserList')}
                    </div>
                  )}

                  {tipUsers.map((u) => (
                    <div
                      key={u.id}
                      role='button'
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleOne(u.id, !u.selected);
                        }
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border theme-border transition-all duration-200 select-none ${
                        u.selected
                          ? 'theme-bg-tertiary/60'
                          : 'theme-bg-tertiary/30 opacity-60'
                      }`}
                      aria-pressed={u.selected}
                    >
                      <input
                        type='checkbox'
                        checked={u.selected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleOne(u.id, e.currentTarget.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className='w-4 h-4 accent-blue-500 cursor-pointer'
                        aria-label={t('fanTipPanelSelectAll')}
                      />
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className='w-8 h-8 rounded-full object-cover shadow-sm'
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
                        }}
                      />
                      <div className='min-w-0 flex-1'>
                        <div className='text-sm theme-text-primary font-medium truncate leading-tight'>
                          {u.name}
                        </div>
                        <div className='text-[11px] theme-text-secondary truncate mt-0.5'>
                          @{u.username}
                        </div>
                      </div>
                      <div className='w-[120px]' onClick={(e) => e.stopPropagation()}>
                        <input
                          value={
                            u.amountInput !== ''
                              ? u.amountInput
                              : Number.isFinite(u.amount)
                              ? formatAmount2(u.amount)
                              : ''
                          }
                          onChange={(e) =>
                            handleAmountChange(u.id, e.currentTarget.value)
                          }
                          onBlur={() => commitAmountInput(u.id)}
                          inputMode='decimal'
                          className='w-full px-2.5 py-1.5 rounded-md theme-bg-primary border theme-border text-sm theme-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50 transition-all duration-200'
                          disabled={!u.selected}
                          placeholder={t('fanTipPanelPerUserAmountLabel')}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 错误提示 */}
                {errorText && <div className='text-[11px] text-red-500 py-1'>{errorText}</div>}

                {/* 底部操作栏 */}
                <div className='pt-3 border-t theme-border flex items-center justify-between gap-3'>
                  <div className='text-xs theme-text-secondary'>
                    {t('fanTipPanelComputedTotalLabel')}:&nbsp;
                    <span className='theme-text-primary font-semibold'>
                      {computedTotal.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type='button'
                    className='rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200'
                    disabled={!canContinue}
                    onClick={() => {
                      if (!validateSetup()) return;
                      setStep('confirm');
                    }}
                  >
                    {t('fanTipPanelContinueToConfirm')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className='px-4 py-4'>
              <div className='space-y-4'>
                <div className='text-xs theme-text-secondary font-medium'>
                  {t('fanTipPanelStepConfirm')}
                </div>

                {/* 确认信息卡片 */}
                <div className='rounded-xl border theme-border theme-bg-tertiary/70 p-4 text-xs theme-text-primary shadow-sm'>
                  <div className='flex justify-between py-1.5'>
                    <span className='theme-text-secondary'>{t('fanTipPanelTotalAmountLabel')}</span>
                    <span className='font-semibold'>
                      {Math.max(totalAmountNumber, MIN_TOTAL_AMOUNT).toFixed(2)} {t('fanTipPanelAmountUnit')}
                    </span>
                  </div>
                  <div className='flex justify-between py-1.5'>
                    <span className='theme-text-secondary'>{t('fanTipPanelDistributionModeLabel')}</span>
                    <span className='font-semibold'>
                      {distributionMode === 'equal'
                        ? t('fanTipPanelDistributionModeEqual')
                        : t('fanTipPanelDistributionModeMindshare')}
                    </span>
                  </div>
                  <div className='flex justify-between py-1.5'>
                    <span className='theme-text-secondary'>{t('fanTipPanelConfirmRecipients')}</span>
                    <span className='font-semibold'>
                      {selectedCount}
                    </span>
                  </div>
                </div>

                {/* 提示信息 */}
                <div className='rounded-lg border border-yellow-500/60 bg-yellow-500/10 p-3.5 text-xs text-yellow-800 dark:text-yellow-300/95 leading-relaxed'>
                  {t('fanTipPanelClaimHint')}
                </div>

                {/* 计算总额卡片 */}
                <div className='rounded-xl border theme-border theme-bg-tertiary/70 p-4 text-xs theme-text-primary shadow-sm'>
                  <div className='flex items-center justify-between'>
                    <div className='theme-text-secondary'>
                      {t('fanTipPanelComputedTotalLabel')}
                    </div>
                    <div className='font-semibold theme-text-primary'>
                      {computedTotal.toFixed(2)} {t('fanTipPanelAmountUnit')}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className='flex justify-between gap-3 pt-2'>
                  <button
                    type='button'
                    className='rounded-full border theme-border px-5 py-2 text-sm theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary/80 transition-all duration-200'
                    onClick={() => setStep('setup')}
                  >
                    {t('fanTipPanelBackToEdit')}
                  </button>
                  <button
                    type='button'
                    className='rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200'
                    disabled={!canContinue}
                    onClick={() => {
                      if (!validateSetup()) return;
                      setStep('payment');
                    }}
                  >
                    {t('fanTipPanelConfirmAndPay')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <div className='px-4 py-4'>
              <div className='space-y-4'>
                <div className='text-xs theme-text-secondary font-medium'>
                  {t('fanTipPanelStepPayment')}
                </div>
                <div className='rounded-xl border theme-border theme-bg-tertiary/70 p-4 text-xs theme-text-secondary leading-relaxed shadow-sm'>
                  {t('fanTipPanelPaymentHint')}
                </div>
                <div className='flex justify-between gap-3 pt-2'>
                  <button
                    type='button'
                    className='rounded-full border theme-border px-5 py-2 text-sm theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary/80 transition-all duration-200'
                    onClick={() => setStep('confirm')}
                  >
                    {t('fanTipPanelBackToConfirm')}
                  </button>
                  <button
                    type='button'
                    className='rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:opacity-95 transition-all duration-200'
                    onClick={handleClose}
                  >
                    {t('fanTipPanelFinishButton')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </FloatingContainer>
  );
}

export default FanTipPanel;
