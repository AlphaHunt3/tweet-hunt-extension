import { useEffect, useMemo } from 'react';
import { avatarSkins } from '../constants/avatarSkins';
import { subscribeToMutation } from './useGlobalMutationObserver';
import { useLocalStorage } from '~/storage/useLocalStorage';

const AVATAR_SKIN_STORAGE_KEY = '@xhunt/avatar_skin';

// --- Helper Function ---
function applySkin(skinId: string, avatarRankMode: 'influence' | 'composite') {
  try {
    if (typeof document === 'undefined') return;

    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const skin = avatarSkins[skinId];

    if (skin) {
      const { background, border, outerBorder, textColor } =
        theme === 'light' ? skin.light : skin.dark;

      const webBg = (() => {
        try {
          // 优先读取 body 的 inline style，其次读取 computed style
          const inlineBg = String(document.body?.style?.backgroundColor || '').trim();
          const computedBg = String(
            window.getComputedStyle(document.body).backgroundColor || ''
          ).trim();
          const bg = inlineBg || computedBg;
          if (!bg || bg === 'transparent') {
            return theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
          }
          return bg;
        } catch {
          return '';
        }
      })();

      // 批量更新 CSS 变量和 data 属性
      const properties: Record<string, string> = {
        '--xhunt-avatar-rank-bg': background,
        '--xhunt-avatar-rank-border': border,
        '--xhunt-avatar-outer-border-color': outerBorder,
        '--xhunt-avatar-rank-text-color': textColor,
        ...(webBg ? { '--xhunt-web-bg': webBg } : {}),
      };
      const attributes: Record<string, string> = {
        'data-xhunt-avatar-skin': skinId,
        'data-xhunt-avatar-rank-mode': avatarRankMode,
      };

      Object.entries(properties).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
      Object.entries(attributes).forEach(([key, value]) => {
        document.documentElement.setAttribute(key, value);
      });
    }
  } catch (error) {
    console.error('applySkin error', error);
  }
}

// --- Hook for State Management (for UI) ---
export function useAvatarSkinState() {
  const [skin, setSkin, { isLoading }] = useLocalStorage<string>(
    AVATAR_SKIN_STORAGE_KEY,
    'skin-1'
  );
  return { skin, setSkin, isLoading };
}

// --- Hook for Initialization (for side effects) ---
export function useAvatarSkinInitializer() {
  const { skin: avatarSkinId, isLoading: isSkinLoading } = useAvatarSkinState();
  const [avatarRankMode, , { isLoading: isAvatarRankModeLoading }] =
    useLocalStorage<'influence' | 'composite'>(
      '@settings/avatarRankMode',
      'influence'
    );
  const isLoading = useMemo(
    () => isSkinLoading || isAvatarRankModeLoading,
    [isSkinLoading, isAvatarRankModeLoading]
  );
  useEffect(() => {
    if (isLoading) return;
    // 1. Apply the skin initially
    applySkin(avatarSkinId, avatarRankMode);

    // 2. Subscribe to theme changes (only for skins that follow theme)
    const skin = avatarSkins[avatarSkinId];
    const shouldFollowTheme =
      JSON.stringify(skin?.light) !== JSON.stringify(skin?.dark);

    const unsubscribe = subscribeToMutation(
      () => {
        if (shouldFollowTheme) {
          applySkin(avatarSkinId, avatarRankMode);
        }
      },
      {
        attributes: true,
        attributeFilter: ['data-theme'],
      },
      {
        debugName: 'useAvatarSkinInitializer',
        filter: (mutation) => mutation.target === document.documentElement,
      }
    );

    return () => {
      unsubscribe();
    };
  }, [avatarSkinId, avatarRankMode, isLoading]);
  return {
    avatarSkinId,
    avatarRankMode,
    isLoading,
  };
}
