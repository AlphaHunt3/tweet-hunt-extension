import { useCallback } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { DEFAULT_UI_SKIN, UI_SKIN_STORAGE_KEY, resolveUiSkin, type UiSkin } from './skins';

export function useUiSkin() {
  const [stored, setStored, meta] = useLocalStorage<string>(
    UI_SKIN_STORAGE_KEY,
    DEFAULT_UI_SKIN,
  );
  const setSkin = useCallback((next: UiSkin) => setStored(next), [setStored]);
  return { skin: resolveUiSkin(stored), setSkin, isLoading: meta.isLoading };
}
