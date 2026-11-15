import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { SettingsHarness } from '../../test/settingsHarness';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { reloadPage } from './reloadPage';
import { DrillRow, SettingsGroup, SwitchSetting } from './SettingRow';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('./reloadPage', () => ({ reloadPage: vi.fn() }));

const isDisabled = (element: HTMLElement) =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('data-disabled');

describe('settings rows', () => {
  test('a switch row is named by its label, keeps the test ids and reloads when token analysis turns off', async () => {
    render(
      <SettingsHarness initial={{ showTokenAnalysis: true }}>
        <SwitchSetting setting={{ key: 'showTokenAnalysis', label: 'showTokenAnalysis' }} />
      </SettingsHarness>,
    );
    const toggle = screen.getByRole('switch', { name: 'showTokenAnalysis' });
    expect(toggle).toBe(screen.getByTestId('settings-toggle-showTokenAnalysis'));
    expect(screen.getByTestId('settings-item-showTokenAnalysis').textContent).toContain('settingsReloadOnOff');
    await userEvent.click(screen.getByText('showTokenAnalysis'));
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  test('keeps one realtime feed on and hides the feeds while realtime is off', async () => {
    render(
      <SettingsHarness
        realtimeMode='SSE'
        initial={{ showRealtimeSubscription: true, enableBnbFeeds: true, enableGossip: false, enableListing: false }}
      >
        <SwitchSetting setting={{ key: 'showRealtimeSubscription', label: 'showRealtimeSubscription' }} />
        <SwitchSetting setting={{ key: 'enableBnbFeeds', label: 'enableBnbFeeds' }} />
        <SwitchSetting setting={{ key: 'enableGossip', label: 'enableGossip' }} />
        <SwitchSetting setting={{ key: 'enableListing', label: 'enableListing' }} />
      </SettingsHarness>,
    );
    expect(screen.getByText('SSE')).toBeTruthy();
    expect(isDisabled(screen.getByRole('switch', { name: 'enableBnbFeeds' }))).toBe(true);
    await userEvent.click(screen.getByRole('switch', { name: 'enableGossip' }));
    expect(isDisabled(screen.getByRole('switch', { name: 'enableBnbFeeds' }))).toBe(false);
    await userEvent.click(screen.getByRole('switch', { name: /showRealtimeSubscription/ }));
    expect(screen.queryByRole('switch', { name: 'enableGossip' })).toBeNull();
  });

  test('groups fold in soft and stay flat elsewhere; drill rows open sections', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    const { unmount } = render(
      <SettingsGroup id='others' title='General'>
        <p>row</p>
      </SettingsGroup>,
    );
    const header = screen.getByTestId('settings-group-header-others');
    expect(header.getAttribute('aria-expanded')).toBe('true');
    await userEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    unmount();

    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    const onOpen = vi.fn();
    render(
      <SettingsGroup id='more' title='More' collapsible={false}>
        <DrillRow testId='settings-group-header-floatingPanel' label='Floating panel' summary='Default · 340px' onOpen={onOpen} />
      </SettingsGroup>,
    );
    expect(screen.getByRole('heading', { name: 'More' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Floating panel/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-group-header-floatingPanel').textContent).toContain('340px');
  });
});
