interface KolFollower {
  avatar: string; // 头像 URL
  name: string; // 名称
  username: string; // 用户名
}

interface KolFollowData {
  cnKolFollowers: number; // 中国 KOL 粉丝数
  globalKolFollowers: number; // 全球 KOL 粉丝数
  topKolFollowersCount: number; // Top KOL 粉丝总数
  topKolFollowersSlice10: KolFollower[]; // Top 10 KOL 粉丝列表
}

interface MentionData {
  maxProfitAvg: number
  maxProfitAvgPct: number
  nowProfitAvg: number
  nowProfitAvgPct: number
  winRate: number
  winRatePct: number
}

export interface TwitterInfo {
  kolFollow: KolFollowData;
  kolTokenMention: {
    day30: MentionData
    day90: MentionData
  }
}

export const fetchTwitterInfo = async (userId: string): Promise<TwitterInfo> => {
  try {
    const retJSON = await fetch(`https://kota.chaineye.tools/api/plugin/twitter/info?username=${userId}`);
    const ret = await retJSON.json();
    return ret?.data;
  } catch (err) {
    return null;
  }
}
