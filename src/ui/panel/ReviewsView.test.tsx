import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { ReviewsView, reviewCounts } from './ReviewsView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }));
vi.mock('~/compontents/navigation/NavigationService', () => ({ navigationService: { navigateTo } }));

const comment = (page: number, text = `comment on page ${page}`) => ({
  id: `c${page}`,
  reviewer: { avatar: '', displayName: `Reviewer ${page}`, username: `r${page}` },
  updatedAt: new Date().toISOString(),
  rating: 5,
  tags: ['投研'],
  comment: text,
});
const getHandleComments = vi.fn(async (_id: string, page: number, _size: number, _onlyKol: boolean) => ({
  comments: [comment(page, page === 1 ? 'x'.repeat(160) : undefined)],
  pagination: { page, totalPages: 3, totalComments: 11, hasPrevPage: page > 1, hasNextPage: page < 3 },
}));
vi.mock('~contents/services/review.ts', () => ({
  getHandleComments: (...args: [string, number, number, boolean]) => getHandleComments(...args),
}));

const STATS = {
  averageRating: 4.6,
  totalReviews: 40,
  realTotalReviews: 128,
  topReviewers: [{ username: 'a' }],
  tagCloud: [{ text: '投研', value: 12 }],
};
const EMPTY = { averageRating: 0, totalReviews: 0, realTotalReviews: 0, topReviewers: [], tagCloud: [] };

describe('ReviewsView', () => {
  beforeEach(() => {
    setMemoryValue('@xhunt/reviewOnlyKol', true);
    getHandleComments.mockClear();
    navigateTo.mockClear();
  });

  test('summarises ratings and toggles featured reviews', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    render(<ReviewsView stats={STATS} userId='mira' />);
    expect(screen.getByText('4.6')).toBeTruthy();
    expect(screen.getByText('128 reviews')).toBeTruthy();
    expect(screen.getByText('40 reviews2')).toBeTruthy();
    expect(screen.getByText('投研 12')).toBeTruthy();
    const toggle = screen.getByRole('switch', { name: 'onlyShowSelectedReviews' });
    expect(document.getElementById(toggle.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'selectedReviewersTooltip',
    );
    await userEvent.click(toggle);
    expect(getMemoryValue('@xhunt/reviewOnlyKol')).toBe(false);
    await waitFor(() => expect(getHandleComments).toHaveBeenLastCalledWith('mira', 1, 5, false));
    expect(screen.getByText('40 reviews')).toBeTruthy();
  });

  test('pages comments, expands long ones and scrolls back to the list', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    render(<ReviewsView stats={STATS} userId='mira' />);
    await waitFor(() => expect(screen.getByText(/^x+\.\.\.$/)).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'showMore' }));
    expect(screen.getByText('x'.repeat(160))).toBeTruthy();
    expect(screen.getByRole('link', { name: 'reportError' }).getAttribute('target')).toBe('_blank');
    await userEvent.click(screen.getByRole('button', { name: 'panelNextPage' }));
    await waitFor(() => expect(screen.getByText('comment on page 2')).toBeTruthy());
    await waitFor(() =>
      expect(navigateTo).toHaveBeenCalledWith('main-panel', '/home', { scrollToId: 'panel-scroll-comments' }),
    );
    expect(document.getElementById('panel-scroll-reviews')).not.toBeNull();
  });

  test('shows the empty rating and hides an empty comment list', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    getHandleComments.mockResolvedValueOnce({
      comments: [],
      pagination: { page: 1, totalPages: 0, totalComments: 0, hasPrevPage: false, hasNextPage: false },
    });
    render(<ReviewsView stats={EMPTY} userId='mira' />);
    expect(screen.getByText('noSelectedReviews')).toBeTruthy();
    await waitFor(() => expect(getHandleComments).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('heading', { name: /comments/ })).toBeNull());
    expect(document.getElementById('panel-scroll-comments')).not.toBeNull();
  });

  test('counts reviews the way the old overview did', () => {
    const t = (key: string) => key;
    expect(reviewCounts(STATS, true, t)).toEqual(['128 reviews', '40 reviews2']);
    expect(reviewCounts({ ...STATS, realTotalReviews: 30 }, true, t)).toEqual(['30 reviews']);
    expect(reviewCounts(STATS, false, t)).toEqual(['40 reviews']);
  });
});
