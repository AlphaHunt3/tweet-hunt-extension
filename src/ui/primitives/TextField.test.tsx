import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { TextField } from './TextField';

function Keyword({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <TextField
      aria-label='Keyword'
      placeholder='Add a keyword'
      value={value}
      onValueChange={setValue}
      onSubmit={onSubmit}
      invalid={value === 'bad'}
    />
  );
}

describe('TextField', () => {
  test('is a named textbox that submits on Enter and keeps keys away from the page', async () => {
    const onSubmit = vi.fn();
    const pageKeys = vi.fn();
    document.addEventListener('keydown', pageKeys, true);
    render(<Keyword onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: 'Keyword' });
    await userEvent.type(box, 'j{Enter}');
    expect((box as HTMLInputElement).value).toBe('j');
    expect(onSubmit).toHaveBeenCalledWith('j');
    expect(pageKeys).not.toHaveBeenCalled();
    document.removeEventListener('keydown', pageKeys, true);
  });

  test('marks an invalid value', async () => {
    render(<Keyword onSubmit={() => {}} />);
    const box = screen.getByRole('textbox', { name: 'Keyword' });
    await userEvent.type(box, 'bad');
    expect(box.getAttribute('aria-invalid')).toBe('true');
  });

  test('Escape runs onEscape and maxLength caps the value', async () => {
    const onEscape = vi.fn();
    render(<Note onEscape={onEscape} />);
    const input = screen.getByRole('textbox', { name: 'Note' }) as HTMLInputElement;
    await userEvent.type(input, 'abcdefgh');
    expect(input.value).toBe('abcde');
    await userEvent.keyboard('{Escape}');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});

function Note({ onEscape }: { onEscape: () => void }) {
  const [value, setValue] = useState('');
  return (
    <TextField aria-label='Note' value={value} onValueChange={setValue} onEscape={onEscape} maxLength={5} />
  );
}
