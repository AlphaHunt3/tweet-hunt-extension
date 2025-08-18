import { useStorage as usePlasmoStorage } from '@plasmohq/storage/hook'
import { localStorageInstance } from './index.ts'

type Setter<T> = ((v?: T, isHydrated?: boolean) => T) | T;

export function useLocalStorage<T>(key: string, initialValue: Setter<T>) {
  return usePlasmoStorage<T>(
    {
      key,
      instance: localStorageInstance
    },
    initialValue
  )
}