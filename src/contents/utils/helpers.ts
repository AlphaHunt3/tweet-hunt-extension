import { localStorageInstance } from '~storage';
import type { TwitterInitialStateCurrentUser } from '~types';
import type { StoredUserInfo } from '~types/review';

export const GUEST_TWITTER_ID = '999999999';

const isTwitterId = (value: unknown): value is string =>
  typeof value === 'string' && /^\d+$/.test(value);

export function extractTwitterIdFromCookieString(cookieString: string): string {
  const twidCookie = cookieString
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('twid='));
  const rawValue = twidCookie?.slice('twid='.length);
  if (!rawValue) return '';

  try {
    const decodedValue = decodeURIComponent(rawValue).replace(
      /^["']+|["']+$/g,
      '',
    );
    const twitterId = decodedValue.match(/(?:^|=)(\d+)$/)?.[1] || '';
    return isTwitterId(twitterId) ? twitterId : '';
  } catch {
    return '';
  }
}

export function getTwitterIdFromCookie(): string {
  if (typeof document === 'undefined') return '';
  return extractTwitterIdFromCookieString(document.cookie || '');
}

export function sanitizeUsername(value: string | null | undefined): string {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/^["“”]+|["“”]+$/g, '');
  return /^[A-Za-z0-9_]{1,15}$/.test(normalized) ? normalized : '';
}

export async function getAuthToken(): Promise<string> {
  try {
    return ((await localStorageInstance.get('@xhunt/token')) as string) || '';
  } catch {
    return '';
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
  const cookieTwitterId = getTwitterIdFromCookie();
  if (cookieTwitterId) return cookieTwitterId;

  try {
    const [currentUser, storedUser] = await Promise.all([
      localStorageInstance.get('@xhunt/initial-state-current-user') as Promise<
        TwitterInitialStateCurrentUser | null
      >,
      localStorageInstance.get('@xhunt/user') as Promise<StoredUserInfo | null>,
    ]);
    const twitterId =
      currentUser?.id_str || storedUser?.twitterId || storedUser?.id || '';
    return isTwitterId(twitterId) ? twitterId : GUEST_TWITTER_ID;
  } catch {
    return GUEST_TWITTER_ID;
  }
}
