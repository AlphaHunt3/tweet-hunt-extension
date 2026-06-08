import { localStorageInstance } from '~storage';
import type { TwitterInitialStateCurrentUser } from '~types';

export function sanitizeUsername(value: string | null | undefined): string {
  if (typeof value !== 'string') return '';
  return value.replace(/^["“”]+|["“”]+$/g, '');
}

export async function getAuthToken(): Promise<string> {
  try {
    return ((await localStorageInstance.get('@xhunt/token')) as string) || '';
  } catch {
    return 'void;';
  }
}

export async function getCurrentUsername(
  mockUsername?: string
): Promise<string> {
  if (mockUsername) {
    return mockUsername;
  }
  const initialStateCurrentUser = (await localStorageInstance.get(
    '@xhunt/initial-state-current-user'
  )) as TwitterInitialStateCurrentUser | null;
  const currentUsername =
    sanitizeUsername(initialStateCurrentUser?.screen_name) ||
    sanitizeUsername(
      (await localStorageInstance.get('@xhunt/current-username')) as string
    ) ||
    '';
  return currentUsername;
}

export async function getCurrentUserInfo(): Promise<TwitterInitialStateCurrentUser | null> {
  const user = (await localStorageInstance.get(
    '@xhunt/initial-state-current-user'
  )) as TwitterInitialStateCurrentUser | null;
  return user ?? null;
}

export async function getCurrentTwitterId(): Promise<string> {
  try {
    const currentUser = (await localStorageInstance.get(
      '@xhunt/initial-state-current-user'
    )) as TwitterInitialStateCurrentUser | null;
    const twitterId = currentUser?.id_str || '';
    return typeof twitterId === 'string' && /^\d+$/.test(twitterId)
      ? twitterId
      : '';
  } catch {
    return '';
  }
}
