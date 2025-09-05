// src/hooks/useSecureFetch.ts

import { useCallback } from 'react';
import { secureFetch } from '../utils/api';

export function useSecureFetch() {
  const fetcher = useCallback(async <T,>(endpoint: string, options: RequestInit = {}) => {
    // @ts-ignore
    return secureFetch<T>(endpoint, options);
  }, []);

  return { fetcher };
}
