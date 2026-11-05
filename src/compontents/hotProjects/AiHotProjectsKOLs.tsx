import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Check,
  ChevronDown,
  FileText,
  Flame,
  Github,
  Images,
  MessageSquare,
  Users,
  X,
} from 'lucide-react';
import { useRequest } from 'ahooks';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage, useSessionStorage } from '~storage/useLocalStorage';
import {
  getAiTopInfluencer,
  getAiHotTweet,
  getAiTweetModel,
  getGithubTrending,
  getAiHotTweetMedia,
  getAiTrendingTweets,
} from '~contents/services/api.ts';
import { TrendingListVisualization } from '../HotProjectsKOLs/TrendingListVisualization';
import { HotItem } from '../HotProjectsKOLs/types';
import { GithubTrendingList } from '../HotProjectsKOLs/GithubTrendingList';
import { localStorageInstance } from '~storage/index.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { Tabs } from '../Tabs';
import { CloseConfirmDialog } from '../CloseConfirmDialog';
import { TweetList } from '../HotProjectsKOLs/TweetList';
import { HotTrendingEmptyState } from './HotTrendingEmptyState';
import { TweetTagFilter } from '../HotProjectsKOLs/TweetTagFilter';
import { ModelTreemapVisualization } from '../HotProjectsKOLs/ModelTreemapVisualization';
import { HotTweetMediaList } from '../HotProjectsKOLs/HotTweetMediaList';
import { SecondaryTabs } from '../SecondaryTabs';
import { ReplyAlphaTweetList } from '../HotProjectsKOLs/ReplyAlphaTweetList';

export interface AiHotProjectsKOLsProps {
  className?: string;
}

export function AiHotProjectsKOLs({ className = '' }: AiHotProjectsKOLsProps) {
  const contentScrollRef = React.useRef<HTMLDivElement | null>(null);
  const { t, lang } = useI18n();
  const { isEnabled } = useCrossPageSettings();
  const showHotTrendingEnabled = isEnabled('showHotTrendingAi');
  const showReplyAlpha = isEnabled('showReplyAlpha');
  const showReplyAlphaCnAi = isEnabled('showReplyAlphaCn_ai');
  const showReplyAlphaGlobalAi = isEnabled('showReplyAlphaGlobal_ai');
  const showReplyAlphaAi =
    showReplyAlpha && (showReplyAlphaCnAi || showReplyAlphaGlobalAi);
  const { hasWeb3 } = useUserDomain();

  const [activeType, setActiveType] = useLocalStorage<
    'person' | 'tweet' | 'reply' | 'media' | 'model' | 'github'
  >('@xhunt/aiHotProjectsActiveType', 'person');
  const [activeDays, setActiveDays] = useState<1 | 7>(1);
  const [activeMediaTab, setActiveMediaTab] = useState<'video' | 'photo'>(
    'video'
  );
  const [activeHours, setActiveHours] = useState<number>(
    activeType === 'model' ? 8 : 24
  );
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showModelViewDropdown, setShowModelViewDropdown] = useState(false);
  const regionDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const regionDropdownMenuRef = React.useRef<HTMLDivElement | null>(null);
  const modelViewDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const modelViewDropdownMenuRef = React.useRef<HTMLDivElement | null>(null);
  const githubTimeDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const githubTimeDropdownMenuRef = React.useRef<HTMLDivElement | null>(null);
  const githubLangDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const githubLangDropdownMenuRef = React.useRef<HTMLDivElement | null>(null);
  const daysDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const daysDropdownMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [modelViewMode, setModelViewMode] = useLocalStorage<'family' | 'variant'>(
    '@xhunt/modelTreemapViewMode',
    'variant'
  );
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false);
  const [region, setRegion] = useLocalStorage<'cn' | 'global' | ''>(
    '@xhunt/aiHotProjectsRegion',
    ''
  );
  const [githubTimeWindow, setGithubTimeWindow] = useLocalStorage<'daily' | 'weekly' | 'monthly'>(
    '@xhunt/githubTimeWindow',
    'daily'
  );
  const [githubSpokenLanguage, setGithubSpokenLanguage] = useLocalStorage<'all' | 'zh' | 'en'>(
    '@xhunt/githubSpokenLanguage',
    'all'
  );
  const [showGithubTimeDropdown, setShowGithubTimeDropdown] = useState(false);
  const [showGithubLangDropdown, setShowGithubLangDropdown] = useState(false);

  useEffect(() => {
    if (!showHotTrendingEnabled || isHidden) {
      setShowRegionDropdown(false);
      setShowModelViewDropdown(false);
      setShowGithubTimeDropdown(false);
      setShowGithubLangDropdown(false);
      setShowDaysDropdown(false);
      return;
    }

    if (activeType === 'model' || activeType === 'github') {
      setShowRegionDropdown(false);
    }

    if (activeType !== 'model') {
      setShowModelViewDropdown(false);
    }

    if (activeType !== 'github') {
      setShowGithubTimeDropdown(false);
      setShowGithubLangDropdown(false);
    }

    if (activeType === 'github' || activeType === 'reply') {
      setShowDaysDropdown(false);
    }
  }, [activeType, isHidden, showHotTrendingEnabled]);

  useEffect(() => {
    if (
      !showRegionDropdown &&
      !showModelViewDropdown &&
      !showGithubTimeDropdown &&
      !showGithubLangDropdown &&
      !showDaysDropdown
    ) {
      return;
    }

    const isPointInside = (
      event: PointerEvent,
      refs: React.RefObject<HTMLDivElement>[],
    ) => refs.some((ref) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return false;

      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    });

    const handlePointerDown = (event: PointerEvent) => {
      if (
        showRegionDropdown &&
        !isPointInside(event, [regionDropdownRef, regionDropdownMenuRef])
      ) {
        setShowRegionDropdown(false);
      }

      if (
        showModelViewDropdown &&
        !isPointInside(event, [modelViewDropdownRef, modelViewDropdownMenuRef])
      ) {
        setShowModelViewDropdown(false);
      }

      if (
        showGithubTimeDropdown &&
        !isPointInside(event, [githubTimeDropdownRef, githubTimeDropdownMenuRef])
      ) {
        setShowGithubTimeDropdown(false);
      }

      if (
        showGithubLangDropdown &&
        !isPointInside(event, [githubLangDropdownRef, githubLangDropdownMenuRef])
      ) {
        setShowGithubLangDropdown(false);
      }

      if (
        showDaysDropdown &&
        !isPointInside(event, [daysDropdownRef, daysDropdownMenuRef])
      ) {
        setShowDaysDropdown(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [
    showRegionDropdown,
    showModelViewDropdown,
    showGithubTimeDropdown,
    showGithubLangDropdown,
    showDaysDropdown,
  ]);

  const selectedRegion = region || (lang === 'zh' ? 'cn' : 'global');
  const replyAlphaFallbackRegion = showReplyAlphaCnAi ? 'cn' : 'global';
  const currentRegion =
    activeType === 'reply' &&
      showReplyAlphaAi &&
      !(
        (selectedRegion === 'cn' && showReplyAlphaCnAi) ||
        (selectedRegion === 'global' && showReplyAlphaGlobalAi)
      )
      ? replyAlphaFallbackRegion
      : selectedRegion;

  const [tweetTagFilter, setTweetTagFilter] = useSessionStorage<{
    type: 'domain' | 'hot' | null;
    groupId: string | null;
    subTagId: string | null;
    hotTag: string | null;
  }>('@xhunt/aiTweetTagFilter', {
    type: null,
    groupId: null,
    subTagId: null,
    hotTag: null,
  });

  // 切换到 tweet 默认 24h，切换到 model 默认 8h
  useEffect(() => {
    if (activeType === 'tweet') {
      setActiveHours(24);
    } else if (activeType === 'model') {
      setActiveHours(8);
    } else if (activeType === 'reply') {
      setShowDaysDropdown(false);
    }
  }, [activeType]);

  useEffect(() => {
    if (!showReplyAlphaAi && activeType === 'reply') {
      setActiveType('tweet');
    }
  }, [activeType, setActiveType, showReplyAlphaAi]);

  // GitHub trending 数据请求
  const {
    data: githubTrendingData,
    loading: githubTrendingLoading,
    run: fetchGithubTrendingData,
  } = useRequest(() => getGithubTrending(), {
    manual: true,
    debounceWait: 300,
  });

  const githubTrendingItem = useMemo(() => {
    if (!githubTrendingData?.items) return null;
    return githubTrendingData.items.find(
      (it: any) =>
        it.time_window === githubTimeWindow &&
        it.spoken_language === githubSpokenLanguage &&
        it.available
    ) || null;
  }, [githubTrendingData, githubTimeWindow, githubSpokenLanguage]);

  const githubRepos = githubTrendingItem?.digest?.snapshot?.repos || [];

  const githubAnalysesMap = useMemo(() => {
    const analyses = githubTrendingItem?.digest?.analyses || [];
    const map: Record<string, any> = {};
    analyses.forEach((a: any) => {
      if (a?.repo_full_name) {
        map[a.repo_full_name] = a;
      }
    });
    return map;
  }, [githubTrendingItem]);

  // KOL 数据请求
  const {
    data: aiTopInfluencerData,
    loading: aiTopInfluencerLoading,
    run: fetchAiTopInfluencerData,
  } = useRequest(
    () => getAiTopInfluencer(currentRegion, activeDays),
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion, activeDays],
    }
  );

  // 推文数据请求
  const {
    data: aiHotTweetData,
    loading: aiHotTweetLoading,
    run: fetchAiHotTweetData,
  } = useRequest(
    () => getAiHotTweet(currentRegion, activeHours),
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion, activeHours],
    }
  );

  // AI 飙升推文数据请求
  const {
    data: aiTrendingTweetsData,
    loading: aiTrendingTweetsLoading,
    run: fetchAiTrendingTweetsData,
  } = useRequest(
    () => getAiTrendingTweets(currentRegion),
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion],
    }
  );

  // 热门图片/视频数据请求
  const {
    data: aiHotTweetMediaData,
    loading: aiHotTweetMediaLoading,
    run: fetchAiHotTweetMediaData,
  } = useRequest(
    () => getAiHotTweetMedia(currentRegion, activeDays, activeMediaTab),
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion, activeDays, activeMediaTab],
    },
  );

  // 按需加载
  useEffect(() => {
    if (activeType === 'person') {
      fetchAiTopInfluencerData();
    } else if (activeType === 'tweet') {
      fetchAiHotTweetData();
    } else if (activeType === 'reply') {
      if (showReplyAlphaAi) {
        fetchAiTrendingTweetsData();
      }
    } else if (activeType === 'media') {
      fetchAiHotTweetMediaData();
    } else if (activeType === 'model') {
      fetchAiTweetModelData();
    } else if (activeType === 'github') {
      fetchGithubTrendingData();
    }
  }, [
    activeType,
    activeDays,
    activeHours,
    activeMediaTab,
    currentRegion,
    githubTimeWindow,
    githubSpokenLanguage,
    showReplyAlphaAi,
  ]);

  const dayOptions = [1, 7] as const;
  const dayLabels: Record<1 | 7, string> = { 1: '1d', 7: '7d' };

  const tweetHourOptions = [1, 4, 8, 24] as const;
  const tweetHourLabels: Record<number, string> = { 1: '1h', 4: '4h', 8: '8h', 24: '24h' };

  const modelHourOptions = [8, 24, 168] as const;
  const modelHourLabels: Record<number, string> = { 8: '8h', 24: '1d', 168: '7d' };

  const currentHourOptions = activeType === 'model' ? modelHourOptions : tweetHourOptions;
  const currentHourLabels = activeType === 'model' ? modelHourLabels : tweetHourLabels;

  const isTimeTab = activeType === 'tweet' || activeType === 'model';
  const timeOptions = isTimeTab ? currentHourOptions : dayOptions;
  const activeTimeValue = isTimeTab ? activeHours : activeDays;
  const activeTimeLabel = isTimeTab
    ? currentHourLabels[activeHours] ?? ''
    : dayLabels[activeDays];

  // 模型数据请求
  const {
    data: aiTweetModelData,
    loading: aiTweetModelLoading,
    run: fetchAiTweetModelData,
  } = useRequest(
    () => getAiTweetModel(activeHours),
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [activeHours],
    }
  );

  const mediaItems = useMemo(
    () => aiHotTweetMediaData?.data?.data || [],
    [aiHotTweetMediaData],
  );

  const replyAlphaItems = useMemo(
    () => aiTrendingTweetsData?.data?.data?.items || [],
    [aiTrendingTweetsData],
  );

  const regionOptions = useMemo(() => {
    const options = [
      { key: 'cn' as const, label: t('cnRegion') },
      { key: 'global' as const, label: t('enRegion') },
    ];

    if (activeType !== 'reply') {
      return options;
    }

    return options.filter((opt) =>
      opt.key === 'cn' ? showReplyAlphaCnAi : showReplyAlphaGlobalAi,
    );
  }, [
    activeType,
    showReplyAlphaCnAi,
    showReplyAlphaGlobalAi,
    t,
  ]);

  const currentLoading = activeType === 'person'
    ? aiTopInfluencerLoading
    : activeType === 'tweet'
      ? aiHotTweetLoading
      : activeType === 'reply'
        ? aiTrendingTweetsLoading
        : activeType === 'media'
          ? aiHotTweetMediaLoading
          : activeType === 'model'
            ? aiTweetModelLoading
            : activeType === 'github'
              ? githubTrendingLoading
              : false;

  const tabs = [
    { id: 'person', label: t('kols'), icon: Users },
    { id: 'tweet', label: t('tweets'), icon: FileText },
    ...(showReplyAlphaAi
      ? [{ id: 'reply', label: t('replyAlpha'), icon: MessageSquare, isNew: true, tooltip: t('replyAlphaDescription') }]
      : []),
    { id: 'model', label: t('modelRank'), icon: Brain },
    { id: 'github', label: t('githubTrending'), icon: Github },
    { id: 'media', label: t('hotTweetMedia'), icon: Images },
  ];

  const topInfluencerItems: HotItem[] = useMemo(() => {
    if (activeType !== 'person' || !aiTopInfluencerData?.data?.data) return [];
    return aiTopInfluencerData.data.data;
  }, [aiTopInfluencerData, activeType]);

  const modelFamilyItems = aiTweetModelData?.data?.data?.family || [];
  const modelVariantItems = aiTweetModelData?.data?.data?.variant || [];

  const hasData = activeType === 'person'
    ? topInfluencerItems.length > 0
    : activeType === 'tweet'
      ? Boolean(aiHotTweetData?.data?.data?.length)
      : activeType === 'reply'
        ? replyAlphaItems.length > 0
        : activeType === 'media'
          ? mediaItems.length > 0
          : activeType === 'github'
            ? githubRepos.length > 0
            : Boolean(modelFamilyItems.length);

  const mediaTabs = [
    { id: 'video', label: t('video') },
    { id: 'photo', label: t('photo') },
  ];

  if (!showHotTrendingEnabled) {
    if (!hasWeb3) return <></>;
    return <HotTrendingEmptyState settingKey='showHotTrendingAi' />;
  }

  if (isHidden) return <></>;

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className='px-3 pt-3 pb-2 theme-border flex-shrink-0 rounded-t-xl overflow-visible'>
        <div className='flex items-center justify-between gap-2 mb-3'>
          <h3 className='min-w-0 flex items-center gap-1.5 text-sm font-bold theme-text-primary whitespace-nowrap overflow-hidden text-ellipsis tracking-[-0.01em]'>
            <span
              className='w-6 h-6 rounded-lg flex items-center justify-center shrink-0'
              style={{
                color: '#fff',
                background:
                  'linear-gradient(135deg, rgba(249,115,22,0.98) 0%, rgba(239,68,68,0.92) 55%, rgba(168,85,247,0.88) 100%)',
                boxShadow:
                  '0 8px 18px rgba(249,115,22,0.22), inset 0 1px 0 rgba(255,255,255,0.35)',
              }}
            >
              <Flame className='w-3.5 h-3.5' />
            </span>
            <span className='min-w-0 overflow-hidden text-ellipsis'>
              AI {t('trendingNow')}
            </span>
          </h3>

          <div className='flex items-center gap-1 shrink-0'>
            {/* 区域下拉选择（model / github tab 不显示） */}
            {activeType !== 'model' && activeType !== 'github' && regionOptions.length > 0 && (
              <div ref={regionDropdownRef} className='relative'>
                <button
                  className='h-7 flex items-center gap-1 px-2.5 text-[11px] font-semibold rounded-xl theme-text-primary theme-hover transition-all border theme-border whitespace-nowrap'
                  onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                  }}
                >
                  {currentRegion === 'cn' ? t('cnRegion') : t('enRegion')}
                  <ChevronDown className='w-3 h-3 shrink-0' />
                </button>

                {showRegionDropdown && (
                  <>
                    <div ref={regionDropdownMenuRef} className='absolute right-0 top-full mt-2 p-1.5 theme-bg-secondary rounded-2xl shadow-xl theme-border border z-20 min-w-[118px] backdrop-blur-md'>
                      {regionOptions.map((opt) => {
                        const selected = currentRegion === opt.key;

                        return (
                          <button
                            key={opt.key}
                            className={`w-full h-9 px-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between gap-2 ${selected
                              ? 'text-blue-500 bg-blue-500/10'
                              : 'theme-text-primary hover:bg-slate-500/10'
                              }`}
                            onClick={() => {
                              setRegion(opt.key);
                              setTweetTagFilter({
                                type: null,
                                groupId: null,
                                subTagId: null,
                                hotTag: null,
                              });
                              setShowRegionDropdown(false);
                            }}
                          >
                            <span className='truncate'>{opt.label}</span>
                            {selected && <Check className='w-3.5 h-3.5 shrink-0' />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* model 视图切换（仅 model tab） */}
            {activeType === 'model' && (
              <div ref={modelViewDropdownRef} className='relative'>
                <button
                  className='h-7 flex items-center gap-1 px-2.5 text-[11px] font-semibold rounded-xl theme-text-primary theme-hover transition-all border theme-border whitespace-nowrap'
                  onClick={() => setShowModelViewDropdown(!showModelViewDropdown)}
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                  }}
                >
                  {modelViewMode === 'family'
                    ? (lang === 'zh' ? '按家族' : 'By Family')
                    : (lang === 'zh' ? '按型号' : 'By Variant')}
                  <ChevronDown className='w-3 h-3 shrink-0' />
                </button>

                {showModelViewDropdown && (
                  <>
                    <div ref={modelViewDropdownMenuRef} className='absolute right-0 top-full mt-2 p-1.5 theme-bg-secondary rounded-2xl shadow-xl theme-border border z-20 min-w-[118px] backdrop-blur-md'>
                      {[
                        { key: 'family' as const, label: lang === 'zh' ? '按家族' : 'By Family' },
                        { key: 'variant' as const, label: lang === 'zh' ? '按型号' : 'By Variant' },
                      ].map((opt) => {
                        const selected = modelViewMode === opt.key;

                        return (
                          <button
                            key={opt.key}
                            className={`w-full h-9 px-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between gap-2 ${selected
                              ? 'text-blue-500 bg-blue-500/10'
                              : 'theme-text-primary hover:bg-slate-500/10'
                              }`}
                            onClick={() => {
                              setModelViewMode(opt.key);
                              setShowModelViewDropdown(false);
                            }}
                          >
                            <span className='truncate'>{opt.label}</span>
                            {selected && <Check className='w-3.5 h-3.5 shrink-0' />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* GitHub 时间窗口选择 */}
            {activeType === 'github' && (
              <div ref={githubTimeDropdownRef} className='relative'>
                <button
                  className='h-7 flex items-center gap-1 px-2.5 text-[11px] font-semibold rounded-xl theme-text-primary theme-hover transition-all border theme-border whitespace-nowrap'
                  onClick={() => setShowGithubTimeDropdown(!showGithubTimeDropdown)}
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                  }}
                >
                  {githubTimeWindow === 'daily' ? '1d' : githubTimeWindow === 'weekly' ? '7d' : '30d'}
                  <ChevronDown className='w-3 h-3 shrink-0' />
                </button>

                {showGithubTimeDropdown && (
                  <>
                    <div ref={githubTimeDropdownMenuRef} className='absolute right-0 top-full mt-2 p-1.5 theme-bg-secondary rounded-2xl shadow-xl theme-border border z-20 min-w-[86px] backdrop-blur-md'>
                      {[
                        { key: 'daily' as const, label: '1d' },
                        { key: 'weekly' as const, label: '7d' },
                        { key: 'monthly' as const, label: '30d' },
                      ].map((opt) => {
                        const selected = githubTimeWindow === opt.key;

                        return (
                          <button
                            key={opt.key}
                            className={`w-full h-9 px-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between gap-2 ${selected
                              ? 'text-blue-500 bg-blue-500/10'
                              : 'theme-text-primary hover:bg-slate-500/10'
                              }`}
                            onClick={() => {
                              setGithubTimeWindow(opt.key);
                              setShowGithubTimeDropdown(false);
                            }}
                          >
                            <span>{opt.label}</span>
                            {selected && <Check className='w-3.5 h-3.5 shrink-0' />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* GitHub 语言选择 */}
            {activeType === 'github' && (
              <div ref={githubLangDropdownRef} className='relative'>
                <button
                  className='h-7 flex items-center gap-1 px-2.5 text-[11px] font-semibold rounded-xl theme-text-primary theme-hover transition-all border theme-border whitespace-nowrap'
                  onClick={() => setShowGithubLangDropdown(!showGithubLangDropdown)}
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                  }}
                >
                  {t(`githubLang_${githubSpokenLanguage}`)}
                  <ChevronDown className='w-3 h-3 shrink-0' />
                </button>

                {showGithubLangDropdown && (
                  <>
                    <div ref={githubLangDropdownMenuRef} className='absolute right-0 top-full mt-2 p-1.5 theme-bg-secondary rounded-2xl shadow-xl theme-border border z-20 min-w-[104px] backdrop-blur-md'>
                      {[
                        { key: 'all' as const, label: t('githubLang_all') },
                        { key: 'zh' as const, label: t('githubLang_zh') },
                        { key: 'en' as const, label: t('githubLang_en') },
                      ].map((opt) => {
                        const selected = githubSpokenLanguage === opt.key;

                        return (
                          <button
                            key={opt.key}
                            className={`w-full h-9 px-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between gap-2 ${selected
                              ? 'text-blue-500 bg-blue-500/10'
                              : 'theme-text-primary hover:bg-slate-500/10'
                              }`}
                            onClick={() => {
                              setGithubSpokenLanguage(opt.key);
                              setShowGithubLangDropdown(false);
                            }}
                          >
                            <span className='truncate'>{opt.label}</span>
                            {selected && <Check className='w-3.5 h-3.5 shrink-0' />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 日期/时间下拉选择（非 github tab） */}
            {activeType !== 'github' && activeType !== 'reply' && (
              <div ref={daysDropdownRef} className='relative'>
                <button
                  className='h-7 flex items-center gap-1 px-2.5 text-[11px] font-semibold rounded-xl theme-text-primary theme-hover transition-all border theme-border whitespace-nowrap'
                  onClick={() => setShowDaysDropdown(!showDaysDropdown)}
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
                  }}
                >
                  {activeTimeLabel}
                  <ChevronDown className='w-3 h-3 shrink-0' />
                </button>

                {showDaysDropdown && (
                  <>
                    <div ref={daysDropdownMenuRef} className='absolute right-0 top-full mt-2 p-1.5 theme-bg-secondary rounded-2xl shadow-xl theme-border border z-20 min-w-[86px] backdrop-blur-md'>
                      {timeOptions.map((val) => {
                        const selected = activeTimeValue === val;
                        const label = isTimeTab
                          ? currentHourLabels[val as number] ?? ''
                          : dayLabels[val as 1 | 7];

                        return (
                          <button
                            key={val}
                            className={`w-full h-9 px-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between gap-2 ${selected
                              ? 'text-blue-500 bg-blue-500/10'
                              : 'theme-text-primary hover:bg-slate-500/10'
                              }`}
                            onClick={() => {
                              if (isTimeTab) {
                                setActiveHours(val as any);
                              } else {
                                setActiveDays(val as any);
                              }
                              setShowDaysDropdown(false);
                            }}
                          >
                            <span>{label}</span>
                            {selected && <Check className='w-3.5 h-3.5 shrink-0' />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 关闭按钮 */}
            <button
              type='button'
              aria-label='Close Hot Trending'
              title='Close'
              className='w-7 h-7 flex items-center justify-center rounded-xl theme-hover theme-text-secondary hover:theme-text-primary transition-colors'
              onClick={() => setShowCloseConfirm(true)}
            >
              <X className='w-3.5 h-3.5' />
            </button>
          </div>
        </div>

        <Tabs
          tabs={tabs}
          activeTab={activeType}
          onChange={(id) => setActiveType(id as any)}
          zhMaxRow={4}
          enMaxRow={3}
          labelClassName='text-[13px] font-semibold'
        />
      </div>

      {/* Content区域 */}
      <div
        ref={contentScrollRef}
        className={`relative flex-1 overflow-x-hidden scrollbar-hide ${
          activeType === 'person'
            ? 'overflow-y-hidden'
            : activeType === 'tweet' && filterPanelExpanded
              ? 'max-h-[430px] overflow-y-hidden'
              : 'max-h-[430px] overflow-y-auto'
        }`}
      >
        {activeType === 'media' && (
          <div className='sticky top-0 z-10 pt-2 pb-2 filter backdrop-blur-sm' style={{
            backgroundColor: 'var(--xhunt-web-bg)',
          }}>
            <SecondaryTabs
              tabs={mediaTabs}
              activeTab={activeMediaTab}
              onChange={(id) => setActiveMediaTab(id as 'video' | 'photo')}
            />
          </div>
        )}

        <div className='px-4 pb-4'>
          {currentLoading ? (
            <div className='flex items-center justify-center h-full min-h-[360px]'>
              <div className='w-6 h-6 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin'></div>
            </div>
          ) : hasData ? (
            <div className='w-full h-full hot-content-transition min-h-[360px] scrollbar-hide'>
              {activeType === 'person' ? (
                <TrendingListVisualization
                  items={topInfluencerItems}
                  loading={currentLoading}
                  type='person'
                />
              ) : activeType === 'tweet' ? (
                <div className='min-h-[360px] mt-1'>
                  <TweetTagFilter
                    scrollContainerRef={contentScrollRef}
                    items={aiHotTweetData?.data?.data || []}
                    selectedType={tweetTagFilter.type}
                    selectedGroupId={tweetTagFilter.groupId}
                    selectedSubTagId={tweetTagFilter.subTagId}
                    selectedHotTag={tweetTagFilter.hotTag}
                    onChange={(next) => setTweetTagFilter(next)}
                    onExpandChange={setFilterPanelExpanded}
                    allowedDomains={['ai']}
                  />
                  <TweetList
                    items={aiHotTweetData?.data?.data || []}
                    filter={tweetTagFilter}
                    lang={lang === 'zh' ? 'zh' : 'en'}
                  />
                </div>
              ) : activeType === 'reply' ? (
                <div className='min-h-[360px] mt-1'>
                  <ReplyAlphaTweetList
                    items={replyAlphaItems}
                    lang={lang === 'zh' ? 'zh' : 'en'}
                  />
                </div>
              ) : activeType === 'media' ? (
                <div className='min-h-[360px] mt-1'>
                  <HotTweetMediaList
                    items={mediaItems}
                    lang={lang === 'zh' ? 'zh' : 'en'}
                    media={activeMediaTab}
                  />
                </div>
              ) : activeType === 'github' ? (
                <div className='min-h-[360px] mt-1'>
                  <GithubTrendingList
                    repos={githubRepos}
                    analysesMap={githubAnalysesMap}
                    loading={githubTrendingLoading}
                  />
                </div>
              ) : (
                <div className='min-h-[360px] mt-1'>
                  <ModelTreemapVisualization
                    familyItems={modelFamilyItems}
                    variantItems={modelVariantItems}
                    loading={aiTweetModelLoading}
                    width={318}
                    height={400}
                    lang={lang === 'zh' ? 'zh' : 'en'}
                    viewMode={modelViewMode}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className='flex items-center justify-center h-full min-h-[360px] theme-text-secondary'>
              <div className='text-center'>
                <div className='text-sm'>{t('noData')}</div>
                <div className='text-xs mt-1'>{t('tryDifferentPeriod')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CloseConfirmDialog
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={async () => {
          setIsHidden(true);
          setShowCloseConfirm(false);
          try {
            await localStorageInstance.set('@settings/showHotTrendingAi', false);
          } catch { }
        }}
        prefixKey='confirmCloseTrendingPrefix'
        suffixKey='confirmCloseTrendingSuffix'
      />
    </div>
  );
}
