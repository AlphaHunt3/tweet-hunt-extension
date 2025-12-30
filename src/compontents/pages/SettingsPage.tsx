import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanelHeader,
  useNavigation,
} from '~/compontents/navigation/PanelNavigator';
import { useI18n } from '~contents/hooks/i18n.ts';
import { settingsConfig, useAllSettings } from '~/utils/settingsManager.ts';
import { useCrossPageSettings } from '~utils/settingsManager.ts';
import packageJson from '../../../package.json';
import { Github, Play, ChevronDown, ChevronRight, Info } from 'lucide-react';
import HeaderRightControls from '~/compontents/navigation/HeaderRightControls';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { localStorageInstance } from '~storage/index.ts';
import { useDebounceFn } from 'ahooks';
import { defaultSound } from '~compontents/pages/constants.tsx';
import {
  updateUserInfo,
  updateEvmAddresses,
} from '~contents/services/review.ts';
import { UserInfo } from '~types/review.ts';
import { configManager } from '~utils/configManager.ts';
import { useInterceptShortcuts } from '~contents/hooks/useInterceptShortcuts.ts';
import { cleanErrorMessage } from '~utils/dataValidation';
import { getCurrentUsername } from '~contents/utils/helpers.ts';

// Chrome 类型声明
declare const chrome: any;

const SOUND_FILES = [
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1009.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1478.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1561.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1873.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y2181.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y899.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/14428.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/15011.mp3',
];

interface SettingsPageProps {
  showBackButton?: boolean;
  onClose?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  showBackButton = true,
  onClose,
}) => {
  const { t, lang, setLang } = useI18n();
  const { navigateTo } = useNavigation();
  const { settingStates, isLoading } = useAllSettings();
  const {
    disableTesting,
    setDisableTesting,
    isTesterOnly,
    testersListStr,
    isCanaryUser,
  } = useCrossPageSettings();
  // 本地缓存音频（单键存储）：{ url, data }
  const [sound, setSound, { isLoading: isSoundStoreLoading }] =
    useLocalStorage<{
      url: string;
      data: string;
    }>('@xhunt/sound', { url: '', data: '' });
  const [isSoundLoading, setIsSoundLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useLocalStorage<number>(
    '@xhunt/panelWidth',
    340
  );
  const [panelWidthTemp, setPanelWidthTemp] = useState<number>(340);
  const [floatingPanelMode, setFloatingPanelMode] = useLocalStorage<
    'default' | 'persistent'
  >('@xhunt/floatingPanelMode', 'default');
  const [token] = useLocalStorage('@xhunt/token', '');

  // 用户信息缓存时间戳，用于绕过协商缓存
  const [userInfoCacheBust, setUserInfoCacheBust] = useLocalStorage<number>(
    '@xhunt/userInfoCacheBust',
    Date.now()
  );

  // EVM 地址绑定相关状态
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  const [evmAddress, setEvmAddress] = useState<string>('');
  const [evmAddressError, setEvmAddressError] = useState<string>('');
  const [evmAddressSuccess, setEvmAddressSuccess] = useState<string>('');
  const [isSavingEvmAddress, setIsSavingEvmAddress] = useState(false);
  const [realtimeMode, setRealtimeMode] = useState<
    'SSE' | 'Polling' | 'Inactive'
  >('Inactive');
  const evmAddressInputRef = useRef<HTMLInputElement | null>(null);
  const currentInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(
    null
  );
  const isComposingRef = useRef<boolean>(false);

  useInterceptShortcuts(currentInputRef, isComposingRef);

  // 获取实时订阅状态
  const fetchRealtimeStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_REALTIME_STATUS',
      });
      if (response?.success && response?.data) {
        setRealtimeMode(response.data.mode || 'Inactive');
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  useEffect(() => {
    if (!settingStates.showRealtimeSubscription?.get) {
      setRealtimeMode('Inactive');
      return;
    }

    // 立即获取一次
    fetchRealtimeStatus();

    // 设置定时器
    const interval = setInterval(() => {
      fetchRealtimeStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, [settingStates.showRealtimeSubscription?.get]);

  const { run: debouncedResetPanelPosition } = useDebounceFn(
    () => {
      try {
        const event = new CustomEvent('xhunt:reset-panel-position', {
          detail: {
            storageKey: 'fixed-twitter-panel',
            rightOffset: 30,
            y: 50,
          },
        } as any);
        window.dispatchEvent(event);
      } catch {}
    },
    { wait: 200 }
  );

  const applyPanelWidthAndReset = async () => {
    await setPanelWidth(panelWidthTemp);
    debouncedResetPanelPosition();
  };

  // 防抖播放，避免短时间内重复触发
  const { run: debouncedPlay } = useDebounceFn(
    (url: string) => {
      if (url) playSound(url);
    },
    { wait: 300 }
  );

  useEffect(() => {
    const clampSnap = (v: number) =>
      Math.min(400, Math.max(300, Math.round((Number(v) || 340) / 10) * 10));
    setPanelWidthTemp(clampSnap(panelWidth));
  }, [panelWidth]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>('');

  useEffect(() => {
    getCurrentUsername()
      .then((name) => setCurrentUsername(name || ''))
      .catch(() => setCurrentUsername(''));
  }, []);

  // 分组设置配置
  const groupedSettings = useMemo(() => {
    const cfg: any = configManager.getConfig();
    const features: string[] =
      (cfg && cfg.testConfig && cfg.testConfig.features) || [];
    const testers: string[] =
      (cfg && cfg.testConfig && cfg.testConfig.testers) || [];
    const username = currentUsername || undefined;
    const isTester = username
      ? testers.includes(username) && !disableTesting
      : false;

    const gated = new Set(features);
    const shouldShow = (k: string) => {
      if (!gated.has(k)) return true;
      return isTester;
    };

    const filterItems = (items: Array<{ key: string; label: string }>) =>
      items.filter((it) => shouldShow(it.key));

    return {
      profilePage: filterItems([
        ...settingsConfig.nameRight,
        ...settingsConfig.followedRight,
        { key: 'showSearchPanel', label: 'showProfileChanges' },
        { key: 'showNotes', label: 'showNotes' },
        { key: 'showOfficialTags', label: 'showOfficialTags' },
      ]),
      homeRightSidebar: filterItems([
        { key: 'showAnnualReport', label: 'showAnnualReport' },
        { key: 'showHunterCampaign', label: 'showHunterCampaign' },
        { key: 'showHotTrending', label: 'showHotTrending' },
        { key: 'showEngageToEarn', label: 'showEngageToEarn' },
        { key: 'showRealtimeSubscription', label: 'showRealtimeSubscription' },
        { key: 'enableBnbFeeds', label: 'enableBnbFeeds' },
        { key: 'enableGossip', label: 'enableGossip' },
        { key: 'enableListing', label: 'enableListing' },
      ]),
      others: filterItems([
        { key: 'showSidebarIcon', label: 'showSidebarIcon' },
        { key: 'showAvatarRank', label: 'showAvatarRank' },
        { key: 'showTokenAnalysis', label: 'showTokenAnalysis' },
        { key: 'showTweetAIAnalysis', label: 'showTweetAIAnalysis' },
        {
          key: 'showArticleBottomRightArea',
          label: 'showArticleBottomRightArea',
        },
      ]),
    };
  }, [currentUsername, disableTesting]);

  // 分组展开状态管理
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      profilePage: false,
      homeRightSidebar: false,
      floatingPanel: false,
      others: true, // 其他分组默认展开
    }
  );

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const soundOptions = useMemo(() => {
    return [
      // { label: t('mute'), value: '__MUTE__' },
      ...SOUND_FILES.map((url, idx) => ({
        label: `${t('sound')}${idx + 1}`,
        value: url,
      })),
    ];
  }, [lang]);

  const playSound = (url: string) => {
    try {
      if (!url) return;
      const event = new CustomEvent('xhunt:play-sound', { detail: { url } });
      window.dispatchEvent(event);
    } catch {}
  };

  const fetchAndCacheSound = async (url: string) => {
    try {
      if (!url) return '';
      const resp = await fetch(url, { mode: 'cors' });
      const blob = await resp.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 清理缓存（扩展本地存储 + 网页 localStorage 中与 xhunt 相关的键）
  const handleClearCache = async () => {
    try {
      // 二次确认
      const confirmed = window.confirm(
        (t && t('clearCacheConfirm')) ||
          'Are you sure you want to clear all XHunt caches? This cannot be undone.'
      );
      if (!confirmed) return;
    } catch {}
    try {
      // 1) 清理扩展的 chrome.storage.local 区域（通过 Plasmo Storage）
      try {
        await localStorageInstance.clear();
      } catch {}

      // 兜底：直接调用 chrome.storage.local.clear（某些键可能不是通过 Plasmo 写入）
      try {
        if (chrome?.storage?.local?.clear) {
          await new Promise<void>((resolve) => {
            chrome.storage.local.clear(() => resolve());
          });
        }
      } catch {}

      // 2) 清理网页 localStorage 中与 xhunt 相关的键
      try {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i) || '';
          keys.push(key);
        }
        keys.forEach((key) => {
          if (key.includes('xhunt') || key.includes('@xhunt')) {
            window.localStorage.removeItem(key);
          }
        });
      } catch {}

      try {
        window.location.reload();
      } catch {}
    } catch {}
  };

  const renderSettingItem = (setting: { key: string; label: string }) => {
    const state = settingStates[setting.key as keyof typeof settingStates];
    if (!state) return null;

    // 如果是子选项（BNB Feeds、Gossip或Listing），且"显示实时订阅"关闭，则不显示
    const isSubOption =
      setting.key === 'enableBnbFeeds' ||
      setting.key === 'enableGossip' ||
      setting.key === 'enableListing';
    if (isSubOption && !settingStates.showRealtimeSubscription.get) {
      return null;
    }

    // 特殊处理BNB Feeds、Gossip和Listing的限制逻辑
    const handleChange = (checked: boolean) => {
      if (
        setting.key === 'enableBnbFeeds' ||
        setting.key === 'enableGossip' ||
        setting.key === 'enableListing'
      ) {
        // 如果要关闭当前项，检查其他两个是否都已经关闭
        if (!checked) {
          const otherKeys = [
            'enableBnbFeeds',
            'enableGossip',
            'enableListing',
          ].filter((key) => key !== setting.key);
          const otherStates = otherKeys.map((key) => settingStates[key]);

          // 如果其他两个都已经关闭，不允许关闭当前项
          if (otherStates.every((state) => !state.get)) {
            return; // 不允许关闭
          }
        }
      }
      state.set(checked);
    };

    // 判断是否为最后一个启用的选项
    const isLastEnabled =
      isSubOption &&
      (() => {
        const bnbState = settingStates.enableBnbFeeds;
        const gossipState = settingStates.enableGossip;
        const listingState = settingStates.enableListing;

        // 如果当前项是启用的，且其他两个都是禁用的，则当前项是最后一个
        if (setting.key === 'enableBnbFeeds') {
          return bnbState.get && !gossipState.get;
        } else if (setting.key === 'enableGossip') {
          return gossipState.get && !bnbState.get;
        } else if (setting.key === 'enableListing') {
          return listingState.get && !bnbState.get && !gossipState.get;
        }
        return false;
      })();

    // 是否为"显示实时订阅"设置项
    const isRealtimeSubscription = setting.key === 'showRealtimeSubscription';

    return (
      <div
        key={setting.key}
        className={`flex items-center justify-between py-1.5 ${
          isSubOption ? 'px-6' : 'px-3'
        }`}
      >
        <span
          className={`text-[13px] leading-tight ${
            isSubOption ? 'text-[12px]' : ''
          } flex items-center gap-2`}
        >
          {isSubOption && '• '}
          {t(setting.label)}
          {isRealtimeSubscription && state.get && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium scale-90 ${
                realtimeMode === 'SSE'
                  ? 'bg-emerald-600/15 text-emerald-500 border border-emerald-600/25'
                  : realtimeMode === 'Polling'
                  ? 'bg-indigo-600/15 text-indigo-500 border border-indigo-600/25'
                  : 'bg-slate-600/15 text-slate-400 border border-slate-600/25'
              }`}
            >
              {/* <span>🏷️</span> */}
              <span>{realtimeMode}</span>
            </span>
          )}
        </span>
        <label className={`relative inline-flex items-center shrink-0`}>
          <input
            type='checkbox'
            className='sr-only peer'
            checked={state.get}
            disabled={isLastEnabled}
            onChange={(e) => handleChange(e.target.checked)}
          />
          {isSubOption ? (
            // Checkbox样式
            <div
              className={`relative w-4 h-4 border-2 peer-focus:outline-none rounded transition-all border-gray-400 peer-checked:bg-blue-500 peer-checked:border-blue-500 ${
                isLastEnabled ? 'opacity-60' : ''
              }`}
            >
              {state.get && (
                <svg
                  className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white`}
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
              )}
            </div>
          ) : (
            // 滑动开关样式
            <div className="relative w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
          )}
        </label>
      </div>
    );
  };

  const renderSettingsGroup = (
    groupKey: string,
    groupTitle: string,
    settings: Array<{ key: string; label: string }>
  ) => {
    const isExpanded = expandedGroups[groupKey];
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

    return (
      <div
        key={groupKey}
        className='theme-bg-tertiary/70 ml-1 mr-1 rounded-r-md mb-2'
      >
        {/* 分组标题 */}
        <div
          className='flex items-center justify-between py-1.5 px-3 cursor-pointer hover:theme-bg-tertiary/50 transition-colors rounded-md'
          onClick={() => toggleGroup(groupKey)}
        >
          <span className='text-[12px] font-semibold theme-text-primary tracking-wide'>
            {groupTitle}
          </span>
          <ChevronIcon className='w-3.5 h-3.5 theme-text-secondary' />
        </div>

        {/* 分组内容 */}
        {isExpanded && (
          <div className='border-t theme-border'>
            {/* 悬浮面板设置专属：模式选择和面板宽度 */}
            {groupKey === 'floatingPanel' && (
              <>
                {/* 悬浮面板模式选择 */}
                <div className='flex items-center justify-between py-1.5 px-3'>
                  <span className='text-[13px] theme-text-primary leading-tight'>
                    {t('floatingPanelMode')}
                  </span>
                  <label className='relative inline-flex items-center cursor-pointer shrink-0'>
                    <div className='inline-flex items-center gap-2 theme-bg-tertiary rounded-md p-0.5'>
                      <button
                        className={`px-2 py-1 text-[11px] rounded ${
                          floatingPanelMode === 'default'
                            ? 'bg-blue-500 text-white'
                            : 'theme-text-secondary hover:theme-text-primary'
                        }`}
                        onClick={() => setFloatingPanelMode('default')}
                      >
                        {t('floatingPanelModeDefault')}
                      </button>
                      <button
                        className={`px-2 py-1 text-[11px] rounded ${
                          floatingPanelMode === 'persistent'
                            ? 'bg-blue-500 text-white'
                            : 'theme-text-secondary hover:theme-text-primary'
                        }`}
                        onClick={() => setFloatingPanelMode('persistent')}
                      >
                        {t('floatingPanelModePersistent')}
                      </button>
                    </div>
                  </label>
                </div>
                {/* 悬浮框宽度设置 */}
                <div className='flex items-center justify-between py-1.5 px-3'>
                  <span className='text-[13px] theme-text-primary leading-tight'>
                    {t('panelWidth')}
                  </span>
                  <div className='flex items-center gap-2'>
                    <input
                      type='range'
                      min={300}
                      max={400}
                      step={10}
                      className='w-32 h-2'
                      value={panelWidthTemp}
                      onChange={(e) => {
                        const v = Math.min(
                          400,
                          Math.max(
                            300,
                            Math.round((Number(e.target.value) || 340) / 10) *
                              10
                          )
                        );
                        setPanelWidthTemp(v);
                      }}
                      onMouseUp={applyPanelWidthAndReset}
                      onTouchEnd={applyPanelWidthAndReset}
                      onKeyUp={applyPanelWidthAndReset}
                    />
                  </div>
                </div>
              </>
            )}
            {/* 基础设置专属：语言和音频选择 */}
            {groupKey === 'others' && (
              <>
                <div
                  key={'language'}
                  className='flex items-center justify-between py-1.5 px-3'
                >
                  <span className='text-[13px] theme-text-primary leading-tight'>
                    {t('language')}
                  </span>
                  <label className='relative inline-flex items-center cursor-pointer shrink-0'>
                    <div className='inline-flex items-center gap-2 theme-bg-tertiary rounded-md p-0.5'>
                      <button
                        className={`px-2 py-1 text-[11px] rounded ${
                          lang === 'en'
                            ? 'bg-blue-500 text-white'
                            : 'theme-text-secondary hover:theme-text-primary'
                        }`}
                        onClick={() => setLang('en')}
                      >
                        EN
                      </button>
                      <button
                        className={`px-2 py-1 text-[11px] rounded ${
                          lang === 'zh'
                            ? 'bg-blue-500 text-white'
                            : 'theme-text-secondary hover:theme-text-primary'
                        }`}
                        onClick={() => setLang('zh')}
                      >
                        中
                      </button>
                    </div>
                  </label>
                </div>
                {/* 提示音效选择 */}
                <div
                  key={'sound'}
                  className='flex items-center justify-between py-1.5 px-3'
                >
                  <span className='text-[13px] theme-text-primary leading-tight'>
                    {t('soundEffect')}
                  </span>
                  <div className='relative inline-flex items-center cursor-pointer shrink-0 gap-2'>
                    <select
                      className={`text-[12px] theme-text-primary theme-bg-tertiary rounded-md px-2 py-1 focus:outline-none focus:ring-0 focus:border-transparent ${
                        isSoundLoading || isSoundStoreLoading
                          ? 'opacity-60 pointer-events-none'
                          : ''
                      }`}
                      value={sound?.url || ''}
                      disabled={isSoundLoading || isSoundStoreLoading}
                      onChange={async (e) => {
                        const url = e.target.value;
                        if (url === '__MUTE__') {
                          setSound({ url, data: '' });
                          return;
                        }
                        setIsSoundLoading(true);
                        try {
                          const dataUrl = await fetchAndCacheSound(url);
                          if (dataUrl) {
                            setSound({ url, data: dataUrl });
                            debouncedPlay(dataUrl);
                          }
                        } finally {
                          setIsSoundLoading(false);
                        }
                      }}
                    >
                      <option value='' disabled>
                        {t('select')}
                      </option>
                      {soundOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type='button'
                      aria-label={t('play')}
                      className='inline-flex items-center justify-center rounded-md px-1 py-0.5 theme-bg-tertiary hover:theme-bg-tertiary/80 theme-text-primary border theme-border'
                      disabled={
                        !sound ||
                        sound.url === '__MUTE__' ||
                        !sound.data ||
                        isSoundLoading ||
                        isSoundStoreLoading
                      }
                      onClick={() =>
                        sound &&
                        sound.url !== '__MUTE__' &&
                        sound.data &&
                        debouncedPlay(sound.data)
                      }
                      title={t('playSelectedSound')}
                    >
                      <Play className='w-3 h-3' />
                    </button>
                  </div>
                </div>
              </>
            )}
            {settings.map(renderSettingItem)}
          </div>
        )}
      </div>
    );
  };

  // 初始化默认提示音：若尚未缓存，则使用 defaultSound
  useEffect(() => {
    try {
      if (
        !isSoundStoreLoading &&
        (!sound || (!sound.data && sound.url !== '__MUTE__')) &&
        defaultSound?.data
      ) {
        setSound({ url: defaultSound.url, data: defaultSound.data });
      }
    } catch {}
  }, [isSoundStoreLoading, sound?.data, setSound]);

  // 获取用户信息并同步到 @xhunt/user
  useEffect(() => {
    if (token) {
      updateUserInfo(userInfoCacheBust).then((info) => {
        if (info) {
          setUserInfo(info);
          // updateUserInfo 已经统一同步到 @xhunt/user，这里不需要再同步
          // 如果有已绑定的地址，设置到输入框
          if (info.evmAddresses && info.evmAddresses.length > 0) {
            setEvmAddress(info.evmAddresses[0]);
          }
        }
      });
    } else {
      setUserInfo(undefined);
      setEvmAddress('');
    }
  }, [token, userInfoCacheBust]);

  // EVM地址正则表达式（以0x开头，后跟40个十六进制字符）
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;

  // 验证EVM地址格式
  const isValidEvmAddress = (address: string): boolean => {
    if (!address || address.length === 0) return true; // 空地址视为有效（可选）
    return evmRegex.test(address);
  };

  // 处理 EVM 地址输入变化
  const handleEvmAddressChange = (value: string) => {
    // 移除空格和特殊字符，只保留字母数字和0x前缀
    const cleanedValue = value.replace(/[^a-fA-F0-9x]/g, '');

    // 如果输入的不是以0x开头，自动添加
    let formattedValue = cleanedValue;
    if (cleanedValue && !cleanedValue.startsWith('0x')) {
      formattedValue = '0x' + cleanedValue;
    }

    // 限制长度为42（0x + 40位十六进制）
    if (formattedValue.length <= 42) {
      setEvmAddress(formattedValue);
      setEvmAddressError('');
      setEvmAddressSuccess('');
    }
  };

  // 保存 EVM 地址
  const handleSaveEvmAddress = async () => {
    if (!token) return;

    // 验证地址格式
    if (evmAddress && !isValidEvmAddress(evmAddress)) {
      setEvmAddressError(
        t('mantleHunterEvmAddressFormatIncorrect') ||
          'Invalid EVM address format'
      );
      return;
    }

    setIsSavingEvmAddress(true);
    setEvmAddressError('');
    setEvmAddressSuccess('');

    try {
      // 构建地址数组，如果地址为空则传空数组，否则传单个地址的数组
      const addresses =
        evmAddress && evmAddress.trim() ? [evmAddress.trim()] : [];
      const updatedInfo = await updateEvmAddresses(addresses);

      if (updatedInfo) {
        // 更新缓存时间戳，useEffect 会自动触发重新获取用户信息以绕过协商缓存
        setUserInfoCacheBust(Date.now());
        setEvmAddressSuccess(t('evmBindSuccess'));
      } else {
        setEvmAddressError(t('noteSaveFailed') || 'Save failed');
      }
    } catch (err: any) {
      // Check if error has errorDetails (from the new error format)
      if (err?.errorDetails) {
        const { error, message } = err.errorDetails;
        let errorMsg = cleanErrorMessage(message || error || err || '');

        setEvmAddressError(errorMsg);
      } else {
        // Fallback to generic error message
        setEvmAddressError(
          cleanErrorMessage(
            err?.message || t('noteSaveFailed') || 'Save failed'
          )
        );
      }
    } finally {
      setIsSavingEvmAddress(false);
    }
  };

  return (
    <div className='flex flex-col h-full min-h-0'>
      <PanelHeader
        title={<span>{t('settingsTitle')}</span>}
        showBackButton={showBackButton}
        rightContent={
          <HeaderRightControls
            onOpenMessages={() => navigateTo('/messages')}
            onClose={onClose}
            onOpenSettings={() => {}}
          />
        }
      />
      {isLoading ? (
        <div className='flex-1 flex items-center justify-center'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2'></div>
        </div>
      ) : (
        <>
          <div className='flex-1 min-h-0 overflow-y-auto scrollbar-hide'>
            <div className='py-2'>
              <div className='theme-bg-tertiary/70 ml-1 mr-1 rounded-r-md'>
                {/* 分组设置：将基础设置放到最前 */}
                {renderSettingsGroup(
                  'others',
                  t('otherSettings'),
                  groupedSettings.others
                )}
                {renderSettingsGroup(
                  'profilePage',
                  t('profilePageSettings'),
                  groupedSettings.profilePage
                )}
                {renderSettingsGroup(
                  'homeRightSidebar',
                  t('homeRightSidebar'),
                  groupedSettings.homeRightSidebar
                )}
                {renderSettingsGroup(
                  'floatingPanel',
                  t('floatingPanelSettings'),
                  []
                )}
                {/* 测试分组（仅测试者可见）*/}
                {isTesterOnly && (
                  <div className='theme-bg-tertiary/70 ml-1 mr-1 rounded-r-md mb-2'>
                    {/* 分组标题 */}
                    <div className='flex items-center justify-between py-1.5 px-3 cursor-pointer hover:theme-bg-tertiary/50 transition-colors rounded-md'>
                      <span className='text-[12px] font-semibold theme-text-primary tracking-wide flex items-center gap-1.5'>
                        {t('testerSettings')}
                        <span className='inline-flex items-center gap-1 group relative'>
                          <Info className='w-3 h-3 theme-text-secondary/70 hover:theme-text-secondary cursor-pointer transition-colors' />
                          <div className='absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-[11px] px-2 py-1 rounded shadow-lg z-10 min-w-[200px] max-w-[360px] whitespace-normal'>
                            {t('testerSettingsInfo').replace(
                              '{list}',
                              testersListStr
                            )}
                            <div className='absolute top-full left-4 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
                          </div>
                        </span>
                      </span>
                    </div>
                    {/* 分组内容 */}
                    <div className='border-t theme-border'>
                      <div className='flex items-center justify-between py-1.5 px-3'>
                        <span className='text-[13px] theme-text-primary leading-tight inline-flex items-center gap-1.5'>
                          {t('disableTesting')}
                          <span className='inline-flex items-center gap-1 group relative'>
                            <Info className='w-3 h-3 theme-text-secondary/70 hover:theme-text-secondary cursor-pointer transition-colors' />
                            <div className='absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-[11px] px-2 py-1 rounded shadow-lg z-10 min-w-[200px] max-w-[360px] whitespace-normal'>
                              {t('disableTestingInfo')}
                              <div className='absolute top-full left-4 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
                            </div>
                          </span>
                        </span>
                        <label className='relative inline-flex items-center shrink-0'>
                          <input
                            type='checkbox'
                            className='sr-only peer'
                            checked={disableTesting}
                            onChange={(e) =>
                              setDisableTesting(e.target.checked)
                            }
                          />
                          <div className="relative w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                {/* 已合并：Profile 页面右侧栏设置并入 Profile 页面设置 */}
              </div>
              <div className='h-2' />

              {/* EVM 地址绑定 - 仅登录时显示 */}
              {token && (
                <div className='theme-bg-tertiary/70 ml-1 mr-1 rounded-r-md mb-2'>
                  {/* 分组标题 */}
                  <div className='flex items-center justify-between py-1.5 px-3'>
                    <div className='flex items-center gap-1.5 group relative'>
                      <span className='text-[12px] font-semibold theme-text-primary tracking-wide cursor-pointer'>
                        {t('evmAddressBinding')}
                      </span>
                      <Info className='w-3 h-3 theme-text-secondary/60 hover:theme-text-secondary cursor-pointer transition-colors' />
                      <div className='absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg z-10 min-w-[200px] max-w-[320px] whitespace-normal'>
                        {t('evmAddressBindingTip')}
                        <div className='absolute top-full left-4 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800'></div>
                      </div>
                    </div>
                  </div>

                  {/* 分组内容 */}
                  <div className='border-t theme-border'>
                    <div className='flex items-center justify-between py-1.5 px-3 gap-2'>
                      <input
                        type='text'
                        value={evmAddress}
                        onChange={(e) => handleEvmAddressChange(e.target.value)}
                        placeholder={
                          t('mantleHunterPlaceholderEvmAddress') || '0x...'
                        }
                        ref={evmAddressInputRef}
                        className='flex-1 text-[10px] theme-text-primary theme-bg-tertiary rounded-md px-2 py-1.5 outline-none border theme-border focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/20 transition-all placeholder:theme-text-secondary/60'
                        onFocus={() => {
                          currentInputRef.current = evmAddressInputRef.current;
                        }}
                        onBlur={() => {
                          currentInputRef.current = null;
                        }}
                        onCompositionStart={() => {
                          isComposingRef.current = true;
                        }}
                        onCompositionEnd={() => {
                          isComposingRef.current = false;
                        }}
                      />
                      <button
                        onClick={handleSaveEvmAddress}
                        disabled={
                          isSavingEvmAddress ||
                          (evmAddress.length > 0 &&
                            !isValidEvmAddress(evmAddress))
                        }
                        className='inline-flex items-center justify-center px-2 py-1.5 text-[11px] font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0 disabled:hover:bg-blue-500'
                      >
                        {isSavingEvmAddress ? (
                          <div className='w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin' />
                        ) : userInfo?.evmAddresses &&
                          userInfo.evmAddresses.length > 0 ? (
                          t('modify')
                        ) : (
                          t('save')
                        )}
                      </button>
                    </div>
                    {/* 成功信息显示 */}
                    {evmAddressSuccess && (
                      <div className='mx-3 px-3 py-2 border-t theme-border bg-green-500/10 border-green-500/20'>
                        <div className='text-[11px] leading-relaxed whitespace-pre-line text-green-400 font-medium'>
                          {evmAddressSuccess}
                        </div>
                      </div>
                    )}
                    {/* 错误信息显示 */}
                    {(evmAddressError ||
                      (evmAddress &&
                        evmAddress.length > 0 &&
                        !isValidEvmAddress(evmAddress))) && (
                      <div
                        className={`mx-3 px-3 py-2 border-t theme-border ${
                          evmAddressError
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'theme-bg-tertiary/50'
                        }`}
                      >
                        <div
                          className={`text-[11px] leading-relaxed whitespace-pre-line ${
                            evmAddressError
                              ? 'text-red-400 font-medium'
                              : 'theme-text-secondary'
                          }`}
                        >
                          {evmAddressError ||
                            t('mantleHunterEvmAddressFormatIncorrect')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 底部信息 - 左侧图标（仅登录时显示），右侧版本/环境 */}
          <div className='sticky bottom-0 z-0 px-2 py-2 border-t theme-border theme-bg-secondary/95'>
            <div
              className={`flex items-center ${
                token ? 'justify-between' : 'justify-end'
              }`}
            >
              {token && (
                <div className='flex items-center gap-1'>
                  <a
                    href='https://x.com/xhunt_ai'
                    target='_blank'
                    rel='noopener noreferrer'
                    title='@xhunt_ai'
                    className='inline-flex items-center px-1.5 py-1 rounded-md hover:theme-bg-tertiary transition-colors'
                  >
                    <svg
                      viewBox='0 0 24 24'
                      className='w-4 h-4 fill-current theme-text-primary'
                    >
                      <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                    </svg>
                  </a>

                  <a
                    href='https://github.com/AlphaHunt3/tweet-hunt-extension'
                    target='_blank'
                    rel='noopener noreferrer'
                    title='GitHub'
                    className='inline-flex items-center px-1.5 py-1 rounded-md hover:theme-bg-tertiary transition-colors'
                  >
                    <Github className='w-4 h-4 theme-text-primary' />
                  </a>

                  <a
                    href='https://t.me/xhunt_ai'
                    target='_blank'
                    rel='noopener noreferrer'
                    title='Telegram'
                    className='inline-flex items-center px-1.5 py-1 rounded-md hover:theme-bg-tertiary transition-colors'
                  >
                    <svg
                      // t='1757566474599'
                      // class='icon'
                      viewBox='0 0 1024 1024'
                      version='1.1'
                      xmlns='http://www.w3.org/2000/svg'
                      p-id='4529'
                      width='18'
                      height='18'
                      className='fill-current theme-text-primary'
                    >
                      <path
                        fill='currentColor'
                        d='M834.24 127.872a95.168 95.168 0 0 0-29.856 7.136h-0.128c-9.12 3.616-52.48 21.856-118.4 49.504l-236.224 99.488c-169.504 71.36-336.128 141.632-336.128 141.632l1.984-0.768s-11.488 3.776-23.488 12a64.96 64.96 0 0 0-18.752 18.144c-5.888 8.64-10.624 21.856-8.864 35.52 2.88 23.104 17.856 36.96 28.608 44.608 10.88 7.744 21.248 11.36 21.248 11.36h0.256l156.256 52.64c7.008 22.496 47.616 156 57.376 186.752 5.76 18.368 11.36 29.856 18.368 38.624 3.392 4.48 7.36 8.224 12.128 11.232a35.808 35.808 0 0 0 7.872 3.392l-1.6-0.384c0.48 0.128 0.864 0.512 1.216 0.64 1.28 0.352 2.144 0.48 3.776 0.736 24.736 7.488 44.608-7.872 44.608-7.872l1.12-0.896 92.256-84 154.624 118.624 3.52 1.504c32.224 14.144 64.864 6.272 82.112-7.616 17.376-13.984 24.128-31.872 24.128-31.872l1.12-2.88 119.488-612.128c3.392-15.104 4.256-29.248 0.512-42.976a57.824 57.824 0 0 0-24.992-33.504 59.904 59.904 0 0 0-34.144-8.64z m-3.232 65.6c-0.128 2.016 0.256 1.792-0.64 5.664v0.352l-118.368 605.76c-0.512 0.864-1.376 2.752-3.744 4.64-2.496 1.984-4.48 3.232-14.88-0.896l-189.12-144.992-114.24 104.128 24-153.28 308.992-288c12.736-11.84 8.48-14.336 8.48-14.336 0.896-14.528-19.232-4.256-19.232-4.256l-389.632 241.376-0.128-0.64-186.752-62.88v-0.128l-0.48-0.096a8.64 8.64 0 0 0 0.96-0.384l1.024-0.512 0.992-0.352s166.752-70.272 336.256-141.632c84.864-35.744 170.368-71.744 236.128-99.52 65.76-27.616 114.368-47.872 117.12-48.96 2.624-1.024 1.376-1.024 3.264-1.024z'
                        p-id='4530'
                      ></path>
                    </svg>
                  </a>
                </div>
              )}

              <div className='flex items-center gap-2'>
                <span className='text-[11px] theme-text-secondary'>
                  {t('version')} {packageJson.version}
                </span>
                <span
                  className={`text-[11px] ${
                    // isTesterOnly
                    //   ? 'text-blue-800/60'
                    isCanaryUser ? 'text-yellow-800/60' : 'theme-text-secondary'
                  }`}
                >
                  {process.env.PLASMO_PUBLIC_ENV === 'dev' ? 'DEV' : 'BETA'}
                </span>
                {/* 轻量级清理缓存按钮：小型、次要视觉权重 */}
                <button
                  type='button'
                  onClick={handleClearCache}
                  className='inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-tertiary transition-colors'
                  title={t('clearCache')}
                >
                  {t('clearCache')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
