import React from 'react';
import { FileText, Gift, Trophy, Users } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { HunterCampaignConfig } from './types';
import { useCampaignLabels } from './useCampaignLabels';
import { formatNumber } from './utils';

interface CampaignTagsProps {
  campaignConfig?: HunterCampaignConfig;
  showBorder?: boolean;
}

/**
 * 活动标签组件 - 显示奖励分配方式、报名要求和获奖人数
 */
export function CampaignTags({
  campaignConfig,
  showBorder = false,
}: CampaignTagsProps) {
  const { t, lang } = useI18n();
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

  // 奖池文本（奖励分配）
  const getRewardPoolText = (): string => {
    const amt = campaignConfig?.rewardAmount;
    const unit = campaignConfig?.rewardUnit;
    if (typeof amt === 'number' && Number.isFinite(amt) && amt > 0) {
      const formatted = formatRewardAmount(amt);
      const unitText = unit ? `(${unit})` : '';
      return lang === 'zh'
        ? `奖池：${formatted}${unitText}`
        : `Prize pool: ${formatted}${unitText}`;
    }
    return '';
  };

  // 奖池文本（征文大赛）
  const getEssayContestPoolText = (): string => {
    const amt = campaignConfig?.essayContestAmount;
    const unit = campaignConfig?.rewardUnit;
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
  const essayContestLabel = showEssayContest
    ? t('mantleHunterTabArticleContest')
    : '';

  // 判断是否有内容显示
  const hasContent =
    rewardDistributionLabel ||
    requirementTagLabel ||
    (!showEssayContest && winnersTagLabel) ||
    (showEssayContest && essayContestLabel);

  if (!campaignConfig || !hasContent) {
    return null;
  }

  // rewardParticipantCount：用于奖励分配（均分/Mindshare）tooltip 的获奖名额
  const getRewardWinnerCountText = (): string => {
    const count = campaignConfig.rewardParticipantCount;
    if (typeof count === 'number' && count > 0) {
      return lang === 'zh'
        ? `获奖名额：${count.toLocaleString()}人`
        : `Winners: ${count.toLocaleString()}`;
    }
    return '';
  };

  // essayContestWinnerCount：用于征文大赛 tooltip 的获奖名额（按“篇”）
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
              {rewardDistributionLabel}
              {campaignConfig.rewardAmount && (
                <span className='-ml-0.5 -mr-0.5 inline-block'>
                  （{formatRewardAmountWithPoolLabel(campaignConfig.rewardAmount)}）
                </span>
              )}
            </span>
          </div>
          <div className='absolute left-0 top-full mt-1 z-20 w-max max-w-[260px] whitespace-normal break-words px-2 py-1 rounded theme-bg-secondary theme-text-primary text-[10px] shadow theme-border border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition'>
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

