import React, { useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n';
import type { HotVoteOption, HotVoteResults } from './types';

interface VoteResultPanelProps {
  options: HotVoteOption[];
  votedOptionId: string | null;
  results: HotVoteResults | null;
  isEnded?: boolean;
  onOptionClick?: (optionId: string) => void;
  onRetryFetchResults?: () => void;
  onOpenCommentModal?: () => void;
}

/** 剥离“支持”前缀，提取纯名称 */
function cleanEntityName(name: string, supportPrefix: string = '支持'): string {
  if (!name) return '';
  const trimmed = supportPrefix.trim();
  let cleaned = name.trim();
  if (cleaned.toLowerCase().startsWith(trimmed.toLowerCase())) {
    cleaned = cleaned.slice(trimmed.length).trim();
  }
  return cleaned || name;
}

const ResultMiniAvatar: React.FC<{
  name: string;
  avatar?: string;
  supportPrefix: string;
}> = React.memo(({ name, avatar, supportPrefix }) => {
  const [hasError, setHasError] = useState(false);
  const pureName = cleanEntityName(name, supportPrefix);
  const initial = (pureName || '?').slice(0, 1).toUpperCase();

  return (
    <div className='w-[18px] h-[18px] rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-[9.5px] bg-slate-200/80 dark:bg-white/10 theme-text-secondary select-none border border-black/[0.06] dark:border-white/10'>
      {avatar && !hasError ? (
        <img
          src={avatar}
          alt={pureName}
          className='w-full h-full object-cover rounded-full'
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
});

/**
 * 根据投票百分比 (0-100) 动态计算进度条深浅：
 * 百分比越高，颜色越深、越鲜明；百分比越低，颜色越浅、越柔和
 */
function getProgressFillStyle(
  percentageNum: number,
  isEnded?: boolean
): React.CSSProperties {
  const ratio = Math.min(1, Math.max(0, percentageNum / 100));
  if (isEnded) {
    // 已结束状态使用微灰低饱和度的柔和填充条，突出静止与结算感
    const alpha = 0.04 + ratio * 0.08;
    const leftAlpha = Math.min(0.14, alpha + 0.02);
    return {
      width: `${percentageNum}%`,
      background: `linear-gradient(to right, rgba(148, 163, 184, ${leftAlpha.toFixed(3)}), rgba(148, 163, 184, ${alpha.toFixed(3)}))`,
    };
  }
  // 采用清新淡雅的浅蓝色调（Twitter Blue），整体轻盈通透不遮挡文字：0% 约 0.06，100% 约 0.18
  const alpha = 0.06 + ratio * 0.12;
  const leftAlpha = Math.min(0.20, alpha + 0.02);

  return {
    width: `${percentageNum}%`,
    background: `linear-gradient(to right, rgba(29, 155, 240, ${leftAlpha.toFixed(3)}), rgba(29, 155, 240, ${alpha.toFixed(3)}))`,
  };
}

export const VoteResultPanel: React.FC<VoteResultPanelProps> = React.memo(
  ({
    options,
    votedOptionId,
    results,
    isEnded = false,
    onOptionClick,
    onRetryFetchResults,
  }) => {
    const { t } = useI18n();
    const supportPrefix = t('hotVoteSupportPrefix', '支持');

    // 选项名由后端完整下发，前端只做空值兜底，不再自行拼接前缀
    const getOptionDisplayName = (name?: string, isGua?: boolean): string => {
      if (!name) return isGua ? t('hotVoteGua', '吃瓜') : '';
      return name;
    };

    const isSingleOption = options.length === 1;

    return (
      <div className='flex flex-col gap-1.5'>
        {/* 投票结果统计区域：所有选项一视同仁，与 VoteActionPanel 网格结构、样式完全一致 */}
        {results ? (
          <div
            className={
              isSingleOption
                ? 'grid grid-cols-1 gap-1.5'
                : 'grid grid-cols-2 gap-1.5'
            }
          >
            {options.map((opt, idx) => {
              const isUserChoice = opt.id === votedOptionId;
              const stat = results.distribution[opt.id] || {
                count: 0,
                percentage: '0%',
              };
              const percentageNum = Math.min(
                100,
                Math.max(0, parseInt(stat.percentage, 10) || 0)
              );
              const displayName = getOptionDisplayName(opt.name, opt.isGua);

              // 奇数个选项时，最后一个选项铺满全宽
              const isSpanFull =
                options.length % 2 === 1 && idx === options.length - 1;

              const isClickable = !isUserChoice && Boolean(onOptionClick);

              return (
                <button
                  key={opt.id}
                  type='button'
                  disabled={!isClickable}
                  onClick={isClickable ? () => onOptionClick?.(opt.id) : undefined}
                  title={displayName}
                  className={`${
                    isSpanFull ? 'col-span-2 w-full' : 'col-span-1 w-full min-w-0'
                  } relative overflow-hidden rounded-xl border text-xs transition-all ${
                    isEnded
                      ? 'border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] opacity-80 cursor-default'
                      : isClickable
                        ? 'border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.035] cursor-pointer active:scale-[0.98] hover:bg-slate-100/70 dark:hover:bg-white/[0.06] hover:border-blue-400/50 dark:hover:border-blue-400/50'
                        : 'border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.035] cursor-default'
                  }`}
                >
                  {/* 比例填充背景条：颜色深浅根据投票百分比平滑区分 */}
                  {percentageNum > 0 && (
                    <div
                      className='absolute inset-y-0 left-0 transition-all duration-600 ease-out rounded-l-[11px]'
                      style={getProgressFillStyle(percentageNum, isEnded)}
                    />
                  )}

                  {/* 选项内容与百分比浮层 */}
                  <div className='relative z-10 flex items-center justify-between px-2.5 py-2'>
                    <div className='flex items-center gap-1 min-w-0 flex-1 pr-1'>
                      {/* 用户已选标记 */}
                      {isUserChoice && (
                        <Check
                          className={`w-3.5 h-3.5 stroke-[2.5] shrink-0 ${
                            isEnded
                              ? 'text-slate-400 dark:text-neutral-500'
                              : 'text-blue-500 dark:text-blue-400'
                          }`}
                        />
                      )}

                      {/* 头像 */}
                      {opt.avatar && (
                        <div className={isEnded ? 'opacity-85 grayscale-[20%]' : ''}>
                          <ResultMiniAvatar
                            name={opt.name}
                            avatar={opt.avatar}
                            supportPrefix={supportPrefix}
                          />
                        </div>
                      )}

                      {/* 选项文字 */}
                      <span
                        className={`truncate text-[11.5px] leading-tight font-semibold ${
                          isEnded ? 'theme-text-secondary' : 'theme-text-primary'
                        }`}
                      >
                        {displayName}
                      </span>
                    </div>

                    {/* 百分比数值 */}
                    <span
                      className={`font-mono text-xs shrink-0 select-none ${
                        isEnded
                          ? 'font-semibold text-slate-500 dark:text-neutral-400'
                          : percentageNum > 0
                            ? 'font-bold theme-text-primary'
                            : 'font-medium text-slate-400 dark:text-neutral-500'
                      }`}
                    >
                      {stat.percentage}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className='flex items-center justify-center py-2 text-[11px] theme-text-secondary gap-2'>
            <span>{t('hotVoteResultsLoadFailed', '结果加载失败')}</span>
            {onRetryFetchResults && (
              <button
                type='button'
                onClick={onRetryFetchResults}
                className='inline-flex items-center gap-1 text-blue-400 hover:underline'
              >
                <RotateCcw className='w-3 h-3' />
                <span>{t('hotVoteRetry', '重试')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

export default VoteResultPanel;
