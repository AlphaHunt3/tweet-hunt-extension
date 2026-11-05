import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Ban,
  User,
  Info,
} from 'lucide-react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { localStorageInstance } from '~storage/index';
import { useI18n } from '~contents/hooks/i18n';
import type { CleanerMode, InterceptedAccount } from '~contents/utils/cleaner/types';
import { launchNativeBlock } from '~contents/utils/cleaner/profileBlockLauncher';
import { PortalTooltip } from '~compontents/PortalTooltip';
import { RankCacheManager, hasKolRankInCache } from '~utils/rankCacheManager';
import { navigateInX } from '~contents/utils/navigateInX';

export const FeedCleanerSettingsSection: React.FC = () => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showBubbleTip, setShowBubbleTip] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<any>(null);
  const highlightTimerRef = useRef<any>(null);
  const bubbleTimerRef = useRef<any>(null);

  const handleFocusCleaner = useCallback(() => {
    setIsExpanded(true);
    setShowBubbleTip(true);
    setIsHighlighted(true);

    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      sectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = setTimeout(() => {
      setIsHighlighted(false);
    }, 4000);

    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
    bubbleTimerRef.current = setTimeout(() => {
      setShowBubbleTip(false);
    }, 8000);
  }, []);

  useEffect(() => {
    const onFocus = () => handleFocusCleaner();
    const onRouteEnter = (e: any) => {
      if (
        e?.detail?.props?.highlightCleaner ||
        e?.detail?.props?.scrollToId === 'xhunt-feed-cleaner-settings'
      ) {
        handleFocusCleaner();
      }
    };

    window.addEventListener('xhunt:focus-cleaner-settings', onFocus);
    window.addEventListener('xhunt:route-enter', onRouteEnter);
    return () => {
      window.removeEventListener('xhunt:focus-cleaner-settings', onFocus);
      window.removeEventListener('xhunt:route-enter', onRouteEnter);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current);
      }
    };
  }, [handleFocusCleaner]);

  const [enabled, setEnabled] = useLocalStorage<boolean>(
    '@settings/cleaner-enabled',
    false
  );
  const [mode, setMode] = useLocalStorage<CleanerMode>(
    '@settings/cleaner-mode',
    'collapse'
  );
  const [whitelist, setWhitelist] = useLocalStorage<string[]>(
    '@xhunt/cleaner-whitelist',
    []
  );
  const [customKeywords, setCustomKeywords] = useLocalStorage<string[]>(
    '@xhunt/cleaner-custom-keywords',
    []
  );
  const [interceptedAccounts, setInterceptedAccounts] = useLocalStorage<
    InterceptedAccount[]
  >('@xhunt/cleaner-intercepted-accounts', []);

  // 预热排名缓存：有 KOL 排名的账号不允许出现在违规账号屏蔽列表中
  const [rankCacheReady, setRankCacheReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    void RankCacheManager.preload().then(() => {
      if (mounted) setRankCacheReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 展示层兜底过滤：即使记录阶段漏网，有排名的账号也不展示
  const visibleInterceptedAccounts = useMemo(() => {
    const list = Array.isArray(interceptedAccounts) ? interceptedAccounts : [];
    if (!rankCacheReady) return list;
    return list.filter((acc) => !hasKolRankInCache(acc.handle));
  }, [interceptedAccounts, rankCacheReady]);

  // 排名缓存就绪后顺手清理 storage 中误记录的有排名账号
  useEffect(() => {
    if (!rankCacheReady) return;
    const list = Array.isArray(interceptedAccounts) ? interceptedAccounts : [];
    const filtered = list.filter((acc) => !hasKolRankInCache(acc.handle));
    if (filtered.length !== list.length) {
      setInterceptedAccounts(filtered);
    }
  }, [rankCacheReady, interceptedAccounts, setInterceptedAccounts]);

  // 子项展开状态（管理自定义词 / 白名单）
  const [openKeywords, setOpenKeywords] = useState(false);
  const [openWhitelist, setOpenWhitelist] = useState(false);
  const [openIntercepted, setOpenIntercepted] = useState(false);
  const [hoveredUnblockHandle, setHoveredUnblockHandle] = useState<
    string | null
  >(null);

  // 输入框临时状态
  const [keywordInput, setKeywordInput] = useState('');
  const [whitelistInput, setWhitelistInput] = useState('');

  const handleAddKeywords = () => {
    if (!keywordInput.trim()) return;
    const newWords = keywordInput
      .split(/[,，\n]+/)
      .map((w) => w.trim())
      .filter((word) => word.length >= 2);

    if (newWords.length > 0) {
      setCustomKeywords((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return Array.from(new Set([...list, ...newWords]));
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (wordToRemove: string) => {
    setCustomKeywords((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.filter((w) => w !== wordToRemove);
    });
  };

  const handleAddWhitelist = () => {
    const raw = whitelistInput.trim().replace(/^@/, '').toLowerCase();
    if (!raw) return;
    setWhitelist((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      if (list.includes(raw)) return list;
      return [...list, raw];
    });
    setWhitelistInput('');
  };

  const handleRemoveWhitelist = (handleToRemove: string) => {
    setWhitelist((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.filter((h) => h.toLowerCase() !== handleToRemove.toLowerCase());
    });
  };

  // 当窗口获得焦点时重新从 storage 获取最新拦截记录，保证在 X 主页手动解封后切回设置页即时刷新
  useEffect(() => {
    const refreshRecords = async () => {
      try {
        const stored = (await localStorageInstance.get(
          '@xhunt/cleaner-intercepted-accounts'
        )) as InterceptedAccount[] | null;
        if (Array.isArray(stored)) {
          setInterceptedAccounts(stored);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('focus', refreshRecords);
    return () => window.removeEventListener('focus', refreshRecords);
  }, [setInterceptedAccounts]);

  const handleToggleOpenIntercepted = async () => {
    const nextState = !openIntercepted;
    setOpenIntercepted(nextState);
    if (nextState) {
      try {
        const stored = (await localStorageInstance.get(
          '@xhunt/cleaner-intercepted-accounts'
        )) as InterceptedAccount[] | null;
        if (Array.isArray(stored)) {
          setInterceptedAccounts(stored);
        }
      } catch {
        // ignore
      }
    }
  };

  // 不替用户调用屏蔽接口：跳转至对方主页，由 X 官方弹窗确认（用户本人最终确认）
  const handleBlockAccount = (targetHandle: string) => {
    launchNativeBlock(targetHandle, 'block');
  };

  const handleUnblockAccount = (targetHandle: string) => {
    setHoveredUnblockHandle(null);
    launchNativeBlock(targetHandle, 'unblock');
  };

  return (
    <div
      ref={sectionRef}
      id='xhunt-feed-cleaner-settings'
      className={`theme-bg-tertiary/70 ml-1 mr-1 rounded-xl mb-2 overflow-hidden transition-all duration-300 ${
        isHighlighted ? 'ring-1 ring-[#1D9BF0]/35' : ''
      }`}>
      {/* 分组标题：与其它设置项风格完全一致 */}
      <div
        className='flex items-center justify-between py-2 px-3 cursor-pointer hover:theme-bg-tertiary/50 transition-colors'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className='text-[12px] font-semibold theme-text-primary tracking-wide leading-4'>
          {t('cleanerSettingsTitle')}
        </span>
        {isExpanded ? (
          <ChevronDown className='w-3.5 h-3.5 theme-text-secondary' />
        ) : (
          <ChevronRight className='w-3.5 h-3.5 theme-text-secondary' />
        )}
      </div>

      {/* 气泡提示 (与设置页顶部气泡样式风格保持一致) */}
      {showBubbleTip && (
        <div className='mx-3 mt-1.5 mb-2.5 relative'>
          <div
            className='relative rounded-2xl theme-bg-secondary px-3 py-2.5 shadow-[0_12px_34px_rgba(0,0,0,0.18)]'
            role='status'
            style={{
              fontFamily:
                'TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              border: '1px solid rgba(29, 155, 240, 0.18)',
              backgroundImage:
                'linear-gradient(135deg, rgba(29,155,240,0.075), rgba(29,155,240,0.012) 42%, transparent)',
            }}
          >
            <div
              className='absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 theme-bg-secondary border-r border-b'
              style={{
                borderColor: 'rgba(29, 155, 240, 0.18)',
                backgroundImage:
                  'linear-gradient(135deg, rgba(29,155,240,0.075), rgba(29,155,240,0.012))',
              }}
              aria-hidden='true'
            />
            <button
              type='button'
              className='absolute right-2 top-2 rounded-full p-0.5 theme-text-secondary hover:theme-bg-tertiary transition-colors'
              aria-label={t('close') || '关闭'}
              onClick={(e) => {
                e.stopPropagation();
                setShowBubbleTip(false);
              }}
            >
              <X className='h-3.5 w-3.5 opacity-75' />
            </button>
            <div
              className='pr-6 text-[12px] leading-[18px] theme-text-secondary'
              style={{
                letterSpacing: '0.005em',
              }}
            >
              {t('cleanerConfigBubbleDesc')}
            </div>
            <div className='mt-1.5 flex justify-end'>
              <button
                type='button'
                className='rounded-full px-2 py-0.5 text-[12px] font-semibold leading-[18px] text-[#1D9BF0] hover:bg-[#1D9BF0]/10 transition-colors'
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBubbleTip(false);
                }}
              >
                {t('headerControlsGuideGotIt') || '知道了'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 展开内容 */}
      {isExpanded && (
        <div className='border-t theme-border'>
          {/* 1. 总开关 */}
          <div className='flex items-center justify-between py-2 px-3'>
            <span className='text-[13px] theme-text-primary leading-tight'>
              {t('cleanerEnableTitle')}
            </span>
            <label className='relative inline-flex items-center shrink-0 cursor-pointer'>
              <input
                type='checkbox'
                className='sr-only peer'
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <div className="relative w-9 h-5 bg-gray-500/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:shadow-sm after:transition-all peer-checked:bg-xhunt-accent"></div>
            </label>
          </div>

          {enabled && (
            <>
              {/* 2. 呈现模式选择（原生胶囊分段器） */}
              <div className='flex items-center justify-between py-2 px-3 border-t theme-border'>
                <span className='text-[13px] theme-text-primary leading-tight'>
                  {t('cleanerModeTitle')}
                </span>
                <div className='inline-flex items-center gap-1 theme-bg-tertiary rounded-full p-0.5'>
                  <button
                    type='button'
                    onClick={() => setMode('collapse')}
                    className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors ${
                      mode === 'collapse'
                        ? 'bg-xhunt-accent text-white'
                        : 'theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    {t('cleanerModeCollapse')}
                  </button>
                  <button
                    type='button'
                    onClick={() => setMode('mark')}
                    className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors ${
                      mode !== 'hide' && mode !== 'collapse'
                        ? 'bg-xhunt-accent text-white'
                        : 'theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    {t('cleanerModeMark')}
                  </button>
                  <button
                    type='button'
                    onClick={() => setMode('hide')}
                    className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors ${
                      mode === 'hide'
                        ? 'bg-xhunt-accent text-white'
                        : 'theme-text-secondary hover:theme-text-primary'
                    }`}
                  >
                    {t('cleanerModeHide')}
                  </button>
                </div>
              </div>

              {/* 3. 自定义屏蔽词管理 */}
              <div className='border-t theme-border'>
                <div
                  className='flex items-center justify-between py-2 px-3 cursor-pointer hover:theme-bg-tertiary/40 transition-colors'
                  onClick={() => setOpenKeywords(!openKeywords)}
                >
                  <div className='flex items-center gap-1.5'>
                    <span className='text-[13px] theme-text-primary leading-tight'>
                      {t('cleanerCustomKeywordsTitle')}
                      <span className='text-[11px] theme-text-secondary ml-1.5'>
                        ({customKeywords.length})
                      </span>
                    </span>
                    <PortalTooltip
                      content={t('cleanerCustomKeywordsTip')}
                      maxWidth={260}
                    >
                      <span
                        className='inline-flex items-center cursor-help text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className='w-3.5 h-3.5' />
                      </span>
                    </PortalTooltip>
                  </div>
                  {openKeywords ? (
                    <ChevronDown className='w-3.5 h-3.5 theme-text-secondary' />
                  ) : (
                    <ChevronRight className='w-3.5 h-3.5 theme-text-secondary' />
                  )}
                </div>

                {openKeywords && (
                  <div className='px-3 pb-2.5 pt-1 space-y-2'>
                    <div className='flex items-center gap-1.5'>
                      <input
                        type='text'
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddKeywords();
                          }
                        }}
                        placeholder={t('cleanerCustomKeywordsPlaceholder')}
                        className='flex-1 h-7 px-2 text-[11px] rounded-lg border theme-border theme-bg-secondary theme-text-primary placeholder:theme-text-secondary/60 focus:outline-hidden focus:border-xhunt-accent'
                      />
                      <button
                        type='button'
                        onClick={handleAddKeywords}
                        className='h-7 px-2.5 rounded-lg bg-xhunt-accent text-white text-[11px] font-medium flex items-center gap-0.5 hover:bg-xhunt-accent-hover transition-colors'
                      >
                        <Plus className='w-3 h-3' />
                        <span>{t('cleanerAddBtn')}</span>
                      </button>
                    </div>

                    {customKeywords.length > 0 && (
                      <div className='flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-0.5'>
                        {customKeywords.map((kw) => (
                          <span
                            key={kw}
                            className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] theme-bg-secondary theme-border border theme-text-primary'
                          >
                            <span>{kw}</span>
                            <button
                              type='button'
                              onClick={() => handleRemoveKeyword(kw)}
                              className='theme-text-secondary hover:text-red-500'
                            >
                              <X className='w-2.5 h-2.5' />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. 放行白名单管理 */}
              <div className='border-t theme-border'>
                <div
                  className='flex items-center justify-between py-2 px-3 cursor-pointer hover:theme-bg-tertiary/40 transition-colors'
                  onClick={() => setOpenWhitelist(!openWhitelist)}
                >
                  <span className='text-[13px] theme-text-primary leading-tight'>
                    {t('cleanerWhitelistTitle')}
                    <span className='text-[11px] theme-text-secondary ml-1.5'>
                      ({whitelist.length})
                    </span>
                  </span>
                  {openWhitelist ? (
                    <ChevronDown className='w-3.5 h-3.5 theme-text-secondary' />
                  ) : (
                    <ChevronRight className='w-3.5 h-3.5 theme-text-secondary' />
                  )}
                </div>

                {openWhitelist && (
                  <div className='px-3 pb-2.5 pt-1 space-y-2'>
                    <div className='flex items-center gap-1.5'>
                      <input
                        type='text'
                        value={whitelistInput}
                        onChange={(e) => setWhitelistInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddWhitelist();
                          }
                        }}
                        placeholder={t('cleanerWhitelistPlaceholder')}
                        className='flex-1 h-7 px-2 text-[11px] rounded-lg border theme-border theme-bg-secondary theme-text-primary placeholder:theme-text-secondary/60 focus:outline-hidden focus:border-xhunt-accent'
                      />
                      <button
                        type='button'
                        onClick={handleAddWhitelist}
                        className='h-7 px-2.5 rounded-lg border theme-border theme-bg-secondary theme-text-primary text-[11px] font-medium flex items-center gap-0.5 hover:theme-bg-tertiary transition-colors'
                      >
                        <Plus className='w-3 h-3' />
                        <span>{t('cleanerAddBtn')}</span>
                      </button>
                    </div>

                    {whitelist.length > 0 && (
                      <div className='flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-0.5'>
                        {whitelist.map((handle) => (
                          <span
                            key={handle}
                            className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          >
                            <span>@{handle}</span>
                            <button
                              type='button'
                              onClick={() => handleRemoveWhitelist(handle)}
                              className='text-blue-500/70 hover:text-red-500'
                            >
                              <X className='w-2.5 h-2.5' />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 5. 拦截记录管理 */}
              <div className='border-t theme-border'>
                <div
                  className='flex items-center justify-between py-2 px-3 cursor-pointer hover:theme-bg-tertiary/40 transition-colors'
                  onClick={handleToggleOpenIntercepted}
                >
                  <span className='text-[13px] theme-text-primary leading-tight'>
                    {t('cleanerInterceptedTitle')}
                    <span className='text-[11px] theme-text-secondary ml-1.5'>
                      ({visibleInterceptedAccounts.length})
                    </span>
                  </span>
                  {openIntercepted ? (
                    <ChevronDown className='w-3.5 h-3.5 theme-text-secondary' />
                  ) : (
                    <ChevronRight className='w-3.5 h-3.5 theme-text-secondary' />
                  )}
                </div>

                {openIntercepted && (
                  <div className='px-3 pb-2.5 pt-1 space-y-2'>
                    {visibleInterceptedAccounts.length === 0 ? (
                      <div className='py-3 text-center text-[11px] theme-text-secondary/70'>
                        {t('cleanerInterceptedEmpty')}
                      </div>
                    ) : (
                      <div className='space-y-1.5 max-h-60 overflow-y-auto pr-0.5'>
                        {visibleInterceptedAccounts.map((account) => {
                          return (
                            <div
                              key={account.handle}
                              className='flex items-center justify-between gap-2 p-1.5 rounded-lg border theme-border theme-bg-secondary'
                            >
                              <a
                                href={`https://x.com/${account.handle}`}
                                target='_blank'
                                rel='noopener noreferrer'
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigateInX(`https://x.com/${account.handle}`);
                                }}
                                className='flex items-center gap-2 min-w-0 flex-1 group cursor-pointer no-underline'
                              >
                                {account.avatar ? (
                                  <img
                                    src={account.avatar}
                                    alt={account.handle}
                                    className='w-7 h-7 rounded-full object-cover shrink-0'
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display =
                                        'none';
                                    }}
                                  />
                                ) : (
                                  <div className='w-7 h-7 rounded-full theme-bg-tertiary flex items-center justify-center shrink-0'>
                                    <User className='w-3.5 h-3.5 theme-text-secondary' />
                                  </div>
                                )}

                                <div className='min-w-0 flex-1'>
                                  <div className='flex items-center gap-1.5 leading-tight'>
                                    <span className='text-[11px] font-medium theme-text-primary truncate max-w-[140px] group-hover:underline'>
                                      {account.name || account.handle}
                                    </span>
                                    <span className='text-[10px] theme-text-secondary truncate max-w-[120px] group-hover:underline'>
                                      @{account.handle}
                                    </span>
                                  </div>
                                </div>
                              </a>

                              <div className='shrink-0'>
                                {account.isBlocked ? (
                                  <button
                                    type='button'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnblockAccount(account.handle);
                                    }}
                                    onMouseEnter={() =>
                                      setHoveredUnblockHandle(
                                        account.handle.toLowerCase()
                                      )
                                    }
                                    onMouseLeave={() =>
                                      setHoveredUnblockHandle(null)
                                    }
                                    className={`h-5 px-2 text-[10px] font-medium rounded-full text-white inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                      hoveredUnblockHandle ===
                                      account.handle.toLowerCase()
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-emerald-500 hover:bg-emerald-600'
                                    }`}
                                                                      >
                                    {hoveredUnblockHandle ===
                                    account.handle.toLowerCase() ? (
                                      <span>{t('cleanerUnblockBtn')}</span>
                                    ) : (
                                      <span>{t('cleanerBlockedStatus')}</span>
                                    )}
                                  </button>
                                ) : (
                                  <PortalTooltip
                                    content={t('cleanerBlockTitle')}
                                    maxWidth={280}
                                  >
                                    <button
                                      type='button'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBlockAccount(account.handle);
                                      }}
                                      className='h-5 px-2 text-[10px] font-medium rounded-full bg-xhunt-accent text-white hover:bg-xhunt-accent-hover transition-colors inline-flex items-center justify-center gap-0.5 shrink-0 cursor-pointer'
                                    >
                                      <Ban className='w-2.5 h-2.5' />
                                      <span>{t('cleanerBlockBtn')}</span>
                                    </button>
                                  </PortalTooltip>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedCleanerSettingsSection;
