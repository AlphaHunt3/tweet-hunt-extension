import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useI18n } from '~contents/hooks/i18n';
import { Blocks, Bot, X } from 'lucide-react';
import { avatarSkins } from '~contents/constants/avatarSkins';
import { useAvatarSkinState } from '~contents/hooks/useAvatarSkin';
import cssText from 'data-text:~/css/style.css';

export type DomainType = 'web3' | 'ai';

export interface UserDomainPreference {
  domains: DomainType[];
  primaryDomain: DomainType;
}

interface UserDomainSetupModalProps {
  isOpen: boolean;
  onComplete: (preference: UserDomainPreference) => void;
  onClose?: () => void;
}

const SHADOW_HOST_ID = 'xhunt-domain-setup-host';

const getOrCreateShadowHost = (): { portalHost: HTMLElement } => {
  let shadowHost = document.getElementById(
    SHADOW_HOST_ID,
  ) as HTMLElement | null;

  if (!shadowHost) {
    shadowHost = document.createElement('div');
    shadowHost.id = SHADOW_HOST_ID;
    shadowHost.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;z-index:99999;';

    if (document.body?.parentNode) {
      document.body.parentNode.insertBefore(shadowHost, document.body);
    } else {
      document.documentElement.appendChild(shadowHost);
    }

    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = cssText;
    shadowRoot.appendChild(style);

    const portalHost = document.createElement('div');
    portalHost.style.cssText = 'position:fixed;inset:0;pointer-events:none;';
    shadowRoot.appendChild(portalHost);

    return { portalHost };
  }

  const portalHost = shadowHost.shadowRoot!.querySelector('div') as HTMLElement;
  portalHost.style.cssText = 'position:fixed;inset:0;pointer-events:none;';
  return { portalHost };
};

export const DOMAIN_STYLES: Record<
  DomainType,
  {
    color: string;
    iconBg: string;
    iconColor: string;
    border: string;
    bg: string;
    glow: string;
  }
> = {
  web3: {
    color: '#1D9BF0',
    iconBg: 'rgba(29,155,240,0.10)',
    iconColor: '#1D9BF0',
    border: 'rgba(29,155,240,0.18)',
    bg: 'rgba(29,155,240,0.035)',
    glow: 'rgba(29,155,240,0.10)',
  },
  ai: {
    color: '#10b981',
    iconBg: 'rgba(16,185,129,0.10)',
    iconColor: '#34d399',
    border: 'rgba(16,185,129,0.18)',
    bg: 'rgba(16,185,129,0.035)',
    glow: 'rgba(16,185,129,0.10)',
  },
};

// 领域卡片组件
export interface DomainCardProps {
  type: DomainType;
  isSelected: boolean;
  onToggle: () => void;
  label: string;
  icon: React.ReactNode;
  compact?: boolean;
}

export const DomainCard: React.FC<DomainCardProps> = ({
  type,
  isSelected,
  onToggle,
  label,
  icon,
  compact,
}) => {
  const styles = DOMAIN_STYLES[type];

  return (
    <button
      type='button'
      onClick={onToggle}
      className={`relative flex flex-col items-center cursor-pointer transition-all duration-200 ease flex-1 border ${compact ? 'py-2.5 px-2 rounded-xl min-w-[90px]' : 'py-3 px-3 rounded-2xl min-w-[120px]'}`}
      style={{
        borderColor: isSelected ? styles.color : styles.border,
        background: isSelected
          ? `linear-gradient(180deg, ${styles.color}18 0%, ${styles.color}08 100%)`
          : styles.bg,
        boxShadow: isSelected
          ? `0 0 0 2px ${styles.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.10)`
          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        filter: isSelected ? undefined : 'saturate(0.85)',
      }}
    >
      {/* 选中勾选图标 */}
      {isSelected && (
        <div
          className={`absolute flex items-center justify-center rounded-full ${compact ? 'top-1.5 right-1.5 w-4 h-4' : 'top-2 right-2 w-5 h-5'}`}
          style={{
            background: styles.color,
            boxShadow: `0 2px 8px ${styles.glow}`,
          }}
        >
          <svg
            className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'}
            viewBox='0 0 24 24'
            fill='none'
            stroke='#fff'
            strokeWidth='3'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <polyline points='20 6 9 17 4 12' />
          </svg>
        </div>
      )}

      {/* 图标容器 */}
      <div
        className={`flex items-center justify-center mb-2 mt-0.5 ${compact ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl'}`}
        style={{
          background: styles.iconBg,
          boxShadow: `inset 0 0 0 1px ${isSelected ? styles.color + '40' : styles.border}`,
        }}
      >
        <div style={{ color: isSelected ? styles.color : styles.iconColor }}>
          {icon}
        </div>
      </div>

      {/* 领域名称 */}
      <div
        className={`font-semibold ${compact ? 'text-[13px]' : 'text-[14px]'}`}
        style={{ color: isSelected ? styles.color : 'var(--text-primary)' }}
      >
        {label}
      </div>
    </button>
  );
};

export const UserDomainSetupModal: React.FC<UserDomainSetupModalProps> = ({
  isOpen,
  onComplete,
  onClose,
}) => {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { skin: currentSkin, setSkinCustomized } = useAvatarSkinState();
  const [showAvatarRank, setShowAvatarRank] = useLocalStorage(
    '@settings/showAvatarRank',
    true,
  );
  const [setupStep, setSetupStep] = useState<'domain' | 'avatar'>('domain');
  const [selectedDomains, setSelectedDomains] = useState<DomainType[]>([]);
  const [primaryDomain, setPrimaryDomain] = useState<DomainType | null>(null);
  const [selectedAvatarSkin, setSelectedAvatarSkin] = useState('skin-1');
  const [selectedAvatarRankEnabled, setSelectedAvatarRankEnabled] =
    useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [showBtnTooltip, setShowBtnTooltip] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const { portalHost } = getOrCreateShadowHost();
    setPortalHost(portalHost);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSetupStep('domain');
      setSelectedDomains([]);
      setPrimaryDomain(null);
      setSelectedAvatarSkin(currentSkin || 'skin-1');
      setSelectedAvatarRankEnabled(showAvatarRank !== false);
    }
  }, [currentSkin, isOpen, showAvatarRank]);

  // 切换领域选中状态：点击选中，再点击取消
  const toggleDomain = useCallback((domain: DomainType) => {
    setSelectedDomains((prev) => {
      const exists = prev.includes(domain);
      if (exists) {
        const next = prev.filter((d) => d !== domain);
        // 如果取消的是当前 primary，清空优先（只剩一个时会重新自动设）
        setPrimaryDomain((current) => {
          if (current === domain) return null;
          return current;
        });
        return next;
      } else {
        const next = [...prev, domain];
        // 只选中一个时自动设为 primary；两个都选时清空让用户手动选
        if (next.length === 1) {
          setPrimaryDomain(domain);
        } else if (next.length === 2) {
          setPrimaryDomain(null);
        }
        return next;
      }
    });
  }, []);

  const canGoNext =
    selectedDomains.length > 0 &&
    (selectedDomains.length === 1 || primaryDomain !== null);

  const handleNextStep = useCallback(() => {
    if (!canGoNext) return;
    setShowBtnTooltip(false);
    setSetupStep('avatar');
  }, [canGoNext]);

  const handleConfirm = useCallback(() => {
    if (selectedDomains.length === 0) return;
    if (selectedDomains.length > 1 && !primaryDomain) return;
    // 确保 primaryDomain 在 selectedDomains 中
    const finalPrimary =
      primaryDomain && selectedDomains.includes(primaryDomain)
        ? primaryDomain
        : selectedDomains[0];
    setShowAvatarRank(selectedAvatarRankEnabled);
    setSkinCustomized(selectedAvatarSkin);
    onComplete({ domains: selectedDomains, primaryDomain: finalPrimary });
  }, [
    selectedDomains,
    primaryDomain,
    selectedAvatarRankEnabled,
    selectedAvatarSkin,
    setShowAvatarRank,
    setSkinCustomized,
    onComplete,
  ]);

  if (!isVisible || !portalHost) return null;

  const isNextDisabled = !canGoNext;
  const selectedSkinCfg =
    avatarSkins[selectedAvatarSkin] || avatarSkins['skin-1'];
  const selectedSkinColors =
    theme === 'light' ? selectedSkinCfg.light : selectedSkinCfg.dark;
  const previewRankDomain = primaryDomain || selectedDomains[0] || 'web3';
  const previewRankEmoji = previewRankDomain === 'ai' ? '🏅' : '🏆';
  const previewRankDomainLabel =
    previewRankDomain === 'ai'
      ? t('domainAi') || 'AI'
      : t('domainWeb3') || 'Web3';
  const avatarStepSubtitle = selectedAvatarRankEnabled
    ? (
        t('domainSetupAvatarStepSubtitle') ||
        '将在推特头像下方优先展示 {domain} 排名'
      ).replace('{domain}', previewRankDomainLabel)
    : t('domainSetupAvatarDisabledSubtitle') || '暂不在推特头像下方展示排名';

  const getHintText = () => {
    if (selectedDomains.length === 0) return t('domainSelectAtLeastOne');
    if (selectedDomains.length > 1 && primaryDomain === null) {
      return t('domainSelectPrimary') || '请选择优先展示的领域';
    }
    if (selectedDomains.length === 1) {
      const name =
        selectedDomains[0] === 'web3'
          ? t('domainWeb3') || 'Web3'
          : t('domainAi') || 'AI';
      return `${t('domainSelectedOne') || '已选择'}: ${name}`;
    }
    return t('domainSelectedBoth') || '已选择两个领域';
  };

  return createPortal(
    <div
      data-theme={theme}
      className='fixed inset-0 flex items-center justify-center'
      style={{
        opacity: isAnimating ? 1 : 0,
        transition: 'opacity 0.3s ease',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      {/* 背景遮罩 */}
      <div
        className='absolute inset-0'
        style={{
          background:
            theme === 'dark' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.22)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* 弹框外框 */}
      <div
        className='relative mx-4 rounded-[24px] p-px'
        style={{
          background:
            theme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)',
          boxShadow:
            theme === 'dark'
              ? '0 24px 70px rgba(0,0,0,0.42)'
              : '0 24px 70px rgba(15,23,42,0.18)',
          transform: isAnimating
            ? 'scale(1) translateY(0)'
            : 'scale(0.95) translateY(16px)',
          opacity: isAnimating ? 1 : 0,
          transition: 'all 0.3s ease',
        }}
      >
        {/* 弹框内层 */}
        <div className='relative w-[420px] max-w-[calc(100vw-32px)] rounded-[23px] overflow-hidden theme-bg-secondary'>
          {/* 关闭按钮 */}
          {onClose && (
            <button
              onClick={onClose}
              className='absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full theme-text-secondary hover:theme-bg-tertiary transition-colors z-10'
              aria-label='Close'
            >
              <X className='w-4 h-4' />
            </button>
          )}

          <div
            className='absolute top-0 left-0 right-0 h-px'
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(29,155,240,0.35), rgba(16,185,129,0.28), transparent)',
            }}
          />

          <div className='px-7 py-6'>
            {/* 顶部：Logo + 标题 */}
            <div className='flex items-start gap-3.5 pr-8 mb-5'>
              <img
                src='https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/xhunt_new.jpg'
                alt='XHunt'
                className='shrink-0 mt-0.5'
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9999px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.16)',
                }}
              />
              <div>
                <h2 className='text-[16px] leading-5 font-semibold theme-text-primary'>
                  {setupStep === 'domain'
                    ? t('userDomainSetupTitle') || '选择您感兴趣的领域'
                    : t('domainSetupAvatarSkinTitle') || '头像排名颜色'}
                </h2>
                <p className='mt-0.5 text-[12px] leading-4 theme-text-secondary'>
                  {setupStep === 'domain' ? (
                    <>
                      {t('userDomainSetupSubtitle') || '根据选择定制内容'}
                      <span className='ml-1 text-[#1D9BF0]'>
                        {t('domainSetupMultiSelectHint') || '支持多选'}
                      </span>
                    </>
                  ) : (
                    avatarStepSubtitle
                  )}
                </p>
              </div>
            </div>

            <div className='mb-5 flex items-center gap-2.5'>
              <div
                className='h-1 flex-1 rounded-full transition-colors'
                style={{
                  background:
                    setupStep === 'domain'
                      ? '#1D9BF0'
                      : 'rgba(29,155,240,0.35)',
                }}
              />
              <div
                className='h-1 flex-1 rounded-full transition-colors'
                style={{
                  background:
                    setupStep === 'avatar'
                      ? '#1D9BF0'
                      : 'var(--border-color-soft)',
                }}
              />
            </div>

            {setupStep === 'domain' && (
              <>
                {/* 领域选择卡片 */}
                <div className='flex gap-3.5'>
                  <DomainCard
                    type='web3'
                    isSelected={selectedDomains.includes('web3')}
                    onToggle={() => toggleDomain('web3')}
                    label={
                      lang === 'zh'
                        ? t('domainWeb3Desc') || 'Web3'
                        : t('domainWeb3') || 'Web3'
                    }
                    icon={<Blocks className='w-5 h-5' />}
                  />
                  <DomainCard
                    type='ai'
                    isSelected={selectedDomains.includes('ai')}
                    onToggle={() => toggleDomain('ai')}
                    label={
                      lang === 'zh'
                        ? t('domainAiDesc') || 'AI'
                        : t('domainAi') || 'AI'
                    }
                    icon={<Bot className='w-5 h-5' />}
                  />
                </div>

                {/* 优先展示选择（多选时显示） */}
                {selectedDomains.length > 1 && (
                  <>
                    <div className='mt-3 flex gap-3.5'>
                      {(['web3', 'ai'] as DomainType[]).map((domain) => {
                        const styles = DOMAIN_STYLES[domain];
                        const isPrimary = primaryDomain === domain;
                        return (
                          <button
                            type='button'
                            key={domain}
                            className='flex flex-col items-center flex-1 cursor-pointer py-1 rounded-lg transition-colors hover:theme-bg-tertiary/60'
                            onClick={() => setPrimaryDomain(domain)}
                            aria-label={`${t('domainPrimary') || '优先展示'} ${domain === 'web3' ? t('domainWeb3') || 'Web3' : t('domainAi') || 'AI'}`}
                          >
                            <div
                              className='flex items-center justify-center rounded-full w-4 h-4 transition-all'
                              style={{
                                border: `1.5px solid ${isPrimary ? styles.color : 'var(--text-tertiary)'}`,
                                background: isPrimary
                                  ? styles.color
                                  : 'transparent',
                                boxShadow: isPrimary
                                  ? `0 0 0 3px ${styles.color}14`
                                  : 'none',
                              }}
                            >
                              {isPrimary && (
                                <div className='w-1.5 h-1.5 rounded-full bg-white' />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className='text-center mt-2'>
                      {primaryDomain === null ? (
                        <span
                          className='inline-flex items-center gap-1 text-[11px]'
                          style={{
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {t('domainSelectPrimary') || '请选择优先展示'}
                        </span>
                      ) : (
                        (() => {
                          const pd = primaryDomain as DomainType;
                          return (
                            <span className='inline-flex items-center gap-1 text-[11px] theme-text-secondary'>
                              {t('domainPrimary') || '优先展示'}：
                              {pd === 'web3'
                                ? t('domainWeb3') || 'Web3'
                                : t('domainAi') || 'AI'}
                            </span>
                          );
                        })()
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* 头像排名皮肤引导 */}
            {setupStep === 'avatar' && (
              <div className='rounded-2xl theme-bg-tertiary p-3.5'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='min-w-0 text-[12px] leading-4 font-medium theme-text-primary'>
                    {selectedAvatarRankEnabled
                      ? t(selectedSkinCfg.nameKey)
                      : t('domainSetupAvatarHideRank') || '暂不显示'}
                  </div>
                  {selectedAvatarRankEnabled ? (
                    <div
                      className='shrink-0 rounded-full px-2 h-[22px] min-w-[64px] flex items-center justify-center text-[12px] font-semibold leading-none'
                      style={{
                        background: selectedSkinColors.background,
                        border: `1px solid ${selectedSkinColors.border}`,
                        color: selectedSkinColors.textColor,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.16)',
                      }}
                    >
                      {previewRankEmoji} 1,766
                    </div>
                  ) : (
                    <span className='shrink-0 text-[11px] leading-4 theme-text-secondary'>
                      {t('domainSetupAvatarDisabledMiniHint') ||
                        '可在设置中开启'}
                    </span>
                  )}
                </div>

                <div className='mt-3 flex flex-wrap gap-2'>
                  {Object.entries(avatarSkins).map(([id, skinCfg]) => {
                    const skinColors =
                      theme === 'light' ? skinCfg.light : skinCfg.dark;
                    const isActive =
                      selectedAvatarRankEnabled && selectedAvatarSkin === id;
                    return (
                      <button
                        key={id}
                        type='button'
                        className='relative h-6 w-6 rounded-full transition-all'
                        style={{
                          background: skinColors.background,
                          border: `1px solid ${isActive ? skinColors.textColor : skinColors.border}`,
                          boxShadow: isActive
                            ? `0 0 0 2px ${skinColors.outerBorder}, 0 2px 8px rgba(0,0,0,0.12)`
                            : '0 1px 2px rgba(0,0,0,0.08)',
                        }}
                        aria-label={t(skinCfg.nameKey)}
                        title={t(skinCfg.nameKey)}
                        onClick={() => {
                          setSelectedAvatarRankEnabled(true);
                          setSelectedAvatarSkin(id);
                        }}
                      >
                        {isActive && (
                          <span
                            className='absolute inset-0 m-auto w-1.5 h-1.5 rounded-full'
                            style={{ background: skinColors.textColor }}
                          />
                        )}
                      </button>
                    );
                  })}
                  <button
                    type='button'
                    className='relative h-6 w-6 rounded-full transition-all'
                    style={{
                      background:
                        theme === 'dark'
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(15,23,42,0.035)',
                      border: `1px solid ${
                        !selectedAvatarRankEnabled
                          ? 'var(--text-secondary)'
                          : theme === 'dark'
                            ? 'rgba(255,255,255,0.12)'
                            : 'rgba(15,23,42,0.12)'
                      }`,
                      boxShadow: !selectedAvatarRankEnabled
                        ? `0 0 0 2px ${
                            theme === 'dark'
                              ? 'rgba(255,255,255,0.10)'
                              : 'rgba(15,23,42,0.10)'
                          }, 0 2px 8px rgba(0,0,0,0.10)`
                        : '0 1px 2px rgba(0,0,0,0.08)',
                    }}
                    aria-label={t('domainSetupAvatarHideRank') || '暂不显示'}
                    title={t('domainSetupAvatarHideRank') || '暂不显示'}
                    onClick={() => setSelectedAvatarRankEnabled(false)}
                  >
                    <span
                      className='absolute left-1/2 top-1/2 h-[1.5px] w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full'
                      style={{
                        background:
                          theme === 'dark'
                            ? 'rgba(255,255,255,0.70)'
                            : 'rgba(15,23,42,0.62)',
                      }}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* 确认按钮 + hover 提示 */}
            <div
              className='relative w-full mt-4'
              onMouseEnter={() => setShowBtnTooltip(true)}
              onMouseLeave={() => setShowBtnTooltip(false)}
            >
              {setupStep === 'domain' ? (
                <button
                  ref={btnRef}
                  onClick={handleNextStep}
                  disabled={isNextDisabled}
                  className='w-full py-2.5 px-4 rounded-full text-[13px] font-semibold text-white flex items-center justify-center transition-all border-none hover:opacity-90'
                  style={{
                    background: isNextDisabled
                      ? 'linear-gradient(90deg, #64748b, #64748b)'
                      : 'linear-gradient(90deg, #1D9BF0, #6366f1)',
                    opacity: isNextDisabled ? 0.45 : 1,
                    boxShadow: isNextDisabled
                      ? 'none'
                      : '0 6px 18px rgba(29, 155, 240, 0.22)',
                    cursor: isNextDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {t('domainSetupNextButton') || '下一步'}
                </button>
              ) : (
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => setSetupStep('domain')}
                    className='h-9 px-4 rounded-full text-[13px] font-medium theme-text-secondary theme-bg-tertiary hover:theme-text-primary transition-colors'
                  >
                    {t('domainSetupBackButton') || '上一步'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className='h-9 flex-1 px-4 rounded-full text-[13px] font-semibold text-white transition-all border-none hover:opacity-90'
                    style={{
                      background: 'linear-gradient(90deg, #1D9BF0, #6366f1)',
                      boxShadow: '0 6px 18px rgba(29, 155, 240, 0.22)',
                    }}
                  >
                    {t('domainConfirmButton') || '确认并开始使用'}
                  </button>
                </div>
              )}
              {setupStep === 'domain' && showBtnTooltip && isNextDisabled && (
                <div
                  className='absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full theme-bg-tertiary theme-text-primary theme-border px-2.5 py-1 rounded-md text-xs whitespace-nowrap z-20'
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                >
                  {getHintText()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalHost,
  );
};

export default UserDomainSetupModal;
