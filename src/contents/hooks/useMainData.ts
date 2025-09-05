import { useDebounceEffect, useDebounceFn, useLatest, useRequest } from 'ahooks';
import {
  fetchDelTwitterInfo,
  fetchRootDataInfo,
  fetchProjectMember,
  fetchSupportedTokens,
  fetchTwitterInfoNew,
  convertNewDataToKolData,
  convertNewDataToPopularityInfo,
  fetchTwRenameInfo
} from '~contents/services/api.ts';
import { useEffect, useMemo, useState } from 'react';
import { extractUsernameFromUrl, windowGtag } from '~contents/utils';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import {
  AccountsResponse,
  DeletedTweet,
  InvestmentData,
  KolData,
  NewTwitterUserData,
  PopularityInfoType,
  ProjectMemberData,
  SupportedToken
} from '~types';
import { getHandeReviewInfo, updateUserInfo } from '~contents/services/review.ts';
import { ReviewStats, UserInfo } from '~types/review.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { rankService } from '~/utils/rankService';

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
}

const useMainData = (): MainData => {
  const currentUrl = useCurrentUrl();
  const [userId, setUserId] = useState('');
  const [reviewOnlyKol] = useLocalStorage('@xhunt/reviewOnlyKol', true);
  const [token] = useLocalStorage('@xhunt/token', '');
  const [username] = useLocalStorage('@xhunt/current-username', '');
  const userNameRef = useLatest(username);

  const { data: deletedTweets = [] as DeletedTweet[], run: fetchDelData, loading: loadingDel } = useRequest(() => fetchDelTwitterInfo(userId), {
    refreshDeps: [userId],
    ...defaultRequestConfig
  });

  // 🆕 使用新接口获取用户信息
  const { data: newTwitterData = null, run: fetchTwitterData, loading: loadingTwInfo, error } = useRequest(() => fetchTwitterInfoNew(userId), {
    refreshDeps: [userId],
    debounceWait: 50,
    debounceMaxWait: 50,
    manual: true,
    debounceLeading: true,
    debounceTrailing: true,
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

  const { data: rootData = null, run: fetchRootData, loading: loadingRootData } = useRequest(() => fetchRootDataInfo(userId), {
    refreshDeps: [userId],
    ...defaultRequestConfig
  });

  const { data: renameInfo = null, run: fetchRenameInfo, loading: loadingRenameInfo } = useRequest(() => fetchTwRenameInfo(userId), {
    refreshDeps: [userId],
    ...defaultRequestConfig
  });

  const { data: reviewInfo = null, run: fetchReviewInfo, loading: loadingReviewInfo, refreshAsync: refreshAsyncReviewInfo } = useRequest(() => getHandeReviewInfo(userId, reviewOnlyKol), {
    refreshDeps: [userId, reviewOnlyKol],
    ...defaultRequestConfig
  });

  const { data: userInfo = null, run: fetchUserInfo, loading: loadingUserInfo, refreshAsync: refreshAsyncUserInfo } = useRequest(() => updateUserInfo(), {
    refreshDeps: [token],
    ...defaultRequestConfig
  });

  const { data: supportedTokens = null, run: fetchSupportedTokensData, loading: loadingSupportedTokens } = useRequest(fetchSupportedTokens, {
    ...defaultRequestConfig
  });

  const { data: projectMemberData = null, run: fetchProjectMemberData, loading: loadingProjectMember } = useRequest(() => fetchProjectMember(userId), {
    refreshDeps: [userId],
    ...defaultRequestConfig
  });

  const { run: loadData } = useDebounceFn(async () => {
    fetchDelData();
    fetchTwitterData();
    fetchRootData();
    fetchRenameInfo();
    fetchReviewInfo();
  }, {
    wait: 1000,
    leading: true,
    trailing: false
  });

  useEffect(() => {
    /** 至少1个字符的id **/
    if (!userId || String(userId).length < 1) return;
    fetchReviewInfo();
    refreshAsyncUserInfo().then(r => r);
  }, [reviewOnlyKol, token]);

  useEffect(() => {
    if (!userId || String(userId).length < 1) return;
    loadData()
    windowGtag('event', 'loadMainData', {
      value: `${userNameRef.current} | ${userId}`
    })
  }, [userId]);

  // 单独处理项目成员数据请求 - 只有当用户是项目时才请求
  useEffect(() => {
    if (!userId || String(userId).length < 1) return;
    if (!twInfo) return; // 等待 twInfo 加载完成

    // 只有当 classification 是 'project' 时才请求项目成员数据
    if (twInfo?.basicInfo?.classification === 'project') {
      fetchProjectMemberData();
    }
  }, [userId, twInfo?.basicInfo?.classification]);
  useEffect(() => {
    fetchUserInfo();
    fetchSupportedTokensData();
  }, [])

  useDebounceEffect(() => {
    const uid = extractUsernameFromUrl(currentUrl);
    setUserId(uid);
  }, [currentUrl], { wait: 100, maxWait: 500, leading: true });

  // // 监听 kolRank20W 变化并更新排名缓存
  // useDebounceEffect(() => {
  //   if (userId && twInfo?.kolFollow?.kolRank20W !== undefined) {
  //     // 预加载当前用户的排名到缓存
  //     rankService.preloadRanks([userId]);
  //   }
  // }, [twInfo?.kolFollow?.kolRank20W], {
  //   wait: 1000,
  //   maxWait: 5000,
  //   leading: false,
  //   trailing: true
  // });

  // 将 newTwitterData 暴露给其他组件使用
  const projectMemberDataProxy = useMemo(() => {
    if (twInfo?.basicInfo?.classification === 'project' && userId) {
      return projectMemberData;
    }
    return null;
  }, [projectMemberData, userId])

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
    newTwitterData // 🆕 暴露 newTwitterData 供其他组件使用
  }
}

export default useMainData;
