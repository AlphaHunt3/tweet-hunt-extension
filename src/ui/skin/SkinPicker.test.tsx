import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from './skins';
import { SkinPicker } from './SkinPicker';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

describe('SkinPicker', () => {
  test('offers three named skins with obsidian selected by default', () => {
    render(<SkinPicker />);
    expect(screen.getByRole('radiogroup', { name: 'uiSkinLabel' })).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /uiSkinObsidianName/ }).getAttribute('aria-checked')).toBe('true');
  });

  test('stores the skin a user picks', async () => {
    const user = userEvent.setup();
    render(<SkinPicker />);
    await user.click(screen.getByRole('radio', { name: /uiSkinSoftName/ }));
    expect(getMemoryValue(UI_SKIN_STORAGE_KEY)).toBe('soft');
    expect(screen.getByRole('radio', { name: /uiSkinSoftName/ }).getAttribute('aria-checked')).toBe('true');
  });

  test('moves the selection with arrow keys', async () => {
    const user = userEvent.setup();
    render(<SkinPicker />);
    screen.getByRole('radio', { name: /uiSkinObsidianName/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(getMemoryValue(UI_SKIN_STORAGE_KEY)).toBe('native');
  });
});
