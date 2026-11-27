import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactDOM from 'react-dom';
import { LockKeyhole, Network, X } from 'lucide-react';
import { useLockFn } from 'ahooks';
import cssText from 'data-text:~/css/style.css';
import { VipUpgradeActions } from '~compontents/VipUpgradeActions';
import useShadowContainer from '~contents/hooks/useShadowContainer';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { useI18n } from '~contents/hooks/i18n';
import { useCrossPageSettings } from '~utils/settingsManager';
import { useLocalStorage } from '~storage/useLocalStorage';
import {
  FloatingContainer,
  type FloatingContainerRef,
} from '~compontents/FloatingContainer';
import useKolSocialCircle from './useKolSocialCircle';
import SocialCircleDialog from './SocialCircleDialog';
import { resolveProfileDom } from '~contents/utils/xDomAdapter';
import { getTwitterAuthUrl } from '~contents/services/api';
import { openNewTab } from '~contents/utils';

const PROFILE_ACTION_SELECTOR =
  'div[data-testid="placementTracking"], a[data-testid="editProfileButton"]';
const SOCIAL_CIRCLE_CONTAINER_KEY = 'kol-social-circle';
const AI_AVATAR_CONTAINER_KEY = 'kol-ai-chat';
const CONTAINER_KEY_ATTRIBUTE = 'data-xhunt-shadow-container-key';
const FLOATING_HOST_ID = 'xhunt-social-circle-dialog-host';
const LIMIT_DIALOG_OFFSET_X = -158;
const LIMIT_DIALOG_OFFSET_Y = 56;

const getOrCreateFloatingPortal = () => {
  let host = document.getElementById(FLOATING_HOST_ID) as HTMLElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = FLOATING_HOST_ID;
    host.style.cssText =
      'position:fixed;inset:0;width:0;height:0;z-index:2147483000;pointer-events:none;overflow:visible;';
    host.setAttribute('translate', 'no');
    host.classList.add('notranslate');
    if (document.body?.parentNode) {
      // 新版 X 会清理追加在 body 后面的 html 直属节点；放在 body 前可避免
      // Portal 宿主脱离 DOM 后 React 仍渲染、但用户完全看不到弹窗。
      document.body.parentNode.insertBefore(host, document.body);
    } else {
      document.documentElement.appendChild(host);
    }

    const shadowRoot = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = cssText;
    shadowRoot.appendChild(style);

    const portal = document.createElement('div');
    portal.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:2147483000;';
    portal.setAttribute('translate', 'no');
    portal.classList.add('notranslate');
    shadowRoot.appendChild(portal);
    return portal;
  }

  return host.shadowRoot?.querySelector('div') as HTMLElement | null;
};

function SocialCircleLimitDialog({
  isVip,
  t,
  onClose,
}: {
  isVip: boolean;
  t: (key: string, fallback?: string) => string;
  onClose: () => void;
}) {
  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='xhunt-social-circle-limit-title'
      className='relative w-[360px] max-w-full p-3 text-center'
    >
      <button
        type='button'
        aria-label={t('close', 'Close')}
        onClick={onClose}
        className='absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full theme-text-secondary theme-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9BF0]'
      >
        <X className='h-4 w-4' aria-hidden='true' />
      </button>
      <LockKeyhole
        aria-hidden='true'
        size={22}
        className='mx-auto mb-2 text-amber-500'
      />
      <p
        id='xhunt-social-circle-limit-title'
        className='text-sm font-medium theme-text-primary'
      >
        {t('socialCircleDailyLimitVip', 'Daily view limit exceeded')}
      </p>
      {!isVip ? (
        <>
          <p className='mt-1 text-xs leading-5 theme-text-secondary'>
            {t(
              'socialCircleDailyLimitFree',
              'Upgrade to VIP for a higher daily view limit.',
            )}
          </p>
          <VipUpgradeActions className='mt-2' />
        </>
      ) : null}
    </div>
  );
}

export default function SocialCircleFeature() {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage<'light' | 'dark'>('@xhunt/theme', 'dark');
  const [token, , { isLoading: isTokenLoading }] = useLocalStorage(
    '@xhunt/token',
    '',
  );
  const isLoggedIn = Boolean(token);
  const { isEnabled } = useCrossPageSettings();
  const enabled = isEnabled('showKolSocialCircleButton');
  const { urlUid, twitterId, handler, displayName, avatar, loading } =
    usePlacementTracking();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const floatingContainerRef = useRef<FloatingContainerRef>(null);
  const [floatingPortal, setFloatingPortal] = useState<HTMLElement | null>(() =>
    getOrCreateFloatingPortal(),
  );
  const [isOpen, setIsOpen] = useState(false);
  const closeDialog = useCallback(() => {
    setIsOpen(false);
    floatingContainerRef.current?.hide();
  }, []);

  const keepBeforeAiAvatar = useCallback(
    (_shadowRoot: ShadowRoot, host: HTMLElement) => {
      const aiHost = host.parentElement?.querySelector<HTMLElement>(
        `[${CONTAINER_KEY_ATTRIBUTE}="${AI_AVATAR_CONTAINER_KEY}"]`,
      );
      if (aiHost && aiHost !== host) {
        host.parentElement?.insertBefore(host, aiHost);
      }
    },
    [],
  );

  const shadowRoot = useShadowContainer({
    selector: PROFILE_ACTION_SELECTOR,
    resolveBaseElement: () => resolveProfileDom().actionHost,
    useSiblings: true,
    siblingsPosition: 'beforebegin',
    styleText: cssText,
    containerKey: SOCIAL_CIRCLE_CONTAINER_KEY,
    cleanupStaleSiblings: true,
    onShadowCreated: keepBeforeAiAvatar,
  });
  const portalHost = usePersistentPortalHost(shadowRoot);

  useEffect(() => {
    if (!isOpen || !floatingPortal) return;

    // Portal 重新创建时，需等本轮 React commit 把 FloatingContainer 的 ref
    // 挂好后再显示，避免 isOpen 已为 true、实际浮层仍保持 display:none。
    const frame = requestAnimationFrame(() => {
      floatingContainerRef.current?.show();
    });
    return () => cancelAnimationFrame(frame);
  }, [floatingPortal, isOpen]);

  const { data, isAvailable, isLoading, limitExceeded, loadDetails } =
    useKolSocialCircle({
      twitterId,
      handler,
      profileUsername: urlUid,
      profileLoading: loading,
      enabled,
    });

  const openDialog = useLockFn(async () => {
    // 详情接口需要 XHunt 身份。旧逻辑未登录时请求失败后静默 return，
    // 用户看到的表现就是按钮没有反应；这里与 AI 分身、推文分析保持一致。
    if (isTokenLoading) return;
    if (!isLoggedIn) {
      const auth = await getTwitterAuthUrl();
      if (auth?.url) openNewTab(auth.url);
      return;
    }

    // 新版 X 可能在自身 DOM 更新时移除额外的 html 直属节点。每次点击都重新
    // 确认 Portal 仍连接在文档中，必要时创建新的宿主并让 React 重新挂载。
    const nextFloatingPortal = getOrCreateFloatingPortal();
    if (!nextFloatingPortal) return;
    setFloatingPortal((current) =>
      current === nextFloatingPortal ? current : nextFloatingPortal,
    );

    const hasDialogContent = await loadDetails();
    if (!hasDialogContent) return;
    setIsOpen(true);
  });

  const displayData = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      kol: {
        ...data.kol,
        username: data.kol.username || handler || null,
        name: data.kol.name || displayName || handler || null,
        avatar: data.kol.avatar || avatar || null,
      },
    };
  }, [avatar, data, displayName, handler]);

  if (!enabled || !isAvailable || !shadowRoot || !portalHost) {
    return null;
  }

  const buttonLabel = t('socialCircleView', 'View social circle');

  return (
    <>
      {ReactDOM.createPortal(
        <div data-theme={theme} style={{ display: 'contents' }}>
          <div
            data-xhunt-testid='kol-social-circle-button'
            className='bg-transparent'
            style={{
              width: 36,
              height: 36,
              marginRight: 8,
              marginBottom: 12,
              position: 'relative',
            }}
          >
            <button
              ref={triggerRef}
              type='button'
              aria-label={buttonLabel}
              aria-haspopup='dialog'
              aria-expanded={isOpen}
              title={buttonLabel}
              onClick={openDialog}
              disabled={isLoading}
              className='group absolute -inset-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full outline-none'
            >
              <span className='flex h-9 w-9 items-center justify-center rounded-full border xhunt-ask-border xhunt-ask-bg shadow-sm transition-colors group-hover:border-[#1D9BF0] group-focus-visible:ring-4 group-focus-visible:ring-[#1D9BF0]/30'>
                <Network
                  className='h-[17px] w-[17px] xhunt-ask-icon'
                  aria-hidden='true'
                />
              </span>
              <span className='pointer-events-none absolute -right-1 -top-0.5 rounded-[4px] bg-gradient-to-r from-[#1D9BF0] to-[#7C3AED] px-1 py-[2px] text-[7px] font-extrabold leading-none text-white shadow-sm'>
                {t('newBadge', 'NEW')}
              </span>
            </button>
          </div>
        </div>,
        portalHost,
      )}
      {floatingPortal &&
        ReactDOM.createPortal(
          <div data-theme={theme} style={{ display: 'contents' }}>
            <FloatingContainer
              ref={floatingContainerRef}
              targetRef={triggerRef}
              offsetX={
                limitExceeded || !displayData ? LIMIT_DIALOG_OFFSET_X : -220
              }
              offsetY={
                limitExceeded || !displayData ? LIMIT_DIALOG_OFFSET_Y : -200
              }
              maxWidth='480px'
              maxHeight='calc(100dvh - 24px)'
              className='rounded-2xl theme-bg-secondary'
              onClose={closeDialog}
            >
              {limitExceeded ? (
                <SocialCircleLimitDialog
                  isVip={limitExceeded.isVip}
                  t={t}
                  onClose={closeDialog}
                />
              ) : displayData ? (
                <SocialCircleDialog
                  isOpen={isOpen}
                  data={displayData}
                  t={t}
                  lang={lang}
                  triggerRef={triggerRef}
                  onClose={closeDialog}
                />
              ) : null}
            </FloatingContainer>
          </div>,
          floatingPortal,
        )}
    </>
  );
}
