import React, { useRef } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import cssText from 'data-text:~/css/style.css';
import { AI_CHAT_EVENT, KolType } from '../KolAiChatDialog.tsx';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { getTwitterAuthUrl, fetchKolChatList } from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import { useLockFn, useRequest } from 'ahooks';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import { SkinScope } from '~/ui/skin/SkinScope';
import { AiPill, findKol, kolButtonLabel, visibleKols } from '~/ui/profile/ProfileActions';
import { useI18n } from '~contents/hooks/i18n.ts';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';

function _KolAiChatButton() {
  const { t, lang } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const keepSocialCircleFirst = React.useCallback(
    (_shadowRoot: ShadowRoot, host: HTMLElement) => {
      const socialCircleHost =
        host.parentElement?.querySelector<HTMLElement>(
          '[data-xhunt-shadow-container-key="kol-social-circle"]',
        );
      if (socialCircleHost && socialCircleHost !== host) {
        host.parentElement?.insertBefore(socialCircleHost, host);
      }
    },
    [],
  );
  const shadowRoot = useShadowContainer({
    selector:
      'div[data-testid="placementTracking"], a[data-testid="editProfileButton"]',
    useSiblings: true,
    siblingsPosition: 'beforebegin',
    styleText: cssText,
    containerKey: 'kol-ai-chat',
    cleanupStaleSiblings: true,
    onShadowCreated: keepSocialCircleFirst,
    shadowMode: 'open',
  });
  const portalHost = usePersistentPortalHost(shadowRoot);

  const [token] = useLocalStorage('@xhunt/token', '');
  const isLoggedIn = !!token;

  // 使用 usePlacementTracking 获取当前页面的 handler
  const { handler } = usePlacementTracking();

  // 读取设置开关
  const { isEnabled, isTesterOnly } = useCrossPageSettings();
  const showAiAvatarButton = isEnabled('showAiAvatarButton');

  // 远程独立开关 官方和非官方
  const showAiAvatarButtonOfficial = isEnabled('showAiAvatarButton_official');
  const showAiAvatarButtonUnofficial = isEnabled(
    'showAiAvatarButton_unofficial',
  );

  const { data: kolListData, loading: isKolLoading } = useRequest(
    fetchKolChatList,
    {
      ready: showAiAvatarButton, // 仅在设置开启时请求
      cacheKey: 'kol-chat-list', // 缓存结果
      staleTime: 60 * 1000, // 1分钟内不重新请求
      debounceWait: 300, // 防抖 300ms
    },
  );

  const kolList = React.useMemo(
    () => visibleKols(kolListData, isTesterOnly),
    [kolListData, isTesterOnly],
  );

  const redirectToLogin = useLockFn(async () => {
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
    }
  });

  const currentKol = React.useMemo(
    () => findKol(kolList, handler),
    [handler, kolList],
  );
  const isKolInList = !!currentKol;
  const buttonLabel = currentKol
    ? kolButtonLabel(currentKol, lang, t)
    : t('aiAvatar');

  const handleAskXHuntClick = () => {
    if (!isLoggedIn) {
      redirectToLogin();
      return;
    }
    // 确保buttonRef.current存在
    if (!buttonRef.current) {
      console.log('Button ref not found');
      return;
    }

    const targetKol = currentKol;

    // 触发AI聊天事件
    const event = new CustomEvent(AI_CHAT_EVENT, {
      detail: {
        userId: handler,
        element: buttonRef.current,
        kolId: targetKol?.id || '',
        kolType: (targetKol?.type || 'unofficial') as KolType,
        perspectiveName:
          lang === 'zh'
            ? targetKol?.perspective_name_zh || targetKol?.name || handler
            : targetKol?.perspective_name_en || targetKol?.name || handler,
      },
    });
    window.dispatchEvent(event);
  };

  // 只有在有userId时才返回内容视图，且当前用户在 KOL 列表中，且设置开启
  if (
    !handler ||
    !shadowRoot ||
    isKolLoading ||
    !isKolInList ||
    !showAiAvatarButton
  )
    return null;
  if (!showAiAvatarButtonOfficial && currentKol?.type === 'official')
    return null; // 独立控制授权kol
  if (!showAiAvatarButtonUnofficial && currentKol?.type === 'unofficial')
    return null; // 独立控制非授权kol

  return ReactDOM.createPortal(
    <SkinScope>
      <div data-xhunt-testid='kol-ai-chat-button' className='xh-action-slot'>
        <AiPill
          ref={buttonRef}
          label={buttonLabel}
          badge={t('betaBadge')}
          onClick={handleAskXHuntClick}
        />
      </div>
    </SkinScope>,
    portalHost!,
  );
}

export const KolAiChatButton = React.memo(_KolAiChatButton);
