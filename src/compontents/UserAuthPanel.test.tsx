import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '~/ui/skin/skins';
import { UserAuthPanel } from './UserAuthPanel';

vi.mock('~storage/useLocalStorage.ts', () => import('../test/memoryStorage'));
vi.mock('~contents/hooks/i18n.ts', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const mocks = vi.hoisted(() => ({
  logout: vi.fn(async () => null),
  clearAuthState: vi.fn(async () => {}),
  openNewTab: vi.fn(),
  navigateTo: vi.fn(),
}));
vi.mock('~contents/services/review.ts', () => ({ userLogout: () => mocks.logout() }));
vi.mock('~contents/services/api.ts', () => ({ getTwitterAuthUrl: async () => ({ url: 'https://x.com/auth' }) }));
vi.mock('~contents/utils', () => ({ openNewTab: (url: string) => mocks.openNewTab(url) }));
vi.mock('~contents/utils/auth.ts', () => ({ clearAuthState: () => mocks.clearAuthState() }));
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo: mocks.navigateTo }),
}));

const USER = { username: 'alice_web3', displayName: 'Alice Chen', avatar: '' };

describe('UserAuthPanel', () => {
  test('signed out: social links and a login button', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    render(<UserAuthPanel userInfo={null} />);
    expect(screen.getByTestId('auth-logged-out-panel')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe(
      'https://github.com/AlphaHunt3/tweet-hunt-extension',
    );
    expect(screen.getByRole('link', { name: 'Telegram' })).toBeTruthy();
    await userEvent.click(screen.getByTestId('auth-login-button'));
    await waitFor(() => expect(mocks.openNewTab).toHaveBeenCalledWith('https://x.com/auth'));
  });

  test('signed in: shows the account and logs out from the menu', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    setMemoryValue('@xhunt/user', USER);
    render(<UserAuthPanel userInfo={null} />);
    expect(screen.getByTestId('auth-logged-in-panel').textContent).toContain('@alice_web3');
    const trigger = screen.getByTestId('auth-user-menu-button');
    expect(trigger).toBe(screen.getByRole('button', { name: 'panelAccountMenu' }));
    await userEvent.click(trigger);
    const logoutItem = await screen.findByTestId('auth-logout-button');
    expect(logoutItem).toBe(screen.getByRole('menuitem', { name: 'logout' }));
    await userEvent.click(logoutItem);
    await waitFor(() => expect(mocks.logout).toHaveBeenCalled());
    await waitFor(() => expect(mocks.clearAuthState).toHaveBeenCalled());
  });

  test('native links to settings', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    setMemoryValue('@xhunt/user', USER);
    render(<UserAuthPanel userInfo={null} />);
    expect(screen.getByTestId('auth-logged-in-panel').textContent).toContain('panelSignedInAs');
    await userEvent.click(screen.getByRole('button', { name: 'settings' }));
    expect(mocks.navigateTo).toHaveBeenCalledWith('/settings');
  });
});
