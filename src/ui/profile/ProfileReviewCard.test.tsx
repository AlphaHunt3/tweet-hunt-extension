import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { ProfileReviewCard, type ReviewCardStats } from './ProfileReviewCard';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => (key === 'reviewMoreTags' ? '+{count}' : key), lang: 'zh', setLang: () => {} }),
}));

const STATS: ReviewCardStats = {
  averageRating: 4.6,
  totalReviews: 96,
  realTotalReviews: 128,
  tagCloud: ['投研', '二级', '宏观', '空投', '科学家', '长期', '数据', '叙事'].map((text, index) => ({ text, value: 12 - index })),
  topReviewers: ['Echo Lin', 'Theo Park', 'Nova VC', 'Rin', 'Mika'].map((name) => ({ name, avatar: '' })),
};

function renderCard(overrides: Partial<Parameters<typeof ProfileReviewCard>[0]> = {}) {
  const props = {
    stats: STATS,
    reviewOnlyKol: true,
    canWrite: true,
    writeLabel: 'submitReview',
    onOpenComments: vi.fn(),
    renderWriteForm: vi.fn((close: () => void) => (
      <button type='button' onClick={close}>
        表单里的取消
      </button>
    )),
    ...overrides,
  };
  render(<ProfileReviewCard {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

test('soft shows the rating, the counts as a link to the comments, four avatars and five tags plus the rest', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
  const props = renderCard();
  expect(await screen.findByText('4.6')).toBeTruthy();
  const count = screen.getByRole('button', { name: '128 reviews · 96 reviews2' });
  await userEvent.click(count);
  expect(props.onOpenComments).toHaveBeenCalled();
  expect(document.querySelectorAll('.xh-review-stack .xh-avatar')).toHaveLength(4);
  const tags = document.querySelector('.xh-review-tags') as HTMLElement;
  expect(within(tags).getAllByText(/./, { selector: '.xh-ptag' })).toHaveLength(6);
  expect(within(tags).getByText('+3')).toBeTruthy();
});

test('all reviews mode counts every review; without data the count is plain text', async () => {
  renderCard({ reviewOnlyKol: false, stats: { ...STATS, totalReviews: 0 } });
  expect(await screen.findByText('0 reviews')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '0 reviews' })).toBeNull();
});

test('the empty state follows the featured-only switch', async () => {
  const { unmount } = render(
    <ProfileReviewCard
      stats={{ realTotalReviews: 0 }}
      reviewOnlyKol
      canWrite
      writeLabel='submitReview'
      onOpenComments={() => {}}
      renderWriteForm={() => null}
    />,
  );
  expect(await screen.findByText('noSelectedReviews')).toBeTruthy();
  unmount();
  render(
    <ProfileReviewCard
      stats={{ realTotalReviews: 0 }}
      reviewOnlyKol={false}
      canWrite
      writeLabel='submitReview'
      onOpenComments={() => {}}
      renderWriteForm={() => null}
    />,
  );
  expect(await screen.findByText('noReviews')).toBeTruthy();
});

test('writing a review opens a popover with the form, which can close it; your own profile has no button', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
  const { unmount } = render(
    <ProfileReviewCard
      stats={STATS}
      reviewOnlyKol
      canWrite
      writeLabel='submitReview'
      onOpenComments={() => {}}
      renderWriteForm={(close) => (
        <button type='button' onClick={close}>
          表单里的取消
        </button>
      )}
    />,
  );
  const write = await screen.findByTestId('review-open-button');
  expect(write.textContent).toContain('submitReview');
  await userEvent.click(write);
  await userEvent.click(await screen.findByRole('button', { name: '表单里的取消' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: '表单里的取消' })).toBeNull());
  unmount();
  renderCard({ canWrite: false });
  await screen.findByText('4.6');
  expect(screen.queryByTestId('review-open-button')).toBeNull();
});
