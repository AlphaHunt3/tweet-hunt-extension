import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue } from '../test/memoryStorage';
import { UI_SKIN_INTRO_SEEN_KEY, UI_SKIN_STORAGE_KEY } from '~/ui/skin/skins';
import UserDomainSetupModal from './UserDomainSetupModal';

vi.mock('~storage/useLocalStorage', () => import('../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~contents/hooks/useAvatarSkin', () => ({
  useAvatarSkinState: () => ({ skin: 'skin-1', setSkinCustomized: vi.fn() }),
}));

async function openModal(onComplete = vi.fn()) {
  render(<UserDomainSetupModal isOpen onComplete={onComplete} />);
  const host = document.getElementById('xhunt-domain-setup-host')!;
  const root = host.shadowRoot!.querySelector('div') as HTMLElement;
  const ui = within(root);
  await waitFor(() => ui.getByTestId('domain-card-web3'));
  return { ui, onComplete };
}

describe('UserDomainSetupModal', () => {
  test('asks for a skin between the domain and avatar steps', async () => {
    const user = userEvent.setup();
    const { ui, onComplete } = await openModal();

    await user.click(ui.getByTestId('domain-card-web3'));
    await user.click(ui.getByTestId('domain-setup-next'));
    expect(ui.getByText('uiSkinStepTitle')).toBeTruthy();

    await user.click(ui.getByRole('radio', { name: /uiSkinSoftName/ }));
    expect(getMemoryValue(UI_SKIN_STORAGE_KEY)).toBe('soft');

    await user.click(ui.getByTestId('domain-setup-skin-next'));
    await user.click(ui.getByTestId('domain-setup-confirm'));

    expect(onComplete).toHaveBeenCalledWith({ domains: ['web3'], primaryDomain: 'web3' });
    expect(getMemoryValue(UI_SKIN_INTRO_SEEN_KEY)).toBe(true);
  });

  test('can go back from the skin step', async () => {
    const user = userEvent.setup();
    const { ui } = await openModal();
    await user.click(ui.getByTestId('domain-card-web3'));
    await user.click(ui.getByTestId('domain-setup-next'));
    await user.click(ui.getByTestId('domain-setup-skin-back'));
    expect(ui.getByTestId('domain-setup-next')).toBeTruthy();
  });
});
