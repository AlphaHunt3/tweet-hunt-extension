import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { HOME_VIEWS, HOME_VIEW_STORAGE_KEY, destinationOf, resolveHomeView, routeOf } from './panelNav';
import { usePanelHomeView } from './usePanelHomeView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));

describe('panelNav', () => {
  test('each skin has its own views', () => {
    expect(HOME_VIEWS.soft).toEqual(['followers', 'portrait', 'reviews']);
    expect(HOME_VIEWS.obsidian).toEqual(['overview', 'followers', 'portrait', 'reviews']);
    expect(HOME_VIEWS.native).toEqual(['overview', 'followers', 'reviews']);
  });

  test('falls back to the first view the skin has', () => {
    expect(resolveHomeView('soft', 'overview')).toBe('followers');
    expect(resolveHomeView('native', 'portrait')).toBe('overview');
    expect(resolveHomeView('obsidian', 'reviews')).toBe('reviews');
    expect(resolveHomeView('obsidian', 42)).toBe('overview');
  });

  test('maps destinations to routes and back', () => {
    expect(routeOf('messages')).toBe('/messages');
    expect(routeOf('settings')).toBe('/settings');
    expect(routeOf('portrait')).toBe('/home');
    expect(destinationOf('/settings', 'reviews')).toBe('settings');
    expect(destinationOf('/home', 'reviews')).toBe('reviews');
  });
});

describe('usePanelHomeView', () => {
  test('stores the view and resolves it for the current skin', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    const { result } = renderHook(() => usePanelHomeView());
    expect(result.current.view).toBe('overview');
    act(() => result.current.setView('reviews'));
    expect(result.current.view).toBe('reviews');
    act(() => setMemoryValue(HOME_VIEW_STORAGE_KEY, 'portrait'));
    expect(result.current.view).toBe('overview');
  });
});
