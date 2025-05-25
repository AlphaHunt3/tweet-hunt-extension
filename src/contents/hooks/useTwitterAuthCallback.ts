import { useEffect, useRef } from 'react';
import { parseURLParams } from '~contents/utils';
import { postTwitterCallback } from '~contents/services/api.ts';
import { useStorage } from '@plasmohq/storage/hook';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { useGlobalTips } from '~compontents/area/GlobalTips.tsx';
import { useI18n } from '~contents/hooks/i18n.ts';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import { useLockFn } from 'ahooks';

/**
 * Twitter OAuth 回调处理 Hook
 */
const useTwitterAuthCallback = () => {
  const currentUrl = useCurrentUrl();
  const [, setToken] = useStorage('@xhunt/token', '');
  const [, setUser] = useStorage('@xhunt/user', null);
  const [, setTips] = useGlobalTips();
  const { t } = useI18n();
  const isCallbackUrl = currentUrl.includes('account/xhunt');
  const sectionHeader404 = useWaitForElement('section[aria-labelledby=\'detail-header\']', [isCallbackUrl], 5000);
  const errorDom404 = useWaitForElement('div[data-testid=\'error-detail\']', [isCallbackUrl], 5000);
  const hadSetDom = useRef(false);
  const strLoggingIn = t('loggingIn');
  // const strLoginSuccess = t('loginSuccess');
  const handleAuthCallback = useLockFn(async (code: string, state: string) => {
    try {
      const response = await postTwitterCallback({
        code: code,
        state: state,
      });
      if (!response) {
        throw new Error('Invalid response');
      }
      const { token, user } = response;
      setToken(token);
      // @ts-ignore
      setUser(user);
      setTips({
        text: "登录成功",
        type: 'suc'
      });
      window.close();

    } catch (error) {
      // console.error('Twitter 登录失败:', error);
      setTips({
        text: `Twitter 登录失败: ${error}`,
        type: 'warning'
      });
      window.close();
    }
  });
  useEffect(() => {
    if (isCallbackUrl && (sectionHeader404 || errorDom404) && !hadSetDom.current) {
      hadSetDom.current = true;
      setTimeout(() => {
        const loginText = `<div style="width: 100%; font-size: 14px; text-align: center;margin-top: 100px;">
            XHunt: ${t('loggingIn')}
        </div>`;
        sectionHeader404 && (sectionHeader404.innerHTML = loginText);
        errorDom404 && (errorDom404.innerHTML = loginText);
      }, 200);
    }
    return () => {
      hadSetDom.current = false;
    }
  }, [sectionHeader404, errorDom404, isCallbackUrl]);
  useEffect(() => {
    if (!isCallbackUrl) return;

    const params = parseURLParams(currentUrl);
    const { code, state } = params;

    // 验证必要参数是否存在
    if (!code || !state) return;

    setTips(strLoggingIn);

    handleAuthCallback(String(code), String(state)).then(r => r);


  }, [currentUrl, isCallbackUrl, strLoggingIn]);
};

export default useTwitterAuthCallback;
