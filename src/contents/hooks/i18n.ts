import zh from '../../locales/zh.json';
import en from '../../locales/en.json';
import { useCallback, useEffect, useMemo } from 'react';
import { isUserUsingChinese } from '~contents/utils';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { kbPrefix } from '~contents/services/api.ts';

interface I18nData {
  zh: Record<string, string>;
  en: Record<string, string>;
}

const CACHE_KEY = '@xhunt/i18n-cache';

// Module-level promise to prevent multiple concurrent requests
let translationPromise: Promise<I18nData | null> | null = null;
// Module-level flag to track initialization
let isInitialized = false;

async function fetchRemoteTranslations(): Promise<I18nData | null> {
  // If there's already a request in progress, return it
  if (translationPromise) {
    return translationPromise;
  }

  // Create new promise for this request
  translationPromise = (async () => {
    try {
      const response = await fetch(`${kbPrefix}/nacos-configs?dataId=xhunt_i18n&group=DEFAULT_GROUP`);
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to fetch translations:', err);
      return null;
    }
  })();

  // Create a cleanup promise that will reset translationPromise after current one completes
  translationPromise.finally(() => {
    // Only reset if this is still the current promise
    if (translationPromise === translationPromise) {
      translationPromise = null;
    }
  });

  return translationPromise;
}

async function loadCachedTranslations(): Promise<I18nData | null> {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (!cachedData) return null;

    return JSON.parse(cachedData);
  } catch (err) {
    return null;
  }
}

async function updateCache(data: I18nData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    // localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
  } catch (err) {
    console.error('Failed to update translations cache:', err);
  }
}

export const useI18n = () => {
  const [lang, setLang, {
    isLoading: isLoadingLang
  }] = useLocalStorage('@settings/language1', '');
  const [remoteTranslations, setRemoteTranslations] = useLocalStorage<I18nData | null>('@xhunt/remote-translations', null);

  useEffect(() => {
    if(!isLoadingLang && !lang) {
      setLang(isUserUsingChinese() ? 'zh' : 'en');
    }
  }, [isLoadingLang, lang]);

  // Load translations only once globally
  useEffect(() => {
    if (isInitialized) return;
    isInitialized = true;

    async function loadTranslations() {
      // First try to load from cache
      const cachedData = await loadCachedTranslations();
      if (cachedData) {
        setRemoteTranslations(cachedData);
      }

      // Then fetch fresh data from remote
      const remoteData = await fetchRemoteTranslations();
      if (remoteData) {
        setRemoteTranslations(remoteData);
        await updateCache(remoteData);
      }
    }

    loadTranslations();
  }, []);

  const translations = useMemo(() => {
    const localTranslations = lang === 'zh' ? zh : en;
    const remoteTranslationsForLang = remoteTranslations?.[lang as keyof I18nData];

    return {
      ...localTranslations,
      ...(remoteTranslationsForLang || {})
    };
  }, [lang, remoteTranslations]);

  const t = useCallback((key: string) => {
    try {
      // @ts-ignore
      return translations[key] || key;
    } catch (err) {
      return key;
    }
  }, [translations]);

  return {
    lang,
    setLang,
    t
  };
};
