import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAgent } from '@ui-sdk/react/agent';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { navigationService } from '~/compontents/navigation/NavigationService';
import { UI_SKIN_INTRO_SEEN_KEY } from './skins';
import { SkinIntroNotice } from './SkinIntroNotice';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

const agent = createAgent();

describe('SkinIntroNotice', () => {
  beforeEach(() => {
    vi.spyOn(navigationService, 'navigateTo').mockImplementation(() => {});
  });

  test('shows once for users who have not seen it', () => {
    render(<SkinIntroNotice />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('uiSkinIntroTitle')).toBeTruthy();
  });

  test('stays hidden after it has been seen', () => {
    setMemoryValue(UI_SKIN_INTRO_SEEN_KEY, true);
    render(<SkinIntroNotice />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('dismissing remembers the choice', async () => {
    const user = userEvent.setup();
    render(<SkinIntroNotice />);
    await user.click(screen.getByRole('button', { name: 'uiSkinIntroDismiss' }));
    expect(getMemoryValue(UI_SKIN_INTRO_SEEN_KEY)).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('the action opens settings', async () => {
    const user = userEvent.setup();
    render(<SkinIntroNotice />);
    await user.click(screen.getByRole('button', { name: 'uiSkinIntroAction' }));
    expect(navigationService.navigateTo).toHaveBeenCalledWith('main-panel', '/settings');
    expect(getMemoryValue(UI_SKIN_INTRO_SEEN_KEY)).toBe(true);
  });

  test('an agent can find both actions and dismiss the notice', async () => {
    render(<SkinIntroNotice />);

    const components = agent
      .snapshot()
      .filter((entry) => !entry.offPage && entry.component !== 'more');
    for (const entry of components) {
      expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
    }
    const labels = components.map((entry) => entry.label);
    for (const label of ['uiSkinIntroAction', 'uiSkinIntroDismiss']) {
      expect(labels, `${label} is missing from the snapshot`).toContain(label);
    }

    const result = await agent.act({
      steps: [{ ref: 'uiSkinIntroDismiss', action: 'press' }],
    });
    expect(result.ok, result.error?.message).toBe(true);
    expect(getMemoryValue(UI_SKIN_INTRO_SEEN_KEY)).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
