import { secureFetch } from '~contents/utils/api.ts';
import { kbPrefix } from '~contents/services/api.ts';

export interface UserNote {
  handle: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export const getUserNote = async (handle: string): Promise<UserNote | undefined> => {
  try {
    if (!handle) return undefined;
    return await secureFetch(`${kbPrefix}/api/xhunt/notes/${handle}`, {
      tokenRequired: true
    });
  } catch (err) {
    return undefined;
  }
}

export const saveUserNote = async ({
  handle,
  xLink,
  displayName,
  avatar,
  note
}: {
  handle: string;
  xLink: string;
  displayName: string;
  avatar: string;
  note: string;
}): Promise<UserNote | undefined> => {
  return await secureFetch(`${kbPrefix}/api/xhunt/notes`, {
    method: 'POST',
    body: JSON.stringify({
      handle,
      xLink,
      displayName,
      avatar,
      note: note || ''
    }),
    tokenRequired: true
  });
}