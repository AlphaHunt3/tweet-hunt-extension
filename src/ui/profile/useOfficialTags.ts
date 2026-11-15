import { useEffect, useState } from 'react';
import { officialTagsManager } from '~/utils/officialTagsManager';

export function useOfficialTags(
  handle: string,
  twitterId: string | number | null | undefined,
  lang: string,
): string[] {
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    setTags([]);
    if (!handle) return;
    let alive = true;
    (async () => {
      try {
        await officialTagsManager.init();
        const next = officialTagsManager.getUserTags(
          handle,
          lang === 'en' ? 'en' : 'zh',
          twitterId == null ? null : String(twitterId),
        );
        if (alive) setTags(next || []);
      } catch {
        if (alive) setTags([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [handle, twitterId, lang]);

  return tags;
}
