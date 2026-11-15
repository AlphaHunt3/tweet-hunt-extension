import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAgent } from '@ui-sdk/react/agent';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from './skins';
import { SkinPicker } from './SkinPicker';

const agent = createAgent();

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

  test('an agent can find the skin picker and change the skin', async () => {
    render(<SkinPicker />);

    const components = agent
      .snapshot()
      .filter((entry) => !entry.offPage && entry.component !== 'more');
    for (const entry of components) {
      expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
    }
    const picker = components.find((entry) => entry.label === 'uiSkinLabel');
    expect(picker, 'uiSkinLabel is missing from the snapshot').toBeTruthy();
    expect(picker!.items).toEqual([
      { value: 'soft', label: 'uiSkinSoftName uiSkinSoftDesc' },
      { value: 'obsidian', label: 'uiSkinObsidianName uiSkinObsidianDesc' },
      { value: 'native', label: 'uiSkinNativeName uiSkinNativeDesc' },
    ]);

    const result = await agent.act({
      steps: [{ ref: 'uiSkinLabel', action: 'setValue', args: ['soft'] }],
    });
    expect(result.ok, result.error?.message).toBe(true);
    expect(getMemoryValue(UI_SKIN_STORAGE_KEY)).toBe('soft');
    expect(screen.getByRole('radio', { name: /uiSkinSoftName/ }).getAttribute('aria-checked')).toBe('true');
  });
});
