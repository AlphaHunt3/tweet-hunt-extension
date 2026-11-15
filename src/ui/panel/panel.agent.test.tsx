import { render, screen, waitFor } from '@testing-library/react';
import { createAgent } from '@ui-sdk/react/agent';
import { expect, test, vi } from 'vitest';
import { UserAuthPanel } from '~/compontents/UserAuthPanel';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { FollowersView } from './FollowersView';
import { PortraitView } from './PortraitView';
import { ReviewsView } from './ReviewsView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('./useSoulInfo', () => ({ useSoulInfo: () => ({ loading: false, data: { score: 87, profile_analysis: 90 } }) }));
vi.mock('~/compontents/InvestmentPanel.tsx', () => ({ InvestmentPanel: () => null }));
vi.mock('~contents/services/review.ts', () => ({
  userLogout: async () => null,
  getHandleComments: async (_id: string, page: number) => ({
    comments: [
      {
        id: `c${page}`,
        reviewer: { avatar: '', displayName: 'Echo Lin', username: 'echolin' },
        updatedAt: new Date().toISOString(),
        rating: 5,
        tags: [],
        comment: `page ${page}`,
      },
    ],
    pagination: { page, totalPages: 2, totalComments: 6, hasPrevPage: page > 1, hasNextPage: page < 2 },
  }),
}));
vi.mock('~contents/services/api.ts', () => ({ getTwitterAuthUrl: async () => ({ url: '' }) }));
vi.mock('~contents/utils', () => ({ openNewTab: () => {} }));
vi.mock('~contents/utils/auth.ts', () => ({ clearAuthState: async () => {} }));
vi.mock('~/compontents/navigation/NavigationService', () => ({ navigationService: { navigateTo: () => {} } }));
vi.mock('~/compontents/navigation/PanelNavigator', () => ({ useNavigation: () => ({ navigateTo: () => {} }) }));

const agent = createAgent();

const TW = {
  kolFollow: {
    globalKolFollowers: [{ username: 'lumen', name: 'Lumen Labs', avatar: '' }],
    cnKolFollowers: [{ username: 'echo', name: 'Echo Lin', avatar: '' }],
    globalKolFollowersCount: 1200,
    cnKolFollowersCount: 312,
  },
  multiField: { cn: { fields: [{ DeFi: 86 }] } },
  multiFieldAi: { cn: { fields: [{ Agent: 91 }] } },
};
const STATS = { averageRating: 4.6, totalReviews: 40, realTotalReviews: 128, topReviewers: [{}], tagCloud: [] };

test('an agent can find and use the panel views by name', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
  setMemoryValue('@xhunt/user', { username: 'alice_web3', displayName: 'Alice Chen', avatar: '' });
  render(
    <>
      <FollowersView twInfo={TW} />
      <PortraitView twInfo={TW} mbti={{ mbti: 'INTJ' }} twitterId='42' rootData={null} />
      <ReviewsView stats={STATS} userId='mira' />
      <UserAuthPanel userInfo={null} />
    </>,
  );
  await waitFor(() => expect(screen.getByText('page 1')).toBeTruthy());

  const components = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== 'more');
  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
  }
  const labels = components.map((entry) => entry.label);
  for (const label of ['panelKolScopeLabel', 'panelAbilityDomain', 'onlyShowSelectedReviews', 'panelNextPage', 'panelAccountMenu']) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label);
  }

  const result = await agent.act({
    steps: [
      { ref: 'panelKolScopeLabel', action: 'setValue', args: ['cn'] },
      { ref: 'panelAbilityDomain', action: 'setValue', args: ['ai'] },
      { ref: 'onlyShowSelectedReviews', action: 'setChecked', args: [false] },
    ],
  });
  expect(result.ok, result.error?.message).toBe(true);
  expect(screen.getByRole('link', { name: /Echo Lin/ }).getAttribute('href')).toBe('https://x.com/echo');
  expect(screen.getByRole('meter', { name: 'Agent' })).toBeTruthy();
  expect(getMemoryValue('@xhunt/reviewOnlyKol')).toBe(false);
});
