import cssText from 'data-text:~/css/style.css';
import React, { useState, useCallback, useEffect } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import { MainData } from '~contents/hooks/useMainData.ts';
import ReactDOM from 'react-dom';
import { useI18n } from '~contents/hooks/i18n.ts';
import { ReviewHeader } from '~/compontents/ReviewHeader.tsx';
import ErrorBoundary from '~/compontents/ErrorBoundary.tsx';
import {
  GhostFollowingPanelEventDetail,
  GHOST_FOLLOWING_PANEL_EVENT,
} from './GhostFollowingPanel';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useCrossPageSettings } from '~/utils/settingsManager.ts';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import { SkinScope } from '~/ui/skin/SkinScope';
import { buildKolStats, buildRankStats, type KolStatKey, type KolTab, type RankStatKey, type RankType } from '~/ui/profile/kolRankItems';
import { ProfileKolRow } from '~/ui/profile/ProfileKolRow';
import { KolFollowersCard } from '~/ui/profile/details/KolFollowersCard';
import { RankCard } from '~/ui/profile/details/RankCard';

const RANK_TYPES: Record<RankStatKey, RankType> = {
  rankGlobal: 'followers',
  rankCn: 'chinese',
  rankEn: 'english',
  rankProject: 'project',
};
const KOL_TABS: Record<KolStatKey, KolTab> = {
  kolGlobal: 'global',
  kolTop100: 'top100',
  kolCn: 'cn',
};
import { useUserDomain } from '~contents/hooks/useUserDomain';

type FollowedRightDataProps = Pick<
  MainData,
  | 'twInfo'
  | 'error'
  | 'userId'
  | 'loadingTwInfo'
  | 'reviewInfo'
  | 'refreshAsyncReviewInfo'
  | 'refreshAsyncUserInfo'
  | 'loadingReviewInfo'
>;

function FollowStatsSkeleton() {
  const items = [
    { label: 'w-9', value: 'w-12' },
    { label: 'w-10', value: 'w-11' },
    { label: 'w-8', value: 'w-12' },
    { label: 'w-10', value: 'w-14' },
  ];

  return (
    <>
      <div className='mr-6' />
      {items.map((item, index) => (
        <div
          key={index}
          data-xhunt-exclude='true'
          className='relative mr-4 inline-flex align-baseline'
          style={{ width: 'max-content' }}
        >
          <div className='flex items-center gap-1 rounded px-1 -mx-1 leading-5 h-5'>
            <span
              className={`inline-block h-3.5 ${item.label} rounded-sm bg-gray-300/40 dark:bg-gray-700/50 animate-pulse`}
            />
            <span
              className={`inline-block h-3 ${item.value} rounded-sm bg-gray-300/30 dark:bg-gray-700/40 animate-pulse`}
            />
          </div>
        </div>
      ))}
    </>
  );
}

function ReviewHeaderSkeleton() {
  return (
    <div className='min-w-full mt-3 mb-1 px-3 py-2 rounded-xl border border-gray-200/20 dark:border-white/10 bg-gray-100/10 dark:bg-white/[0.02]'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className='w-4 h-4 rounded bg-gray-300/35 dark:bg-gray-700/45 animate-pulse flex-shrink-0' />
          <span className='h-4 w-24 rounded-sm bg-gray-300/35 dark:bg-gray-700/45 animate-pulse' />
        </div>
        <span className='h-4 w-14 rounded-sm bg-gray-300/30 dark:bg-gray-700/40 animate-pulse flex-shrink-0' />
      </div>
    </div>
  );
}

function _FollowedRightData({
  twInfo,
  error,
  userId,
  loadingTwInfo,
  reviewInfo,
  refreshAsyncReviewInfo,
  refreshAsyncUserInfo,
  loadingReviewInfo,
}: FollowedRightDataProps) {
  const [isGhostPanelOpen, setIsGhostPanelOpen] = useState(false);
  const { t, lang } = useI18n();
  const { hasWeb3, hasAi, primaryDomain } = useUserDomain();

  // 监听面板关闭事件
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<GhostFollowingPanelEventDetail>;
      if (customEvent.detail.source === 'panel') {
        setIsGhostPanelOpen(customEvent.detail.open);
      }
    };
    window.addEventListener(GHOST_FOLLOWING_PANEL_EVENT, handler);
    return () =>
      window.removeEventListener(GHOST_FOLLOWING_PANEL_EVENT, handler);
  }, []);

  // 用户主动切换的领域（localStorage，跨新开 tab 保留）
  const [savedActiveDomain, setSavedActiveDomain] = useLocalStorage<
    'web3' | 'ai' | null
  >('@xhunt/followed-active-domain', null);

  const getDefaultDomain = useCallback(
    () => (hasWeb3 && hasAi ? primaryDomain : hasWeb3 ? 'web3' : 'ai'),
    [hasWeb3, hasAi, primaryDomain],
  );

  const [activeDomain, setActiveDomain] = useState<'web3' | 'ai'>(
    savedActiveDomain || getDefaultDomain(),
  );

  // 当用户修改首选领域或关闭某个领域后，同步更新当前激活的面
  // 如果当前激活的领域已被关闭，强制切换到另一个可用领域
  // 否则优先恢复用户主动切换的领域，并支持新 tab 水合后恢复
  useEffect(() => {
    if (savedActiveDomain === 'ai' && hasAi) {
      setActiveDomain('ai');
    } else if (savedActiveDomain === 'web3' && hasWeb3) {
      setActiveDomain('web3');
    } else {
      setActiveDomain(getDefaultDomain());
    }
  }, [savedActiveDomain, hasWeb3, hasAi, getDefaultDomain]);

  // 用户主动切换领域：更新 state + localStorage
  const handleSwitchDomain = useCallback(
    (domain: 'web3' | 'ai') => {
      setActiveDomain(domain);
      setSavedActiveDomain(domain);
    },
    [setSavedActiveDomain],
  );

  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    siblingsXPath:
      ".//*[ (contains(., 'Following') and contains(., 'Followers')) or (contains(., '正在关注') and contains(., '关注者')) or (contains(., '個跟隨中') and contains(., '位跟隨者')) or (contains(., 'フォロワー') and contains(., 'フォロー中')) ]",
    styleText: cssText,
    useSiblings: true,
    shadowMode: 'open',
  });
  const portalHost = usePersistentPortalHost(shadowRoot);

  // 使用响应式设置管理
  const { isEnabled } = useCrossPageSettings();

  if (!shadowRoot) return null;

  if (error || !userId) {
    return <></>;
  }

  const domainAvailable = activeDomain === 'web3' ? hasWeb3 : hasAi;
  const kolStats = domainAvailable && twInfo
    ? buildKolStats({ t, isEnabled, domain: activeDomain, kolFollow: twInfo.kolFollow })
    : [];

  return ReactDOM.createPortal(
    <SkinScope data-xhunt-testid='followed-right-data'>
      {loadingTwInfo ? (
        <FollowStatsSkeleton />
      ) : twInfo && (
        <>
          <ProfileKolRow
            kolStats={kolStats}
            rankStats={
              domainAvailable
                ? buildRankStats({ t, lang, isEnabled, domain: activeDomain, kolFollow: twInfo?.kolFollow })
                : []
            }
            domain={activeDomain}
            canSwitch={hasWeb3 && hasAi}
            onDomainChange={handleSwitchDomain}
            renderDetail={(key) =>
              key === 'kolGlobal' || key === 'kolTop100' || key === 'kolCn' ? (
                <KolFollowersCard
                  key={key}
                  kolFollow={twInfo.kolFollow}
                  domain={activeDomain}
                  tabs={kolStats}
                  initialTab={KOL_TABS[key]}
                />
              ) : (
                <RankCard kolFollow={twInfo.kolFollow} rankType={RANK_TYPES[key]} ai={activeDomain === 'ai'} />
              )
            }
          />
        </>
      )}

      {isEnabled('showReviews') &&
        (loadingTwInfo || loadingReviewInfo ? (
          <ReviewHeaderSkeleton />
        ) : (
          <ErrorBoundary name='ReviewHeader'>
            {/*// @ts-ignore*/}
            <ReviewHeader
              stats={{
                averageRating: reviewInfo?.averageRating ?? 0,
                totalReviews: reviewInfo?.totalReviews ?? 0,
                realTotalReviews: reviewInfo?.realTotalReviews ?? 0,
                tagCloud: reviewInfo?.tagCloud ?? [],
                topReviewers: reviewInfo?.topReviewers ?? [],
                currentUserReview: reviewInfo?.currentUserReview,
                defaultTags: reviewInfo?.defaultTags ?? {
                  kol: [],
                  project: [],
                  colorTags: {},
                },
                isKol: twInfo?.basicInfo?.classification !== 'project',
                allTagCount: reviewInfo?.allTagCount ?? 0,
              }}
              handler={userId}
              refreshAsyncReviewInfo={refreshAsyncReviewInfo}
              refreshAsyncUserInfo={refreshAsyncUserInfo}
              loadingReviewInfo={loadingReviewInfo}
            />
          </ErrorBoundary>
        ))}

    </SkinScope>,
    portalHost!,
  );
}

export const FollowedRightData = React.memo(_FollowedRightData);
