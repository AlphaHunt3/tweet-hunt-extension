import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { TOKENS_STYLE_ID } from './documentSkin';
import { UI_SKIN_STORAGE_KEY } from './skins';
import { useDocumentSkin } from './useDocumentSkin';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));

describe('useDocumentSkin', () => {
  test('applies the stored skin and the theme to <html>', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    renderHook(() => useDocumentSkin('light'));
    const html = document.documentElement;
    expect(html.getAttribute('data-xh-skin')).toBe('soft');
    expect(html.getAttribute('data-xh-theme')).toBe('light');
    expect(html.getAttribute('data-xh-palette')).toBeTruthy();
    expect(document.getElementById(TOKENS_STYLE_ID)).not.toBeNull();
    expect(document.getElementById('xh-fonts-soft')).not.toBeNull();
  });

  test('follows skin changes made elsewhere', () => {
    renderHook(() => useDocumentSkin('dark'));
    expect(document.documentElement.getAttribute('data-xh-skin')).toBe('obsidian');
    act(() => setMemoryValue(UI_SKIN_STORAGE_KEY, 'native'));
    expect(document.documentElement.getAttribute('data-xh-skin')).toBe('native');
  });
});
