import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { OverviewView } from './OverviewView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('./useSoulInfo', () => ({ useSoulInfo: () => ({ loading: false, data: { score: 87 } }) }));
vi.mock('~/compontents/InvestmentPanel.tsx', () => ({ InvestmentPanel: () => <p>investment</p> }));

const TW = {
  basicInfo: { classification: 'project' },
  multiField: { cn: { fields: [{ DeFi: 86 }, { 交易: 78 }, { Meme: 64 }, { NFT: 50 }] } },
  kolFollow: {
    kolGlobalRank: 1234,
    kolCnRank: 56,
    kolGlobalRankChange: { day7: 12 },
    globalKolFollowersCount: 1200,
    globalKolFollowers: [
      { username: 'lumen', name: 'Lumen Labs', avatar: '' },
      { username: 'kai', name: '0xKai', avatar: '' },
    ],
  },
};
const MBTI = { mbti: 'INTJ', keyword: ['战略思维', '长期主义'] };
const STATS = { averageRating: 4.6, totalReviews: 40, realTotalReviews: 128, topReviewers: [{}] };

describe('OverviewView', () => {
  test('obsidian shows stat tiles and jumps to views', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    const onOpen = vi.fn();
    render(<OverviewView twInfo={TW} mbti={MBTI} stats={STATS} twitterId='42' rootData={null} onOpen={onOpen} />);
    expect(screen.getByText('#1,234')).toBeTruthy();
    expect(screen.getByText('↑12')).toBeTruthy();
    expect(screen.getByText('87')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Lumen Labs/ }).getAttribute('href')).toBe('https://x.com/lumen');
    await userEvent.click(screen.getByRole('button', { name: /kFollowingAnalytics/ }));
    await userEvent.click(screen.getByRole('button', { name: /INTJ/ }));
    await userEvent.click(screen.getByRole('button', { name: /4\.6/ }));
    expect(onOpen.mock.calls.map(([view]) => view)).toEqual(['followers', 'portrait', 'reviews']);
    expect(screen.getByRole('button', { name: /128 reviews · 40 reviews2/ })).toBeTruthy();
  });

  test('native lists summary rows like X trends and keeps project investments', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    const onOpen = vi.fn();
    render(
      <OverviewView twInfo={TW} mbti={MBTI} stats={STATS} twitterId='42' rootData={{ invested: [{}] }} onOpen={onOpen} />,
    );
    expect(screen.getByText('INTJ')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /INTJ/ })).toBeNull();
    expect(screen.getByText('DeFi 86')).toBeTruthy();
    expect(screen.getByText('交易 78 · Meme 64')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /4\.6/ }));
    await userEvent.click(screen.getByRole('button', { name: /1\.2K KOL/ }));
    expect(onOpen.mock.calls.map(([view]) => view)).toEqual(['reviews', 'followers']);
    expect(screen.getByText('investment')).toBeTruthy();
  });
});
