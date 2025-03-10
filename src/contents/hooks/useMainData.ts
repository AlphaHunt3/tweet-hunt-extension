import { useDebounceEffect, useDebounceFn, useLockFn, useRequest } from 'ahooks';
import { fetchDelTwitterInfo, fetchRootDataInfo, fetchTwitterInfo } from '~contents/services/api.ts';
import { useEffect, useState } from 'react';
import { extractUsernameFromUrl } from '~contents/utils';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { DeletedTweet, InvestmentData, KolData } from '~types';
import { useTwitterUserInfo } from '~contents/hooks/useTwitterUserInfo.ts';

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
}

const useMainData = (): MainData => {
  const currentUrl = useCurrentUrl();
  const [userId, setUserId] = useState('');
  const userName = useTwitterUserInfo();
  const { data: deletedTweets = [] as DeletedTweet[], run: fetchDelData, loading: loadingDel } = useRequest(() => fetchDelTwitterInfo(userId), {
    refreshDeps: [userId],
    debounceWait: 1000,
    manual: true,
    debounceLeading: true,
    debounceTrailing: false,
  });
  const { data: twInfo = null, run: fetchTwitterData, loading: loadingTwInfo, error } = useRequest(() => fetchTwitterInfo(userId), {
    refreshDeps: [userId],
    debounceWait: 1000,
    manual: true,
    debounceLeading: true,
    debounceTrailing: false,
  });

  const { data: rootData = null, run: fetchRootData, loading: loadingRootData } = useRequest(() => fetchRootDataInfo(userName?.displayName as string), {
    refreshDeps: [userName],
    debounceWait: 1000,
    manual: true,
    debounceLeading: true,
    debounceTrailing: false,
  });

  const loadData = useLockFn(async () => {
    if (!userId || String(userId) <= 4) return;
    fetchDelData();
    fetchTwitterData();
  });

  useEffect(() => {
    loadData().then(r => r);
  }, [userId]);
  useEffect(() => {
    userName && userName.displayName && fetchRootData();
  }, [userName]);
  useDebounceEffect(() => {
    const uid = extractUsernameFromUrl(currentUrl);
    setUserId(uid);
  }, [currentUrl], { wait: 500 });
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
  }
}

export default useMainData;
