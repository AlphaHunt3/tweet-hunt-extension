import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { navigationService } from './NavigationService';
import { PanelNavigator, useNavigation } from './PanelNavigator';

function Home() {
  const { navigateTo } = useNavigation();
  return <button onClick={() => navigateTo('/settings')}>open settings</button>;
}

const routes = {
  '/home': { path: '/home', component: <Home /> },
  '/settings': { path: '/settings', component: <p>settings page</p> },
};

function Shell({ children }: { children: ReactNode }) {
  const { currentRoute } = useNavigation();
  return (
    <section aria-label='shell' data-route={currentRoute}>
      {children}
    </section>
  );
}

describe('PanelNavigator', () => {
  afterEach(() => {
    sessionStorage.clear();
    delete (document as { startViewTransition?: unknown }).startViewTransition;
  });

  test('renders routes inside a persistent layout without document view transitions', async () => {
    const startViewTransition = vi.fn((cb: () => void) => cb());
    Object.assign(document, { startViewTransition });
    render(<PanelNavigator routes={routes} layout={(content) => <Shell>{content}</Shell>} />);
    const shell = screen.getByRole('region', { name: 'shell' });
    expect(shell.dataset.route).toBe('/home');
    await userEvent.click(screen.getByRole('button', { name: 'open settings' }));
    expect(screen.getByText('settings page')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'shell' })).toBe(shell);
    expect(shell.dataset.route).toBe('/settings');
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  test('announces route requests before navigating', () => {
    const requests: unknown[] = [];
    const listener = (event: Event) => requests.push((event as CustomEvent).detail);
    window.addEventListener('xhunt:route-request', listener);
    render(<PanelNavigator routes={routes} />);
    act(() => navigationService.navigateTo('main-panel', '/home', { scrollToId: 'panel-scroll-comments' }));
    expect(requests).toEqual([{ route: '/home', props: { scrollToId: 'panel-scroll-comments' } }]);
    window.removeEventListener('xhunt:route-request', listener);
  });
});
