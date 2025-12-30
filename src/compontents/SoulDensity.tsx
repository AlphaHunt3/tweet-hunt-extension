import React, { useMemo, useRef, useEffect, useState } from 'react';
import { User, FileText, BarChart3, Users, Trophy, Info } from 'lucide-react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { SoulDensityData, NewTwitterUserData } from '~types';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { safeNumber, safeString } from '~utils/dataValidation.ts';
import { generateScoreBasedColor } from '~utils/colorGenerator.ts';
import {
  getCanvasContext,
  releaseCanvasContext,
} from '~utils/canvasContextManager';

interface SoulDensityProps {
  data?: SoulDensityData;
  isLoading?: boolean;
  userId: string;
  newTwitterData?: NewTwitterUserData | null;
  loadingTwInfo?: boolean;
}

// 🆕 Canvas 安全配置
const CANVAS_CONFIG = {
  MAX_WIDTH: 800,
  MAX_HEIGHT: 400,
  MIN_WIDTH: 300,
  MIN_HEIGHT: 200,
  DEFAULT_WIDTH: 360,
  DEFAULT_HEIGHT: 260,
  MAX_DEVICE_PIXEL_RATIO: 2,
  MAX_CANVAS_AREA: 320000,
};

// 🆕 安全的画布尺寸计算
const calculateSafeCanvasSize = (
  requestedWidth: number,
  requestedHeight: number
) => {
  try {
    let safeWidth = Math.max(
      CANVAS_CONFIG.MIN_WIDTH,
      Math.min(requestedWidth, CANVAS_CONFIG.MAX_WIDTH)
    );
    let safeHeight = Math.max(
      CANVAS_CONFIG.MIN_HEIGHT,
      Math.min(requestedHeight, CANVAS_CONFIG.MAX_HEIGHT)
    );

    const totalArea = safeWidth * safeHeight;
    if (totalArea > CANVAS_CONFIG.MAX_CANVAS_AREA) {
      const scale = Math.sqrt(CANVAS_CONFIG.MAX_CANVAS_AREA / totalArea);
      safeWidth = Math.floor(safeWidth * scale);
      safeHeight = Math.floor(safeHeight * scale);
    }

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

function SoulDensity({
  data,
  isLoading,
  userId,
  newTwitterData,
  loadingTwInfo,
}: SoulDensityProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const { t, lang } = useI18n();
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
  } = usePlacementTracking();
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

  // 生成五边形雷达图数据
  const radarData = useMemo(() => {
    try {
      if (!data) return [];

      return [
        {
          ability: t('profileAnalysis'), // 账户信息
          value: safeNumber(data.profile_analysis, 50, 0, 100),
          description: t('accountAnalysisInfo'), // 账号Profile信息是否真实，是否有广告
        },
        {
          ability: t('contentAnalysis'), // 内容
          value: safeNumber(data.content_analysis, 50, 0, 100),
          description: t('contentAnalysisInfo'), // 是否原创，是否由AI生产，是否有广告和嘴撸
        },
        {
          ability: t('engagementAnalysis'), // 互动数据
          value: safeNumber(data.engagement_analysis, 50, 0, 100),
          description: t('engagementAnalysisInfo'), // 是否存在刷量行为
        },
        {
          ability: t('xhuntAnalysis'), // Xhunt排名
          value: safeNumber(data.xhunt_analysis, 50, 0, 100),
          description: t('xhuntAnalysisInfo'), // 影响力数据
        },
        {
          ability: t('kolInteraction'), // KOL互动
          value: safeNumber(data.kol_interaction, 50, 0, 100),
          description: t('kolInteractionInfo'), // 和其他KOL的互动和社交图谱
        },
      ];
    } catch {
      return [];
    }
  }, [data, t]);

  // 生成个性化颜色 - 基于分数动态生成
  const personalizedColors = useMemo(() => {
    if (!data) {
      return {
        primary: '#6b7280', // 默认灰色
        secondary: 'rgba(107, 114, 128, 0.15)',
      };
    }
    return generateScoreBasedColor(data.score);
  }, [data?.score]);

  // 🆕 处理水印文本
  const watermarkContent = useMemo(() => {
    const watermarkText = t('aiAnalysisWatermark');

    const parts = watermarkText.split('@XHunt_ai');

    if (parts.length === 2) {
      return (
        <>
          {parts[0]}
          <a
            href='https://x.com/xhunt_ai'
            target='_blank'
            rel='noopener noreferrer'
            className={`transition-colors cursor-pointer`}
            style={{ color: personalizedColors.primary, opacity: 0.75 }}
            onClick={(e) => e.stopPropagation()}
          >
            @XHunt_ai
          </a>
          {parts[1]}
        </>
      );
    }

    return watermarkText;
  }, [t]);

  // Canvas绘制逻辑
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

      const devicePixelRatio = getSafeDevicePixelRatio();
      const safeSize = calculateSafeCanvasSize(
        canvasSize.width,
        canvasSize.height
      );
      const displayWidth = safeSize.width;
      const displayHeight = safeSize.height;

      const canvasArea =
        displayWidth * displayHeight * devicePixelRatio * devicePixelRatio;
      if (canvasArea > CANVAS_CONFIG.MAX_CANVAS_AREA * 4) {
        console.log(
          'Canvas area too large, skipping render to prevent memory overflow'
        );
        return;
      }

      try {
        canvas.width = displayWidth * devicePixelRatio;
        canvas.height = displayHeight * devicePixelRatio;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        ctx.scale(devicePixelRatio, devicePixelRatio);
      } catch (canvasError) {
        console.log('Failed to set canvas size, using fallback:', canvasError);
        const fallbackSize = calculateSafeCanvasSize(300, 200);
        canvas.width = fallbackSize.width;
        canvas.height = fallbackSize.height;
        canvas.style.width = fallbackSize.width + 'px';
        canvas.style.height = fallbackSize.height + 'px';
      }

      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const maxRadius = Math.min(centerX, centerY) - 60;
      const radius = Math.max(80, maxRadius);
      const angleStep = (2 * Math.PI) / radarData.length; // 五边形

      // 清空画布
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.fillStyle = 'rgba(255,255,255,0)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // 绘制五边形网格
      try {
        ctx.strokeStyle = theme === 'dark' ? '#374151' : '#e5e7eb';
        ctx.lineWidth = safeNumber(1, 1, 0.5, 3);

        for (let i = 1; i <= 5; i++) {
          try {
            const currentRadius = (radius * i) / 5;
            ctx.beginPath();

            for (let j = 0; j < radarData.length; j++) {
              try {
                const angle = j * angleStep - Math.PI / 2;
                const x = centerX + Math.cos(angle) * currentRadius;
                const y = centerY + Math.sin(angle) * currentRadius;

                if (!isFinite(x) || !isFinite(y)) continue;

                if (j === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              } catch {
                continue;
              }
            }
            ctx.closePath();
            ctx.stroke();
          } catch {
            continue;
          }
        }
      } catch {
        console.log('Failed to draw grid lines');
      }

      // 绘制轴线
      try {
        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            if (!isFinite(x) || !isFinite(y)) continue;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
          } catch {
            continue;
          }
        }
      } catch {
        console.log('Failed to draw axis lines');
      }

      // 绘制标签
      try {
        ctx.fillStyle = theme === 'dark' ? '#a0aec0' : '#4a5568';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2;
            const labelRadius = radius + (i === 0 ? 22 : 40);

            const labelX = centerX + Math.cos(angle) * labelRadius;
            const labelY = centerY + Math.sin(angle) * labelRadius;

            if (!isFinite(labelX) || !isFinite(labelY)) continue;

            const labelText = safeString(
              radarData[i]?.ability,
              `Label${i + 1}`
            );
            const displayText =
              labelText.length > 20
                ? labelText.substring(0, 20) + '...'
                : labelText;

            if (displayText && typeof displayText === 'string') {
              ctx.fillText(displayText, labelX, labelY);
            }
          } catch {
            continue;
          }
        }
      } catch {
        console.log('Failed to draw labels');
      }

      // 绘制分数
      try {
        ctx.fillStyle = personalizedColors.primary;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2;
            const value = safeNumber(radarData[i]?.value, 50, 0, 100);
            const dataRadius = (radius * value) / 100;

            // 动态计算分数位置，避免与标签重叠
            const minScoreRadius = 25; // 最小距离中心25px
            const maxScoreRadius = radius + 25; // 最大不超过标签内侧
            const scoreRadius = Math.min(
              Math.max(dataRadius + 15, minScoreRadius),
              maxScoreRadius
            );

            const scoreX = centerX + Math.cos(angle) * scoreRadius;
            const scoreY = centerY + Math.sin(angle) * scoreRadius;

            if (!isFinite(scoreX) || !isFinite(scoreY)) continue;

            const scoreText = value != null ? value.toString() : '0';
            if (scoreText && typeof scoreText === 'string') {
              ctx.fillText(scoreText, scoreX, scoreY);
            }
          } catch {
            continue;
          }
        }
      } catch {
        console.log('Failed to draw scores');
      }

      // 绘制数据区域
      try {
        ctx.fillStyle = personalizedColors.secondary;
        ctx.strokeStyle = personalizedColors.primary;
        ctx.lineWidth = safeNumber(2.5, 2.5, 1, 5);

        ctx.beginPath();
        let hasValidPoint = false;

        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2;
            const value = safeNumber(radarData[i]?.value, 50, 0, 100);
            const dataRadius = (radius * value) / 100;
            const x = centerX + Math.cos(angle) * dataRadius;
            const y = centerY + Math.sin(angle) * dataRadius;

            if (!isFinite(x) || !isFinite(y)) continue;

            if (!hasValidPoint) {
              ctx.moveTo(x, y);
              hasValidPoint = true;
            } else {
              ctx.lineTo(x, y);
            }
          } catch {
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

      // 绘制数据点
      try {
        ctx.fillStyle = personalizedColors.primary;
        for (let i = 0; i < radarData.length; i++) {
          try {
            const angle = i * angleStep - Math.PI / 2;
            const value = safeNumber(radarData[i]?.value, 50, 0, 100);
            const dataRadius = (radius * value) / 100;
            const x = centerX + Math.cos(angle) * dataRadius;
            const y = centerY + Math.sin(angle) * dataRadius;

            if (!isFinite(x) || !isFinite(y)) continue;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
          } catch {
            continue;
          }
        }
      } catch {
        console.log('Failed to draw data points');
      }
    } catch (error) {
      console.log('Canvas rendering error:', error);
      if (error instanceof Error && error.message.includes('out of memory')) {
        console.log(
          'Canvas out of memory error detected, reducing canvas size'
        );
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

  if (!data) {
    return null;
  }

  return (
    <div
      className='px-3 pt-1 pb-3 min-w-[360px] theme-bg-secondary rounded-lg relative'
      data-theme={theme}
    >
      {/* 用户信息头部 */}
      <div className='flex items-center gap-3 pb-1 border-b theme-border'>
        {/* 头像区域 */}
        <div className='relative'>
          {domUserInfoLoading ? (
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
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className='w-10 h-10 rounded-full flex items-center justify-center border-2 theme-border'>
              <span className='text-white font-medium text-sm'>
                {domUserInfo?.name
                  ? domUserInfo.name.charAt(0).toUpperCase()
                  : '?'}
              </span>
            </div>
          )}
        </div>

        {/* 用户信息 */}
        <div className='flex-1'>
          {domUserInfoLoading ? (
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

        {/* 功能标题和分数 */}
        <div className='text-right'>
          <h3 className='text-xs font-medium theme-text-primary'>
            {t('soulIndex')}
          </h3>
          <div className='flex items-center gap-1 justify-end'>
            <span
              className={`text-lg font-bold`}
              style={{
                color: personalizedColors.primary,
              }}
            >
              {data.score}
            </span>
            <span className='text-xs theme-text-secondary'>{t('points')}</span>
          </div>
        </div>
      </div>

      {/* 五边形雷达图容器 */}
      <div
        ref={containerRef}
        className='w-full h-[245px] flex justify-center items-center py-2 relative'
      >
        <canvas
          ref={canvasRef}
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
          }}
        />

        {/* 维度文字悬浮提示 */}
        {radarData.map((item, index) => {
          const angle =
            (index * (2 * Math.PI)) / radarData.length - Math.PI / 2;
          // 使用与Canvas绘制相同的半径计算逻辑
          const radius = Math.min(canvasSize.width, canvasSize.height) / 2 - 60;
          const labelRadius = radius + (index === 0 ? 22 : 40);
          const labelX = canvasSize.width / 2 + Math.cos(angle) * labelRadius;
          const labelY = canvasSize.height / 2 + Math.sin(angle) * labelRadius;

          return (
            <div
              key={index}
              className='absolute group'
              style={{
                left: `${labelX}px`,
                top: `${labelY}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className='relative cursor-help'>
                {/* 透明的悬浮区域，覆盖文字 */}
                <div className='w-16 h-8 absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2' />

                {/* 悬浮提示 */}
                <div className='absolute whitespace-normal min-w-44 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 theme-bg-secondary text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 theme-text-primary theme-border border max-w-[200px] text-center leading-relaxed'>
                  <div className='font-medium mb-1'>{item.ability}</div>
                  <div className='text-[10px] theme-text-secondary'>
                    {item.description || '维度说明'}
                  </div>
                  <div
                    className='absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent'
                    style={{
                      borderTopColor: 'var(--bg-secondary)',
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 分析原因区域 */}
      {(data.reason || data.reason_en) && (
        <div className='pt-2 pb-2 border-t theme-border'>
          <div className='flex items-start gap-2'>
            <div
              className='w-1 h-4 rounded-full flex-shrink-0 mt-0.5'
              style={{ backgroundColor: personalizedColors.primary }}
            />
            <div className='flex-1'>
              <h4 className='text-xs font-medium theme-text-primary mb-1'>
                {t('analysisReason')}
              </h4>
              <p className='text-xs theme-text-secondary leading-relaxed'>
                {lang === 'en' && data.reason_en ? data.reason_en : data.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 右下角水印 */}
      <div className='absolute bottom-1 right-3 text-[9px] z-50 theme-text-secondary opacity-60 leading-tight'>
        {watermarkContent}
      </div>
    </div>
  );
}

export default React.memo(SoulDensity);
