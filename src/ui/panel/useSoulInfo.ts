import { useRequest } from 'ahooks';
import { getSoulInfo } from '~contents/services/api.ts';

const cache = new Map<string, Promise<any>>();

function loadSoulInfo(twitterId: string) {
  let request = cache.get(twitterId);
  if (!request) {
    request = Promise.resolve(getSoulInfo(twitterId)).catch((error: unknown) => {
      cache.delete(twitterId);
      throw error;
    });
    cache.set(twitterId, request);
  }
  return request;
}

export function useSoulInfo(twitterId: string | null | undefined) {
  const id = twitterId ? String(twitterId) : '';
  const { data, loading } = useRequest(() => loadSoulInfo(id), {
    refreshDeps: [id],
    ready: Boolean(id),
  });
  return { data: id ? data : undefined, loading: Boolean(id) && loading };
}
