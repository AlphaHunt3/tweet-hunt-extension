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
import {
  MBTIData,
  MultiFieldData,
  MultiFieldItem,
  SoulDensityData,
} from '~types';
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
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import { NotesSection } from '~compontents/NotesSection.tsx';
import { NarrativeSection } from '~/compontents/NarrativeSection.tsx';
import SoulDensity from '~/compontents/SoulDensity.tsx';
import { getSoulInfo } from '~contents/services/api.ts';
import { useRequest } from 'ahooks';
import { ProjectMembersSection } from '~compontents/ProjectMembersSection';
import { useCrossPageSettings } from '~/utils/settingsManager.ts';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { ProRequired } from '~compontents/ProRequired';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

type DomainType = 'web3' | 'ai';
const AI_ABILITY_MIN_SCORE = 70;

type NameRightDataProps = Pick<
  MainData,
  | 'newTwitterData'
  | 'twInfo'
  | 'deletedTweets'
  | 'loadingTwInfo'
  | 'loadingDel'
  | 'error'
  | 'rootData'
  | 'loadingRootData'
  | 'renameInfo'
  | 'reviewInfo'
  | 'loadingRenameInfo'
  | 'discussionInfo'
  | 'loadingDiscussionInfo'
  | 'projectMemberData'
  | 'loadingProjectMember'
>;

interface AbilityModelData {
  abilities: MultiFieldItem[];
  summary: string;
  updateTime?: string | number | null;
}

function getAbilityModelData(
  multiField: MultiFieldData | null | undefined,
  lang: string,
  minScore?: number,
): AbilityModelData {
  try {
    if (!multiField) return { abilities: [], summary: '', updateTime: null };

    const languageFields = lang === 'zh' ? multiField.cn : multiField.en;
    if (!languageFields?.fields || !Array.isArray(languageFields.fields)) {
      return {
        abilities: [],
        summary: '',
        updateTime:
          multiField.update ?? multiField.updateDate ?? multiField.updatedAt ?? null,
      };
    }

    const abilities =
      typeof minScore === 'number'
        ? languageFields.fields.filter((item) => {
          const key = Object.keys(item)[0];
          const score = Number(item?.[key]);
          return Number.isFinite(score) && score >= minScore;
        })
        : languageFields.fields;

    return {
      abilities,
      summary: languageFields.summary || '',
      updateTime:
        multiField.update ?? multiField.updateDate ?? multiField.updatedAt ?? null,
    };
  } catch {
    return { abilities: [], summary: '', updateTime: null };
  }
}

function hasEnoughAbilityData(data: AbilityModelData) {
  return data.abilities.length >= 4;
}

function NameInsightsSkeleton() {
  return (
    <div className='flex items-center w-full h-5 gap-1 mt-3'>
      <span className='h-3.5 w-9 rounded-sm bg-gray-300/50 dark:bg-gray-700/60 animate-pulse' />
      <span className='h-0.5 w-0.5 rounded-full bg-gray-300/60 dark:bg-gray-600/70' />
      <span className='h-3.5 w-20 rounded-sm bg-gray-300/50 dark:bg-gray-700/60 animate-pulse' />
      <span className='h-0.5 w-0.5 rounded-full bg-gray-300/60 dark:bg-gray-600/70' />
      <span className='h-3.5 w-16 rounded-sm bg-gray-300/50 dark:bg-gray-700/60 animate-pulse' />
    </div>
  );
}

interface AbilityModelPanelProps {
  web3Data: AbilityModelData;
  aiData: AbilityModelData;
  activeDomain: DomainType;
  onDomainChange: (domain: DomainType) => void;
  userId: string;
  newTwitterData: MainData['newTwitterData'];
  loadingTwInfo: boolean;
  title: string;
  web3Label: string;
  aiLabel: string;
}

function AbilityModelPanel({
  web3Data,
  aiData,
  activeDomain,
  onDomainChange,
  userId,
  newTwitterData,
  loadingTwInfo,
  title,
  web3Label,
  aiLabel,
}: AbilityModelPanelProps) {
  const hasWeb3Data = hasEnoughAbilityData(web3Data);
  const hasAiData = hasEnoughAbilityData(aiData);
  const canSwitch = hasWeb3Data && hasAiData;
  const currentDomain = activeDomain === 'ai' && hasAiData ? 'ai' : 'web3';
  const currentData = currentDomain === 'ai' ? aiData : web3Data;
  const domainOptions = (['web3', 'ai'] as DomainType[]).filter((domain) =>
    domain === 'ai' ? hasAiData : hasWeb3Data,
  );

  const titleExtra = (
    <div className='flex flex-col items-end gap-1'>
      <h3 className='text-[10px] font-medium theme-text-primary leading-none'>
        {title}
      </h3>
      {canSwitch ? (
        <div className='inline-flex items-center gap-0.5 theme-bg-tertiary rounded-full p-[2px]'>
          {domainOptions.map((domain) => {
            const active = currentDomain === domain;
            const isAi = domain === 'ai';
            return (
              <button
                key={domain}
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onDomainChange(domain);
                }}
                className={`px-2 py-0.5 text-[11px] rounded-full font-semibold leading-none transition-all ${active
                  ? 'text-white'
                  : 'theme-text-secondary hover:theme-text-primary'
                  }`}
                style={
                  active
                    ? {
                      background: isAi
                        ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
                        : 'linear-gradient(135deg, #1D9BF0 0%, #a855f7 100%)',
                      boxShadow: isAi
                        ? '0 1px 4px rgba(16,185,129,0.2)'
                        : '0 1px 4px rgba(29,155,240,0.22)',
                    }
                    : undefined
                }
              >
                {isAi ? aiLabel : web3Label}
              </button>
            );
          })}
        </div>
      ) : (
        <span
          className='text-[10px] font-semibold leading-none'
          style={{ color: currentDomain === 'ai' ? '#10b981' : '#1D9BF0' }}
        >
          {currentDomain === 'ai' ? aiLabel : web3Label}
        </span>
      )}
    </div>
  );

  return (
    <div className='theme-bg-secondary rounded-lg min-w-[360px]'>
      <KolAbilityRadar
        abilities={currentData.abilities}
        summary={currentData.summary}
        userId={userId}
        newTwitterData={newTwitterData}
        loadingTwInfo={loadingTwInfo}
        titleExtra={titleExtra}
        updateTime={currentData.updateTime}
      />
    </div>
  );
}

function _NameRightData({
  newTwitterData,
  twInfo,
  deletedTweets,
  loadingTwInfo,
  loadingDel,
  error,
  rootData,
  loadingRootData,
  renameInfo,
  reviewInfo,
  loadingRenameInfo,
  discussionInfo,
  loadingDiscussionInfo,
  projectMemberData,
  loadingProjectMember,
}: NameRightDataProps) {
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    styleText: cssText,
  });
  const portalHost = usePersistentPortalHost(shadowRoot);
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');

  // 使用响应式设置管理
  const { isEnabled } = useCrossPageSettings();
  const { hasWeb3, hasAi, primaryDomain } = useUserDomain();
  const [storedAbilityDomain, setStoredAbilityDomain] =
    useLocalStorage<DomainType | null>('@xhunt/name-ability-domain', null);
  const [isInsightsExpanded, setIsInsightsExpanded] = useLocalStorage(
    '@xhunt/name-insights-expanded',
    false,
  );

  const preferredAbilityDomain = useMemo<DomainType>(() => {
    if (hasAi && (!hasWeb3 || primaryDomain === 'ai')) return 'ai';
    return 'web3';
  }, [hasWeb3, hasAi, primaryDomain]);

  const {
    twitterId,
    handler: userId,
    loading: isLoadingHtml,
  } = usePlacementTracking();

  // 获取灵魂指数数据
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

  const web3AbilityData = useMemo(
    () => getAbilityModelData(twInfo?.multiField, lang),
    [twInfo?.multiField, lang],
  );
  const aiAbilityData = useMemo(
    () => getAbilityModelData(twInfo?.multiFieldAi, lang, AI_ABILITY_MIN_SCORE),
    [twInfo?.multiFieldAi, lang],
  );
  const activeAbilityDomain = useMemo<DomainType>(() => {
    const requestedDomain = storedAbilityDomain || preferredAbilityDomain;
    const requestedData =
      requestedDomain === 'ai' ? aiAbilityData : web3AbilityData;
    const fallbackData =
      requestedDomain === 'ai' ? web3AbilityData : aiAbilityData;

    if (hasEnoughAbilityData(requestedData)) return requestedDomain;
    if (hasEnoughAbilityData(fallbackData)) {
      return requestedDomain === 'ai' ? 'web3' : 'ai';
    }
    return requestedDomain;
  }, [
    storedAbilityDomain,
    preferredAbilityDomain,
    web3AbilityData,
    aiAbilityData,
  ]);
  const defaultAbilityData =
    activeAbilityDomain === 'ai' ? aiAbilityData : web3AbilityData;
  const { abilities } = defaultAbilityData;

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
      0,
    );
    return { hasMembers: totalMembers > 0, totalMembers };
  }, [projectMemberData]);

  const rootMembers = useMemo(() => {
    return Array.isArray((rootData as any)?.members)
      ? ((rootData as any).members as any[])
      : [];
  }, [rootData]);
  const hasRootMembers = rootMembers.length > 0;
  const hasGroupedMembers = useMemo(() => {
    return (
      !loadingProjectMember &&
      !!projectMemberData &&
      projectMemberStats.hasMembers
    );
  }, [loadingProjectMember, projectMemberData, projectMemberStats.hasMembers]);
  const projectMembersCount = hasRootMembers
    ? rootMembers.length
    : projectMemberStats.totalMembers || 0;

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
  // const isKol = twInfo?.basicInfo?.isKol;
  const day90TokenMentionsLength = String(
    twInfo?.kolTokenMention?.day90?.tokenMentions?.length,
  );
  const day90NowProfitAvg = twInfo?.kolTokenMention?.day90?.maxProfitAvg;
  const day90NowProfitAvgStr =
    (day90NowProfitAvg && day90NowProfitAvg >= 0 ? '+' : '') +
    formatPercentage(day90NowProfitAvg);
  const compactInvestorsText =
    isEnabled('showInvestors') &&
      !loadingRootData &&
      rootData?.invested?.investors?.length
      ? `${t('investors')} ${Number(rootData.invested.total_funding)
        ? formatFunding(Number(rootData.invested.total_funding || 0))
        : rootData.invested.investors.length
      }`
      : null;
  const compactPortfolioText =
    isEnabled('showPortfolio') &&
      !loadingRootData &&
      rootData?.investor?.investors?.length
      ? `${t('portfolio')} ${rootData.investor.investors.length}`
      : null;
  const compactAbilityText = abilityNames.slice(0, 3).join(', ');
  const compactMbtiText =
    isEnabled('showPersonalityType') && !loadingTwInfo && twInfo?.mbti
      ? mbti?.mbti
      : '';

  const compactSoulText =
    isEnabled('showSoulIndex') && !loadingSoulData && soulData
      ? `${t('soulIndex')} ${soulData.score || 0}${t('points')}`
      : null;

  const compactInsightParts = [
    compactMbtiText || null,
    isEnabled('showKolAbilityModel') &&
      !loadingTwInfo &&
      shouldShowAbilityModel &&
      compactAbilityText
      ? compactAbilityText
      : null,
    compactSoulText,
    compactInvestorsText,
    compactPortfolioText,
  ].filter(Boolean) as string[];
  const shouldCollapseInsights = compactInsightParts.length > 0;
  const fullStatsClassName = [
    'flex flex-wrap items-center w-full mh-[40px] h-auto gap-1',
    shouldCollapseInsights ? 'mt-2' : 'mt-4',
  ].join(' ');

  const compactInsightContent = (
    <div
      className='inline-flex min-w-0 max-w-full items-center rounded px-0.5 py-0.5'
      style={{
        maxWidth: 'calc(100% - 42px)',
      }}
    >
      <span className='min-w-0 truncate text-sm leading-5 theme-text-secondary'>
        {compactInsightParts.join(' · ')}
      </span>
    </div>
  );

  return ReactDOM.createPortal(
    <div data-theme={theme} style={{ display: 'contents' }}>
      <NotesSection
        userId={userId}
        twitterId={twitterId}
        reviewInfo={reviewInfo}
      />
      {shouldCollapseInsights && !isInsightsExpanded && (
        <div className='mt-1.5 flex w-full items-center gap-1.5'>
          {compactInsightContent}
          <button
            type='button'
            aria-expanded={isInsightsExpanded}
            className='shrink-0 whitespace-nowrap px-0.5 text-sm leading-5 text-[#1D9BF0] hover:underline transition-colors'
            onClick={() => setIsInsightsExpanded((prev) => !prev)}
          >
            {t('profileInsightsMore')}
          </button>
        </div>
      )}
      {loadingTwInfo ? (
        <NameInsightsSkeleton />
      ) : (!shouldCollapseInsights || isInsightsExpanded) && (
        <div className={fullStatsClassName}>
          {/* 项目成员 */}
          {isEnabled('showProjectMembers') &&
            twInfo?.basicInfo?.classification !== 'person' &&
            (hasRootMembers || hasGroupedMembers) && (
              <HoverStatItem
                label={t('projectMembers')}
                value={`(${projectMembersCount})`}
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
                          Number(rootData.invested.total_funding || 0),
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
                    true,
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
                    true,
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
                hasWeb3 &&
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
                hasWeb3 &&
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
          ) : null}

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
                Object.keys(renameInfo.accounts[0]?.screen_names || {}).length -
                1,
              )})`}
              hoverContent={
                <NameHistorySection data={renameInfo.accounts[0]} />
              }
              valueClassName='text-indigo-400'
            />
          ) : null}

          {/*删帖*/}
          {isEnabled('showDelInfo') &&
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
                  <AbilityModelPanel
                    web3Data={web3AbilityData}
                    aiData={aiAbilityData}
                    activeDomain={activeAbilityDomain}
                    onDomainChange={setStoredAbilityDomain}
                    userId={userId}
                    newTwitterData={newTwitterData}
                    loadingTwInfo={loadingTwInfo}
                    title={t('kolAbilityModel')}
                    web3Label={t('domainWeb3') || 'Web3'}
                    aiLabel={t('domainAi') || 'AI'}
                  />
                }
                valueClassName={'text-[#1D9BF0]'}
              />
            )}

          {/* 灵魂指数 */}
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

          {shouldCollapseInsights && isInsightsExpanded && (
            <button
              type='button'
              aria-expanded={isInsightsExpanded}
              className='ml-1 shrink-0 whitespace-nowrap px-1 text-[13px] leading-[18px] text-[#1D9BF0] hover:underline transition-colors'
              onClick={() => setIsInsightsExpanded(false)}
            >
              {t('collapse')}
            </button>
          )}
        </div>
      )}

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
    </div>,
    portalHost!,
  );
}

export const NameRightData = React.memo(_NameRightData);
