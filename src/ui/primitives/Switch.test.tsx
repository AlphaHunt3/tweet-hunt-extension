import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Switch } from './Switch';

function Labelled({ onChange }: { onChange: (v: boolean) => void }) {
  const [on, setOn] = useState(false);
  return (
    <label>
      Token analysis
      <Switch
        checked={on}
        onCheckedChange={(next) => {
          setOn(next);
          onChange(next);
        }}
        data-xhunt-testid='settings-toggle-showTokenAnalysis'
      />
    </label>
  );
}

describe('Switch', () => {
  test('is a switch named by its label and toggles with Space', async () => {
    const onChange = vi.fn();
    render(<Labelled onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Token analysis' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    toggle.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('settings-toggle-showTokenAnalysis')).toBe(toggle);
  });

  test('clicking the label toggles it', async () => {
    const onChange = vi.fn();
    render(<Labelled onChange={onChange} />);
    await userEvent.click(screen.getByText('Token analysis'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
