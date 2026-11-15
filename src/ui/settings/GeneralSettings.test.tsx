import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue } from '../../test/memoryStorage';
import { SettingsHarness } from '../../test/settingsHarness';
import { GeneralSettings, SOUND_FILES, SoundSetting } from './GeneralSettings';

const setLang = vi.hoisted(() => vi.fn());
vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang }),
}));
vi.mock('~compontents/pages/constants.tsx', () => ({
  defaultSound: { url: 'https://cdn.example/15011.mp3', data: 'data:default' },
}));

describe('GeneralSettings', () => {
  test('offers the skin picker, switches language with the old test ids and lists the switches', async () => {
    render(
      <SettingsHarness initial={{ showSidebarIcon: true }}>
        <GeneralSettings items={[{ key: 'showSidebarIcon', label: 'showSidebarIcon' }]} />
      </SettingsHarness>,
    );
    expect(screen.getByRole('radiogroup', { name: 'uiSkinLabel' })).toBeTruthy();
    expect(screen.getByTestId('settings-ui-skin')).toBeTruthy();
    await userEvent.click(screen.getByTestId('settings-language-en'));
    expect(setLang).toHaveBeenCalledWith('en');
    expect(screen.getByRole('switch', { name: 'showSidebarIcon' })).toBeTruthy();
  });

  test('stores the default sound, then fetches, caches and previews another one', async () => {
    const played: string[] = [];
    const onPlay = (event: Event) => played.push((event as CustomEvent<{ url: string }>).detail.url);
    window.addEventListener('xhunt:play-sound', onPlay);
    vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob(['ab'], { type: 'audio/mpeg' }) })));
    render(
      <SettingsHarness initial={{}}>
        <SoundSetting />
      </SettingsHarness>,
    );
    await waitFor(() =>
      expect(getMemoryValue('@xhunt/sound')).toEqual({ url: 'https://cdn.example/15011.mp3', data: 'data:default' }),
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'soundEffect' }));
    await userEvent.click(await screen.findByRole('option', { name: 'sound1' }));
    await waitFor(() => expect((getMemoryValue('@xhunt/sound') as { url: string }).url).toBe(SOUND_FILES[0]));
    expect((getMemoryValue('@xhunt/sound') as { data: string }).data).toMatch(/^data:audio\/mpeg;base64,/);
    await waitFor(() => expect(played).toHaveLength(1), { timeout: 1500 });
    window.removeEventListener('xhunt:play-sound', onPlay);
    vi.unstubAllGlobals();
  });
});
