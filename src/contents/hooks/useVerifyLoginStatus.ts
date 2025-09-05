import useFetchTwId from '~contents/hooks/useFetchTwId.ts';
import { useEffect } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { clearAuthState } from '~contents/utils/auth.ts';
import useWaitForElement from './useWaitForElement';
import { useDebounceEffect } from 'ahooks';
import { userLogout } from '~contents/services/review';
import useCurrentUrl from './useCurrentUrl';

export const useVerifyLoginStatus = () => {
  const currentUrl = useCurrentUrl();
  const [token, setToken] = useLocalStorage('@xhunt/token', '');
  const [user, setUser] = useLocalStorage<
    | {
        avatar: string;
        displayName: string;
        username: string;
        id: string;
        twitterId: string;
      }
    | null
    | ''
  >('@xhunt/user', null);
  const isCallbackUrl = currentUrl.includes('account/xhunt');
  const { data: twId, loading: loadingTwId } = useFetchTwId();
  const userLink = useWaitForElement('[data-testid="AppTabBar_Profile_Link"]', [
    twId,
  ]);

  useDebounceEffect(
    () => {
      if (loadingTwId || isCallbackUrl) return;
      if (!user || !token) return;

      const twitterIdMissingOrMismatch =
        !user.twitterId || !twId?.includes(user.twitterId);
      // 从 Profile 链接中解析用户名（形如 /UserName123）并做大小写不敏感对比
      let profileUsernameFromHref: string | null = null;
      if (userLink && userLink instanceof HTMLElement) {
        const anchor = userLink.closest('a') as HTMLAnchorElement | null;
        const href =
          anchor?.getAttribute('href') ||
          (userLink as HTMLAnchorElement).getAttribute?.('href') ||
          '';
        if (href && href.startsWith('/')) {
          // 去除开头的 '/'
          const candidate = href.slice(1).split('?')[0].split('/')[0].trim();
          profileUsernameFromHref = candidate || null;
        }
      }

      const usernameMismatch =
        !!profileUsernameFromHref &&
        !!user.username &&
        profileUsernameFromHref.toLowerCase() !== user.username.toLowerCase();
      if (twitterIdMissingOrMismatch && userLink && usernameMismatch) {
        console.log(
          '用户已经退出登录（twid 与用户名均不匹配），清除token和用户信息'
        );
        (async () => {
          clearAuthState();
          setToken('');
          setUser('');
          // 刷新当前页面
          setTimeout(() => {
            window.location.reload();
          }, 300);
        })();
      }
    },
    [loadingTwId, user, token, twId, userLink, isCallbackUrl],
    {
      wait: 100,
      maxWait: 300,
      leading: true,
    }
  );
};
