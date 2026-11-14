import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { PanelPageHeader } from './PanelPageHeader';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const goBack = vi.fn();
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo: () => {}, goBack, history: ['/home', '/settings'], currentRoute: '/settings' }),
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

describe('PanelPageHeader', () => {
  test('shows the title, goes back and closes', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    const onClose = vi.fn();
    render(<PanelPageHeader title='XHunt 设置' showBack onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'XHunt 设置' })).toBeTruthy();
    await userEvent.click(screen.getByTestId('panel-back-button'));
    expect(goBack).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('panel-close-button'));
    expect(onClose).toHaveBeenCalled();
  });

  test('obsidian has no back button because the rail navigates', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    render(<PanelPageHeader title='XHunt 消息' showBack onClose={() => {}} />);
    expect(screen.queryByTestId('panel-back-button')).toBeNull();
  });
});
