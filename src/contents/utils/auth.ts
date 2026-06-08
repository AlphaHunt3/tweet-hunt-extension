import { localStorageInstance } from '~storage';

/**
 * Centralized cleanup for auth-related state when logging out or switching accounts.
 * - Clears token, user, current username
 * - Clears Mantle task progress for guest and current user (if available)
 */
export async function clearAuthState(): Promise<void> {
  try {
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
      }
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
    } catch {}
    // Always bump cache-busting timestamp to avoid browser cache after auth reset
    try {
      await localStorageInstance.set('@xhunt/userInfoCacheBust', Date.now());
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
