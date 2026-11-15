// 假数据不引用真实 X 账号的头像（截图会公开），头像留空时组件显示首字母
const kol = (handle: string, name: string) => ({
  username: handle,
  name,
  avatar: '',
});

export const MOCK_USER_ID = 'mira_onchain';

export const MOCK_TW_INFO = {
  basicInfo: { isKol: true, classification: 'person' },
  kolFollow: {
    isProject: false,
    isCn: true,
    kolRank: 86,
    kolGlobalRank: 1234,
    kolCnRank: 56,
    kolProjectRank: null,
    kolRank20W: 1234,
    kolRankChange: { day1: 12, day7: 30, day30: 40 },
    kolGlobalRankChange: { day1: 3, day7: 12, day30: 51 },
    kolCnRankChange: { day1: 3, day7: 5, day30: 8 },
    globalKolFollowersCountAi: 460,
    topKolFollowersCountAi: 21,
    cnKolFollowersCountAi: 88,
    kolRank20WAi: 3120,
    kolRankChangeAi: { day1: 5 },
    kolCnRankAi: 140,
    globalKolFollowersCount: 1200,
    cnKolFollowersCount: 312,
    topKolFollowersCount: 86,
    globalKolFollowers: [
      kol('lumenlabs', 'Lumen Labs'),
      kol('0xkai', '0xKai'),
      kol('echolin', 'Echo Lin'),
      kol('theopark', 'Theo Park'),
      kol('nova_vc', 'Nova VC'),
      kol('rin_eth', 'Rin.eth'),
      kol('juno_dao', 'Juno DAO'),
      kol('mika', 'Mika'),
    ],
    cnKolFollowers: [kol('echolin', 'Echo Lin'), kol('mika', 'Mika'), kol('xiaoyu', '小鱼')],
    topKolFollowers: [kol('lumenlabs', 'Lumen Labs'), kol('nova_vc', 'Nova VC')],
  },
  multiField: {
    cn: { fields: [{ DeFi: 86 }, { 二级交易: 78 }, { 宏观: 71 }, { Meme: 64 }, { NFT: 52 }], summary: '偏 DeFi 与二级交易' },
    en: { fields: [{ DeFi: 86 }, { Trading: 78 }, { Macro: 71 }, { Meme: 64 }, { NFT: 52 }], summary: 'DeFi and trading first' },
    update: '2026-11-01',
  },
  multiFieldAi: {
    cn: { fields: [{ 'AI Agent': 91 }, { 模型评测: 82 }, { 基础设施: 74 }, { 应用: 60 }] },
    en: { fields: [{ 'AI Agent': 91 }, { 'Model evals': 82 }, { Infra: 74 }, { Apps: 60 }] },
    update: '2026-11-01',
  },
  mbti: {
    cn: {
      mbti: 'INTJ',
      keyword: ['战略思维', '长期主义', '独立', '数据驱动'],
      explanation: '理性、独立，擅长系统化推演，偏好长期框架而非短线噪音。',
    },
    en: {
      mbti: 'INTJ',
      keyword: ['Strategic', 'Long-term', 'Independent', 'Data-driven'],
      explanation: 'Rational and independent, prefers long-term frameworks over short-term noise.',
    },
  },
  kolTokenMention: {
    day90: {
      tokenMentions: ['SOL', 'JUP', 'ETH', 'EIGEN', 'ENA', 'PENDLE', 'JTO', 'RAY', 'ORCA', 'TIA', 'ARB', 'OP', 'LINK', 'AAVE', 'ONDO', 'W', 'PYTH', 'BONK'].map(
        (symbol, index) => ({ symbol, mentionCount: 30 - index }),
      ),
      maxProfitAvg: 0.352,
      maxProfitAvgPct: 0.12,
      winRate: 0.62,
      winRatePct: 0.05,
      nowProfitAvg: -0.041,
      nowProfitAvgPct: 0.31,
    },
  },
  narrative: {
    cn: '长期跟踪再质押与链上收益策略，近 30 天重点讨论 Solana 生态 DEX 与 AI Agent 结合的机会。',
    en: 'Tracks restaking and on-chain yield strategies; lately focused on Solana DEXs and AI agents.',
  },
};

export const MOCK_ROOT_DATA = null;

export const MOCK_DELETED_TWEETS = Array.from({ length: 14 }, (_, index) => ({
  id: `d${index}`,
  create_time: new Date(Date.now() - (index + 1) * 5 * 86400000).toISOString(),
  profile: { text: `已删除的推文 ${index + 1}：一段关于链上收益的观点。` },
}));

export const MOCK_RENAME_INFO = {
  accounts: [
    {
      screen_names: {
        mira_research: ['2021-02-01', '2022-06-30'],
        mira_defi: ['2022-07-01', '2024-01-15'],
        mira_onchain: ['2024-01-16', '2026-11-01'],
      },
    },
  ],
};

export const MOCK_REVIEW_INFO = {
  averageRating: 4.6,
  totalReviews: 96,
  realTotalReviews: 128,
  topReviewers: [
    { avatar: '', name: 'Echo Lin', username: 'echolin', displayName: 'Echo Lin' },
    { avatar: '', name: 'Theo Park', username: 'theopark', displayName: 'Theo Park' },
    { avatar: '', name: 'Nova VC', username: 'nova_vc', displayName: 'Nova VC' },
    { avatar: '', name: 'Rin', username: 'rin_eth', displayName: 'Rin' },
  ],
  tagCloud: [
    { text: '投研', value: 12 },
    { text: '二级', value: 9 },
    { text: '宏观', value: 7 },
    { text: '空投', value: 5 },
    { text: '科学家', value: 4 },
    { text: '长期', value: 3 },
    { text: '数据', value: 2 },
    { text: '叙事', value: 1 },
  ],
};

export const MOCK_COMMENTS = {
  comments: [
    {
      id: 'c1',
      reviewer: { avatar: '', displayName: 'Echo Lin', username: 'echolin' },
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      rating: 5,
      tags: ['投研', '宏观'],
      comment: '链上数据扎实，长期跟踪下来判断很稳。',
    },
    {
      id: 'c2',
      reviewer: { avatar: '', displayName: 'Theo Park', username: 'theopark' },
      updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      rating: 4,
      tags: ['二级'],
      comment: '观点清晰，偶尔偏激进。',
    },
    {
      id: 'c3',
      reviewer: { avatar: '', displayName: 'Nova VC', username: 'nova_vc' },
      updatedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
      rating: 4,
      tags: [],
      comment:
        '跟踪了一年多，宏观判断和链上数据的结合是她最强的地方。每次大的叙事切换前都会提前写长文，把资金流、交易所储备和稳定币增发放在一起看，' +
        '结论不一定都对，但推理过程很透明，能学到东西。缺点是更新频率不稳定，有时候一周没有动静。',
    },
  ],
  pagination: { page: 1, totalPages: 5, totalComments: 23, hasPrevPage: false, hasNextPage: true },
};

export const MOCK_MESSAGES = [
  {
    id: 'm1',
    title: 'XHunt 0.4.6 更新',
    content: '新增三种界面风格，可在设置里切换。',
    created: String(Date.now() - 2 * 3600000),
    type: 'all',
  },
  {
    id: 'm2',
    title: '贡献榜新活动',
    content: '本周贡献榜奖励已开放领取。',
    created: String(Date.now() - 4 * 86400000),
    type: 'web3',
  },
];

export const MOCK_USER = {
  avatar: '',
  displayName: 'Alice Chen',
  username: 'alice_web3',
  id: 'u1',
  twitterId: '1',
  xPoints: 120,
};

export const MOCK_SOUL = {
  score: 87,
  profile_analysis: 90,
  content_analysis: 82,
  engagement_analysis: 76,
  xhunt_analysis: 88,
  kol_interaction: 84,
  reason: '原创内容占比高，长期稳定输出投研观点，与头部 KOL 互动频繁。',
  reason_en: 'Mostly original research posts over a long period, with frequent interaction with top KOLs.',
  last_updated: '2026-11-10',
};

export const MOCK_PROJECT_TW_INFO = {
  ...MOCK_TW_INFO,
  basicInfo: { isKol: true, classification: 'project' },
  kolFollow: {
    ...MOCK_TW_INFO.kolFollow,
    isProject: true,
    kolProjectRank: 321,
    kolProjectRankChange: { day1: -2, day7: 5, day30: 9 },
  },
};

const sentiment = (positive: number, negative: number, good: string[], bad: string[]) => ({
  positivePercentage: positive,
  negativePercentage: negative,
  positiveBulletPoints: good,
  negativeBulletPoints: bad,
});

export const MOCK_DISCUSSION = {
  ca: '',
  symbol: 'MIRA',
  name: 'Mira',
  twitter: 'mira_onchain',
  popularity1d: 82,
  popularity7d: 76,
  discussion1dCn: sentiment(63.25, 21.5, ['主网上线后流动性明显改善', '多位头部 KOL 转发了路线图'], ['代币解锁时间表仍不透明']),
  discussion1dEn: sentiment(63.25, 21.5, ['Liquidity improved after mainnet', 'Roadmap shared by several top KOLs'], ['Unlock schedule still unclear']),
  discussion7dCn: sentiment(58, 27.4, ['生态合作数量增长'], ['近期价格波动较大', '社区对空投规则有争议']),
  discussion7dEn: sentiment(58, 27.4, ['More ecosystem partners'], ['Volatile price lately', 'Airdrop rules disputed']),
};
