import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchKolInteractions,
  fetchKolInteractionsAvailability,
  type FetchKolInteractionsAvailabilityParams,
  type KolInteractionsData,
  type KolInteractionsLimitResponse,
} from '~contents/services/api';

const CACHE_TTL_MS = 3 * 60 * 1000;
const PREFETCH_DEBOUNCE_MS = 300;

interface DetailCacheEntry {
  expiresAt: number;
  data: KolInteractionsData;
}

const socialCircleDetailCache = new Map<string, DetailCacheEntry>();

interface SocialCircleRequestIdentity {
  cacheKey: string;
  params: FetchKolInteractionsAvailabilityParams;
}

const getRequestIdentity = (
  twitterId?: string,
  handler?: string,
  profileUsername?: string,
): SocialCircleRequestIdentity | null => {
  const normalizedProfileUsername = String(profileUsername || '')
    .trim()
    .replace(/^@+/, '');
  if (/^[A-Za-z0-9_]{1,15}$/.test(normalizedProfileUsername)) {
    return {
      cacheKey: `username:${normalizedProfileUsername.toLowerCase()}`,
      params: {
        username: normalizedProfileUsername,
        limit: 20,
      },
    };
  }

  const normalizedId = String(twitterId || '').trim();
  if (/^[1-9]\d{0,19}$/.test(normalizedId)) {
    return {
      cacheKey: `id:${normalizedId}`,
      params: { userId: normalizedId, limit: 20 },
    };
  }

  const normalizedHandler = String(handler || '')
    .trim()
    .replace(/^@+/, '');
  if (/^[A-Za-z0-9_]{1,15}$/.test(normalizedHandler)) {
    return {
      cacheKey: `username:${normalizedHandler.toLowerCase()}`,
      params: {
        username: normalizedHandler,
        limit: 20,
      },
    };
  }

  return null;
};

export interface UseKolSocialCircleResult {
  data: KolInteractionsData | null;
  isAvailable: boolean;
  isLoading: boolean;
  limitExceeded: KolInteractionsLimitResponse | null;
  loadDetails: () => Promise<boolean>;
}

export default function useKolSocialCircle({
  twitterId,
  handler,
  profileUsername,
  profileLoading,
  enabled,
}: {
  twitterId?: string;
  handler?: string;
  profileUsername?: string;
  profileLoading: boolean;
  enabled: boolean;
}): UseKolSocialCircleResult {
  const identity = useMemo(
    () => getRequestIdentity(twitterId, handler, profileUsername),
    [twitterId, handler, profileUsername],
  );
  const [data, setData] = useState<KolInteractionsData | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [limitExceeded, setLimitExceeded] =
    useState<KolInteractionsLimitResponse | null>(null);
  const detailRequestController = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      detailRequestController.current?.abort();
    },
    [],
  );

  useEffect(() => {
    detailRequestController.current?.abort();
    detailRequestController.current = null;
    setData(null);
    setIsAvailable(false);
    setIsLoading(false);
    setLimitExceeded(null);

    if (!enabled || profileLoading || !identity) return;

    const controller = new AbortController();
    let disposed = false;
    const timer = window.setTimeout(async () => {
      const available = await fetchKolInteractionsAvailability(
        identity.params,
        controller.signal,
      );
      if (disposed || controller.signal.aborted) return;

      setIsAvailable(available);
    }, PREFETCH_DEBOUNCE_MS);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, identity?.cacheKey, profileLoading]);

  const loadDetails = useCallback(async () => {
    if (!enabled || profileLoading || !identity) return false;

    const cached = socialCircleDetailCache.get(identity.cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setData(cached.data);
      setLimitExceeded(null);
      return true;
    }

    detailRequestController.current?.abort();
    const controller = new AbortController();
    detailRequestController.current = controller;
    setIsLoading(true);
    setLimitExceeded(null);

    try {
      const response = await fetchKolInteractions(
        identity.params,
        controller.signal,
      );
      if (controller.signal.aborted) return false;

      if (response?.code === 429) {
        setLimitExceeded(response);
        return true;
      }

      if (!response?.data || response.data.items.length === 0) return false;

      const nextData = {
        ...response.data,
        items: response.data.items.slice(0, 20),
      };
      socialCircleDetailCache.set(identity.cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: nextData,
      });
      setData(nextData);
      return true;
    } finally {
      if (detailRequestController.current === controller) {
        detailRequestController.current = null;
        setIsLoading(false);
      }
    }
  }, [enabled, identity, profileLoading]);

  return {
    data,
    isAvailable,
    isLoading,
    limitExceeded,
    loadDetails,
  };
}
