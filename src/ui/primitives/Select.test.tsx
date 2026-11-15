import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { Select } from './Select';

const SOUNDS = [
  { value: 's1', label: 'Sound 1' },
  { value: 's8', label: 'Sound 8' },
] as const;

function Sound() {
  const [sound, setSound] = useState<'s1' | 's8'>('s8');
  return (
    <>
      <Select aria-label='Notification sound' value={sound} onValueChange={setSound} options={SOUNDS} />
      <output>{sound}</output>
    </>
  );
}

describe('Select', () => {
  test('the trigger is named and shows the selected label before opening', () => {
    render(<Sound />);
    const trigger = screen.getByRole('combobox', { name: 'Notification sound' });
    expect(trigger.textContent).toContain('Sound 8');
  });

  test('choosing an option changes the value', async () => {
    render(<Sound />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Notification sound' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Sound 1' }));
    expect(screen.getByRole('status').textContent).toBe('s1');
  });
});
