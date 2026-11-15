import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InvestmentPanel } from '~/compontents/InvestmentPanel';
import { InvestorsCard, sortInvestors } from './InvestorsCard';
import { MembersCard, memberGroups, sortByRank } from './MembersCard';
import { handleFromUrl } from './PersonChip';

const ranks = vi.hoisted(() => ({ result: {} as Record<string, number> }));

vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => ({ investorCount: '{count} 家', memberCount: '{count} 人' })[key] ?? key,
    lang: 'zh',
  }),
}));
vi.mock('~storage/useLocalStorage', () => import('../../../test/memoryStorage'));
vi.mock('../useOfficialTags', () => ({ useOfficialTags: () => [] }));
vi.mock('~/utils/rankService', () => ({
  rankService: { getRanks: vi.fn(async () => ranks.result) },
}));

const INVESTORS = [
  { name: 'Alpha Fund', avatar: '', twitter: 'https://x.com/alpha' },
  { name: 'Lead Capital', avatar: '', lead_investor: true },
];

describe('investors', () => {
  it('puts lead investors first without changing the original list', () => {
    const copy = [...INVESTORS];
    expect(sortInvestors(INVESTORS).map((i) => i.name)).toEqual(['Lead Capital', 'Alpha Fund']);
    expect(INVESTORS).toEqual(copy);
    expect(sortInvestors(undefined)).toEqual([]);
  });

  it('shows funding, the count and the RootData source', () => {
    render(
      <InvestorsCard title='investors' kind='investors' investors={INVESTORS} totalFunding={12_500_000} projectLink='https://rootdata.com/p' />,
    );
    expect(screen.getByText('2 家')).toBeTruthy();
    expect(screen.getByText('leadInvestor')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Alpha Fund' }).getAttribute('href')).toBe('https://x.com/alpha');
    expect(screen.getByRole('link', { name: /RootData/ }).getAttribute('href')).toBe('https://rootdata.com/p');
  });

  it('renders the panel when only one side has data', () => {
    render(<InvestmentPanel data={{ invested: { investors: INVESTORS }, projectLink: '' } as never} classicStyle />);
    expect(screen.getByText('Alpha Fund')).toBeTruthy();
    expect(screen.queryByText('portfolio')).toBeNull();
  });
});

describe('members', () => {
  const DATA = {
    handle: 'mira',
    member: [{ handle: 'b', name: 'Bea' }, { handle: 'a', name: 'Ann' }],
    'founder/executive': [{ handle: 'f', name: 'Fay', level: 'CEO' }],
    advisor_extra: [{ handle: 'x', name: 'Xu' }, { name: 'no handle' }],
    alumni: [],
  };

  it('orders groups by role, keeps unknown groups and drops entries without a handle', () => {
    expect(memberGroups(DATA, (k) => k).map((g) => [g.key, g.members.length])).toEqual([
      ['founder/executive', 1],
      ['member', 2],
      ['advisor_extra', 1],
    ]);
    expect(memberGroups(null, (k) => k)).toEqual([]);
  });

  it('sorts by rank and keeps unranked members last', () => {
    const members = [{ handle: 'a' }, { handle: 'b' }, { handle: 'c' }];
    expect(sortByRank(members, { c: 3, b: 10 }).map((m) => m.handle)).toEqual(['c', 'b', 'a']);
  });

  it('reads the handle from a profile URL', () => {
    expect(handleFromUrl('https://twitter.com/mira_onchain?lang=en')).toBe('mira_onchain');
    expect(handleFromUrl('https://x.com/@echolin')).toBe('echolin');
    expect(handleFromUrl('https://example.com/a')).toBe('');
  });

  it('shows role tabs, counts everyone and re-sorts by rank', async () => {
    ranks.result = { a: 5, b: 50 };
    render(<MembersCard groups={DATA} rootData={null} />);
    expect(screen.getByText('4 人')).toBeTruthy();
    expect(screen.getByText('CEO')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'member 2' }));
    await waitFor(() => {
      const names = screen.getAllByRole('link').map((link) => link.textContent);
      expect(names[0]).toContain('Ann');
    });
  });

  it('prefers RootData members and links their profiles', () => {
    render(
      <MembersCard
        groups={DATA}
        rootData={{ members: [{ name: 'Nia', position: 'CTO', twitter: 'https://x.com/nia' }], projectLink: 'https://rootdata.com/p' }}
      />,
    );
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByText('CTO')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Nia/ }).getAttribute('href')).toBe('https://x.com/nia');
  });

  it('switches from data to no data without breaking', () => {
    const { rerender } = render(<MembersCard groups={DATA} rootData={null} />);
    rerender(<MembersCard groups={null} rootData={null} />);
    expect(screen.getByText('noData')).toBeTruthy();
  });
});
