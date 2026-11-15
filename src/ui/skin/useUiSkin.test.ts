import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from './skins';
import { useUiSkin } from './useUiSkin';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));

describe('useUiSkin', () => {
  test('returns the default skin when nothing is stored', () => {
    const { result } = renderHook(() => useUiSkin());
    expect(result.current.skin).toBe('obsidian');
  });

  test('returns the stored skin', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    const { result } = renderHook(() => useUiSkin());
    expect(result.current.skin).toBe('soft');
  });

  test('falls back to the default for an invalid stored value', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'pink');
    const { result } = renderHook(() => useUiSkin());
    expect(result.current.skin).toBe('obsidian');
  });

  test('stores a new skin', () => {
    const { result } = renderHook(() => useUiSkin());
    act(() => result.current.setSkin('native'));
    expect(getMemoryValue(UI_SKIN_STORAGE_KEY)).toBe('native');
    expect(result.current.skin).toBe('native');
  });
});
