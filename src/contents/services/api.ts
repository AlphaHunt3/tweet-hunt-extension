import { DeletedTweet, InvestmentData, KolData } from '~types';

export const fetchTwitterInfo = async (userId: string): Promise<KolData | null> => {
  try {
    if (!userId) return;
    const retJSON = await fetch(`https://kota.chaineye.tools/api/plugin/twitter/info?username=${userId}`);
    const ret = await retJSON.json();
    return ret?.data;
  } catch (err) {
    return null;
  }
}

export const fetchDelTwitterInfo = async (userId: string): Promise<DeletedTweet[] | null> => {
  try {
    if (!userId) return;
    const retJSON = await fetch(`https://kota.chaineye.tools/api/plugin/twitter/deletedtweets?username=${userId}`);
    const ret = await retJSON.json();
    return ret?.data;
  } catch (err) {
    return null;
  }
}

export const fetchRootDataInfo = async (project: string): Promise<InvestmentData | null> => {
  try {
    if (!project) return;
    const retJSON = await fetch(`https://kb.cryptohunt.ai/api/fundraising/search/legacy?keyword=${project}`);
    return await retJSON.json();
  } catch (err) {
    return null;
  }
}
