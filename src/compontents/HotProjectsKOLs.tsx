import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  ChevronDown,
  TrendingUp,
  Users,
  MessageSquare,
  Star,
  Info,
  FileText,
} from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage, useSessionStorage } from '~storage/useLocalStorage';
import { useRequest } from 'ahooks';
import {
  getHotProject,
  getHotToken,
  getTopInfluencer,
  getTopTag,
  getProjectAttitude,
  getHotTweet,
} from '~contents/services/api.ts';
import { TokenTreemapVisualization } from './HotProjectsKOLs/TokenTreemapVisualization';
import { TrendingListVisualization } from './HotProjectsKOLs/TrendingListVisualization';
import {
  HotItem,
  HotToken,
  HotDiscussion,
  DiscussionAttitudeItem,
} from './HotProjectsKOLs/types';
import { localStorageInstance } from '~storage/index.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { Tabs } from './Tabs';
import { CloseConfirmDialog } from './CloseConfirmDialog';
import { SecondaryTabs } from './SecondaryTabs';
import { TweetTagFilter } from './HotProjectsKOLs/TweetTagFilter';
import { TweetList } from './HotProjectsKOLs/TweetList';

export interface HotProjectsKOLsProps {
  className?: string;
}

export function HotProjectsKOLs({ className = '' }: HotProjectsKOLsProps) {
  const contentScrollRef = React.useRef<HTMLDivElement | null>(null);
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
  const [activeType, setActiveType] = useLocalStorage<
    'project' | 'person' | 'token' | 'discussion' | 'following' | 'tweet'
  >('@xhunt/hotProjectsActiveType', 'person');
  const [activeKolTab, setActiveKolTab] = useState<'traffic' | 'following'>(
    'traffic'
  );
  const [activeDiscussionTab, setActiveDiscussionTab] = useState<
    'hot' | 'positive' | 'negative'
  >('hot');
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false);
  const [activeDays, setActiveDays] = useState<1 | 7>(1);
  const [activeHours, setActiveHours] = useState<1 | 4 | 24>(4);
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);

  // 当切换到 tweet tab 时，默认用 1h；切回其它 tab 保持日维度
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

  // console.log(hotTweetData, '??hotTweetData?')

  // 按需加载：仅在切换到对应 Tab 时拉取数据
  useEffect(() => {
    if (activeType === 'following') {
      fetchFollowingData();
      return;
    }

    if (activeType === 'person') {
      if (activeKolTab === 'traffic') {
        fetchTopInfluencerData();
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

    // token: tokenData 已经自动加载
  }, [
    activeType,
    activeKolTab,
    activeDiscussionTab,
    activeDays,
    activeHours,
    currentRegion,
  ]);

  // 获取tab说明文字
  const getTabDescription = (tabId: string) => {
    switch (tabId) {
      case 'token':
        return t('tokenDescription');
      case 'discussion':
        return t('discussionDescription');
      case 'following':
        return t('followingDescription');
      case 'person':
        return "";
      default:
        return '';
    }
  };

  // 检查浏览器是否支持 View Transition API
  const supportsViewTransition =
    typeof document !== 'undefined' && 'startViewTransition' in document;

  // 处理tab切换
  const handleTabChange = (
    newType: 'project' | 'person' | 'token' | 'discussion' | 'following'
  ) => {
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

  const hourOptions = [1, 4, 24] as const;
  const hourLabels: Record<1 | 4 | 24, string> = {
    1: '1h',
    4: '4h',
    24: '24h',
  };

  const isTweetTab = activeType === 'tweet';
  const timeOptions = isTweetTab ? hourOptions : dayOptions;
  const activeTimeValue = isTweetTab ? activeHours : activeDays;

  const activeTimeLabel = isTweetTab
    ? hourLabels[activeHours]
    : dayLabels[activeDays];

  // 获取当前的loading状态
  const currentLoading =
    activeType === 'token'
      ? tokenLoading
      : activeType === 'discussion'
        ? activeDiscussionTab === 'hot'
          ? discussionLoading
          : discussionAttitudeLoading
        : activeType === 'following'
          ? followingLoading
          : activeType === 'person' && activeKolTab === 'following'
            ? personLoading
            : activeType === 'person' && activeKolTab === 'traffic'
              ? topInfluencerLoading
              : activeType === 'tweet'
                ? hotTweetLoading
                : false;

  // Tab配置
  const tabs = [
    { id: 'person', label: t('kols'), icon: Users },
    { id: 'tweet', label: t('tweets'), icon: FileText, isNew: true },
    {
      id: 'discussion',
      label: t('discussions'),
      icon: MessageSquare,
      // isNew: true,
    },
    { id: 'following', label: t('following'), icon: TrendingUp },
    { id: 'token', label: t('tokens'), icon: Star },
  ];

  const kolTabs = [
    { id: 'traffic', label: t('kol_tabs_most_traffic') },
    { id: 'following', label: t('kol_tabs_most_followed') },
  ];

  // 获取当前的数据
  const hasData =
    activeType === 'token'
      ? hotTokens.length > 0
      : activeType === 'discussion'
        ? discussionItemsToShow.length > 0
        : activeType === 'person' && activeKolTab === 'following'
          ? hotItems.length > 0
          : activeType === 'person' && activeKolTab === 'traffic'
            ? topInfluencerItems.length > 0
            : activeType === 'following'
              ? hotItems.length > 0
              : activeType === 'tweet'
                ? true
                : false;

  // 检查热门趋势是否启用
  if (!isEnabled('showHotTrending')) {
    return (
      <div className='px-4 pt-4 text-center'>
        <div className='text-sm theme-text-secondary'>
          {t('hotTrendingDisabled')}
        </div>
      </div>
    );
  }

  if (isHidden) return <></>;

  return (
    <div className='relative'>
      {/* Header */}
      <div className='px-4 pt-3 theme-border flex-shrink-0'>
        {/* 标题和区域/日期选择 */}
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-base font-semibold theme-text-primary whitespace-nowrap overflow-hidden text-ellipsis'>
            🔥 XHunt {t('trendingNow')}
          </h3>

          {/* 右侧操作区：区域/日期下拉 + 关闭 */}
          <div className='flex items-center gap-2'>
            {/* 区域下拉选择（在日期选择左边一点） - 仅非token标签显示 */}
            {activeType !== 'token' && (
              <div className='relative'>
                <button
                  className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md theme-text-primary theme-hover transition-colors border theme-border whitespace-nowrap'
                  onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                >
                  {currentRegion === 'cn' ? t('cnRegion') : t('enRegion')}
                  <ChevronDown className='w-3 h-3' />
                </button>

                {showRegionDropdown && (
                  <>
                    <div
                      className='fixed inset-0 z-10'
                      onClick={() => setShowRegionDropdown(false)}
                    />
                    <div className='absolute right-0 top-full mt-1 py-1 theme-bg-secondary rounded-md shadow-lg theme-border border z-20 min-w-[100px]'>
                      {[
                        { key: 'cn' as const, label: t('cnRegion') },
                        { key: 'global' as const, label: t('enRegion') },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${currentRegion === opt.key
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'theme-text-primary theme-hover'
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
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 日期下拉选择 */}
            <div className='relative'>
              <button
                className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md theme-text-primary theme-hover transition-colors border theme-border whitespace-nowrap'
                onClick={() => setShowDaysDropdown(!showDaysDropdown)}
              >
                {activeTimeLabel}
                <ChevronDown className='w-3 h-3' />
              </button>

              {showDaysDropdown && (
                <>
                  <div
                    className='fixed inset-0 z-10'
                    onClick={() => setShowDaysDropdown(false)}
                  />
                  <div className='absolute right-0 top-full mt-1 py-1 theme-bg-secondary rounded-md shadow-lg theme-border border z-20 min-w-[60px]'>
                    {timeOptions.map((days) => (
                      <button
                        key={days}
                        className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${activeTimeValue === days
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'theme-text-primary theme-hover'
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
                        {isTweetTab ? hourLabels[days as 1 | 4 | 24] : dayLabels[days as 1 | 7]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 关闭按钮 */}
            <button
              type='button'
              aria-label='Close Hot Trending'
              title='Close'
              className='p-1.5 rounded-md theme-hover theme-text-primary'
              onClick={() => setShowCloseConfirm(true)}
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </div>

        {/* Tab导航 - 统一使用 Tabs 组件 */}
        <Tabs
          tabs={tabs.map((tab) => ({
            ...tab,
            tooltip: getTabDescription(tab.id),
          }))}
          activeTab={activeType}
          onChange={(id) => handleTabChange(id as any)}
          zhMaxRow={4}
          enMaxRow={2}
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
          {currentLoading ? (
            <div className='flex items-center justify-center h-full min-h-[360px]'>
              <div className='w-6 h-6 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin'></div>
            </div>
          ) : hasData ? (
            <div className='w-full h-full hot-content-transition min-h-[360px] scrollbar-hide'>
              {activeType === 'token' ? (
                <TokenTreemapVisualization
                  items={hotTokens}
                  loading={tokenLoading}
                  width={318}
                  height={400}
                />
              ) : activeType === 'discussion' ? (
                <TrendingListVisualization
                  items={discussionItemsToShow}
                  loading={currentLoading}
                  type='discussion'
                />
              ) : activeType === 'following' ? (
                <TrendingListVisualization
                  items={hotItems}
                  loading={currentLoading}
                  type='project'
                />
              ) : activeType === 'person' && activeKolTab === 'following' ? (
                <TrendingListVisualization
                  items={hotItems}
                  loading={currentLoading}
                  type='person'
                />
              ) : activeType === 'person' && activeKolTab === 'traffic' ? (
                <TrendingListVisualization
                  items={topInfluencerItems}
                  loading={currentLoading}
                  type='person'
                />
              ) : activeType === 'tweet' ? (
                <div className='min-h-[360px] mt-1'>
                  <TweetTagFilter
                    scrollContainerRef={contentScrollRef}
                    items={hotTweetData?.data?.data || []}
                    selectedType={tweetTagFilter.type}
                    selectedGroupId={tweetTagFilter.groupId}
                    selectedSubTagId={tweetTagFilter.subTagId}
                    selectedHotTag={tweetTagFilter.hotTag}
                    onChange={(next) => setTweetTagFilter(next)}
                    onExpandChange={setFilterPanelExpanded}
                  />

                  <TweetList
                    items={hotTweetData?.data?.data || []}
                    filter={tweetTagFilter}
                    lang={lang === 'zh' ? 'zh' : 'en'}
                  />
                </div>
              ) : null}
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
            await localStorageInstance.set('@settings/showHotTrending', false);
          } catch { }
        }}
        prefixKey='confirmCloseTrendingPrefix'
        suffixKey='confirmCloseTrendingSuffix'
      />
    </div>
  );
}
