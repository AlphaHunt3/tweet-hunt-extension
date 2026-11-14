import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { Button, IconButton } from './Button';

describe('Button', () => {
  test('renders a native button with its variant and size', async () => {
    const onClick = vi.fn();
    render(
      <Button variant='primary' size='sm' onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.dataset.variant).toBe('primary');
    expect(button.dataset.size).toBe('sm');
    expect(button.className).toContain('xh-btn');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('marks block buttons', () => {
    render(<Button block>Full</Button>);
    expect(screen.getByRole('button', { name: 'Full' }).hasAttribute('data-block')).toBe(true);
  });
});

describe('IconButton', () => {
  test('is named by its label and can show an unread dot', () => {
    const { container } = render(
      <IconButton label='Messages, unread' dot>
        <svg />
      </IconButton>,
    );
    const button = screen.getByRole('button', { name: 'Messages, unread' });
    expect(button.getAttribute('title')).toBe('Messages, unread');
    expect(container.querySelector('.xh-iconbtn-dot')).not.toBeNull();
  });
});
