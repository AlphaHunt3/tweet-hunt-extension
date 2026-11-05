import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactDOM from 'react-dom';
import { LockKeyhole, Network, X } from 'lucide-react';
import cssText from 'data-text:~/css/style.css';
import useShadowContainer from '~contents/hooks/useShadowContainer';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { useI18n } from '~contents/hooks/i18n';
import { openNewTab } from '~contents/utils';
import { useCrossPageSettings } from '~utils/settingsManager';
import { useLocalStorage } from '~storage/useLocalStorage';
import { configManager } from '~utils/configManager';
import {
  FloatingContainer,
  type FloatingContainerRef,
} from '~compontents/FloatingContainer';
import useKolSocialCircle from './useKolSocialCircle';
import SocialCircleDialog from './SocialCircleDialog';

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
      'position:fixed;inset:0;width:0;height:0;z-index:2147483000;';
    host.setAttribute('translate', 'no');
    host.classList.add('notranslate');
    document.documentElement.appendChild(host);

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
  const vipCtaUrl = configManager.getUnfollowVipCta().url?.trim() || '';

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
          {vipCtaUrl ? (
            <button
              type='button'
              onClick={() => openNewTab(vipCtaUrl)}
              className='mx-auto mt-2 rounded-md bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'
            >
              {t('unfollowApplyVip', 'Apply VIP')}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function SocialCircleFeature() {
  const { t, lang } = useI18n();
  const [theme] = useLocalStorage<'light' | 'dark'>('@xhunt/theme', 'dark');
  const { isEnabled } = useCrossPageSettings();
  const enabled = isEnabled('showKolSocialCircleButton');
  const { urlUid, twitterId, handler, displayName, avatar, loading } =
    usePlacementTracking();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const floatingContainerRef = useRef<FloatingContainerRef>(null);
  const [floatingPortal, setFloatingPortal] = useState<HTMLElement | null>(
    null,
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
    useSiblings: true,
    siblingsPosition: 'beforebegin',
    styleText: cssText,
    containerKey: SOCIAL_CIRCLE_CONTAINER_KEY,
    cleanupStaleSiblings: true,
    onShadowCreated: keepBeforeAiAvatar,
  });
  const portalHost = usePersistentPortalHost(shadowRoot);

  useEffect(() => {
    setFloatingPortal(getOrCreateFloatingPortal());
  }, []);

  const { data, isAvailable, isLoading, limitExceeded, loadDetails } =
    useKolSocialCircle({
      twitterId,
      handler,
      profileUsername: urlUid,
      profileLoading: loading,
      enabled,
    });

  const openDialog = useCallback(() => {
    void loadDetails().then((hasDialogContent) => {
      if (!hasDialogContent) return;
      setIsOpen(true);
      floatingContainerRef.current?.show();
    });
  }, [loadDetails]);

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
            className='theme-bg-primary'
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
