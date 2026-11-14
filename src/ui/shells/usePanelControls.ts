import { useEffect, useState } from 'react';
import { usePanelContext } from '~/compontents/navigation/PanelContext';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
import { messageManager } from '~/utils/messageManager';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';

export type GuideKey = 'settings' | 'messages' | 'drag' | 'panel';

export const GUIDE_STORAGE_KEY = '@xhunt/header-controls-guide-dismissed-map';
const GUIDE_DEFAULTS: Record<GuideKey, boolean> = { settings: false, messages: false, drag: false, panel: false };

function useUnreadMessages() {
  const [hasUnread, setHasUnread] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!messageManager.getState().messages.length) messageManager.init();
    return messageManager.addCallback((state) => {
      setHasUnread(state.hasUnread);
      if (!state.isLoading) setChecked(true);
    });
  }, []);
  return checked && hasUnread;
}

export function usePanelControls(onClose?: () => void) {
  const { t } = useI18n();
  const { navigateTo } = useNavigation();
  const { onMinimize } = usePanelContext();
  const [mode] = useLocalStorage<'default' | 'persistent'>('@xhunt/floatingPanelMode', 'default');
  const [dismissed, setDismissed] = useLocalStorage<Record<GuideKey, boolean>>(GUIDE_STORAGE_KEY, GUIDE_DEFAULTS);
  const hasUnread = useUnreadMessages();
  const persistent = mode === 'persistent';
  const hide = persistent ? onMinimize : onClose;

  const dismissGuide = (key: GuideKey) =>
    setDismissed((previous) => ({ ...GUIDE_DEFAULTS, ...(previous || {}), [key]: true }));
  const available: GuideKey[] = ['settings', 'messages', 'drag', ...(hide ? (['panel'] as const) : [])];

  return {
    hasUnread,
    persistent,
    hide,
    hideLabel: persistent ? t('headerControlsGuideMinimizeTitle') : t('headerControlsGuideCloseTitle'),
    openSettings: () => {
      dismissGuide('settings');
      navigateTo('/settings');
    },
    openMessages: () => {
      dismissGuide('messages');
      navigateTo('/messages');
      if (hasUnread) messageManager.markAllAsRead();
    },
    activeGuide: available.find((key) => !dismissed?.[key]) ?? null,
    guideText: {
      settings: t('headerControlsGuideSettingsDesc'),
      messages: t('headerControlsGuideMessagesDesc'),
      drag: t('headerControlsGuideDragDesc'),
      panel: persistent ? t('headerControlsGuideMinimizeDesc') : t('headerControlsGuideCloseDesc'),
    } satisfies Record<GuideKey, string>,
    dismissGuide,
  };
}

export type PanelControls = ReturnType<typeof usePanelControls>;
