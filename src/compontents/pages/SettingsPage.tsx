import React, { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import packageJson from '../../../package.json';
import { FeedCleanerSettingsSection } from '~/compontents/cleaner/FeedCleanerSettingsSection';
import { SocialLinks } from '~/compontents/UserAuthPanel';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { updateUserInfo } from '~contents/services/review.ts';
import { getCurrentUsername } from '~contents/utils/helpers.ts';
import { localStorageInstance } from '~storage/index.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import type { UserInfo } from '~types/review.ts';
import { configManager } from '~utils/configManager.ts';
import { settingsConfig, useAllSettings } from '~/utils/settingsManager.ts';
import { EmptyState } from '~/ui/panel/PanelSection';
import { Button, SearchField } from '~/ui/primitives';
import { cx } from '~/ui/primitives/cx';
import { AVATAR_RANK_MODE_KEY, AvatarRankSettings } from '~/ui/settings/AvatarRankSettings';
import { DomainSettings } from '~/ui/settings/DomainSettings';
import { EvmAddressSettings, shortAddress } from '~/ui/settings/EvmAddressSettings';
import { FloatingPanelSettings, clampWidth } from '~/ui/settings/FloatingPanelSettings';
import { GeneralSettings, LanguageSetting, SkinSetting, SoundSetting } from '~/ui/settings/GeneralSettings';
import { groupSettings, type SettingGroups } from '~/ui/settings/groupSettings';
import { reloadPage } from '~/ui/settings/reloadPage';
import { DrillRow, ROW_PAD, SettingsGroup, SwitchSetting } from '~/ui/settings/SettingRow';
import { SettingsProvider, type RealtimeMode } from '~/ui/settings/SettingsContext';
import { PanelPageHeader } from '~/ui/shells/PanelPageHeader';

// Chrome 类型声明
declare const chrome: any;

type SectionId =
  | 'domainPreference'
  | 'cleaner'
  | 'profilePage'
  | 'homeRightSidebar'
  | 'web3OnlySettings'
  | 'aiOnlySettings'
  | 'floatingPanel'
  | 'evm';

interface SettingsPageProps {
  showBackButton?: boolean;
  onClose?: () => void;
}

interface SearchEntry {
  id: string;
  label: string;
  render: () => ReactNode;
}

const CLEANER_ANCHOR = 'xhunt-feed-cleaner-settings';
const SWITCH_GROUPS: Array<keyof SettingGroups> = [
  'others',
  'avatarSettings',
  'profilePage',
  'homeRightSidebar',
  'web3OnlySettings',
  'aiOnlySettings',
];
const PRESERVED_KEYS = [
  '@xhunt/user-domain-preference',
  '@xhunt/user-domain-setup-completed',
  '@xhunt/domain-setup-visible',
];
const SECTION_BODY =
  'xh-rise flex flex-col soft:divide-y soft:divide-xh-line soft:rounded-xh-card soft:bg-xh-raised soft:shadow-xh-card';

function useRealtimeMode(active: boolean) {
  const [mode, setMode] = useState<RealtimeMode>('Inactive');
  useEffect(() => {
    if (!active) {
      setMode('Inactive');
      return;
    }
    const fetchStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_REALTIME_STATUS' });
        if (response?.success && response?.data) setMode(response.data.mode || 'Inactive');
      } catch {}
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 4000);
    return () => clearInterval(timer);
  }, [active]);
  return mode;
}

// 清理扩展本地存储和网页 localStorage 里与 xhunt 相关的键，保留领域选择
async function clearXhuntCache(confirmText: string) {
  try {
    if (!window.confirm(confirmText || 'Are you sure you want to clear all XHunt caches? This cannot be undone.')) return;
  } catch {}
  const preserved: Record<string, unknown> = {};
  try {
    for (const key of PRESERVED_KEYS) preserved[key] = await localStorageInstance.get(key);
  } catch {}
  try {
    await localStorageInstance.clear();
  } catch {}
  try {
    if (chrome?.storage?.local?.clear) {
      await new Promise<void>((resolve) => chrome.storage.local.clear(() => resolve()));
    }
  } catch {}
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) keys.push(window.localStorage.key(i) || '');
    keys.forEach((key) => {
      if (key.includes('xhunt') || key.includes('@xhunt')) window.localStorage.removeItem(key);
    });
  } catch {}
  try {
    for (const key of PRESERVED_KEYS) {
      if (preserved[key] !== undefined) await localStorageInstance.set(key, preserved[key]);
    }
  } catch {}
  try {
    window.location.reload();
  } catch {}
}

function SettingsFooter({ token }: { token: string }) {
  const { t, lang } = useI18n();
  return (
    <div className='flex items-center gap-1 soft:px-1 soft:pt-2 obsidian:border-t obsidian:border-xh-line obsidian:px-3 obsidian:py-2 native:border-t native:border-xh-line native:px-4 native:py-2.5'>
      {token ? <SocialLinks /> : null}
      <span className='min-w-0 flex-1 truncate px-1 text-[11px] text-xh-fg-2 obsidian:font-xh-mono native:text-[13px]'>
        {lang === 'zh' ? `${t('version')} ` : ''}
        {packageJson.version}
      </span>
      <Button size='sm' title={t('clearCacheTooltip')} onClick={() => void clearXhuntCache(t('clearCacheConfirm'))}>
        {t('clearCache')}
      </Button>
    </div>
  );
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ showBackButton = true, onClose }) => {
  const { t } = useI18n();
  const { settingStates, isLoading } = useAllSettings();
  const { domains } = useUserDomain();
  const [token] = useLocalStorage('@xhunt/token', '');
  const [rankMode, setRankMode] = useLocalStorage<'web3' | 'ai'>(AVATAR_RANK_MODE_KEY, 'web3');
  const [cleanerEnabled] = useLocalStorage<boolean>('@settings/cleaner-enabled', false);
  const [cleanerMode] = useLocalStorage<string>('@settings/cleaner-mode', 'collapse');
  const [panelMode] = useLocalStorage<'default' | 'persistent'>('@xhunt/floatingPanelMode', 'default');
  const [panelWidth] = useLocalStorage<number>('@xhunt/panelWidth', 340);
  // 用户信息缓存时间戳，用于绕过协商缓存
  const [cacheBust, setCacheBust] = useLocalStorage<number>('@xhunt/userInfoCacheBust', Date.now());
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  const [username, setUsername] = useState('');
  const [section, setSection] = useState<SectionId | null>(null);
  const [query, setQuery] = useState('');
  const [cleanerFocus, setCleanerFocus] = useState(0);
  const realtimeMode = useRealtimeMode(Boolean(settingStates.showRealtimeSubscription?.get));
  const groups = useMemo(
    () => groupSettings(settingsConfig, configManager.getConfig() as never, username || undefined),
    [username],
  );

  useEffect(() => {
    getCurrentUsername()
      .then((name) => setUsername(name || ''))
      .catch(() => setUsername(''));
  }, []);

  // 只剩一个领域时，头像排名类型跟着它走
  useEffect(() => {
    if (domains.length === 1 && rankMode !== domains[0]) {
      setRankMode(domains[0]);
      reloadPage();
    }
  }, [domains, rankMode, setRankMode]);

  // 打开设置页时同步一次用户信息（updateUserInfo 会写回 @xhunt/user）
  useEffect(() => {
    if (!token) {
      setUserInfo(undefined);
      return;
    }
    updateUserInfo(cacheBust).then((info?: UserInfo | null) => {
      if (info) setUserInfo(info);
    });
  }, [token, cacheBust]);

  useEffect(() => {
    const openCleaner = () => {
      setQuery('');
      setSection('cleaner');
      setCleanerFocus((count) => count + 1);
    };
    const onRouteRequest = (event: Event) => {
      const props = (event as CustomEvent<{ props?: Record<string, unknown> }>).detail?.props;
      if (props?.highlightCleaner || props?.scrollToId === CLEANER_ANCHOR) openCleaner();
    };
    window.addEventListener('xhunt:focus-cleaner-settings', openCleaner);
    window.addEventListener('xhunt:route-request', onRouteRequest);
    return () => {
      window.removeEventListener('xhunt:focus-cleaner-settings', openCleaner);
      window.removeEventListener('xhunt:route-request', onRouteRequest);
    };
  }, []);

  const domainOff = (id: string) =>
    (id === 'web3OnlySettings' && !domains.includes('web3')) || (id === 'aiOnlySettings' && !domains.includes('ai'));
  const count = (n: number) => t('settingsItemCount').replace('{count}', String(n));
  const modeLabels: Record<string, string> = {
    collapse: t('cleanerModeCollapse'),
    mark: t('cleanerModeMark'),
    hide: t('cleanerModeHide'),
  };
  const titles: Record<SectionId, string> = {
    domainPreference: t('domainPreferenceTitle') || '感兴趣领域',
    cleaner: t('cleanerSettingsTitle'),
    profilePage: t('profilePageSettings'),
    homeRightSidebar: t('homeRightSidebar'),
    web3OnlySettings: t('web3OnlySettings') || 'Web3 领域设置',
    aiOnlySettings: t('aiOnlySettings') || 'AI 领域设置',
    floatingPanel: t('floatingPanelSettings'),
    evm: t('evmAddressBinding'),
  };
  const evmAddress: string = userInfo?.evmAddresses?.[0] ?? '';

  const open = (id: SectionId | null) => {
    setQuery('');
    setSection(id);
  };

  const drillRows: Array<{ id: SectionId; summary: string }> = [
    { id: 'domainPreference', summary: domains.map((domain) => (domain === 'ai' ? 'AI' : 'Web3')).join(' · ') },
    {
      id: 'cleaner',
      summary: cleanerEnabled ? `${t('settingsOn')} · ${modeLabels[cleanerMode] ?? modeLabels.mark}` : t('settingsOff'),
    },
    { id: 'profilePage', summary: count(groups.profilePage.length) },
    ...(groups.homeRightSidebar.length
      ? [{ id: 'homeRightSidebar' as const, summary: count(groups.homeRightSidebar.length) }]
      : []),
    {
      id: 'web3OnlySettings',
      summary: domainOff('web3OnlySettings') ? t('settingsOff') : count(groups.web3OnlySettings.length),
    },
    {
      id: 'aiOnlySettings',
      summary: domainOff('aiOnlySettings') ? t('settingsOff') : count(groups.aiOnlySettings.length),
    },
    {
      id: 'floatingPanel',
      summary: `${panelMode === 'persistent' ? t('floatingPanelModePersistent') : t('floatingPanelModeDefault')} · ${clampWidth(panelWidth)}px`,
    },
    ...(token
      ? [{ id: 'evm' as const, summary: evmAddress ? shortAddress(evmAddress) : t('settingsNotBound') }]
      : []),
  ];

  const searchEntries = (): SearchEntry[] => {
    const entries: SearchEntry[] = [
      { id: 'uiSkin', label: t('uiSkinLabel'), render: () => <SkinSetting /> },
      { id: 'language', label: t('language'), render: () => <LanguageSetting /> },
      { id: 'sound', label: t('soundEffect'), render: () => <SoundSetting /> },
    ];
    const seen = new Set<string>();
    for (const groupId of SWITCH_GROUPS) {
      for (const item of groups[groupId]) {
        if (seen.has(item.key)) continue;
        seen.add(item.key);
        const disabled = SWITCH_GROUPS.every(
          (id) => !groups[id].some((other) => other.key === item.key) || domainOff(id),
        );
        entries.push({
          id: item.key,
          label: t(item.label),
          render: () => <SwitchSetting setting={item} disabled={disabled} />,
        });
      }
    }
    const jump = (label: string, target: SectionId | null, summary: string): SearchEntry => ({
      id: `jump-${label}`,
      label,
      render: () => <DrillRow label={label} summary={summary} onOpen={() => open(target)} />,
    });
    entries.push(
      jump(t('avatarRankModeSelectorTitle'), null, t('avatarSettings')),
      jump(t('avatarSkinSelectorTitle'), null, t('avatarSettings')),
      jump(t('domainPriorityTitle'), 'domainPreference', titles.domainPreference),
      jump(t('cleanerEnableTitle'), 'cleaner', titles.cleaner),
      jump(t('cleanerModeTitle'), 'cleaner', titles.cleaner),
      jump(t('cleanerCustomKeywordsTitle'), 'cleaner', titles.cleaner),
      jump(t('cleanerWhitelistTitle'), 'cleaner', titles.cleaner),
      jump(t('cleanerInterceptedTitle'), 'cleaner', titles.cleaner),
      jump(t('floatingPanelMode'), 'floatingPanel', titles.floatingPanel),
      jump(t('panelWidth'), 'floatingPanel', titles.floatingPanel),
      ...drillRows.map((row) => jump(titles[row.id], row.id, row.summary)),
    );
    return entries;
  };

  const renderSection = (id: SectionId): ReactNode => {
    if (id === 'cleaner') return <FeedCleanerSettingsSection focusRequest={cleanerFocus} />;
    if (id === 'domainPreference') return <DomainSettings />;
    if (id === 'floatingPanel') return <FloatingPanelSettings />;
    if (id === 'evm') return <EvmAddressSettings userInfo={userInfo} onSaved={() => setCacheBust(Date.now())} />;
    const disabled = domainOff(id);
    return (
      <>
        {disabled ? (
          <p className={cx('text-[11.5px] leading-relaxed text-xh-fg-2 native:text-[13px]', ROW_PAD)}>
            {t('settingsDomainDisabled')}
          </p>
        ) : null}
        {groups[id].map((item) => (
          <SwitchSetting key={item.key} setting={item} disabled={disabled} />
        ))}
      </>
    );
  };

  const q = query.trim().toLowerCase();
  const results = q ? searchEntries().filter((entry) => entry.label.toLowerCase().includes(q)) : [];

  return (
    <div data-xhunt-testid='settings-page' className='flex h-full min-h-0 flex-col'>
      <PanelPageHeader
        title={section ? titles[section] : t('settingsTitle')}
        showBack={showBackButton}
        onBack={section ? () => setSection(null) : undefined}
        onClose={onClose}
      />
      {isLoading ? (
        <div className='flex flex-1 items-center justify-center py-10'>
          <span aria-hidden='true' className='size-6 animate-spin rounded-full border-2 border-xh-fg-3 border-t-transparent' />
        </div>
      ) : (
        <SettingsProvider value={{ settingStates, realtimeMode }}>
          {section ? null : (
            <div className='soft:pb-2 obsidian:px-3 obsidian:pb-2 native:px-4 native:pb-2'>
              <SearchField
                aria-label={t('settingsSearchLabel')}
                placeholder={t('settingsSearchPlaceholder')}
                value={query}
                onValueChange={setQuery}
                testId='settings-search'
              />
            </div>
          )}
          <div className='custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden obsidian:px-3 obsidian:pb-2'>
            {section ? (
              <section key={section} data-xhunt-testid={`settings-group-${section}`}>
                <div data-settings-body='' className={SECTION_BODY}>
                  {renderSection(section)}
                </div>
              </section>
            ) : q ? (
              <div data-settings-body='' className={SECTION_BODY}>
                {results.length ? (
                  results.map((entry) => <Fragment key={entry.id}>{entry.render()}</Fragment>)
                ) : (
                  <EmptyState>{t('settingsNoResults')}</EmptyState>
                )}
              </div>
            ) : (
              <div className='flex flex-col soft:gap-2'>
                <SettingsGroup id='others' title={t('settingsGroupGeneral')}>
                  <GeneralSettings items={groups.others} />
                </SettingsGroup>
                <SettingsGroup id='avatarSettings' title={t('avatarSettings')}>
                  <AvatarRankSettings items={groups.avatarSettings} />
                </SettingsGroup>
                <SettingsGroup id='more' title={t('settingsGroupMore')} collapsible={false}>
                  {drillRows.map((row) => (
                    <DrillRow
                      key={row.id}
                      testId={`settings-group-header-${row.id}`}
                      label={titles[row.id]}
                      summary={row.summary}
                      onOpen={() => open(row.id)}
                    />
                  ))}
                </SettingsGroup>
              </div>
            )}
          </div>
          <SettingsFooter token={token} />
        </SettingsProvider>
      )}
    </div>
  );
};

export default SettingsPage;
