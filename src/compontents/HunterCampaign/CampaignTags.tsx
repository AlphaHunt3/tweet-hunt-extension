import React, { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileText, Gift, Trophy, Users } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { HunterCampaignConfig, CampaignTag } from './types';
import { useCampaignLabels } from './useCampaignLabels';
import { formatNumber } from './utils';

interface CampaignTagsProps {
  campaignConfig?: HunterCampaignConfig;
  showBorder?: boolean;
}

// 10种颜色系配置
const COLOR_SCHEMES: Record<CampaignTag['colorScheme'], {
  border: string;
  bg: string;
  text: string;
  darkText: string;
}> = {
  green: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    darkText: 'dark:text-emerald-200',
  },
  purple: {
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    text: 'text-violet-700',
    darkText: 'dark:text-violet-200',
  },
  yellow: {
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-700',
    darkText: 'dark:text-yellow-200',
  },
  blue: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-200',
  },
  gray: {
    border: 'border-gray-500/30',
    bg: 'bg-gray-500/10',
    text: 'text-gray-700',
    darkText: 'dark:text-gray-200',
  },
  gold: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-200',
  },
  red: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    text: 'text-red-700',
    darkText: 'dark:text-red-200',
  },
  pink: {
    border: 'border-pink-500/30',
    bg: 'bg-pink-500/10',
    text: 'text-pink-700',
    darkText: 'dark:text-pink-200',
  },
  cyan: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-700',
    darkText: 'dark:text-cyan-200',
  },
  orange: {
    border: 'border-orange-500/30',
    bg: 'bg-orange-500/10',
    text: 'text-orange-700',
    darkText: 'dark:text-orange-200',
  },
};

// 动态图标缓存
const iconCache: Map<string, LucideIcon | null> = new Map();

/**
 * 动态加载 Lucide 图标
 */
function useLucideIcon(iconName: string): LucideIcon | null {
  const [Icon, setIcon] = useState<LucideIcon | null>(iconCache.get(iconName) ?? null);

  useEffect(() => {
    if (iconCache.has(iconName)) {
      setIcon(iconCache.get(iconName) ?? null);
      return;
    }

    let cancelled = false;

    const loadIcon = async () => {
      try {
        // 动态导入 lucide-react
        const lucide = await import('lucide-react');
        if (cancelled) return;

        const iconComponent = (lucide as Record<string, unknown>)[iconName] as LucideIcon | undefined;

        if (iconComponent) {
          iconCache.set(iconName, iconComponent);
          setIcon(iconComponent);
        } else {
          // 兜底：使用 Gift 图标
          console.warn(`[CampaignTags] Icon "${iconName}" not found in lucide-react, falling back to Gift`);
          iconCache.set(iconName, Gift);
          setIcon(Gift);
        }
      } catch (error) {
        console.error(`[CampaignTags] Failed to load icon "${iconName}":`, error);
        if (!cancelled) {
          iconCache.set(iconName, Gift);
          setIcon(Gift);
        }
      }
    };

    loadIcon();

    return () => {
      cancelled = true;
    };
  }, [iconName]);

  return Icon;
}

/**
 * 自定义标签渲染组件
 */
function CustomTagItem({ tag, lang }: { tag: CampaignTag; lang: string }) {
  const Icon = useLucideIcon(tag.icon);
  const colors = COLOR_SCHEMES[tag.colorScheme] ?? COLOR_SCHEMES.blue;
  const label = lang === 'zh' ? tag.label : tag.label_en;
  const hoverTips = lang === 'zh' ? tag.hoverTips : tag.hoverTips_en;

  if (!Icon) {
    return null;
  }

  return (
    <div className='relative inline-flex group'>
      <div className={`inline-flex items-center gap-1 px-1 py-[2px] rounded-full border ${colors.border} ${colors.bg}`}>
        <span className={`cursor-pointer inline-flex items-center gap-0.5 leading-none text-[10px] font-medium ${colors.text} ${colors.darkText}`}>
          <Icon className='w-3 h-3 shrink-0' strokeWidth={2.3} />
          {label}
        </span>
      </div>
      {hoverTips && (
        <div className='absolute left-0 top-full mt-1 z-20 w-max max-w-[260px] whitespace-pre-line break-words px-2 py-1 rounded theme-bg-secondary theme-text-primary text-[10px] shadow theme-border border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition'>
          {hoverTips}
        </div>
      )}
    </div>
  );
}

/**
 * 活动标签组件 - 显示奖励分配方式、报名要求和获奖人数
 * 支持自定义标签配置，配置后优先使用自定义标签
 */
export function CampaignTags({
  campaignConfig,
  showBorder = false,
}: CampaignTagsProps) {
  const { lang } = useI18n();
  const { rewardDistributionLabel, requirementTagLabel, winnersTagLabel } =
    useCampaignLabels(campaignConfig);

  // 格式化金额显示（仅数字，如：2K）
  const formatRewardAmount = (amount?: number): string => {
    if (!amount) return '';
    return formatNumber(amount, 'en-US');
  };

  // 标签内显示的金额（带「奖池」前缀，如：奖池2K）
  const formatRewardAmountWithPoolLabel = (amount?: number): string => {
    const num = formatRewardAmount(amount);
    if (!num) return '';
    const poolLabel = lang === 'zh' ? '奖池' : 'Prize pool ';
    return `${poolLabel}${num}`;
  };

  // 判断是否开启 POW 排行榜
  const hasPowLeaderboard = campaignConfig?.enablePowLeaderboard === true;

  // 计算总奖池（原奖池 + POW 奖池）
  const getTotalRewardAmount = (): number => {
    const baseAmount = campaignConfig?.rewardAmount || 0;
    const powAmount = campaignConfig?.powAmount || 0;
    return baseAmount + powAmount;
  };

  // 获取 POW 奖池文本
  const getPowPoolText = (): string => {
    const amt = campaignConfig?.powAmount;
    const unit = campaignConfig?.powUnit || campaignConfig?.rewardUnit;
    if (typeof amt === 'number' && Number.isFinite(amt) && amt > 0) {
      const formatted = formatRewardAmount(amt);
      const unitText = unit ? `(${unit})` : '';
      return lang === 'zh'
        ? `POW 奖池：${formatted}${unitText}`
        : `POW Prize pool: ${formatted}${unitText}`;
    }
    return '';
  };

  // POW 获奖人数文本
  const getPowWinnerCountText = (): string => {
    const count = campaignConfig?.powWinnerCount;
    if (typeof count === 'number' && count > 0) {
      return lang === 'zh'
        ? `POW 获奖名额：${count.toLocaleString()}人`
        : `POW Winners: ${count.toLocaleString()}`;
    }
    return '';
  };

  // 奖池文本（奖励分配）- 在双榜模式下显示为 POI 奖池
  const getRewardPoolText = (isDualMode = false): string => {
    const amt = campaignConfig?.rewardAmount;
    const unit = campaignConfig?.rewardUnit;
    if (typeof amt === 'number' && Number.isFinite(amt) && amt > 0) {
      const formatted = formatRewardAmount(amt);
      const unitText = unit ? `(${unit})` : '';
      if (isDualMode) {
        return lang === 'zh'
          ? `POI 奖池：${formatted}${unitText}`
          : `POI Prize pool: ${formatted}${unitText}`;
      }
      return lang === 'zh'
        ? `奖池：${formatted}${unitText}`
        : `Prize pool: ${formatted}${unitText}`;
    }
    return '';
  };

  // 奖池文本（征文大赛）
  const getEssayContestPoolText = (): string => {
    const amt = campaignConfig?.essayContestAmount;
    // 优先使用 essayContestUnit，未设置时回退到 rewardUnit
    const unit = campaignConfig?.essayContestUnit ?? campaignConfig?.rewardUnit;
    if (typeof amt === 'number' && Number.isFinite(amt) && amt > 0) {
      const formatted = formatRewardAmount(amt);
      const unitText = unit ? `(${unit})` : '';
      return lang === 'zh'
        ? `奖池：${formatted}${unitText}`
        : `Prize pool: ${formatted}${unitText}`;
    }
    return '';
  };

  // 判断是否显示征文大赛标签
  const showEssayContest = campaignConfig?.enableEssayContest === true;

  // 判断是否使用自定义标签
  const hasCustomTags = campaignConfig?.tags && campaignConfig.tags.length > 0;

  // 判断是否有内容显示（自定义标签模式或自动模式）
  const hasContent = hasCustomTags ||
    rewardDistributionLabel ||
    requirementTagLabel ||
    (!showEssayContest && winnersTagLabel) ||
    (showEssayContest);

  if (!campaignConfig || !hasContent) {
    return null;
  }

  // rewardParticipantCount：用于奖励分配（均分/Mindshare）tooltip 的获奖名额
  const getRewardWinnerCountText = (isDualMode = false): string => {
    const count = campaignConfig.rewardParticipantCount;
    if (typeof count === 'number' && count > 0) {
      if (isDualMode) {
        return lang === 'zh'
          ? `POI 获奖名额：${count.toLocaleString()}人`
          : `POI Winners: ${count.toLocaleString()}`;
      }
      return lang === 'zh'
        ? `获奖名额：${count.toLocaleString()}人`
        : `Winners: ${count.toLocaleString()}`;
    }
    return '';
  };

  // essayContestWinnerCount：用于征文大赛 tooltip 的获奖名额（按"篇"）
  const getEssayContestWinnerCountText = (): string => {
    const count = campaignConfig.essayContestWinnerCount;
    if (typeof count === 'number' && count > 0) {
      return lang === 'zh'
        ? `获奖名额：${count.toLocaleString()}篇`
        : `Winners: ${count.toLocaleString()} articles`;
    }
    return '';
  };

  const rewardWinnerCountText = getRewardWinnerCountText();
  const essayContestWinnerCountText = getEssayContestWinnerCountText();
  const rewardPoolText = getRewardPoolText();
  const essayContestPoolText = getEssayContestPoolText();
  const powPoolText = getPowPoolText();
  const powWinnerCountText = getPowWinnerCountText();
  const totalRewardAmount = getTotalRewardAmount();

  // ===== 自定义标签模式 =====
  if (hasCustomTags) {
    return (
      <div
        className={`flex flex-wrap items-center gap-1 ${showBorder ? 'border-b border-dashed theme-border-soft pb-1' : ''
          }`}
      >
        {campaignConfig.tags!.map((tag, index) => (
          <CustomTagItem key={index} tag={tag} lang={lang} />
        ))}
      </div>
    );
  }

  // ===== 自动模式（原有逻辑）=====
  const { t } = useI18n();
  const essayContestLabel = showEssayContest
    ? t('mantleHunterTabArticleContest')
    : '';

  const getRequirementRankText = (): string => {
    const threshold = campaignConfig.threshold;
    const includeCreator = campaignConfig.includeCreator === true;
    const hasThreshold =
      typeof threshold === 'number' && Number.isFinite(threshold) && threshold > 0;
    if (!hasThreshold) return '';
    const formattedThreshold = formatNumber(threshold, 'en-US');
    const key = includeCreator
      ? 'hunterRequirementGlobalRankTopOrCreator'
      : 'hunterRequirementGlobalRankTop';
    return t(key).replace('{threshold}', formattedThreshold);
  };

  const getRequirementCreatorText = (): string => {
    const includeCreator = campaignConfig.includeCreator;
    if (typeof includeCreator !== 'boolean') return '';
    if (!includeCreator) return '';
    return `${t('hunterRewardIncludeCreator')}: ${t('hunterRewardIncludeCreatorYes')}`;
  };

  const requirementRankText = getRequirementRankText();
  const requirementCreatorText = getRequirementCreatorText();
  const hasThreshold =
    typeof campaignConfig?.threshold === 'number' &&
    Number.isFinite(campaignConfig.threshold) &&
    campaignConfig.threshold > 0;
  const showCreatorLineSeparately =
    requirementCreatorText && !(hasThreshold && campaignConfig?.includeCreator === true);

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${showBorder ? 'border-b border-dashed theme-border-soft pb-1' : ''
        }`}
    >
      {rewardDistributionLabel && (
        <div className='relative inline-flex group'>
          <div className='inline-flex items-center gap-1 px-1 py-[2px] rounded-full border border-emerald-500/30 bg-emerald-500/10'>
            <span
              className='cursor-pointer inline-flex items-center gap-0.5 leading-none text-[10px] font-medium text-emerald-700 dark:text-emerald-200'
              aria-label={t('hunterRewardDistributionType')}
            >
              <Gift
                className='w-3 h-3 shrink-0'
                strokeWidth={2.3}
              />
              {hasPowLeaderboard
                ? lang === 'zh'
                  ? '双榜奖池'
                  : 'Dual Leaderboard'
                : rewardDistributionLabel}
              {(hasPowLeaderboard ? totalRewardAmount : campaignConfig.rewardAmount) && (
                <span className='-ml-0.5 -mr-0.5 inline-block'>
                  （{formatRewardAmountWithPoolLabel(hasPowLeaderboard ? totalRewardAmount : campaignConfig.rewardAmount)}）
                </span>
              )}
            </span>
          </div>
          <div className='absolute left-0 top-full mt-1 z-20 w-max max-w-[260px] whitespace-normal break-words px-2 py-1 rounded theme-bg-secondary theme-text-primary text-[10px] shadow theme-border border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition'>
            {hasPowLeaderboard ? (
              <>
                {lang === 'zh' ? '双榜奖池活动' : 'Dual Leaderboard Event'}
                <div className='mt-1'>{getRewardPoolText(true)}</div>
                <div className='mt-1'>{getRewardWinnerCountText(true)}</div>
                <div className='mt-1'>{powPoolText}</div>
                <div className='mt-1'>{powWinnerCountText}</div>
              </>
            ) : (
              <>
                {campaignConfig.rewardDistributionType === 'equal'
                  ? t('e2eRewardModeEqualTooltip')
                  : campaignConfig.rewardDistributionType === 'mindshare'
                    ? t('e2eRewardModeMindshareTooltip')
                    : t('hunterRewardDistributionType')}
                {rewardPoolText && (
                  <div className='mt-1'>{rewardPoolText}</div>
                )}
                {rewardWinnerCountText && (
                  <div className='mt-1'>{rewardWinnerCountText}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 如果征文大赛开启，显示征文大赛标签 */}
      {showEssayContest && essayContestLabel && (
        <div className='relative inline-flex group'>
          <div className='inline-flex items-center gap-1 px-1 py-[2px] rounded-full border border-violet-500/30 bg-violet-500/10'>
            <span
              className='cursor-pointer inline-flex items-center gap-0.5 leading-none text-[10px] font-medium text-violet-700 dark:text-violet-200'
              aria-label={essayContestLabel}
            >
              <FileText
                className='w-3 h-3 shrink-0'
                strokeWidth={2.3}
              />
              {essayContestLabel}
              {campaignConfig.essayContestAmount && (
                <span className='-ml-0.5 -mr-0.5 inline-block'>
                  （{formatRewardAmountWithPoolLabel(campaignConfig.essayContestAmount)}）
                </span>
              )}
            </span>
          </div>
          <div className='absolute left-0 top-full mt-1 z-20 w-max max-w-[260px] whitespace-normal break-words px-2 py-1 rounded theme-bg-secondary theme-text-primary text-[10px] shadow theme-border border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition'>
            {t('essayContestTooltip')}
            {essayContestPoolText && (
              <div className='mt-1'>{essayContestPoolText}</div>
            )}
            {essayContestWinnerCountText && (
              <div className='mt-1'>{essayContestWinnerCountText}</div>
            )}
          </div>
        </div>
      )}

      {requirementTagLabel && (
        <div className='relative inline-flex group'>
          <div className='inline-flex items-center gap-1 px-1 py-[2px] rounded-full border border-amber-500/30 bg-amber-500/10'>
            <span
              className='cursor-pointer inline-flex items-center gap-0.5 leading-none text-[10px] font-medium text-amber-700 dark:text-amber-100'
              aria-label={t('requirements')}
            >
              <Trophy
                className='w-3 h-3 shrink-0'
                strokeWidth={2.3}
              />
              {requirementTagLabel}
            </span>
          </div>
          <div className='absolute left-0 top-full mt-1 z-20 w-max max-w-[260px] whitespace-normal break-words px-2 py-1 rounded theme-bg-secondary theme-text-primary text-[10px] shadow theme-border border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition'>
            {requirementRankText
              ? requirementRankText
              : `${t('requirements')}: ${requirementTagLabel}`}
            {showCreatorLineSeparately && (
              <div className='mt-1'>{requirementCreatorText}</div>
            )}
          </div>
        </div>
      )}

      {/* 如果征文大赛未开启，显示获奖人数标签 */}
      {!showEssayContest && winnersTagLabel && (
        <div className='relative inline-flex group'>
          <div className='inline-flex items-center gap-1 px-1 py-[2px] rounded-full border border-sky-500/30 bg-sky-500/10'>
            <span
              className='cursor-pointer inline-flex items-center gap-0.5 leading-none text-[10px] font-medium text-sky-700 dark:text-sky-100'
              aria-label={t('hunterRewardParticipantCount')}
            >
              <Users
                className='w-3 h-3 shrink-0'
                strokeWidth={2.3}
              />
              {winnersTagLabel}
            </span>
          </div>
          <div className='absolute left-0 top-full mt-1 z-20 w-max max-w-[260px] whitespace-normal break-words px-2 py-1 rounded theme-bg-secondary theme-text-primary text-[10px] shadow theme-border border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition'>
            {t('hunterRewardParticipantCount')}: {winnersTagLabel}
          </div>
        </div>
      )}
    </div>
  );
}
