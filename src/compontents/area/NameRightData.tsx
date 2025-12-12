import React, { useMemo } from 'react';
import { HoverStatItem } from '~/compontents/HoverStatItem.tsx';
import { MainData } from '~contents/hooks/useMainData.ts';
import { DeletedTweetsSection } from '~/compontents/DeletedTweetsSection.tsx';
import { TokenPerformanceSection } from '~/compontents/TokenPerformanceSection.tsx';
import { formatFunding, formatPercentage, getMBTIColor } from '~contents/utils';
import { renderInvestorList } from '~/compontents/InvestmentPanel.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import { NameHistorySection } from '~/compontents/NameHistorySection.tsx';
import { MBTISection } from '~/compontents/MBTISection.tsx';
import { DiscussionSection } from '~/compontents/DiscussionSection.tsx';
import { MBTIData, SoulDensityData } from '~types';
import KolAbilityRadar from '~/compontents/KolAbilityRadar.tsx';
import AbilityTags from '~/compontents/AbilityTags.tsx';
import {
  generatePersonalizedColor,
  generateScoreBasedColor,
} from '~/utils/colorGenerator.ts';
import { configManager } from '~/utils/configManager.ts';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import cssText from 'data-text:~/css/style.css';
import { NotesSection } from '~compontents/NotesSection.tsx';
import { NarrativeSection } from '~/compontents/NarrativeSection.tsx';
import SoulDensity from '~/compontents/SoulDensity.tsx';
import { getSoulInfo } from '~contents/services/api.ts';
import { useRequest } from 'ahooks';
import { ProjectMembersSection } from '~compontents/ProjectMembersSection';
import { useCrossPageSettings } from '~/utils/settingsManager.ts';
import { ProRequired } from '~compontents/ProRequired';
import usePlacementTrackingDomUserInfo from '~contents/hooks/usePlacementTrackingDomUserInfo';

function _NameRightData({
  newTwitterData,
  twInfo,
  deletedTweets,
  loadingTwInfo,
  loadingDel,
  error,
  userId: _,
  rootData,
  loadingRootData,
  renameInfo,
  reviewInfo,
  loadingRenameInfo,
  discussionInfo,
  loadingDiscussionInfo,
  projectMemberData,
  loadingProjectMember,
}: MainData) {
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    styleText: cssText,
  });
  const { t, lang } = useI18n();

  // 使用响应式设置管理
  const { isEnabled } = useCrossPageSettings();

  const {
    twitterId,
    handler: userId,
    loading: isLoadingHtml,
  } = usePlacementTrackingDomUserInfo();

  // 获取灵魂浓度数据
  const { data: soulData, loading: loadingSoulData } = useRequest<
    SoulDensityData | undefined,
    []
  >(() => getSoulInfo(String(twitterId)), {
    refreshDeps: [twitterId],
    ready: Boolean(twitterId),
  });

  const mbti = useMemo(() => {
    if (Array.isArray(twInfo?.mbti?.cn) && Array.isArray(twInfo?.mbti?.en)) {
      return lang === 'zh' ? twInfo?.mbti?.cn?.[0] : twInfo?.mbti?.en?.[0];
    } else {
      return lang === 'zh' ? twInfo?.mbti?.cn : twInfo?.mbti?.en;
    }
  }, [lang, twInfo]) as MBTIData;
  const mbtiColor = useMemo(() => {
    if (mbti && 'mbti' in mbti && mbti?.mbti) {
      return getMBTIColor(mbti.mbti);
    }
    return '';
  }, [mbti]);

  // 从新的 multiField 结构中提取能力数据和总结
  const { abilities, summary } = useMemo(() => {
    try {
      if (!twInfo?.multiField) return { abilities: [], summary: '' };

      // 根据语言选择对应的字段
      const languageFields =
        lang === 'zh' ? twInfo.multiField.cn : twInfo.multiField.en;

      if (!languageFields?.fields || !Array.isArray(languageFields.fields)) {
        return { abilities: [], summary: '' };
      }

      return {
        abilities: languageFields.fields,
        summary: languageFields.summary || '',
      };
    } catch {
      return { abilities: [], summary: '' };
    }
  }, [twInfo?.multiField, lang]);

  // 从 abilities 中提取能力名称用于生成个性化颜色
  const abilityNames = useMemo(() => {
    try {
      if (!abilities || abilities.length === 0) return [];
      return abilities.map((item) => {
        const key = Object.keys(item)[0];
        return key || 'Unknown';
      });
    } catch {
      return [];
    }
  }, [abilities]);

  // 生成个性化颜色
  const personalizedColors = useMemo(() => {
    return generatePersonalizedColor(abilityNames);
  }, [abilityNames]);

  const soulColor = useMemo(() => {
    if (!soulData || !soulData.score) {
      return {
        primary: '#7c3aed', // violet-600
        secondary: 'rgba(124, 58, 237, 0.15)',
      };
    }
    return generateScoreBasedColor(soulData.score);
  }, [userId, soulData?.score]);

  // 计算项目成员数据
  const projectMemberStats = useMemo(() => {
    if (!projectMemberData) return { hasMembers: false, totalMembers: 0 };

    // 动态获取所有key（排除handle字段）
    const memberGroups = Object.keys(projectMemberData)
      .filter((key) => key !== 'handle') // 排除handle字段
      .map((key) => projectMemberData[key as keyof typeof projectMemberData])
      .filter((members) => Array.isArray(members) && members.length > 0);
    const totalMembers = memberGroups.reduce(
      (total, members) => total + (members?.length || 0),
      0
    );
    return { hasMembers: totalMembers > 0, totalMembers };
  }, [projectMemberData]);

  // 检查是否应该显示能力模型（至少4个能力 + 配置允许）
  const shouldShowAbilityModel = useMemo(() => {
    // 检查配置是否允许显示能力模型
    const configAllowsDisplay = configManager.shouldShowAbilityModel();

    // 检查数据是否满足显示条件（至少4个能力）
    const hasEnoughAbilities = abilities && abilities.length >= 4;

    return configAllowsDisplay && hasEnoughAbilities;
  }, [abilities]);

  if (!shadowRoot) return null;
  if (error || !userId) {
    return <></>;
  }
  const isPerson = twInfo?.basicInfo?.classification === 'person';
  const isKol = twInfo?.basicInfo?.isKol;
  const day90TokenMentionsLength = String(
    twInfo?.kolTokenMention?.day90?.tokenMentions?.length
  );
  const day90NowProfitAvg = twInfo?.kolTokenMention?.day90?.maxProfitAvg;
  const day90NowProfitAvgStr =
    (day90NowProfitAvg && day90NowProfitAvg >= 0 ? '+' : '') +
    formatPercentage(day90NowProfitAvg);

  return ReactDOM.createPortal(
    <>
      <NotesSection userId={userId} reviewInfo={reviewInfo} />
      <div className='flex flex-wrap items-center w-full mh-[40px] h-auto mt-4 gap-1'>
        {/* 项目成员 */}
        {isEnabled('showProjectMembers') &&
          !loadingProjectMember &&
          projectMemberData &&
          projectMemberStats.hasMembers &&
          twInfo?.basicInfo?.classification !== 'person' && (
            <HoverStatItem
              label={t('projectMembers')}
              value={`(${projectMemberStats.totalMembers || 0})`}
              hoverContent={
                <ProjectMembersSection
                  data={projectMemberData}
                  isHoverPanel={true}
                />
              }
              valueClassName='text-purple-400'
            />
          )}

        {!loadingRootData ? (
          <>
            {/*投资人*/}
            {isEnabled('showInvestors') &&
            rootData &&
            rootData?.invested?.investors?.length ? (
              <HoverStatItem
                label={t('investors')}
                value={
                  Number(rootData.invested.total_funding) ? (
                    <span className='text-green-600'>
                      (
                      {formatFunding(
                        Number(rootData.invested.total_funding || 0)
                      )}
                      )
                    </span>
                  ) : (
                    <>({rootData?.invested?.investors?.length})</>
                  )
                }
                hoverContent={renderInvestorList(
                  t('investors'),
                  rootData.invested.investors,
                  rootData.invested.total_funding,
                  rootData?.projectLink,
                  true
                )}
                valueClassName={'text-[#1D9BF0]'}
              />
            ) : null}
            {isEnabled('showPortfolio') &&
            rootData &&
            rootData?.investor?.investors?.length ? (
              <HoverStatItem
                label={t('portfolio')}
                value={`(${rootData?.investor?.investors?.length || 0})`}
                hoverContent={renderInvestorList(
                  t('portfolio'),
                  rootData.investor.investors,
                  rootData.investor.total_funding,
                  rootData?.projectLink,
                  true
                )}
                valueClassName={'text-[#1D9BF0]'}
              />
            ) : null}
          </>
        ) : null}
        {!loadingTwInfo ? (
          <>
            {/*90d谈及代币*/}
            {isEnabled('show90dMention') &&
            isPerson &&
            Number(day90TokenMentionsLength) ? (
              <HoverStatItem
                label={t('90dMention')}
                value={`(${day90TokenMentionsLength || 0})`}
                hoverContent={
                  <TokenPerformanceSection
                    isHoverPanel={true}
                    kolData={twInfo}
                    defaultPeriod={'day90'}
                    mode={'WordCloud'}
                  />
                }
                valueClassName={'text-[#1D9BF0]'}
              />
            ) : null}

            {/*90d收益率*/}
            {isEnabled('show90dPerformance') &&
            isPerson &&
            day90NowProfitAvg ? (
              <HoverStatItem
                label={t('90dPerformance')}
                value={`(${day90NowProfitAvgStr})`}
                hoverContent={
                  <TokenPerformanceSection
                    isHoverPanel={true}
                    kolData={twInfo}
                    defaultPeriod={'day90'}
                    mode={'Metrics'}
                  />
                }
                valueClassName={
                  day90NowProfitAvg >= 0 ? 'text-green-600' : 'text-red-400'
                }
              />
            ) : null}
          </>
        ) : (
          <HoverStatItem
            label={t('loading')}
            value={''}
            hoverContent={null}
            valueClassName={'text-[#1D9BF0]'}
          />
        )}

        {/*MBTI*/}
        {isEnabled('showPersonalityType') &&
          !loadingTwInfo &&
          twInfo &&
          twInfo?.mbti && (
            <HoverStatItem
              label={t('personalityType')}
              value={`(${mbti?.mbti || 'N/A'})`}
              hoverContent={<MBTISection data={mbti!} isHoverPanel={true} />}
              valueClassName={mbtiColor}
            />
          )}

        {/*改名*/}
        {isEnabled('showRenameInfo') &&
        !loadingRenameInfo &&
        renameInfo &&
        renameInfo?.accounts?.length &&
        Object.keys(renameInfo.accounts[0]?.screen_names || {}).length > 1 ? (
          <HoverStatItem
            label={t('renameInfo')}
            value={`(${String(
              Object.keys(renameInfo.accounts[0]?.screen_names || {}).length - 1
            )})`}
            hoverContent={<NameHistorySection data={renameInfo.accounts[0]} />}
            valueClassName='text-indigo-400'
          />
        ) : null}

        {/*删帖*/}
        {isEnabled('showDelInfo') &&
        isKol &&
        !loadingDel &&
        deletedTweets &&
        deletedTweets?.length ? (
          <HoverStatItem
            label={t('delInfo')}
            value={`(${deletedTweets?.length || 0})`}
            hoverContent={
              <ProRequired enableAnimation={false} showExtraTitle={true}>
                <DeletedTweetsSection
                  isHoverPanel={true}
                  deletedTweets={deletedTweets}
                  loadingDel={loadingDel}
                />
              </ProRequired>
            }
            valueClassName='text-red-400'
          />
        ) : null}

        {isEnabled('showDiscussion') && twInfo?.kolFollow?.isProject && (
          <DiscussionSection
            userId={userId}
            discussionInfo={discussionInfo}
            loadingDiscussionInfo={loadingDiscussionInfo}
          />
        )}

        {/* 能力模型 - 🆕 使用自定义的最大宽高 */}
        {isEnabled('showKolAbilityModel') &&
          !loadingTwInfo &&
          shouldShowAbilityModel && (
            <HoverStatItem
              label={t('kolAbilityModel')}
              value={
                <AbilityTags
                  abilities={abilities}
                  personalizedColor={personalizedColors.primary}
                />
              }
              hoverContent={
                <KolAbilityRadar
                  abilities={abilities}
                  summary={summary}
                  userId={userId}
                  newTwitterData={newTwitterData}
                  loadingTwInfo={loadingTwInfo}
                />
              }
              valueClassName={'text-[#1D9BF0]'}
            />
          )}

        {/* 灵魂浓度 */}
        {isEnabled('showSoulIndex') && !loadingSoulData && soulData && (
          <HoverStatItem
            label={t('soulIndex')}
            value={`(${soulData.score || 0}${t('points')})`}
            hoverContent={
              <SoulDensity
                data={soulData}
                userId={userId}
                newTwitterData={newTwitterData}
                loadingTwInfo={loadingTwInfo}
              />
            }
            valueStyle={{
              color: soulColor.primary,
            }}
          />
        )}
      </div>

      {/* 🆕 叙事功能区域 */}
      {isEnabled('showNarrative') &&
        twInfo &&
        twInfo?.narrative &&
        !loadingTwInfo && (
          <NarrativeSection
            narrative={twInfo?.narrative}
            isLoading={loadingTwInfo}
          />
        )}
    </>,
    shadowRoot
  );
}

export const NameRightData = React.memo(_NameRightData);
