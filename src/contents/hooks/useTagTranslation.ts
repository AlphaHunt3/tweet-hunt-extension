import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { fetchTagMappings } from '~contents/services/api';

const CACHE_KEY = '@xhunt/tag-mappings-cache';

export const useTagTranslation = () => {
  const { lang } = useI18n();
  const [tagMappings, setTagMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadTagMappings = async () => {
      if (lang !== 'en') {
        setTagMappings({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Try to load from cache first
      const cachedItem = sessionStorage.getItem(CACHE_KEY);
      if (cachedItem) {
        try {
          const { data, timestamp } = JSON.parse(cachedItem);
          // Cache for 1 hour
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            setTagMappings(data);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // Invalid cache, fetch fresh data
          sessionStorage.removeItem(CACHE_KEY);
        }
      }

      // Fetch from API
      try {
        const mappings = await fetchTagMappings();
        if (mappings) {
          setTagMappings(mappings);
          // Cache the result
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              data: mappings,
              timestamp: Date.now(),
            })
          );
        }
      } catch (error) {
        console.error('Failed to load tag mappings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTagMappings();
  }, [lang]);

  const translateTag = useCallback(
    (tag: string): string => {
      if (lang !== 'en' || isLoading) return tag;
      return tagMappings[tag] || tag;
    },
    [lang, tagMappings, isLoading]
  );

  return { translateTag, isLoading };
};
