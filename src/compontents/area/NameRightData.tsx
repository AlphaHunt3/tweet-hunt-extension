import React, { useMemo } from 'react';
import { MainData } from '~contents/hooks/useMainData.ts';
import { DeletedTweetsSection } from '~/compontents/DeletedTweetsSection.tsx';
import { TokenPerformanceSection } from '~/compontents/TokenPerformanceSection.tsx';
import { renderInvestorList } from '~/compontents/InvestmentPanel.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import { DiscussionCard, MbtiCard, RenameCard } from '~/ui/profile/details/TextCards';
import {
  MBTIData,
  SoulDensityData,
} from '~types';
import { AbilityCard, abilityEntries } from '~/ui/profile/details/AbilityCard';
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
  const abilityNames = useMemo(
    () => abilityEntries(defaultAbilityData).map((entry) => entry.name),
    [defaultAbilityData],
  );

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
        return <MbtiCard data={mbti} />;
      case 'ability':
        return (
          <AbilityCard
            handle={userId}
            web3={web3AbilityData}
            ai={aiAbilityData}
            domain={activeAbilityDomain}
            onDomainChange={setStoredAbilityDomain}
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
        return <RenameCard data={renameInfo?.accounts?.[0]} handle={userId} />;
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
          <DiscussionCard
            data={discussionData}
            period='1d'
            loading={loadingDiscussionInfo}
          />
        );
      case 'discussion7d':
        return (
          <DiscussionCard
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
