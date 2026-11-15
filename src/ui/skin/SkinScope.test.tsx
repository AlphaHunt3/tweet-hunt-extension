import { render, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { SkinScope } from './SkinScope';
import { UI_SKIN_STORAGE_KEY } from './skins';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));

test('defaults to obsidian on dark and passes other attributes through', () => {
  const { getByTestId } = render(<SkinScope data-xhunt-testid='scope'>内容</SkinScope>);
  const scope = getByTestId('scope');
  expect(scope.dataset.skin).toBe('obsidian');
  expect(scope.dataset.theme).toBe('dark');
  expect(scope.className).toBe('contents');
  expect(scope.textContent).toBe('内容');
});

test('follows the stored skin and theme', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
  setMemoryValue('@xhunt/theme', 'light');
  const { getByTestId } = render(<SkinScope data-xhunt-testid='scope' />);
  await waitFor(() => expect(getByTestId('scope').dataset.skin).toBe('native'));
  expect(getByTestId('scope').dataset.theme).toBe('light');
});
