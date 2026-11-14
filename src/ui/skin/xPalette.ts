import { useSyncExternalStore } from 'react';

export type XPalette = 'default' | 'dim' | 'lights-out';

const DIM_RGB: [number, number, number] = [21, 32, 43];

export function parseRgb(color: string): [number, number, number] | null {
  const rgb = color.match(
    /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)/i,
  );
  if (rgb) {
    if (rgb[4] !== undefined && Number(rgb[4]) === 0) return null;
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return null;
}

export function detectXPalette(
  background: string,
  fallbackTheme: 'light' | 'dark' = 'dark',
): XPalette {
  const rgb = parseRgb(background);
  if (!rgb) return fallbackTheme === 'light' ? 'default' : 'lights-out';
  const [r, g, b] = rgb;
  if (r > 200 && g > 200 && b > 200) return 'default';
  const distance =
    Math.abs(r - DIM_RGB[0]) + Math.abs(g - DIM_RGB[1]) + Math.abs(b - DIM_RGB[2]);
  return distance < 30 ? 'dim' : 'lights-out';
}

export function createXPaletteStore(doc: Document) {
  let current: XPalette | null = null;
  let observer: MutationObserver | null = null;
  const listeners = new Set<() => void>();

  const read = (): XPalette => {
    const view = doc.defaultView;
    const background =
      doc.body && view ? view.getComputedStyle(doc.body).backgroundColor : '';
    const theme = doc.documentElement.style.colorScheme === 'light' ? 'light' : 'dark';
    return detectXPalette(background, theme);
  };

  const start = () => {
    observer = new MutationObserver(() => {
      const next = read();
      if (next === current) return;
      current = next;
      listeners.forEach((listener) => listener());
    });
    const options = { attributes: true, attributeFilter: ['style'] };
    observer.observe(doc.documentElement, options);
    if (doc.body) observer.observe(doc.body, options);
  };

  return {
    getSnapshot(): XPalette {
      if (current === null) current = read();
      return current;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!observer) start();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && observer) {
          observer.disconnect();
          observer = null;
        }
      };
    },
  };
}

let defaultStore: ReturnType<typeof createXPaletteStore> | null = null;
const getDefaultStore = () => (defaultStore ??= createXPaletteStore(document));

export function useXPalette(): XPalette {
  const store = getDefaultStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => 'lights-out');
}
