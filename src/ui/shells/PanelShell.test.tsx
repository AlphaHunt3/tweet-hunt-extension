import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAgent } from '@ui-sdk/react/agent';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { PanelShell, PanelTile } from './PanelShell';

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
const minimize = vi.fn();
vi.mock('~/compontents/navigation/PanelContext', () => ({ usePanelContext: () => ({ onMinimize: minimize }) }));

const agent = createAgent();

function renderShell(collapsed = false, onRestore = vi.fn()) {
  return render(
    <div data-skin='obsidian'>
      <PanelShell collapsed={collapsed} onRestore={onRestore} footer={<footer>account</footer>}>
        <p>route content</p>
      </PanelShell>
    </div>,
  );
}

describe('PanelShell', () => {
  beforeEach(() => {
    navigateTo.mockReset();
    setMemoryValue('@xhunt/header-controls-guide-dismissed-map', { settings: true, messages: true, drag: true, panel: true });
  });

  test('soft and native shells frame the route content and footer', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    render(
      <PanelShell collapsed={false} onRestore={() => {}} footer={<footer>account</footer>}>
        <p>route content</p>
      </PanelShell>,
    );
    expect(screen.getByText('route content')).toBeTruthy();
    expect(screen.getByText('account')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('the obsidian rail navigates home views, messages and settings', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    renderShell();
    expect(screen.getByRole('tablist', { name: 'panelNavLabel' })).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'homeViewPortrait' }));
    expect(navigateTo).toHaveBeenCalledWith('/home');
    await userEvent.click(screen.getByTestId('panel-settings-button'));
    expect(navigateTo).toHaveBeenCalledWith('/settings');
  });

  test('collapsed obsidian keeps only the rail, and the toggle restores it', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    setMemoryValue('@xhunt/floatingPanelMode', 'persistent');
    const onRestore = vi.fn();
    renderShell(true, onRestore);
    expect(screen.getByText('route content').closest('.hidden')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'panelExpand' }));
    expect(onRestore).toHaveBeenCalled();
  });

  test('an agent can use the rail by name', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    renderShell();
    const rail = agent.snapshot().find((entry) => !entry.offPage && entry.label === 'panelNavLabel');
    expect(rail, 'rail is missing from the snapshot').toBeTruthy();
    const result = await agent.act({ steps: [{ ref: 'panelNavLabel', action: 'setValue', args: ['messages'] }] });
    expect(result.ok, result.error?.message).toBe(true);
    expect(navigateTo).toHaveBeenCalledWith('/messages');
  });
});

describe('PanelTile', () => {
  test('is a named restore button', async () => {
    const onRestore = vi.fn();
    render(<PanelTile onRestore={onRestore} />);
    await userEvent.click(screen.getByRole('button', { name: 'panelRestore' }));
    expect(onRestore).toHaveBeenCalled();
  });
});
