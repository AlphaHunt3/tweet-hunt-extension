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
    kol: string[],
    project: string[],
    colorTags: Record<string, {
      color: string
      bg: string
    }>
  }
  isKol?: boolean;
  allTagCount?: number;
}

export interface UserInfo {
  username: string;
  displayName: string;
  avatar: string;
  twitterId: string,
  xPoints: number;
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
