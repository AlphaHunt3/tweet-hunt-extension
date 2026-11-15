import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { KolStat } from '../kolRankItems';
import { followerList, KolFollowersCard } from './KolFollowersCard';
import { buildRankDetail, RankCard } from './RankCard';

vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => (key === 'rankSampleOf' ? '总样本 {total}' : key), lang: 'zh' }),
}));
vi.mock('../useOfficialTags', () => ({ useOfficialTags: () => ['VC'] }));

const t = (key: string) => (key === 'rankSampleOf' ? 'of {total}' : key === 'kolCnRankTotal' ? '10000' : key);

describe('buildRankDetail', () => {
  it('formats a ranked position with all three periods', () => {
    const detail = buildRankDetail({
      t,
      lang: 'en',
      rankType: 'followers',
      ai: false,
      kolFollow: { kolRank20W: 1234, kolRankChange: { day1: 3, day7: -12, day30: 0 } },
    });
    expect(detail.value).toBe('#1,234');
    expect(detail.sample).toBe('of 200K');
    expect(detail.changes.map((c) => [c.text, c.tone])).toEqual([
      ['↑3', 'up'],
      ['↓12', 'down'],
      ['0', undefined],
    ]);
  });

  it('caps global ranks above the sample size, like the chip does', () => {
    const detail = buildRankDetail({ t, lang: 'zh', rankType: 'followers', ai: false, kolFollow: { kolRank20W: 250_000 } });
    expect(detail.value).toBe('>20 万');
    expect(detail.changes.every((c) => c.text === '—')).toBe(true);
  });

  it('uses the AI sample sizes and fields', () => {
    const detail = buildRankDetail({ t, lang: 'zh', rankType: 'chinese', ai: true, kolFollow: { kolCnRankAi: 140, kolCnRank: 56 } });
    expect(detail.value).toBe('#140');
    expect(detail.sample).toBe('of 3 千');
  });

  it('says unranked when there is no rank', () => {
    const detail = buildRankDetail({ t, lang: 'zh', rankType: 'project', ai: false, kolFollow: { kolProjectRank: 0 } });
    expect([detail.value, detail.ranked]).toEqual(['rankUnranked', false]);
  });
});

describe('RankCard', () => {
  it('shows the rank, the sample and one row per period', () => {
    render(<RankCard rankType='chinese' ai={false} kolFollow={{ kolCnRank: 56, kolCnRankChange: { day1: 3 } }} />);
    expect(screen.getByText('#56')).toBeTruthy();
    expect(screen.getByText('总样本 1 万')).toBeTruthy();
    expect(screen.getByText('↑3')).toBeTruthy();
    expect(screen.getByText('chineseInfluenceRankTooltip')).toBeTruthy();
  });
});

const KOL_FOLLOW = {
  globalKolFollowers: [{ username: 'echolin', name: 'Echo Lin', avatar: '' }, { name: 'no handle' }],
  topKolFollowers: [{ username: 'nova_vc', name: 'Nova VC' }],
  cnKolFollowers: [],
  globalKolFollowersAi: [{ username: 'agentx', name: 'Agent X' }],
};
const TABS: KolStat[] = [
  { key: 'kolGlobal', tab: 'global', value: '1.2K', label: 'KOL 粉丝' },
  { key: 'kolTop100', tab: 'top100', value: '86', label: 'TOP100' },
  { key: 'kolCn', tab: 'cn', value: '312', label: '中文 KOL' },
];

describe('KolFollowersCard', () => {
  it('reads the list for the tab and domain and skips entries without a handle', () => {
    expect(followerList(KOL_FOLLOW, 'global', 'web3').map((k) => k.username)).toEqual(['echolin']);
    expect(followerList(KOL_FOLLOW, 'global', 'ai').map((k) => k.username)).toEqual(['agentx']);
    expect(followerList(null, 'cn', 'web3')).toEqual([]);
  });

  it('opens on the hovered list and switches lists with the tabs', async () => {
    render(<KolFollowersCard kolFollow={KOL_FOLLOW} domain='web3' tabs={TABS} initialTab='top100' />);
    expect(screen.getByRole('tab', { name: 'TOP100 86', selected: true })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Nova VC/ }).getAttribute('href')).toBe('https://x.com/nova_vc');
    await userEvent.click(screen.getByRole('tab', { name: '中文 KOL 312' }));
    expect(screen.getByText('noData')).toBeTruthy();
  });

  it('shows the list without tabs when only one list is enabled', () => {
    render(<KolFollowersCard kolFollow={KOL_FOLLOW} domain='web3' tabs={TABS.slice(0, 1)} initialTab='global' />);
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByText('Echo Lin')).toBeTruthy();
    expect(screen.getByText('VC')).toBeTruthy();
  });
});
