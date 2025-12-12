import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { generatePersonalizedColor } from '~/utils/colorGenerator.ts';
import { safeNumber, safeString } from '~/utils/dataValidation.ts';
import { MultiFieldItem, NewTwitterUserData } from '~types';
import usePlacementTrackingDomUserInfo from '~contents/hooks/usePlacementTrackingDomUserInfo';
import {
  getCanvasContext,
  releaseCanvasContext,
} from '~utils/canvasContextManager';

export interface KolAbilityData {
  abilities: MultiFieldItem[];
  summary?: string;
}

interface KolAbilityRadarProps {
  abilities?: MultiFieldItem[];
  summary?: string;
  isLoading?: boolean;
  userId: string;
  newTwitterData?: NewTwitterUserData | null;
  loadingTwInfo?: boolean;
}

// 🆕 localStorage缓存管理
interface AvatarCacheEntry {
  name: string;
  avatar: string;
  timestamp: number;
}

interface AvatarCacheStorage {
  [username: string]: AvatarCacheEntry;
}

const AVATAR_CACHE_KEY = '@xhunt/avatar-cache';
const MAX_CACHE_SIZE = 30; // 最大缓存数量
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24小时过期
const MAX_STORAGE_SIZE = 100 * 1024; // 100KB存储限制

// 🆕 Canvas 安全配置
const CANVAS_CONFIG = {
  MAX_WIDTH: 800, // 最大宽度
  MAX_HEIGHT: 400, // 最大高度
  MIN_WIDTH: 300, // 最小宽度
  MIN_HEIGHT: 200, // 最小高度
  DEFAULT_WIDTH: 360, // 默认宽度
  DEFAULT_HEIGHT: 260, // 默认高度
  MAX_DEVICE_PIXEL_RATIO: 2, // 最大设备像素比
  MAX_CANVAS_AREA: 320000, // 最大画布面积 (800x400)
};

// 🆕 安全的画布尺寸计算
const calculateSafeCanvasSize = (
  requestedWidth: number,
  requestedHeight: number
) => {
  try {
    // 限制尺寸范围
    let safeWidth = Math.max(
      CANVAS_CONFIG.MIN_WIDTH,
      Math.min(requestedWidth, CANVAS_CONFIG.MAX_WIDTH)
    );
    let safeHeight = Math.max(
      CANVAS_CONFIG.MIN_HEIGHT,
      Math.min(requestedHeight, CANVAS_CONFIG.MAX_HEIGHT)
    );

    // 检查总面积
    const totalArea = safeWidth * safeHeight;
    if (totalArea > CANVAS_CONFIG.MAX_CANVAS_AREA) {
      // 按比例缩小
      const scale = Math.sqrt(CANVAS_CONFIG.MAX_CANVAS_AREA / totalArea);
      safeWidth = Math.floor(safeWidth * scale);
      safeHeight = Math.floor(safeHeight * scale);
    }

    // 确保是有效数值
    safeWidth = isFinite(safeWidth) ? safeWidth : CANVAS_CONFIG.DEFAULT_WIDTH;
    safeHeight = isFinite(safeHeight)
      ? safeHeight
      : CANVAS_CONFIG.DEFAULT_HEIGHT;

    return { width: safeWidth, height: safeHeight };
  } catch (error) {
    console.log('Error calculating canvas size, using defaults:', error);
    return {
      width: CANVAS_CONFIG.DEFAULT_WIDTH,
      height: CANVAS_CONFIG.DEFAULT_HEIGHT,
    };
  }
};

// 🆕 安全的设备像素比获取
const getSafeDevicePixelRatio = (): number => {
  try {
    const ratio = window.devicePixelRatio || 1;
    return Math.min(ratio, CANVAS_CONFIG.MAX_DEVICE_PIXEL_RATIO);
  } catch (error) {
    console.log('Error getting device pixel ratio:', error);
    return 1;
  }
};

// 🆕 localStorage缓存管理函数
const getAvatarCache = (): AvatarCacheStorage => {
  try {
    const cached = localStorage.getItem(AVATAR_CACHE_KEY);
    if (!cached) return {};

    const data = JSON.parse(cached);
    const now = Date.now();

    // 过滤过期数据
    const validCache: AvatarCacheStorage = {};
    Object.keys(data).forEach((username) => {
      if (
        data[username] &&
        now - data[username].timestamp < CACHE_EXPIRY_TIME
      ) {
        validCache[username] = data[username];
      }
    });

    return validCache;
  } catch (error) {
    console.log('Failed to load avatar cache:', error);
    return {};
  }
};

const setAvatarCache = (cache: AvatarCacheStorage): void => {
  try {
    // 检查缓存大小，如果超过限制则清理
    let cacheEntries = Object.entries(cache);

    // 如果超过数量限制，按时间戳排序，保留最新的
    if (cacheEntries.length > MAX_CACHE_SIZE) {
      cacheEntries = cacheEntries
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .slice(0, MAX_CACHE_SIZE);
    }

    const trimmedCache = Object.fromEntries(cacheEntries);
    const cacheString = JSON.stringify(trimmedCache);

    // 检查存储大小限制
    if (cacheString.length > MAX_STORAGE_SIZE) {
      console.log(
        `Avatar cache size too large (${cacheString.length} bytes), performing aggressive cleanup...`
      );

      // 激进清理：只保留最近的数据
      const entries = Object.entries(cache);
      const recentEntries = entries
        .filter(
          ([, entry]) => Date.now() - entry.timestamp < 24 * 60 * 60 * 1000
        ) // 只保留24小时内的
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .slice(0, Math.floor(MAX_CACHE_SIZE * 0.5)); // 只保留50%

      cache = Object.fromEntries(recentEntries);
      console.log(
        `Aggressive cleanup completed, kept ${recentEntries.length} entries`
      );
    }

    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(trimmedCache));
  } catch (error) {
    console.log('Failed to save avatar cache:', error);
    // 如果存储失败，尝试清空缓存重新开始
    try {
      localStorage.removeItem(AVATAR_CACHE_KEY);
    } catch (clearError) {
      console.log('Failed to clear avatar cache:', clearError);
    }
  }
};

const updateAvatarCache = (
  username: string,
  data: { name: string; avatar: string }
): void => {
  const cache = getAvatarCache();
  cache[username] = {
    name: data.name,
    avatar: data.avatar,
    timestamp: Date.now(),
  };
  setAvatarCache(cache);
};

// 🆕 内存缓存管理（作为localStorage的补充）
interface AvatarCache {
  [username: string]: {
    name: string;
    avatar: string;
    timestamp: number;
  };
}

// 模块级缓存，按URL分组
const avatarCacheByUrl: { [url: string]: AvatarCache } = {};
const MAX_MEMORY_CACHE_SIZE = 10; // 内存缓存更小，只缓存当前会话

// 🆕 内存缓存管理函数
const manageCacheSize = () => {
  // 计算所有URL下的总缓存数量
  let totalCacheCount = 0;
  const allCacheEntries: Array<{
    url: string;
    username: string;
    timestamp: number;
  }> = [];

  // 收集所有缓存条目
  Object.keys(avatarCacheByUrl).forEach((url) => {
    Object.keys(avatarCacheByUrl[url]).forEach((username) => {
      totalCacheCount++;
      allCacheEntries.push({
        url,
        username,
        timestamp: avatarCacheByUrl[url][username].timestamp,
      });
    });
  });

  // 如果超过限制，删除最旧的缓存
  if (totalCacheCount > MAX_MEMORY_CACHE_SIZE) {
    // 按时间戳排序，最旧的在前
    allCacheEntries.sort((a, b) => a.timestamp - b.timestamp);

    // 删除最旧的缓存，直到数量在限制内
    const entriesToDelete = allCacheEntries.slice(
      0,
      totalCacheCount - MAX_MEMORY_CACHE_SIZE
    );

    entriesToDelete.forEach(({ url, username }) => {
      if (avatarCacheByUrl[url] && avatarCacheByUrl[url][username]) {
        delete avatarCacheByUrl[url][username];

        // 如果该URL下没有缓存了，删除整个URL键
        if (Object.keys(avatarCacheByUrl[url]).length === 0) {
          delete avatarCacheByUrl[url];
        }
      }
    });

    console.log(
      `🗑️ Cleaned up ${entriesToDelete.length} old memory cache entries`
    );
  }
};

function KolAbilityRadar({
  abilities = [],
  summary,
  isLoading,
  userId,
  newTwitterData,
  loadingTwInfo,
}: KolAbilityRadarProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(() =>
    calculateSafeCanvasSize(
      CANVAS_CONFIG.DEFAULT_WIDTH,
      CANVAS_CONFIG.DEFAULT_HEIGHT
    )
  );
  const {
    handler: hookUsername,
    displayName: hookName,
    avatar: hookAvatar,
    loading: hookLoading,
  } = usePlacementTrackingDomUserInfo();
  const domUserInfo = useMemo(
    () =>
      hookUsername
        ? {
            username: hookUsername,
            name: hookName,
            avatar: hookAvatar,
            source: 'data-testid' as const,
          }
        : null,
    [hookUsername, hookName, hookAvatar]
  );
  const domUserInfoLoading = hookLoading;

  // 从 abilities 中提取能力名称用于生成个性化颜色
  const abilityNames = useMemo(() => {
    try {
      return abilities.map((item) => {
        const key = Object.keys(item)[0];
        return safeString(key, 'Unknown');
      });
    } catch {
      return [];
    }
  }, [abilities]);

  // 生成个性化颜色
  const personalizedColors = useMemo(() => {
    return generatePersonalizedColor(abilityNames);
  }, [abilityNames]);

  // 生成雷达图数据 - 使用真实的 multiField 数据，只取前8个
  const radarData = useMemo(() => {
    try {
      if (!abilities || abilities.length === 0) {
        return [];
      }

      // 只取前8个能力，避免雷达图过于拥挤
      return abilities.slice(0, 8).map((item, index) => {
        try {
          const key = Object.keys(item)[0];
          const value = item[key];

          return {
            ability: safeString(key, `Ability${index + 1}`),
            value: safeNumber(value, 50, 0, 100),
          };
        } catch {
          // 单个能力数据异常时的fallback
          return {
            ability: `Ability${index + 1}`,
            value: 50,
          };
        }
      });
    } catch {
      // 整体数据异常时的fallback
      return [];
    }
  }, [abilities]);

  // 🆕 处理水印文本，为 @XHunt_ai 添加链接
  const watermarkContent = useMemo(() => {
    const watermarkText = t('aiAnalysisWatermark');

    // 将 @XHunt_ai 替换为可点击的链接
    const parts = watermarkText.split('@XHunt_ai');

    if (parts.length === 2) {
      return (
        <>
          {parts[0]}
          <a
            href='https://x.com/xhunt_ai'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-700 hover:text-blue-500 transition-colors cursor-pointer'
            onClick={(e) => e.stopPropagation()}
          >
            @XHunt_ai
          </a>
          {parts[1]}
        </>
      );
    }

    // 如果没有找到 @XHunt_ai，直接返回原文本
    return watermarkText;
  }, [t]);

  // 🔧 修复Canvas内存溢出 - 安全的绘制雷达图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isLoading || radarData.length === 0) return;

    let ctx: CanvasRenderingContext2D | null = null;

    try {
      // 使用Canvas上下文管理器获取上下文
      ctx = getCanvasContext(canvas, '2d') as CanvasRenderingContext2D;
      if (!ctx) {
        console.log('Failed to get canvas 2D context');
        return;
      }

      // 🆕 安全的设备像素比获取
      const devicePixelRatio = getSafeDevicePixelRatio();

      // 🆕 安全的画布尺寸计算
      const safeSize = calculateSafeCanvasSize(
        canvasSize.width,
        canvasSize.height
      );
      const displayWidth = safeSize.width;
      const displayHeight = safeSize.height;

      // 🆕 检查画布尺寸是否合理
      const canvasArea =
        displayWidth * displayHeight * devicePixelRatio * devicePixelRatio;
      if (canvasArea > CANVAS_CONFIG.MAX_CANVAS_AREA * 4) {
        // 考虑设备像素比的影响
        console.log(
          'Canvas area too large, skipping render to prevent memory overflow'
        );
        return;
      }

      try {
        // 设置画布的内部尺寸（考虑设备像素比）
        canvas.width = displayWidth * devicePixelRatio;
        canvas.height = displayHeight * devicePixelRatio;

        // 设置画布的显示尺寸
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';

        // 缩放绘图上下文以匹配设备像素比
        ctx.scale(devicePixelRatio, devicePixelRatio);
      } catch (canvasError) {
        console.log('Failed to set canvas size, using fallback:', canvasError);
        // 使用更小的尺寸作为fallback
        const fallbackSize = calculateSafeCanvasSize(300, 200);
        canvas.width = fallbackSize.width;
        canvas.height = fallbackSize.height;
        canvas.style.width = fallbackSize.width + 'px';
        canvas.style.height = fallbackSize.height + 'px';
        // 不使用设备像素比缩放
      }

      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;

      // 🔧 确保雷达图是正圆形，不会因为容器宽度变化而变形
      // 半径取宽度和高度的较小值，确保雷达图不会超出容器
      const maxRadius = Math.min(centerX, centerY) - 60; // 留出更多边距给标签
      const radius = Math.max(80, maxRadius); // 最小半径80px

      const angleStep = (2 * Math.PI) / radarData.length;

      // 清空画布 - 使用主题色背景
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // 设置背景色，避免黑色闪烁
      ctx.fillStyle = 'rgba(255,255,255,0)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // 绘制多边形网格（而不是圆形）- 添加异常处理
      try {
        ctx.strokeStyle = theme === 'dark' ? '#374151' : '#e5e7eb';
        ctx.lineWidth = safeNumber(1, 1, 0.5, 3);

        // 绘制同心多边形（5层）
        for (let i = 1; i <= 5; i++) {
          try {
            const currentRadius = (radius * i) / 5;
            ctx.beginPath();

            // 🔧 确保正多边形：从正上方开始，顺时针绘制
            for (let j = 0; j < radarData.length; j++) {
              try {
                const angle = j * angleStep - Math.PI / 2; // 从正上方开始
                const x = centerX + Math.cos(angle) * currentRadius;
                const y = centerY + Math.sin(angle) * currentRadius;

                // 验证坐标是否有效
                if (!isFinite(x) || !isFinite(y)) continue;

                if (j === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              } catch {
                // 单个点绘制失败时继续下一个点
                continue;
              }
            }
            ctx.closePath();
            ctx.stroke();
          } catch {
            // 单层网格绘制失败时继续下一层
            continue;
          }
        }
      } catch {
        console.log('Failed to draw grid lines');
      }

      // 绘制轴线 - 添加异常处理
      try {
        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2; // 从正上方开始
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            // 验证坐标是否有效
            if (!isFinite(x) || !isFinite(y)) continue;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
          } catch {
            // 单条轴线绘制失败时继续下一条
            continue;
          }
        }
      } catch {
        console.log('Failed to draw axis lines');
      }

      // 绘制标签 - 保持现有间距
      try {
        ctx.fillStyle = theme === 'dark' ? '#a0aec0' : '#4a5568';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2; // 从正上方开始
            const labelRadius = radius + 18; // 保持现有间距

            const labelX = centerX + Math.cos(angle) * labelRadius;
            const labelY = centerY + Math.sin(angle) * labelRadius;

            // 验证坐标是否有效
            if (!isFinite(labelX) || !isFinite(labelY)) continue;

            // 绘制能力名称
            const labelText = safeString(
              radarData[i]?.ability,
              `Label${i + 1}`
            );

            // 🔧 处理长文本，如果超过6个字符则截断
            const displayText =
              labelText.length > 20
                ? labelText.substring(0, 20) + '...'
                : labelText;

            // 🔧 修复 textContent 为 null 的问题 - 确保 fillText 参数有效
            if (displayText && typeof displayText === 'string') {
              ctx.fillText(displayText, labelX, labelY);
            }
          } catch {
            // 单个标签绘制失败时继续下一个
            continue;
          }
        }
      } catch {
        console.log('Failed to draw labels');
      }

      // 🆕 绘制每个点的分数
      try {
        ctx.fillStyle = personalizedColors.primary;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2; // 从正上方开始
            const value = safeNumber(radarData[i]?.value, 50, 0, 100);
            const dataRadius = (radius * value) / 100;

            // 分数显示在数据点稍微外侧
            const scoreRadius = dataRadius + 12;
            const scoreX = centerX + Math.cos(angle) * scoreRadius;
            const scoreY = centerY + Math.sin(angle) * scoreRadius;

            // 验证坐标是否有效
            if (!isFinite(scoreX) || !isFinite(scoreY)) continue;

            // 🔧 修复 textContent 为 null 的问题 - 确保分数文字有效
            const scoreText = value != null ? value.toString() : '0';
            if (scoreText && typeof scoreText === 'string') {
              ctx.fillText(scoreText, scoreX, scoreY);
            }
          } catch {
            // 单个分数绘制失败时继续下一个
            continue;
          }
        }
      } catch {
        console.log('Failed to draw scores');
      }

      // 绘制数据区域 - 使用个性化颜色
      try {
        ctx.fillStyle = personalizedColors.secondary; // 使用个性化半透明填充
        ctx.strokeStyle = personalizedColors.primary; // 使用个性化边框
        ctx.lineWidth = safeNumber(2.5, 2.5, 1, 5);

        ctx.beginPath();
        let hasValidPoint = false;

        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2; // 从正上方开始
            const value = safeNumber(radarData[i]?.value, 50, 0, 100);
            const dataRadius = (radius * value) / 100;
            const x = centerX + Math.cos(angle) * dataRadius;
            const y = centerY + Math.sin(angle) * dataRadius;

            // 验证坐标是否有效
            if (!isFinite(x) || !isFinite(y)) continue;

            if (!hasValidPoint) {
              ctx.moveTo(x, y);
              hasValidPoint = true;
            } else {
              ctx.lineTo(x, y);
            }
          } catch {
            // 单个数据点异常时继续下一个
            continue;
          }
        }

        if (hasValidPoint) {
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } catch {
        console.log('Failed to draw data area');
      }

      // 绘制数据点 - 使用个性化颜色
      try {
        ctx.fillStyle = personalizedColors.primary;
        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2; // 从正上方开始
            const value = safeNumber(radarData[i]?.value, 50, 0, 100);
            const dataRadius = (radius * value) / 100;
            const x = centerX + Math.cos(angle) * dataRadius;
            const y = centerY + Math.sin(angle) * dataRadius;

            // 验证坐标是否有效
            if (!isFinite(x) || !isFinite(y)) continue;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
          } catch {
            // 单个数据点绘制失败时继续下一个
            continue;
          }
        }
      } catch {
        console.log('Failed to draw data points');
      }
    } catch (error) {
      console.log('Canvas rendering error:', error);
      // 🆕 Canvas 渲染失败时的错误处理
      if (error instanceof Error && error.message.includes('out of memory')) {
        console.log(
          'Canvas out of memory error detected, reducing canvas size'
        );
        // 尝试使用更小的画布尺寸
        const fallbackSize = calculateSafeCanvasSize(200, 150);
        setCanvasSize(fallbackSize);
      }
    }
  }, [radarData, theme, isLoading, personalizedColors, canvasSize]);

  // 组件卸载时清理Canvas上下文
  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        releaseCanvasContext(canvasRef.current, '2d');
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className='p-3 flex flex-col items-center justify-center min-w-[360px] min-h-[240px] gap-2 theme-bg-secondary rounded-lg'>
        <div
          className='w-5 h-5 border-2 rounded-full animate-spin'
          style={{
            borderColor: `${personalizedColors.secondary}`,
            borderTopColor: personalizedColors.primary,
          }}
        />
        <p className='text-xs theme-text-secondary'>{t('loading')}</p>
      </div>
    );
  }

  if (!abilities || abilities.length === 0) {
    return null; // 数据为空时不展示
  }

  return (
    <div
      className='px-3 pt-1 pb-3 min-w-[360px] theme-bg-secondary rounded-lg relative'
      data-theme={theme}
    >
      {/* 🆕 用户信息头部 */}
      <div className='flex items-center gap-3 pb-1 border-b theme-border'>
        {/* 头像区域 */}
        <div className='relative'>
          {domUserInfoLoading ? (
            // 🆕 加载占位符
            <div className='w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse flex items-center justify-center'>
              <div className='w-5 h-5 text-gray-400'>
                <svg viewBox='0 0 24 24' fill='currentColor'>
                  <path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' />
                </svg>
              </div>
            </div>
          ) : domUserInfo?.avatar ? (
            <img
              src={domUserInfo.avatar}
              alt={domUserInfo.name}
              className='w-10 h-10 rounded-full border-2 theme-border'
              onError={(e) => {
                // 头像加载失败时隐藏
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            // 🆕 默认头像（首字母）
            <div className='w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center border-2 theme-border'>
              <span className='text-white font-medium text-sm'>
                {/* 🔧 修复 textContent 为 null 的问题 - 安全获取首字母 */}
                {domUserInfo?.name
                  ? domUserInfo.name.charAt(0).toUpperCase()
                  : '?'}
              </span>
            </div>
          )}
        </div>

        {/* 🆕 用户信息 - 显示name而不是"KOL能力模型" */}
        <div className='flex-1'>
          {domUserInfoLoading ? (
            // 🆕 文字加载占位符
            <div className='space-y-1'>
              <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20'></div>
              <div className='h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16'></div>
            </div>
          ) : (
            <>
              <h3 className='text-sm font-medium theme-text-primary leading-tight'>
                {domUserInfo?.name || 'Unknown User'}
              </h3>
              <p className='text-xs theme-text-secondary leading-tight'>
                @{domUserInfo?.username || 'unknown'}
              </p>
            </>
          )}
        </div>

        {/* 功能标题移到右侧 */}
        <div className='text-right'>
          <h3 className='text-xs font-medium theme-text-primary'>
            {t('kolAbilityModel')}
          </h3>
        </div>
      </div>

      {/* 🔧 雷达图容器 - 动态宽度，固定高度260 */}
      <div
        ref={containerRef}
        className='w-full h-[245px] flex justify-center items-center py-2'
      >
        <canvas
          ref={canvasRef}
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
          }}
        />
      </div>

      {/* 能力总结区域 */}
      {summary && (
        <div className='pt-2 pb-2 border-t theme-border'>
          <div className='flex items-start gap-2'>
            <div
              className='w-1 h-4 rounded-full flex-shrink-0 mt-0.5'
              style={{ backgroundColor: personalizedColors.primary }}
            />
            <div className='flex-1'>
              <h4 className='text-xs font-medium theme-text-primary mb-1'>
                {t('abilityAnalysis')}
              </h4>
              <p className='text-xs theme-text-secondary leading-relaxed'>
                {summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 整个弹框右下角水印 - 添加可点击链接 */}
      <div className='absolute bottom-1 right-3 text-[9px] z-50 theme-text-secondary opacity-60 leading-tight'>
        {watermarkContent}
      </div>
    </div>
  );
}

export default React.memo(KolAbilityRadar);
