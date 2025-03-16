import { useDebounceEffect, useLockFn, useRequest } from 'ahooks';
import { fetchDelTwitterInfo, fetchRootDataInfo, fetchTwitterInfo, fetchTwRenameInfo } from '~contents/services/api.ts';
import { useEffect, useState } from 'react';
import { extractUsernameFromUrl } from '~contents/utils';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { AccountsResponse, DeletedTweet, InvestmentData, KolData } from '~types';

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
}

const useMainData = (): MainData => {
  const currentUrl = useCurrentUrl();
  const [userId, setUserId] = useState('');
  // const userName = useTwitterUserInfo();
  const { data: deletedTweets = [] as DeletedTweet[], run: fetchDelData, loading: loadingDel } = useRequest(() => fetchDelTwitterInfo(userId), {
    refreshDeps: [userId],
    debounceWait: 300,
    manual: true,
    debounceLeading: true,
    debounceTrailing: false,
  });
  const { data: twInfo = null, run: fetchTwitterData, loading: loadingTwInfo, error } = useRequest(() => fetchTwitterInfo(userId), {
    refreshDeps: [userId],
    debounceWait: 300,
    manual: true,
    debounceLeading: true,
    debounceTrailing: false,
  });

  const { data: rootData = null, run: fetchRootData, loading: loadingRootData } = useRequest(() => fetchRootDataInfo(userId), {
    refreshDeps: [userId],
    debounceWait: 300,
    manual: true,
    debounceLeading: true,
    debounceTrailing: false,
  });

  const { data: renameInfo = null, run: fetchRenameInfo, loading: loadingRenameInfo } = useRequest(() => fetchTwRenameInfo(userId), {
    refreshDeps: [userId],
    debounceWait: 300,
    manual: true,
    debounceLeading: true,
    debounceTrailing: false,
  });

  const loadData = useLockFn(async () => {
    if (!userId || String(userId) <= 4) return;
    fetchDelData();
    fetchTwitterData();
    fetchRootData();
    fetchRenameInfo();
  });

  useEffect(() => {
    loadData().then(r => r);
  }, [userId]);
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
    renameInfo,
    loadingRenameInfo
  }
}

export default useMainData;
