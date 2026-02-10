import { useMemo } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { HunterCampaignConfig } from './types';
import { formatNumber } from './utils';

/**
 * Hook 用于计算活动相关的标签文本
 */
export function useCampaignLabels(campaignConfig?: HunterCampaignConfig) {
    const { t, lang } = useI18n();

    const rewardDistributionLabel = useMemo(() => {
        if (!campaignConfig?.rewardDistributionType) return '';
        if (campaignConfig.rewardDistributionType === 'equal') {
            return t('hunterRewardDistributionEqual');
        }
        if (campaignConfig.rewardDistributionType === 'mindshare') {
            return t('hunterRewardDistributionMindshare');
        }
        return campaignConfig.rewardDistributionType;
    }, [campaignConfig?.rewardDistributionType, t]);

    const requirementTagLabel = useMemo(() => {
        if (!campaignConfig) return '';
        const { threshold, includeCreator } = campaignConfig;
        const hasThreshold =
            typeof threshold === 'number' && Number.isFinite(threshold) && threshold > 0;
        if (!hasThreshold && typeof includeCreator !== 'boolean') return '';

        if (hasThreshold) {
            const locale = 'en-US';
            const formattedThreshold = formatNumber(threshold, locale);
            const base =
                lang === 'zh'
                    ? `Top ${formattedThreshold}`
                    : `Top ${formattedThreshold}`;
            if (includeCreator) {
                return lang === 'zh' ? `${base} + 创作者` : `${base} + creators`;
            }
            return base;
        }

        // 没有 threshold，仅根据 includeCreator 给个简短说明
        if (includeCreator) {
            return lang === 'zh' ? '创作者可报名' : 'Creators allowed';
        }
        return lang === 'zh' ? '仅非创作者' : 'Non-creators only';
    }, [campaignConfig, lang]);

    const winnersTagLabel = useMemo(() => {
        if (
            !campaignConfig ||
            typeof campaignConfig.rewardParticipantCount !== 'number' ||
            campaignConfig.rewardParticipantCount <= 0
        ) {
            return '';
        }
        const count = campaignConfig.rewardParticipantCount.toLocaleString();
        return lang === 'zh' ? `${count}人` : `${count} winners`;
    }, [campaignConfig, lang]);

    return {
        rewardDistributionLabel,
        requirementTagLabel,
        winnersTagLabel,
    };
}

