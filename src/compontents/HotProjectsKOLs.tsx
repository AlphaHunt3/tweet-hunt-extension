import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  TrendingUp,
  Users,
  MessageSquare,
  Star,
} from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useRequest } from 'ahooks';
import {
  getHotProject,
  getHotToken,
  getTopTag,
} from '~contents/services/api.ts';
import { TokenTreemapVisualization } from './HotProjectsKOLs/TokenTreemapVisualization';
import { TrendingListVisualization } from './HotProjectsKOLs/TrendingListVisualization';
import { HotItem, HotToken, HotDiscussion } from './HotProjectsKOLs/types';

export interface HotProjectsKOLsProps {
  className?: string;
}

export function HotProjectsKOLs({ className = '' }: HotProjectsKOLsProps) {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [activeType, setActiveType] = useLocalStorage<
    'project' | 'person' | 'token' | 'discussion' | 'following'
  >('@xhunt/hotProjectsActiveType', 'token');
  const [activeDays, setActiveDays] = useState<1 | 7>(1);
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);
  const [region, setRegion] = useLocalStorage<'cn' | 'global'>(
    '@xhunt/hotProjectsRegion',
    'cn'
  );
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 关注数据请求（原项目数据）
  const {
    data: followingData,
    loading: followingLoading,
    run: fetchFollowingData,
  } = useRequest(
    () => {
      return getHotProject(region, 'project', activeDays);
    },
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [region],
    }
  );

  // KOL数据请求
  const {
    data: personData,
    loading: personLoading,
    run: fetchPersonData,
  } = useRequest(
    () => {
      return getHotProject(region, 'person', activeDays);
    },
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [region],
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

  // 讨论数据请求
  const {
    data: discussionData,
    loading: discussionLoading,
    run: fetchDiscussionData,
  } = useRequest(
    () => {
      return getTopTag('mention', region, activeDays);
    },
    {
      manual: true,
      debounceWait: 300,
      refreshDeps: [region],
    }
  );

  // 预加载所有数据
  useEffect(() => {
    fetchFollowingData();
    fetchPersonData();
    fetchDiscussionData();
    // tokenData已经自动加载了
  }, [activeDays, region]);

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
        return t('kolDescription');
      default:
        return '';
    }
  };

  // 处理tab切换
  const handleTabChange = (
    newType: 'project' | 'person' | 'token' | 'discussion' | 'following'
  ) => {
    if (newType === activeType) return;

    setIsTransitioning(true);

    // 使用requestAnimationFrame确保状态更新在下一帧
    requestAnimationFrame(() => {
      setActiveType(newType);

      // 短暂延迟后移除过渡状态
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    });
  };

  // 处理数据
  const hotItems: HotItem[] = React.useMemo(() => {
    if (activeType === 'token' || activeType === 'discussion') return [];

    const sourceData = activeType === 'following' ? followingData : personData;
    if (!sourceData?.data?.data) return [];

    return sourceData.data.data.slice(0, 10);
  }, [followingData, personData, activeType]);

  // 处理讨论数据
  const hotDiscussions: HotDiscussion[] = React.useMemo(() => {
    if (activeType !== 'discussion' || !discussionData?.data?.data) return [];
    return discussionData.data.data.slice(0, 10);
  }, [discussionData, activeType]);

  // 处理Token数据
  const hotTokens: HotToken[] = React.useMemo(() => {
    if (activeType !== 'token' || !tokenData?.data?.data) return [];
    const dayKey = activeDays === 1 ? 'day1' : 'day7';
    return tokenData.data.data[dayKey]?.slice(0, 10) || [];
  }, [tokenData, activeType, activeDays]);

  // 根据activeType决定可用的天数选项
  const dayOptions = [1, 7] as const;
  const dayLabels: Record<1 | 7, string> = {
    1: '1d',
    7: '7d',
  };

  // 获取当前的loading状态
  const currentLoading =
    activeType === 'token'
      ? tokenLoading
      : activeType === 'discussion'
      ? discussionLoading
      : activeType === 'following'
      ? followingLoading
      : personLoading;

  // Tab配置
  const tabs = [
    { id: 'token', label: t('tokens'), icon: Star },
    { id: 'discussion', label: t('discussions'), icon: MessageSquare },
    { id: 'following', label: t('following'), icon: TrendingUp },
    { id: 'person', label: t('kols'), icon: Users },
  ];

  // 获取当前的数据
  const hasData =
    activeType === 'token'
      ? hotTokens.length > 0
      : activeType === 'discussion'
      ? hotDiscussions.length > 0
      : hotItems.length > 0;

  return (
    <>
      {/* Header */}
      <div className='px-4 pt-3 theme-border flex-shrink-0'>
        {/* 标题和区域/日期选择 */}
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-base font-semibold theme-text-primary whitespace-nowrap overflow-hidden text-ellipsis'>
            🔥 XHunt {t('trendingNow')}
          </h3>

          {/* 区域与日期下拉选择 */}
          <div className='flex items-center gap-2'>
            {/* 区域下拉选择（在日期选择左边一点） - 仅非token标签显示 */}
            {activeType !== 'token' && (
              <div className='relative'>
                <button
                  className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md theme-text-primary theme-hover transition-colors border theme-border whitespace-nowrap'
                  onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                >
                  {region === 'cn' ? t('cnRegion') : t('enRegion')}
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
                          className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                            region === opt.key
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'theme-text-primary theme-hover'
                          }`}
                          onClick={() => {
                            setRegion(opt.key);
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
                {dayLabels[activeDays]}
                <ChevronDown className='w-3 h-3' />
              </button>

              {showDaysDropdown && (
                <>
                  <div
                    className='fixed inset-0 z-10'
                    onClick={() => setShowDaysDropdown(false)}
                  />
                  <div className='absolute right-0 top-full mt-1 py-1 theme-bg-secondary rounded-md shadow-lg theme-border border z-20 min-w-[60px]'>
                    {dayOptions.map((days) => (
                      <button
                        key={days}
                        className={`w-full px-3 py-1.5 text-xs text-left transition-colors ${
                          activeDays === days
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'theme-text-primary theme-hover'
                        }`}
                        onClick={() => {
                          // @ts-ignore
                          setActiveDays(days);
                          setShowDaysDropdown(false);
                        }}
                      >
                        {dayLabels[days]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab导航 - 使用与SearchBottomPanel一致的样式 */}
        <div className='flex border-b theme-border'>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeType === tab.id;

            return (
              <button
                key={tab.id}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 relative group ${
                  isActive
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
                onClick={() => handleTabChange(tab.id as any)}
                title={getTabDescription(tab.id)}
              >
                <Icon className='w-4 h-4' />
                {tab.label}

                {/* Hover tooltip */}
                <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-[10px] theme-bg-secondary theme-text-primary rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 shadow-lg theme-border border'>
                  {getTabDescription(tab.id)}
                  <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[var(--border-color)]'></div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 激活Tab的说明文字
        <div className="px-3 py-1.5 text-xs theme-text-secondary bg-blue-400/5 border-b theme-border">
          {getTabDescription(activeType)}
        </div> */}
      </div>

      {/* Content区域 */}
      <div className='flex-1 p-4 overflow-y-auto overflow-x-hidden max-h-[430px] custom-scrollbar'>
        {currentLoading || isTransitioning ? (
          <div className='flex items-center justify-center h-full'>
            <div className='w-6 h-6 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin'></div>
          </div>
        ) : hasData ? (
          <div
            className='w-full h-full transition-opacity duration-200'
            style={{ opacity: isTransitioning ? 0 : 1 }}
          >
            {activeType === 'token' ? (
              <TokenTreemapVisualization
                items={hotTokens}
                loading={tokenLoading}
                width={318}
                height={400}
              />
            ) : activeType === 'discussion' ? (
              <TrendingListVisualization
                items={hotDiscussions}
                loading={currentLoading}
                type='discussion'
              />
            ) : (
              <TrendingListVisualization
                items={hotItems}
                loading={currentLoading}
                type={activeType === 'following' ? 'project' : 'person'}
              />
            )}
          </div>
        ) : (
          <div className='flex items-center justify-center h-full theme-text-secondary'>
            <div className='text-center'>
              <div className='text-sm'>No data</div>
              <div className='text-xs mt-1'>Try different period</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
