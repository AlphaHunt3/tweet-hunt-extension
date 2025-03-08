import { useDebounceEffect, useDebounceFn, useLockFn } from 'ahooks';
import { fetchDelTwitterInfo, fetchTwitterInfo } from '~contents/services/api.ts';
import { useEffect, useState } from 'react';
import { extractUsernameFromUrl } from '~contents/utils';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { DeletedTweet, KolData } from '~types';

export interface MainData {
  currentUrl: string;
  userId: string;
  deletedTweets: DeletedTweet[];
  twInfo: KolData;
  loadingTwInfo: boolean;
  loadingDel: boolean;
  error: string | null;
}

const useMainData = (): MainData => {
  const currentUrl = useCurrentUrl();
  const [userId, setUserId] = useState('');
  const [deletedTweets, setDeletedTweets] = useState([]);
  const [twInfo, setTwInfo] = useState<KolData>(null);
  const [loadingTwInfo, setLoadingTwInfo] = useState(true);
  const [loadingDel, setLoadingDel] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { run: fetchDelData } = useDebounceFn(async () => {
    try {
      if (!userId || String(userId) <= 4) return;
      setLoadingDel(true);
      setError(null);
      const [{ value: deletedAry }] = await Promise.allSettled([
        fetchDelTwitterInfo(userId),
      ]);
      setDeletedTweets(deletedAry);
    } catch (err) {
      // setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoadingDel(false)
    }
  }, {
    leading: true,
    trailing: false,
    wait: 1000
  })

  const loadData = useLockFn(async () => {
    try {
      if (!userId || String(userId) <= 4) return;
      setLoadingTwInfo(true);
      setError(null);
      fetchDelData().then(r => r);
      const [{ value: userStats }] = await Promise.allSettled([
        fetchTwitterInfo(userId),
      ]);
      setTwInfo(userStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoadingTwInfo(false)
    }
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
    error
  }
}

export default useMainData;
