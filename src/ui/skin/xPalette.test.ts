import { describe, expect, test } from 'vitest';
import { createXPaletteStore, detectXPalette, parseRgb } from './xPalette';

describe('parseRgb', () => {
  test('reads rgb, rgba and hex colours', () => {
    expect(parseRgb('rgb(21, 32, 43)')).toEqual([21, 32, 43]);
    expect(parseRgb('rgba(0, 0, 0, 1)')).toEqual([0, 0, 0]);
    expect(parseRgb('#ffffff')).toEqual([255, 255, 255]);
  });

  test('treats transparent and unknown values as missing', () => {
    expect(parseRgb('rgba(0, 0, 0, 0)')).toBeNull();
    expect(parseRgb('transparent')).toBeNull();
    expect(parseRgb('')).toBeNull();
  });
});

describe('detectXPalette', () => {
  test('maps the three X backgrounds', () => {
    expect(detectXPalette('rgb(255, 255, 255)')).toBe('default');
    expect(detectXPalette('rgb(21, 32, 43)')).toBe('dim');
    expect(detectXPalette('rgb(0, 0, 0)')).toBe('lights-out');
  });

  test('uses the theme when the background is unknown', () => {
    expect(detectXPalette('', 'light')).toBe('default');
    expect(detectXPalette('', 'dark')).toBe('lights-out');
  });
});

describe('createXPaletteStore', () => {
  test('reads the body background and reports changes', async () => {
    document.body.style.backgroundColor = 'rgb(21, 32, 43)';
    const store = createXPaletteStore(document);
    expect(store.getSnapshot()).toBe('dim');

    const seen: string[] = [];
    const unsubscribe = store.subscribe(() => seen.push(store.getSnapshot()));
    document.body.style.backgroundColor = 'rgb(0, 0, 0)';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(seen).toEqual(['lights-out']);
    unsubscribe();
    document.body.style.backgroundColor = '';
  });
});
