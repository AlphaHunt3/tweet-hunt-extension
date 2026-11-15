import geistMonoUrl from 'url:@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2';
import geistUrl from 'url:@fontsource-variable/geist/files/geist-latin-wght-normal.woff2';
import interUrl from 'url:@fontsource-variable/inter/files/inter-latin-wght-normal.woff2';
import jetbrainsMonoUrl from 'url:@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2';
import type { UiSkin } from './skins';

interface SkinFont {
  family: string;
  url: string;
}

const SKIN_FONTS: Record<UiSkin, SkinFont[]> = {
  soft: [
    { family: 'XH Inter', url: interUrl },
    { family: 'XH JetBrains Mono', url: jetbrainsMonoUrl },
  ],
  obsidian: [
    { family: 'XH Geist', url: geistUrl },
    { family: 'XH Geist Mono', url: geistMonoUrl },
  ],
  native: [],
};

export function fontFaceCss(fonts: SkinFont[]) {
  return fonts
    .map(
      (font) =>
        `@font-face{font-family:"${font.family}";src:url("${font.url}") format("woff2");font-weight:100 900;font-style:normal;font-display:swap;}`,
    )
    .join('\n');
}

// @font-face 写在 Shadow Root 里不生效，所以注入主文档
export function ensureSkinFonts(skin: UiSkin, doc: Document = document) {
  const fonts = SKIN_FONTS[skin];
  if (fonts.length === 0) return null;
  const id = `xh-fonts-${skin}`;
  const existing = doc.getElementById(id) as HTMLStyleElement | null;
  if (existing) return existing;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = fontFaceCss(fonts);
  (doc.head || doc.documentElement).appendChild(style);
  return style;
}
