import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { launchNativeBlock } from '~contents/utils/cleaner/profileBlockLauncher';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { FeedCleanerSettingsSection } from './FeedCleanerSettingsSection';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~storage/index', async () => {
  const memory = await import('../../test/memoryStorage');
  return { localStorageInstance: { get: async (key: string) => memory.getMemoryValue(key) ?? null } };
});
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => ({ settingsRemoveItem: 'Remove {item}', settingsAddTo: 'Add to {list}' })[key] ?? key,
    lang: 'zh',
    setLang: () => {},
  }),
}));
vi.mock('~utils/rankCacheManager', () => ({
  RankCacheManager: { preload: async () => {} },
  hasKolRankInCache: (handle: string) => handle === 'famous',
}));
vi.mock('~contents/utils/cleaner/profileBlockLauncher', () => ({ launchNativeBlock: vi.fn() }));
vi.mock('~contents/utils/navigateInX', () => ({ navigateInX: vi.fn() }));

describe('FeedCleanerSettingsSection', () => {
  test('turns cleaning on, picks a mode and edits keywords and the whitelist', async () => {
    render(<FeedCleanerSettingsSection />);
    expect(screen.queryByRole('radiogroup', { name: 'cleanerModeTitle' })).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'cleanerEnableTitle' }));
    expect(getMemoryValue('@settings/cleaner-enabled')).toBe(true);
    await userEvent.click(screen.getByRole('radio', { name: 'cleanerModeHide' }));
    expect(getMemoryValue('@settings/cleaner-mode')).toBe('hide');

    await userEvent.click(screen.getByRole('button', { name: 'cleanerCustomKeywordsTitle (0)' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'cleanerCustomKeywordsTitle' }), 'spam, a, 广告{Enter}');
    expect(getMemoryValue('@xhunt/cleaner-custom-keywords')).toEqual(['spam', '广告']);
    await userEvent.click(screen.getByRole('button', { name: 'Remove spam' }));
    expect(getMemoryValue('@xhunt/cleaner-custom-keywords')).toEqual(['广告']);

    await userEvent.click(screen.getByRole('button', { name: 'cleanerWhitelistTitle (0)' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'cleanerWhitelistTitle' }), '@Mira');
    await userEvent.click(screen.getByRole('button', { name: 'Add to cleanerWhitelistTitle' }));
    expect(getMemoryValue('@xhunt/cleaner-whitelist')).toEqual(['mira']);
  });

  test('lists intercepted accounts without ranked ones and hands blocking to X', async () => {
    setMemoryValue('@settings/cleaner-enabled', true);
    setMemoryValue('@xhunt/cleaner-intercepted-accounts', [
      { handle: 'spam1', name: 'Spam One', isBlocked: false },
      { handle: 'famous', name: 'Famous', isBlocked: false },
    ]);
    render(<FeedCleanerSettingsSection />);
    await userEvent.click(screen.getByRole('button', { name: /cleanerInterceptedTitle/ }));
    await waitFor(() => expect(screen.getByRole('link', { name: /Spam One/ })).toBeTruthy());
    expect(screen.queryByRole('link', { name: /Famous/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'cleanerBlockBtn @spam1' }));
    expect(launchNativeBlock).toHaveBeenCalledWith('spam1', 'block');
  });

  test('a focus request shows the guide bubble', () => {
    render(<FeedCleanerSettingsSection focusRequest={1} />);
    expect(screen.getByText('cleanerConfigBubbleDesc')).toBeTruthy();
  });
});
