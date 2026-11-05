import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchEditedTweetCounts,
  fetchEditedTweets,
} from '~contents/services/api';
import type {
  EditedTweetAccess,
  EditedTweetChain,
  EditedTweetDetailScope,
} from '~types';

const PAGE_SIZE = 20;

interface EditedTweetsState {
  count: number;
  access?: EditedTweetAccess;
  items: EditedTweetChain[];
  loadingCount: boolean;
  loadingDetails: boolean;
  detailsLoaded: boolean;
  error: boolean;
  hasMore: boolean;
}

const initialState: EditedTweetsState = {
  count: 0,
  items: [],
  loadingCount: false,
  loadingDetails: false,
  detailsLoaded: false,
  error: false,
  hasMore: false,
};

function mergeEditedTweetChains(
  current: EditedTweetChain[],
  incoming: EditedTweetChain[],
) {
  const byRootId = new Map(current.map((item) => [item.edit.root_id, item]));
  for (const item of incoming) {
    byRootId.set(item.edit.root_id, item);
  }
  return Array.from(byRootId.values());
}

export function useEditedTweets(twitterId: string, enabled: boolean) {
  const [state, setState] = useState<EditedTweetsState>(initialState);
  const requestGenerationRef = useRef(0);
  const offsetRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const generation = ++requestGenerationRef.current;
    offsetRef.current = 0;
    setState({ ...initialState, loadingCount: enabled && Boolean(twitterId) });

    if (!enabled || !twitterId) return;

    void fetchEditedTweetCounts([twitterId]).then((data) => {
      if (generation !== requestGenerationRef.current) return;
      if (!data) {
        setState((prev) => ({
          ...prev,
          loadingCount: false,
          error: true,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        count: Number(data.counts?.[twitterId] || 0),
        access: data.xhunt_access,
        loadingCount: false,
        error: false,
      }));
    });

    return () => {
      requestGenerationRef.current += 1;
    };
  }, [enabled, twitterId]);

  const loadPage = useCallback(
    async (offset: number, replace: boolean) => {
      const current = stateRef.current;
      const scope: EditedTweetDetailScope | undefined =
        current.access?.detail_scope;
      if (
        !enabled ||
        !twitterId ||
        !scope ||
        scope === 'count_only' ||
        current.loadingDetails
      ) {
        return;
      }

      const generation = requestGenerationRef.current;
      setState((prev) => ({ ...prev, loadingDetails: true, error: false }));
      const data = await fetchEditedTweets({
        twitterId,
        limit: PAGE_SIZE,
        offset,
      });
      if (generation !== requestGenerationRef.current) return;

      if (!data) {
        setState((prev) => ({
          ...prev,
          loadingDetails: false,
          detailsLoaded: true,
          error: true,
        }));
        return;
      }

      offsetRef.current = offset + PAGE_SIZE;
      setState((prev) => ({
        ...prev,
        access: data.xhunt_access || prev.access,
        items: replace
          ? data.items
          : mergeEditedTweetChains(prev.items, data.items),
        loadingDetails: false,
        detailsLoaded: true,
        error: false,
        hasMore: data.items.length === PAGE_SIZE,
      }));
    },
    [enabled, twitterId],
  );

  const loadDetails = useCallback(async () => {
    const current = stateRef.current;
    if (current.detailsLoaded && !current.error) return;
    await loadPage(0, true);
  }, [loadPage]);

  const retryDetails = useCallback(async () => {
    await loadPage(0, true);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    const current = stateRef.current;
    if (!current.hasMore || current.loadingDetails) return;
    await loadPage(offsetRef.current, false);
  }, [loadPage]);

  return {
    ...state,
    loadDetails,
    retryDetails,
    loadMore,
  };
}
