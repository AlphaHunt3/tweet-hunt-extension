import type { UiSkin } from '../skin/skins';

export type HomeView = 'overview' | 'followers' | 'portrait' | 'reviews';
export type PanelDestination = HomeView | 'messages' | 'settings';

export const HOME_VIEWS: Record<UiSkin, readonly HomeView[]> = {
  soft: ['followers', 'portrait', 'reviews'],
  obsidian: ['overview', 'followers', 'portrait', 'reviews'],
  native: ['overview', 'followers', 'reviews'],
};

export const HOME_VIEW_STORAGE_KEY = '@xhunt/panel-home-view';

export function resolveHomeView(skin: UiSkin, stored: unknown): HomeView {
  const views = HOME_VIEWS[skin];
  return views.includes(stored as HomeView) ? (stored as HomeView) : views[0];
}

export function routeOf(destination: PanelDestination) {
  if (destination === 'messages') return '/messages';
  if (destination === 'settings') return '/settings';
  return '/home';
}

export function destinationOf(route: string, view: HomeView): PanelDestination {
  if (route === '/messages') return 'messages';
  if (route === '/settings') return 'settings';
  return view;
}
