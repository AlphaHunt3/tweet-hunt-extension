import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import type { KolStat, RankStat } from './kolRankItems';
import { ProfileKolRow } from './ProfileKolRow';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

const KOL: KolStat[] = [
  { key: 'kolGlobal', tab: 'global', value: '1.2K', label: 'KOL 粉丝' },
  { key: 'kolTop100', tab: 'top100', value: '86', label: 'TOP100' },
  { key: 'kolCn', tab: 'cn', value: '312', label: '中文 KOL' },
];
const RANKS: RankStat[] = [
  { key: 'rankGlobal', rankType: 'followers', label: '全球影响力', value: '#1,234', change: 12 },
  { key: 'rankCn', rankType: 'chinese', label: '华语', value: '#56', change: 0 },
];

function renderRow(overrides: Partial<Parameters<typeof ProfileKolRow>[0]> = {}) {
  const props = {
    kolStats: KOL,
    rankStats: RANKS,
    domain: 'web3' as const,
    canSwitch: true,
    onDomainChange: vi.fn(),
    renderDetail: vi.fn((key: string) => <p>详情：{key}</p>),
    ...overrides,
  };
  render(<ProfileKolRow {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

test('soft merges the follower counts into one pill and switches domain with a segmented control', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
  const props = renderRow();
  const followers = await screen.findByRole('button', { name: /1\.2K KOL 粉丝.*86 TOP100.*312 中文 KOL/ });
  expect(followers.className).toContain('xh-statpill');
  expect(screen.getByRole('button', { name: /全球影响力 #1,234 ↑12/ })).toBeTruthy();
  await userEvent.click(screen.getByRole('radio', { name: 'domainAi' }));
  expect(props.onDomainChange).toHaveBeenCalledWith('ai');
});

test('obsidian uses chips with slash separators and a delta pill', async () => {
  renderRow();
  const followers = await screen.findByRole('button', { name: /KOL 粉丝 1\.2K/ });
  expect(followers.className).toContain('xh-chip');
  expect(within(followers).getAllByText('/')).toHaveLength(2);
  const rank = screen.getByRole('button', { name: /全球影响力 #1,234/ });
  expect(within(rank).getByText('↑12').getAttribute('data-tone')).toBe('up');
});

test('native splits the counts into inline buttons and toggles domain with a text button', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
  const props = renderRow({ domain: 'ai' });
  expect(await screen.findByRole('button', { name: '1.2K KOL 粉丝' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '86 TOP100' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'switchToDomainRank' }));
  expect(props.onDomainChange).toHaveBeenCalledWith('web3');
});

test('hovering a stat opens its detail', async () => {
  const props = renderRow();
  await userEvent.hover(await screen.findByRole('button', { name: /全球影响力/ }));
  expect(await screen.findByText('详情：rankGlobal')).toBeTruthy();
  expect(props.renderDetail).toHaveBeenCalledWith('rankGlobal');
});

test('no switch with one domain, and nothing at all without stats', () => {
  const { unmount } = render(
    <ProfileKolRow kolStats={KOL} rankStats={[]} domain='web3' canSwitch={false} onDomainChange={() => {}} renderDetail={() => null} />,
  );
  expect(screen.queryByRole('radio')).toBeNull();
  unmount();
  const { container } = render(
    <ProfileKolRow kolStats={[]} rankStats={[]} domain='web3' canSwitch={false} onDomainChange={() => {}} renderDetail={() => null} />,
  );
  expect(container.firstChild).toBeNull();
});
