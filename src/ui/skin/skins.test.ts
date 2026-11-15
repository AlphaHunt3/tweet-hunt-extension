import { describe, expect, test } from 'vitest';
import {
  DEFAULT_UI_SKIN,
  UI_SKINS,
  UI_SKIN_INTRO_SEEN_KEY,
  UI_SKIN_META,
  UI_SKIN_STORAGE_KEY,
  isUiSkin,
  resolveUiSkin,
} from './skins';

describe('skins', () => {
  test('lists the three skins in display order', () => {
    expect(UI_SKINS).toEqual(['soft', 'obsidian', 'native']);
  });

  test('defaults to obsidian and uses the settings keys', () => {
    expect(DEFAULT_UI_SKIN).toBe('obsidian');
    expect(UI_SKIN_STORAGE_KEY).toBe('@settings/uiSkin');
    expect(UI_SKIN_INTRO_SEEN_KEY).toBe('@xhunt/uiSkinIntroSeen');
  });

  test('recognises valid skins only', () => {
    expect(isUiSkin('soft')).toBe(true);
    expect(isUiSkin('native')).toBe(true);
    expect(isUiSkin('dark')).toBe(false);
    expect(isUiSkin(undefined)).toBe(false);
    expect(isUiSkin(3)).toBe(false);
  });

  test('falls back to the default for unknown values', () => {
    expect(resolveUiSkin('soft')).toBe('soft');
    expect(resolveUiSkin('')).toBe('obsidian');
    expect(resolveUiSkin(null)).toBe('obsidian');
    expect(resolveUiSkin('Soft')).toBe('obsidian');
  });

  test('has name and description keys for every skin', () => {
    for (const skin of UI_SKINS) {
      expect(UI_SKIN_META[skin].nameKey).toMatch(/^uiSkin.+Name$/);
      expect(UI_SKIN_META[skin].descKey).toMatch(/^uiSkin.+Desc$/);
    }
  });
});
