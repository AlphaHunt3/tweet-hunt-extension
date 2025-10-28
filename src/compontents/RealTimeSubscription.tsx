import React from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { GossipTweet } from '~contents/services/api.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { sanitizeHtml } from '~utils/sanitizeHtml';
import { Tabs } from './Tabs';
import { useCrossPageSettings } from '~utils/settingsManager';

// Chrome 类型声明
declare const chrome: any;
import {
  MessageCircle,
  Repeat,
  Heart,
  Eye,
  Quote,
  Megaphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import numeral from 'numeral';
import RealtimeSettings from './RealtimeSettings';

// 存储键常量
const FEED_STORAGE_KEY = 'xhunt:realtime_feed_cache';
const GOSSIP_STORAGE_KEY = 'xhunt:realtime_gossip_cache';
const LISTING_STORAGE_KEY = 'xhunt:realtime_listing_cache';

export interface RealTimeSubscriptionProps {
  className?: string;
}

export interface RealTimeSubscriptionRef {
  switchToTabAndHighlight: (dataType: 'bnb' | 'gossip' | 'listing') => void;
}

export const RealTimeSubscription = React.forwardRef<
  RealTimeSubscriptionRef,
  RealTimeSubscriptionProps
>(({ className = '' }, ref) => {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { isEnabled } = useCrossPageSettings();
  // const { isLeader } = useLeader();

  // 滚动容器的ref
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // 数据状态
  const [dataState, setDataState] = React.useState<{
    follow_feed?: any;
    tweets_feed: any[];
    bwe_news?: any[];
    bwe_news_listing?: any[];
  }>({ tweets_feed: [] });

  // 合并逻辑已迁移至 background；前端不再处理合并/精简

  // Gossip 数据状态
  const [gossipData, setGossipData] = React.useState<GossipTweet[]>([]);

  // Listing 数据状态
  const [listingData, setListingData] = React.useState<any[]>([]);

  // 子标签页状态
  const [activeSubTab, setActiveSubTab] = React.useState<
    'bnb' | 'gossip' | 'listing'
  >('bnb');

  // 当设置变化时，自动调整activeSubTab
  React.useEffect(() => {
    const bnbEnabled = isEnabled('enableBnbFeeds');
    const gossipEnabled = isEnabled('enableGossip');
    const listingEnabled = isEnabled('enableListing');

    // 如果当前激活的标签页被禁用，切换到可用的标签页
    if (
      activeSubTab === 'bnb' &&
      !bnbEnabled &&
      (gossipEnabled || listingEnabled)
    ) {
      setActiveSubTab(gossipEnabled ? 'gossip' : 'listing');
    } else if (
      activeSubTab === 'gossip' &&
      !gossipEnabled &&
      (bnbEnabled || listingEnabled)
    ) {
      setActiveSubTab(bnbEnabled ? 'bnb' : 'listing');
    } else if (
      activeSubTab === 'listing' &&
      !listingEnabled &&
      (bnbEnabled || gossipEnabled)
    ) {
      setActiveSubTab(bnbEnabled ? 'bnb' : 'gossip');
    }
  }, [isEnabled, activeSubTab]);

  // 简化的状态管理
  const [lastUpdateTime, setLastUpdateTime] = React.useState<string>('');

  // 闪动动画状态
  const [highlightedItem, setHighlightedItem] = React.useState<string | null>(
    null
  );

  // 小红点状态管理
  const [gossipHasNewMessage, setGossipHasNewMessage] = React.useState(false);
  const [bnbHasNewMessage, setBnbHasNewMessage] = React.useState(false);
  const [listingHasNewMessage, setListingHasNewMessage] = React.useState(false);

  // 定义子标签页选项
  const subTabs = React.useMemo(() => {
    const tabs = [];

    // 根据设置动态添加BNB Feeds标签页
    if (isEnabled('enableBnbFeeds')) {
      tabs.push({
        id: 'bnb',
        label: t('bnbFeeds'),
        hasRedDot:
          bnbHasNewMessage &&
          (activeSubTab === 'gossip' || activeSubTab === 'listing'),
      });
    }

    // 根据设置动态添加Gossip标签页
    if (isEnabled('enableGossip')) {
      tabs.push({
        id: 'gossip',
        label: t('gossip'),
        hasRedDot:
          gossipHasNewMessage &&
          (activeSubTab === 'bnb' || activeSubTab === 'listing'),
      });
    }

    // 根据设置动态添加Listing标签页
    if (isEnabled('enableListing')) {
      tabs.push({
        id: 'listing',
        label: t('listDelist'),
        hasRedDot:
          listingHasNewMessage &&
          (activeSubTab === 'bnb' || activeSubTab === 'gossip'),
      });
    }

    return tabs;
  }, [
    bnbHasNewMessage,
    gossipHasNewMessage,
    listingHasNewMessage,
    activeSubTab,
    isEnabled,
    t,
  ]);

  // 处理子标签页切换
  const handleSubTabChange = (id: string) => {
    setActiveSubTab(id as 'bnb' | 'gossip' | 'listing');

    // 切换标签页时滚动到顶部
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // 监听 storage 变化（数据更新 + 通知处理）
  React.useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: any }) => {
      // 监听 BNB feed 数据变化
      if (changes[FEED_STORAGE_KEY]?.newValue) {
        const data = changes[FEED_STORAGE_KEY].newValue;
        console.log('[RealTimeSubscription] BNB feed updated:', data);
        setDataState({
          follow_feed: data.follow_feed,
          tweets_feed: data.tweets_feed || [],
          bwe_news: data.bwe_news || [],
        });
        setLastUpdateTime(new Date().toLocaleTimeString());
      }

      // 监听 Gossip 数据变化
      if (changes[GOSSIP_STORAGE_KEY]?.newValue) {
        const data = changes[GOSSIP_STORAGE_KEY].newValue;
        console.log('[RealTimeSubscription] Gossip data updated:', data);
        // 处理新的gossip数据结构
        const gossipData = data.data || data;
        setGossipData(gossipData || []);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }

      // 监听 Listing 数据变化
      if (changes[LISTING_STORAGE_KEY]?.newValue) {
        const data = changes[LISTING_STORAGE_KEY].newValue;
        console.log('[RealTimeSubscription] Listing data updated:', data);
        // 处理新的listing数据结构
        const listingData = data.data || data;
        setListingData(listingData || []);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }

      // 监听实时通知变化，设置小红点
      if (changes['xhunt:realtime_notification']?.newValue) {
        const message = changes['xhunt:realtime_notification'].newValue;

        if (message.type === 'REALTIME_FEED_UPDATE') {
          const { dataType, isFirstLoad } = message;

          // 跳过第一次加载的通知
          if (isFirstLoad) {
            return;
          }

          // 根据通知类型和当前页面状态设置小红点
          if (
            dataType === 'bnb' &&
            (activeSubTab === 'gossip' || activeSubTab === 'listing')
          ) {
            setBnbHasNewMessage(true);
          } else if (
            dataType === 'gossip' &&
            (activeSubTab === 'bnb' || activeSubTab === 'listing')
          ) {
            setGossipHasNewMessage(true);
          } else if (
            dataType === 'listing' &&
            (activeSubTab === 'bnb' || activeSubTab === 'gossip')
          ) {
            setListingHasNewMessage(true);
          }
        }
      }
    };

    // 监听 storage 变化
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [activeSubTab]);

  // 监听选项卡切换，清除对应的小红点
  React.useEffect(() => {
    if (activeSubTab === 'gossip') {
      setGossipHasNewMessage(false);
    } else if (activeSubTab === 'bnb') {
      setBnbHasNewMessage(false);
    } else if (activeSubTab === 'listing') {
      setListingHasNewMessage(false);
    }

    // 切换标签页时滚动到顶部
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeSubTab]);

  // 初始化数据加载
  React.useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 读取现有缓存数据
        const [feedCache, gossipCache, listingCache] = await Promise.all([
          new Promise<any>((resolve) => {
            (chrome as any).storage?.local?.get(
              [FEED_STORAGE_KEY],
              (res: any) => {
                resolve(res?.[FEED_STORAGE_KEY] || null);
              }
            );
          }),
          new Promise<any>((resolve) => {
            (chrome as any).storage?.local?.get(
              [GOSSIP_STORAGE_KEY],
              (res: any) => {
                resolve(res?.[GOSSIP_STORAGE_KEY] || null);
              }
            );
          }),
          new Promise<any>((resolve) => {
            (chrome as any).storage?.local?.get(
              [LISTING_STORAGE_KEY],
              (res: any) => {
                resolve(res?.[LISTING_STORAGE_KEY] || null);
              }
            );
          }),
        ]);

        if (feedCache) {
          setDataState({
            follow_feed: feedCache.follow_feed,
            tweets_feed: feedCache.tweets_feed || [],
            bwe_news: feedCache.bwe_news || [],
          });
        }

        if (gossipCache) {
          // 处理新的gossip数据结构
          const gossipData = gossipCache.data || gossipCache;
          setGossipData(gossipData);
        }

        if (listingCache) {
          // 处理新的listing数据结构
          const listingData = listingCache.data || listingCache;
          setListingData(listingData);
        }

        // 检查是否需要强制刷新
        const shouldForceRefresh = () => {
          // 如果没有缓存数据，需要刷新
          if (!feedCache || !gossipCache || !listingCache) {
            return true;
          }

          // 检查距离上次请求时间是否超过5分钟
          const now = Math.floor(Date.now() / 1000);
          const lastRequestTime =
            feedCache?.meta?.lastRequestTs ||
            gossipCache?.meta?.lastRequestTs ||
            listingCache?.meta?.lastRequestTs;

          if (lastRequestTime) {
            const timeDiff = now - lastRequestTime;
            const fiveMinutes = 2 * 60; // 2分钟

            if (timeDiff > fiveMinutes) {
              console.log(
                `[RealTimeSubscription] Last request was ${timeDiff} seconds ago, forcing refresh`
              );
              return true;
            }
          }

          return false;
        };

        if (shouldForceRefresh()) {
          chrome.runtime.sendMessage({
            type: 'FORCR_EXEC_POLLER_TICK',
          });
        }
      } catch (e) {
        console.log('[RealTimeSubscription] Failed to load initial data:', e);
      }
    };

    loadInitialData();
  }, []);

  const followFeed = dataState.follow_feed as any;
  const tweetsFeed = (dataState.tweets_feed as any[]) || [];

  // 暴露给父组件的方法
  React.useImperativeHandle(
    ref,
    () => ({
      switchToTabAndHighlight: (dataType: 'bnb' | 'gossip' | 'listing') => {
        console.log(
          '[RealTimeSubscription] switchToTabAndHighlight called:',
          dataType
        );

        // 切换到对应的子标签页
        setActiveSubTab(dataType);
        console.log('[RealTimeSubscription] Switched to tab:', dataType);

        // 使用 requestAnimationFrame 确保DOM渲染完成
        requestAnimationFrame(() => {
          // 再次使用 requestAnimationFrame 确保状态更新后的渲染完成
          requestAnimationFrame(() => {
            // 高亮第一个元素（简化逻辑）
            setHighlightedItem('first');
            // 滚动到列表顶部
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = 0;
            }

            // 5秒后清除高亮
            setTimeout(() => {
              setHighlightedItem(null);
            }, 5000);
          });
        });
      },
    }),
    []
  );

  // 检查实时订阅是否启用
  if (!isEnabled('showRealtimeSubscription')) {
    return (
      <div data-theme={theme} className={`w-full ${className}`}>
        <div className='px-4 pt-4 text-center'>
          <div className='text-sm theme-text-secondary'>
            {t('realtimeSubscriptionDisabled')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme} className={`w-full ${className}`}>
      {/* 子标签页 */}
      <div className='px-4 pt-1'>
        <Tabs
          tabs={subTabs}
          activeTab={activeSubTab}
          onChange={handleSubTabChange}
        />
        {/* 统一的状态和通知测试区域
        <StatusAndNotificationPanel
          activeSubTab={activeSubTab}
          lastUpdateTime={lastUpdateTime}
          tweetsCount={tweetsFeed.length}
          followsCount={followFeed?.following_action?.length || 0}
          gossipCount={gossipData.length}
        /> */}
        {/* 设置选项 */}
        <RealtimeSettings activeSubTab={activeSubTab} />
      </div>

      {/* 列表内容 */}
      <div
        ref={scrollContainerRef}
        className='p-4 pt-2 max-h-[430px] overflow-y-auto custom-scrollbar'
      >
        {activeSubTab === 'bnb' ? (
          // BNB Feeds 内容
          dataState.tweets_feed.length === 0 && !dataState.follow_feed ? (
            <div className='flex items-center justify-center py-10'>
              <div className='w-6 h-6 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin' />
            </div>
          ) : (
            <div className='space-y-2'>
              {(() => {
                const items: Array<
                  | { kind: 'tweet'; createdAt: number; key: string; tw: any }
                  | {
                      kind: 'follow';
                      createdAt: number;
                      key: string;
                      item: any;
                      users: any;
                    }
                  | {
                      kind: 'news';
                      createdAt: number;
                      key: string;
                      news: any;
                    }
                > = [];
                (tweetsFeed || []).forEach((tw: any) => {
                  const createdAt = Date.parse(tw?.create_time || '') || 0;
                  items.push({
                    kind: 'tweet',
                    createdAt,
                    key: `tw-${tw?.id || 'unknown'}`,
                    tw,
                  });
                });
                const users = followFeed?.twitter_users || {};
                (followFeed?.following_action || []).forEach((it: any) => {
                  const createdAt = Date.parse(it?.created_at || '') || 0;
                  const key = `fo-${it?.follower_id || 'unknown'}-${
                    it?.following_id || 'unknown'
                  }-${it?.created_at || 'unknown'}`;
                  items.push({
                    kind: 'follow',
                    createdAt,
                    key,
                    item: it,
                    users,
                  });
                });
                // 集成 BWE 新闻
                (dataState.bwe_news || []).forEach((nw: any) => {
                  const createdAt = Date.parse(nw?.pubDate || '') || 0;
                  const key = `news-${nw?.link || nw?.title || createdAt}`;
                  items.push({
                    kind: 'news',
                    createdAt,
                    key,
                    news: nw,
                  });
                });
                items.sort((a, b) => b.createdAt - a.createdAt);
                return items.slice(0, 50).map((u, idx) => {
                  return u.kind === 'tweet' ? (
                    <TweetCard
                      key={u.key}
                      tw={u.tw}
                      t={t}
                      isHighlighted={highlightedItem === 'first' && idx === 0}
                      lang={lang}
                    />
                  ) : u.kind === 'follow' ? (
                    <FollowCard
                      key={u.key}
                      item={u.item}
                      users={u.users}
                      t={t}
                      isHighlighted={highlightedItem === 'first' && idx === 0}
                    />
                  ) : (
                    <NewsCard
                      key={u.key}
                      news={u.news}
                      t={t}
                      isHighlighted={highlightedItem === 'first' && idx === 0}
                    />
                  );
                });
              })()}
            </div>
          )
        ) : activeSubTab === 'gossip' ? (
          // Gossip 内容
          gossipData.length === 0 ? (
            <div className='flex items-center justify-center py-10'>
              <div className='w-6 h-6 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin' />
            </div>
          ) : (
            <div className='space-y-2'>
              {gossipData.slice(0, 50).map((tweet, idx) => (
                <GossipCard
                  key={tweet.id}
                  tweet={tweet}
                  t={t}
                  isHighlighted={highlightedItem === 'first' && idx === 0}
                  lang={lang}
                />
              ))}
            </div>
          )
        ) : // Listing 内容
        listingData.length === 0 ? (
          // 没有数据
          <div className='flex flex-col items-center justify-center py-10 space-y-2'>
            <div className='text-4xl'>📭</div>
            <p className='text-sm theme-text-secondary'>
              {t('noDataAvailable')}
            </p>
          </div>
        ) : (
          // 有数据，显示列表
          <div className='space-y-2'>
            {listingData.slice(0, 50).map((listing, idx) => (
              <ListingCard
                key={listing.link || listing.title || idx}
                listing={listing}
                t={t}
                isHighlighted={highlightedItem === 'first' && idx === 0}
                lang={lang}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// Follow 卡片（统一消息流）
const FollowCard: React.FC<{
  item: any;
  users: any;
  t: (k: string) => string;
  isHighlighted?: boolean;
}> = ({ item, users, t, isHighlighted = false }) => {
  const follower = users?.[item.follower_id];
  const followingUser = users?.[item.following_id];
  const followerHandle =
    follower?.profile?.username_raw ||
    follower?.username_raw ||
    follower?.profile?.username ||
    follower?.username ||
    '';
  const followingHandle =
    followingUser?.profile?.username_raw ||
    followingUser?.username_raw ||
    followingUser?.profile?.username ||
    followingUser?.username ||
    '';
  return (
    <div
      className={`relative p-3 rounded-lg border theme-border transition-all duration-500 ${
        isHighlighted ? 'animate-pulse bg-blue-50/30 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className='flex items-center gap-2 mb-1'>
        <div className='relative'>
          <img
            src={follower?.profile?.profile_image_url}
            alt={follower?.name}
            className='w-6 h-6 rounded-full object-cover'
          />
        </div>
        <div className='text-xs theme-text-primary truncate'>
          <a
            href={`https://x.com/${
              follower?.profile?.username || follower?.username
            }`}
            target='_blank'
            rel='noopener noreferrer'
            className='font-semibold hover:underline'
          >
            {follower?.name}
          </a>
          <span className='mx-1'>{t('followedActionMiddle')}</span>
          <a
            href={`https://x.com/${
              followingUser?.profile?.username || followingUser?.username
            }`}
            target='_blank'
            rel='noopener noreferrer'
            className='font-semibold hover:underline'
          >
            {followingUser?.name}
          </a>
        </div>
      </div>

      <div className='text-[10px] theme-text-secondary truncate mb-1'>
        <a
          href={`https://x.com/${
            follower?.profile?.username || follower?.username || followerHandle
          }`}
          target='_blank'
          rel='noopener noreferrer'
          className='hover:underline'
        >
          @{followerHandle}
        </a>
        <span className='mx-1'>→</span>
        <a
          href={`https://x.com/${
            followingUser?.profile?.username ||
            followingUser?.username ||
            followingHandle
          }`}
          target='_blank'
          rel='noopener noreferrer'
          className='hover:underline'
        >
          @{followingHandle}
        </a>
      </div>
      <div className='text-[10px] theme-text-secondary'>
        {new Date(item.created_at).toLocaleString()}
      </div>
    </div>
  );
};

// 统一消息流中的推文卡片
const TweetCard: React.FC<{
  tw: any;
  t: (k: string) => string;
  isHighlighted?: boolean;
  lang: string;
}> = ({ tw, t, isHighlighted = false, lang }) => {
  const profile = tw.profile;
  const html = tw.info?.html as string | undefined;
  const created = tw.create_time;
  const isRetweet = tw?.retweet_status;
  const isQuote = tw?.quote_status;
  const isReply = tw?.reply_status;
  const tweetLink = `https://x.com/${profile?.username || 'unknown'}/status/${
    tw.id || 'unknown'
  }`;

  const [expanded, setExpanded] = React.useState(false);
  const summaryText = React.useMemo(() => {
    const cn = (tw as any)?.ai?.summary_cn;
    const en = (tw as any)?.ai?.summary_en;
    return lang === 'zh' ? cn || en : en || cn;
  }, [tw, lang]);

  // 根据推文类型设置不同的视觉样式
  const getCardStyle = () => {
    const baseStyle =
      'relative px-3 py-2 rounded-lg border theme-border hover:bg-white/5 transition-all duration-500';
    const highlightStyle = isHighlighted
      ? 'animate-pulse bg-blue-50/30 dark:bg-blue-900/10'
      : '';

    if (isRetweet) {
      return `${baseStyle} border-l-4 border-l-green-500 ${highlightStyle}`;
    }
    if (isQuote) {
      return `${baseStyle} border-l-4 border-l-blue-500 ${highlightStyle}`;
    }
    if (isReply) {
      return `${baseStyle} border-l-4 border-l-orange-500 ${highlightStyle}`;
    }
    return `${baseStyle} ${highlightStyle}`;
  };

  return (
    <div className={getCardStyle()}>
      <div className='flex items-center gap-2 mb-1'>
        <div className='relative'>
          <img
            src={profile?.profile_image_url}
            alt={profile?.name}
            className='w-6 h-6 rounded-full object-cover'
          />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between text-xs theme-text-primary'>
            <div className='flex items-center gap-2 min-w-0 flex-1'>
              <a
                href={`https://x.com/${profile?.username || 'unknown'}`}
                target='_blank'
                rel='noopener noreferrer'
                className='font-semibold truncate hover:underline'
                title={profile?.name}
              >
                {profile?.name}
              </a>
              {/* 添加图标来指示推文类型 */}
              {isRetweet && <Repeat className='w-2.5 h-2.5 text-gray-400' />}
              {isQuote && <Quote className='w-2.5 h-2.5 text-gray-400' />}
              {isReply && (
                <MessageCircle className='w-2.5 h-2.5 text-gray-400' />
              )}
            </div>
            {/* 时间显示在右侧 */}
            <div className='text-[10px] theme-text-secondary ml-2 flex-shrink-0'>
              {new Date(created).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 根据是否有 AI 总结来决定展示方式 */}
      {summaryText ? (
        <>
          {/* AI 总结 - 始终显示完整内容，右侧放置展开/收起按钮 */}
          <div className='mb-2 relative'>
            <div className='text-xs theme-text-secondary leading-relaxed pr-20'>
              {summaryText}
            </div>
            {/* 展开/收起按钮 - 固定在右侧 */}
            <button
              className='absolute top-0 right-0 flex items-center gap-1 text-[11px] text-blue-500 px-2 py-1 rounded transition-all duration-200'
              onClick={() => setExpanded(!expanded)}
              title={expanded ? t('collapse') : t('viewOriginalTweet')}
            >
              <span>{expanded ? t('collapse') : t('viewOriginalTweet')}</span>
              {expanded ? (
                <ChevronUp className='w-3 h-3' />
              ) : (
                <ChevronDown className='w-3 h-3' />
              )}
            </button>
          </div>

          {/* 展开后的内容 */}
          {expanded && (
            <>
              {/* 分割线 */}
              <div className='border-t theme-border my-2'></div>

              {/* 推文正文 */}
              <a
                href={tweetLink}
                target='_blank'
                rel='noopener noreferrer'
                className='block mb-2'
              >
                {html ? (
                  <div
                    className='text-sm theme-text-primary break-words'
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
                  />
                ) : (
                  <div className='text-sm theme-text-primary whitespace-pre-wrap break-words'>
                    {tw.text}
                  </div>
                )}
              </a>

              {/* 引用推文预览（Quote） */}
              {isQuote && (tw as any)?.quote_status?.info?.html ? (
                <div className='mb-2'>
                  <div className='rounded-md border theme-border p-2 theme-bg-tertiary/30'>
                    {/* 引用推文头部 */}
                    <div className='flex items-center gap-2 mb-1'>
                      <img
                        src={
                          (tw as any)?.quote_status?.profile?.profile_image_url
                        }
                        alt={(tw as any)?.quote_status?.profile?.name}
                        className='w-5 h-5 rounded-full object-cover'
                      />
                      <a
                        href={`https://x.com/${
                          (tw as any)?.quote_status?.profile?.username ||
                          'unknown'
                        }`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-[12px] font-medium theme-text-primary hover:underline truncate'
                        title={(tw as any)?.quote_status?.profile?.name}
                      >
                        {(tw as any)?.quote_status?.profile?.name}
                      </a>
                      <span className='text-[10px] theme-text-secondary'>
                        {new Date(
                          (tw as any)?.quote_status?.create_time
                        ).toLocaleString()}
                      </span>
                    </div>
                    {/* 引用推文正文 */}
                    <div
                      className='text-[13px] theme-text-primary break-words'
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(
                          (tw as any)?.quote_status?.info?.html || ''
                        ),
                      }}
                    />
                    {(tw as any)?.quote_status?.info?.photos?.length ? (
                      <div className='grid grid-cols-2 gap-2 mt-2'>
                        {(tw as any)?.quote_status?.info?.photos.map(
                          (p: any) => (
                            <img
                              key={p.id}
                              src={p.url}
                              alt={p.alt_text || 'photo'}
                              className='rounded-md w-full object-cover'
                            />
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* 图片 */}
              {tw.info?.photos?.length ? (
                <div className='grid grid-cols-2 gap-2 mb-2'>
                  {tw.info.photos.map((p: any) => (
                    <img
                      key={p.id}
                      src={p.url}
                      alt={p.alt_text || 'photo'}
                      className='rounded-md w-full object-cover'
                    />
                  ))}
                </div>
              ) : null}

              {/* 统计信息 */}
              {tw.statistic ? (
                <div className='flex items-center gap-4 text-[10px] theme-text-secondary mb-2'>
                  <div className='flex items-center gap-1'>
                    <Heart className='w-3 h-3' />
                    <span>
                      {numeral(tw.statistic.likes || 0)
                        .format('0.[0]a')
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <MessageCircle className='w-3 h-3' />
                    <span>
                      {numeral(tw.statistic.reply_count || 0)
                        .format('0.[0]a')
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Repeat className='w-3 h-3' />
                    <span>
                      {numeral(tw.statistic.retweet_count || 0)
                        .format('0.[0]a')
                        .toUpperCase()}
                    </span>
                  </div>
                  {/* <div className='flex items-center gap-1'>
                    <Quote className='w-3 h-3' />
                    <span>
                      {numeral(tw.statistic.quote_count || 0)
                        .format('0.[0]a')
                        .toUpperCase()}
                    </span>
                  </div> */}
                  <div className='flex items-center gap-1'>
                    <Eye className='w-3 h-3' />
                    <span>
                      {numeral(tw.statistic.views || 0)
                        .format('0.[0]a')
                        .toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* 收起按钮 - 放在统计信息右侧 */}
              <div className='flex items-center justify-between mt-2'>
                <div></div>
                <button
                  className='flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 transition-colors'
                  onClick={() => setExpanded(false)}
                >
                  {t('collapse')}
                  <ChevronUp className='w-3 h-3' />
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* 没有 AI 总结时直接展示原文 */}
          <a
            href={tweetLink}
            target='_blank'
            rel='noopener noreferrer'
            className='block'
          >
            {html ? (
              <div
                className='text-sm theme-text-primary break-words'
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
              />
            ) : (
              <div className='text-sm theme-text-primary whitespace-pre-wrap break-words'>
                {tw.text}
              </div>
            )}
          </a>
          {tw.info?.photos?.length ? (
            <div className='grid grid-cols-2 gap-2 mt-1'>
              {tw.info.photos.map((p: any) => (
                <img
                  key={p.id}
                  src={p.url}
                  alt={p.alt_text || 'photo'}
                  className='rounded-md w-full object-cover'
                />
              ))}
            </div>
          ) : null}
          {tw.statistic ? (
            <div className='flex items-center gap-4 text-[10px] theme-text-secondary mt-1'>
              <div className='flex items-center gap-1'>
                <Heart className='w-3 h-3' />
                <span>
                  {numeral(tw.statistic.likes || 0)
                    .format('0.[0]a')
                    .toUpperCase()}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <MessageCircle className='w-3 h-3' />
                <span>
                  {numeral(tw.statistic.reply_count || 0)
                    .format('0.[0]a')
                    .toUpperCase()}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <Repeat className='w-3 h-3' />
                <span>
                  {numeral(tw.statistic.retweet_count || 0)
                    .format('0.[0]a')
                    .toUpperCase()}
                </span>
              </div>
              {/* <div className='flex items-center gap-1'>
                <Quote className='w-3 h-3' />
                <span>
                  {numeral(tw.statistic.quote_count || 0)
                    .format('0.[0]a')
                    .toUpperCase()}
                </span>
              </div> */}
              <div className='flex items-center gap-1'>
                <Eye className='w-3 h-3' />
                <span>
                  {numeral(tw.statistic.views || 0)
                    .format('0.[0]a')
                    .toUpperCase()}
                </span>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

// Gossip 卡片组件
const GossipCard: React.FC<{
  tweet: GossipTweet;
  t: (k: string) => string;
  isHighlighted?: boolean;
  lang: string;
}> = ({ tweet, t, isHighlighted = false, lang }) => {
  const profile = tweet.profile;
  const html = tweet.info?.html as string | undefined;
  const created = tweet.create_time;
  const tweetLink = `https://x.com/${profile?.username || 'unknown'}/status/${
    tweet.id || 'unknown'
  }`;

  const [expanded, setExpanded] = React.useState(false);
  const summaryText = React.useMemo(() => {
    const cn = (tweet as any)?.ai?.summary_cn;
    const en = (tweet as any)?.ai?.summary_en;
    return lang === 'zh' ? cn || en : en || cn;
  }, [tweet, lang]);

  return (
    <div
      className={`relative px-3 py-2 rounded-lg border theme-border hover:bg-white/5 transition-all duration-500 ${
        isHighlighted ? 'animate-pulse bg-blue-50/30 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className='flex items-center gap-2 mb-1'>
        <div className='relative'>
          <img
            src={profile?.profile_image_url}
            alt={profile?.name}
            className='w-6 h-6 rounded-full object-cover'
          />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between text-xs theme-text-primary'>
            <div className='flex items-center gap-2 min-w-0 flex-1'>
              <a
                href={`https://x.com/${profile?.username || 'unknown'}`}
                target='_blank'
                rel='noopener noreferrer'
                className='font-semibold truncate hover:underline'
                title={profile?.name}
              >
                {profile?.name}
              </a>
            </div>
            {/* 时间显示在右侧 */}
            <div className='text-[10px] theme-text-secondary ml-2 flex-shrink-0'>
              {new Date(created).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* AI 总结 - 始终显示完整内容，右侧放置展开/收起按钮 */}
      {summaryText && (
        <div className='mb-2 relative'>
          <div className='text-xs theme-text-secondary leading-relaxed pr-20'>
            {summaryText}
          </div>
          {/* 展开/收起按钮 - 固定在右侧 */}
          <button
            className='absolute top-0 right-0 flex items-center gap-1 text-[11px] text-blue-500 px-2 py-1 rounded transition-all duration-200'
            onClick={() => setExpanded(!expanded)}
            title={expanded ? t('collapse') : t('viewOriginalTweet')}
          >
            <span>{expanded ? t('collapse') : t('viewOriginalTweet')}</span>
            {expanded ? (
              <ChevronUp className='w-3 h-3' />
            ) : (
              <ChevronDown className='w-3 h-3' />
            )}
          </button>
        </div>
      )}

      {/* 展开后的内容 */}
      {expanded && (
        <>
          {/* 分割线 */}
          <div className='border-t theme-border my-2'></div>

          {/* 推文正文 */}
          <a
            href={tweetLink}
            target='_blank'
            rel='noopener noreferrer'
            className='block mb-2'
          >
            {html ? (
              <div
                className='text-sm theme-text-primary break-words'
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
              />
            ) : (
              <div className='text-sm theme-text-primary whitespace-pre-wrap break-words'>
                {tweet.text}
              </div>
            )}
          </a>

          {/* 引用推文预览（Quote） */}
          {(tweet as any)?.quote_status?.info?.html ? (
            <div className='mb-2'>
              <div className='rounded-md border theme-border p-2 theme-bg-tertiary/30'>
                {/* 引用推文头部 */}
                <div className='flex items-center gap-2 mb-1'>
                  <img
                    src={
                      (tweet as any)?.quote_status?.profile?.profile_image_url
                    }
                    alt={(tweet as any)?.quote_status?.profile?.name}
                    className='w-5 h-5 rounded-full object-cover'
                  />
                  <a
                    href={`https://x.com/${
                      (tweet as any)?.quote_status?.profile?.username ||
                      'unknown'
                    }`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-[12px] font-medium theme-text-primary hover:underline truncate'
                    title={(tweet as any)?.quote_status?.profile?.name}
                  >
                    {(tweet as any)?.quote_status?.profile?.name}
                  </a>
                  <span className='text-[10px] theme-text-secondary'>
                    {new Date(
                      (tweet as any)?.quote_status?.create_time
                    ).toLocaleString()}
                  </span>
                </div>
                {/* 引用推文正文 */}
                <div
                  className='text-[13px] theme-text-primary break-words'
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      (tweet as any)?.quote_status?.info?.html || ''
                    ),
                  }}
                />
                {(tweet as any)?.quote_status?.info?.photos?.length ? (
                  <div className='grid grid-cols-2 gap-2 mt-2'>
                    {(tweet as any)?.quote_status?.info?.photos.map(
                      (p: any) => (
                        <img
                          key={p.id}
                          src={p.url}
                          alt={p.alt_text || 'photo'}
                          className='rounded-md w-full object-cover'
                        />
                      )
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* 图片 */}
          {tweet.info?.photos?.length ? (
            <div className='grid grid-cols-2 gap-2 mb-2'>
              {tweet.info.photos.map((p: any) => (
                <img
                  key={p.id}
                  src={p.url}
                  alt={p.alt_text || 'photo'}
                  className='rounded-md w-full object-cover'
                />
              ))}
            </div>
          ) : null}

          {/* 统计信息 */}
          {tweet.statistic ? (
            <div className='flex items-center gap-4 text-[10px] theme-text-secondary mb-2'>
              <div className='flex items-center gap-1'>
                <Heart className='w-3 h-3' />
                <span>
                  {numeral(tweet.statistic.likes || 0)
                    .format('0.[0]a')
                    .toUpperCase()}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <MessageCircle className='w-3 h-3' />
                <span>
                  {numeral(tweet.statistic.reply_count || 0)
                    .format('0.[0]a')
                    .toUpperCase()}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <Repeat className='w-3 h-3' />
                <span>
                  {numeral(tweet.statistic.retweet_count || 0)
                    .format('0.[0]a')
                    .toUpperCase()}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <Eye className='w-3 h-3' />
                <span>
                  {numeral(tweet.statistic.views || 0)
                    .format('0.[0]a')
                    .toUpperCase()}
                </span>
              </div>
            </div>
          ) : null}

          {/* 收起按钮 - 放在统计信息右侧 */}
          <div className='flex items-center justify-between mt-2'>
            <div></div>
            <button
              className='flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-600 transition-colors'
              onClick={() => setExpanded(false)}
            >
              {t('collapse')}
              <ChevronUp className='w-3 h-3' />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

RealTimeSubscription.displayName = 'RealTimeSubscription';

export default RealTimeSubscription;

function wrapUrlsOutsideTags(input: string): string {
  if (!input) return '';
  const parts = input.split(/(<[^>]+>)/g);
  const urlRe = /(https?:\/\/[^\s<]+)/g;
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (!seg) continue;
    if (seg[0] === '<') continue;
    parts[i] = seg.replace(
      urlRe,
      (m) =>
        `<a href="${m}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline hover:underline hover:text-blue-600">${m}</a>`
    );
  }
  return parts.join('');
}

// BWE 新闻卡片
const NewsCard: React.FC<{
  news: { link?: string; title?: string; pubDate?: string };
  t: (k: string) => string;
  isHighlighted?: boolean;
}> = ({ news, isHighlighted = false }) => {
  const title = news?.title || '';
  const link = news?.link || '#';
  const createdAt = news?.pubDate;

  return (
    <div
      className={`relative p-3 rounded-lg border theme-border border-l-4 border-l-yellow-500/70 transition-all duration-500 ${
        isHighlighted ? 'animate-pulse bg-blue-50/30 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className='flex items-start gap-2'>
        <div className='w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0'>
          <Megaphone className='w-3 h-3 text-yellow-400' />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between text-xs theme-text-primary'>
            <div className='font-semibold truncate'>BWE News</div>
            {createdAt ? (
              <div className='text-[10px] theme-text-secondary ml-2 flex-shrink-0'>
                {new Date(createdAt).toLocaleString()}
              </div>
            ) : null}
          </div>
          <div
            className='mt-1 text-xs theme-text-primary break-words'
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(wrapUrlsOutsideTags(title)),
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Listing 卡片组件
const ListingCard: React.FC<{
  listing: {
    link?: string;
    title?: string;
    pubDate?: string;
    parse?: {
      summary_cn?: string;
      summary_en?: string;
      news_cn?: string;
      news_origin?: string;
      source?: string;
    };
  };
  t: (k: string) => string;
  isHighlighted?: boolean;
  lang?: string;
}> = ({ listing, t, isHighlighted = false, lang = 'en' }) => {
  const title = listing?.title || '';
  const link = listing?.link || '#';
  const createdAt = listing?.pubDate;
  const [expanded, setExpanded] = React.useState(false);

  // 获取 AI 摘要（根据语言）
  const summaryText = React.useMemo(() => {
    const cn = listing?.parse?.summary_cn;
    const en = listing?.parse?.summary_en;
    return lang === 'zh' ? cn || en : en || cn;
  }, [listing, lang]);

  // 获取详细新闻内容（根据语言）
  const detailText = React.useMemo(() => {
    const cn = listing?.parse?.news_cn;
    const en = listing?.parse?.news_origin;
    return lang === 'zh' ? cn || en : en || cn;
  }, [listing, lang]);

  return (
    <div
      className={`relative p-3 rounded-lg border theme-border border-l-4 border-l-purple-500/70 transition-all duration-500 ${
        isHighlighted ? 'animate-pulse bg-blue-50/30 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className='flex items-start gap-2'>
        <div className='w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0'>
          <svg
            className='w-3 h-3 text-white'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
              clipRule='evenodd'
            />
          </svg>
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between text-xs theme-text-primary'>
            <div className='font-semibold truncate'>List/Delist</div>
            {createdAt ? (
              <div className='text-[10px] theme-text-secondary ml-2 flex-shrink-0'>
                {new Date(createdAt).toLocaleString()}
              </div>
            ) : null}
          </div>

          {/* AI 摘要 - 始终显示 */}
          {summaryText ? (
            <div className='mt-2 relative'>
              <div className='text-xs theme-text-secondary leading-relaxed pr-20'>
                {summaryText}
              </div>
              {/* 展开/收起按钮 - 固定在右侧 */}
              <button
                className='absolute top-0 right-0 flex items-center gap-1 text-[11px] text-blue-500 px-2 py-1 rounded transition-all duration-200'
                onClick={() => setExpanded(!expanded)}
                title={expanded ? t('collapse') : t('viewDetails')}
              >
                <span>{expanded ? t('collapse') : t('viewDetails')}</span>
                {expanded ? (
                  <ChevronUp className='w-3 h-3' />
                ) : (
                  <ChevronDown className='w-3 h-3' />
                )}
              </button>
            </div>
          ) : (
            // 如果没有 AI 摘要，显示原始 title
            <div
              className='mt-1 text-xs theme-text-primary break-words'
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(wrapUrlsOutsideTags(title)),
              }}
            />
          )}

          {/* 展开后的详细内容 */}
          {expanded && detailText && (
            <>
              <div className='border-t theme-border my-2'></div>
              <a
                href={link}
                target='_blank'
                rel='noopener noreferrer'
                className='block'
              >
                <div
                  className='text-xs theme-text-primary break-words'
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(wrapUrlsOutsideTags(detailText)),
                  }}
                />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
