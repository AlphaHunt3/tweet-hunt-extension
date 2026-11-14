import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { HomeChrome, formatRank, rankDelta } from './HomeChrome';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const navigateTo = vi.fn();
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo, goBack: () => {}, history: ['/home'], currentRoute: '/home' }),
}));
vi.mock('~/utils/messageManager', () => ({
  messageManager: {
    init: () => {},
    getState: () => ({ messages: [], hasUnread: false, isLoading: false }),
    addCallback: () => () => {},
    markAllAsRead: () => {},
  },
}));
vi.mock('~/compontents/navigation/PanelContext', () => ({ usePanelContext: () => ({ onMinimize: () => {} }) }));

const TW = {
  basicInfo: { isKol: true },
  kolFollow: {
    kolGlobalRank: 1234,
    kolCnRank: 56,
    kolGlobalRankChange: { day7: 12 },
    kolCnRankChange: { day7: -3 },
    globalKolFollowersCount: 1200,
  },
};

function renderChrome() {
  return render(
    <HomeChrome userId='mira_onchain' twInfo={TW} onClose={() => {}}>
      {(view) => <p>view {view}</p>}
    </HomeChrome>,
  );
}

describe('HomeChrome', () => {
  beforeEach(() => {
    navigateTo.mockReset();
    setMemoryValue('@xhunt/header-controls-guide-dismissed-map', { settings: true, messages: true, drag: true, panel: true });
  });

  test('soft: brand bar, identity card with ranks and segmented sections', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    renderChrome();
    expect(screen.getByText('XHunt')).toBeTruthy();
    expect(screen.getByText('@mira_onchain')).toBeTruthy();
    expect(screen.getByText('#1,234')).toBeTruthy();
    expect(screen.getByText('↑12')).toBeTruthy();
    expect(screen.getByText('↓3')).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'panelSectionsLabel' })).toBeTruthy();
    expect(screen.getByText('view followers')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'homeViewReviews' }));
    expect(screen.getByText('view reviews')).toBeTruthy();
    await userEvent.click(screen.getByTestId('panel-settings-button'));
    expect(navigateTo).toHaveBeenCalledWith('/settings');
  });

  test('native: module header with underline tabs', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    renderChrome();
    expect(screen.getByRole('heading', { name: /XHunt/ })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'homeViewOverview',
      'homeViewFollowers',
      'homeViewReviews',
    ]);
    expect(screen.getByTestId('panel-messages-button')).toBeTruthy();
  });

  test('obsidian: search bar and identity row, views come from the rail', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    renderChrome();
    expect(screen.getByRole('searchbox', { name: 'panelSearchLabel' })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('view overview')).toBeTruthy();
  });
});

describe('rank helpers', () => {
  test('format ranks and deltas', () => {
    expect(formatRank(1234)).toBe('#1,234');
    expect(formatRank(undefined)).toBe('—');
    expect(rankDelta({ day7: 5 })).toEqual({ text: '↑5', tone: 'up' });
    expect(rankDelta({ day7: -2 })).toEqual({ text: '↓2', tone: 'down' });
    expect(rankDelta({ day7: 0 })).toBeNull();
    expect(rankDelta(undefined)).toBeNull();
  });
});
