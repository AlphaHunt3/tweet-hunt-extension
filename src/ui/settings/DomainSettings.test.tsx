import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { DomainSettings } from './DomainSettings';
import { reloadPage } from './reloadPage';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('./reloadPage', () => ({ reloadPage: vi.fn() }));

const preference = () => getMemoryValue('@xhunt/user-domain-preference') as { domains: string[]; primaryDomain: string };
const isDisabled = (element: HTMLElement) =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('data-disabled');

describe('DomainSettings', () => {
  test('sets the priority, keeps one domain and moves AI ranks back to Web3', async () => {
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3', 'ai'], primaryDomain: 'web3' });
    setMemoryValue('@settings/avatarRankMode', 'ai');
    render(<DomainSettings />);
    await userEvent.click(screen.getByTestId('settings-domain-primary-ai'));
    expect(preference().primaryDomain).toBe('ai');

    await userEvent.click(screen.getByTestId('settings-domain-toggle-ai'));
    expect(preference().domains).toEqual(['web3']);
    expect(getMemoryValue('@settings/avatarRankMode')).toBe('web3');
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(isDisabled(screen.getByTestId('settings-domain-toggle-web3'))).toBe(true);
    expect(screen.queryByRole('radiogroup', { name: 'domainPriorityTitle' })).toBeNull();
  });
});
