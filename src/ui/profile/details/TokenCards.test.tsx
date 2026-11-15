import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatRatio, TokenMentionsCard, TokenReturnCard, tokenChips } from './TokenCards';

vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => ({ tokenTopPct: '前 {pct}', tokenCount: '{count} 个代币' })[key] ?? key,
    lang: 'zh',
  }),
}));

describe('formatRatio', () => {
  it('shows zero as 0% and a missing value as a dash', () => {
    expect(formatRatio(0)).toBe('0.0%');
    expect(formatRatio(null)).toBe('—');
    expect(formatRatio('abc')).toBe('—');
  });

  it('adds a sign only when asked', () => {
    expect(formatRatio(0.352, true)).toBe('+35.2%');
    expect(formatRatio(-0.041, true)).toBe('-4.1%');
    expect(formatRatio(0.62)).toBe('62.0%');
  });
});

describe('TokenReturnCard', () => {
  it('lists the three metrics with their top percentiles', () => {
    render(
      <TokenReturnCard
        period={{ winRate: 0.62, winRatePct: 0.05, maxProfitAvg: 0.352, maxProfitAvgPct: 0.12, nowProfitAvg: -0.041 }}
      />,
    );
    expect(screen.getByText('tokenWinRate')).toBeTruthy();
    expect(screen.getByText('62.0%')).toBeTruthy();
    expect(screen.getByText('前 5.0%')).toBeTruthy();
    expect(screen.getAllByText('+35.2%')).toHaveLength(2);
    expect(screen.getByText('-4.1%').getAttribute('data-tone')).toBe('down');
    expect(screen.queryByText(/N\/A/)).toBeNull();
  });
});

describe('TokenMentionsCard', () => {
  it('sorts tokens by mentions, reads every known field name and skips blanks', () => {
    expect(tokenChips([{ symbol: 'ETH', mentionCount: 3 }, { token: 'SOL', value: 9 }, { text: '' }, { text: 'JUP' }])).toEqual([
      { symbol: 'SOL', count: 9 },
      { symbol: 'ETH', count: 3 },
      { symbol: 'JUP', count: 1 },
    ]);
  });

  it('emphasises the top three and counts the tokens', () => {
    const mentions = ['A', 'B', 'C', 'D'].map((symbol, index) => ({ symbol, mentionCount: 10 - index }));
    const { container } = render(<TokenMentionsCard period={{ tokenMentions: mentions }} />);
    expect(screen.getByText('4 个代币')).toBeTruthy();
    expect(container.querySelectorAll('[data-emphasis]')).toHaveLength(3);
  });

  it('shows an empty state without mentions', () => {
    render(<TokenMentionsCard period={null} />);
    expect(screen.getByText('noData')).toBeTruthy();
  });
});
