import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SearchField } from './SearchField';

function Search({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [q, setQ] = useState('');
  return (
    <SearchField aria-label='Search settings' placeholder='Search' value={q} onValueChange={setQ} onSubmit={onSubmit} shortcut='/' />
  );
}

describe('SearchField', () => {
  const xShortcut = vi.fn();
  afterEach(() => {
    document.removeEventListener('keydown', xShortcut, true);
    xShortcut.mockReset();
  });

  test('typing updates the value and Enter submits it', async () => {
    const onSubmit = vi.fn();
    render(<Search onSubmit={onSubmit} />);
    const input = screen.getByRole('searchbox', { name: 'Search settings' });
    await userEvent.type(input, 'avatar');
    expect((input as HTMLInputElement).value).toBe('avatar');
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('avatar');
  });

  test('keys typed in the field never reach page shortcuts', () => {
    document.addEventListener('keydown', xShortcut, true);
    render(<Search onSubmit={() => {}} />);
    const input = screen.getByRole('searchbox', { name: 'Search settings' });
    fireEvent.keyDown(input, { key: 'j' });
    expect(xShortcut).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'j' });
    expect(xShortcut).toHaveBeenCalledTimes(1);
  });
});
