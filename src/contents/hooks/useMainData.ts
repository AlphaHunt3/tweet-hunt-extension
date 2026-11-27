import { useDebounceFn, useRequest } from 'ahooks';
import {
  fetchDelTwitterInfo,
  fetchRootDataInfo,
  fetchProjectMember,
  fetchTwitterInfoNew,
  getSoulInfo,
  convertNewDataToKolData,
  convertNewDataToPopularityInfo,
} from '~contents/services/api.ts';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  AccountsResponse,
  DeletedTweet,
  InvestmentData,
  KolData,
  NewTwitterUserData,
  PopularityInfoType,
  ProjectMemberData,
  SoulDensityData,
} from '~types';
import {
  getHandeReviewInfo,
  updateUserInfo,
} from '~contents/services/review.ts';
import { ReviewStats, UserInfo } from '~types/review.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import usePlacementTracking from './usePlacementTracking';
import { fetchTwRenameInfo } from '~contents/services/fetchTwRenameInfo.ts';

export interface MainData {
  currentUrl: string;
  userId: string;
  deletedTweets: DeletedTweet[];
  deletedTweetsIsVip: boolean;
  twInfo: KolData | null;
  loadingTwInfo: boolean;
  loadingDel: boolean;
  error: Error | undefined;
  rootData: InvestmentData | null;
  loadingRootData: boolean;
  renameInfo: AccountsResponse | null;
  loadingRenameInfo: boolean;
  reviewInfo: ReviewStats | null;
  loadingReviewInfo: boolean;
  refreshAsyncReviewInfo: () => Promise<ReviewStats | undefined>;
  userInfo: UserInfo | null;
  loadingUserInfo: boolean;
  refreshAsyncUserInfo: () => Promise<UserInfo | undefined>;
  discussionInfo: PopularityInfoType | null | undefined;
  loadingDiscussionInfo: boolean;
  projectMemberData: ProjectMemberData | null;
  loadingProjectMember: boolean;
  newTwitterData: NewTwitterUserData | null;
  soulData: SoulDensityData | null;
  loadingSoulData: boolean;
}

const defaultRequestConfig = {
  debounceWait: 300,
  manual: true,
  debounceLeading: true,
  debounceTrailing: false,
};

const useMainData = (): MainData => {
  // const currentUrl = useCurrentUrl();
  const [reviewOnlyKol] = useLocalStorage('@xhunt/reviewOnlyKol', true);
  const [token] = useLocalStorage('@xhunt/token', '');
  const {
    currentUrl,
    urlUid,
    twitterId,
    handler: resolvedUserId,
    loading: isLoadingHtml,
  } = usePlacementTracking();
  // X 新版资料 DOM 后到时，handler 可能只发生大小写变化（例如 URL 中的小写
  // handle 变为页面展示大小写）。业务接口均不区分大小写，统一使用 URL 身份，
  // 避免同一个人被当成两个请求身份而再次进入 loading。
  const userId = String(urlUid || resolvedUserId || '')
    .trim()
    .toLocaleLowerCase();
  // 身份一确认即可提前请求；X 自身资料头完成切换前，结果继续由 loading 隔离。
  const isProfileRequestReady = Boolean(twitterId) && Boolean(userId);
  const isProfileHtmlReady = !isLoadingHtml && isProfileRequestReady;
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(
    Boolean(urlUid),
  );
  const [routeLoadingTimedOut, setRouteLoadingTimedOut] = useState(false);

  //删推信息,已改成twid查询
  const {
    data: deletedData,
    run: fetchDelData,
    loading: requestLoadingDel,
    cancel: cancelDelData,
    mutate: mutateDelData,
  } = useRequest(() => fetchDelTwitterInfo(twitterId), {
    refreshDeps: [twitterId, isProfileRequestReady],
    ready: isProfileRequestReady,
    ...defaultRequestConfig,
  });
  const deletedTweets = deletedData?.tweets ?? [];
  const deletedTweetsIsVip = deletedData?.isVip ?? true;

  //使用新接口获取用户信息,已改成twid查询
  const {
    data: newTwitterData = null,
    run: fetchTwitterData,
    loading: requestLoadingTwInfo,
    error: requestError,
    cancel: cancelTwitterData,
    mutate: mutateTwitterData,
  } = useRequest(() => fetchTwitterInfoNew(twitterId), {
    refreshDeps: [twitterId, isProfileRequestReady],
    ready: isProfileRequestReady,
    debounceWait: 50,
    debounceMaxWait: 50,
    manual: true,
    debounceLeading: true,
    debounceTrailing: true,
    retryCount: 3,
    onFinally: () => setIsRouteTransitioning(false),
  });

  // 灵魂指数也绑定 twitterId。ahooks 会暂存上一轮 data，附带请求身份后，
  // 切换人物期间旧结果不会参与新人物的摘要渲染。
  const {
    data: soulResult,
    run: fetchSoulData,
    loading: requestLoadingSoulData,
    cancel: cancelSoulData,
    mutate: mutateSoulData,
  } = useRequest(
    async () => {
      const requestTwitterId = String(twitterId || '');
      if (!requestTwitterId) return undefined;
      return {
        twitterId: requestTwitterId,
        data: await getSoulInfo(requestTwitterId),
      };
    },
    {
      refreshDeps: [twitterId, isProfileRequestReady],
      ready: isProfileRequestReady,
      ...defaultRequestConfig,
    },
  );
  const isSoulDataCurrent =
    Boolean(twitterId) && soulResult?.twitterId === String(twitterId);
  const soulData = isSoulDataCurrent ? soulResult?.data || null : null;

  // 🆕 转换新数据为旧格式
  const twInfo = useMemo(() => {
    if (!newTwitterData) return null;
    return convertNewDataToKolData(newTwitterData);
  }, [newTwitterData]);

  // 🆕 从新数据中提取讨论信息
  const discussionInfo = useMemo(() => {
    if (!newTwitterData) return null;
    return convertNewDataToPopularityInfo(newTwitterData);
  }, [newTwitterData]);

  /** root data 暂时只能用handler查询 */
  const {
    data: rootData = null,
    run: fetchRootData,
    loading: requestLoadingRootData,
    cancel: cancelRootData,
    mutate: mutateRootData,
  } = useRequest(() => fetchRootDataInfo(userId), {
    refreshDeps: [userId, isProfileRequestReady],
    ready: isProfileRequestReady,
    ...defaultRequestConfig,
  });

  /** 改名 暂时只能用handler查询 */
  const {
    data: renameInfo = null,
    run: fetchRenameInfo,
    loading: requestLoadingRenameInfo,
    cancel: cancelRenameInfo,
    mutate: mutateRenameInfo,
  } = useRequest(() => fetchTwRenameInfo(userId), {
    refreshDeps: [userId, isProfileRequestReady],
    ready: isProfileRequestReady,
    ...defaultRequestConfig,
  });

  /** 已经改成twid了，在统一请求中，handler兜底 */
  const {
    data: reviewInfo = null,
    run: fetchReviewInfo,
    loading: requestLoadingReviewInfo,
    cancel: cancelReviewInfo,
    mutate: mutateReviewInfo,
    refreshAsync: refreshAsyncReviewInfo,
  } = useRequest(() => getHandeReviewInfo(userId, reviewOnlyKol), {
    refreshDeps: [userId, isProfileRequestReady, reviewOnlyKol],
    ready: isProfileRequestReady,
    ...defaultRequestConfig,
  });

  /** 更新个人信息，无需当前浏览页面的userid/twid */
  const {
    data: userInfo = null,
    run: fetchUserInfo,
    loading: loadingUserInfo,
    refreshAsync: refreshAsyncUserInfo,
  } = useRequest(() => updateUserInfo(), {
    refreshDeps: [token],
    ...defaultRequestConfig,
  });

  /** 已改成twid查询 */
  const {
    data: projectMemberData = null,
    run: fetchProjectMemberData,
    loading: requestLoadingProjectMember,
    cancel: cancelProjectMemberData,
    mutate: mutateProjectMemberData,
  } = useRequest(() => fetchProjectMember(twitterId), {
    refreshDeps: [twitterId, isProfileRequestReady],
    ...defaultRequestConfig,
  });

  const { run: loadData } = useDebounceFn(
    async () => {
      fetchDelData();
      fetchTwitterData();
      fetchRootData();
      fetchRenameInfo();
      fetchSoulData();
    },
    {
      wait: 20,
      leading: false,
      trailing: true,
    },
  );

  // SPA profile 切换时，绘制前取消旧请求并清空上一位用户的数据。
  useLayoutEffect(() => {
    cancelDelData();
    cancelTwitterData();
    cancelRootData();
    cancelRenameInfo();
    cancelReviewInfo();
    cancelProjectMemberData();
    cancelSoulData();
    mutateDelData(undefined);
    mutateTwitterData(undefined);
    mutateRootData(undefined);
    mutateRenameInfo(undefined);
    mutateReviewInfo(undefined);
    mutateProjectMemberData(undefined);
    mutateSoulData(undefined);
    setRouteLoadingTimedOut(false);
    setIsRouteTransitioning(Boolean(urlUid));
  }, [urlUid]);

  useEffect(() => {
    if (!urlUid || !isRouteTransitioning) return;

    const timer = window.setTimeout(() => {
      setRouteLoadingTimedOut(true);
      setIsRouteTransitioning(false);
    }, 15_000);

    return () => window.clearTimeout(timer);
  }, [isRouteTransitioning, urlUid]);

  useEffect(() => {
    if (!isLoadingHtml && !isProfileHtmlReady) {
      setIsRouteTransitioning(false);
    }
  }, [isLoadingHtml, isProfileHtmlReady]);

  const loadingTwInfo =
    !routeLoadingTimedOut &&
    (isLoadingHtml || isRouteTransitioning || requestLoadingTwInfo);
  const loadingDel =
    !routeLoadingTimedOut &&
    (isLoadingHtml || isRouteTransitioning || requestLoadingDel);
  const loadingRootData =
    !routeLoadingTimedOut &&
    (isLoadingHtml || isRouteTransitioning || requestLoadingRootData);
  const loadingRenameInfo =
    !routeLoadingTimedOut &&
    (isLoadingHtml || isRouteTransitioning || requestLoadingRenameInfo);
  const loadingReviewInfo =
    !routeLoadingTimedOut &&
    (isLoadingHtml || isRouteTransitioning || requestLoadingReviewInfo);
  const loadingProjectMember =
    !routeLoadingTimedOut &&
    (isLoadingHtml || isRouteTransitioning || requestLoadingProjectMember);
  // Profile DOM 就绪到 useEffect 真正发起请求之间会有一帧空档，
  // 这时 ahooks.loading 仍为 false。当前人物还没有对应结果时继续视为 loading，
  // 避免“无灵魂指数内容 -> 骨架 -> 完整内容”的双重闪动。
  const loadingSoulData =
    !routeLoadingTimedOut &&
    (isLoadingHtml ||
      isRouteTransitioning ||
      requestLoadingSoulData ||
      (isProfileHtmlReady && !isSoulDataCurrent));
  const error = isRouteTransitioning ? undefined : requestError;

  useEffect(() => {
    if (!isProfileRequestReady) return;
    fetchReviewInfo();
    refreshAsyncUserInfo().then((r) => r);
  }, [reviewOnlyKol, token, isProfileRequestReady, twitterId, userId]);

  useEffect(() => {
    if (!isProfileRequestReady) return;
    loadData();
  }, [isProfileRequestReady, twitterId, userId]);

  // 单独处理项目成员数据请求 - 只有当用户是项目时才请求
  useEffect(() => {
    if (!isProfileRequestReady) return;
    if (!twInfo) return; // 等待 twInfo 加载完成

    // 只有当 classification 是 'project' 时才请求项目成员数据
    if (twInfo?.basicInfo?.classification === 'project') {
      fetchProjectMemberData();
    }
  }, [twInfo?.basicInfo?.classification, isProfileRequestReady]);
  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 将 newTwitterData 暴露给其他组件使用
  const projectMemberDataProxy = useMemo(() => {
    if (
      twInfo?.basicInfo?.classification === 'project' &&
      isProfileRequestReady
    ) {
      return projectMemberData;
    }
    return null;
  }, [
    twInfo?.basicInfo?.classification,
    projectMemberData,
    isProfileRequestReady,
  ]);
  const visibleDeletedTweets = loadingDel ? [] : deletedTweets;
  const visibleTwInfo = loadingTwInfo ? null : twInfo;
  const visibleRootData = loadingRootData ? null : rootData;
  const visibleRenameInfo = loadingRenameInfo ? null : renameInfo;
  const visibleReviewInfo = loadingReviewInfo ? null : reviewInfo;
  const visibleDiscussionInfo = loadingTwInfo ? null : discussionInfo;
  const visibleProjectMemberData = loadingProjectMember
    ? null
    : projectMemberDataProxy;
  const visibleNewTwitterData = loadingTwInfo ? null : newTwitterData;
  const visibleSoulData =
    loadingSoulData || !isSoulDataCurrent ? null : soulData;

  return useMemo(
    () => ({
      currentUrl,
      userId,
      deletedTweets: visibleDeletedTweets,
      deletedTweetsIsVip,
      twInfo: visibleTwInfo,
      loadingTwInfo,
      loadingDel,
      error,
      rootData: visibleRootData,
      loadingRootData,
      renameInfo: visibleRenameInfo,
      loadingRenameInfo,
      reviewInfo: visibleReviewInfo,
      loadingReviewInfo,
      refreshAsyncReviewInfo,
      userInfo,
      loadingUserInfo,
      refreshAsyncUserInfo,
      discussionInfo: visibleDiscussionInfo,
      loadingDiscussionInfo: loadingTwInfo,
      projectMemberData: visibleProjectMemberData,
      loadingProjectMember,
      newTwitterData: visibleNewTwitterData,
      soulData: visibleSoulData,
      loadingSoulData,
    }),
    [
      currentUrl,
      userId,
      visibleDeletedTweets,
      deletedTweetsIsVip,
      visibleTwInfo,
      loadingTwInfo,
      loadingDel,
      error,
      visibleRootData,
      loadingRootData,
      visibleRenameInfo,
      loadingRenameInfo,
      visibleReviewInfo,
      loadingReviewInfo,
      refreshAsyncReviewInfo,
      userInfo,
      loadingUserInfo,
      refreshAsyncUserInfo,
      visibleDiscussionInfo,
      visibleProjectMemberData,
      loadingProjectMember,
      visibleNewTwitterData,
      visibleSoulData,
      loadingSoulData,
    ],
  );
};

export default useMainData;
