import {
  useDebounceEffect,
  useDebounceFn,
  useLatest,
  useRequest,
} from 'ahooks';
import {
  fetchDelTwitterInfo,
  fetchRootDataInfo,
  fetchProjectMember,
  fetchSupportedTokens,
  fetchTwitterInfoNew,
  convertNewDataToKolData,
  convertNewDataToPopularityInfo,
  fetchTwRenameInfo,
} from '~contents/services/api.ts';
import { useEffect, useMemo, useState } from 'react';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import {
  AccountsResponse,
  DeletedTweet,
  InvestmentData,
  KolData,
  NewTwitterUserData,
  PopularityInfoType,
  ProjectMemberData,
  SupportedToken,
} from '~types';
import {
  getHandeReviewInfo,
  updateUserInfo,
} from '~contents/services/review.ts';
import { ReviewStats, UserInfo } from '~types/review.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import usePlacementTracking from './usePlacementTracking';

export interface MainData {
  currentUrl: string;
  userId: string;
  deletedTweets: DeletedTweet[];
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
  supportedTokens: SupportedToken[] | null;
  loadingSupportedTokens: boolean;
  projectMemberData: ProjectMemberData | null;
  loadingProjectMember: boolean;
  newTwitterData: NewTwitterUserData | null;
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
    twitterId,
    handler: userId,
    loading: isLoadingHtml,
  } = usePlacementTracking();
  const isProfileHtmlReady =
    !isLoadingHtml && Boolean(twitterId) && Boolean(userId);

  //删推信息,已改成twid查询
  const {
    data: deletedTweets = [] as DeletedTweet[],
    run: fetchDelData,
    loading: loadingDel,
  } = useRequest(() => fetchDelTwitterInfo(twitterId), {
    refreshDeps: [twitterId, isProfileHtmlReady],
    ready: isProfileHtmlReady,
    ...defaultRequestConfig,
  });

  //使用新接口获取用户信息,已改成twid查询
  const {
    data: newTwitterData = null,
    run: fetchTwitterData,
    loading: loadingTwInfo,
    error,
  } = useRequest(() => fetchTwitterInfoNew(twitterId), {
    refreshDeps: [twitterId, isProfileHtmlReady],
    ready: isProfileHtmlReady,
    debounceWait: 50,
    debounceMaxWait: 50,
    manual: true,
    debounceLeading: true,
    debounceTrailing: true,
    retryCount: 3,
  });

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
    loading: loadingRootData,
  } = useRequest(() => fetchRootDataInfo(userId), {
    refreshDeps: [userId, isProfileHtmlReady],
    ready: isProfileHtmlReady,
    ...defaultRequestConfig,
  });

  /** 改名 暂时只能用handler查询 */
  const {
    data: renameInfo = null,
    run: fetchRenameInfo,
    loading: loadingRenameInfo,
  } = useRequest(() => fetchTwRenameInfo(userId), {
    refreshDeps: [userId, isProfileHtmlReady],
    ready: isProfileHtmlReady,
    ...defaultRequestConfig,
  });

  /** 已经改成twid了，在统一请求中，handler兜底 */
  const {
    data: reviewInfo = null,
    run: fetchReviewInfo,
    loading: loadingReviewInfo,
    refreshAsync: refreshAsyncReviewInfo,
  } = useRequest(() => getHandeReviewInfo(userId, reviewOnlyKol), {
    refreshDeps: [userId, isProfileHtmlReady, reviewOnlyKol],
    ready: isProfileHtmlReady,
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

  /** 查询支持的token，无需当前浏览页面的userid/twid */
  const {
    data: supportedTokens = null,
    run: fetchSupportedTokensData,
    loading: loadingSupportedTokens,
  } = useRequest(fetchSupportedTokens, {
    ...defaultRequestConfig,
  });

  /** 已改成twid查询 */
  const {
    data: projectMemberData = null,
    run: fetchProjectMemberData,
    loading: loadingProjectMember,
  } = useRequest(() => fetchProjectMember(twitterId), {
    refreshDeps: [twitterId, isProfileHtmlReady],
    ...defaultRequestConfig,
  });

  const { run: loadData } = useDebounceFn(
    async () => {
      fetchDelData();
      fetchTwitterData();
      fetchRootData();
      fetchRenameInfo();
      fetchReviewInfo();
    },
    {
      wait: 20,
      leading: false,
      trailing: true,
    }
  );

  useEffect(() => {
    if (!isProfileHtmlReady) return;
    fetchReviewInfo();
    refreshAsyncUserInfo().then((r) => r);
  }, [reviewOnlyKol, token, isProfileHtmlReady]);

  useEffect(() => {
    if (!isProfileHtmlReady) return;
    loadData();
  }, [isProfileHtmlReady]);

  // 单独处理项目成员数据请求 - 只有当用户是项目时才请求
  useEffect(() => {
    if (!isProfileHtmlReady) return;
    if (!twInfo) return; // 等待 twInfo 加载完成

    // 只有当 classification 是 'project' 时才请求项目成员数据
    if (twInfo?.basicInfo?.classification === 'project') {
      fetchProjectMemberData();
    }
  }, [twInfo?.basicInfo?.classification, isProfileHtmlReady]);
  useEffect(() => {
    fetchUserInfo();
    fetchSupportedTokensData();
  }, []);

  // 将 newTwitterData 暴露给其他组件使用
  const projectMemberDataProxy = useMemo(() => {
    if (twInfo?.basicInfo?.classification === 'project' && isProfileHtmlReady) {
      return projectMemberData;
    }
    return null;
  }, [projectMemberData, isProfileHtmlReady]);

  return {
    currentUrl,
    userId,
    deletedTweets,
    twInfo,
    loadingTwInfo,
    loadingDel,
    error,
    rootData,
    loadingRootData,
    renameInfo,
    loadingRenameInfo,
    reviewInfo,
    loadingReviewInfo,
    refreshAsyncReviewInfo,
    userInfo,
    loadingUserInfo,
    refreshAsyncUserInfo,
    discussionInfo,
    loadingDiscussionInfo: loadingTwInfo,
    supportedTokens,
    loadingSupportedTokens,
    projectMemberData: projectMemberDataProxy,
    loadingProjectMember,
    newTwitterData,
  };
};

export default useMainData;
