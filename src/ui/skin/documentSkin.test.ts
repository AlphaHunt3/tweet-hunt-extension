import { describe, expect, test } from 'vitest';
import { TOKENS_STYLE_ID, applySkinToDocument, ensureSkinTokens } from './documentSkin';

describe('applySkinToDocument', () => {
  test('writes skin, theme and palette onto the root', () => {
    const root = document.documentElement;
    applySkinToDocument(root, { skin: 'native', theme: 'dark', palette: 'dim' });
    expect(root.getAttribute('data-xh-skin')).toBe('native');
    expect(root.getAttribute('data-xh-theme')).toBe('dark');
    expect(root.getAttribute('data-xh-palette')).toBe('dim');
  });
});

describe('ensureSkinTokens', () => {
  test('injects one style element and updates it in place', () => {
    const first = ensureSkinTokens(document, ':root{--a:1}');
    const second = ensureSkinTokens(document, ':root{--a:2}');
    expect(first).toBe(second);
    expect(document.querySelectorAll(`#${TOKENS_STYLE_ID}`)).toHaveLength(1);
    expect(second.textContent).toBe(':root{--a:2}');
  });
});
