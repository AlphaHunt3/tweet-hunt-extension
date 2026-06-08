import React, {
  useState,
  useEffect,
  useMemo,
} from 'react';
import {
  Check,
  ChevronDown,
  Flame,
  FileText,
  Images,
  Info,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useRequest } from 'ahooks';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useMemoryScrollRestoration } from '~contents/hooks/useMemoryScrollRestoration';
import { useLocalStorage, useSessionStorage } from '~storage/useLocalStorage';
import {
  getHotProject,
  getHotToken,
  getTopInfluencer,
  getTwitterTopInfluencer,
  getTopTag,
  getProjectAttitude,
  getHotTweet,
  getHotTweetMedia,
} from '~contents/services/api.ts';
import { TokenTreemapVisualization } from '../HotProjectsKOLs/TokenTreemapVisualization';
import { HotTrendingEmptyState } from './HotTrendingEmptyState';
import { TrendingListVisualization } from '../HotProjectsKOLs/TrendingListVisualization';
import {
  HotItem,
  HotToken,
  HotDiscussion,
  DiscussionAttitudeItem,
} from '../HotProjectsKOLs/types';
import { localStorageInstance } from '~storage/index.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { Tabs } from '../Tabs';
import { CloseConfirmDialog } from '../CloseConfirmDialog';
import { SecondaryTabs } from '../SecondaryTabs';
import { TweetTagFilter } from '../HotProjectsKOLs/TweetTagFilter';
import { TweetList } from '../HotProjectsKOLs/TweetList';
import { HotTweetMediaList } from '../HotProjectsKOLs/HotTweetMediaList';

export interface Web3HotProjectsKOLsProps {
  className?: string;
}

type HotTabId =
  | 'person'
  | 'tweet'
  | 'discussion'
  | 'following'
  | 'token'
  | 'media';
type ActiveType = HotTabId | 'project';

export function Web3HotProjectsKOLs({ className = '' }: Web3HotProjectsKOLsProps) {
  const { t, lang } = useI18n();

  const [tweetTagFilter, setTweetTagFilter] = useSessionStorage<{
    type: 'domain' | 'hot' | null;
    groupId: string | null;
    subTagId: string | null;
    hotTag: string | null;
  }>('@xhunt/tweetTagFilter', {
    type: null,
    groupId: null,
    subTagId: null,
    hotTag: null,
  });
  // const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { isEnabled } = useCrossPageSettings();
  const { hasAi } = useUserDomain();
  const [activeType, setActiveType] = useLocalStorage<ActiveType>(
    '@xhunt/hotProjectsActiveType',
    'person',
  );
  const [activeKolTab, setActiveKolTab] = useState<
    'traffic' | 'interaction' | 'following'
  >('traffic');
  const [activeMediaTab, setActiveMediaTab] = useState<'video' | 'photo'>(
    'video'
  );
  const [activeDiscussionTab, setActiveDiscussionTab] = useState<
    'hot' | 'positive' | 'negative'
  >('hot');
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false);
  const [activeDays, setActiveDays] = useState<1 | 7>(1);
  const [activeHours, setActiveHours] = useState<1 | 4 | 8 | 24>(4);
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);

  // 当切换到 tweet tab 时，默认用 4h；切回其它 tab 保持日维度
  useEffect(() => {
    if (activeType === 'tweet') {
      setActiveHours(4);
    }
  }, [activeType]);
  const [region, setRegion] = useLocalStorage<'cn' | 'global' | ''>(
    '@xhunt/hotProjectsRegion',
    ''
  );
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  // const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const currentRegion = region || (lang === 'zh' ? 'cn' : 'global');
  const canShowInteractionKolTab = currentRegion === 'cn';

  useEffect(() => {
    if (!canShowInteractionKolTab && activeKolTab === 'interaction') {
      setActiveKolTab('traffic');
    }
  }, [activeKolTab, canShowInteractionKolTab]);

  // 关注数据请求（原项目数据）
  const {
    data: followingData,
    loading: followingLoading,
    run: fetchFollowingData,
  } = useRequest(
    () => {
      return getHotProject(currentRegion, 'project', activeDays);
    },
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion],
    }
  );

  // KOL数据请求 - 最多关注
  const {
    data: personData,
    loading: personLoading,
    run: fetchPersonData,
  } = useRequest(
    () => {
      return getHotProject(currentRegion, 'person', activeDays);
    },
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion],
    }
  );

  // KOL数据请求 - 最多流量
  const {
    data: topInfluencerData,
    loading: topInfluencerLoading,
    run: fetchTopInfluencerData,
  } = useRequest(
    () => {
      return getTopInfluencer(currentRegion, activeDays);
    },
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion, activeDays],
    }
  );

  // KOL数据请求 - 最多互动
  const {
    data: twitterTopInfluencerData,
    loading: twitterTopInfluencerLoading,
    run: fetchTwitterTopInfluencerData,
  } = useRequest(
    () => {
      return getTwitterTopInfluencer(currentRegion, activeDays);
    },
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion, activeDays],
    }
  );

  // Token数据请求
  const {
    data: tokenData,
    loading: tokenLoading,
    run: fetchTokenData,
  } = useRequest(() => getHotToken(), {
    manual: false, // 自动加载token数据
    debounceWait: 300,
  });

  // 讨论数据请求（热门）
  const {
    data: discussionData,
    loading: discussionLoading,
    run: fetchDiscussionData,
  } = useRequest(
    () => {
      return getTopTag('mention', currentRegion, activeDays);
    },
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion],
    }
  );

  // 讨论情绪数据请求（positive/negative）
  const {
    data: discussionAttitudeData,
    loading: discussionAttitudeLoading,
    run: fetchDiscussionAttitudeData,
  } = useRequest(() => getProjectAttitude(activeDays), {
    manual: true,
    debounceWait: 300,
  });

  // 热门推文数据请求
  const {
    data: hotTweetData,
    loading: hotTweetLoading,
    run: fetchHotTweetData,
  } = useRequest(() => getHotTweet(currentRegion as any, activeHours), {
    manual: true,
    debounceWait: 300,
    refreshDeps: [currentRegion, activeHours],
  });

  // 热门图片/视频数据请求
  const {
    data: hotTweetMediaData,
    loading: hotTweetMediaLoading,
    run: fetchHotTweetMediaData,
  } = useRequest(
    () => getHotTweetMedia(currentRegion as any, activeDays, activeMediaTab),
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [currentRegion, activeDays, activeMediaTab],
    },
  );

  // 按需加载：仅在切换到对应 Tab 时拉取数据
  useEffect(() => {
    if (activeType === 'following') {
      fetchFollowingData();
      return;
    }

    if (activeType === 'person') {
      if (activeKolTab === 'traffic') {
        fetchTopInfluencerData();
      } else if (activeKolTab === 'interaction') {
        fetchTwitterTopInfluencerData();
      } else {
        fetchPersonData();
      }
      return;
    }

    if (activeType === 'discussion') {
      if (activeDiscussionTab === 'hot') {
        fetchDiscussionData();
      } else {
        fetchDiscussionAttitudeData();
      }
      return;
    }

    if (activeType === 'tweet') {
      fetchHotTweetData();
      return;
    }

    if (activeType === 'media') {
      fetchHotTweetMediaData();
      return;
    }

    // token: tokenData 已经自动加载
  }, [
    activeType,
    activeKolTab,
    activeDiscussionTab,
    activeDays,
    activeHours,
    activeMediaTab,
    currentRegion,
  ]);

  // 检查浏览器是否支持 View Transition API
  const supportsViewTransition =
    typeof document !== 'undefined' && 'startViewTransition' in document;

  // 处理tab切换
  const handleTabChange = (newType: ActiveType) => {
    if (newType === activeType) return;

    const updateActiveType = () => {
      setActiveType(newType);
    };

    if (supportsViewTransition) {
      (document as any).startViewTransition(() => {
        updateActiveType();
      });
    } else {
      // 使用requestAnimationFrame确保状态更新在下一帧
      requestAnimationFrame(() => {
        updateActiveType();
      });
    }
  };

  // 处理数据 - 最多关注 & 项目
  const hotItems: HotItem[] = React.useMemo(() => {
    if (activeType === 'token' || activeType === 'discussion') return [];

    const sourceData = activeType === 'following' ? followingData : personData;
    if (!sourceData?.data?.data) return [];

    if (activeType === 'person') {
      return sourceData.data.data; // 不做数据量限制
    }
    return sourceData.data.data.slice(0, 10);
  }, [followingData, personData, activeType]);

  // 处理数据 - 最多流量
  const topInfluencerItems: HotItem[] = React.useMemo(() => {
    if (activeType !== 'person' || activeKolTab !== 'traffic') return [];
    if (!topInfluencerData?.data?.data) return [];
    return topInfluencerData.data.data;
  }, [topInfluencerData, activeType, activeKolTab]);

  // 处理数据 - 最多互动
  const twitterTopInfluencerItems: HotItem[] = React.useMemo(() => {
    if (activeType !== 'person' || activeKolTab !== 'interaction') return [];
    if (!twitterTopInfluencerData?.data?.data) return [];
    return twitterTopInfluencerData.data.data;
  }, [twitterTopInfluencerData, activeType, activeKolTab]);

  // 处理讨论数据（热门）
  const hotDiscussions: HotDiscussion[] = React.useMemo(() => {
    if (activeType !== 'discussion' || !discussionData?.data?.data) return [];
    return discussionData.data.data.slice(0, 10);
  }, [discussionData, activeType]);

  // 处理讨论情绪数据（positive/negative）
  const discussionPositiveItems: DiscussionAttitudeItem[] =
    React.useMemo(() => {
      if (activeType !== 'discussion') return [];
      const items = discussionAttitudeData?.data?.data?.positive ?? [];
      return items.map((it) => ({
        ...it,
        share: 0,
        displayValue: `${t('discussion_tab_positive')} ${it.percentage}%`,
      }));
      // .slice(0, 10);
    }, [discussionAttitudeData, activeType, t]);

  const discussionNegativeItems: DiscussionAttitudeItem[] =
    React.useMemo(() => {
      if (activeType !== 'discussion') return [];
      const items = discussionAttitudeData?.data?.data?.negative ?? [];
      return items.map((it) => ({
        ...it,
        share: 0,
        displayValue: `${t('discussion_tab_negative')} ${it.percentage}%`,
      }));
      // .slice(0, 10);
    }, [discussionAttitudeData, activeType, t]);

  const discussionItemsToShow: Array<HotDiscussion | DiscussionAttitudeItem> =
    useMemo(() => {
      if (activeDiscussionTab === 'positive') return discussionPositiveItems;
      if (activeDiscussionTab === 'negative') return discussionNegativeItems;
      return hotDiscussions;
    }, [
      activeDiscussionTab,
      discussionPositiveItems,
      discussionNegativeItems,
      hotDiscussions,
    ]);

  // 处理Token数据
  const hotTokens: HotToken[] = React.useMemo(() => {
    if (activeType !== 'token' || !tokenData?.data?.data) return [];
    const dayKey = activeDays === 1 ? 'day1' : 'day7';
    return tokenData.data.data[dayKey]?.slice(0, 10) || [];
  }, [tokenData, activeType, activeDays]);

  // 根据 activeType 决定可用的时间选项
  const dayOptions = [1, 7] as const;
  const dayLabels: Record<1 | 7, string> = {
    1: '1d',
    7: '7d',
  };

  const hourOptions = [1, 4, 8, 24] as const;
  const hourLabels: Record<1 | 4 | 8 | 24, string> = {
    1: '1h',
    4: '4h',
    8: '8h',
    24: '24h',
  };

  const isTweetTab = activeType === 'tweet';
  const timeOptions = isTweetTab ? hourOptions : dayOptions;
  const activeTimeValue = isTweetTab ? activeHours : activeDays;

  const activeTimeLabel = isTweetTab
    ? hourLabels[activeHours]
    : dayLabels[activeDays];

  const outerScrollMemoryKey = useMemo(() => {
    const parts: Array<string | number | null> = [
      'web3',
      activeType,
      currentRegion,
      isTweetTab ? activeHours : activeDays,
    ];

    if (activeType === 'person') {
      parts.push(activeKolTab);
    }

    if (activeType === 'discussion') {
      parts.push(activeDiscussionTab);
    }

    if (activeType === 'media') {
      parts.push(activeMediaTab);
    }

    if (activeType === 'tweet') {
      parts.push(
        tweetTagFilter.type,
        tweetTagFilter.groupId,
        tweetTagFilter.subTagId,
        tweetTagFilter.hotTag,
      );
    }

    return parts.map((part) => part || 'all').join(':');
  }, [
    activeDiscussionTab,
    activeDays,
    activeHours,
    activeKolTab,
    activeMediaTab,
    activeType,
    currentRegion,
    isTweetTab,
    tweetTagFilter.groupId,
    tweetTagFilter.hotTag,
    tweetTagFilter.subTagId,
    tweetTagFilter.type,
  ]);

  const { scrollRef: contentScrollRef } =
    useMemoryScrollRestoration<HTMLDivElement>({
      memoryKey: outerScrollMemoryKey,
    });

  const tweetItems = useMemo(
    () => hotTweetData?.data?.data || [],
    [hotTweetData],
  );

  const mediaItems = useMemo(
    () => hotTweetMediaData?.data?.data || [],
    [hotTweetMediaData],
  );

  // Tab配置：展示文案、tooltip、loading、数据判断和内容渲染统一维护
  const tabConfigs = useMemo(
    () => [
      {
        id: 'person' as const,
        label: t('kols'),
        icon: Users,
        tooltip: '',
        loading:
          activeKolTab === 'traffic'
            ? topInfluencerLoading
            : activeKolTab === 'interaction'
              ? twitterTopInfluencerLoading
              : personLoading,
        hasData:
          activeKolTab === 'traffic'
            ? topInfluencerItems.length > 0
            : activeKolTab === 'interaction'
              ? twitterTopInfluencerItems.length > 0
              : hotItems.length > 0,
        render: () => (
          <TrendingListVisualization
            items={
              activeKolTab === 'traffic'
                ? topInfluencerItems
                : activeKolTab === 'interaction'
                  ? twitterTopInfluencerItems
                  : hotItems
            }
            loading={
              activeKolTab === 'traffic'
                ? topInfluencerLoading
                : activeKolTab === 'interaction'
                  ? twitterTopInfluencerLoading
                  : personLoading
            }
            type='person'
            scrollMemoryKey={`${outerScrollMemoryKey}:list`}
          />
        ),
      },
      {
        id: 'tweet' as const,
        label: t('tweets'),
        icon: FileText,
        tooltip: '',
        loading: hotTweetLoading,
        hasData: true,
        render: () => (
          <div className='min-h-[360px] mt-1'>
            <TweetTagFilter
              scrollContainerRef={contentScrollRef}
              items={tweetItems}
              selectedType={tweetTagFilter.type}
              selectedGroupId={tweetTagFilter.groupId}
              selectedSubTagId={tweetTagFilter.subTagId}
              selectedHotTag={tweetTagFilter.hotTag}
              onChange={(next) => setTweetTagFilter(next)}
              onExpandChange={setFilterPanelExpanded}
            />

            <TweetList
              items={tweetItems}
              filter={tweetTagFilter}
              lang={lang === 'zh' ? 'zh' : 'en'}
            />
          </div>
        ),
      },
      {
        id: 'discussion' as const,
        label: t('discussions'),
        icon: MessageSquare,
        tooltip: t('discussionDescription'),
        loading:
          activeDiscussionTab === 'hot'
            ? discussionLoading
            : discussionAttitudeLoading,
        hasData: discussionItemsToShow.length > 0,
        render: () => (
          <TrendingListVisualization
            items={discussionItemsToShow}
            loading={
              activeDiscussionTab === 'hot'
                ? discussionLoading
                : discussionAttitudeLoading
            }
            type='discussion'
            scrollMemoryKey={`${outerScrollMemoryKey}:list`}
          />
        ),
      },
      {
        id: 'following' as const,
        label: t('following'),
        icon: TrendingUp,
        tooltip: t('followingDescription'),
        loading: followingLoading,
        hasData: hotItems.length > 0,
        render: () => (
          <TrendingListVisualization
            items={hotItems}
            loading={followingLoading}
            type='project'
            scrollMemoryKey={`${outerScrollMemoryKey}:list`}
          />
        ),
      },
      {
        id: 'token' as const,
        label: t('tokens'),
        icon: Star,
        tooltip: t('tokenDescription'),
        loading: tokenLoading,
        hasData: hotTokens.length > 0,
        render: () => (
          <TokenTreemapVisualization
            items={hotTokens}
            loading={tokenLoading}
            width={318}
            height={400}
          />
        ),
      },
      {
        id: 'media' as const,
        label: t('hotTweetMedia'),
        icon: Images,
        isNew: true,
        tooltip: '',
        loading: hotTweetMediaLoading,
        hasData: mediaItems.length > 0,
        render: () => (
          <div className='min-h-[360px] mt-1'>
            <HotTweetMediaList
              items={mediaItems}
              lang={lang === 'zh' ? 'zh' : 'en'}
              media={activeMediaTab}
            />
          </div>
        ),
      },
    ],
    [
      activeDiscussionTab,
      activeKolTab,
      activeMediaTab,
      contentScrollRef,
      discussionAttitudeLoading,
      discussionItemsToShow,
      discussionLoading,
      followingLoading,
      hotItems,
      hotTokens,
      hotTweetLoading,
      hotTweetMediaLoading,
      lang,
      mediaItems,
      personLoading,
      setTweetTagFilter,
      t,
      tokenLoading,
      topInfluencerItems,
      topInfluencerLoading,
      twitterTopInfluencerItems,
      twitterTopInfluencerLoading,
      tweetItems,
      tweetTagFilter,
      outerScrollMemoryKey,
    ],
  );

  const activeTabConfig = tabConfigs.find((tab) => tab.id === activeType);
  const currentLoading = activeTabConfig?.loading ?? false;
  const hasData = activeTabConfig?.hasData ?? false;
  const tabs = tabConfigs.map(({ loading, hasData, render, ...tab }) => tab);

  const kolTabs = [
    { id: 'traffic', label: t('kol_tabs_most_traffic') },
    ...(canShowInteractionKolTab
      ? [{ id: 'interaction', label: t('kol_tabs_most_interaction'), isNew: true }]
      : []),
    { id: 'following', label: t('kol_tabs_most_followed') },
  ];

  const mediaTabs = [
    { id: 'video', label: t('video') },
    { id: 'photo', label: t('photo') },
  ];

  // 检查热门趋势是否启用
  if (!isEnabled('showHotTrendingWeb3')) {
    if (!hasAi) return <></>;
    return <HotTrendingEmptyState settingKey='showHotTrendingWeb3' />;
  }

  if (isHidden) return <></>;

  return (
    <div className='relative'>
      {/* Header */}
      <div className='px-3 pt-3 pb-2 theme-border flex-shrink-0 rounded-t-xl overflow-visible'>
        {/* 标题和区域/日期选择 */}
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
              {t('domainWeb3')} {t('trendingNow')}
            </span>
          </h3>

          {/* 右侧操作区：区域/日期下拉 + 关闭 */}
          <div className='flex items-center gap-1 shrink-0'>
            {/* 区域下拉选择（在日期选择左边一点） - 仅非token标签显示 */}
            {activeType !== 'token' && (
              <div className='relative'>
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
                    <div
                      className='fixed inset-0 z-10'
                      onClick={() => setShowRegionDropdown(false)}
                    />
                    <div className='absolute right-0 top-full mt-2 p-1.5 theme-bg-secondary rounded-2xl shadow-xl theme-border border z-20 min-w-[118px] backdrop-blur-md'>
                      {[
                        { key: 'cn' as const, label: t('cnRegion') },
                        { key: 'global' as const, label: t('enRegion') },
                      ].map((opt) => {
                        const selected = currentRegion === opt.key;

                        return (
                          <button
                            key={opt.key}
                            className={`w-full h-8 px-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between gap-2 ${selected
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

            {/* 日期下拉选择 */}
            <div className='relative'>
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
                  <div
                    className='fixed inset-0 z-10'
                    onClick={() => setShowDaysDropdown(false)}
                  />
                  <div className='absolute right-0 top-full mt-2 p-1.5 theme-bg-secondary rounded-2xl shadow-xl theme-border border z-20 min-w-[86px] backdrop-blur-md'>
                    {timeOptions.map((days) => {
                      const selected = activeTimeValue === days;
                      const label = isTweetTab
                        ? hourLabels[days as 1 | 4 | 8 | 24]
                        : dayLabels[days as 1 | 7];

                      return (
                        <button
                          key={days}
                          className={`w-full h-8 px-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between gap-2 ${selected
                            ? 'text-blue-500 bg-blue-500/10'
                            : 'theme-text-primary hover:bg-slate-500/10'
                            }`}
                          onClick={() => {
                            // @ts-ignore
                            if (activeType === 'tweet') {
                              // hours mode
                              setActiveHours(days as any);
                            } else {
                              // days mode
                              setActiveDays(days as any);
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

        {/* Tab导航 - 统一使用 Tabs 组件 */}
        <Tabs
          tabs={tabs}
          activeTab={activeType}
          onChange={(id) => handleTabChange(id as ActiveType)}
          zhMaxRow={4}
          enMaxRow={3}
          labelClassName='text-[13px] font-semibold'
        />
      </div>

      {/* Content区域 */}
      <div
        ref={contentScrollRef}
        className={`relative flex-1 overflow-x-hidden max-h-[430px] scrollbar-hide ${activeType === 'tweet' && filterPanelExpanded ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
      >
        {/* KOLs 次级 Tab */}
        {activeType === 'person' && (
          <div className='sticky top-0 z-10 pt-2 pb-2 filter backdrop-blur-sm'>
            <SecondaryTabs
              tabs={kolTabs}
              activeTab={activeKolTab}
              onChange={(id) => {
                setActiveKolTab(id as any);
                setTweetTagFilter({
                  type: null,
                  groupId: null,
                  subTagId: null,
                  hotTag: null,
                });
              }}
            />
          </div>
        )}

        {/* Media 次级 Tab */}
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

        {/* Discussion 次级 Tab */}
        {/* {activeType === 'discussion' && (
          <div className='sticky top-0 z-10 pt-2 pb-2 filter backdrop-blur-sm'>
            <SecondaryTabs
              tabs={[
                { id: 'hot', label: t('discussion_tab_hot') },
                // { id: 'positive', label: t('discussion_tab_positive') },
                // { id: 'negative', label: t('discussion_tab_negative') },
              ]}
              activeTab={activeDiscussionTab}
              onChange={(id) => setActiveDiscussionTab(id as any)}
            />
          </div>
        )} */}

        <div className='px-4 pb-4'>
          {activeType === 'person' && activeKolTab === 'traffic' && (
            <div className='px-3.5 py-1 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500'>
              <Info className='h-3 w-3 shrink-0' />
              <span>{t('kolTrafficDescription')}</span>
            </div>
          )}
          {activeType === 'person' && activeKolTab === 'interaction' && (
            <div className='px-3.5 py-1 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500'>
              <Info className='h-3 w-3 shrink-0' />
              <span>{t('kolInteractionDescription')}</span>
            </div>
          )}
          {activeType === 'discussion' &&
            activeDiscussionTab === 'positive' && (
              <div className='px-3.5 py-1 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500'>
                <Info className='h-3 w-3 shrink-0' />
                <span>{t('discussionPositiveDescription')}</span>
              </div>
            )}
          {activeType === 'discussion' &&
            activeDiscussionTab === 'negative' && (
              <div className='px-3.5 py-1 flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500'>
                <Info className='h-3 w-3 shrink-0' />
                <span>{t('discussionNegativeDescription')}</span>
              </div>
            )}
          {currentLoading && !hasData ? (
            <div className='flex items-center justify-center h-full min-h-[360px]'>
              <div className='w-6 h-6 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin'></div>
            </div>
          ) : hasData ? (
            <div className='w-full h-full hot-content-transition min-h-[360px] scrollbar-hide'>
              {activeTabConfig?.render()}
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

      {/* 关闭确认弹框（放在最外层容器末尾，避免被头部层覆盖） */}
      <CloseConfirmDialog
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={async () => {
          setIsHidden(true);
          setShowCloseConfirm(false);
          try {
            await localStorageInstance.set('@settings/showHotTrendingWeb3', false);
          } catch { }
        }}
        prefixKey='confirmCloseTrendingPrefix'
        suffixKey='confirmCloseTrendingSuffix'
      />
    </div>
  );
}
