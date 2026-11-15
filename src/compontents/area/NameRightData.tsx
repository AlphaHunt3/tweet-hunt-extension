import React, { useMemo } from 'react';
import { MainData } from '~contents/hooks/useMainData.ts';
import { DeletedTweetsSection } from '~/compontents/DeletedTweetsSection.tsx';
import { TokenPerformanceSection } from '~/compontents/TokenPerformanceSection.tsx';
import { renderInvestorList } from '~/compontents/InvestmentPanel.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import { NameHistorySection } from '~/compontents/NameHistorySection.tsx';
import { MBTISection } from '~/compontents/MBTISection.tsx';
import { DiscussionPanel } from '~/compontents/DiscussionPanel.tsx';
import {
  MBTIData,
  MultiFieldItem,
  SoulDensityData,
} from '~types';
import KolAbilityRadar, {
  buildAbilityFooter,
} from '~/compontents/KolAbilityRadar.tsx';
import { generatePersonalizedColor } from '~/utils/colorGenerator.ts';
import { configManager } from '~/utils/configManager.ts';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import cssText from 'data-text:~/css/style.css';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import { buildInsightItems, type InsightKey } from '~/ui/profile/insightItems';
import { NarrativeLine } from '~/ui/profile/NarrativeLine';
import { ProfileInsights } from '~/ui/profile/ProfileInsights';
import { ProfileTagline } from '~/ui/profile/ProfileTagline';
import { SkinScope } from '~/ui/skin/SkinScope';
import { getSoulInfo } from '~contents/services/api.ts';
import { SoulCard } from '~/ui/profile/details/SoulCard';
import { useRequest } from 'ahooks';
import { ProjectMembersSection } from '~compontents/ProjectMembersSection';
import { useCrossPageSettings } from '~/utils/settingsManager.ts';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { ProRequired } from '~compontents/ProRequired';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { EditedTweetsSection } from '~compontents/EditedTweetsSection';
import { useEditedTweets } from '~contents/hooks/useEditedTweets';
import {
  AI_ABILITY_MIN_SCORE,
  getAbilityModelData,
  type AbilityModelData,
} from '~/utils/abilityModel';

type DomainType = 'web3' | 'ai';
const ABILITY_MODEL_MIN_DISPLAY_COUNT = 1;
const ABILITY_MODEL_MIN_RADAR_COUNT = 3;

type NameRightDataProps = Pick<
  MainData,
  | 'newTwitterData'
  | 'twInfo'
  | 'deletedTweets'
  | 'deletedTweetsIsVip'
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

function hasDisplayableAbilityData(data: AbilityModelData) {
  return data.abilities.length >= ABILITY_MODEL_MIN_DISPLAY_COUNT;
}

function hasRadarAbilityData(data: AbilityModelData) {
  return data.abilities.length >= ABILITY_MODEL_MIN_RADAR_COUNT;
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

interface AbilityModelDetailPanelProps {
  web3Data: AbilityModelData;
  aiData: AbilityModelData;
  activeDomain: DomainType;
  onDomainChange: (domain: DomainType) => void;
  title: string;
  web3Label: string;
  aiLabel: string;
  personalizedColor: string;
}

function getAbilityScore(item: MultiFieldItem) {
  try {
    const key = Object.keys(item)[0];
    const score = Number(item?.[key]);
    if (!Number.isFinite(score)) return 0;
    return Math.max(0, Math.min(100, score));
  } catch {
    return 0;
  }
}

function getAbilityName(item: MultiFieldItem, index: number) {
  try {
    const key = Object.keys(item)[0];
    return key || `Ability${index + 1}`;
  } catch {
    return `Ability${index + 1}`;
  }
}

function AbilityModelDetailPanel({
  web3Data,
  aiData,
  activeDomain,
  onDomainChange,
  title,
  web3Label,
  aiLabel,
  personalizedColor,
}: AbilityModelDetailPanelProps) {
  const { t, lang } = useI18n();
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
        }
        : null,
    [hookUsername, hookName, hookAvatar],
  );
  const hasWeb3Data = hasDisplayableAbilityData(web3Data);
  const hasAiData = hasDisplayableAbilityData(aiData);
  const canSwitch = hasWeb3Data && hasAiData;
  const currentDomain: DomainType =
    activeDomain === 'ai'
      ? hasAiData
        ? 'ai'
        : 'web3'
      : hasWeb3Data
        ? 'web3'
        : 'ai';
  const currentData = currentDomain === 'ai' ? aiData : web3Data;
  const domainOptions = (['web3', 'ai'] as DomainType[]).filter((domain) =>
    domain === 'ai' ? hasAiData : hasWeb3Data,
  );
  const abilityFooter = useMemo(() => {
    return buildAbilityFooter(
      t('abilityModelFooter') || '',
      currentData.updateTime,
      lang,
    );
  }, [t, currentData.updateTime, lang]);

  return (
    <div className='px-3 pt-1 pb-3 min-w-[360px] theme-bg-secondary rounded-lg relative'>
      <div className='flex items-center gap-3 pb-1 border-b theme-border'>
        <div className='relative'>
          {hookLoading ? (
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
            <div className='w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center border-2 theme-border'>
              <span className='text-white font-medium text-sm'>
                {domUserInfo?.name
                  ? domUserInfo.name.charAt(0).toUpperCase()
                  : '?'}
              </span>
            </div>
          )}
        </div>

        <div className='flex-1 min-w-0'>
          {hookLoading ? (
            <div className='space-y-1'>
              <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-20'></div>
              <div className='h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-16'></div>
            </div>
          ) : (
            <>
              <h3 className='text-sm font-medium theme-text-primary leading-tight truncate'>
                {domUserInfo?.name || 'Unknown User'}
              </h3>
              <p className='text-xs theme-text-secondary leading-tight truncate'>
                @{domUserInfo?.username || 'unknown'}
              </p>
            </>
          )}
        </div>

        <div className='flex flex-col items-end gap-1 text-right shrink-0'>
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
      </div>

      <div className='py-2 space-y-2'>
        {currentData.abilities.map((item, index) => {
          const name = getAbilityName(item, index);
          const score = getAbilityScore(item);

          return (
            <div
              key={`${name}-${index}`}
              className='flex items-center justify-between gap-3'
            >
              <span className='text-xs font-medium theme-text-primary truncate'>
                {name}
              </span>
              <span
                className='text-xs font-semibold shrink-0'
                style={{ color: personalizedColor }}
              >
                {score}
              </span>
            </div>
          );
        })}
      </div>

      {currentData.summary && (
        <div className='pt-2 border-t theme-border'>
          <h4 className='text-xs font-medium theme-text-primary mb-1'>
            {t('abilityAnalysis')}
          </h4>
          <p className='text-xs theme-text-secondary leading-relaxed'>
            {currentData.summary}
            {abilityFooter ? <> ({abilityFooter})</> : null}
          </p>
        </div>
      )}
    </div>
  );
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
  const hasWeb3Data = hasDisplayableAbilityData(web3Data);
  const hasAiData = hasDisplayableAbilityData(aiData);
  const canSwitch = hasWeb3Data && hasAiData;
  const currentDomain: DomainType =
    activeDomain === 'ai'
      ? hasAiData
        ? 'ai'
        : 'web3'
      : hasWeb3Data
        ? 'web3'
        : 'ai';
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
  deletedTweetsIsVip,
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
    shadowMode: 'open',
  });
  const portalHost = usePersistentPortalHost(shadowRoot);
  const { t, lang } = useI18n();

  // 使用响应式设置管理
  const { isEnabled } = useCrossPageSettings();
  const { hasWeb3, hasAi, primaryDomain } = useUserDomain();
  const [storedAbilityDomain, setStoredAbilityDomain] =
    useLocalStorage<DomainType | null>('@xhunt/name-ability-domain', null);
  const [isInsightsExpanded, setIsInsightsExpanded] = useLocalStorage(
    '@xhunt/name-insights-expanded',
    true,
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
  const showEditInfo = isEnabled('showEditInfo');
  const editedTweets = useEditedTweets(String(twitterId || ''), showEditInfo);

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

    if (hasDisplayableAbilityData(requestedData)) return requestedDomain;
    if (hasDisplayableAbilityData(fallbackData)) {
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

  // 检查是否应该显示能力模型（至少1个能力 + 配置允许）
  const shouldShowAbilityModel = useMemo(() => {
    // 检查配置是否允许显示能力模型
    const configAllowsDisplay = configManager.shouldShowAbilityModel();

    // 检查数据是否满足展示条件（至少1个能力）
    const hasDisplayableAbilities =
      abilities && abilities.length >= ABILITY_MODEL_MIN_DISPLAY_COUNT;

    return configAllowsDisplay && hasDisplayableAbilities;
  }, [abilities]);
  const shouldShowAbilityRadar = useMemo(() => {
    return hasRadarAbilityData(defaultAbilityData);
  }, [defaultAbilityData]);

  if (!shadowRoot) return null;
  if (error || !userId) {
    return <></>;
  }

  const discussionData = discussionInfo
    ? {
        ca: discussionInfo.ca || '',
        symbol: discussionInfo.symbol || '',
        name: discussionInfo.name,
        twitter: discussionInfo.twitter,
        discussion1dCn: discussionInfo.discussion1dCn,
        discussion1dEn: discussionInfo.discussion1dEn,
        discussion7dCn: discussionInfo.discussion7dCn,
        discussion7dEn: discussionInfo.discussion7dEn,
      }
    : undefined;
  const bulletCount = (period?: {
    negativeBulletPoints?: unknown[];
    positiveBulletPoints?: unknown[];
  }) =>
    (period?.negativeBulletPoints?.length || 0) +
    (period?.positiveBulletPoints?.length || 0);
  const screenNameCount = Object.keys(
    renameInfo?.accounts?.[0]?.screen_names || {},
  ).length;

  const insightItems = buildInsightItems({
    t,
    isEnabled,
    hasWeb3,
    classification: twInfo?.basicInfo?.classification,
    isProject: Boolean(twInfo?.kolFollow?.isProject),
    soulScore: soulData?.score,
    hasSoul: !loadingSoulData && Boolean(soulData),
    mbti: mbti?.mbti,
    hasMbti: Boolean(twInfo?.mbti),
    abilityNames,
    showAbilityModel: shouldShowAbilityModel,
    mentions90: twInfo?.kolTokenMention?.day90?.tokenMentions?.length,
    return90: twInfo?.kolTokenMention?.day90?.maxProfitAvg,
    deletedCount:
      !loadingDel && deletedTweets?.length ? deletedTweets.length : 0,
    editedCount: editedTweets.loadingCount ? 0 : editedTweets.count,
    showEditInfo,
    renameCount:
      !loadingRenameInfo && screenNameCount > 1 ? screenNameCount - 1 : 0,
    membersCount: projectMembersCount,
    showMembers: hasRootMembers || hasGroupedMembers,
    investorsCount: loadingRootData
      ? 0
      : rootData?.invested?.investors?.length || 0,
    totalFunding: Number(rootData?.invested?.total_funding) || 0,
    portfolioCount: loadingRootData
      ? 0
      : rootData?.investor?.investors?.length || 0,
    discussion1d: loadingDiscussionInfo ? null : discussionInfo?.popularity1d,
    discussion1dTotal: bulletCount(discussionInfo?.discussion1dCn),
    discussion7d: loadingDiscussionInfo ? null : discussionInfo?.popularity7d,
    discussion7dTotal: bulletCount(discussionInfo?.discussion7dCn),
  });

  const renderDetail = (key: InsightKey): React.ReactNode => {
    switch (key) {
      case 'soul':
        return soulData ? <SoulCard data={soulData} handle={userId} /> : null;
      case 'mbti':
        return <MBTISection data={mbti!} isHoverPanel={true} />;
      case 'ability':
        return shouldShowAbilityRadar ? (
          <AbilityModelPanel
            web3Data={web3AbilityData}
            aiData={aiAbilityData}
            activeDomain={activeAbilityDomain}
            onDomainChange={setStoredAbilityDomain}
            userId={userId}
            newTwitterData={newTwitterData}
            loadingTwInfo={loadingTwInfo}
            title={t('kolAbilityModel')}
            web3Label={t('domainWeb3')}
            aiLabel={t('domainAi')}
          />
        ) : (
          <AbilityModelDetailPanel
            web3Data={web3AbilityData}
            aiData={aiAbilityData}
            activeDomain={activeAbilityDomain}
            onDomainChange={setStoredAbilityDomain}
            title={t('kolAbilityModel')}
            web3Label={t('domainWeb3')}
            aiLabel={t('domainAi')}
            personalizedColor={personalizedColors.primary}
          />
        );
      case 'return90':
        return (
          <TokenPerformanceSection
            isHoverPanel={true}
            kolData={twInfo}
            defaultPeriod={'day90'}
            mode={'Metrics'}
          />
        );
      case 'mentions90':
        return (
          <TokenPerformanceSection
            isHoverPanel={true}
            kolData={twInfo}
            defaultPeriod={'day90'}
            mode={'WordCloud'}
          />
        );
      case 'deleted':
        return (
          <ProRequired enableAnimation={false} showExtraTitle={true}>
            <DeletedTweetsSection
              isHoverPanel={true}
              deletedTweets={deletedTweets}
              loadingDel={loadingDel}
              isVip={deletedTweetsIsVip}
            />
          </ProRequired>
        );
      case 'edited':
        return (
          <EditedTweetsSection
            count={editedTweets.count}
            access={editedTweets.access}
            items={editedTweets.items}
            loading={editedTweets.loadingDetails}
            loaded={editedTweets.detailsLoaded}
            error={editedTweets.error}
            hasMore={editedTweets.hasMore}
            onRetry={editedTweets.retryDetails}
            onLoadMore={editedTweets.loadMore}
          />
        );
      case 'renamed':
        return renameInfo?.accounts?.[0] ? (
          <NameHistorySection data={renameInfo.accounts[0]} />
        ) : null;
      case 'members':
        return (
          <ProjectMembersSection data={projectMemberData} isHoverPanel={true} />
        );
      case 'investors':
        return renderInvestorList(
          t('investors'),
          rootData?.invested?.investors,
          rootData?.invested?.total_funding,
          rootData?.projectLink,
          true,
        );
      case 'portfolio':
        return renderInvestorList(
          t('portfolio'),
          rootData?.investor?.investors,
          rootData?.investor?.total_funding,
          rootData?.projectLink,
          true,
        );
      case 'discussion1d':
        return (
          <DiscussionPanel
            data={discussionData}
            period='1d'
            loading={loadingDiscussionInfo}
          />
        );
      case 'discussion7d':
        return (
          <DiscussionPanel
            data={discussionData}
            period='7d'
            loading={loadingDiscussionInfo}
          />
        );
    }
  };

  return ReactDOM.createPortal(
    <SkinScope data-xhunt-testid='name-right-data'>
      <ProfileTagline
        handle={userId}
        twitterId={twitterId}
        fallbackNote={reviewInfo?.currentUserReview?.note}
      />
      <ProfileInsights
        items={insightItems}
        loading={loadingTwInfo}
        expanded={isInsightsExpanded}
        onExpandedChange={setIsInsightsExpanded}
        renderDetail={renderDetail}
        onOpenItem={(key) => {
          if (key === 'edited') void editedTweets.loadDetails();
        }}
        narrative={
          isEnabled('showNarrative') && twInfo?.narrative && !loadingTwInfo ? (
            <NarrativeLine narrative={twInfo.narrative} />
          ) : null
        }
      />
    </SkinScope>,
    portalHost!,
  );
}

export const NameRightData = React.memo(_NameRightData);
