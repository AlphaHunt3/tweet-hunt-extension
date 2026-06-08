import { useEffect, useMemo } from 'react';
import { useRequest } from 'ahooks';
import { fetchSupportedTokens } from '~contents/services/api.ts';
import type { SupportedToken } from '~types';

interface UseSupportedTokensResult {
  supportedTokens: SupportedToken[] | null;
  loadingSupportedTokens: boolean;
}

const requestConfig = {
  debounceWait: 300,
  manual: true,
  debounceLeading: true,
  debounceTrailing: false,
};

export function useSupportedTokens(): UseSupportedTokensResult {
  const {
    data: supportedTokens = null,
    run: fetchSupportedTokensData,
    loading: loadingSupportedTokens,
  } = useRequest(fetchSupportedTokens, requestConfig);

  useEffect(() => {
    fetchSupportedTokensData();
  }, []);

  return useMemo(
    () => ({
      supportedTokens,
      loadingSupportedTokens,
    }),
    [supportedTokens, loadingSupportedTokens],
  );
}
