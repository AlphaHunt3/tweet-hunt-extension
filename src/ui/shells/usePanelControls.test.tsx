import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { GuideBubble } from './GuideBubble';
import { GUIDE_STORAGE_KEY, usePanelControls } from './usePanelControls';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

const navigateTo = vi.fn();
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo, goBack: () => {}, history: ['/home'], currentRoute: '/home' }),
}));

type MessageState = { hasUnread: boolean; isLoading: boolean; messages: unknown[] };
const listeners = new Set<(state: MessageState) => void>();
const markAllAsRead = vi.fn();
vi.mock('~/utils/messageManager', () => ({
  messageManager: {
    init: vi.fn(),
    getState: () => ({ messages: [], hasUnread: false, isLoading: true }),
    addCallback: (cb: (state: MessageState) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    markAllAsRead: () => markAllAsRead(),
  },
}));

const minimize = vi.fn();
vi.mock('~/compontents/navigation/PanelContext', () => ({
  usePanelContext: () => ({ onMinimize: minimize }),
}));

const loaded = (hasUnread: boolean) => act(() => listeners.forEach((cb) => cb({ hasUnread, isLoading: false, messages: [{}] })));

describe('usePanelControls', () => {
  beforeEach(() => {
    navigateTo.mockReset();
    markAllAsRead.mockReset();
    minimize.mockReset();
  });

  test('shows the unread dot once messages have loaded', () => {
    const { result } = renderHook(() => usePanelControls());
    expect(result.current.hasUnread).toBe(false);
    loaded(true);
    expect(result.current.hasUnread).toBe(true);
  });

  test('opening messages navigates, marks read and retires its guide', () => {
    const { result } = renderHook(() => usePanelControls());
    loaded(true);
    expect(result.current.activeGuide).toBe('settings');
    act(() => result.current.openMessages());
    expect(navigateTo).toHaveBeenCalledWith('/messages');
    expect(markAllAsRead).toHaveBeenCalled();
    expect((getMemoryValue(GUIDE_STORAGE_KEY) as Record<string, boolean>).messages).toBe(true);
  });

  test('hiding closes in default mode and minimizes in persistent mode', () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(() => usePanelControls(onClose));
    expect(result.current.persistent).toBe(false);
    result.current.hide?.();
    expect(onClose).toHaveBeenCalled();
    act(() => setMemoryValue('@xhunt/floatingPanelMode', 'persistent'));
    rerender();
    result.current.hide?.();
    expect(minimize).toHaveBeenCalled();
    expect(result.current.hideLabel).toBe('headerControlsGuideMinimizeTitle');
  });
});

describe('GuideBubble', () => {
  test('is a status with two ways to dismiss it', async () => {
    const onDismiss = vi.fn();
    render(<GuideBubble text='Open settings here' onDismiss={onDismiss} />);
    expect(screen.getByRole('status').textContent).toContain('Open settings here');
    await userEvent.click(screen.getByRole('button', { name: 'headerControlsGuideGotIt' }));
    await userEvent.click(screen.getByRole('button', { name: 'fanTipPanelCloseButtonLabel' }));
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
