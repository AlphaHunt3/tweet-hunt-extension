const kol = (handle: string, name: string) => ({
  username: handle,
  name,
  avatar: `https://unavatar.io/x/${handle}`,
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
    kolRankChange: { day1: 2, day7: 12, day30: 40 },
    kolGlobalRankChange: { day1: 3, day7: 12, day30: 51 },
    kolCnRankChange: { day1: 0, day7: 3, day30: 8 },
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
};

export const MOCK_ROOT_DATA = null;

export const MOCK_REVIEW_INFO = {
  averageRating: 4.6,
  totalReviews: 128,
  realTotalReviews: 96,
  topReviewers: [
    { avatar: 'https://unavatar.io/x/echolin', username: 'echolin', displayName: 'Echo Lin' },
    { avatar: 'https://unavatar.io/x/theopark', username: 'theopark', displayName: 'Theo Park' },
  ],
  tagCloud: [
    { text: '投研', value: 12 },
    { text: '二级', value: 9 },
    { text: '宏观', value: 7 },
    { text: '空投', value: 5 },
  ],
};

export const MOCK_COMMENTS = {
  comments: [
    {
      id: 'c1',
      reviewer: { avatar: 'https://unavatar.io/x/echolin', displayName: 'Echo Lin', username: 'echolin' },
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      rating: 5,
      tags: ['投研', '宏观'],
      comment: '链上数据扎实，长期跟踪下来判断很稳。',
    },
    {
      id: 'c2',
      reviewer: { avatar: 'https://unavatar.io/x/theopark', displayName: 'Theo Park', username: 'theopark' },
      updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      rating: 4,
      tags: ['二级'],
      comment: '观点清晰，偶尔偏激进。',
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
  avatar: 'https://unavatar.io/x/alice_web3',
  displayName: 'Alice Chen',
  username: 'alice_web3',
  id: 'u1',
  twitterId: '1',
  xPoints: 120,
};
