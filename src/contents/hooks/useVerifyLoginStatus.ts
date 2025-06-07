import useFetchTwId from '~contents/hooks/useFetchTwId.ts';
import { useEffect } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

export const useVerifyLoginStatus = () => {
  const [token, setToken] = useLocalStorage('@xhunt/token', '');
  const [user, setUser] = useLocalStorage<{
    avatar: string;
    displayName: string;
    username: string;
    id: string;
    twitterId: string;
  } | null | ''>('@xhunt/user', null);
  // const [, setTips] = useGlobalTips();
  const { data: twId, loading: loadingTwId } = useFetchTwId();
  useEffect(() => {
    if (!loadingTwId && user && token) {
      if(!user.twitterId || !twId?.includes(user.twitterId)) {
        setToken('');
        setUser('');
        // setTips("登录已过期");
      }
    }
  }, [loadingTwId, user, token]);
}
