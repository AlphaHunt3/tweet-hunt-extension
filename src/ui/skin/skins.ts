export const UI_SKINS = ['soft', 'obsidian', 'native'] as const;
export type UiSkin = (typeof UI_SKINS)[number];

export const DEFAULT_UI_SKIN: UiSkin = 'obsidian';
export const UI_SKIN_STORAGE_KEY = '@settings/uiSkin';
export const UI_SKIN_INTRO_SEEN_KEY = '@xhunt/uiSkinIntroSeen';

export const UI_SKIN_META: Record<UiSkin, { nameKey: string; descKey: string }> = {
  soft: { nameKey: 'uiSkinSoftName', descKey: 'uiSkinSoftDesc' },
  obsidian: { nameKey: 'uiSkinObsidianName', descKey: 'uiSkinObsidianDesc' },
  native: { nameKey: 'uiSkinNativeName', descKey: 'uiSkinNativeDesc' },
};

export function isUiSkin(value: unknown): value is UiSkin {
  return typeof value === 'string' && (UI_SKINS as readonly string[]).includes(value);
}

export function resolveUiSkin(value: unknown): UiSkin {
  return isUiSkin(value) ? value : DEFAULT_UI_SKIN;
}
