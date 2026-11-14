import { useCallback } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useUiSkin } from '../skin/useUiSkin';
import { HOME_VIEW_STORAGE_KEY, resolveHomeView, type HomeView } from './panelNav';

export function usePanelHomeView() {
  const { skin } = useUiSkin();
  const [stored, setStored] = useLocalStorage<string>(HOME_VIEW_STORAGE_KEY, '');
  const setView = useCallback((next: HomeView) => setStored(next), [setStored]);
  return { skin, view: resolveHomeView(skin, stored), setView };
}
