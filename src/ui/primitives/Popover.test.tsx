import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from './Popover';

function Example() {
  return (
    <Popover>
      <PopoverTrigger>备注</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>添加备注</PopoverTitle>
        <PopoverDescription>只有你自己能看到</PopoverDescription>
        <PopoverClose>关闭</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

test('opens on press as a named dialog with the shared look, and closes on Escape', async () => {
  render(<Example />);
  await userEvent.click(screen.getByRole('button', { name: '备注' }));
  const dialog = await screen.findByRole('dialog', { name: '添加备注' });
  expect(dialog.classList.contains('xh-popover')).toBe(true);
  expect(screen.getByText('只有你自己能看到').classList.contains('xh-popover-desc')).toBe(true);
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

test('the close part closes it', async () => {
  render(<Example />);
  await userEvent.click(screen.getByRole('button', { name: '备注' }));
  await userEvent.click(await screen.findByRole('button', { name: '关闭' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
