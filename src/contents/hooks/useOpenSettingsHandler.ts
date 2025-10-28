import { useEffect } from 'react';
import { navigationService } from '~/compontents/navigation/NavigationService';

/**
 * Registers a runtime.onMessage listener that reacts to { type: 'OPEN_SETTINGS' } messages.
 * It ensures the floating panel opens and navigates to the settings route, even if
 * the panel hasn't finished registering yet.
 */
export function useOpenSettingsHandler() {
  useEffect(() => {
    const handler = (message: any) => {
      if (message?.type === 'OPEN_SETTINGS') {
        try {
          // Open floating panel
          const event = new CustomEvent('xhunt:open-panel');
          window.dispatchEvent(event);

          // Navigate to settings (retry if panel not registered yet)
          const navigate = () => {
            navigationService.navigateTo('main-panel', '/settings');
          };
          const unregister = () => {
            window.removeEventListener('xhunt:panel-registered', onRegistered);
          };
          const onRegistered = () => {
            navigate();
            unregister();
          };
          // Try immediately
          navigate();
          // Also wait for registration, then navigate
          window.addEventListener('xhunt:panel-registered', onRegistered, {
            once: true,
          } as any);
        } catch (e) {
          // 静默处理设置打开失败的错误
          // console.log('Failed to open settings:', e);
        }
      }
    };

    (chrome as any).runtime.onMessage.addListener(handler);
    return () => {
      try {
        (chrome as any).runtime.onMessage.removeListener(handler);
      } catch {}
    };
  }, []);
}

export default useOpenSettingsHandler;
