import React, { useRef } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import cssText from 'data-text:~/css/style.css';
import { Sparkles } from 'lucide-react';
import { AI_CHAT_EVENT, KolType } from '../KolAiChatDialog.tsx';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { getTwitterAuthUrl, fetchKolChatList } from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import { useLockFn, useRequest } from 'ahooks';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import { useI18n } from '~contents/hooks/i18n.ts';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';

function _KolAiChatButton() {
  const { t, lang } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shadowRoot = useShadowContainer({
    selector:
      'div[data-testid="placementTracking"], a[data-testid="editProfileButton"]',
    useSiblings: true,
    siblingsPosition: 'beforebegin',
    styleText: cssText,
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

  // 使用 useRequest 加载 KOL 列表（自动防抖 + 缓存）
  const { data: rawKolList = [], loading: isKolLoading } = useRequest(
    fetchKolChatList,
    {
      ready: showAiAvatarButton, // 仅在设置开启时请求
      cacheKey: 'kol-chat-list', // 缓存结果
      staleTime: 60 * 1000, // 1分钟内不重新请求
      debounceWait: 300, // 防抖 300ms
    },
  );

  // 非 public 的条目仅对测试人员可见
  const kolList = React.useMemo(() => {
    return rawKolList.filter((item) =>
      item.visibility === 'public' ? true : isTesterOnly,
    );
  }, [rawKolList, isTesterOnly]);

  const redirectToLogin = useLockFn(async () => {
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
    }
  });

  // 检查当前用户是否在 KOL 列表中，并获取 KOL 信息
  const currentKol = React.useMemo(() => {
    if (!handler || kolList.length === 0) return undefined;
    const normalizedHandler = handler.toLowerCase().replace(/^@/, '');
    return kolList.find(
      (k) => k.twitter_handle.toLowerCase() === normalizedHandler,
    );
  }, [handler, kolList]);

  const isKolInList = !!currentKol;

  // 计算按钮文案
  const buttonLabel = React.useMemo(() => {
    if (!currentKol) return t('aiAvatar');

    if (currentKol.type === 'official') {
      // 官方授权：使用 "AI 分身" 或定制名称
      return lang === 'zh'
        ? currentKol.perspective_name_zh || t('aiAvatar')
        : currentKol.perspective_name_en || t('aiAvatar');
    } else {
      // 非官方：使用 "XX思维" / "XX Perspective"
      return lang === 'zh'
        ? currentKol.perspective_name_zh || `${currentKol.name}思维`
        : currentKol.perspective_name_en || `${currentKol.name} Perspective`;
    }
  }, [currentKol, lang, t]);

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

    // 找到当前 KOL 信息
    const normalizedHandler = handler?.toLowerCase().replace(/^@/, '') || '';
    const targetKol = kolList.find(
      (k) => k.twitter_handle.toLowerCase() === normalizedHandler,
    );

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
    <div
      style={{
        marginRight: 8,
        marginBottom: 12,
      }}
      className='theme-bg-primary'
    >
      <button
        ref={buttonRef}
        onClick={handleAskXHuntClick}
        className='h-[36px] px-3 border xhunt-ask-border xhunt-ask-bg rounded-full transition-all duration-500 flex items-center gap-1.5 relative group backdrop-blur-sm'
        title={buttonLabel}
      >
        <Sparkles className='w-4 h-4 xhunt-ask-icon' />
        <span className='text-sm font-medium xhunt-ask-text'>
          {buttonLabel}
        </span>
        {/* Beta 悬浮角标 */}
        <span className='absolute -top-1.5 -right-1 px-[3px] py-[1px] text-[7px] leading-none font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-[3px] shadow-sm pointer-events-none'>
          BETA
        </span>
        <span className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap'>
          {buttonLabel}
        </span>
      </button>
    </div>,
    portalHost!,
  );
}

export const KolAiChatButton = React.memo(_KolAiChatButton);
