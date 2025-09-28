import { secureFetch } from '~contents/utils/api.ts';
import { ReviewStats, UserInfo } from '~types/review.ts';
import { kbPrefix } from '~contents/services/api.ts';

export const updateUserInfo = async (): Promise<UserInfo | undefined> => {
  try {
    return secureFetch(`${kbPrefix}/api/xhunt/auth/me`, {
      tokenRequired: true
    });
  } catch (err) {
    return undefined;
  }
}
export const userLogout = (): Promise<undefined> => {
  return secureFetch(`${kbPrefix}/api/xhunt/auth/logout`, {
    method: 'POST'
  });
}
export const getHandeReviewInfo = async (handle: string, onlyKOL: boolean | string = true): Promise<ReviewStats | undefined> => {
  try {
    // if (typeof onlyKOL === 'string') return undefined;
    return await secureFetch(`${kbPrefix}/api/xhunt/reviews/${handle}?onlyKOL=${onlyKOL}`);
  } catch (err) {
    return undefined;
  }
}
export const delHandeReviewInfo = async (handle: string) => {
  return await secureFetch(`${kbPrefix}/api/xhunt/reviews/delete`, {
    method: 'POST',
    body: JSON.stringify({
      handle
    })
  });
}
export const postHandeReviewInfo = async ({
  handle,
  xLink,
  displayName,
  avatar,
  followers,
  following,
  rating,
  tags,
  comment,
}: {
  handle: string;
  xLink: string;
  displayName: string;
  avatar: string;
  followers: number;
  following: number;
  rating: number;
  tags: string[];
  comment?: string;
}): Promise<undefined> => {
  return await secureFetch(`${kbPrefix}/api/xhunt/reviews`, {
    method: 'POST',
    body: JSON.stringify({
      handle,
      xLink,
      displayName,
      avatar,
      followers,
      following,
      rating,
      tags,
      comment: comment || ''
    })
  });
}

// 新增：获取长评论列表
export const getHandleComments = async (
  handle: string,
  page: number = 1,
  limit: number = 5,
  onlyKOL: boolean = true
): Promise<{
  account: {
    handle: string;
    displayName: string;
    avatar: string;
  };
  comments: Array<{
    id: string;
    rating: number;
    tags: string[];
    comment: string;
    createdAt: string;
    updatedAt: string;
    reviewer: {
      username: string;
      displayName: string;
      avatar: string;
      kolRank20W: number | null;
      classification: string | null;
      isKOL: boolean;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    totalComments: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    onlyKOL: boolean;
  };
} | undefined> => {
  try {
    const response = await secureFetch(`${kbPrefix}/api/xhunt/reviews/${handle}/comments?page=${page}&limit=${limit}&onlyKOL=${onlyKOL}`);
    return response?.data;
  } catch (err) {
    return undefined;
  }
}
