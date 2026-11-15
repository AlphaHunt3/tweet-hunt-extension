import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { avatarSkins } from '~contents/constants/avatarSkins';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { SettingsHarness } from '../../test/settingsHarness';
import { AvatarRankSettings } from './AvatarRankSettings';
import { reloadPage } from './reloadPage';

const setSkinCustomized = vi.hoisted(() => vi.fn());
vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~contents/hooks/useAvatarSkin', () => ({
  useAvatarSkinState: () => ({ skin: 'skin-1', setSkinCustomized }),
}));
vi.mock('./reloadPage', () => ({ reloadPage: vi.fn() }));

const ITEMS = [{ key: 'showAvatarRank', label: 'showAvatarRank' }];
const isDisabled = (element: HTMLElement) =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('data-disabled');

describe('AvatarRankSettings', () => {
  test('shows the rank type and badge skins only while ranks are on', async () => {
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3', 'ai'], primaryDomain: 'web3' });
    render(
      <SettingsHarness initial={{ showAvatarRank: false }}>
        <AvatarRankSettings items={ITEMS} />
      </SettingsHarness>,
    );
    expect(screen.queryByRole('radiogroup', { name: 'avatarRankModeSelectorTitle' })).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'showAvatarRank' }));
    expect(reloadPage).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('settings-avatar-rank-mode-ai'));
    expect(getMemoryValue('@settings/avatarRankMode')).toBe('ai');
    expect(reloadPage).toHaveBeenCalledWith(100);

    const [id, skin] = Object.entries(avatarSkins)[1];
    await userEvent.click(screen.getByRole('radio', { name: skin.nameKey }));
    expect(setSkinCustomized).toHaveBeenCalledWith(id);
    expect(screen.getByTestId(`settings-avatar-skin-${id}`)).toBeTruthy();
  });

  test('locks the rank type to the only domain', () => {
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3'], primaryDomain: 'web3' });
    render(
      <SettingsHarness initial={{ showAvatarRank: true }}>
        <AvatarRankSettings items={ITEMS} />
      </SettingsHarness>,
    );
    expect(isDisabled(screen.getByTestId('settings-avatar-rank-mode-web3'))).toBe(true);
    expect(screen.queryByTestId('settings-avatar-rank-mode-ai')).toBeNull();
  });
});
