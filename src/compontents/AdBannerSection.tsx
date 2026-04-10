import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useDebounceFn, useRequest } from 'ahooks';
import { nacosCacheManager } from '~utils/nacosCacheManager';
import { useI18n } from '~contents/hooks/i18n.ts';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { X } from 'lucide-react';
import { CloseConfirmDialog } from './CloseConfirmDialog';
import { AdBannerItem } from '~utils/configManager';
import { localStorageInstance } from '~storage/index';
import { getCurrentUsername } from '~contents/utils/helpers';

// 本地存储的展示次数数据结构
interface AdImpressionData {
  count: number;
  sessions: string[]; // 已记录的页面会话ID列表
}

interface AdImpressions {
  [adId: string]: {
    [date: string]: AdImpressionData;
  };
}

const AD_IMPRESSIONS_KEY = '@xhunt/ad_impressions_v2';

// 生成当前页面会话ID（页面刷新后变化）
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 从 Nacos 获取广告配置
const fetchAdBanners = async (): Promise<AdBannerItem[]> => {
  try {
    const config = await nacosCacheManager.fetchWithCache<{
      adBanners?: AdBannerItem[];
    }>('xhunt_config', 60 * 1000);
    return (config?.adBanners || []).filter((b) => b.enabled);
  } catch (error) {
    console.error('[AdBannerSection] Failed to fetch ad banners:', error);
    return [];
  }
};

// Fisher-Yates 洗牌算法
const shuffleArray = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// 获取今日日期字符串 (YYYY-MM-DD)
const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

// 检查广告对当前用户是否可见
const isVisibleToUser = (ad: AdBannerItem, currentUser: string): boolean => {
  if (!ad.visible_to || ad.visible_to.length === 0) return true;
  const normalizedUsers = ad.visible_to.map((u) => u.toLowerCase());
  return normalizedUsers.includes(currentUser.toLowerCase());
};

// 原子性增加展示次数（传入会话ID，支持SPA路由切换后重新计数）
const incrementImpression = async (
  adId: string,
  sessionId: string,
): Promise<boolean> => {
  const today = getToday();

  try {
    // 读取最新数据
    const data =
      ((await localStorageInstance.get(AD_IMPRESSIONS_KEY)) as AdImpressions) ||
      {};

    if (!data[adId]) data[adId] = {};

    // 清理旧日期数据
    Object.keys(data[adId]).forEach((date) => {
      if (date !== today) delete data[adId][date];
    });

    if (!data[adId][today]) {
      data[adId][today] = { count: 0, sessions: [] };
    }

    const todayData = data[adId][today];

    // 检查当前页面会话是否已记录
    if (todayData.sessions.includes(sessionId)) {
      return false; // 已记录过，不增加
    }

    // 增加计数并记录会话
    todayData.count += 1;
    todayData.sessions.push(sessionId);

    // 写回 storage
    await localStorageInstance.set(AD_IMPRESSIONS_KEY, data);

    return true;
  } catch (error) {
    console.error('[AdBannerSection] Failed to increment impression:', error);
    return false;
  }
};

// 获取今日展示次数
const getTodayImpressions = async (adId: string): Promise<number> => {
  const today = getToday();
  try {
    const data =
      ((await localStorageInstance.get(AD_IMPRESSIONS_KEY)) as AdImpressions) ||
      {};
    return data[adId]?.[today]?.count || 0;
  } catch {
    return 0;
  }
};

// 检查广告是否还有剩余次数
const hasRemainingImpressions = async (
  ad: AdBannerItem,
  currentImpressions?: number,
): Promise<boolean> => {
  if (ad.daily_limit === -1) return true;
  const impressions = currentImpressions ?? (await getTodayImpressions(ad.id));
  return impressions < ad.daily_limit;
};

// 清理废弃的广告记录
const cleanupStaleAds = async (activeAdIds: string[]) => {
  try {
    const data =
      ((await localStorageInstance.get(AD_IMPRESSIONS_KEY)) as AdImpressions) ||
      {};
    const activeSet = new Set(activeAdIds);

    let hasChanges = false;
    Object.keys(data).forEach((adId) => {
      if (!activeSet.has(adId)) {
        delete data[adId];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await localStorageInstance.set(AD_IMPRESSIONS_KEY, data);
    }
  } catch (error) {
    console.error('[AdBannerSection] Failed to cleanup stale ads:', error);
  }
};

export function AdBannerSection() {
  const { lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [showAdBanner, setShowAdBanner] = useLocalStorage(
    '@settings/showAdBanner',
    true,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');

  // SPA 路由感知：使用 useCurrentUrl 监听 URL 变化
  const currentUrl = useCurrentUrl();
  const sessionIdRef = useRef<string>(generateSessionId());
  const sessionRecordedAds = useRef<Set<string>>(new Set());
  const hasRecordedInitialImpression = useRef(false);
  const initialAdIdRef = useRef<string>('');
  const lastUrlRef = useRef(currentUrl);

  // 获取当前用户名
  useEffect(() => {
    getCurrentUsername().then((username) => {
      setCurrentUser(username || '');
    });
  }, []);

  // SPA 路由感知：监听 URL 变化，切换路由后重置会话
  useEffect(() => {
    // URL 变化了，重置会话
    if (lastUrlRef.current !== currentUrl) {
      lastUrlRef.current = currentUrl;
      sessionIdRef.current = generateSessionId();
      sessionRecordedAds.current.clear();
      hasRecordedInitialImpression.current = false;
      initialAdIdRef.current = '';
      console.log('[AdBannerSection] URL changed, reset session:', currentUrl);
    }
  }, [currentUrl]);

  // 获取广告配置
  const { data: rawBanners = [] } = useRequest(fetchAdBanners, {
    cacheKey: 'adBanners',
    staleTime: 60 * 1000,
  });

  // 处理广告列表：过滤可见性、排序、过滤次数上限
  const processedBanners = useMemo(() => {
    if (!currentUser) return [];

    // 1. 过滤可见性
    const visibleBanners = rawBanners.filter((ad) =>
      isVisibleToUser(ad, currentUser),
    );

    // 2. 按类型分组
    const commercial = visibleBanners.filter((ad) => ad.type === 'commercial');
    const normal = visibleBanners.filter((ad) => ad.type === 'normal');

    // 3. 各自随机排序
    const shuffledCommercial = shuffleArray(commercial);
    const shuffledNormal = shuffleArray(normal);

    // 4. 合并：commercial 优先
    return [...shuffledCommercial, ...shuffledNormal];
  }, [rawBanners, currentUser]);

  // 过滤掉已达上限的广告（异步）
  const [availableBanners, setAvailableBanners] = useState<AdBannerItem[]>([]);

  useEffect(() => {
    const filterByLimit = async () => {
      const results: AdBannerItem[] = [];

      for (const ad of processedBanners) {
        if (await hasRemainingImpressions(ad)) {
          results.push(ad);
        }
      }

      setAvailableBanners((prev) => {
        // 只有当结果真正变化时才更新，避免无限循环
        const prevIds = prev.map((b) => b.id).join(',');
        const newIds = results.map((b) => b.id).join(',');
        if (prevIds === newIds) return prev;
        return results;
      });
    };

    filterByLimit();
  }, [processedBanners]);

  // 清理废弃的广告记录
  useEffect(() => {
    if (rawBanners.length > 0) {
      cleanupStaleAds(rawBanners.map((ad) => ad.id));
    }
  }, [rawBanners]);

  // 记录广告展示
  const { run: recordAdImpression } = useDebounceFn(
    async (adId: string) => {
      // 检查当前页面是否已记录
      if (sessionRecordedAds.current.has(adId)) {
        return;
      }

      // 原子性增加计数（传入当前会话 ID）
      const incremented = await incrementImpression(adId, sessionIdRef.current);

      if (incremented) {
        sessionRecordedAds.current.add(adId);
      }
    },
    {
      wait: 500,
      leading: false,
      trailing: true
    },
  );

  // 初始化时记录第一个广告的展示
  useEffect(() => {
    if (
      availableBanners.length > 0 &&
      currentIndex === 0 &&
      !hasRecordedInitialImpression.current
    ) {
      const firstAdId = availableBanners[0].id;
      // 防止 StrictMode 或重复渲染导致同一广告被记录两次
      if (initialAdIdRef.current === firstAdId) {
        return;
      }
      initialAdIdRef.current = firstAdId;
      hasRecordedInitialImpression.current = true;
      recordAdImpression(firstAdId);
    }
  }, [availableBanners, currentIndex, recordAdImpression]);

  // 自动轮播
  useEffect(() => {
    if (availableBanners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % availableBanners.length;
        const nextBanner = availableBanners[nextIndex];
        if (nextBanner) {
          recordAdImpression(nextBanner.id);
        }
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [availableBanners.length, availableBanners, recordAdImpression]);

  // 点击广告
  const handleClick = useCallback(
    (banner: AdBannerItem) => {
      const linkUrl = lang === 'zh' ? banner.link_url_zh : banner.link_url_en;
      if (linkUrl) {
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [lang],
  );

  // 关闭按钮点击 - 显示确认对话框
  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCloseConfirm(true);
  }, []);

  // 确认关闭
  const handleConfirmClose = useCallback(async () => {
    setShowAdBanner(false);
    setShowCloseConfirm(false);
  }, [setShowAdBanner]);

  // 手动切换
  const goToSlide = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      const banner = availableBanners[index];
      if (banner) {
        recordAdImpression(banner.id);
      }
    },
    [availableBanners, recordAdImpression],
  );

  // 获取当前语言对应的内容
  const getBannerContent = (banner: AdBannerItem) => {
    const isZh = lang === 'zh';
    return {
      imageUrl: isZh ? banner.image_url_zh : banner.image_url_en,
      linkUrl: isZh ? banner.link_url_zh : banner.link_url_en,
      altText: isZh ? banner.alt_text_zh : banner.alt_text_en,
    };
  };

  // 用户手动关闭了广告
  if (!showAdBanner) {
    return null;
  }

  // 没有可用的广告
  if (availableBanners.length === 0) {
    return null;
  }

  const currentBanner = availableBanners[currentIndex];
  const content = currentBanner ? getBannerContent(currentBanner) : null;

  return (
    <>
      <div
        data-theme={theme}
        className='relative w-full rounded-t-xl overflow-hidden'
        style={{ aspectRatio: '350 / 60' }}
      >
        {content && (
          <>
            {/* 广告图片 */}
            <div
              className='w-full h-full cursor-pointer relative'
              onClick={() => currentBanner && handleClick(currentBanner)}
            >
              {content.imageUrl ? (
                <img
                  src={content.imageUrl}
                  alt={content.altText || 'Ad'}
                  className='w-full h-full object-cover'
                  draggable={false}
                />
              ) : (
                <div
                  className='w-full h-full flex items-center justify-center'
                  style={{
                    background:
                      'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                  }}
                >
                  <span className='text-white/60 text-sm font-medium'>
                    广告位
                  </span>
                </div>
              )}
            </div>

            {/* 关闭按钮 */}
            <button
              type='button'
              onClick={handleCloseClick}
              className='absolute top-1.5 right-1.5 p-1 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-all duration-200 z-10'
              title='关闭广告'
            >
              <X size={12} strokeWidth={2.5} />
            </button>

            {/* 轮播指示器 - 多个广告时显示 */}
            {availableBanners.length > 1 && (
              <div className='absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5'>
                {availableBanners.map((_, index) => (
                  <button
                    key={index}
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSlide(index);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${index === currentIndex
                        ? 'bg-white w-3'
                        : 'bg-white/50 hover:bg-white/70'
                      }`}
                    aria-label={`Go to ad ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 关闭确认对话框 */}
      <CloseConfirmDialog
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleConfirmClose}
        prefixKey='confirmCloseAdBannerPrefix'
        suffixKey='confirmCloseAdBannerSuffix'
        style={{ top: '100px' }}
      />
    </>
  );
}

export default AdBannerSection;
