import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { CollapsibleSection } from './CollapsibleSection';

function Group() {
  const [open, setOpen] = useState(true);
  return (
    <CollapsibleSection title='General' open={open} onOpenChange={setOpen} testId='settings-group-others' triggerTestId='settings-group-header-others'>
      <p>Language row</p>
    </CollapsibleSection>
  );
}

describe('CollapsibleSection', () => {
  test('the header is a button that reports and toggles its state', async () => {
    render(<Group />);
    const trigger = screen.getByRole('button', { name: 'General' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('settings-group-header-others')).toBe(trigger);
    expect(screen.getByText('Language row')).toBeTruthy();
    await userEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
