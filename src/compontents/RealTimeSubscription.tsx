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
        label: t('cexFeeds'),
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
          enMaxRow={3}
        />
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
                    <ListingCard
                      key={u.key}
                      listing={u.news}
                      t={t}
                      isHighlighted={highlightedItem === 'first' && idx === 0}
                      lang={lang}
                      type={u.kind}
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
                type='news'
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
      return `${baseStyle} ${highlightStyle}`;
    }
    if (isQuote) {
      return `${baseStyle} ${highlightStyle}`;
    }
    if (isReply) {
      return `${baseStyle} ${highlightStyle}`;
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

// // BWE 新闻卡片
// const NewsCard: React.FC<{
//   news: { link?: string; title?: string; pubDate?: string };
//   t: (k: string) => string;
//   isHighlighted?: boolean;
// }> = ({ news, isHighlighted = false }) => {
//   const title = news?.title || '';
//   const link = news?.link || '#';
//   const createdAt = news?.pubDate;

//   return (
//     <div
//       className={`relative p-3 rounded-lg border theme-border border-l-4 border-l-yellow-500/70 transition-all duration-500 ${
//         isHighlighted ? 'animate-pulse bg-blue-50/30 dark:bg-blue-900/10' : ''
//       }`}
//     >
//       <div className='flex items-start gap-2'>
//         <div className='w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0'>
//           <Megaphone className='w-3 h-3 text-yellow-400' />
//         </div>
//         <div className='flex-1 min-w-0'>
//           <div className='flex items-center justify-between text-xs theme-text-primary'>
//             <div className='font-semibold truncate'>BWE News</div>
//             {createdAt ? (
//               <div className='text-[10px] theme-text-secondary ml-2 flex-shrink-0'>
//                 {new Date(createdAt).toLocaleString()}
//               </div>
//             ) : null}
//           </div>
//           <div
//             className='mt-1 text-xs theme-text-primary break-words'
//             dangerouslySetInnerHTML={{
//               __html: sanitizeHtml(wrapUrlsOutsideTags(title)),
//             }}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// 交易所配置
const EXCHANGE_CONFIG: Record<
  string,
  { name: string; avatar: string; keywords: string[] }
> = {
  binance: {
    name: 'Binance',
    avatar:
      'https://pbs.twimg.com/profile_images/1940131561103347712/f5y2qENu_400x400.jpg',
    keywords: ['binance', '币安', 'bnb'],
  },
  upbit: {
    name: 'Upbit',
    avatar:
      'https://pbs.twimg.com/profile_images/1641014725655019521/YsHRUKTw_400x400.jpg',
    keywords: ['upbit', '업비트'],
  },
  okx: {
    name: 'OKX',
    avatar:
      'https://pbs.twimg.com/profile_images/1968722816154345472/vEj4j3o9_400x400.jpg',
    keywords: ['okx', 'okex'],
  },
  bithumb: {
    name: 'Bithumb',
    avatar:
      'https://pbs.twimg.com/profile_images/1876852353653227520/v4TY_1Tq_400x400.jpg',
    keywords: ['bithumb', '빗썸'],
  },
  gate: {
    name: 'Gate',
    avatar:
      'https://pbs.twimg.com/profile_images/1954817804336766976/eX6495qB_400x400.jpg',
    keywords: ['gate', 'gate.io'],
  },
  coinbase: {
    name: 'Coinbase',
    avatar:
      'https://pbs.twimg.com/profile_images/1944131484433993728/p_fsWT_w_400x400.png',
    keywords: ['coinbase'],
  },
  kucoin: {
    name: 'Kucoin',
    avatar:
      'https://pbs.twimg.com/profile_images/1972890046127841281/bpmkOcE-_400x400.jpg',
    keywords: ['kucoin'],
  },
  bybit: {
    name: 'Bybit',
    avatar:
      'https://pbs.twimg.com/profile_images/1894706611538530304/w9AEcEL8_400x400.jpg',
    keywords: ['bybit'],
  },
  robinhood: {
    name: 'Robinhood',
    avatar:
      'https://pbs.twimg.com/profile_images/1844399977482813442/1fTlYz2c_400x400.png',
    keywords: ['robinhood'],
  },
  kraken: {
    name: 'Kraken',
    avatar:
      'https://pbs.twimg.com/profile_images/1975172164392300544/nAGo0mS9_400x400.jpg',
    keywords: ['kraken'],
  },
  htx: {
    name: 'HTX',
    avatar:
      'https://pbs.twimg.com/profile_images/1880555856133332992/DQDrisim_400x400.jpg',
    keywords: ['htx', 'huobi'],
  },
  weex: {
    name: 'WEEX',
    avatar:
      'https://pbs.twimg.com/profile_images/1983562022999744512/KUHcfKj9_400x400.jpg',
    keywords: ['weex'],
  },
  mexc: {
    name: 'MEXC',
    avatar:
      'https://pbs.twimg.com/profile_images/1919664587772944384/yLx45XhG_400x400.jpg',
    keywords: ['mexc'],
  },
  bitget: {
    name: 'Bitget',
    avatar:
      'https://pbs.twimg.com/profile_images/1974032533588250624/sMfy8bGo_400x400.jpg',
    keywords: ['bitget'],
  },
};

// 根据文本内容匹配交易所
const matchExchange = (
  text: string
): { name: string; avatar: string } | null => {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  // 遍历所有交易所配置，查找匹配的关键词
  for (const [key, config] of Object.entries(EXCHANGE_CONFIG)) {
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return { name: config.name, avatar: config.avatar };
      }
    }
  }

  return null;
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
  type?: string;
}> = ({ listing, t, isHighlighted = false, lang = 'en', type }) => {
  console.log(type, '///type==', listing);
  const title = listing?.title || '';
  // const link = listing?.link || '#';
  const createdAt = listing?.pubDate;
  const [expanded, setExpanded] = React.useState(false);

  // 匹配交易所
  const exchangeInfo = React.useMemo(() => {
    // 优先使用英文文本进行匹配
    const enText =
      listing?.parse?.summary_en || listing?.parse?.news_origin || '';
    const cnText = listing?.parse?.summary_cn || listing?.parse?.news_cn || '';
    const fullText = `${title} ${enText} ${cnText}`;
    return matchExchange(fullText);
  }, [listing, title]);

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
      className={`relative px-3 py-2 rounded-lg border theme-border hover:bg-white/5 transition-all duration-500 ${
        isHighlighted ? 'animate-pulse bg-blue-50/30 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className='flex items-center gap-2 mb-1'>
        <div className='relative flex-shrink-0'>
          {exchangeInfo ? (
            <img
              src={exchangeInfo.avatar}
              alt={exchangeInfo.name}
              className='w-6 h-6 rounded-full object-cover'
              onError={(e) => {
                // 如果图片加载失败，隐藏 img 元素，显示默认 SVG
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <svg
              version='1.1'
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 1024 1024'
              className='w-6 h-6 rounded-full'
            >
              <path
                d='M0 0 C337.92 0 675.84 0 1024 0 C1024 337.92 1024 675.84 1024 1024 C686.08 1024 348.16 1024 0 1024 C0 686.08 0 348.16 0 0 Z '
                fill='#FDFEFE'
                transform='translate(0,0)'
              />
              <path
                d='M0 0 C1.22640198 0.00021149 2.45280396 0.00042297 3.71636963 0.00064087 C23.36182482 0.03434873 42.32154125 1.01392052 61.6875 4.375 C62.82058594 4.56223633 63.95367188 4.74947266 65.12109375 4.94238281 C101.07805128 10.9594575 135.91491844 21.73739459 168.95507812 37.10791016 C171.49681536 38.28657494 174.04996858 39.43456443 176.609375 40.57421875 C210.6228215 55.92334935 242.67851779 78.01803357 270.2265625 103.1328125 C271.85685555 104.61819061 273.4974308 106.09236728 275.1484375 107.5546875 C283.54247092 114.9954553 291.61302082 122.76058738 298.89453125 131.3046875 C301.01896824 133.7577411 303.22938637 136.12203147 305.4375 138.5 C311.21895793 144.84998254 316.49413686 151.53979299 321.6875 158.375 C322.35434814 159.24850098 322.35434814 159.24850098 323.03466797 160.13964844 C347.83152773 192.77329435 366.73818987 228.90609503 380.6875 267.375 C381.01202148 268.25800781 381.33654297 269.14101563 381.67089844 270.05078125 C412.77279203 355.42332161 410.24473721 449.88784614 364.15380859 578.25830078 C350.43778169 607.41228004 333.23001647 634.32526054 313.17822266 659.49804688 C311.92342858 661.07794482 310.684451 662.67038615 309.44921875 664.265625 C300.369438 675.92083011 290.04303211 686.80651855 278.84375 696.43359375 C276.419608 698.61619986 274.15422807 700.91667633 271.875 703.25 C267.6441595 707.52605559 263.21155586 711.3599931 258.51171875 715.109375 C255.66523899 717.39285807 252.89825455 719.75338921 250.125 722.125 C231.26224968 737.82775349 210.35398158 750.91960151 188.6875 762.375 C187.80529785 762.84405762 186.9230957 763.31311523 186.01416016 763.79638672 C152.81330936 781.31215998 116.58351927 794.40834254 79.6875 801.4375 C79.01908081 801.56539917 78.35066162 801.69329834 77.6619873 801.82507324 C65.39106235 804.1627037 53.11908668 806.11565273 40.6875 807.375 C39.67929199 807.47796387 38.67108398 807.58092773 37.63232422 807.68701172 C-62.07938897 817.41685825 -163.22411002 788.88118559 -257.66455078 717.75 C-261.36854655 714.65949568 -264.90126246 711.38617767 -268.41796875 708.0859375 C-270.25693986 706.36360828 -272.11209871 704.65827941 -273.98828125 702.9765625 C-280.86066812 696.81377145 -287.44771591 690.37641143 -294 683.875 C-294.87906006 683.00891113 -295.75812012 682.14282227 -296.66381836 681.25048828 C-302.64920717 675.27353673 -308.07014692 669.00929893 -313.3125 662.375 C-313.90297119 661.63846191 -314.49344238 660.90192383 -315.10180664 660.14306641 C-361.26921693 602.3845737 -393.86908552 533.08845957 -403.3125 459.375 C-403.55589111 457.48249512 -403.55589111 457.48249512 -403.80419922 455.55175781 C-408.17298413 419.65468301 -408.56672564 382.17704915 -403.3125 346.375 C-403.16264648 345.34922852 -403.01279297 344.32345703 -402.85839844 343.26660156 C-397.30180641 306.54118549 -386.88237114 270.86958893 -371.52978516 237.05615234 C-370.7521119 235.34327475 -369.98034755 233.62769397 -369.21630859 231.90869141 C-356.93245922 204.28004278 -340.35459707 177.85017787 -321.3125 154.375 C-320.59191406 153.46363281 -319.87132812 152.55226562 -319.12890625 151.61328125 C-314.09028198 145.31724629 -308.72150911 139.38681496 -303.21875 133.5 C-300.70502054 130.80952394 -298.25222112 128.07044561 -295.8125 125.3125 C-288.16902425 116.79508782 -280.03964757 108.77845323 -271.3125 101.375 C-269.86037109 100.08916016 -269.86037109 100.08916016 -268.37890625 98.77734375 C-254.32912839 86.39385244 -239.09653771 75.43843191 -223.3125 65.375 C-222.65024414 64.95186523 -221.98798828 64.52873047 -221.30566406 64.09277344 C-173.77827283 33.93330629 -122.07300954 14.37094987 -66.6875 5 C-65.61715012 4.81718475 -65.61715012 4.81718475 -64.525177 4.63067627 C-43.0757949 1.01875703 -21.7319375 -0.03477905 0 0 Z '
                fill='#2068C6'
                transform='translate(512.3125,98.625)'
              />
              <path
                d='M0 0 C3.73257417 0.02177804 7.46511063 0.01427245 11.19773054 0.01048863 C17.65007547 0.00787849 24.1021658 0.02344346 30.5544467 0.05167782 C39.88308929 0.092472 49.21160992 0.10535124 58.54033203 0.11161778 C73.6788511 0.12253611 88.81723475 0.15574321 103.95568037 0.20313084 C118.65326467 0.24909035 133.35081207 0.2844509 148.04845381 0.3056699 C148.95580933 0.30698352 149.86316485 0.30829714 150.798016 0.30965056 C155.35036862 0.31617618 159.9027215 0.32249462 164.45507455 0.32871008 C202.16663507 0.38046638 239.87804167 0.46846426 277.58946943 0.58032811 C275.16575258 3.03222157 272.8039747 5.28529828 270.01525068 7.31470311 C269.35210859 7.8020493 268.6889665 8.28939549 268.0057292 8.79150975 C267.31148848 9.29931981 266.61724775 9.80712986 265.90196943 10.33032811 C255.76049862 17.87060341 247.30996002 25.49525922 239.58946943 35.58032811 C238.99392256 36.34860936 238.39837568 37.11689061 237.78478193 37.90845311 C228.26771892 50.80253847 221.84412501 65.19620263 217.58946943 80.58032811 C217.24915693 81.78044529 216.90884443 82.98056248 216.55821943 84.21704686 C212.29136044 102.48947542 212.46748627 124.51757688 217.58946943 142.58032811 C217.78282881 143.27948338 217.97618818 143.97863865 218.17540693 144.69898045 C221.64394126 156.95928583 226.42336094 170.48249863 234.89025068 180.22876561 C236.58946943 182.58032811 236.58946943 182.58032811 236.71837568 185.06860936 C236.53146162 186.00060154 236.34454756 186.93259373 236.15196943 187.89282811 C235.93927412 189.01689061 235.72657881 190.14095311 235.50743818 191.29907811 C235.20493839 192.72690525 234.89846959 194.15389361 234.58946943 195.58032811 C233.9412515 198.61199353 233.29440882 201.64391944 232.65172529 204.67676365 C232.20072472 206.78725409 231.73962367 208.89561658 231.26744795 211.00147069 C229.40271455 219.56143859 228.19510392 226.54924631 232.58946943 234.58032811 C235.85906819 238.35294206 238.77554564 241.04528178 243.7491374 241.99097264 C254.1635643 242.4027491 263.535892 238.12248473 273.13390303 234.55640233 C275.49013658 233.68806448 277.85517083 232.84815776 280.22228193 232.01001561 C280.92877882 231.73720768 281.63527571 231.46439976 282.36318159 231.18332493 C287.9769186 229.2119308 291.96715452 229.88192048 297.58946943 231.58032811 C298.48013105 231.80148289 299.37079268 232.02263768 300.28844404 232.25049412 C301.37911177 232.53944554 301.37911177 232.53944554 302.49181318 232.83423436 C303.32003584 233.04886326 304.1482585 233.26349217 305.00157881 233.48462498 C306.68247445 233.92272385 308.36217852 234.36542074 310.04064131 234.81274998 C339.97873386 242.51244589 374.13888934 237.89852277 401.02696943 222.70532811 C407.57261961 218.76872958 413.58784172 214.29058391 419.58946943 209.58032811 C420.92117366 208.57815965 422.25422751 207.57777824 423.58946943 206.58032811 C423.7064782 229.17291144 423.79454344 251.76544452 423.84853029 274.35826981 C423.87426808 284.8494661 423.90933375 295.34047368 423.9666667 305.83154881 C424.01663742 314.97983739 424.04879258 324.12798924 424.05991191 333.27641052 C424.06640757 338.11662959 424.08158125 342.95645762 424.11811972 347.79655087 C424.15229559 352.36107006 424.16247923 356.92504065 424.15500784 361.48967564 C424.15637281 363.15646746 424.16617596 364.82327944 424.18549681 366.48995984 C424.33566347 380.12341188 422.07365121 391.72153 412.89025068 402.35767186 C403.36129774 411.56306103 391.6023083 415.69585459 378.53936529 415.71454918 C377.83790493 415.71690141 377.13644456 415.71925364 376.41372782 415.72167715 C374.05752836 415.72834696 371.70138431 415.72790954 369.34517622 415.72749913 C367.64103236 415.730799 365.93688928 415.73452483 364.2327472 415.73864061 C359.54502796 415.74865452 354.85732152 415.75237642 350.1695931 415.75502992 C345.11556645 415.75893472 340.06154992 415.76851288 335.00752974 415.77724278 C322.80033569 415.7970013 310.59314081 415.80707223 298.38593477 415.81597057 C292.63730801 415.82035412 286.88868217 415.82572073 281.14005613 415.83095944 C262.0307244 415.84797044 242.92139325 415.86246496 223.81205511 415.86970818 C218.85358253 415.87161807 213.89510996 415.8735384 208.9366374 415.87549412 C207.08803501 415.87621973 207.08803501 415.87621973 205.20208712 415.87696 C185.23470731 415.88526163 165.26738739 415.91060138 145.30003373 415.9430748 C124.80026616 415.97614235 104.30052903 415.99415663 83.80073464 415.99735242 C72.29071392 415.9995177 60.78078054 416.00826916 49.27078581 416.0338136 C39.46920313 416.05551632 29.66772902 416.06357305 19.86612503 416.05384681 C14.86628476 416.04930103 9.86666853 416.05120473 4.86685896 416.07060826 C0.2859415 416.08823243 -4.29458837 416.0872482 -8.8755099 416.07171097 C-10.52898197 416.06933379 -12.18248082 416.07366417 -13.83591194 416.08553962 C-29.06489262 416.18810675 -40.58999493 412.80500567 -52.09803057 402.45532811 C-58.8162816 395.45519241 -62.52850851 386.24270901 -62.54475164 376.6499902 C-62.54920949 375.42900454 -62.55366733 374.20801889 -62.55826026 372.95003366 C-62.55817097 371.59310503 -62.55798112 370.2361764 -62.55770159 368.87924778 C-62.56100125 367.43924135 -62.56472703 365.99923585 -62.56884307 364.55923152 C-62.57885959 360.59702281 -62.5825793 356.63482926 -62.58523238 352.67260969 C-62.58913645 348.4011403 -62.59871472 344.1296829 -62.60744524 339.85822117 C-62.62720661 329.54013895 -62.6372754 319.22205575 -62.64617303 308.90395933 C-62.65055642 304.04480623 -62.6559231 299.18565421 -62.6611619 294.32650197 C-62.67817377 278.17331175 -62.69266796 262.02012221 -62.69991064 245.86692441 C-62.70182053 241.67520089 -62.70374086 237.48347738 -62.70569658 233.29175389 C-62.70618032 232.24992383 -62.70666406 231.20809377 -62.70716246 230.1346931 C-62.71546285 213.25756854 -62.7408001 196.38051485 -62.77327726 179.50342123 C-62.80634983 162.17563473 -62.82435958 144.84788425 -62.82755488 127.52006602 C-62.82971978 117.79131285 -62.83846554 108.06266304 -62.86401606 98.33394063 C-62.88572573 90.04854672 -62.89377214 81.76328129 -62.88404927 73.47786216 C-62.87950537 69.25178898 -62.881396 65.02598085 -62.90081072 60.79994404 C-62.91844885 56.92711089 -62.91743967 53.05473602 -62.90191343 49.18189795 C-62.89953832 47.78480423 -62.90385592 46.38767871 -62.91574208 44.99063353 C-63.01774132 32.20469656 -60.2184677 22.98224944 -51.41053057 13.58032811 C-36.66862825 -1.02971462 -19.39377276 -0.14213177 0 0 Z '
                fill='#FDFDFE'
                transform='translate(312.4105305671692,313.4196718931198)'
              />
              <path
                d='M0 0 C0.74420883 -0.00367669 1.48841766 -0.00735338 2.25517827 -0.01114148 C4.7561701 -0.02218006 7.25712039 -0.02602246 9.75813293 -0.02983093 C11.54852938 -0.03609549 13.33892452 -0.04274228 15.12931824 -0.04974365 C21.01575311 -0.07078859 26.90218826 -0.08114691 32.78865051 -0.09111023 C34.815138 -0.09515772 36.84162535 -0.09927464 38.86811256 -0.10346031 C48.38926257 -0.12251347 57.91040482 -0.13674386 67.43157023 -0.14507228 C78.42073958 -0.15484353 89.40970744 -0.18115963 100.3988058 -0.22157317 C108.89319027 -0.2517396 117.38751701 -0.26654169 125.88195401 -0.26985329 C130.95495465 -0.27220332 136.02774006 -0.28115758 141.10068321 -0.30631447 C145.87530577 -0.32960913 150.64957162 -0.33382278 155.4242363 -0.32355309 C157.17374038 -0.32305794 158.9232621 -0.32937204 160.67271233 -0.34310913 C177.55486527 -0.46822161 177.55486527 -0.46822161 183.74568176 4.14717102 C187.31819295 8.6077193 188.246668 11.56364974 188.25361633 17.24421692 C188.2598563 17.93523042 188.26609626 18.62624393 188.27252531 19.33819723 C188.28841276 21.64141088 188.27586882 23.9435599 188.26325989 26.2467804 C188.26868293 27.90294001 188.27580662 29.5590948 188.28450012 31.21524048 C188.30271479 35.70493491 188.29567367 40.19426111 188.28298378 44.68396187 C188.27284648 49.3856975 188.28225149 54.08740191 188.28852844 58.78913879 C188.29580272 66.68441927 188.28622291 74.57955001 188.26716614 82.47480774 C188.2453978 91.59874964 188.25244933 100.72233399 188.27447176 109.84626722 C188.29263202 117.68424013 188.29518102 125.52210549 188.28471708 133.36009264 C188.2784856 138.03947846 188.27763704 142.7186963 188.29086304 147.39807129 C188.30243004 151.79769795 188.29438043 156.19686426 188.27128601 160.59644127 C188.26600344 162.20970076 188.267505 163.82299909 188.27633667 165.43624306 C188.28729439 167.64139082 188.27352833 169.8450705 188.25361633 172.05012512 C188.25210823 173.28306557 188.25060013 174.51600601 188.24904633 175.78630829 C187.52719379 180.60597072 185.3208386 183.71968513 181.74568176 186.95967102 C177.50947894 189.47491644 173.16620916 189.29359673 168.35765076 189.28761292 C167.61117637 189.29058404 166.86470198 189.29355516 166.09560716 189.29661632 C163.59304906 189.3052914 161.09053886 189.30681055 158.58796692 189.30830383 C156.79417824 189.31293279 155.00039055 189.31795755 153.206604 189.323349 C148.33262688 189.33646606 143.45866352 189.34291641 138.5846715 189.34735966 C135.53994467 189.35029101 132.49522161 189.35439591 129.45049667 189.35886383 C119.92508036 189.37253586 110.39967264 189.38220442 100.87424719 189.38606572 C89.87661459 189.39054831 78.87910617 189.40810679 67.88151133 189.43706632 C59.38119235 189.45867352 50.88090834 189.46876946 42.38056219 189.47010684 C37.30321121 189.4711554 32.22597701 189.47707423 27.14865494 189.49492645 C22.37324728 189.51139086 17.59804439 189.51357056 12.82261848 189.50478745 C11.07066742 189.50401624 9.31870541 189.50837073 7.566782 189.5182457 C5.17350381 189.53094399 2.78095323 189.52510031 0.38768005 189.5146637 C-0.65007696 189.5267483 -0.65007696 189.5267483 -1.70879877 189.53907704 C-6.93903306 189.48580103 -10.99880762 188.20445387 -14.89884949 184.64717102 C-18.71588076 179.74503053 -19.37965399 176.68819503 -19.39476013 170.56274414 C-19.39773125 169.89062812 -19.40070238 169.2185121 -19.40376353 168.52602893 C-19.41244974 166.26911518 -19.41395871 164.01225447 -19.41545105 161.75532532 C-19.42007928 160.13902167 -19.42510395 158.52271912 -19.43049622 156.90641785 C-19.44362177 152.5117051 -19.45006548 148.11700764 -19.45450687 143.72227836 C-19.45743736 140.97689658 -19.46154212 138.23151898 -19.46601105 135.4861393 C-19.47968641 126.89724328 -19.48935287 118.30835681 -19.49321294 109.71945065 C-19.49769388 99.80340182 -19.5152433 89.88749081 -19.54421353 79.97148389 C-19.56582688 72.30769591 -19.57591703 64.64394672 -19.57725406 56.98012859 C-19.57830234 52.40242613 -19.58421504 47.82485323 -19.60207367 43.24718285 C-19.61854835 38.94044469 -19.62071282 34.63393357 -19.61193466 30.32717514 C-19.61116396 28.74776794 -19.61551138 27.16834857 -19.62539291 25.58897209 C-19.63810759 23.42989435 -19.63223896 21.27162129 -19.62181091 19.11254883 C-19.62327747 17.9052093 -19.62474403 16.69786978 -19.62625504 15.45394421 C-19.13787678 11.11192658 -17.71105855 7.74427434 -14.75431824 4.50263977 C-9.72579718 0.5872028 -6.19034839 -0.00163541 0 0 Z '
                fill='#1E67C5'
                transform='translate(319.2543182373047,368.8528289794922)'
              />
              <path
                d='M0 0 C10.33676796 8.72694345 18.06904905 17.55709471 24.8125 29.1875 C25.30492187 30.01765625 25.79734375 30.8478125 26.3046875 31.703125 C38.19757704 53.42057547 39.07691565 82.32338914 32.84765625 105.828125 C28.16119616 121.16563073 20.66340619 133.4528096 9.8125 145.1875 C8.88630859 146.21810547 8.88630859 146.21810547 7.94140625 147.26953125 C-3.26362754 159.17320024 -19.39222254 168.13331188 -35.1875 172.1875 C-35.86401611 172.36265137 -36.54053223 172.53780273 -37.23754883 172.71826172 C-44.86582567 174.4845115 -52.45034432 174.58466411 -60.25 174.5625 C-60.93592224 174.56228851 -61.62184448 174.56207703 -62.32855225 174.56185913 C-77.20606069 174.51608418 -89.72004892 172.10900365 -103.453125 166.04296875 C-108.8424879 164.35686807 -113.9891668 167.07347403 -119.11328125 168.91015625 C-119.86087204 169.17509384 -120.60846283 169.44003143 -121.37870789 169.71299744 C-123.753623 170.55546486 -126.1268199 171.40265902 -128.5 172.25 C-130.11512307 172.82388106 -131.7303563 173.39745219 -133.34570312 173.97070312 C-137.29425345 175.37271618 -141.2412702 176.7789693 -145.1875 178.1875 C-146.35370827 174.68887519 -145.96696456 173.14215309 -145.2265625 169.56640625 C-144.89011719 167.91608398 -144.89011719 167.91608398 -144.546875 166.23242188 C-144.30453125 165.08322266 -144.0621875 163.93402344 -143.8125 162.75 C-143.57789063 161.60466797 -143.34328125 160.45933594 -143.1015625 159.27929688 C-141.40889271 151.06119268 -141.40889271 151.06119268 -140.64599609 148.05053711 C-139.78804858 144.56438296 -139.37423062 141.67630779 -140.1875 138.1875 C-141.94393759 135.40573082 -143.93675141 132.8850327 -145.95703125 130.2890625 C-160.32320734 110.31227824 -163.02394623 82.28871771 -159.41772461 58.55322266 C-155.00198775 34.58381391 -140.8868803 11.8449254 -120.90625 -2.1484375 C-84.8310083 -26.57885164 -35.00105971 -26.94087877 0 0 Z '
                fill='#FCFDFE'
                transform='translate(714.1875,349.8125)'
              />
              <path
                d='M0 0 C1.9404286 -0.01173486 1.9404286 -0.01173486 3.92005777 -0.02370679 C5.34853395 -0.01722116 6.77700885 -0.01045122 8.20548248 -0.00342751 C9.72843941 -0.00688488 11.25139383 -0.01164999 12.77434301 -0.01760924 C16.95645211 -0.03013791 21.13835595 -0.02394039 25.3204658 -0.01465058 C29.83177888 -0.00786808 34.34305645 -0.01833736 38.85436249 -0.02659035 C47.69088128 -0.0399384 56.52732367 -0.03704516 65.36384547 -0.02835242 C72.54472203 -0.02158051 79.72557716 -0.02065703 86.90645599 -0.02392387 C87.92801901 -0.02438357 88.94958203 -0.02484327 90.00210151 -0.0253169 C92.07731093 -0.02627607 94.15252034 -0.02724871 96.22772974 -0.02823468 C115.69234245 -0.03679171 135.15691279 -0.02694951 154.62151855 -0.01083358 C171.32730282 0.00256989 188.03302454 0.00024188 204.73880768 -0.01358986 C224.13321351 -0.02964013 243.52758219 -0.03596771 262.92199373 -0.02675307 C264.98961925 -0.02579741 267.05724477 -0.0248543 269.1248703 -0.02392387 C270.14221279 -0.02346105 271.15955528 -0.02299822 272.20772633 -0.02252137 C279.3809529 -0.01992982 286.55415592 -0.02430603 293.72737885 -0.03136253 C302.46774494 -0.03977158 311.2080302 -0.03750992 319.94838703 -0.0215203 C324.40885421 -0.01362958 328.86918656 -0.01055964 333.32965279 -0.02046776 C337.41185481 -0.02939857 341.49379684 -0.02450853 345.57597524 -0.0085351 C347.05368299 -0.00518045 348.53141264 -0.00689674 350.00910634 -0.01416247 C352.01649785 -0.02327651 354.0239508 -0.01213973 356.03132629 0 C357.14672995 0.00048706 358.26213361 0.00097411 359.41133738 0.00147593 C364.1088105 0.57051189 367.39196917 2.37211302 370.89066315 5.50252342 C373.16554604 9.52731624 373.30378753 12.85575929 372.51566315 17.37752342 C370.8287427 20.81384286 369.70317747 22.7720893 366.27164072 24.52160037 C363.08376997 25.51165635 360.44611936 25.63061098 357.10752201 25.63479233 C355.80544381 25.64124122 354.5033656 25.64769011 353.16183048 25.65433443 C351.71862217 25.65139221 350.27541425 25.64825678 348.83220673 25.64494896 C347.29773959 25.64868533 345.76327436 25.6532868 344.22881216 25.6586796 C340.01028533 25.67092636 335.7918377 25.67064718 331.57329714 25.66829085 C327.02447638 25.66788312 322.47568115 25.67891761 317.92687225 25.68840599 C309.01470422 25.70502549 300.10256264 25.71051594 291.1903804 25.71163075 C283.94798361 25.71258065 276.70559555 25.71668803 269.46320152 25.723032 C248.93757124 25.74064599 228.41196189 25.74987047 207.886324 25.74837105 C206.779565 25.74829114 205.672806 25.74821122 204.53250885 25.74812889 C203.42440153 25.74804713 202.3162942 25.74796537 201.17460787 25.74788113 C183.20846611 25.74706789 165.24240812 25.76621458 147.2762906 25.79440562 C128.836555 25.82311199 110.39686029 25.8369472 91.95710176 25.83521807 C81.60139869 25.83455345 71.24578346 25.84007725 60.89010048 25.86157417 C52.07467566 25.87975629 43.25937851 25.8841577 34.44394309 25.87055533 C29.94495864 25.864011 25.44621935 25.86396115 20.947258 25.88126183 C16.82980193 25.89693286 12.71278665 25.8941905 8.59534173 25.87669356 C7.10481363 25.87361047 5.61425311 25.87730514 4.12376321 25.88841371 C2.0991016 25.90250564 0.07430576 25.88957453 -1.95035458 25.87530136 C-3.07541359 25.8757361 -4.20047261 25.87617083 -5.35962433 25.87661874 C-9.77100431 25.17201021 -13.08801849 23.15465588 -15.85933685 19.62752342 C-17.28391935 14.49902644 -17.16483891 10.76470069 -14.85933685 6.06502342 C-10.60392974 1.24969432 -6.30015661 0.00275105 0 0 Z '
                fill='#1F67C6'
                transform='translate(316.48433685302734,595.6224765777588)'
              />
              <path
                d='M0 0 C4.95 0 9.9 0 15 0 C15 6.6 15 13.2 15 20 C18.3 20 21.6 20 25 20 C25 13.4 25 6.8 25 0 C29.62 0 34.24 0 39 0 C39 6.93 39 13.86 39 21 C41.97 21 44.94 21 48 21 C54.70629282 22.22203558 60.11047929 25.12930247 64.25390625 30.6796875 C67.69687893 36.46196217 67.85826016 42.4347522 67 49 C65.19881474 55.37342475 61.20716326 59.13850815 56 63 C56.66386719 63.36351562 57.32773437 63.72703125 58.01171875 64.1015625 C64.69253421 67.90523846 70.08496382 71.5914801 73 79 C73.85340361 88.62018611 73.71437774 96.98822436 67.796875 104.97265625 C62.84637519 110.75980946 54.91176927 114.51796082 47.41796875 115.44140625 C44.125 115.4375 44.125 115.4375 39 115 C39 121.6 39 128.2 39 135 C34.38 135 29.76 135 25 135 C25 128.73 25 122.46 25 116 C21.7 116 18.4 116 15 116 C15 122.27 15 128.54 15 135 C10.05 135 5.1 135 0 135 C0 128.73 0 122.46 0 116 C-2.36478516 116.01740234 -2.36478516 116.01740234 -4.77734375 116.03515625 C-6.83072799 116.04453243 -8.8841135 116.05363282 -10.9375 116.0625 C-12.49887695 116.07506836 -12.49887695 116.07506836 -14.09179688 116.08789062 C-15.08115234 116.09111328 -16.07050781 116.09433594 -17.08984375 116.09765625 C-18.46450806 116.10551147 -18.46450806 116.10551147 -19.86694336 116.11352539 C-22 116 -22 116 -23 115 C-23.07258946 112.81360547 -23.08373783 110.62499611 -23.0625 108.4375 C-23.05347656 107.23996094 -23.04445313 106.04242188 -23.03515625 104.80859375 C-23.02355469 103.88175781 -23.01195312 102.95492187 -23 102 C-21.9275 101.71125 -20.855 101.4225 -19.75 101.125 C-14.55083656 99.80952871 -14.55083656 99.80952871 -10.91070557 96.26391602 C-9.83012256 93.57770296 -9.74611727 91.54571624 -9.74121094 88.65234375 C-9.73175446 87.05048218 -9.73175446 87.05048218 -9.72210693 85.41625977 C-9.72817963 83.69427368 -9.72817963 83.69427368 -9.734375 81.9375 C-9.73246155 80.75406006 -9.7305481 79.57062012 -9.72857666 78.35131836 C-9.72721596 75.84976997 -9.73090437 73.3482145 -9.73925781 70.84667969 C-9.74995863 67.01481281 -9.73935831 63.18341478 -9.7265625 59.3515625 C-9.72788411 56.92187396 -9.73044655 54.49218572 -9.734375 52.0625 C-9.73032654 50.91450928 -9.72627808 49.76651855 -9.72210693 48.58374023 C-9.72841125 47.51583252 -9.73471558 46.4479248 -9.74121094 45.34765625 C-9.74280212 44.40929932 -9.74439331 43.47094238 -9.74603271 42.50415039 C-10.01552381 39.84693322 -10.53349323 38.22358428 -12 36 C-14.40404738 35.08400573 -14.40404738 35.08400573 -17.125 34.75 C-18.73375 34.5025 -20.3425 34.255 -22 34 C-22 29.05 -22 24.1 -22 19 C-14.74 19 -7.48 19 0 19 C0 12.73 0 6.46 0 0 Z '
                fill='#1F66C5'
                transform='translate(628,361)'
              />
              <path
                d='M0 0 C0.99234195 -0.00538554 1.98468391 -0.01077108 3.00709683 -0.01631981 C6.33583536 -0.03063955 9.66417849 -0.02348562 12.99293518 -0.01637268 C15.37799907 -0.02207413 17.76306023 -0.02903751 20.14811707 -0.03717041 C25.95612918 -0.05327459 31.76401708 -0.05519742 37.57204681 -0.04995751 C42.29299743 -0.0459155 47.01391609 -0.04735972 51.73486519 -0.05270576 C52.74286968 -0.0538284 52.74286968 -0.0538284 53.7712379 -0.05497371 C55.13642685 -0.05650519 56.50161579 -0.05804354 57.86680473 -0.05958868 C70.66826837 -0.07331552 83.46967089 -0.06787474 96.27113313 -0.05640347 C107.98093533 -0.04647082 119.69057953 -0.05941189 131.40035736 -0.08333766 C143.42615305 -0.10772386 155.45187513 -0.11733772 167.47769505 -0.11068493 C174.22841649 -0.10719164 180.97901641 -0.10943195 187.72971916 -0.12693596 C194.07696839 -0.14237432 200.42391535 -0.13848378 206.7711525 -0.11963081 C209.10200631 -0.11593638 211.43288237 -0.11907813 213.76371574 -0.1295166 C216.94308855 -0.14266921 220.12145224 -0.13122902 223.30078125 -0.11352539 C224.68770043 -0.1279329 224.68770043 -0.1279329 226.10263819 -0.14263147 C231.64112868 -0.07908116 234.8203844 0.68991884 239.21388245 4.38768005 C241.32496794 6.77116367 242.16804637 8.33917978 242.30763245 11.5322113 C241.97184608 16.59419083 241.01815577 19.80079378 237.21388245 23.38768005 C234.3548372 25.08878818 232.26884721 25.63822728 228.95625401 25.64215565 C228.10839158 25.64798784 227.26052915 25.65382003 226.38697392 25.65982896 C225.46042639 25.65604964 224.53387887 25.65227031 223.57925415 25.64837646 C222.09708984 25.65411479 222.09708984 25.65411479 220.58498281 25.65996903 C217.26469581 25.67031097 213.94458135 25.66630459 210.62428284 25.66233826 C208.24759765 25.66668405 205.87091387 25.67186676 203.49423218 25.67782593 C197.70315051 25.68984691 191.9121228 25.69236564 186.12103016 25.69002566 C181.41435499 25.68824327 176.70769391 25.68999046 172.00102043 25.69425011 C171.33136859 25.6948453 170.66171674 25.69544048 169.97177241 25.69605371 C168.6114132 25.69726545 167.251054 25.69847958 165.89069479 25.69969609 C153.13076809 25.71057466 140.37086781 25.70840761 127.61093961 25.70231124 C115.93599165 25.69714156 104.26112711 25.70839827 92.58619566 25.72740946 C80.59999544 25.74677798 68.6138347 25.75504561 56.62761873 25.75128621 C49.8976129 25.74937269 43.16767809 25.75187635 36.43768501 25.76600075 C30.11019887 25.77854422 23.78288012 25.77666794 17.45539665 25.76358986 C15.13057271 25.76121697 12.80573711 25.76398411 10.48092651 25.77221298 C7.31225293 25.78262169 4.14414714 25.77462682 0.97549438 25.76190186 C0.05117758 25.76927614 -0.87313922 25.77665043 -1.82546562 25.78424817 C-8.09583134 25.73111561 -11.40570587 24.57508538 -16.09861755 20.26268005 C-18.45158366 16.25392299 -18.46343791 12.93068246 -17.78611755 8.38768005 C-14.37948381 0.14004047 -7.89373402 -0.05118631 0 0 Z '
                fill='#1E65C5'
                transform='translate(317.78611755371094,651.6123199462891)'
              />
              <path
                d='M0 0 C0.67671753 -0.00524185 1.35343506 -0.0104837 2.05065918 -0.0158844 C3.47955962 -0.02229983 4.90851291 -0.02097369 6.33740234 -0.01245117 C8.52406708 -0.00393423 10.70812426 -0.03271258 12.89453125 -0.06445312 C14.28385338 -0.06606512 15.67318014 -0.06548763 17.0625 -0.0625 C18.32642578 -0.06435303 19.59035156 -0.06620605 20.89257812 -0.06811523 C24.03125 0.43359375 24.03125 0.43359375 25.70360756 2.17166328 C27.2154888 4.747485 27.40808492 6.16240222 27.41220093 9.12619019 C27.42489014 10.53500961 27.42489014 10.53500961 27.43783569 11.97229004 C27.431763 12.99576538 27.42569031 14.01924072 27.41943359 15.07373047 C27.42469055 16.15707672 27.42994751 17.24042297 27.43536377 18.3565979 C27.44858078 21.94230516 27.4398181 25.52756936 27.4296875 29.11328125 C27.43170803 31.60425909 27.4346193 34.09523635 27.43838501 36.58621216 C27.44337802 42.47929272 27.43287074 48.37221241 27.4169327 54.2652694 C27.40567933 58.95995192 27.40964338 63.65444562 27.42236328 68.34912109 C27.43975722 74.82470292 27.44247688 81.30010238 27.4326973 87.77569962 C27.43069653 90.24364388 27.43315022 92.71159591 27.44013596 95.1795311 C27.44776093 98.63145213 27.43612988 102.08279029 27.41943359 105.53466797 C27.42854263 107.06380829 27.42854263 107.06380829 27.43783569 108.62384033 C27.39038584 113.92359366 27.17495908 117.93263481 24.03125 122.43359375 C18.88669836 124.1484443 13.47945446 123.70259048 8.09375 123.74609375 C6.30420898 123.78959961 6.30420898 123.78959961 4.47851562 123.83398438 C3.33189453 123.84236328 2.18527344 123.85074219 1.00390625 123.859375 C-0.56991821 123.88124878 -0.56991821 123.88124878 -2.17553711 123.90356445 C-5.65904978 123.31744769 -6.78538094 122.14584365 -8.96875 119.43359375 C-10.16532886 117.04043603 -10.09967162 115.55756462 -10.10919189 112.88539124 C-10.11490204 111.92776382 -10.12061218 110.97013641 -10.12649536 109.98348999 C-10.12761322 108.92940948 -10.12873108 107.87532898 -10.12988281 106.78930664 C-10.13484772 105.68192642 -10.13981262 104.5745462 -10.14492798 103.43360901 C-10.15957447 99.75781644 -10.16635518 96.082067 -10.171875 92.40625 C-10.17762368 89.86038715 -10.18338144 87.31452431 -10.18914795 84.7686615 C-10.19831916 80.10970385 -10.20461709 75.45075923 -10.2076447 70.79179484 C-10.21212794 63.93030679 -10.22968816 57.0690177 -10.2586453 50.20759016 C-10.28284345 44.26809308 -10.29058785 38.32864574 -10.29232025 32.38909721 C-10.29535533 29.86004998 -10.3034124 27.33100376 -10.31650543 24.8019886 C-10.3334867 21.27026246 -10.3317051 17.73902535 -10.32519531 14.20727539 C-10.3344101 13.15521912 -10.34362488 12.10316284 -10.3531189 11.01922607 C-10.34754974 10.05877884 -10.34198059 9.0983316 -10.33624268 8.10877991 C-10.33770924 7.27346772 -10.3391758 6.43815554 -10.3406868 5.57753086 C-9.33926022 -0.19494345 -5.03398667 0.03882664 0 0 Z '
                fill='#FCFCFE'
                transform='translate(447.96875,406.56640625)'
              />
              <path
                d='M0 0 C0.98178223 -0.00218285 0.98178223 -0.00218285 1.98339844 -0.00440979 C3.36527972 -0.00275204 4.7471797 0.00879582 6.12890625 0.02954102 C8.24298592 0.05849768 10.35455736 0.05015083 12.46875 0.03710938 C13.81251218 0.04334718 15.15626644 0.05173847 16.5 0.0625 C17.72203125 0.07224854 18.9440625 0.08199707 20.203125 0.09204102 C23.25 0.49609375 23.25 0.49609375 24.91517639 1.55651855 C26.94044132 4.49934455 26.67584855 7.48463795 26.65405273 10.93334961 C26.66091599 11.68814102 26.66777924 12.44293243 26.67485046 13.22059631 C26.69316326 15.71756766 26.68927465 18.21391335 26.68359375 20.7109375 C26.68815357 22.44584865 26.69345855 24.18075798 26.69947815 25.91566467 C26.70841815 29.55314467 26.70597627 33.19040523 26.69604492 36.82788086 C26.68455677 41.48993739 26.70475947 46.15123634 26.73396206 50.81319332 C26.75230687 54.39657913 26.75203502 57.97978284 26.74632454 61.56320381 C26.7461711 63.28200912 26.75223426 65.0008266 26.76461601 66.71958733 C26.77949148 69.12335614 26.76887559 71.52571862 26.75170898 73.92944336 C26.76137695 74.63970673 26.77104492 75.34997009 26.78100586 76.08175659 C26.73057527 79.45332393 26.46120263 81.21803812 24.39697266 83.93566895 C19.97031762 87.1529723 14.07432309 86.10540222 8.8125 86.05859375 C6.97075195 86.09436523 6.97075195 86.09436523 5.09179688 86.13085938 C3.90779297 86.12892578 2.72378906 86.12699219 1.50390625 86.125 C-0.11535767 86.12608765 -0.11535767 86.12608765 -1.76733398 86.12719727 C-5.82932473 85.26771899 -7.16558429 83.71348952 -9.75 80.49609375 C-10.2363683 77.78852653 -10.41735637 75.71278291 -10.36523438 73.01538086 C-10.37078339 72.27980453 -10.3763324 71.54422821 -10.38204956 70.78636169 C-10.39382198 68.36471584 -10.36960026 65.94495128 -10.34375 63.5234375 C-10.34203833 61.83622828 -10.34210515 60.14901641 -10.34387207 58.46180725 C-10.34222028 54.93025176 -10.32354701 51.39933218 -10.29199219 47.86791992 C-10.25228422 43.34273889 -10.24795123 38.81838921 -10.25545502 34.29306698 C-10.25852511 30.81088147 -10.24640338 27.32888266 -10.22932434 23.84674263 C-10.22229722 22.1781996 -10.21916946 20.50963542 -10.22001648 18.8410778 C-10.2182176 16.50946706 -10.19683054 14.17885075 -10.16992188 11.84741211 C-10.17285248 11.15899231 -10.17578308 10.47057251 -10.17880249 9.7612915 C-10.12539965 6.76056847 -9.87160527 4.71713464 -8.41418457 2.06799316 C-5.80848634 -0.39320951 -3.51184978 -0.00532519 0 0 Z '
                fill='#FBFCFD'
                transform='translate(392.75,444.50390625)'
              />
              <path
                d='M0 0 C1.01507629 -0.00574036 1.01507629 -0.00574036 2.05065918 -0.01159668 C3.47958872 -0.01431531 4.90856807 -0.00695717 6.33740234 0.00976562 C8.52424086 0.03118136 10.70779486 0.00996813 12.89453125 -0.015625 C14.28386141 -0.01298171 15.67318954 -0.00785669 17.0625 0 C18.95838867 0.00676758 18.95838867 0.00676758 20.89257812 0.01367188 C24.03125 0.53125 24.03125 0.53125 25.94189453 1.97680664 C27.62303776 5.91894057 27.45888824 9.69069758 27.4296875 13.93359375 C27.43255768 14.84830948 27.43542786 15.76302521 27.43838501 16.70545959 C27.4404243 18.63787455 27.43490387 20.57031021 27.42236328 22.50268555 C27.40632613 25.45473626 27.422207 28.40541405 27.44140625 31.35742188 C27.43942343 33.23698218 27.43557896 35.11654163 27.4296875 36.99609375 C27.43879654 38.31660988 27.43879654 38.31660988 27.4480896 39.6638031 C27.39370802 44.42300194 27.16068067 47.68511572 24.03125 51.53125 C19.45411496 53.81981752 13.18121359 52.85146843 8.15625 52.90625 C6.21685547 52.96232422 6.21685547 52.96232422 4.23828125 53.01953125 C2.99691406 53.03113281 1.75554687 53.04273438 0.4765625 53.0546875 C-1.23249268 53.0844165 -1.23249268 53.0844165 -2.97607422 53.11474609 C-5.96875 52.53125 -5.96875 52.53125 -8.34057617 50.6081543 C-10.63028124 46.28109581 -10.52494318 42.60402058 -10.46484375 37.77734375 C-10.46629898 36.83947525 -10.46775421 35.90160675 -10.46925354 34.93531799 C-10.4675972 32.9575794 -10.45606568 30.97982756 -10.43530273 29.00219727 C-10.40631482 25.9755178 -10.41470601 22.95058711 -10.42773438 19.92382812 C-10.42149761 17.99999149 -10.41310716 16.07616038 -10.40234375 14.15234375 C-10.40527939 13.24810165 -10.40821503 12.34385956 -10.41123962 11.41221619 C-10.35874706 7.91751187 -10.25247857 5.19878316 -8.87719727 1.96313477 C-5.97139625 -0.21705238 -3.59603067 0.01283642 0 0 Z '
                fill='#FAFBFD'
                transform='translate(337.96875,477.46875)'
              />
              <path
                d='M0 0 C5.445 -0.0928125 5.445 -0.0928125 11 -0.1875 C12.12792969 -0.21481201 13.25585938 -0.24212402 14.41796875 -0.27026367 C21.72218442 -0.33014485 27.60679743 0.28543794 33.5 5 C35.81011556 9.62023112 35.72836864 13.9385812 35 19 C33.24218858 22.78605537 31.78362382 24.45892641 28.375 26.8125 C19.36331546 29.98327789 9.42074847 29.08564317 0 29 C0 19.43 0 9.86 0 0 Z '
                fill='#FBFCFD'
                transform='translate(641,434)'
              />
              <path
                d='M0 0 C3.320625 -0.061875 6.64125 -0.12375 10.0625 -0.1875 C11.09511963 -0.21481201 12.12773926 -0.24212402 13.19165039 -0.27026367 C19.7091096 -0.32873032 24.90533331 0.20481718 29.9375 4.75 C31.51796126 8.09685914 31.50485263 10.33981842 31 14 C27.90609449 18.8228527 25.49775178 20.66890019 20 22 C16.53539048 22.22698177 13.09500034 22.18885117 9.625 22.125 C6.44875 22.08375 3.2725 22.0425 0 22 C0 14.74 0 7.48 0 0 Z '
                fill='#FCFDFE'
                transform='translate(641,396)'
              />
              <path
                d='M0 0 C0.763125 0.495 1.52625 0.99 2.3125 1.5 C4.92363751 3.24368308 4.92363751 3.24368308 8 3 C8 3.99 8 4.98 8 6 C9.32 6 10.64 6 12 6 C12 6.66 12 7.32 12 8 C6.38074374 7.59862455 3.91343237 5.82025541 0 2 C0 1.34 0 0.68 0 0 Z '
                fill='#175CC1'
                transform='translate(303,550)'
              />
              <path
                d='M0 0 C0.66 0.33 1.32 0.66 2 1 C1.01 1.33 0.02 1.66 -1 2 C-1 2.66 -1 3.32 -1 4 C-1.66 4 -2.32 4 -3 4 C-3.66 5.32 -4.32 6.64 -5 8 C-5.66 8 -6.32 8 -7 8 C-8.34882408 8.63474075 -9.6846659 9.29848848 -11 10 C-7.65996398 5.67760044 -4.67248931 2.82522609 0 0 Z '
                fill='#1458C0'
                transform='translate(578,323)'
              />
              <path
                d='M0 0 C0.66 0 1.32 0 2 0 C1.67 1.98 1.34 3.96 1 6 C0.01 5.67 -0.98 5.34 -2 5 C-1.125 1.125 -1.125 1.125 0 0 Z M-4 4 C-3.34 4.66 -2.68 5.32 -2 6 C-2.99 7.485 -2.99 7.485 -4 9 C-4.33 8.34 -4.66 7.68 -5 7 C-4.67 6.01 -4.34 5.02 -4 4 Z '
                fill='#1961C3'
                transform='translate(896,618)'
              />
              <path
                d='M0 0 C0.66 0.66 1.32 1.32 2 2 C-1.19990508 4.74277578 -4.00499382 6.6302836 -8 8 C-6.88333826 4.65001479 -6.25305075 4.20659778 -3.4375 2.3125 C-2.79683594 1.87550781 -2.15617187 1.43851563 -1.49609375 0.98828125 C-1.00238281 0.66214844 -0.50867188 0.33601562 0 0 Z '
                fill='#175FC4'
                transform='translate(274,174)'
              />
              <path
                d='M0 0 C5.75 1.625 5.75 1.625 8 5 C6.68 4.67 5.36 4.34 4 4 C3.34 5.32 2.68 6.64 2 8 C1.34 5.36 0.68 2.72 0 0 Z '
                fill='#175FC3'
                transform='translate(718,156)'
              />
              <path
                d='M0 0 C1.98 0 3.96 0 6 0 C4.515 1.98 4.515 1.98 3 4 C3.33 4.33 3.66 4.66 4 5 C3.01 5.33 2.02 5.66 1 6 C0.67 4.02 0.34 2.04 0 0 Z '
                fill='#165FC3'
                transform='translate(119,603)'
              />
              <path
                d='M0 0 C0.33 0 0.66 0 1 0 C2.46845421 5.47332932 1.44038726 8.11922548 -1 13 C-1.33 13 -1.66 13 -2 13 C-1.85769192 11.58297487 -1.71099254 10.1663904 -1.5625 8.75 C-1.48128906 7.96109375 -1.40007813 7.1721875 -1.31640625 6.359375 C-1.02365007 4.17635361 -0.57935581 2.1226818 0 0 Z '
                fill='#0F53C0'
                transform='translate(749,444)'
              />
              <path
                d='M0 0 C0.99 0.33 1.98 0.66 3 1 C2.319375 1.61875 2.319375 1.61875 1.625 2.25 C-0.05950374 4.06408095 -0.99265971 5.75285627 -2 8 C-2.66 7.67 -3.32 7.34 -4 7 C-3.43628586 3.73045798 -2.50037734 2.17424117 0 0 Z '
                fill='#145AC1'
                transform='translate(306,372)'
              />
            </svg>
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between text-xs theme-text-primary'>
            <div className='flex items-center gap-2 min-w-0 flex-1'>
              <div className='font-semibold truncate'>
                {exchangeInfo?.name || t('cexFeeds')}
              </div>
            </div>
            {createdAt ? (
              <div className='text-[10px] theme-text-secondary ml-2 flex-shrink-0'>
                {new Date(createdAt).toLocaleString()}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* AI 摘要 - 与 TweetCard 一致，置于头部行之后 */}
      {summaryText ? (
        <div className='mb-2 relative'>
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
          className='text-xs theme-text-primary break-words'
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
            href={String(type) === 'news' ? '#' : listing?.link}
            target='_blank'
            rel='noopener noreferrer'
            className={`block ${
              String(type) === 'news' ? 'pointer-events-none' : ''
            }`}
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
  );
};
