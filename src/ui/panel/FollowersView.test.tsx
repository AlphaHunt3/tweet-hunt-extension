import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { FollowersView } from './FollowersView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

const people = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ username: `${prefix}${i}`, name: `${prefix.toUpperCase()} ${i}`, avatar: '' }));
const TW = {
  kolFollow: {
    globalKolFollowers: people('kol', 10),
    cnKolFollowers: people('cn', 2),
    topKolFollowers: [],
    globalKolFollowersCount: 1200,
    cnKolFollowersCount: 312,
    topKolFollowersCount: 0,
    globalKolFollowersAi: people('ai', 3),
    globalKolFollowersCountAi: 3,
  },
};

describe('FollowersView', () => {
  test('switches scope, expands the list and links to profiles', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3'], primaryDomain: 'web3' });
    render(<FollowersView twInfo={TW} />);
    expect(screen.getByRole('heading', { name: /kFollowingAnalytics/ })).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'panelKolScopeLabel' }).getAttribute('data-variant')).toBe('tiles');
    expect(screen.getAllByRole('link')).toHaveLength(8);
    await userEvent.click(screen.getByRole('button', { name: 'showMore' }));
    expect(screen.getAllByRole('link')).toHaveLength(10);
    await userEvent.click(screen.getByRole('radio', { name: /panelKolScopeCn/ }));
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('https://x.com/cn1');
    expect(links[1].getAttribute('target')).toBe('_blank');
    expect(screen.queryByRole('button', { name: 'showMore' })).toBeNull();
  });

  test('follows the primary domain and shows an empty scope', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3', 'ai'], primaryDomain: 'ai' });
    render(<FollowersView twInfo={TW} />);
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      'https://x.com/ai0',
      'https://x.com/ai1',
      'https://x.com/ai2',
    ]);
    await userEvent.click(screen.getByRole('radio', { name: /panelKolScopeTop/ }));
    expect(screen.getByText('panelNoFollowers')).toBeTruthy();
  });
});
