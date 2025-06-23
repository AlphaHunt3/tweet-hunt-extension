import { useDebounceEffect, useDebounceFn, useRequest } from 'ahooks';
import {
  fetchDelTwitterInfo,
  fetchRootDataInfo,
  fetchSupportedTokens,
  fetchTwitterDiscussionPopularity,
  fetchTwitterInfo,
  fetchTwRenameInfo
} from '~contents/services/api.ts';
import { useEffect, useState } from 'react';
import { extractUsernameFromUrl } from '~contents/utils';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { AccountsResponse, DeletedTweet, InvestmentData, KolData, PopularityInfoType, SupportedToken } from '~types';
import { getHandeReviewInfo, updateUserInfo } from '~contents/services/review.ts';
import { ReviewStats, UserInfo } from '~types/review.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

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
  discussionInfo: PopularityInfoType | null;
  loadingDiscussionInfo: boolean;
  supportedTokens: SupportedToken[] | null;
  loadingSupportedTokens: boolean;
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

  const { data: deletedTweets = [] as DeletedTweet[], run: fetchDelData, loading: loadingDel } = useRequest(() => fetchDelTwitterInfo(userId), {
    refreshDeps: [userId],
    ...defaultRequestConfig
  });

  const { data: twInfo = null, run: fetchTwitterData, loading: loadingTwInfo, error } = useRequest(() => fetchTwitterInfo(userId), {
    refreshDeps: [userId],
    debounceWait: 50,
    debounceMaxWait: 50,
    manual: true,
    debounceLeading: true,
    debounceTrailing: true,
  });

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
    debounceWait: 50,
    debounceMaxWait: 50,
    manual: true,
    debounceLeading: true,
    debounceTrailing: true,
  });

  const { data: userInfo = null, run: fetchUserInfo, loading: loadingUserInfo, refreshAsync: refreshAsyncUserInfo } = useRequest(() => updateUserInfo(), {
    refreshDeps: [token],
    ...defaultRequestConfig
  });

  const { data: discussionInfo = null, run: fetchDiscussionInfo, loading: loadingDiscussionInfo } = useRequest(() => fetchTwitterDiscussionPopularity(userId), {
    refreshDeps: [userId],
    ...defaultRequestConfig
  });

  const { data: supportedTokens = null, run: fetchSupportedTokensData, loading: loadingSupportedTokens } = useRequest(fetchSupportedTokens, {
    ...defaultRequestConfig
  });

  const { run: loadData } = useDebounceFn(async () => {
    fetchDelData();
    fetchTwitterData();
    fetchRootData();
    fetchRenameInfo();
    fetchReviewInfo();
    fetchDiscussionInfo();
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
  }, [userId]);

  useEffect(() => {
    fetchUserInfo();
    fetchSupportedTokensData();
  }, [])

  useDebounceEffect(() => {
    const uid = extractUsernameFromUrl(currentUrl);
    setUserId(uid);
  }, [currentUrl], { wait: 300, leading: true });

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
    loadingDiscussionInfo,
    supportedTokens,
    loadingSupportedTokens
  }
}

export default useMainData;
