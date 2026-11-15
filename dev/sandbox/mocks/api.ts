import { MOCK_SOUL } from './fixtures';

export * from '../../../src/contents/services/api';

export const fetchXHuntUserTags = async () => ({
  count: 1,
  byTwitterId: {},
  byUsername: { mira_onchain: { tagsZh: ['研究员', 'DeFi'], tagsEn: ['Researcher', 'DeFi'] } },
});
export const fetchPrivateMessages = async () => [];
export const fetchKolChatList = async () => [];
export const getTwitterAuthUrl = async () => 'https://x.com';
export const getSoulInfo = async () => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return MOCK_SOUL;
};
