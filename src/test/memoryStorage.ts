import { useCallback, useEffect, useState } from 'react';

const store = new Map<string, unknown>();
const listeners = new Map<string, Set<(value: unknown) => void>>();

export function resetMemoryStorage() {
  store.clear();
  listeners.clear();
}

export function getMemoryValue(key: string) {
  return store.get(key);
}

export function setMemoryValue(key: string, value: unknown) {
  store.set(key, value);
  listeners.get(key)?.forEach((listener) => listener(value));
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() =>
    store.has(key) ? (store.get(key) as T) : initialValue,
  );

  useEffect(() => {
    const listener = (next: unknown) => setValue(next as T);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(listener);
    return () => {
      listeners.get(key)?.delete(listener);
    };
  }, [key]);

  const set = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = (store.has(key) ? store.get(key) : initialValue) as T;
      setMemoryValue(key, typeof next === 'function' ? (next as (previous: T) => T)(previous) : next);
    },
    [key, initialValue],
  );
  return [value, set, { isLoading: false }] as const;
}
