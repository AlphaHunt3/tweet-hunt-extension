export interface KolFollower {
  username: string;
  name: string;
  avatar: string;
}

export interface DeletedTweet {
  id: string;
  text: string;
  createTime: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
}

export interface TokenMention {
  text?: string;
  value?: number;
  token?: string;
  chain?: string;
  tweetId?: string;
  recordTime?: string;
  username?: string;
  mentionCount?: number;
  symbol?: string;
  name?: string;
  image?: string;
  link?: string;
  source?: string;
  dateAdded?: string;
  period?: number;
  openPrice?: number;
  maxPrice?: number;
  nowPrice?: number;
  maxProfit?: number;
  nowProfit?: number;
  maxFDV?: number;
  belowLimit?: boolean;
}

export interface TokenPeriodData {
  winRate: number | null;
  maxProfitAvg: number | null;
  nowProfitAvg: number | null;
  winRatePct: number;
  maxProfitAvgPct: number;
  nowProfitAvgPct: number;
  tokenMentions: TokenMention[];
}

export interface KolData {
  basicInfo?: {
    isKol: boolean;
    classification: string;
  };
  kolFollow: {
    globalKolFollowersCount?: number;
    cnKolFollowersCount?: number;
    topKolFollowersCount?: number;
    globalKolFollowers?: KolFollower[];
    cnKolFollowers?: KolFollower[];
    topKolFollowers?: KolFollower[];
  };
  kolTokenMention: {
    day7: TokenPeriodData;
    day30: TokenPeriodData;
    day90: TokenPeriodData;
  };
}

export type KolTabType = 'global' | 'cn' | 'top100';
export type TokenPeriodType = 'day7' | 'day30' | 'day90';
