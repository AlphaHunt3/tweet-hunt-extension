import { DeletedTweet, KolData } from '~types';

export const fetchTwitterInfo = async (userId: string): Promise<KolData | null> => {
  try {
    const retJSON = await fetch(`https://kota.chaineye.tools/api/plugin/twitter/info?username=${userId}`);
    const ret = await retJSON.json();
    return ret?.data;
  } catch (err) {
    return null;
  }
}

export const fetchDelTwitterInfo = async (userId: string): Promise<DeletedTweet[] | null> => {
  try {
    const retJSON = await fetch(`https://kota.chaineye.tools/api/plugin/twitter/deletedtweets?username=${userId}`);
    const ret = await retJSON.json();
    return ret?.data;
  } catch (err) {
    return null;
  }
}
