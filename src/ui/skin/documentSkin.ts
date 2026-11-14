import tokensCss from 'data-text:~/css/skin-tokens.css';
import type { UiSkin } from './skins';
import type { XPalette } from './xPalette';

export const TOKENS_STYLE_ID = 'xh-skin-tokens';

export interface DocumentSkinState {
  skin: UiSkin;
  theme: 'light' | 'dark';
  palette: XPalette;
}

export function applySkinToDocument(root: HTMLElement, state: DocumentSkinState) {
  root.setAttribute('data-xh-skin', state.skin);
  root.setAttribute('data-xh-theme', state.theme);
  root.setAttribute('data-xh-palette', state.palette);
}

export function ensureSkinTokens(doc: Document = document, css: string = tokensCss) {
  let style = doc.getElementById(TOKENS_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = TOKENS_STYLE_ID;
    (doc.head || doc.documentElement).appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
  return style;
}
