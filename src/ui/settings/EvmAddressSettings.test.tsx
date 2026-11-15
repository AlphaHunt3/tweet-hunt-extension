import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { EvmAddressSettings, formatEvmInput, shortAddress } from './EvmAddressSettings';

const update = vi.hoisted(() => vi.fn());
vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~contents/services/review.ts', () => ({ updateEvmAddresses: (addresses: string[]) => update(addresses) }));
vi.mock('~utils/dataValidation', () => ({ cleanErrorMessage: (message: unknown) => String(message) }));

const GOOD = `0x${'a'.repeat(40)}`;

describe('EvmAddressSettings', () => {
  test('formats the input, flags a bad address and saves a good one', async () => {
    update.mockResolvedValueOnce({ evmAddresses: [GOOD] });
    const onSaved = vi.fn();
    render(<EvmAddressSettings onSaved={onSaved} />);
    const box = screen.getByRole('textbox', { name: 'evmAddressBinding' }) as HTMLInputElement;
    await userEvent.type(box, 'zz12');
    expect(box.value).toBe('0x12');
    expect(screen.getByText('mantleHunterEvmAddressFormatIncorrect')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'save' }).hasAttribute('disabled')).toBe(true);

    await userEvent.clear(box);
    await userEvent.type(box, 'a'.repeat(40));
    await userEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(update).toHaveBeenCalledWith([GOOD]);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('evmBindSuccess'));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  test('starts from the bound address and shows server errors', async () => {
    update.mockRejectedValueOnce({ errorDetails: { message: 'Only once a month' } });
    render(<EvmAddressSettings userInfo={{ evmAddresses: [GOOD] } as never} onSaved={() => {}} />);
    expect((screen.getByRole('textbox', { name: 'evmAddressBinding' }) as HTMLInputElement).value).toBe(GOOD);
    await userEvent.click(screen.getByRole('button', { name: 'modify' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Only once a month'));
  });

  test('formats and shortens addresses', () => {
    expect([formatEvmInput(''), formatEvmInput('12'), formatEvmInput(`0x${'1'.repeat(41)}`)]).toEqual(['', '0x12', null]);
    expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });
});
