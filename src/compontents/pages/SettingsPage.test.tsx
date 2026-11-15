import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAgent } from '@ui-sdk/react/agent';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '~/ui/skin/skins';
import { SettingsPage } from './SettingsPage';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~storage/index.ts', () => ({
  localStorageInstance: { get: async () => null, set: async () => {}, clear: async () => {} },
}));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~/utils/settingsManager.ts', async () => {
  const React = await import('react');
  const KEYS = [
    'showSidebarIcon',
    'showTokenAnalysis',
    'showTweetAIAnalysis',
    'showAiDetectButton',
    'showAvatarRank',
    'showInvestors',
    'showHotVote',
    'showHotTrendingAi',
  ];
  return {
    settingsConfig: { nameRight: [{ key: 'showInvestors', label: 'showInvestors' }], followedRight: [] },
    useAllSettings: () => {
      const [values, setValues] = React.useState<Record<string, boolean>>(() =>
        Object.fromEntries(KEYS.map((key) => [key, true])),
      );
      const settingStates = Object.fromEntries(
        KEYS.map((key) => [key, { get: values[key], set: (value: boolean) => setValues((prev) => ({ ...prev, [key]: value })) }]),
      );
      return { settingStates, isLoading: false };
    },
  };
});
vi.mock('~utils/configManager.ts', () => ({ configManager: { getConfig: () => ({}) } }));
vi.mock('~contents/utils/helpers.ts', () => ({ getCurrentUsername: async () => 'mira' }));
vi.mock('~contents/services/review.ts', () => ({
  updateUserInfo: async () => ({ evmAddresses: [] }),
  updateEvmAddresses: async () => null,
}));
vi.mock('~contents/hooks/useAvatarSkin', () => ({ useAvatarSkinState: () => ({ skin: 'skin-1', setSkinCustomized: () => {} }) }));
vi.mock('~compontents/pages/constants.tsx', () => ({ defaultSound: { url: 'https://cdn.example/15011.mp3', data: 'data:default' } }));
vi.mock('~/compontents/cleaner/FeedCleanerSettingsSection', () => ({
  FeedCleanerSettingsSection: ({ focusRequest }: { focusRequest?: number }) => <p>cleaner focus {focusRequest}</p>,
}));
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo: () => {}, goBack: () => {}, history: ['/home', '/settings'], currentRoute: '/settings' }),
}));
vi.mock('~/compontents/navigation/PanelContext', () => ({ usePanelContext: () => ({ onMinimize: () => {} }) }));
vi.mock('~/utils/messageManager', () => ({
  messageManager: {
    init: () => {},
    getState: () => ({ messages: [], hasUnread: false, isLoading: false }),
    addCallback: () => () => {},
    markAllAsRead: () => {},
  },
}));

function renderPage(skin: 'soft' | 'obsidian' | 'native') {
  setMemoryValue(UI_SKIN_STORAGE_KEY, skin);
  setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3'], primaryDomain: 'web3' });
  setMemoryValue('@xhunt/user-domain-setup-completed', true);
  setMemoryValue('@settings/avatarRankMode', 'web3');
  return render(<SettingsPage onClose={() => {}} />);
}

describe('SettingsPage', () => {
  test('lists the common groups and opens a section from More, then goes back', async () => {
    renderPage('soft');
    expect(screen.getByTestId('settings-group-others')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'showSidebarIcon' })).toBeTruthy();
    expect(screen.getByTestId('settings-group-header-aiOnlySettings').textContent).toContain('settingsOff');

    await userEvent.click(screen.getByTestId('settings-group-header-floatingPanel'));
    expect(screen.getByRole('heading', { level: 2, name: 'floatingPanelSettings' })).toBeTruthy();
    expect(screen.getByTestId('settings-group-floatingPanel')).toBeTruthy();
    expect(screen.queryByRole('searchbox', { name: 'settingsSearchLabel' })).toBeNull();

    await userEvent.click(screen.getByTestId('panel-section-back-button'));
    expect(screen.getByRole('heading', { level: 2, name: 'settingsTitle' })).toBeTruthy();
  });

  test('keeps domain-only switches off until the domain is on', async () => {
    renderPage('native');
    await userEvent.click(screen.getByTestId('settings-group-header-aiOnlySettings'));
    expect(screen.getByText('settingsDomainDisabled')).toBeTruthy();
    const toggle = screen.getByRole('switch', { name: 'showHotTrendingAi' });
    expect(toggle.hasAttribute('disabled') || toggle.getAttribute('aria-disabled') === 'true').toBe(true);
  });

  test('search shows matching switches and jumps to sections', async () => {
    renderPage('obsidian');
    const search = screen.getByRole('searchbox', { name: 'settingsSearchLabel' });
    await userEvent.type(search, 'showSide');
    expect(screen.getByRole('switch', { name: 'showSidebarIcon' })).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'showTokenAnalysis' })).toBeNull();

    await userEvent.clear(search);
    await userEvent.type(search, 'panelWidth');
    await userEvent.click(screen.getByRole('button', { name: /panelWidth/ }));
    expect(screen.getByTestId('settings-group-floatingPanel')).toBeTruthy();
  });

  test('says when nothing matches', async () => {
    renderPage('soft');
    await userEvent.type(screen.getByRole('searchbox', { name: 'settingsSearchLabel' }), 'zzz');
    expect(screen.getByText('settingsNoResults')).toBeTruthy();
  });

  test('a cleaner link from the timeline opens the cleaner section', () => {
    renderPage('soft');
    act(() => {
      window.dispatchEvent(new CustomEvent('xhunt:focus-cleaner-settings'));
    });
    expect(screen.getByText('cleaner focus 1')).toBeTruthy();
    expect(screen.getByTestId('settings-group-cleaner')).toBeTruthy();
  });

  test('an agent can find and use the main settings by name', async () => {
    renderPage('soft');
    const agent = createAgent();
    const components = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== 'more');
    for (const entry of components) {
      expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
    }
    const labels = components.map((entry) => entry.label);
    for (const label of ['settingsSearchLabel', 'uiSkinLabel', 'language', 'soundEffect', 'showSidebarIcon', 'avatarSkinSelectorTitle']) {
      expect(labels, `${label} is missing from the snapshot`).toContain(label);
    }
    const result = await agent.act({
      steps: [
        { ref: 'showTweetAIAnalysis', action: 'setChecked', args: [false] },
        { ref: 'settingsSearchLabel', action: 'setValue', args: ['showSide'] },
      ],
    });
    expect(result.ok, result.error?.message).toBe(true);
    expect(screen.queryByRole('switch', { name: 'showTokenAnalysis' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'showSidebarIcon' })).toBeTruthy();
  });
});
