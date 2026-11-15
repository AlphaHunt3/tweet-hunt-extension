import React, { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { localStorageInstance } from '~storage/index';
import { useI18n } from '~contents/hooks/i18n';
import type { CleanerMode, InterceptedAccount } from '~contents/utils/cleaner/types';
import { launchNativeBlock } from '~contents/utils/cleaner/profileBlockLauncher';
import { RankCacheManager, hasKolRankInCache } from '~utils/rankCacheManager';
import { navigateInX } from '~contents/utils/navigateInX';
import { CloseIcon } from '~/ui/icons';
import { Avatar, Button, CollapsibleSection, IconButton, SegmentedControl, Switch, TextField } from '~/ui/primitives';
import { cx } from '~/ui/primitives/cx';
import { ROW_PAD, SettingRow } from '~/ui/settings/SettingRow';
import { GuideBubble } from '~/ui/shells/GuideBubble';

export const FeedCleanerSettingsSection: React.FC<{ focusRequest?: number }> = ({ focusRequest = 0 }) => {
  const { t } = useI18n();
  const [showBubbleTip, setShowBubbleTip] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<any>(null);
  const highlightTimerRef = useRef<any>(null);
  const bubbleTimerRef = useRef<any>(null);

  const handleFocusCleaner = useCallback(() => {
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

  useEffect(() => {
    if (focusRequest) handleFocusCleaner();
  }, [focusRequest, handleFocusCleaner]);

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

  const handleOpenIntercepted = async (open: boolean) => {
    setOpenIntercepted(open);
    if (!open) return;
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

  // 不替用户调用屏蔽接口：跳转至对方主页，由 X 官方弹窗确认（用户本人最终确认）
  const handleBlockAccount = (targetHandle: string) => {
    launchNativeBlock(targetHandle, 'block');
  };

  const handleUnblockAccount = (targetHandle: string) => {
    launchNativeBlock(targetHandle, 'unblock');
  };

  const modeValue: CleanerMode = mode === 'hide' || mode === 'collapse' ? mode : 'mark';

  return (
    <div
      ref={sectionRef}
      id='xhunt-feed-cleaner-settings'
      className={cx(
        'flex flex-col rounded-xh-card transition-shadow soft:divide-y soft:divide-xh-line',
        isHighlighted && 'shadow-[0_0_0_2px_var(--xh-accent-fg)]',
      )}
    >
      {showBubbleTip ? (
        <div className={ROW_PAD}>
          <GuideBubble placement='inline' text={t('cleanerConfigBubbleDesc')} onDismiss={() => setShowBubbleTip(false)} />
        </div>
      ) : null}
      <SettingRow
        labelled
        label={t('cleanerEnableTitle')}
        control={<Switch checked={enabled} onCheckedChange={setEnabled} data-xhunt-testid='settings-cleaner-enabled' />}
      />
      {enabled ? (
        <>
          <SettingRow
            label={t('cleanerModeTitle')}
            control={
              <SegmentedControl
                aria-label={t('cleanerModeTitle')}
                size='sm'
                value={modeValue}
                onValueChange={setMode}
                options={[
                  { value: 'collapse', label: t('cleanerModeCollapse') },
                  { value: 'mark', label: t('cleanerModeMark') },
                  { value: 'hide', label: t('cleanerModeHide') },
                ]}
              />
            }
          />
          <ListSection title={t('cleanerCustomKeywordsTitle')} count={customKeywords.length} open={openKeywords} onOpenChange={setOpenKeywords}>
            <p className='text-[11.5px] leading-relaxed text-xh-fg-2 native:text-[13px]'>{t('cleanerCustomKeywordsTip')}</p>
            <AddRow
              list={t('cleanerCustomKeywordsTitle')}
              placeholder={t('cleanerCustomKeywordsPlaceholder')}
              value={keywordInput}
              onValueChange={setKeywordInput}
              onAdd={handleAddKeywords}
            />
            <Chips items={customKeywords} onRemove={handleRemoveKeyword} />
          </ListSection>
          <ListSection title={t('cleanerWhitelistTitle')} count={whitelist.length} open={openWhitelist} onOpenChange={setOpenWhitelist}>
            <AddRow
              list={t('cleanerWhitelistTitle')}
              placeholder={t('cleanerWhitelistPlaceholder')}
              value={whitelistInput}
              onValueChange={setWhitelistInput}
              onAdd={handleAddWhitelist}
            />
            <Chips items={whitelist} format={(handle) => `@${handle}`} onRemove={handleRemoveWhitelist} />
          </ListSection>
          <ListSection
            title={t('cleanerInterceptedTitle')}
            count={visibleInterceptedAccounts.length}
            open={openIntercepted}
            onOpenChange={(open) => void handleOpenIntercepted(open)}
          >
            {visibleInterceptedAccounts.length === 0 ? (
              <p className='py-3 text-center text-[11.5px] text-xh-fg-2'>{t('cleanerInterceptedEmpty')}</p>
            ) : (
              <>
                <p className='text-[11.5px] leading-relaxed text-xh-fg-2 native:text-[13px]'>{t('cleanerBlockTitle')}</p>
                <ul className='flex max-h-60 flex-col gap-0.5 overflow-y-auto'>
                  {visibleInterceptedAccounts.map((account) => (
                    <InterceptedRow
                      key={account.handle}
                      account={account}
                      onBlock={handleBlockAccount}
                      onUnblock={handleUnblockAccount}
                    />
                  ))}
                </ul>
              </>
            )}
          </ListSection>
        </>
      ) : null}
    </div>
  );
};

function ListSection({
  title,
  count,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <CollapsibleSection title={`${title} (${count})`} open={open} onOpenChange={onOpenChange} className={ROW_PAD}>
      <div className='flex flex-col gap-2 pt-1'>{children}</div>
    </CollapsibleSection>
  );
}

function AddRow({
  list,
  placeholder,
  value,
  onValueChange,
  onAdd,
}: {
  list: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className='flex items-center gap-1.5'>
      <TextField aria-label={list} placeholder={placeholder} value={value} onValueChange={onValueChange} onSubmit={onAdd} className='min-w-0 flex-1' />
      <Button size='sm' onClick={onAdd} aria-label={t('settingsAddTo').replace('{list}', list)}>
        {t('cleanerAddBtn')}
      </Button>
    </div>
  );
}

function Chips({
  items,
  format = (item) => item,
  onRemove,
}: {
  items: string[];
  format?: (item: string) => string;
  onRemove: (item: string) => void;
}) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <ul className='flex max-h-24 flex-wrap gap-1 overflow-y-auto'>
      {items.map((item) => (
        <li key={item} className='xh-tag pr-1'>
          {format(item)}
          <IconButton
            label={t('settingsRemoveItem').replace('{item}', format(item))}
            size='sm'
            className='size-4 rounded-full'
            onClick={() => onRemove(item)}
          >
            <CloseIcon size={10} />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}

function InterceptedRow({
  account,
  onBlock,
  onUnblock,
}: {
  account: InterceptedAccount;
  onBlock: (handle: string) => void;
  onUnblock: (handle: string) => void;
}) {
  const { t } = useI18n();
  const [hover, setHover] = useState(false);
  const handle = account.handle;
  return (
    <li className='flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-xh-hover'>
      <a
        href={`https://x.com/${handle}`}
        target='_blank'
        rel='noopener noreferrer'
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          navigateInX(`https://x.com/${handle}`);
        }}
        className='xh-link flex min-w-0 flex-1 items-center gap-2'
      >
        <Avatar name={account.name || handle} src={account.avatar} size='sm' />
        <span className='min-w-0 truncate text-[12px] font-medium'>{account.name || handle}</span>
        <span className='min-w-0 truncate text-[11px] text-xh-fg-2'>@{handle}</span>
      </a>
      {account.isBlocked ? (
        <Button
          size='sm'
          variant={hover ? 'default' : 'soft'}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          onClick={() => {
            setHover(false);
            onUnblock(handle);
          }}
          aria-label={`${t('cleanerBlockedStatus')} · ${t('cleanerUnblockBtn')} @${handle}`}
        >
          {hover ? t('cleanerUnblockBtn') : t('cleanerBlockedStatus')}
        </Button>
      ) : (
        <Button size='sm' variant='primary' onClick={() => onBlock(handle)} aria-label={`${t('cleanerBlockBtn')} @${handle}`}>
          {t('cleanerBlockBtn')}
        </Button>
      )}
    </li>
  );
}

export default FeedCleanerSettingsSection;
