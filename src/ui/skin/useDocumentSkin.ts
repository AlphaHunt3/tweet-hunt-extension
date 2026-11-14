import { useEffect } from 'react';
import { applySkinToDocument, ensureSkinTokens } from './documentSkin';
import { ensureSkinFonts } from './fonts';
import { useUiSkin } from './useUiSkin';
import { useXPalette } from './xPalette';

export function useDocumentSkin(theme: string) {
  const { skin } = useUiSkin();
  const palette = useXPalette();

  useEffect(() => {
    ensureSkinTokens();
  }, []);

  useEffect(() => {
    applySkinToDocument(document.documentElement, {
      skin,
      theme: theme === 'light' ? 'light' : 'dark',
      palette,
    });
    ensureSkinFonts(skin);
  }, [skin, theme, palette]);

  return skin;
}
