export interface KolFollower {
  username: string;
  name: string;
  avatar: string;
}

export interface DeletedTweet {
  id: string;
  text: string;
  create_time: string;
  quote_id?: string;
  quote_status?: DeletedTweet;
  profile: {
    name: string;
    username: string;
    username_raw: string;
    profile_image_url: string;
    is_blue_verified: boolean;
  };
  info: {
    html: string;
    photos?: Array<{
      id: string;
      url: string;
      alt_text: string | null;
    }>;
    videos?: Array<any>;
  };
  statistic: {
    likes: number;
    reply_count: number;
    retweet_count: number;
    quote_count: number;
    views: number;
    bookmark_count: number;
  };
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

export interface SupportedToken {
  symbol: string;
  name: string;
  ca?: string;
  chain?: string;
  twitterHandle?: string;
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

export interface MultiFieldItem {
  [key: string]: number;
}

// 新增：多语言能力字段结构
export interface MultiFieldData {
  cn: {
    fields: MultiFieldItem[];
    summary: string;
  };
  en: {
    fields: MultiFieldItem[];
    summary: string;
  };
}

// 🆕 新增：叙事数据结构
export interface NarrativeData {
  cn: string;
  en: string;
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
    kolRank?: number;
    kolRank20W?: number;
    isCn: boolean;
    isProject: boolean;
    kolCnRank?: number;
    kolProjectRank?: number;
    kolCnRankChange: {
      day1: number | null;
      day7: number | null;
      day30: number | null;
    }
    kolProjectRankChange: {
      day1: number | null;
      day7: number | null;
      day30: number | null;
    },
    kolRankChange: {
      day1: number | null;
      day7: number | null;
      day30: number | null;
    }
  };
  kolTokenMention: {
    day7: TokenPeriodData;
    day30: TokenPeriodData;
    day90: TokenPeriodData;
  };
  mbti?: {
    en: MBTIData | MBTIData[],
    cn: MBTIData | MBTIData[],
  };
  // 更新：multiField 现在是多语言结构
  multiField?: MultiFieldData | null;
  // 🆕 新增：叙事字段
  narrative?: NarrativeData | null;
}

export type KolTabType = 'global' | 'cn' | 'top100';
export type TokenPeriodType = 'day7' | 'day30' | 'day90';

export interface Investor {
  avatar: string;
  lead_investor: boolean;
  name: string;
  twitter: string;
}

export interface InvestorsGroup {
  investors: Investor[];
  total_funding: number;
}

export interface InvestmentData {
  invested: InvestorsGroup;
  investor: InvestorsGroup;
  projectLink: string | undefined;
}

export interface AccountsResponse {
  accounts: NameHistory[];
}

export interface NameHistory {
  id: number;
  id_str: string;
  screen_names: {
    [key: string]: [string, string];
  };
}

export interface MBTIData {
  mbti: string;
  keyword: string[];
  explanation: string;
}

interface HoverTweet {
  text: string;
  createTime: string;
  link: string;
  username: string;
  tweetId: string;
  avatar: string;
  name: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
}

export interface TokenAnalysisData {
  tweets: HoverTweet[];
  answerEn: string;
  answerCn: string;
}

export interface PopularityInfoType {
  ca: string;
  symbol: string;
  name: string;
  twitter: string;
  popularity1d: number;
  popularity7d: number;
  discussion1dCn: DiscussionBulletPoints | null;
  discussion1dEn: DiscussionBulletPoints | null;
  discussion7dCn: DiscussionBulletPoints | null;
  discussion7dEn: DiscussionBulletPoints | null;
}

export interface DiscussionBulletPoints {
  positiveBulletPoints: string[];
  negativeBulletPoints: string[];
  positivePercentage: number;
  negativePercentage: number;
}

export interface DiscussionData {
  ca: string;
  symbol: string;
  name: string;
  twitter: string;
  discussion1dCn: DiscussionBulletPoints | null;
  discussion1dEn: DiscussionBulletPoints | null;
  discussion7dCn: DiscussionBulletPoints | null;
  discussion7dEn: DiscussionBulletPoints | null;
}

export interface RankResponse {
  isProject: boolean;
  isCn: boolean;
  kolRank: number;
  kolCnRank: number;
  kolProjectRank: number;
}

// 新增：关注关系数据类型
export interface FollowAction {
  created_at: string;
  follower_id: string;
  following_id: string;
  is_latest: boolean;
}

export interface TwitterUserProfile {
  changed_field: string[];
  description: string;
  first_record: string;
  followers_count: number;
  following_count: number;
  is_blue_verified: boolean;
  listed_count: number;
  location: string;
  name: string;
  pinned_tweet_id: string[];
  profile_banner_url: string;
  profile_image_url: string;
  protected: boolean;
  tweets_count: number;
  url: string | null;
  username: string;
  username_raw: string;
  verified: boolean;
  kolRank20W?: number;
}

export interface TwitterUser {
  create_time: string;
  id: string;
  name: string;
  profile: TwitterUserProfile;
  username: string;
  username_raw: string;
}

export interface FollowRelationData {
  followed_action: FollowAction[];
  following_action: FollowAction[];
  twitter_users: {
    [key: string]: TwitterUser;
  };
}

// 新增：用户资料历史记录类型
export interface ProfileHistory {
  changed_field: string[];
  description: string;
  first_record: string;
  followers_count: number;
  following_count: number;
  is_blue_verified: boolean;
  listed_count: number;
  location: string;
  name: string;
  pinned_tweet_id: string[];
  profile_banner_url: string;
  profile_image_url: string;
  protected: boolean;
  tweets_count: number;
  url: string | null;
  username: string;
  username_raw: string;
  verified: boolean;
}

export interface ProfileHistoryData {
  create_time: string;
  id: string;
  name: string;
  profile: TwitterUserProfile;
  profile_his?: {
    history: ProfileHistory[];
  };
  username: string;
  username_raw: string;
}

// 新增：项目成员数据结构
export interface ProjectMember {
  handle: string;
  image: string;
  name: string;
}

export interface ProjectMemberData {
  handle: string;
  "founder/executive": ProjectMember[] | null;
  "ex-member": ProjectMember[] | null;
  "member": ProjectMember[] | null;
  "investor/advisor": ProjectMember[] | null;
  "alumni": ProjectMember[] | null;
  "contributor": ProjectMember[] | null;
}