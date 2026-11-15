import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscussionCard, MbtiCard, pickDiscussion, RenameCard, renameRows, share } from './TextCards';

vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => (key === 'renameTimes' ? '改名 {count} 次' : key), lang: 'zh' }),
}));

describe('MbtiCard', () => {
  it('shows the type, keywords and explanation', () => {
    render(<MbtiCard data={{ mbti: 'INTJ', keyword: ['独立', '独立', '长期'], explanation: '理性、独立' }} />);
    expect(screen.getByText('INTJ')).toBeTruthy();
    expect(screen.getAllByText('独立')).toHaveLength(2);
    expect(screen.getByText('理性、独立')).toBeTruthy();
    expect(screen.getByText('mbtiFooter')).toBeTruthy();
  });

  it('shows an empty state instead of crashing without data', () => {
    render(<MbtiCard data={undefined} />);
    expect(screen.getByText('noData')).toBeTruthy();
    expect(screen.queryByText('mbtiFooter')).toBeNull();
  });
});

describe('renameRows', () => {
  const data = {
    screen_names: {
      mira_research: ['2021-02-01', '2022-06-30'],
      mira_onchain: ['2024-01-16', '2026-11-01'],
      mira_defi: ['2022-07-01', null],
    },
  };

  it('puts the newest name first and marks the current handle', () => {
    expect(renameRows(data, 'Mira_Onchain', 'zh')).toEqual([
      { handle: 'mira_onchain', range: '2024/01/16 – 2026/11/01', current: true },
      { handle: 'mira_defi', range: '2022/07/01 – —', current: false },
      { handle: 'mira_research', range: '2021/02/01 – 2022/06/30', current: false },
    ]);
  });

  it('copes with missing names', () => {
    expect(renameRows({}, 'mira', 'zh')).toEqual([]);
    expect(renameRows(undefined, 'mira', 'zh')).toEqual([]);
  });

  it('counts renames, not names, in the card', () => {
    render(<RenameCard data={data} handle='mira_onchain' />);
    expect(screen.getByText('改名 2 次')).toBeTruthy();
    expect(screen.getByText('currentName')).toBeTruthy();
  });
});

describe('DiscussionCard', () => {
  const data = {
    symbol: 'JUP',
    discussion1dCn: {
      positivePercentage: '63.25',
      negativePercentage: 20,
      positiveBulletPoints: ['流动性好'],
      negativeBulletPoints: [],
    },
  };

  it('picks the period for the interface language', () => {
    expect(pickDiscussion(data, '1d', 'zh')).toBe(data.discussion1dCn);
    expect(pickDiscussion(data, '7d', 'zh')).toBeNull();
    expect(pickDiscussion(null, '1d', 'en')).toBeNull();
  });

  it('clamps shares and treats bad values as missing', () => {
    expect(share('63.25')).toBe(63.25);
    expect(share(140)).toBe(100);
    expect(share(undefined)).toBeNull();
    expect(share('n/a')).toBeNull();
  });

  it('shows shares and only the lists that have points', () => {
    render(<DiscussionCard data={data} period='1d' />);
    expect(screen.getByText('63.3% positive')).toBeTruthy();
    expect(screen.getByText('20% negative')).toBeTruthy();
    expect(screen.getByText('流动性好')).toBeTruthy();
    expect(screen.queryByText('negativePoints')).toBeNull();
    expect(screen.getByText('$JUP')).toBeTruthy();
  });

  it('shows a dash instead of NaN when a share is missing', () => {
    render(<DiscussionCard data={{ discussion1dCn: { positivePercentage: null } }} period='1d' />);
    expect(screen.getByText('— positive')).toBeTruthy();
  });

  it('shows loading and empty states', () => {
    const { rerender } = render(<DiscussionCard data={data} period='7d' loading />);
    expect(screen.getByText('loading')).toBeTruthy();
    rerender(<DiscussionCard data={data} period='7d' />);
    expect(screen.getByText('noData')).toBeTruthy();
  });
});
