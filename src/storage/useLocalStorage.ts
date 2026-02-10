import React from 'react'
import { useStorage as usePlasmoStorage } from '@plasmohq/storage/hook'
import { localStorageInstance } from './index.ts'

type Setter<T> = ((v?: T, isHydrated?: boolean) => T) | T

export function useLocalStorage<T>(key: string, initialValue: Setter<T>) {
  return usePlasmoStorage<T>(
    {
      key,
      instance: localStorageInstance
    },
    initialValue
  )
}

export function useSessionStorage<T>(key: string, initialValue: Setter<T>) {
  const getInitial = React.useCallback((): T => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return typeof initialValue === 'function'
        ? (initialValue as (v?: T) => T)()
        : initialValue
    }
    try {
      const stored = window.sessionStorage.getItem(key)
      if (stored != null) {
        return JSON.parse(stored) as T
      }
    } catch {
      // ignore parsing errors
    }
    return typeof initialValue === 'function'
      ? (initialValue as (v?: T) => T)()
      : initialValue
  }, [key, initialValue])

  const [value, setValue] = React.useState<T>(getInitial)

  const setSessionValue = React.useCallback(
    (next: Setter<T>) => {
      setValue((prev) => {
        const val =
          typeof next === 'function'
            ? (next as (v?: T, isHydrated?: boolean) => T)(prev, true)
            : next
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem(key, JSON.stringify(val))
          }
        } catch {
          // ignore quota or serialization errors
        }
        return val
      })
    },
    [key]
  )

  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.storageArea === window.sessionStorage && e.key === key) {
        try {
          const newVal = e.newValue ? (JSON.parse(e.newValue) as T) : getInitial()
          setValue(newVal)
        } catch {
          // ignore parsing error
        }
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [key, getInitial])

  return [value, setSessionValue] as const
}
