export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  realTotalReviews: number;
  tagCloud: Array<{
    text: string;
    value: number;
  }>;
  topReviewers: Array<{
    id: string;
    avatar: string;
    name: string;
  }>;
  currentUserReview?: {
    rating: number;
    tags: string[];
    note: string;
    comment: string;
  };
  defaultTags: {
    kol: string[];
    project: string[];
    colorTags: Record<
      string,
      {
        color: string;
        bg: string;
      }
    >;
  };
  isKol?: boolean;
  allTagCount?: number;
}

export interface UserInfo {
  username: string;
  displayName: string;
  avatar: string;
  twitterId: string;
  xPoints: number;
  evmAddresses?: string[];
  isPro?: boolean;
  proExpiryTime?: string;
  isLegacyPro?: boolean;
}

/**
 * 存储在 localStorage (@xhunt/user) 中的用户信息类型
 * 扩展了 UserInfo，添加了 id 字段，某些字段为可选（因为可能从不同来源获取）
 */
export interface StoredUserInfo {
  avatar: string;
  displayName: string;
  username: string;
  id: string; // 使用 twitterId 作为 id
  twitterId: string;
  xPoints?: number;
  evmAddresses?: string[];
  isPro?: boolean;
  proExpiryTime?: string;
  isLegacyPro?: boolean;
}

// 新增：评论类型定义
export interface Comment {
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
}

export interface CommentsResponse {
  account: {
    handle: string;
    displayName: string;
    avatar: string;
  };
  comments: Comment[];
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
}
