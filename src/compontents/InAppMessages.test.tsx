import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../test/memoryStorage';
import { InAppMessages } from './InAppMessages';

vi.mock('~storage/useLocalStorage', () => import('../test/memoryStorage'));
vi.mock('~contents/hooks/i18n.ts', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const state = vi.hoisted(() => ({ value: { isLoading: false, error: null as string | null, messages: [] as any[] } }));
vi.mock('~/utils/messageManager', () => ({
  messageManager: {
    init: () => {},
    getState: () => state.value,
    addCallback: () => () => {},
  },
}));

const LONG = `${'新外观 '.repeat(160)}结尾`;

describe('InAppMessages', () => {
  test('lists messages for the user domains and expands long ones', async () => {
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3'], primaryDomain: 'web3' });
    state.value = {
      isLoading: false,
      error: null,
      messages: [
        { id: 1, title: 'XHunt 0.4.6', content: LONG, created: String(Date.now()), type: 'all' },
        { id: 2, title: 'AI only', content: 'For AI users', created: String(Date.now()), type: 'ai' },
        { title: 'Web3 news', content: 'Short note', created: '1700000000000', type: 'web3' },
      ],
    };
    render(<InAppMessages />);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'XHunt 0.4.6' })).toBeTruthy();
    expect(screen.queryByText('AI only')).toBeNull();
    const first = screen.getAllByRole('article')[0];
    expect(first.textContent).not.toContain('结尾');
    await userEvent.click(screen.getByRole('button', { name: 'showMore' }));
    expect(first.textContent).toContain('结尾');
    expect(screen.getByRole('button', { name: 'showLess' })).toBeTruthy();
  });

  test('shows the empty state', () => {
    state.value = { isLoading: false, error: null, messages: [] };
    render(<InAppMessages />);
    expect(screen.getByText('noMessages')).toBeTruthy();
  });
});
