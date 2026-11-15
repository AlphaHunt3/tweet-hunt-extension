import { describe, expect, test } from 'vitest';
import { ensureSkinFonts, fontFaceCss } from './fonts';

describe('fontFaceCss', () => {
  test('declares a variable woff2 face', () => {
    expect(fontFaceCss([{ family: 'XH Inter', url: 'x.woff2' }])).toBe(
      '@font-face{font-family:"XH Inter";src:url("x.woff2") format("woff2");font-weight:100 900;font-style:normal;font-display:swap;}',
    );
  });
});

describe('ensureSkinFonts', () => {
  test('injects the fonts of a skin once', () => {
    const first = ensureSkinFonts('soft');
    const second = ensureSkinFonts('soft');
    expect(first).not.toBeNull();
    expect(first).toBe(second);
    expect(first!.textContent).toContain('"XH Inter"');
    expect(first!.textContent).toContain('"XH JetBrains Mono"');
  });

  test('injects nothing for the native skin, which uses the page font', () => {
    expect(ensureSkinFonts('native')).toBeNull();
    expect(document.getElementById('xh-fonts-native')).toBeNull();
  });
});
