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
    kolGlobalRank?: number;
    isCn: boolean;
    isProject: boolean;
    kolCnRank?: number;
    kolProjectRank?: number;
    kolCnRankChange: {
      day1: number | null;
      day7: number | null;
      day30: number | null;
    };
    kolProjectRankChange: {
      day1: number | null;
      day7: number | null;
      day30: number | null;
    };
    kolRankChange: {
      day1: number | null;
      day7: number | null;
      day30: number | null;
    };
    kolGlobalRankChange?: {
      day1: number | null;
      day7: number | null;
      day30: number | null;
    };
  };
  kolTokenMention: {
    day7: TokenPeriodData;
    day30: TokenPeriodData;
    day90: TokenPeriodData;
  };
  mbti?: {
    en: MBTIData | MBTIData[];
    cn: MBTIData | MBTIData[];
  };
  // 更新：multiField 现在是多语言结构
  multiField?: MultiFieldData | null;
  // 🆕 新增：叙事字段
  narrative?: NarrativeData | null;
}

// 🆕 新接口的数据结构
export interface NewTwitterUserData {
  ai: {
    classification: string;
    is_cn: boolean;
  };
  create_time: string;
  del: {
    is_delete: boolean | null;
    last_check: string | null;
  };
  feature: {
    discussion?: {
      discussion1dCn: DiscussionBulletPoints | null;
      discussion1dEn: DiscussionBulletPoints | null;
      discussion7dCn: DiscussionBulletPoints | null;
      discussion7dEn: DiscussionBulletPoints | null;
      popularity1d: number;
      popularity7d: number;
      twitter: string;
      updateDate: string;
    };
    kol_followers?: {
      cnKolFollowers: KolFollower[];
      cnKolFollowersCount: number;
      globalKolFollowers: KolFollower[];
      globalKolFollowersCount: number;
      topKolFollowers: KolFollower[];
      topKolFollowersCount: number;
      updateDate: string;
    };
    mbti?: {
      en: MBTIData | MBTIData[] | null;
      cn: MBTIData | MBTIData[] | null;
    };
    multi_field?: MultiFieldData | null;
    narrative?: NarrativeData | null;
    rank?: {
      kolCnRank: number;
      kolCnRankChange: {
        day1: number | null;
        day7: number | null;
        day30: number | null;
      };
      kolProjectRank: number;
      kolProjectRankChange: {
        day1: number | null;
        day7: number | null;
        day30: number | null;
      };
      kolRank: number;
      kolRankChange: {
        day1: number | null;
        day7: number | null;
        day30: number | null;
      };
    };
    token_mention?: {
      day7: TokenPeriodData;
      day30: TokenPeriodData;
      day90: TokenPeriodData;
    } | null;
  };
  id: string;
  isKol: boolean;
  // kol: {
  //   [key: string]: {
  //     cn: any | null;
  //     degen: any | null;
  //     global: {
  //       is_kol: boolean;
  //       rank: number;
  //       score: number;
  //     } | null;
  //   };
  // };
  name: string;
  profile: TwitterUserProfile;
  profile_his?: {
    history: ProfileHistory[];
  };
  username: string;
  username_raw: string;
  version: number;
}

// 🆕 新接口响应结构
export interface NewTwitterUserResponse {
  code: number;
  message: string;
  data: {
    data: NewTwitterUserData;
  };
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

// 🆕 新的rank批量接口响应类型
export interface NewRankBatchItem {
  kolRank: number;
  username: string;
}

export interface NewRankBatchResponse {
  code: number;
  message: string;
  data: {
    data: NewRankBatchItem[];
  };
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
  unfollowing_action?: FollowAction[];
  twitter_users: {
    [key: string]: TwitterUser;
  };
}

export interface UnfollowRelationData {
  unfollowing_action: FollowAction[];
  unfollowed_action: FollowAction[];
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
  level: string;
}

export interface ProjectMemberData {
  handle: string;
  'founder/executive': ProjectMember[] | null;
  'ex-member': ProjectMember[] | null;
  member: ProjectMember[] | null;
  'investor/advisor': ProjectMember[] | null;
  alumni: ProjectMember[] | null;
  contributor: ProjectMember[] | null;
}

// 灵魂浓度数据结构
export interface SoulDensityData {
  content_analysis: number;
  engagement_analysis: number;
  handle: string;
  kol_interaction: number;
  name: string;
  profile_analysis: number;
  reason: string;
  reason_en: string;
  score: number;
  xhunt_analysis: number;
}

// AI内容分析相关类型
export interface AiAnalysisResult {
  ai_generation_probability: string; // AI生成概率：低/中/高
  explanation_cn: string; // 中文解释
  explanation_en: string; // 英文解释
  information_value: string; // 信息价值：低/中/高
  credibility: string; // 可信度：低/中/高
  promotional_tendency: string; // 推广倾向：低/中/高
}

export interface AiContentResponse {
  ai_generation_probability: string;
  credibility: string;
  explanation_cn: string;
  explanation_en: string;
  information_value: string;
  promotional_tendency: string;
}

// AI Detect 探测功能相关类型
export interface AiDetectShadowbanRisk {
  level_cn: string; // 风险等级: 低/中/高
  level_en: string; // 风险等级: Low/Medium/High
  score: number; // 风险分数: 0-100
  issues_cn: string[]; // 风险问题列表(中文)
  issues_en: string[]; // 风险问题列表(英文)
  advice_cn: string; // 风险建议(中文)
  advice_en: string; // 风险建议(英文)
}

export interface AiDetectCompliance {
  commercial_prob: number; // 商业推广概率: 0.0-1.0
  commercial_reason_cn: string;
  commercial_reason_en: string;
  ai_prob: number; // AI生成概率: 0.0-1.0
  ai_reason_cn: string;
  ai_reason_en: string;
}

export interface AiDetectContentAdvice {
  hook_cn: string;
  hook_en: string;
  body_cn: string;
  body_en: string;
  error_check_cn: string;
  error_check_en: string;
  media_cn: string;
  media_en: string;
  content_quality_score?: number; // 内容质量分数，分数越高内容质量越高，传播力越强
}

export interface AiDetectResponse {
  shadowban_risk: AiDetectShadowbanRisk;
  compliance: AiDetectCompliance;
  content_advice: AiDetectContentAdvice;
}

export interface AiDetectQuota {
  isVip: boolean;
  total: number;
  used: number;
  remaining: number;
  resetTime: number;
}

// AI聊天相关类型
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatHistory {
  handle: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

export interface ChatRequest {
  handle: string;
  history: ChatMessage[];
  message: ChatMessage[];
}

// window.__INITIAL_STATE__ 当前用户对象类型（精简为项目使用字段 + 常见字段）
export interface TwitterInitialStateCurrentUser {
  default_profile: boolean;
  default_profile_image: boolean;
  description: string;
  entities: {
    description: {
      urls: Array<any>;
    };
  };
  fast_followers_count: number;
  favourites_count: number;
  followers_count: number;
  friends_count: number;
  has_custom_timelines: boolean;
  is_translator: boolean;
  listed_count: number;
  media_count: number;
  needs_phone_verification: boolean;
  normal_followers_count: number;
  pinned_tweet_ids_str: string[];
  possibly_sensitive: boolean;
  profile_interstitial_type: string;
  statuses_count: number;
  translator_type: string;
  want_retweets: boolean;
  withheld_in_countries: string[];
  name: string;
  screen_name: string;
  id_str: string;
  is_profile_translatable: boolean;
  profile_image_shape: string;
  creator_subscriptions_count: number;
  location: string;
  is_blue_verified: boolean;
  tipjar_settings: Record<string, unknown>;
  verified: boolean;
  protected: boolean;
  profile_image_url_https: string;
  can_dm: boolean;
  can_media_tag: boolean;
  follow_request_sent: boolean;
  blocked_by: boolean;
  blocking: boolean;
  following: boolean;
  muting: boolean;
  birthdate?: {
    day: number;
    month: number;
    year: number;
    visibility: string;
    year_visibility: string;
  };
  has_graduated_access: boolean;
  created_at: string;
  parody_commentary_fan_label: string;
}

// 粉丝与KOL互动排名接口响应
export interface FanByHandleResponse {
  fan_rank: number | null;
  is_quote?: boolean | null;
  is_reply?: boolean | null;
  is_retweet?: boolean | null;
  kol_handle?: string;
  kol_tweet_id?: string | null;
  link?: string | null;
  name?: string;
  point: number | null;
  profile_image_url?: string;
  user_id?: string;
  user_tweet_id?: string | null;
  username_raw?: string;
}

// 私信类型定义
export interface PrivateMessageItem {
  id: string | number;
  title: string;
  content: string; // 富文本HTML
  displayAt?: string | number | null;
  sentAt?: string | number | null;
  isRead?: boolean;
  campaignId?: string | number | null;
  sender?: any;
  receiver?: any;
  isOutgoing?: boolean;
}

export interface PrivateMessagesResponse {
  success: boolean;
  data?: {
    messages: PrivateMessageItem[];
    pagination?: any;
  };
}

// ==================== Ghost Following 类型定义 ====================

// 额度信息
export interface GhostFollowingQuota {
  total: number;
  remaining: number;
  used: number;
}

// Analyze 额度
export interface GhostFollowingAnalyzeQuotaDetail {
  status: 'none' | 'cooldown' | 'active' | 'exhausted' | 'expired';
  quota: GhostFollowingQuota;
  appliedAt: number;
  expiresAt: number;
  nextApplyAt: number | null;
  waitDays: number;
  canApplyNow: boolean;
  expiresInDays: number;
}

// Following 额度
export interface GhostFollowingFollowingQuotaDetail {
  status: 'none' | 'cooldown' | 'active' | 'exhausted' | 'expired';
  quota: GhostFollowingQuota;
  resetAt: number;
  expiresInDays: number;
}

// 关注用户 Profile
export interface GhostFollowingProfile {
  created_at: string;
  description: string;
  followers_count: number;
  following_count: number;
  id: string;
  is_blue_verified: boolean;
  listed_count: number;
  location: string;
  name: string;
  pinned_tweet_id: string[];
  profile_banner_url: string;
  profile_image_url: string;
  protected: boolean;
  tweets_count: number;
  url: string;
  username: string;
  verified: boolean;
}

// 推文分析结果
export interface GhostFollowingAnalyzeResult {
  id: string | null;
  create_time: string | null;
  html: string | null;
  twitter_user_id: string;
  message?: string;
}

// 额度错误数据
export interface GhostFollowingQuotaErrorData {
  total: number;
  used: number;
  nextApplyAt: number;
  waitDays: number;
  waitHours: number;
}

// 关注列表额度耗尽错误数据
export interface GhostFollowingFollowingQuotaErrorData {
  total: number;
  used: number;
  remaining: number;
  resetAt: number;
  waitDays: number;
}

// API 响应 - 查询额度（包含 analyze 和 following 两个额度）
export interface GhostFollowingQuotaResponse {
  success: boolean;
  data: {
    isVip: boolean;
    analyze: GhostFollowingAnalyzeQuotaDetail;
    following: GhostFollowingFollowingQuotaDetail;
  };
}

// API 响应 - 分析推文
export interface GhostFollowingAnalyzeResponse {
  success: boolean;
  data?: {
    quota: GhostFollowingAnalyzeQuotaDetail & { isNewQuota?: boolean };
    result: GhostFollowingAnalyzeResult;
  };
  error?: {
    code: string;
    message: string;
    data: GhostFollowingQuotaErrorData;
  };
}

// API 响应 - 获取关注列表
export interface GhostFollowingListData {
  quota: GhostFollowingFollowingQuotaDetail;
  result: {
    next: string;
    previous: string;
    profiles: GhostFollowingProfile[];
  };
}

export interface GhostFollowingListResponse {
  success: boolean;
  data?: GhostFollowingListData;
  error?: {
    code: string;
    message: string;
    data: GhostFollowingFollowingQuotaErrorData;
  };
}

// 分析记录中的用户信息（带活跃时间）
export interface GhostFollowingRecordUser extends GhostFollowingProfile {
  lastActiveTime: string | null; // ISO 8601 格式，null 表示无推文
  isAnalyzed: boolean; // 是否已完成分析
}

// 单次分析记录
export interface GhostFollowingRecord {
  id: string; // 记录 ID
  createdAt: number; // 创建时间戳
  totalFollowing: number; // 关注总数
  inactiveCount: number; // 不活跃用户数
  threshold: number; // 不活跃阈值（月）
  users: GhostFollowingRecordUser[]; // 用户列表
  analyzedUserIds: string[]; // 已分析的用户ID列表，用于继续分析功能
  isContinued?: boolean; // 是否是继续分析产生的记录
  parentRecordId?: string; // 父记录ID（如果是继续分析产生的）
}

// 本地存储的分析记录列表（最多3条）
export type GhostFollowingRecords = GhostFollowingRecord[];

// ==================== KOL Chat 类型定义 ====================

export interface KolChatItem {
  id: string;
  name: string;
  twitter_handle: string;
  description: string;
  type: 'official' | 'unofficial';
  perspective_name_zh: string | null;
  perspective_name_en: string | null;
}

export interface KolChatListResponse {
  code: number;
  message?: string;
  data?: KolChatItem[];
}

export interface KolChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface KolChatRequest {
  kol_id: string;
  messages: KolChatMessage[];
}

export interface KolChatResponse {
  code: number;
  message?: string;
  message_en?: string;
  data?: {
    kol_id: string;
    reply: string;
  };
  resetTime?: number; // 429 错误时返回的配额重置时间
}
