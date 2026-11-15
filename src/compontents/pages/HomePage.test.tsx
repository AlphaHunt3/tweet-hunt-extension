import { act, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '~/ui/skin/skins';
import { HOME_VIEW_STORAGE_KEY } from '~/ui/shells/panelNav';
import { usePanelHomeView } from '~/ui/shells/usePanelHomeView';
import { HomePage } from './HomePage';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~contents/hooks/usePlacementTracking', () => ({ default: () => ({ twitterId: '42' }) }));
vi.mock('~/ui/shells/HomeChrome', () => ({
  HomeChrome: ({ children }: { children: (view: string) => React.ReactNode }) => (
    <main>{children(usePanelHomeView().view)}</main>
  ),
}));
vi.mock('~/utils/messageManager', () => ({ messageManager: { updateLanguage: () => {} } }));
vi.mock('~/ui/panel/FollowersView', () => ({ FollowersView: () => <p>followers view</p> }));
vi.mock('~/ui/panel/PortraitView', () => ({
  PortraitView: (props: { twitterId: string }) => <p>portrait view {props.twitterId}</p>,
}));
vi.mock('~/ui/panel/ReviewsView', () => ({
  ReviewsView: (props: { userId: string }) => <p>reviews view {props.userId}</p>,
}));
vi.mock('~/ui/panel/OverviewView', () => ({ OverviewView: () => <p>overview view</p> }));

describe('HomePage', () => {
  test('renders the stored view and jumps to reviews on request', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    setMemoryValue(HOME_VIEW_STORAGE_KEY, 'portrait');
    render(<HomePage userId='mira' twInfo={{}} />);
    expect(screen.getByText('portrait view 42')).toBeTruthy();
    act(() => {
      window.dispatchEvent(
        new CustomEvent('xhunt:route-request', { detail: { route: '/home', props: { scrollToId: 'panel-scroll-comments' } } }),
      );
    });
    expect(screen.getByText('reviews view mira')).toBeTruthy();
  });

  test('shows a loading state while profile data loads', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    render(<HomePage userId='mira' loadingTwInfo />);
    expect(screen.getByText('loading')).toBeTruthy();
  });
});
