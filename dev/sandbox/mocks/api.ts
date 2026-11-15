import { MOCK_SOUL, MOCK_EDITED_CHAINS } from './fixtures';

export * from '../../../src/contents/services/api';

export const fetchXHuntUserTags = async () => ({
  count: 1,
  byTwitterId: {},
  byUsername: { mira_onchain: { tagsZh: ['研究员', 'DeFi'], tagsEn: ['Researcher', 'DeFi'] } },
});
export const fetchPrivateMessages = async () => [];
export const fetchKolChatList = async () => [
  {
    id: 'k1',
    twitter_handle: 'mira_onchain',
    type: 'official',
    visibility: 'public',
    name: 'Mira',
    perspective_name_zh: 'Mira 思维',
    perspective_name_en: 'Mira Perspective',
  },
];
export const fetchKolInteractionsAvailability = async () => true;
export const fetchKolInteractions = async () => ({ code: 200, data: { items: [] } });
export const getTwitterAuthUrl = async () => 'https://x.com';
export const getSoulInfo = async () => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return MOCK_SOUL;
};

const EDITED_ACCESS = { detail_scope: 'full' };
export const fetchEditedTweetCounts = async (ids: string[]) => ({
  counts: Object.fromEntries(ids.map((id) => [id, MOCK_EDITED_CHAINS.length])),
  xhunt_access: EDITED_ACCESS,
});
export const fetchEditedTweets = async () => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { items: MOCK_EDITED_CHAINS, xhunt_access: EDITED_ACCESS };
};
export const fetchDeletedStatus = async () => null;
