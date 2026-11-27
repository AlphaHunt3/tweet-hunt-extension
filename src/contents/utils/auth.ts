import { localStorageInstance } from '~storage';
import { chatHistoryManager } from '~storage/chatHistoryManager';
import { clearPlacementInfoCache } from '~contents/hooks/usePlacementTrackingDomUserInfo';

/**
 * Centralized cleanup for auth-related state when logging out or switching accounts.
 * - Clears token, user, current username
 * - Clears Mantle task progress for guest and current user (if available)
 */
export async function clearAuthState(): Promise<void> {
  try {
    // 先使进行中的用户信息请求失效，避免旧身份响应回写。
    try {
      await localStorageInstance.set('@xhunt/userInfoCacheBust', Date.now());
    } catch {}
    try {
      const currentUser: any = await localStorageInstance.get('@xhunt/user');
      const currentUserId: string | undefined =
        currentUser && typeof currentUser === 'object'
          ? currentUser.id
          : undefined;
      if (currentUserId) {
        await localStorageInstance.remove(
          `@xhunt/mantleTasks:${currentUserId}`
        );
        await localStorageInstance.remove(
          `@xhunt/mantle2Tasks:${currentUserId}`
        );
        await localStorageInstance.remove(`ai_chat_history_${currentUserId}`);
      }
    } catch {}
    try {
      await chatHistoryManager.clearAllHistory();
      await localStorageInstance.remove('ai_chat_history');
    } catch {}
    try {
      await localStorageInstance.remove('@xhunt/initial-state-current-user');
    } catch {}
    try {
      await localStorageInstance.remove('@xhunt/initial-state-users');
    } catch {}
    try {
      await localStorageInstance.remove('@xhunt/current-username');
    } catch {}
    try {
      await localStorageInstance.remove('@xhunt/user');
    } catch {}
    try {
      await localStorageInstance.remove('@xhunt/token');
    } catch {}
    try {
      await localStorageInstance.remove('@xhunt/mantleTasks:guest');
      await localStorageInstance.remove('@xhunt/mantle2Tasks:guest');
      await localStorageInstance.remove('@xhunt/customTask:guest');
      await localStorageInstance.remove('@xhunt/placementInfoCacheV2');
      await localStorageInstance.remove('@xhunt/placementInfoCacheV1');
      clearPlacementInfoCache();
    } catch {}
  } catch (e) {
    // Best-effort: ignore errors
  }
}

/**
 * Apply login response consistently.
 * Ensures current username is aligned with the logged-in user to avoid backend mismatch.
 */
export async function applyLoginState(token: string, user: any): Promise<void> {
  try {
    // 登录身份写入前先切换缓存版本，阻止上一身份的请求回写。
    try {
      await localStorageInstance.set('@xhunt/userInfoCacheBust', Date.now());
    } catch {}
    await localStorageInstance.set('@xhunt/token', token || '');
    await localStorageInstance.set('@xhunt/user', user || '');
    if (user && typeof user === 'object' && user.username) {
      await localStorageInstance.set(
        '@xhunt/current-username',
        user.username || ''
      );
    }
  } catch (e) {
    // ignore
  }
}
