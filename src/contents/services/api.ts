import {
  AccountsResponse,
  AiContentResponse,
  DeletedTweet,
  FollowRelationData,
  InvestmentData,
  KolData,
  NewRankBatchItem,
  NewTwitterUserData,
  NewTwitterUserResponse,
  PopularityInfoType,
  ProjectMemberData,
  RankResponse,
  SoulDensityData,
  SupportedToken,
  TokenAnalysisData,
  TokenMention,
  TokenPeriodData,
} from '~types';
import { secureFetch, secureFetchInContent } from '~contents/utils/api.ts';
import { PrivateMessageItem, PrivateMessagesResponse } from '~types';

export const kbPrefix =
  process.env.PLASMO_PUBLIC_ENV === 'dev'
    ? 'https://test-kb.cryptohunt.ai'
    : 'https://kb.cryptohunt.ai';
export const kbPublicPrefix = `${kbPrefix}/api/xhunt/proxy/public`;
export const kbAuthPrefix = `${kbPrefix}/api/xhunt/proxy/auth`;
export const kbPublicSteamPrefix = `${kbPrefix}/api/xhunt/proxy/public-stream`;

// 私信类型定义已移动到 ~types

/** 新的用户信息接口，替代/api/c9e1c6/plugin/twitter/info 和 /api/54daab/plugin/twitter/discussion 相关信息在feature字段里 **/
export const fetchTwitterInfoNew = async (
  userId: string
): Promise<NewTwitterUserData | undefined> => {
  try {
    if (!userId) return;
    const ret = await secureFetch<NewTwitterUserResponse>(
      `${kbPublicPrefix}/fetch/twitter/user?username=${userId}&target=k8s_kota`
    );
    return ret?.data?.data;
  } catch (err) {
    return;
  }
};

/** 🆕 数据转换函数：将新接口数据转换为旧的KolData格式 **/
export const convertNewDataToKolData = (
  newData: NewTwitterUserData
): KolData => {
  // Normalize tokenMentions field to always be an array
  const normalizeTokenMentions = (mentions: unknown): TokenMention[] => {
    try {
      if (Array.isArray(mentions)) return mentions as TokenMention[];
      if (mentions && typeof mentions === 'object') {
        return Object.values(mentions as Record<string, TokenMention>);
      }
      return [];
    } catch {
      return [];
    }
  };

  const defaultPeriod: TokenPeriodData = {
    winRate: null,
    maxProfitAvg: null,
    nowProfitAvg: null,
    winRatePct: 0,
    maxProfitAvgPct: 0,
    nowProfitAvgPct: 0,
    tokenMentions: [],
  };

  const normalizePeriod = (pd: any): TokenPeriodData => {
    if (!pd) return { ...defaultPeriod };
    const { tokenMentions, ...rest } = pd || {};
    return {
      ...defaultPeriod,
      ...rest,
      tokenMentions: normalizeTokenMentions(tokenMentions),
    } as TokenPeriodData;
  };

  const tokenMentionRaw = newData.feature?.token_mention as any;

  return {
    basicInfo: {
      isKol: newData.isKol,
      classification: newData.ai?.classification || 'unknown',
    },
    kolFollow: {
      globalKolFollowersCount:
        newData.feature?.kol_followers?.globalKolFollowersCount,
      cnKolFollowersCount: newData.feature?.kol_followers?.cnKolFollowersCount,
      topKolFollowersCount:
        newData.feature?.kol_followers?.topKolFollowersCount,
      globalKolFollowers: newData.feature?.kol_followers?.globalKolFollowers,
      cnKolFollowers: newData.feature?.kol_followers?.cnKolFollowers,
      topKolFollowers: newData.feature?.kol_followers?.topKolFollowers,
      kolRank: newData.feature?.rank?.kolRank,
      kolRank20W: newData.feature?.rank?.kolRank, // 使用kolRank作为kolRank20W
      kolGlobalRank:
        (newData as any)?.feature?.rank?.kolGlobalRank ?? undefined,
      isCn: newData.ai?.is_cn || false,
      isProject: newData.ai?.classification === 'project',
      kolCnRank: newData.feature?.rank?.kolCnRank,
      kolProjectRank: newData.feature?.rank?.kolProjectRank,
      kolCnRankChange: newData.feature?.rank?.kolCnRankChange || {
        day1: null,
        day7: null,
        day30: null,
      },
      kolProjectRankChange: newData.feature?.rank?.kolProjectRankChange || {
        day1: null,
        day7: null,
        day30: null,
      },
      kolRankChange: newData.feature?.rank?.kolRankChange || {
        day1: null,
        day7: null,
        day30: null,
      },
      kolGlobalRankChange: (newData as any)?.feature?.rank
        ?.kolGlobalRankChange || {
        day1: null,
        day7: null,
        day30: null,
      },
    },
    kolTokenMention: {
      day7: normalizePeriod(tokenMentionRaw?.day7),
      day30: normalizePeriod(tokenMentionRaw?.day30),
      day90: normalizePeriod(tokenMentionRaw?.day90),
    },
    // @ts-ignore
    mbti: newData.feature?.mbti,
    multiField: newData.feature?.multi_field,
    narrative: newData.feature?.narrative,
  };
};

/** 🆕 数据转换函数：将新接口数据转换为PopularityInfoType格式 **/
export const convertNewDataToPopularityInfo = (
  newData: NewTwitterUserData
): PopularityInfoType | undefined => {
  const discussion = newData.feature?.discussion;
  if (!discussion) return undefined;

  return {
    ca: '', // 新接口中没有ca字段
    symbol: '', // 新接口中没有symbol字段
    name: newData.name,
    twitter: newData.username,
    popularity1d: discussion.popularity1d,
    popularity7d: discussion.popularity7d,
    discussion1dCn: discussion.discussion1dCn,
    discussion1dEn: discussion.discussion1dEn,
    discussion7dCn: discussion.discussion7dCn,
    discussion7dEn: discussion.discussion7dEn,
  };
};

export const fetchDelTwitterInfo = async (
  userId: string
): Promise<DeletedTweet[] | undefined> => {
  try {
    if (!userId) return;
    const ret = await secureFetch(
      `${kbPublicPrefix}/fetch/tweet/deleted?username=${userId}&target=k8s_kota`
    );
    return ret?.data?.data;
  } catch (err) {
    return;
  }
};

export const fetchRootDataInfo = async (
  project: string
): Promise<InvestmentData | undefined> => {
  try {
    if (!project) return;
    return await secureFetch(
      `${kbPublicPrefix}/api/fundraising/search/legacy?keyword=${project}&target=kb`
    );
  } catch (err) {
    return;
  }
};

export const getTwitterAuthUrl = async (): Promise<
  | {
      url: string;
    }
  | undefined
> => {
  try {
    return await secureFetch(`${kbPrefix}/api/xhunt/auth/twitter/url`);
  } catch (err) {
    return;
  }
};

export const postTwitterCallback = async ({
  code,
  state,
}: {
  code: string;
  state: string;
}): Promise<
  | {
      token: string;
      user: {
        id: string;
        username: string;
        displayName: string;
        avatar: string;
      };
    }
  | undefined
> => {
  try {
    return await secureFetch(`${kbPrefix}/api/xhunt/auth/twitter/callback`, {
      method: 'POST',
      body: JSON.stringify({
        code,
        state,
      }),
    });
  } catch (err) {
    return;
  }
};

export const fetchTwRenameInfo = async (
  project: string
): Promise<AccountsResponse | undefined> => {
  try {
    if (!project) return;
    const originUrl = `https://api.memory.lol/v1/tw/${project}`;
    const retJSON = await fetch(
      `${kbPrefix}/api/proxy?url=${encodeURIComponent(originUrl)}`
    );
    return await retJSON.json();
  } catch (err) {
    return;
  }
};

export const fetchTokenAnalysisInfo = async (
  ticker: string | undefined | null,
  signal?: AbortSignal
): Promise<TokenAnalysisData | undefined> => {
  try {
    if (!ticker) {
      return undefined;
    }

    // 去除 ticker 中的 $ 符号
    const cleanedTicker = ticker.replace(/\$/g, '');

    let parameters;
    if (ticker.includes('$')) {
      parameters = `ticker=${cleanedTicker}`;
    } else {
      parameters = `ca=${cleanedTicker}`;
    }

    const data = await secureFetch(
      `${kbPublicPrefix}/fetch/token/analysis?${parameters}&target=k8s_kota`,
      {
        method: 'GET',
        signal, // 添加 signal 参数，用于中止请求
      }
    );

    return data?.data?.data as TokenAnalysisData;
  } catch (err) {
    return undefined;
  }
};

export const fetchSupportedTokens = async (): Promise<
  SupportedToken[] | undefined
> => {
  try {
    const ret = await secureFetch(
      `${kbPublicPrefix}/fetch/token/all?target=k8s_kota`
    );
    return ret?.data?.data;
  } catch (err) {
    return undefined;
  }
};

/** 🆕 新的rank批量接口，替代fetchTwitterRankBatch **/
export const fetchTwitterRankBatchNew = async (
  usernames: string[]
): Promise<NewRankBatchItem[] | undefined> => {
  try {
    if (!usernames.length) return;
    const ret = await secureFetch(
      `${kbPublicPrefix}/fetch/twitter/rank?usernames=${usernames.join(
        ','
      )}&target=k8s_kota`
    );
    return ret?.data?.data;
  } catch (err) {
    return;
  }
};

/** 🆕 数据转换函数：将新接口数据转换为旧的RankResponse格式 **/
export const convertNewRankDataToOldFormat = (
  newData: NewRankBatchItem[],
  usernames: string[]
): RankResponse[] => {
  return usernames.map((username) => {
    const rankItem = newData.find(
      (item) =>
        String(item.username).toLowerCase() === String(username).toLowerCase()
    );
    return {
      isProject: false, // 新接口中没有这个字段，设为默认值
      isCn: false, // 新接口中没有这个字段，设为默认值
      kolRank: rankItem?.kolRank || -1,
      kolCnRank: -1, // 新接口中没有这个字段，设为默认值
      kolProjectRank: -1, // 新接口中没有这个字段，设为默认值
    };
  });
};

// 获取关注关系数据
export const fetchFollowRelation = async (
  username: string,
  limit: number = 30,
  offset: number = 0
): Promise<FollowRelationData | undefined> => {
  try {
    if (!username) return;
    const ret = await secureFetch(
      `${kbPublicPrefix}/fetch/twitter/follow_relation?username=${username}&limit=${limit}&offset=${offset}&target=k8s_kota`
    );
    return ret?.data?.data;
  } catch (err) {
    console.log('Failed to fetch follow relation:', err);
    return undefined;
  }
};

// 获取项目成员
export const fetchProjectMember = async (
  handle: string
): Promise<ProjectMemberData | undefined> => {
  try {
    if (!handle) return;
    return await secureFetch(
      `${kbPublicPrefix}/pro/api/user_relation?target=k8s_kota`,
      {
        method: 'POST',
        body: JSON.stringify({
          handle: handle,
        }),
      }
    );
  } catch (err) {
    console.log('Failed to fetch project members:', err);
    return undefined;
  }
};
// 获取热门项目
export const getHotProject = async (
  group: 'global' | 'cn' = 'cn',
  classification: 'project' | 'person' = 'project',
  days: 1 | 7 = 1
): Promise<any> => {
  try {
    return await secureFetch(
      `${kbPublicPrefix}/fetch/twitter/top_following?group=${group}&class=${classification}&days=${days}&target=k8s_kota`
    );
  } catch (err) {
    console.log('Failed to fetch hot projects:', err);
    return undefined;
  }
};

// 获取热门代笔
export const getHotToken = async (): Promise<any> => {
  try {
    return await secureFetch(
      `${kbPublicPrefix}/fetch/token/top_symbol?target=k8s_kota`
    );
  } catch (err) {
    return undefined;
  }
};

// 获取热门推文数据
export const getHotTweets = async (project: string = 'xhunt'): Promise<any> => {
  try {
    return await secureFetch(
      `${kbPublicPrefix}/info/board/hot?project=${project}&target=k8s_kota`
    );
  } catch (err) {
    console.log('Failed to fetch hot tweets:', err);
    return undefined;
  }
};

// 获取灵魂浓度
export const getSoulInfo = async (
  handle: string
): Promise<SoulDensityData | undefined> => {
  try {
    if (!handle) return;
    const ret = await secureFetch(
      `${kbPublicPrefix}/pro/api/soul?target=k8s_kota`,
      {
        method: 'POST',
        body: JSON.stringify({
          handle: String(handle).toLowerCase(),
        }),
      }
    );
    if (ret && ret.score) {
      return ret;
    } else {
      return undefined;
    }
  } catch (err) {
    return undefined;
  }
};

// 热门讨论项目
export const getTopTag = async (tag: string, group: string, days: 1 | 7) => {
  try {
    return await secureFetch(
      `${kbPublicPrefix}/fetch/twitter/top_tag?tag=${tag}&group=${group}&days=${days}&target=k8s_kota`
    );
  } catch (err) {
    return undefined;
  }
};

// 异步检查删推状态
export const fetchDeletedStatus = async (tweetId: string) => {
  try {
    return await secureFetch(
      `${kbPublicPrefix}/fetch/tweet/deleted_status?tweet_id=${tweetId}&target=k8s_kota`
    );
  } catch (err) {
    return undefined;
  }
};

// 判断推文是否ai生成的概率 POST
export const fetchAiContent = async (
  text: string,
  tweet_id: string
): Promise<AiContentResponse | undefined> => {
  return await secureFetch(
    `${kbAuthPrefix}/pro/api/ai/content?target=k8s_kota&tweet_id=${tweet_id}`,
    {
      method: 'POST',
      body: JSON.stringify({ text, tweet_id }),
    }
  );
};

// AI聊天接口
export const fetchAiChat = async (
  handle: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  message: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ReadableStream<Uint8Array> | undefined> => {
  try {
    const stream = await secureFetchInContent<ReadableStream<Uint8Array>>(
      `${kbPublicSteamPrefix}/pro/api/chat?target=k8s_kota`,
      {
        method: 'POST',
        body: JSON.stringify({
          handle,
          history,
          message,
        }),
        responseType: 'stream',
      }
    );

    return stream;
  } catch (err) {
    console.error('Failed to fetch AI chat:', err);
    return undefined;
  }
};

// 钱包签名
export const getWalletNonce = async (
  address: string
): Promise<
  | {
      nonce: string;
      message: string;
    }
  | undefined
> => {
  try {
    return await secureFetch(
      `${kbPrefix}/api/xhunt/auth/wallet/nonce?address=${encodeURIComponent(
        address
      )}`
    );
  } catch (err) {
    return;
  }
};

export const verifyWalletSignature = async (params: {
  address: string;
  signature: string;
  nonce?: string;
  message?: string;
}): Promise<
  | {
      success: boolean;
      bound?: boolean;
    }
  | undefined
> => {
  try {
    return await secureFetch(`${kbPrefix}/api/xhunt/auth/wallet/verify`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  } catch (err) {
    return;
  }
};

// Mantle 活动：查询当前用户是否已报名
export const getMantleRegistrationMe = async (
  userid: string
): Promise<
  | {
      registered: boolean;
      registration?: any;
      invitedCount?: number;
      totalRegistrations?: number;
      hunterData?: {
        mindshare?: {
          rank?: number | null;
          invites?: number;
        };
        workshare?: {
          rank?: number | null;
        };
      };
    }
  | undefined
> => {
  try {
    return await secureFetch(
      `${kbPrefix}/api/xhunt/mantle/me?userid=${userid}`
    );
  } catch (err) {
    return;
  }
};

// Mantle 活动：报名提交
export const postMantleRegister = async (args: {
  invitedByCode?: string | null;
  evmAddress?: string | null;
  registrationUrl?: string | null;
}): Promise<
  | {
      success: boolean;
      inviteCode?: string | null;
      registration?: any;
    }
  | undefined
> => {
  return await secureFetch(`${kbPrefix}/api/xhunt/mantle/register`, {
    method: 'POST',
    body: JSON.stringify(args),
  });
};

// Mantle 活动：获取猎人数据统计
export const getMantleHunterStats = async (): Promise<
  | {
      bridges: number | null;
      participants: number;
      tweets: string;
      views: string;
    }
  | undefined
> => {
  try {
    return await secureFetch(
      `${kbPublicPrefix}/pro/api/hunters_data?target=k8s_kota`,
      {
        method: 'POST',
        body: JSON.stringify({ campaign: 'mantle' }),
      }
    );
  } catch (err) {
    return;
  }
};

// Mantle 活动：获取排行榜数据
export const getMantleLeaderboard = async (): Promise<
  | {
      mindshare: Array<{
        image: string;
        invites: number;
        kol_engages: number;
        likes: number;
        name: string;
        rank: number;
        score: number | null;
        share: number;
        tweets: number;
        username: string;
        views: number;
      }>;
      workshare: Array<{
        bridges: number | null;
        image: string;
        invites: number;
        kol_engages: number;
        likes: number;
        name: string;
        rank: number;
        score: number | null;
        share: number;
        tweets: number;
        username: string;
        views: number;
      }>;
    }
  | undefined
> => {
  try {
    return await secureFetch(
      `${kbPublicPrefix}/pro/api/hunters?target=k8s_kota`,
      {
        method: 'POST',
        body: JSON.stringify({ campaign: 'mantle' }),
      }
    );
  } catch (err) {
    return;
  }
};

// 获取登录用户的私信（仅已登录xhunt用户可用）
export const fetchPrivateMessages = async (params?: {
  page?: number;
  limit?: number;
  type?: 'received' | 'sent' | 'all';
  token?: string;
}): Promise<PrivateMessageItem[] | undefined> => {
  try {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const type = params?.type ?? 'received';
    const res = await secureFetch<PrivateMessagesResponse>(
      `${kbPrefix}/api/xhunt/private-messages?page=${page}&limit=${limit}&type=${type}&v=${String(
        params?.token
      ).slice(5, 12)}`,
      { method: 'GET', tokenRequired: true }
    );
    if (!res?.success) return undefined;
    return res.data?.messages || [];
  } catch (err) {
    return undefined;
  }
};

// 实时订阅：关注与推文动态
export interface TwitterFeedParams {
  usernames?: string[];
  timestamp?: number; // 秒级时间戳，表示从该时间戳之后的事件
}

export const fetchTwitterFeed = async (
  params?: TwitterFeedParams
): Promise<any | undefined> => {
  try {
    const usernames = (params?.usernames || []).filter(Boolean);
    const timestamp = params?.timestamp;
    const qs: string[] = [];
    if (usernames.length) qs.push(`usernames=${usernames.join(',')}`);
    if (timestamp) qs.push(`timestamp=${timestamp}`);
    const query = qs.length
      ? `?${qs.join('&')}&target=k8s_kota`
      : `?target=k8s_kota`;
    return await secureFetch(`${kbPublicPrefix}/fetch/twitter/feed${query}`);
  } catch (err) {
    return undefined;
  }
};

// 八卦推文数据类型定义
export interface GossipTweet {
  id: string;
  create_time: string;
  text: string;
  profile: {
    name: string;
    username: string;
    username_raw: string;
    profile_image_url: string;
    description?: string;
    followers_count?: number;
    following_count?: number;
    is_blue_verified?: boolean;
    verified?: boolean;
  };
  info?: {
    html?: string;
    photos?: Array<{
      id: string;
      url: string;
      alt_text?: string;
    }>;
    mentions?: Array<{
      id: string;
      name: string;
      username: string;
    }>;
  };
  statistic?: {
    likes: number;
    reply_count: number;
    retweet_count: number;
    views: number;
    bookmark_count?: number;
    quote_count?: number;
  };
  ai?: {
    crypto_relevant?: boolean;
    summary_cn?: string;
    summary_en?: string;
    tags?: string[];
  };
}

export interface GossipTweetsResponse {
  code: number;
  message: string;
  data: {
    data: GossipTweet[];
  };
}

// 获取八卦推文数据
export const fetchGossipTweets = async (): Promise<
  GossipTweetsResponse | undefined
> => {
  try {
    return await secureFetch<GossipTweetsResponse>(
      `${kbPublicPrefix}/fetch/twitter/top_tweet?group=cn&days=1&by_view=false&filter_tag=gossip&target=k8s_kota`
    );
  } catch (err) {
    console.log('Failed to fetch gossip tweets:', err);
    return undefined;
  }
};
